/**
 * TTL & Data Lifecycle Manager - Al-Awael ERP
 * مدير دورة حياة البيانات وانتهاء الصلاحية
 *
 * Features:
 *  - Declarative retention policies per collection
 *  - Automated TTL index creation & management
 *  - Data aging alerts ("About to expire" notifications)
 *  - Policy engine: archive → notify → delete
 *  - Integration with data-archiver (archive before TTL delete)
 *  - Integration with audit-trail (log lifecycle events)
 *  - Policy override per document or tenant
 *  - Dashboard metrics: aging distribution, upcoming expirations
 *  - Scheduled lifecycle processing
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Default Retention Policies
// ══════════════════════════════════════════════════════════════════
const DEFAULT_POLICIES = {
  // Temporary / Session data
  sessions: { retentionDays: 7, action: 'delete', priority: 'high' },
  otps: { retentionDays: 1, action: 'delete', priority: 'high' },
  passwordResets: { retentionDays: 1, action: 'delete', priority: 'high' },
  verificationTokens: { retentionDays: 3, action: 'delete', priority: 'high' },

  // Logs / Audit
  audit_logs: { retentionDays: 365, action: 'archive-then-delete', priority: 'medium' },
  request_logs: { retentionDays: 90, action: 'delete', priority: 'medium' },
  error_logs: { retentionDays: 180, action: 'archive-then-delete', priority: 'medium' },

  // Notifications
  notifications: { retentionDays: 90, action: 'delete', priority: 'low' },
  sms_logs: { retentionDays: 180, action: 'archive-then-delete', priority: 'low' },

  // Business data (long retention)
  invoices: { retentionDays: 2555, action: 'archive', priority: 'low' }, // ~7 years
  transactions: { retentionDays: 2555, action: 'archive', priority: 'low' },
  payroll_records: { retentionDays: 2555, action: 'archive', priority: 'low' },
};

// ══════════════════════════════════════════════════════════════════
// Lifecycle Policy Schema (persisted configs)
// ══════════════════════════════════════════════════════════════════
const lifecyclePolicySchema = new mongoose.Schema(
  {
    collection: { type: String, required: true, unique: true, index: true },
    retentionDays: { type: Number, required: true },
    action: {
      type: String,
      enum: ['delete', 'archive', 'archive-then-delete', 'notify', 'none'],
      default: 'delete',
    },
    dateField: { type: String, default: 'createdAt' },
    filter: { type: mongoose.Schema.Types.Mixed, default: {} },
    priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
    enabled: { type: Boolean, default: true },
    notifyBefore: { type: Number, default: 7 }, // days before expiry to send alert
    archiveBeforeDelete: { type: Boolean, default: true },
    lastProcessedAt: { type: Date },
    lastProcessedCount: { type: Number, default: 0 },
    totalProcessed: { type: Number, default: 0 },
    tenantOverrides: [
      {
        tenantId: { type: mongoose.Schema.Types.ObjectId },
        retentionDays: { type: Number },
        action: { type: String },
      },
    ],
  },
  { timestamps: true, collection: 'lifecycle_policies', suppressReservedKeysWarning: true }
);

let LifecyclePolicy;
try {
  LifecyclePolicy = mongoose.model('LifecyclePolicy');
} catch {
  LifecyclePolicy = mongoose.model('LifecyclePolicy', lifecyclePolicySchema);
}

// ══════════════════════════════════════════════════════════════════
// TTL Lifecycle Manager
// ══════════════════════════════════════════════════════════════════
class TTLLifecycleManager {
  constructor(options = {}) {
    this._enabled = options.enabled !== false;
    this._batchSize = options.batchSize || 500;
    this._defaultPolicies = { ...DEFAULT_POLICIES, ...(options.policies || {}) };
    this._scheduleTimer = null;
    this._processing = false;
    this._onAlert = options.onAlert || null; // Callback for aging alerts
    this._archiver = null; // Will be lazy loaded
    this._auditTrail = null; // Will be lazy loaded

    // Metrics
    this._metrics = {
      totalProcessed: 0,
      totalArchived: 0,
      totalDeleted: 0,
      totalAlerts: 0,
      lastRun: null,
      lastDuration: 0,
      byCollection: {},
    };
  }

  // ────── Policy Management ──────

  /**
   * Set a retention policy for a collection
   */
  async setPolicy(collection, policy) {
    const existing = await LifecyclePolicy.findOne({ collection });
    if (existing) {
      Object.assign(existing, policy);
      await existing.save();
      logger.info(
        `[Lifecycle] Updated policy for '${collection}': ${policy.retentionDays} days, action: ${policy.action}`
      );
      return existing;
    }

    const newPolicy = await LifecyclePolicy.create({
      collection,
      retentionDays: policy.retentionDays,
      action: policy.action || 'delete',
      dateField: policy.dateField || 'createdAt',
      filter: policy.filter || {},
      priority: policy.priority || 'medium',
      enabled: policy.enabled !== false,
      notifyBefore: policy.notifyBefore || 7,
      archiveBeforeDelete: policy.archiveBeforeDelete !== false,
    });

    logger.info(`[Lifecycle] Created policy for '${collection}': ${policy.retentionDays} days`);
    return newPolicy;
  }

  /**
   * Initialize policies from defaults
   */
  async initDefaultPolicies() {
    let created = 0;
    for (const [collection, policy] of Object.entries(this._defaultPolicies)) {
      const exists = await LifecyclePolicy.findOne({ collection });
      if (!exists) {
        await this.setPolicy(collection, policy);
        created++;
      }
    }
    logger.info(`[Lifecycle] Initialized ${created} default policies`);
    return created;
  }

  /**
   * Get all policies
   */
  async getPolicies(options = {}) {
    const filter = {};
    if (options.enabled !== undefined) filter.enabled = options.enabled;
    return LifecyclePolicy.find(filter).sort({ priority: 1, collection: 1 }).lean();
  }

  /**
   * Remove a policy
   */
  async removePolicy(collection) {
    await LifecyclePolicy.deleteOne({ collection });
    logger.info(`[Lifecycle] Removed policy for '${collection}'`);
  }

  // ────── TTL Index Management ──────

  /**
   * Create TTL indexes based on policies
   */
  async createTTLIndexes() {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Not connected');

    const policies = await LifecyclePolicy.find({ enabled: true }).lean();
    const results = [];

    for (const policy of policies) {
      try {
        const collections = await db.listCollections({ name: policy.collection }).toArray();
        if (collections.length === 0) continue;

        // Check if TTL index already exists
        const indexes = await db.collection(policy.collection).indexes();
        const hasTTL = indexes.some(
          idx =>
            idx.expireAfterSeconds !== undefined && Object.keys(idx.key).includes(policy.dateField)
        );

        if (!hasTTL && policy.action === 'delete') {
          // Only create TTL index for pure-delete policies
          await db
            .collection(policy.collection)
            .createIndex(
              { [policy.dateField]: 1 },
              { expireAfterSeconds: policy.retentionDays * 86400 }
            );
          results.push({
            collection: policy.collection,
            action: 'created',
            ttlDays: policy.retentionDays,
          });
          logger.info(
            `[Lifecycle] Created TTL index on ${policy.collection}.${policy.dateField} (${policy.retentionDays}d)`
          );
        } else if (hasTTL) {
          results.push({ collection: policy.collection, action: 'already-exists' });
        } else {
          results.push({
            collection: policy.collection,
            action: 'skipped',
            reason: `action is '${policy.action}', not pure-delete`,
          });
        }
      } catch (err) {
        results.push({ collection: policy.collection, action: 'error', error: err.message });
      }
    }

    return results;
  }

  // ────── Lifecycle Processing ──────

  /**
   * Process all lifecycle policies (main execution loop)
   */
  async process(options = {}) {
    if (this._processing) {
      return { status: 'already-running' };
    }

    this._processing = true;
    const startTime = Date.now();
    const results = [];

    try {
      const policies = await LifecyclePolicy.find({ enabled: true }).sort({ priority: 1 }).lean();

      logger.info(`[Lifecycle] Processing ${policies.length} policies...`);

      for (const policy of policies) {
        try {
          const result = await this._processPolicy(policy, options);
          results.push(result);
        } catch (err) {
          results.push({ collection: policy.collection, error: err.message });
          logger.error(`[Lifecycle] Error processing ${policy.collection}: ${err.message}`);
        }
      }

      const duration = Date.now() - startTime;
      this._metrics.lastRun = new Date();
      this._metrics.lastDuration = duration;

      logger.info(
        `[Lifecycle] Processing complete: ${results.length} policies (${(duration / 1000).toFixed(1)}s)`
      );
      return { status: 'completed', duration, results };
    } finally {
      this._processing = false;
    }
  }

  async _processPolicy(policy, options = {}) {
    const db = mongoose.connection.db;
    if (!db) return { collection: policy.collection, error: 'Not connected' };

    const collections = await db.listCollections({ name: policy.collection }).toArray();
    if (collections.length === 0) {
      return { collection: policy.collection, status: 'skipped', reason: 'collection not found' };
    }

    const collection = db.collection(policy.collection);
    const cutoffDate = new Date(Date.now() - policy.retentionDays * 86400 * 1000);
    const filter = {
      ...policy.filter,
      [policy.dateField]: { $lt: cutoffDate },
    };

    const dryRun = options.dryRun || false;
    let processed = 0;
    let archived = 0;
    let deleted = 0;
    let alerts = 0;

    // Count affected documents
    const count = await collection.countDocuments(filter);
    if (count === 0) {
      return { collection: policy.collection, status: 'clean', expired: 0 };
    }

    switch (policy.action) {
      case 'delete': {
        if (!dryRun) {
          const res = await collection.deleteMany(filter);
          deleted = res.deletedCount;
        } else {
          deleted = count;
        }
        break;
      }

      case 'archive': {
        archived = await this._archiveExpired(collection, policy, filter, cutoffDate, dryRun);
        break;
      }

      case 'archive-then-delete': {
        archived = await this._archiveExpired(collection, policy, filter, cutoffDate, dryRun);
        if (!dryRun && archived > 0) {
          const res = await collection.deleteMany(filter);
          deleted = res.deletedCount;
        } else {
          deleted = count;
        }
        break;
      }

      case 'notify': {
        alerts = await this._sendAgingAlerts(collection, policy, cutoffDate);
        break;
      }

      default:
        break;
    }

    processed = archived + deleted + alerts;

    // Update policy record
    if (!dryRun) {
      await LifecyclePolicy.updateOne(
        { collection: policy.collection },
        {
          lastProcessedAt: new Date(),
          lastProcessedCount: processed,
          $inc: { totalProcessed: processed },
        }
      );
    }

    // Update metrics
    this._metrics.totalProcessed += processed;
    this._metrics.totalArchived += archived;
    this._metrics.totalDeleted += deleted;
    this._metrics.totalAlerts += alerts;
    this._metrics.byCollection[policy.collection] = {
      lastRun: new Date(),
      archived,
      deleted,
      alerts,
    };

    // Log lifecycle event via audit trail
    this._logLifecycleEvent(policy.collection, { archived, deleted, alerts, dryRun });

    return {
      collection: policy.collection,
      action: policy.action,
      dryRun,
      expired: count,
      archived,
      deleted,
      alerts,
      cutoffDate,
    };
  }

  async _archiveExpired(collection, policy, filter, cutoffDate, dryRun) {
    if (dryRun) {
      return await collection.countDocuments(filter);
    }

    try {
      // Lazy load archiver
      if (!this._archiver) {
        try {
          const { dataArchiver } = require('./data-archiver');
          this._archiver = dataArchiver;
        } catch {
          logger.warn('[Lifecycle] data-archiver not available, skipping archive');
          return 0;
        }
      }

      // Archive in batches
      let archived = 0;
      const cursor = collection.find(filter).batchSize(this._batchSize);

      while (await cursor.hasNext()) {
        const batch = [];
        for (let i = 0; i < this._batchSize && (await cursor.hasNext()); i++) {
          batch.push(await cursor.next());
        }

        if (batch.length > 0) {
          // Use archiver's storage
          try {
            await this._archiver.archive(policy.collection, {
              filter: { _id: { $in: batch.map(d => d._id) } },
              reason: `TTL lifecycle: retention ${policy.retentionDays} days`,
            });
            archived += batch.length;
          } catch (archiveErr) {
            logger.error(`[Lifecycle] Archive batch failed: ${archiveErr.message}`);
          }
        }
      }

      return archived;
    } catch (err) {
      logger.error(`[Lifecycle] Archive failed for ${policy.collection}: ${err.message}`);
      return 0;
    }
  }

  async _sendAgingAlerts(collection, policy, cutoffDate) {
    // Find documents approaching expiry (within notifyBefore days)
    const alertCutoff = new Date(cutoffDate.getTime() + (policy.notifyBefore || 7) * 86400 * 1000);
    const count = await collection.countDocuments({
      ...policy.filter,
      [policy.dateField]: { $lt: alertCutoff, $gte: cutoffDate },
    });

    if (count > 0 && this._onAlert) {
      this._onAlert({
        collection: policy.collection,
        count,
        expiresWithin: `${policy.notifyBefore || 7} days`,
        cutoffDate,
      });
    }

    if (count > 0) {
      logger.info(
        `[Lifecycle] Alert: ${count} documents in '${policy.collection}' expiring within ${policy.notifyBefore}d`
      );
    }

    return count;
  }

  _logLifecycleEvent(collectionName, details) {
    try {
      if (!this._auditTrail) {
        const { auditTrail } = require('./audit-trail');
        this._auditTrail = auditTrail;
      }

      this._auditTrail.batchLog({
        action: 'archive',
        entityType: 'LifecyclePolicy',
        entityId: collectionName,
        description: `Lifecycle processing: ${JSON.stringify(details)}`,
        source: 'system',
        severity: 'low',
      });
    } catch (_) {
      // audit trail not available
    }
  }

  // ────── Aging Analysis ──────

  /**
   * Get aging distribution for a collection
   */
  async getAgingDistribution(collectionName, options = {}) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Not connected');

    const dateField = options.dateField || 'createdAt';
    const now = new Date();
    const buckets = [
      { label: '< 1 month', maxAge: 30 },
      { label: '1-3 months', maxAge: 90 },
      { label: '3-6 months', maxAge: 180 },
      { label: '6-12 months', maxAge: 365 },
      { label: '1-2 years', maxAge: 730 },
      { label: '> 2 years', maxAge: Infinity },
    ];

    const collection = db.collection(collectionName);
    const distribution = [];
    let prevCutoff = now;

    for (const bucket of buckets) {
      const cutoff =
        bucket.maxAge === Infinity
          ? new Date(0)
          : new Date(now.getTime() - bucket.maxAge * 86400 * 1000);

      const count = await collection.countDocuments({
        [dateField]:
          bucket.maxAge === Infinity ? { $lt: prevCutoff } : { $gte: cutoff, $lt: prevCutoff },
      });

      distribution.push({ label: bucket.label, count });
      prevCutoff = cutoff;
    }

    return { collection: collectionName, dateField, distribution };
  }

  /**
   * Get upcoming expirations across all policies
   */
  async getUpcomingExpirations(withinDays = 30) {
    const policies = await LifecyclePolicy.find({ enabled: true }).lean();
    const upcoming = [];
    const db = mongoose.connection.db;
    if (!db) return upcoming;

    for (const policy of policies) {
      try {
        const collections = await db.listCollections({ name: policy.collection }).toArray();
        if (collections.length === 0) continue;

        const cutoff = new Date(Date.now() - policy.retentionDays * 86400 * 1000);
        const alertCutoff = new Date(cutoff.getTime() + withinDays * 86400 * 1000);

        const count = await db.collection(policy.collection).countDocuments({
          ...policy.filter,
          [policy.dateField]: { $lt: alertCutoff, $gte: cutoff },
        });

        if (count > 0) {
          upcoming.push({
            collection: policy.collection,
            action: policy.action,
            expiringCount: count,
            retentionDays: policy.retentionDays,
            cutoffDate: cutoff,
          });
        }
      } catch (_) {
        // skip
      }
    }

    return upcoming.sort((a, b) => b.expiringCount - a.expiringCount);
  }

  // ────── Scheduling ──────

  /**
   * Start scheduled lifecycle processing
   * @param {number} intervalMs - Processing interval (default: 24h)
   */
  startSchedule(intervalMs = 24 * 60 * 60 * 1000) {
    if (this._scheduleTimer) return;

    this._scheduleTimer = setInterval(async () => {
      try {
        logger.info('[Lifecycle] Scheduled processing starting...');
        await this.process();
      } catch (err) {
        logger.error(`[Lifecycle] Scheduled processing failed: ${err.message}`);
      }
    }, intervalMs);

    logger.info(
      `[Lifecycle] Scheduled processing enabled (every ${(intervalMs / 3600000).toFixed(1)}h)`
    );
  }

  stopSchedule() {
    if (this._scheduleTimer) {
      clearInterval(this._scheduleTimer);
      this._scheduleTimer = null;
      logger.info('[Lifecycle] Scheduled processing disabled');
    }
  }

  // ────── Metrics ──────

  getMetrics() {
    return {
      ...this._metrics,
      enabled: this._enabled,
      scheduled: !!this._scheduleTimer,
      processing: this._processing,
    };
  }

  /**
   * Get comprehensive lifecycle status
   */
  async getStatus() {
    const policies = await LifecyclePolicy.find().lean();
    const db = mongoose.connection.db;

    const status = {
      totalPolicies: policies.length,
      enabledPolicies: policies.filter(p => p.enabled).length,
      metrics: this.getMetrics(),
      policies: [],
    };

    if (db) {
      for (const policy of policies) {
        try {
          const collections = await db.listCollections({ name: policy.collection }).toArray();
          const cutoff = new Date(Date.now() - policy.retentionDays * 86400 * 1000);
          let expiredCount = 0;

          if (collections.length > 0) {
            expiredCount = await db.collection(policy.collection).countDocuments({
              [policy.dateField]: { $lt: cutoff },
            });
          }

          status.policies.push({
            collection: policy.collection,
            retentionDays: policy.retentionDays,
            action: policy.action,
            enabled: policy.enabled,
            currentlyExpired: expiredCount,
            lastProcessed: policy.lastProcessedAt,
            totalProcessed: policy.totalProcessed,
          });
        } catch (_) {
          status.policies.push({
            collection: policy.collection,
            error: 'failed to check',
          });
        }
      }
    }

    return status;
  }
}

// Singleton
const lifecycleManager = new TTLLifecycleManager();

module.exports = {
  TTLLifecycleManager,
  lifecycleManager,
  LifecyclePolicy,
  DEFAULT_POLICIES,
};
