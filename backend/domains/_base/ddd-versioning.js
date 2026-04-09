/**
 * DDD Document Versioning — نظام إصدار المستندات للدومينات العلاجية
 *
 * Automatically tracks version history for key DDD documents.
 * Stores complete snapshots as immutable versions with diff metadata.
 *
 * Features:
 *  - Automatic version increment on update
 *  - Full snapshot + diff stored per version
 *  - Rollback to any previous version
 *  - Version comparison (diff between any two versions)
 *  - Per-domain versioning policy
 *
 * @module domains/_base/ddd-versioning
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════════
//  DocumentVersion Model
// ═══════════════════════════════════════════════════════════════════════════════

const documentVersionSchema = new mongoose.Schema(
  {
    /** Entity model name (e.g. 'Beneficiary', 'UnifiedCarePlan') */
    entity: { type: String, required: true, index: true },

    /** Entity document ID */
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    /** Version number (auto-incremented) */
    version: { type: Number, required: true, min: 1 },

    /** Full snapshot of the document at this version */
    snapshot: { type: mongoose.Schema.Types.Mixed, required: true },

    /** What changed from previous version */
    changes: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
      },
    ],

    /** Who made the change */
    changedBy: {
      userId: String,
      username: String,
      role: String,
    },

    /** Reason for change (optional) */
    changeReason: String,

    /** Domain this belongs to */
    domain: { type: String, index: true },

    /** Timestamp */
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,
    collection: 'document_versions',
  }
);

// Compound index for efficient queries
documentVersionSchema.index({ entity: 1, entityId: 1, version: -1 }, { unique: true });
documentVersionSchema.index({ entity: 1, entityId: 1, createdAt: -1 });
documentVersionSchema.index({ domain: 1, createdAt: -1 });

const DocumentVersion =
  mongoose.models.DocumentVersion || mongoose.model('DocumentVersion', documentVersionSchema);

// ═══════════════════════════════════════════════════════════════════════════════
//  Versioning Configuration per Domain
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Which models in each domain should be versioned
 * Key: domain name, Value: array of model names
 */
const VERSIONED_MODELS = {
  core: ['Beneficiary'],
  episodes: ['EpisodeOfCare'],
  assessments: ['ClinicalAssessment'],
  'care-plans': ['UnifiedCarePlan'],
  sessions: ['ClinicalSession'],
  goals: ['TherapeuticGoal', 'Measure'],
  workflow: ['WorkflowTask'],
  programs: ['Program'],
  quality: ['QualityAudit', 'CorrectiveAction'],
  family: ['FamilyMember'],
  reports: ['ReportTemplate'],
  'group-therapy': ['TherapyGroup'],
  'tele-rehab': ['TeleSession'],
  'ar-vr': ['ARVRSession'],
  behavior: ['BehaviorRecord', 'BehaviorPlan'],
  research: ['ResearchStudy'],
  'field-training': ['TrainingProgram'],
  dashboards: ['DashboardConfig', 'KPIDefinition'],
};

