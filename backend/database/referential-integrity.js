/**
 * Referential Integrity Checker - Al-Awael ERP
 * نظام فحص سلامة البيانات المرجعية
 *
 * Features:
 *  - Detect orphaned references across collections
 *  - Cascading soft-delete / hard-delete
 *  - Pre-delete dependency checks (prevent delete if dependents exist)
 *  - Scheduled integrity audit with violation reports
 *  - Reference graph visualization
 *  - Auto-repair orphaned references
 *  - Mongoose plugin for pre-remove hooks
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Reference Relation Registry
// ══════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} Relation
 * @property {string} from       - Source model name
 * @property {string} fromField  - Field in source model
 * @property {string} to         - Target model name (referenced)
 * @property {string} onDelete   - 'restrict' | 'cascade' | 'setNull' | 'ignore'
 * @property {boolean} required  - Whether the reference is required
 */

// ══════════════════════════════════════════════════════════════════
// Referential Integrity Manager
// ══════════════════════════════════════════════════════════════════
class ReferentialIntegrityManager {
  constructor(options = {}) {
    this._enabled = options.enabled !== false;
    this._relations = []; // All registered relations
    this._modelRelations = new Map(); // modelName -> [relations where model is target]
    this._autoDiscover = options.autoDiscover !== false;
    this._batchSize = options.batchSize || 1000;
  }

  // ────── Relation Registration ──────

  /**
   * Define a referential relation
   * @param {Relation} relation
   */
  defineRelation(relation) {
    const rel = {
      from: relation.from,
      fromField: relation.fromField,
      to: relation.to,
      onDelete: relation.onDelete || 'restrict',
      required: relation.required || false,
    };

    this._relations.push(rel);

    // Index by target model
    if (!this._modelRelations.has(rel.to)) {
      this._modelRelations.set(rel.to, []);
    }
    this._modelRelations.get(rel.to).push(rel);

    return this;
  }

  /**
   * Define multiple relations at once
   */
  defineRelations(relations) {
    for (const rel of relations) {
      this.defineRelation(rel);
    }
    return this;
  }

  /**
   * Auto-discover relations from Mongoose schemas
   */
  autoDiscoverRelations() {
    const models = mongoose.modelNames();
    let discovered = 0;

    for (const modelName of models) {
      const model = mongoose.model(modelName);
      const schema = model.schema;

      schema.eachPath((pathName, schemaType) => {
        // Direct ObjectId ref
        if (schemaType.options?.ref) {
          this.defineRelation({
            from: modelName,
            fromField: pathName,
            to: schemaType.options.ref,
            onDelete: schemaType.options.onDelete || 'restrict',
            required: !!schemaType.options.required,
          });
          discovered++;
        }

        // Array of ObjectId refs
        if (schemaType.caster?.options?.ref) {
          this.defineRelation({
            from: modelName,
            fromField: pathName,
            to: schemaType.caster.options.ref,
            onDelete: schemaType.caster.options.onDelete || 'ignore',
            required: false,
          });
          discovered++;
        }
      });
    }

    logger.info(
      `[RefIntegrity] Auto-discovered ${discovered} relations across ${models.length} models`
    );
    return discovered;
  }

  // ────── Pre-Delete Check ──────

  /**
   * Check if a document can be safely deleted
   * @param {string} modelName - Model being deleted
   * @param {string|ObjectId} documentId - Document ID
   * @returns {Object} { canDelete, dependents: [{ model, field, count }] }
   */
  async canDelete(modelName, documentId) {
    const relations = this._modelRelations.get(modelName) || [];
    const dependents = [];
    let canDelete = true;

    for (const rel of relations) {
      if (rel.onDelete === 'ignore') continue;

      try {
        const SourceModel = mongoose.model(rel.from);
        const count = await SourceModel.countDocuments({
          [rel.fromField]: documentId,
        });

        if (count > 0) {
          dependents.push({
            model: rel.from,
            field: rel.fromField,
            count,
            onDelete: rel.onDelete,
          });

          if (rel.onDelete === 'restrict') {
            canDelete = false;
          }
        }
      } catch (err) {
        logger.warn(`[RefIntegrity] Check failed for ${rel.from}.${rel.fromField}: ${err.message}`);
      }
    }

    return { canDelete, dependents };
  }

