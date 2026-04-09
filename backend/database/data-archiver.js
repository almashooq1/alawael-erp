/**
 * Data Archival System - Al-Awael ERP
 * نظام أرشفة البيانات الذكي
 *
 * Features:
 *  - Automatic archival of old data based on configurable policies
 *  - Archive collection naming convention: {collection}_archive
 *  - Compression via MongoDB native compression
 *  - Restore from archive with audit trail
 *  - Archival policies per model (age, status, custom conditions)
 *  - Scheduled archival via cron-like expressions
 *  - Archive statistics and reporting
 *  - GDPR/compliance data retention support
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Default Archive Policies
// ══════════════════════════════════════════════════════════════════
const DEFAULT_POLICIES = {
  // Logs older than 6 months
  AuditLog: {
    ageFieldName: 'createdAt',
    maxAgeDays: 180,
    batchSize: 1000,
    deleteAfterArchive: true,
  },
  // Notifications older than 3 months
  Notification: {
    ageFieldName: 'createdAt',
    maxAgeDays: 90,
    batchSize: 500,
    deleteAfterArchive: true,
  },
  // Completed sessions older than 1 year
  TherapySession: {
    ageFieldName: 'sessionDate',
    maxAgeDays: 365,
    conditions: { status: 'completed' },
    batchSize: 200,
    deleteAfterArchive: false,
  },
  // Closed invoices older than 2 years
  Invoice: {
    ageFieldName: 'createdAt',
    maxAgeDays: 730,
    conditions: { status: { $in: ['paid', 'cancelled'] } },
    batchSize: 200,
    deleteAfterArchive: false,
  },
  // Old attendance records (> 2 years)
  Attendance: {
    ageFieldName: 'date',
    maxAgeDays: 730,
    batchSize: 1000,
    deleteAfterArchive: true,
  },
};

// ══════════════════════════════════════════════════════════════════
// Archive Metadata Schema
// ══════════════════════════════════════════════════════════════════
const archiveMetaSchema = new mongoose.Schema(
  {
    sourceCollection: { type: String, required: true, index: true },
    archiveCollection: { type: String, required: true },
    documentsArchived: { type: Number, required: true },
    documentsDeleted: { type: Number, default: 0 },
    archivedBy: { type: String, default: 'system' },
    policy: { type: mongoose.Schema.Types.Mixed },
    filterUsed: { type: mongoose.Schema.Types.Mixed },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date },
    status: {
      type: String,
      enum: ['running', 'completed', 'failed', 'partial'],
      default: 'running',
    },
    error: { type: String },
    restoredAt: { type: Date },
    restoredBy: { type: String },
  },
  { timestamps: true }
);

let ArchiveMeta;
try {
  ArchiveMeta = mongoose.model('ArchiveMeta');
} catch {
  ArchiveMeta = mongoose.model('ArchiveMeta', archiveMetaSchema);
}

// ══════════════════════════════════════════════════════════════════
// DataArchiver Class
// ══════════════════════════════════════════════════════════════════
class DataArchiver {
  constructor(options = {}) {
    this._policies = { ...DEFAULT_POLICIES, ...options.policies };
    this._archiveSuffix = options.archiveSuffix || '_archive';
    this._dryRun = options.dryRun || false;
    this._auditEnabled = options.audit !== false;
  }

  /**
   * Archive old data for a specific model
   *
   * @param {string} modelName - Mongoose model name
   * @param {Object} customPolicy - Override default policy
   * @returns {Object} Archive result stats
   */
  async archiveModel(modelName, customPolicy = {}) {
    const policy = { ...this._policies[modelName], ...customPolicy };

    if (!policy.ageFieldName || !policy.maxAgeDays) {
      throw new Error(`No archival policy defined for model: ${modelName}`);
    }

    let Model;
    try {
      Model = mongoose.model(modelName);
    } catch {
      throw new Error(`Model not found: ${modelName}`);
    }

    const sourceCollection = Model.collection.collectionName;
    const archiveCollectionName = `${sourceCollection}${this._archiveSuffix}`;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.maxAgeDays);

    // Build filter
    const filter = {
      [policy.ageFieldName]: { $lt: cutoffDate },
      ...policy.conditions,
    };

    const startedAt = new Date();
    let meta;

    if (this._auditEnabled) {
      meta = await ArchiveMeta.create({
        sourceCollection,
        archiveCollection: archiveCollectionName,
        documentsArchived: 0,
        policy,
        filterUsed: filter,
        startedAt,
        status: 'running',
      });
    }

    try {
      const db = mongoose.connection.db;
      const batchSize = policy.batchSize || 500;
      let totalArchived = 0;
      let totalDeleted = 0;

      // Process in batches
      let hasMore = true;
      while (hasMore) {
        const docs = await Model.find(filter).limit(batchSize).lean().exec();

        if (docs.length === 0) {
          hasMore = false;
          break;
        }

        if (!this._dryRun) {
          // Add archive metadata to each document
          const archiveDocs = docs.map(doc => ({
            ...doc,
            _archivedAt: new Date(),
            _archivedFrom: sourceCollection,
            _originalId: doc._id,
          }));

          // Insert into archive collection
          await db.collection(archiveCollectionName).insertMany(archiveDocs, {
            ordered: false,
          });

          totalArchived += docs.length;

          // Delete from source if policy says so
          if (policy.deleteAfterArchive) {
            const ids = docs.map(d => d._id);
            const deleteResult = await Model.deleteMany({ _id: { $in: ids } });
            totalDeleted += deleteResult.deletedCount;
          }
        } else {
          totalArchived += docs.length;
          hasMore = false; // Don't loop in dry-run
        }

        // Break if less than batch size (no more docs)
        if (docs.length < batchSize) hasMore = false;
      }

      // Update metadata
      if (meta) {
        meta.documentsArchived = totalArchived;
        meta.documentsDeleted = totalDeleted;
        meta.completedAt = new Date();
        meta.status = 'completed';
        await meta.save();
      }

      const result = {
        model: modelName,
        sourceCollection,
        archiveCollection: archiveCollectionName,
        documentsArchived: totalArchived,
        documentsDeleted: totalDeleted,
        cutoffDate,
        dryRun: this._dryRun,
        durationMs: Date.now() - startedAt.getTime(),
      };

      logger.info(`[Archive] ${modelName}: ${totalArchived} docs archived`, result);
      return result;
    } catch (err) {
      if (meta) {
        meta.status = 'failed';
        meta.error = err.message;
        meta.completedAt = new Date();
        await meta.save();
      }
      logger.error(`[Archive] Failed for ${modelName}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Run archival for all configured models
   */
  async archiveAll(options = {}) {
    const models = options.models || Object.keys(this._policies);
    const results = [];

    for (const modelName of models) {
      try {
        // Check if model exists
        mongoose.model(modelName);
        const result = await this.archiveModel(modelName);
        results.push(result);
      } catch (err) {
        results.push({
          model: modelName,
          error: err.message,
          status: 'failed',
        });
      }
    }

    return {
      totalModels: models.length,
      succeeded: results.filter(r => !r.error).length,
      failed: results.filter(r => r.error).length,
      results,
    };
  }

  /**
   * Restore archived documents back to the source collection
   *
   * @param {string} modelName - Model name
   * @param {Object} filter - Filter for archive documents to restore
   * @param {string} restoredBy - User who initiated the restore
   */
  async restore(modelName, filter = {}, restoredBy = 'system') {
    let Model;
    try {
      Model = mongoose.model(modelName);
    } catch {
      throw new Error(`Model not found: ${modelName}`);
    }

    const sourceCollection = Model.collection.collectionName;
    const archiveCollectionName = `${sourceCollection}${this._archiveSuffix}`;
    const db = mongoose.connection.db;

    const archiveCollection = db.collection(archiveCollectionName);
    const docs = await archiveCollection.find(filter).toArray();

    if (docs.length === 0) {
      return { restored: 0, message: 'No documents found in archive matching filter' };
    }

    // Remove archive metadata before restoring
    const restoreDocs = docs.map(doc => {
      const restored = { ...doc };
      if (restored._originalId) {
        restored._id = restored._originalId;
      }
      delete restored._archivedAt;
      delete restored._archivedFrom;
      delete restored._originalId;
      return restored;
    });

    // Insert back to source collection
    await db.collection(sourceCollection).insertMany(restoreDocs, { ordered: false });

    // Remove from archive
    const archiveIds = docs.map(d => d._id);
    await archiveCollection.deleteMany({ _id: { $in: archiveIds } });

    logger.info(`[Archive] Restored ${docs.length} docs to ${modelName}`, { restoredBy });

    return {
      restored: docs.length,
      model: modelName,
      restoredBy,
      restoredAt: new Date(),
    };
  }

  /**
   * Get archive statistics
   */
  async getStats() {
    const db = mongoose.connection.db;
    if (!db) return { error: 'Not connected' };

    const collections = await db.listCollections().toArray();
    const archiveCollections = collections.filter(c => c.name.endsWith(this._archiveSuffix));

    const stats = [];
    for (const col of archiveCollections) {
      try {
        const count = await db.collection(col.name).countDocuments();
        const colStats = await db.collection(col.name).stats();
        stats.push({
          collection: col.name,
          sourceCollection: col.name.replace(this._archiveSuffix, ''),
          documentCount: count,
          sizeBytes: colStats.size,
          avgDocSize: colStats.avgObjSize || 0,
        });
      } catch (_) {
        stats.push({ collection: col.name, error: 'Unable to get stats' });
      }
    }

    // Get recent archive operations
    let recentOps = [];
    try {
      recentOps = await ArchiveMeta.find().sort({ createdAt: -1 }).limit(20).lean();
    } catch (_) {
      // ArchiveMeta might not exist yet
    }

    return {
      archiveCollections: archiveCollections.length,
      stats,
      recentOperations: recentOps,
    };
  }

  /**
   * Configure data retention policy (GDPR compliance)
   */
  setRetentionPolicy(modelName, policy) {
    this._policies[modelName] = { ...this._policies[modelName], ...policy };
    logger.info(`[Archive] Retention policy updated for ${modelName}`, { policy });
  }

  /**
   * Get all configured policies
   */
  getPolicies() {
    return { ...this._policies };
  }

  /**
   * Purge archive data older than specified days
   */
  async purgeArchive(modelName, olderThanDays = 365 * 5) {
    let Model;
    try {
      Model = mongoose.model(modelName);
    } catch {
      throw new Error(`Model not found: ${modelName}`);
    }

    const archiveCollectionName = `${Model.collection.collectionName}${this._archiveSuffix}`;
    const db = mongoose.connection.db;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const result = await db.collection(archiveCollectionName).deleteMany({
      _archivedAt: { $lt: cutoff },
    });

    logger.info(`[Archive] Purged ${result.deletedCount} docs from ${archiveCollectionName}`);
    return { purged: result.deletedCount, collection: archiveCollectionName };
  }
}

// Singleton
const dataArchiver = new DataArchiver();

module.exports = {
  DataArchiver,
  dataArchiver,
  ArchiveMeta,
  DEFAULT_POLICIES,
};