/** Check if a model is versioned */
function isVersioned(domain, modelName) {
  return VERSIONED_MODELS[domain]?.includes(modelName) ?? false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Core Versioning Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute diff between two plain objects
 */
function computeChanges(oldDoc, newDoc) {
  if (!oldDoc || !newDoc) return [];

  const SKIP = new Set(['_id', '__v', 'updatedAt', 'createdAt', 'isDeleted']);
  const changes = [];
  const allKeys = new Set([...Object.keys(oldDoc), ...Object.keys(newDoc)]);

  for (const key of allKeys) {
    if (SKIP.has(key)) continue;
    const o = JSON.stringify(oldDoc[key]);
    const n = JSON.stringify(newDoc[key]);
    if (o !== n) {
      changes.push({
        field: key,
        oldValue: oldDoc[key],
        newValue: newDoc[key],
      });
    }
  }
  return changes;
}

/**
 * Create a new version for a document
 *
 * @param {string} entity - Model name
 * @param {string} entityId - Document ID
 * @param {object} snapshot - Full document snapshot
 * @param {object} [options]
 * @param {object} [options.previousSnapshot] - Previous version snapshot for diff
 * @param {object} [options.user] - { userId, username, role }
 * @param {string} [options.reason] - Change reason
 * @param {string} [options.domain] - Domain name
 * @returns {Promise<object>} Created version document
 */
async function createVersion(entity, entityId, snapshot, options = {}) {
  const { previousSnapshot, user, reason, domain } = options;

  // Get next version number
  const lastVersion = await DocumentVersion.findOne(
    { entity, entityId },
    { version: 1 },
    { sort: { version: -1 } }
  ).lean();

  const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

  // Compute changes from previous version
  const changes = previousSnapshot ? computeChanges(previousSnapshot, snapshot) : [];

  // Clean snapshot (remove Mongoose internals)
  const cleanSnapshot = JSON.parse(JSON.stringify(snapshot));
  delete cleanSnapshot.__v;

  const version = await DocumentVersion.create({
    entity,
    entityId,
    version: nextVersion,
    snapshot: cleanSnapshot,
    changes,
    changedBy: user || { userId: 'system', username: 'system', role: 'system' },
    changeReason: reason || null,
    domain: domain || null,
  });

  return version;
}

/**
 * Get all versions for a document
 *
 * @param {string} entity - Model name
 * @param {string} entityId - Document ID
 * @param {object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.page=1]
 * @returns {Promise<{versions: object[], meta: object}>}
 */
async function getVersionHistory(entity, entityId, options = {}) {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 50, 200);
  const skip = (page - 1) * limit;

  const [versions, total] = await Promise.all([
    DocumentVersion.find({ entity, entityId }).sort({ version: -1 }).skip(skip).limit(limit).lean(),
    DocumentVersion.countDocuments({ entity, entityId }),
  ]);

  return {
    versions,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get a specific version
 *
 * @param {string} entity
 * @param {string} entityId
 * @param {number} version
 */
async function getVersion(entity, entityId, version) {
  return DocumentVersion.findOne({ entity, entityId, version }).lean();
}

/**
 * Compare two versions (diff)
 *
 * @param {string} entity
 * @param {string} entityId
 * @param {number} versionA
 * @param {number} versionB
 */
async function compareVersions(entity, entityId, versionA, versionB) {
  const [a, b] = await Promise.all([
    getVersion(entity, entityId, versionA),
    getVersion(entity, entityId, versionB),
  ]);

  if (!a || !b) {
    throw new Error(`Version not found: ${!a ? versionA : versionB}`);
  }

  return {
    versionA: { version: a.version, createdAt: a.createdAt, changedBy: a.changedBy },
    versionB: { version: b.version, createdAt: b.createdAt, changedBy: b.changedBy },
    diff: computeChanges(a.snapshot, b.snapshot),
  };
}

/**
 * Rollback to a previous version
 *
 * @param {string} entity - Model name
 * @param {string} entityId - Document ID
 * @param {number} targetVersion - Version to rollback to
 * @param {object} [user] - Who is performing the rollback
 * @returns {Promise<object>} Updated document
 */
async function rollbackToVersion(entity, entityId, targetVersion, user = null) {
  const targetDoc = await getVersion(entity, entityId, targetVersion);
  if (!targetDoc) {
    throw new Error(`Version ${targetVersion} not found for ${entity}:${entityId}`);
  }

  const Model = mongoose.models[entity];
  if (!Model) {
    throw new Error(`Model ${entity} not found`);
  }

  // Get current state for diff
  const currentDoc = await Model.findById(entityId).lean();

  // Apply rollback
  const snapshot = { ...targetDoc.snapshot };
  delete snapshot._id;
  delete snapshot.__v;

  const updated = await Model.findByIdAndUpdate(entityId, snapshot, {
    new: true,
    runValidators: true,
  }).lean();

  // Create a new version recording the rollback
  await createVersion(entity, entityId, updated, {
    previousSnapshot: currentDoc,
    user: user || { userId: 'system', username: 'system', role: 'system' },
    reason: `Rollback to version ${targetVersion}`,
    domain: targetDoc.domain,
  });

  return updated;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Express Middleware — Auto-Versioning
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Middleware that automatically creates a version after successful update/create
 *
 * @param {string} domain - DDD domain name
 * @param {string} entity - Mongoose model name
 * @returns {Function} Express middleware
 */
function dddVersioning(domain, entity) {
  return async (req, res, next) => {
    // Only version on mutations
    if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return next();

    // Capture before state for updates
    let beforeSnapshot = null;
    if (['PUT', 'PATCH'].includes(req.method) && req.params.id) {
      try {
        const Model = mongoose.models[entity];
        if (Model) {
          beforeSnapshot = await Model.findById(req.params.id).lean();
        }
      } catch {
        /* okay to skip */
      }
    }

    const originalJson = res.json.bind(res);
    res.json = body => {
      // Create version on success
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const doc = body?.data || body;
        const docId = req.params.id || doc?._id;

        if (docId && doc && typeof doc === 'object') {
          // Fire and forget — don't block response
          createVersion(entity, docId, doc, {
            previousSnapshot: beforeSnapshot,
            user: req.user
              ? {
                  userId: req.user._id?.toString() || req.user.id,
                  username: req.user.username || req.user.name || 'unknown',
                  role: req.user.role || 'unknown',
                }
              : undefined,
            domain,
          }).catch(err => {
            logger.error(`[DDD-Version] Failed: ${err.message}`);
          });
        }
      }

      return originalJson(body);
    };

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Version API Routes (mountable)
// ═══════════════════════════════════════════════════════════════════════════════

const express = require('express');

function createVersionRouter() {
  const router = express.Router();

  /**
   * GET /versions/:entity/:entityId
   * Get version history for a document
   */
  router.get('/:entity/:entityId', async (req, res) => {
    try {
      const { entity, entityId } = req.params;
      const result = await getVersionHistory(entity, entityId, {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * GET /versions/:entity/:entityId/:version
   * Get a specific version
   */
  router.get('/:entity/:entityId/:version', async (req, res) => {
    try {
      const { entity, entityId, version } = req.params;
      const doc = await getVersion(entity, entityId, parseInt(version));
      if (!doc) return res.status(404).json({ success: false, message: 'Version not found' });
      res.json({ success: true, data: doc });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * GET /versions/:entity/:entityId/compare/:vA/:vB
   * Compare two versions
   */
  router.get('/:entity/:entityId/compare/:vA/:vB', async (req, res) => {
    try {
      const { entity, entityId, vA, vB } = req.params;
      const diff = await compareVersions(entity, entityId, parseInt(vA), parseInt(vB));
      res.json({ success: true, data: diff });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  /**
   * POST /versions/:entity/:entityId/rollback/:version
   * Rollback to a specific version
   */
  router.post('/:entity/:entityId/rollback/:version', async (req, res) => {
    try {
      const { entity, entityId, version } = req.params;
      const user = req.user
        ? {
            userId: req.user._id?.toString() || req.user.id,
            username: req.user.username || req.user.name,
            role: req.user.role,
          }
        : null;

      const doc = await rollbackToVersion(entity, entityId, parseInt(version), user);
      res.json({
        success: true,
        message: `Rolled back ${entity} to version ${version}`,
        data: doc,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
}

module.exports = {
  DocumentVersion,
  VERSIONED_MODELS,
  isVersioned,
  createVersion,
  getVersionHistory,
  getVersion,
  compareVersions,
  rollbackToVersion,
  dddVersioning,
  createVersionRouter,
  computeChanges,
};