  /**
   * Execute cascading actions when a document is deleted
   * @param {string} modelName - Model being deleted
   * @param {string|ObjectId} documentId - Document ID
   * @param {Object} options - { dryRun, userId }
   */
  async onDelete(modelName, documentId, options = {}) {
    const dryRun = options.dryRun || false;
    const relations = this._modelRelations.get(modelName) || [];
    const actions = [];

    for (const rel of relations) {
      try {
        const SourceModel = mongoose.model(rel.from);

        switch (rel.onDelete) {
          case 'restrict': {
            const count = await SourceModel.countDocuments({ [rel.fromField]: documentId });
            if (count > 0) {
              throw new Error(
                `Cannot delete ${modelName}:${documentId} — ${count} dependent records in ${rel.from}.${rel.fromField}`
              );
            }
            break;
          }

          case 'cascade': {
            if (dryRun) {
              const count = await SourceModel.countDocuments({ [rel.fromField]: documentId });
              actions.push({
                action: 'cascade-delete',
                model: rel.from,
                field: rel.fromField,
                count,
              });
            } else {
              // Check if model uses soft delete
              const hasSoftDelete = SourceModel.schema.path('isDeleted');
              if (hasSoftDelete) {
                const result = await SourceModel.updateMany(
                  { [rel.fromField]: documentId },
                  { $set: { isDeleted: true, deletedAt: new Date() } }
                );
                actions.push({
                  action: 'soft-delete',
                  model: rel.from,
                  affected: result.modifiedCount,
                });
              } else {
                const result = await SourceModel.deleteMany({ [rel.fromField]: documentId });
                actions.push({
                  action: 'hard-delete',
                  model: rel.from,
                  affected: result.deletedCount,
                });
              }
            }
            break;
          }

          case 'setNull': {
            if (dryRun) {
              const count = await SourceModel.countDocuments({ [rel.fromField]: documentId });
              actions.push({ action: 'set-null', model: rel.from, field: rel.fromField, count });
            } else {
              const result = await SourceModel.updateMany(
                { [rel.fromField]: documentId },
                { $set: { [rel.fromField]: null } }
              );
              actions.push({ action: 'set-null', model: rel.from, affected: result.modifiedCount });
            }
            break;
          }

          case 'ignore':
          default:
            break;
        }
      } catch (err) {
        if (err.message.startsWith('Cannot delete')) throw err;
        logger.error(`[RefIntegrity] Cascade error ${rel.from}.${rel.fromField}: ${err.message}`);
        actions.push({ action: 'error', model: rel.from, error: err.message });
      }
    }

    return { documentId: String(documentId), model: modelName, dryRun, actions };
  }

  // ────── Integrity Audit ──────

