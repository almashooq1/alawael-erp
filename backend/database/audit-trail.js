/**
 * Audit Trail System - Al-Awael ERP
 * نظام تتبع التغييرات والمراجعة
 *
 * Features:
 *  - Field-level change tracking with diff computation
 *  - Before/After snapshots
 *  - User attribution (who changed what)
 *  - IP & user-agent tracking
 *  - Compliance reporting (SOC2, GDPR)
 *  - Timeline view per document
 *  - Bulk change detection
 *  - Query audit logs with filters
 *  - Retention policies
 *  - Export capabilities
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Audit Log Schema
// ══════════════════════════════════════════════════════════════════
const auditLogSchema = new mongoose.Schema(
  {
    // Identity
    action: {
      type: String,
      enum: [
        'create',
        'update',
        'delete',
        'restore',
        'archive',
        'access',
        'export',
        'import',
        'login',
        'logout',
        'permission_change',
      ],
      required: true,
      index: true,
    },
    entityType: { type: String, required: true, index: true },
    entityId: { type: mongoose.Schema.Types.Mixed, index: true },
    entityName: { type: String },

    // Actor
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    userName: { type: String },
    userRole: { type: String },
    userEmail: { type: String },

    // Context
    ip: { type: String },
    userAgent: { type: String },
    sessionId: { type: String },
    requestId: { type: String },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },

    // Change details
    changes: [
      {
        field: { type: String, required: true },
        fieldLabel: { type: String },
        oldValue: { type: mongoose.Schema.Types.Mixed },
        newValue: { type: mongoose.Schema.Types.Mixed },
        type: { type: String, enum: ['added', 'modified', 'removed'] },
      },
    ],

    // Snapshots
    before: { type: mongoose.Schema.Types.Mixed },
    after: { type: mongoose.Schema.Types.Mixed },

    // Metadata
    source: {
      type: String,
      enum: ['api', 'system', 'migration', 'import', 'webhook'],
      default: 'api',
    },
    description: { type: String },
    tags: [{ type: String }],
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },

    // Retention
    expiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  {
    timestamps: true,
    collection: 'audit_logs',
  }
);

// Compound indexes for efficient querying
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ branchId: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

let AuditLog;
try {
  AuditLog = mongoose.model('AuditLog');
} catch {
  AuditLog = mongoose.model('AuditLog', auditLogSchema);
}

// ══════════════════════════════════════════════════════════════════
// AuditTrail Class
// ══════════════════════════════════════════════════════════════════
class AuditTrail {
  constructor(options = {}) {
    this._enabled = options.enabled !== false;
    this._retentionDays = options.retentionDays || 365;
    this._excludeFields = new Set(
      options.excludeFields || [
        'password',
        'passwordHash',
        '__v',
        'updatedAt',
        'createdAt',
        'token',
        'refreshToken',
        'accessToken',
        'secretKey',
        'apiKey',
      ]
    );
    this._sensitiveFields = new Set(
      options.sensitiveFields || [
        'password',
        'passwordHash',
        'token',
        'refreshToken',
        'accessToken',
        'secretKey',
        'apiKey',
        'ssn',
        'nationalId',
      ]
    );
    this._batchQueue = [];
    this._batchTimer = null;
    this._batchSize = options.batchSize || 50;
    this._batchInterval = options.batchInterval || 5000;
  }

  // ────── Core Logging ──────

  /**
   * Log an audit event
   * @param {Object} entry - Audit log entry
   * @returns {Object} Created audit log
   */
  async log(entry) {
    if (!this._enabled) return null;

    const auditEntry = {
      action: entry.action,
      entityType: entry.entityType || entry.model || 'Unknown',
      entityId: entry.entityId || entry.documentId,
      entityName: entry.entityName,
      userId: entry.userId || entry.user?._id,
      userName: entry.userName || entry.user?.name,
      userRole: entry.userRole || entry.user?.role,
      userEmail: entry.userEmail || entry.user?.email,
      ip: entry.ip,
      userAgent: entry.userAgent,
      sessionId: entry.sessionId,
      requestId: entry.requestId,
      branchId: entry.branchId,
      source: entry.source || 'api',
      description: entry.description,
      tags: entry.tags || [],
      severity: entry.severity || this._determineSeverity(entry.action),
      expiresAt: new Date(Date.now() + this._retentionDays * 24 * 60 * 60 * 1000),
    };

    // Compute field-level changes
    if (entry.before && entry.after) {
      auditEntry.changes = this._computeChanges(entry.before, entry.after);
      auditEntry.before = this._sanitizeSnapshot(entry.before);
      auditEntry.after = this._sanitizeSnapshot(entry.after);
    } else if (entry.changes) {
      auditEntry.changes = entry.changes;
    }

    // For create actions, capture the full document
    if (entry.action === 'create' && entry.after) {
      auditEntry.after = this._sanitizeSnapshot(entry.after);
    }

    // For delete actions, capture the deleted document
    if (entry.action === 'delete' && entry.before) {
      auditEntry.before = this._sanitizeSnapshot(entry.before);
    }

    try {
      const log = await AuditLog.create(auditEntry);
      return log;
    } catch (err) {
      logger.error(`[AuditTrail] Failed to log: ${err.message}`);
      return null;
    }
  }

  /**
   * Batch log (queues and flushes periodically)
   */
  batchLog(entry) {
    if (!this._enabled) return;

    this._batchQueue.push(entry);

    if (this._batchQueue.length >= this._batchSize) {
      this._flushBatch();
    } else if (!this._batchTimer) {
      this._batchTimer = setTimeout(() => this._flushBatch(), this._batchInterval);
    }
  }

  async _flushBatch() {
    if (this._batchTimer) {
      clearTimeout(this._batchTimer);
      this._batchTimer = null;
    }

    if (this._batchQueue.length === 0) return;

    const entries = this._batchQueue.splice(0);
    const docs = entries.map(entry => ({
      action: entry.action,
      entityType: entry.entityType || 'Unknown',
      entityId: entry.entityId,
      userId: entry.userId,
      userName: entry.userName,
      source: entry.source || 'system',
      description: entry.description,
      changes:
        entry.before && entry.after
          ? this._computeChanges(entry.before, entry.after)
          : entry.changes || [],
      severity: entry.severity || this._determineSeverity(entry.action),
      expiresAt: new Date(Date.now() + this._retentionDays * 24 * 60 * 60 * 1000),
    }));

    try {
      await AuditLog.insertMany(docs, { ordered: false });
      logger.debug(`[AuditTrail] Flushed ${docs.length} batch entries`);
    } catch (err) {
      logger.error(`[AuditTrail] Batch flush error: ${err.message}`);
    }
  }

  // ────── Diff Computation ──────

  _computeChanges(before, after) {
    const changes = [];
    const beforeObj = before.toObject ? before.toObject() : { ...before };
    const afterObj = after.toObject ? after.toObject() : { ...after };

    const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

    for (const key of allKeys) {
      if (this._excludeFields.has(key)) continue;
      if (key.startsWith('_') && key !== '_id') continue;

      const oldVal = beforeObj[key];
      const newVal = afterObj[key];

      // Skip if identical
      if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue;

      let type;
      if (oldVal === undefined || oldVal === null) {
        type = 'added';
      } else if (newVal === undefined || newVal === null) {
        type = 'removed';
      } else {
        type = 'modified';
      }

      changes.push({
        field: key,
        oldValue: this._sensitiveFields.has(key) ? '***' : oldVal,
        newValue: this._sensitiveFields.has(key) ? '***' : newVal,
        type,
      });
    }

    return changes;
  }

  _sanitizeSnapshot(doc) {
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    const sanitized = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this._sensitiveFields.has(key)) {
        sanitized[key] = '***REDACTED***';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // ────── Queries ──────

  /**
   * Get audit trail for a specific document
   */
  async getDocumentHistory(entityType, entityId, options = {}) {
    const query = { entityType, entityId };
    if (options.action) query.action = options.action;
    if (options.userId) query.userId = options.userId;

    return AuditLog.find(query)
      .sort({ createdAt: options.order === 'asc' ? 1 : -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .lean();
  }

  /**
   * Get audit trail for a user
   */
  async getUserActivity(userId, options = {}) {
    const query = { userId };
    if (options.action) query.action = options.action;
    if (options.from) query.createdAt = { $gte: options.from };
    if (options.to) {
      query.createdAt = query.createdAt || {};
      query.createdAt.$lte = options.to;
    }

    return AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50)
      .lean();
  }

  /**
   * Search audit logs
   */
  async search(filters = {}, options = {}) {
    const query = {};

    if (filters.action) query.action = filters.action;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.severity) query.severity = filters.severity;
    if (filters.source) query.source = filters.source;
    if (filters.branchId) query.branchId = filters.branchId;

    if (filters.from || filters.to) {
      query.createdAt = {};
      if (filters.from) query.createdAt.$gte = new Date(filters.from);
      if (filters.to) query.createdAt.$lte = new Date(filters.to);
    }

    if (filters.search) {
      query.$or = [
        { entityName: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { userName: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const [results, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 50)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return {
      data: results,
      total,
      page: Math.floor((options.skip || 0) / (options.limit || 50)) + 1,
      pages: Math.ceil(total / (options.limit || 50)),
    };
  }

  // ────── Analytics & Reports ──────

  /**
   * Get audit statistics
   */
  async getStats(options = {}) {
    const matchStage = {};
    if (options.from) matchStage.createdAt = { $gte: new Date(options.from) };
    if (options.to) {
      matchStage.createdAt = matchStage.createdAt || {};
      matchStage.createdAt.$lte = new Date(options.to);
    }

    const [actionStats, entityStats, userStats, severityStats, totalCount, dailyTrend] =
      await Promise.all([
        // Actions breakdown
        AuditLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$action', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Entity types breakdown
        AuditLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$entityType', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 20 },
        ]),

        // Top users
        AuditLog.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$userId',
              userName: { $first: '$userName' },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),

        // Severity breakdown
        AuditLog.aggregate([
          { $match: matchStage },
          { $group: { _id: '$severity', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Total count
        AuditLog.countDocuments(matchStage),

        // Daily trend (last 30 days)
        AuditLog.aggregate([
          {
            $match: {
              createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
              creates: { $sum: { $cond: [{ $eq: ['$action', 'create'] }, 1, 0] } },
              updates: { $sum: { $cond: [{ $eq: ['$action', 'update'] }, 1, 0] } },
              deletes: { $sum: { $cond: [{ $eq: ['$action', 'delete'] }, 1, 0] } },
            },
          },
          { $sort: { _id: 1 } },
        ]),
      ]);

    return {
      total: totalCount,
      actions: actionStats.reduce((acc, a) => ({ ...acc, [a._id]: a.count }), {}),
      topEntities: entityStats.map(e => ({ entity: e._id, count: e.count })),
      topUsers: userStats.map(u => ({ userId: u._id, name: u.userName, count: u.count })),
      severity: severityStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      dailyTrend,
    };
  }

  /**
   * Generate compliance report
   */
  async complianceReport(options = {}) {
    const from = options.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = options.to || new Date();

    const match = { createdAt: { $gte: from, $lte: to } };

    const [
      totalEvents,
      criticalEvents,
      loginEvents,
      permissionChanges,
      dataExports,
      deletionEvents,
    ] = await Promise.all([
      AuditLog.countDocuments(match),
      AuditLog.countDocuments({ ...match, severity: 'critical' }),
      AuditLog.countDocuments({ ...match, action: { $in: ['login', 'logout'] } }),
      AuditLog.countDocuments({ ...match, action: 'permission_change' }),
      AuditLog.countDocuments({ ...match, action: 'export' }),
      AuditLog.countDocuments({ ...match, action: 'delete' }),
    ]);

    return {
      period: { from, to },
      summary: {
        totalEvents,
        criticalEvents,
        loginEvents,
        permissionChanges,
        dataExports,
        deletionEvents,
      },
      compliance: {
        auditTrailEnabled: this._enabled,
        retentionDays: this._retentionDays,
        sensitiveFieldsMasked: this._sensitiveFields.size,
        encryptionAtRest: 'Depends on MongoDB configuration',
      },
      generatedAt: new Date(),
    };
  }

  // ────── Mongoose Plugin ──────

  /**
   * Mongoose plugin for automatic audit trail
   * Usage: schema.plugin(auditTrail.plugin(), { modelName: 'Product' })
   */
  plugin() {
    const self = this;

    return function auditTrailPlugin(schema, pluginOptions = {}) {
      const modelName = pluginOptions.modelName || 'Unknown';

      // Track saves (create/update)
      schema.pre('save', function (next) {
        if (this.isNew) {
          this._auditAction = 'create';
        } else {
          this._auditAction = 'update';
          this._auditBefore = this._original || {};
        }
        next();
      });

      schema.post('save', function (doc) {
        const entry = {
          action: doc._auditAction || 'update',
          entityType: modelName,
          entityId: doc._id,
          entityName: doc.name || doc.title || doc.code || String(doc._id),
          after: doc.toObject ? doc.toObject() : doc,
          source: 'system',
        };

        if (doc._auditAction === 'update' && doc._auditBefore) {
          entry.before = doc._auditBefore;
        }

        // Use user context if available on the document
        if (doc._auditUser) {
          entry.userId = doc._auditUser._id;
          entry.userName = doc._auditUser.name;
          entry.userRole = doc._auditUser.role;
        }

        self.batchLog(entry);
      });

      // Track deletions
      schema.pre('findOneAndDelete', async function () {
        this._auditDoc = await this.model.findOne(this.getFilter()).lean();
      });

      schema.post('findOneAndDelete', function (doc) {
        if (this._auditDoc || doc) {
          self.batchLog({
            action: 'delete',
            entityType: modelName,
            entityId: (this._auditDoc || doc)?._id,
            entityName: (this._auditDoc || doc)?.name || String((this._auditDoc || doc)?._id),
            before: this._auditDoc || doc,
            source: 'system',
          });
        }
      });

      // Track soft deletes
      schema.pre('findOneAndUpdate', async function () {
        const update = this.getUpdate();
        if (update?.$set?.isDeleted === true || update?.isDeleted === true) {
          this._auditSoftDelete = true;
          this._auditDoc = await this.model.findOne(this.getFilter()).lean();
        }
      });

      schema.post('findOneAndUpdate', function (doc) {
        if (this._auditSoftDelete && this._auditDoc) {
          self.batchLog({
            action: 'delete',
            entityType: modelName,
            entityId: this._auditDoc._id,
            entityName: this._auditDoc.name || String(this._auditDoc._id),
            before: this._auditDoc,
            description: 'Soft delete',
            source: 'system',
          });
        }
      });
    };
  }

  // ────── Helpers ──────

  _determineSeverity(action) {
    const severityMap = {
      create: 'low',
      update: 'low',
      access: 'low',
      delete: 'medium',
      archive: 'medium',
      restore: 'medium',
      export: 'medium',
      import: 'medium',
      login: 'low',
      logout: 'low',
      permission_change: 'high',
    };
    return severityMap[action] || 'low';
  }

  /** Cleanup old audit logs */
  async cleanup(olderThanDays) {
    const days = olderThanDays || this._retentionDays;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
    logger.info(`[AuditTrail] Cleaned up ${result.deletedCount} old audit logs`);
    return { deleted: result.deletedCount, olderThan: cutoff };
  }

  /** Flush any pending batch entries */
  async flush() {
    await this._flushBatch();
  }
}

// Singleton
const auditTrail = new AuditTrail();

module.exports = {
  AuditTrail,
  auditTrail,
  AuditLog,
};
