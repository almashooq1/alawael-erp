/**
 * Schema Registry - Al-Awael ERP
 * سجل المخططات المركزي
 *
 * Features:
 *  - Centralized model registration & discovery
 *  - Schema validation & consistency checks
 *  - Model dependency graph
 *  - Schema diff detection (useful for migrations)
 *  - Schema documentation generation
 *  - Lazy model loading
 *  - Model health checks (schema vs actual collection)
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// SchemaRegistry
// ══════════════════════════════════════════════════════════════════
class SchemaRegistry {
  constructor() {
    this._registry = new Map(); // modelName -> metadata
    this._groups = new Map(); // groupName -> [modelName, ...]
    this._dependencies = new Map(); // modelName -> [ref models]
  }

  /**
   * Register a model with metadata
   * @param {string} name - Model name
   * @param {Object} metadata - { group, description, version, tags }
   */
  register(name, metadata = {}) {
    if (!this._isModelRegistered(name)) {
      logger.warn(`[SchemaRegistry] Model "${name}" is not registered in Mongoose`);
    }

    this._registry.set(name, {
      name,
      group: metadata.group || 'default',
      description: metadata.description || '',
      version: metadata.version || '1.0.0',
      tags: metadata.tags || [],
      registeredAt: new Date(),
    });

    // Add to group
    const group = metadata.group || 'default';
    if (!this._groups.has(group)) {
      this._groups.set(group, []);
    }
    if (!this._groups.get(group).includes(name)) {
      this._groups.get(group).push(name);
    }

    // Analyze dependencies (ref fields)
    this._analyzeDependencies(name);

    return this;
  }

  /**
   * Bulk register known models
   */
  registerAll() {
    const modelNames = mongoose.modelNames();
    for (const name of modelNames) {
      if (!this._registry.has(name)) {
        this.register(name, { group: this._inferGroup(name) });
      }
    }
    logger.info(`[SchemaRegistry] ${modelNames.length} models registered`);
    return this;
  }

  // ────── Model Discovery ──────

  /** Get all registered model names */
  getModelNames() {
    return mongoose.modelNames();
  }

  /** Get model by name */
  getModel(name) {
    try {
      return mongoose.model(name);
    } catch {
      return null;
    }
  }

  /** Get metadata for a model */
  getMetadata(name) {
    return this._registry.get(name) || null;
  }

  /** Get all models in a group */
  getGroup(groupName) {
    return this._groups.get(groupName) || [];
  }

  /** Get all groups */
  getGroups() {
    const groups = {};
    for (const [name, models] of this._groups) {
      groups[name] = models;
    }
    return groups;
  }

  /** Search models by name or tag */
  search(query) {
    const q = query.toLowerCase();
    const results = [];

    for (const [name, meta] of this._registry) {
      if (
        name.toLowerCase().includes(q) ||
        meta.description.toLowerCase().includes(q) ||
        meta.tags.some(t => t.toLowerCase().includes(q))
      ) {
        results.push({ name, ...meta });
      }
    }

    return results;
  }

  // ────── Schema Analysis ──────

  /**
   * Get detailed schema information for a model
   */
  getSchemaInfo(modelName) {
    const model = this.getModel(modelName);
    if (!model) return null;

    const schema = model.schema;
    const paths = {};
    const indexes = schema.indexes().map(([fields, opts]) => ({ fields, options: opts }));
    const virtuals = Object.keys(schema.virtuals);
    const methods = Object.keys(schema.methods);
    const statics = Object.keys(schema.statics);

    // Iterate all paths
    schema.eachPath((pathName, schemaType) => {
      paths[pathName] = {
        type: schemaType.instance,
        required: !!schemaType.isRequired,
        unique: !!schemaType.options?.unique,
        index: !!schemaType.options?.index,
        default:
          schemaType.defaultValue !== undefined
            ? String(schemaType.defaultValue).slice(0, 50)
            : undefined,
        ref: schemaType.options?.ref || null,
        enum: schemaType.enumValues || null,
        immutable: !!schemaType.options?.immutable,
      };
    });

    return {
      modelName,
      collectionName: model.collection.collectionName,
      pathCount: Object.keys(paths).length,
      paths,
      indexes,
      indexCount: indexes.length,
      virtuals,
      methods,
      statics,
      timestamps: !!schema.options.timestamps,
      discriminators: model.discriminators ? Object.keys(model.discriminators) : [],
    };
  }

  /**
   * Get all schemas summary (lightweight)
   */
  getSchemaSummary() {
    const models = mongoose.modelNames();
    return models.map(name => {
      try {
        const model = mongoose.model(name);
        const schema = model.schema;
        const meta = this._registry.get(name);

        return {
          name,
          collection: model.collection.collectionName,
          fields: Object.keys(schema.paths).length,
          indexes: schema.indexes().length,
          group: meta?.group || 'unregistered',
          version: meta?.version || 'N/A',
        };
      } catch {
        return { name, error: 'Unable to introspect' };
      }
    });
  }

  // ────── Dependency Graph ──────

  _analyzeDependencies(modelName) {
    const model = this.getModel(modelName);
    if (!model) return;

    const deps = new Set();
    model.schema.eachPath((_, schemaType) => {
      const ref = schemaType.options?.ref;
      if (ref && ref !== modelName) {
        deps.add(ref);
      }
      // Handle arrays of refs
      if (schemaType.caster?.options?.ref) {
        deps.add(schemaType.caster.options.ref);
      }
    });

    this._dependencies.set(modelName, [...deps]);
  }

  /** Get dependency graph for all models */
  getDependencyGraph() {
    // Refresh dependencies for all registered models
    for (const name of mongoose.modelNames()) {
      this._analyzeDependencies(name);
    }

    const graph = {};
    for (const [model, deps] of this._dependencies) {
      graph[model] = deps;
    }
    return graph;
  }

  /** Get models that depend on a specific model */
  getDependents(modelName) {
    const dependents = [];
    for (const [model, deps] of this._dependencies) {
      if (deps.includes(modelName)) {
        dependents.push(model);
      }
    }
    return dependents;
  }

  /** Get models that a specific model depends on */
  getDependencies(modelName) {
    return this._dependencies.get(modelName) || [];
  }

  // ────── Validation ──────

  /**
   * Validate schema consistency across all models
   */
  async validateAll() {
    const models = mongoose.modelNames();
    const issues = [];

    for (const name of models) {
      try {
        const model = mongoose.model(name);
        const schema = model.schema;

        // Check for timestamps
        if (!schema.options.timestamps) {
          issues.push({
            model: name,
            type: 'missing_timestamps',
            severity: 'info',
            message: 'Schema does not have timestamps enabled',
          });
        }

        // Check for ref consistency
        schema.eachPath((pathName, schemaType) => {
          const ref = schemaType.options?.ref || schemaType.caster?.options?.ref;
          if (ref && !this._isModelRegistered(ref)) {
            issues.push({
              model: name,
              type: 'broken_ref',
              severity: 'error',
              message: `Field "${pathName}" references non-existent model "${ref}"`,
            });
          }
        });

        // Check that collection exists in DB (if connected)
        if (mongoose.connection.readyState === 1) {
          try {
            const db = mongoose.connection.db;
            const collections = await db
              .listCollections({ name: model.collection.collectionName })
              .toArray();
            if (collections.length === 0) {
              issues.push({
                model: name,
                type: 'missing_collection',
                severity: 'warning',
                message: `Collection "${model.collection.collectionName}" does not exist yet`,
              });
            }
          } catch (_) {
            // Ignore
          }
        }
      } catch (err) {
        issues.push({
          model: name,
          type: 'introspection_error',
          severity: 'error',
          message: err.message,
        });
      }
    }

    return {
      totalModels: models.length,
      errors: issues.filter(i => i.severity === 'error').length,
      warnings: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
      issues,
    };
  }

  // ────── Documentation ──────

  /**
   * Generate Markdown documentation for all schemas
   */
  generateDocs() {
    const models = mongoose.modelNames().sort();
    let md = `# Database Schema Documentation\n\n`;
    md += `> Auto-generated on ${new Date().toISOString()}\n\n`;
    md += `## Models (${models.length})\n\n`;

    // Table of contents
    md += `| # | Model | Collection | Fields | Indexes | Group |\n`;
    md += `|---|-------|------------|--------|---------|-------|\n`;

    models.forEach((name, i) => {
      try {
        const model = mongoose.model(name);
        const schema = model.schema;
        const meta = this._registry.get(name);

        md += `| ${i + 1} | ${name} | ${model.collection.collectionName} `;
        md += `| ${Object.keys(schema.paths).length} | ${schema.indexes().length} `;
        md += `| ${meta?.group || '-'} |\n`;
      } catch {
        md += `| ${i + 1} | ${name} | ERROR | - | - | - |\n`;
      }
    });

    md += `\n---\n\n`;

    // Detailed schema for each model
    for (const name of models) {
      const info = this.getSchemaInfo(name);
      if (!info) continue;

      md += `## ${name}\n\n`;
      md += `- **Collection:** \`${info.collectionName}\`\n`;

      const meta = this._registry.get(name);
      if (meta?.description) md += `- **Description:** ${meta.description}\n`;
      if (meta?.version) md += `- **Version:** ${meta.version}\n`;

      md += `\n### Fields\n\n`;
      md += `| Field | Type | Required | Unique | Ref | Index |\n`;
      md += `|-------|------|----------|--------|-----|-------|\n`;

      for (const [pathName, pathInfo] of Object.entries(info.paths)) {
        md += `| ${pathName} | ${pathInfo.type} `;
        md += `| ${pathInfo.required ? '✓' : ''} `;
        md += `| ${pathInfo.unique ? '✓' : ''} `;
        md += `| ${pathInfo.ref || ''} `;
        md += `| ${pathInfo.index ? '✓' : ''} |\n`;
      }

      if (info.indexes.length > 0) {
        md += `\n### Indexes\n\n`;
        for (const idx of info.indexes) {
          md += `- \`${JSON.stringify(idx.fields)}\``;
          if (idx.options.unique) md += ' (unique)';
          if (idx.options.sparse) md += ' (sparse)';
          md += '\n';
        }
      }

      md += `\n---\n\n`;
    }

    return md;
  }

  // ────── Helpers ──────

  _isModelRegistered(name) {
    try {
      mongoose.model(name);
      return true;
    } catch {
      return false;
    }
  }

  _inferGroup(modelName) {
    const name = modelName.toLowerCase();

    const groupMap = {
      hr: ['employee', 'leave', 'attendance', 'payroll', 'shift', 'overtime', 'recruitment'],
      finance: [
        'invoice',
        'payment',
        'transaction',
        'budget',
        'expense',
        'account',
        'journal',
        'tax',
        'cashflow',
      ],
      rehabilitation: ['rehab', 'therapy', 'beneficiary', 'assessment', 'iep', 'irp', 'session'],
      fleet: ['vehicle', 'driver', 'fleet', 'trip', 'fuel', 'maintenance'],
      education: ['student', 'teacher', 'course', 'exam', 'timetable', 'curriculum', 'elearning'],
      system: [
        'user',
        'role',
        'permission',
        'setting',
        'config',
        'auditlog',
        'notification',
        'apikey',
      ],
      crm: ['customer', 'lead', 'campaign', 'crm', 'partner', 'donor'],
      inventory: ['product', 'warehouse', 'inventory', 'asset', 'supplier', 'vendor'],
      document: ['document', 'media', 'template', 'form'],
      communication: ['message', 'correspondence', 'broadcast', 'forum'],
    };

    for (const [group, keywords] of Object.entries(groupMap)) {
      if (keywords.some(k => name.includes(k))) return group;
    }

    return 'other';
  }

  /** Get statistics about the registry */
  getStats() {
    return {
      totalModels: mongoose.modelNames().length,
      registeredModels: this._registry.size,
      groups: Object.fromEntries([...this._groups.entries()].map(([g, m]) => [g, m.length])),
      dependencies: this._dependencies.size,
    };
  }
}

// Singleton
const schemaRegistry = new SchemaRegistry();

module.exports = {
  SchemaRegistry,
  schemaRegistry,
};