  /**
   * Run a full integrity audit across all registered relations
   * @param {Object} options - { models, fix, limit }
   */
  async audit(options = {}) {
    const startTime = Date.now();
    const violations = [];
    const targetRelations = options.models
      ? this._relations.filter(
          r => options.models.includes(r.from) || options.models.includes(r.to)
        )
      : this._relations;

    logger.info(`[RefIntegrity] Starting integrity audit: ${targetRelations.length} relations`);

    for (const rel of targetRelations) {
      try {
        const result = await this._checkRelation(rel, options);
        if (result.orphanCount > 0) {
          violations.push(result);
        }
      } catch (err) {
        violations.push({
          from: rel.from,
          fromField: rel.fromField,
          to: rel.to,
          error: err.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    const report = {
      timestamp: new Date(),
      duration,
      relationsChecked: targetRelations.length,
      violations: violations.length,
      details: violations,
      status: violations.length === 0 ? 'HEALTHY' : 'VIOLATIONS_FOUND',
    };

    if (violations.length > 0) {
      logger.warn(
        `[RefIntegrity] Audit found ${violations.length} violations (${(duration / 1000).toFixed(1)}s)`
      );
    } else {
      logger.info(`[RefIntegrity] Audit passed — no violations (${(duration / 1000).toFixed(1)}s)`);
    }

    return report;
  }

  async _checkRelation(rel, options = {}) {
    const limit = options.limit || 100;
    let SourceModel, TargetModel;

    try {
      SourceModel = mongoose.model(rel.from);
      TargetModel = mongoose.model(rel.to);
    } catch {
      return {
        from: rel.from,
        fromField: rel.fromField,
        to: rel.to,
        orphanCount: 0,
        error: 'Model not found',
      };
    }

    // Find all unique referenced IDs from source
    const referencedIds = await SourceModel.distinct(rel.fromField, {
      [rel.fromField]: { $ne: null, $exists: true },
    });

    if (referencedIds.length === 0) {
      return { from: rel.from, fromField: rel.fromField, to: rel.to, orphanCount: 0 };
    }

    // Check which IDs exist in target
    const existingIds = await TargetModel.find({ _id: { $in: referencedIds } }, { _id: 1 }).lean();

    const existingSet = new Set(existingIds.map(d => String(d._id)));
    const orphanIds = referencedIds.filter(id => !existingSet.has(String(id)));

    const result = {
      from: rel.from,
      fromField: rel.fromField,
      to: rel.to,
      totalReferences: referencedIds.length,
      orphanCount: orphanIds.length,
      orphanSample: orphanIds.slice(0, limit).map(String),
    };

    // Auto-fix if requested
    if (options.fix && orphanIds.length > 0) {
      const fixed = await this._fixOrphans(SourceModel, rel.fromField, orphanIds, rel.onDelete);
      result.fixed = fixed;
    }

    return result;
  }

  async _fixOrphans(SourceModel, field, orphanIds, onDelete) {
    switch (onDelete) {
      case 'setNull': {
        const res = await SourceModel.updateMany(
          { [field]: { $in: orphanIds } },
          { $set: { [field]: null } }
        );
        return { action: 'set-null', affected: res.modifiedCount };
      }
      case 'cascade': {
        const res = await SourceModel.deleteMany({ [field]: { $in: orphanIds } });
        return { action: 'deleted', affected: res.deletedCount };
      }
      default: {
        return { action: 'none', reason: `onDelete policy is '${onDelete}'` };
      }
    }
  }

  // ────── Reference Graph ──────

  /**
   * Build a dependency graph of all models
   */
  getRelationGraph() {
    const graph = {
      nodes: new Set(),
      edges: [],
    };

    for (const rel of this._relations) {
      graph.nodes.add(rel.from);
      graph.nodes.add(rel.to);
      graph.edges.push({
        from: rel.from,
        to: rel.to,
        field: rel.fromField,
        onDelete: rel.onDelete,
        required: rel.required,
      });
    }

    return {
      nodes: [...graph.nodes].sort(),
      edges: graph.edges,
      totalModels: graph.nodes.size,
      totalRelations: graph.edges.length,
    };
  }

  /**
   * Get all dependents of a model (recursive)
   */
  getDependencyTree(modelName, visited = new Set()) {
    if (visited.has(modelName)) return { model: modelName, circular: true };
    visited.add(modelName);

    const directDeps = this._relations
      .filter(r => r.to === modelName)
      .map(r => ({
        model: r.from,
        field: r.fromField,
        onDelete: r.onDelete,
        children: this.getDependencyTree(r.from, new Set(visited)),
      }));

    return {
      model: modelName,
      dependents: directDeps,
      totalDirect: directDeps.length,
    };
  }

  // ────── Mongoose Plugin ──────

  /**
   * Plugin that adds pre-delete integrity checks
   * Usage: schema.plugin(refIntegrity.plugin(), { modelName: 'Employee' })
   */
  plugin() {
    const self = this;

    return function refIntegrityPlugin(schema, pluginOptions = {}) {
      const modelName = pluginOptions.modelName || 'Unknown';

      // Pre findOneAndDelete hook
      schema.pre('findOneAndDelete', async function () {
        if (!self._enabled) return;

        const doc = await this.model.findOne(this.getFilter()).lean();
        if (!doc) return;

        const { canDelete, dependents } = await self.canDelete(modelName, doc._id);

        if (!canDelete) {
          const depInfo = dependents
            .filter(d => d.onDelete === 'restrict')
            .map(d => `${d.model}.${d.field} (${d.count} records)`)
            .join(', ');
          throw new Error(`Cannot delete ${modelName}: referenced by ${depInfo}`);
        }

        // Store for post-hook cascade
        this._refIntegrityDoc = doc;
      });

      schema.post('findOneAndDelete', async function (doc) {
        if (!self._enabled || !doc) return;

        try {
          await self.onDelete(modelName, doc._id);
        } catch (err) {
          logger.error(`[RefIntegrity] Post-delete cascade failed: ${err.message}`);
        }
      });

      // Pre deleteMany hook - check each document
      schema.pre('deleteMany', async function () {
        if (!self._enabled) return;

        const docs = await this.model.find(this.getFilter(), { _id: 1 }).lean();
        for (const doc of docs.slice(0, 50)) {
          // Safety limit
          const { canDelete, dependents } = await self.canDelete(modelName, doc._id);
          if (!canDelete) {
            const depInfo = dependents
              .filter(d => d.onDelete === 'restrict')
              .map(d => `${d.model}(${d.count})`)
              .join(', ');
            throw new Error(
              `Cannot bulk delete ${modelName}: doc ${doc._id} referenced by ${depInfo}`
            );
          }
        }
      });
    };
  }

  // ────── Info ──────

  getRelations(modelName) {
    if (modelName) {
      return {
        references: this._relations.filter(r => r.from === modelName),
        referencedBy: this._relations.filter(r => r.to === modelName),
      };
    }
    return {
      total: this._relations.length,
      relations: this._relations,
      models: [...new Set(this._relations.flatMap(r => [r.from, r.to]))].sort(),
    };
  }
}

// Singleton
const refIntegrity = new ReferentialIntegrityManager();

module.exports = {
  ReferentialIntegrityManager,
  refIntegrity,
};
