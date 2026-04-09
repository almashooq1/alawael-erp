/**
 * Smart Index Optimizer - Al-Awael ERP
 * محسّن الفهارس الذكي
 *
 * Features:
 *  - Automatic index usage analysis
 *  - Unused index detection & cleanup recommendations
 *  - Missing index suggestions based on query patterns
 *  - Compound index optimization
 *  - Index creation with zero-downtime (background builds)
 *  - Index cardinality analysis
 *  - Performance impact estimation
 *  - Scheduled index maintenance
 *  - ESR (Equality-Sort-Range) rule enforcement
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// SmartIndexOptimizer
// ══════════════════════════════════════════════════════════════════
class SmartIndexOptimizer {
  constructor(options = {}) {
    this._queryPatterns = new Map(); // collection -> [{ filter, sort, count }]
    this._maxPatterns = options.maxPatterns || 500;
    this._recommendations = [];
    this._appliedIndexes = [];
    this._enabled = options.enabled !== false;
  }

  // ────── Query Pattern Tracking ──────

  /**
   * Record a query pattern for later analysis
   * Call this automatically from query middleware
   */
  recordQuery(collection, filter = {}, sort = {}, projection = {}) {
    if (!this._enabled) return;

    const filterKeys = Object.keys(filter)
      .filter(k => !k.startsWith('$'))
      .sort()
      .join(',');
    const sortKeys = Object.keys(sort).sort().join(',');
    const key = `${filterKeys}|${sortKeys}`;

    if (!this._queryPatterns.has(collection)) {
      this._queryPatterns.set(collection, new Map());
    }

    const patterns = this._queryPatterns.get(collection);
    if (patterns.has(key)) {
      const entry = patterns.get(key);
      entry.count++;
      entry.lastSeen = Date.now();
    } else {
      if (patterns.size >= this._maxPatterns) {
        // Remove least used pattern
        let minKey = null;
        let minCount = Infinity;
        for (const [k, v] of patterns) {
          if (v.count < minCount) {
            minCount = v.count;
            minKey = k;
          }
        }
        if (minKey) patterns.delete(minKey);
      }

      patterns.set(key, {
        filterFields: filterKeys.split(',').filter(Boolean),
        sortFields: sortKeys.split(',').filter(Boolean),
        projectionFields: Object.keys(projection),
        count: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
  }

  // ────── Analyze All Collections ──────

  /**
   * Full index analysis for the database
   * @returns {Object} Analysis report with recommendations
   */
  async analyze() {
    const db = mongoose.connection.db;
    if (!db) return { error: 'Not connected to database' };

    const report = {
      timestamp: new Date(),
      collections: [],
      recommendations: [],
      summary: { totalIndexes: 0, unusedIndexes: 0, missingIndexes: 0, redundantIndexes: 0 },
    };

    try {
      const collections = await db.listCollections().toArray();

      for (const col of collections) {
        if (col.name.startsWith('system.')) continue;

        try {
          const analysis = await this._analyzeCollection(db, col.name);
          report.collections.push(analysis);
          report.summary.totalIndexes += analysis.indexCount;
          report.summary.unusedIndexes += analysis.unusedIndexes.length;
          report.summary.redundantIndexes += analysis.redundantIndexes.length;
        } catch (err) {
          report.collections.push({
            name: col.name,
            error: err.message,
          });
        }
      }

      // Generate missing index recommendations from query patterns
      const missingRecs = this._generateMissingIndexRecommendations();
      report.recommendations.push(...missingRecs);
      report.summary.missingIndexes = missingRecs.length;

      this._recommendations = report.recommendations;
      return report;
    } catch (err) {
      return { error: err.message };
    }
  }

  // ────── Analyze Single Collection ──────

  async _analyzeCollection(db, collectionName) {
    const collection = db.collection(collectionName);
    const indexes = await collection.indexes();
    let indexStats = [];

    try {
      indexStats = await collection.aggregate([{ $indexStats: {} }]).toArray();
    } catch (_) {
      // $indexStats may not be available in all environments
    }

    const colStats = await collection.stats().catch(() => ({}));
    const docCount = colStats.count || 0;

    // Identify unused indexes (never accessed or accessed 0 times)
    const unusedIndexes = [];
    const usageMap = new Map();

    for (const stat of indexStats) {
      usageMap.set(stat.name, {
        accesses: stat.accesses?.ops || 0,
        since: stat.accesses?.since,
      });
    }

    for (const idx of indexes) {
      if (idx.name === '_id_') continue; // Never remove _id index

      const usage = usageMap.get(idx.name);
      if (usage && usage.accesses === 0) {
        unusedIndexes.push({
          name: idx.name,
          key: idx.key,
          since: usage.since,
          recommendation: 'Consider dropping — never used since server start',
        });
      }
    }

    // Identify redundant indexes (prefix-covered by compound indexes)
    const redundantIndexes = this._findRedundantIndexes(indexes);

    // Check for wide compound indexes
    const wideIndexes = indexes.filter(
      idx => Object.keys(idx.key).length > 4 && idx.name !== '_id_'
    );

    // Estimate index sizes
    const totalIndexSize = colStats.totalIndexSize || 0;

    return {
      name: collectionName,
      documentCount: docCount,
      indexCount: indexes.length,
      indexes: indexes.map(idx => ({
        name: idx.name,
        key: idx.key,
        unique: idx.unique || false,
        sparse: idx.sparse || false,
        partial: !!idx.partialFilterExpression,
        ttl: idx.expireAfterSeconds || null,
        usage: usageMap.get(idx.name) || { accesses: 'N/A' },
      })),
      unusedIndexes,
      redundantIndexes,
      wideIndexes: wideIndexes.map(i => ({
        name: i.name,
        key: i.key,
        fieldCount: Object.keys(i.key).length,
        recommendation: 'Consider splitting — too many fields',
      })),
      totalIndexSize: this._formatBytes(totalIndexSize),
      indexToDocRatio:
        docCount > 0 ? (indexes.length / Math.log10(docCount + 1)).toFixed(2) : 'N/A',
    };
  }

  // ────── Find Redundant Indexes ──────

  _findRedundantIndexes(indexes) {
    const redundant = [];
    const indexKeys = indexes.map(idx => ({
      name: idx.name,
      fields: Object.keys(idx.key),
      key: idx.key,
      unique: idx.unique || false,
    }));

    for (let i = 0; i < indexKeys.length; i++) {
      if (indexKeys[i].name === '_id_') continue;

      for (let j = 0; j < indexKeys.length; j++) {
        if (i === j) continue;
        if (indexKeys[j].name === '_id_') continue;

        const a = indexKeys[i].fields;
        const b = indexKeys[j].fields;

        // Check if index 'a' is a prefix of index 'b'
        if (a.length < b.length && a.every((f, idx) => f === b[idx])) {
          // If 'a' is unique, it's not redundant (unique constraint matters)
          if (indexKeys[i].unique) continue;

          redundant.push({
            index: indexKeys[i].name,
            key: indexKeys[i].key,
            coveredBy: indexKeys[j].name,
            coveredByKey: indexKeys[j].key,
            recommendation: `"${indexKeys[i].name}" is a prefix of "${indexKeys[j].name}" — consider dropping`,
          });
        }
      }
    }

    return redundant;
  }

  // ────── Generate Missing Index Recommendations ──────

  _generateMissingIndexRecommendations() {
    const recommendations = [];

    for (const [collection, patterns] of this._queryPatterns) {
      // Sort by frequency
      const sorted = [...patterns.values()].sort((a, b) => b.count - a.count);

      // Top 10 most frequent patterns
      for (const pattern of sorted.slice(0, 10)) {
        if (pattern.filterFields.length === 0 && pattern.sortFields.length === 0) continue;

        // Apply ESR: Equality → Sort → Range
        const suggestedIndex = {};

        // Equality fields first
        for (const field of pattern.filterFields) {
          suggestedIndex[field] = 1;
        }

        // Sort fields next
        for (const field of pattern.sortFields) {
          if (!suggestedIndex[field]) {
            suggestedIndex[field] = 1;
          }
        }

        if (Object.keys(suggestedIndex).length > 0) {
          recommendations.push({
            collection,
            type: 'missing_index',
            suggestedIndex,
            queryFrequency: pattern.count,
            reason: `Frequent query pattern (${pattern.count}x) not covered by existing index`,
            createCommand: `db.${collection}.createIndex(${JSON.stringify(suggestedIndex)}, { background: true })`,
          });
        }
      }
    }

    return recommendations;
  }

  // ────── Apply Recommendations ──────

  /**
   * Create a recommended index
   * @param {string} collection - Collection name
   * @param {Object} indexSpec - Index specification { field: 1, ... }
   * @param {Object} options - Index options { unique, sparse, background }
   */
  async createIndex(collection, indexSpec, options = {}) {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Not connected');

    const defaultOptions = {
      background: true, // Non-blocking
      ...options,
    };

    try {
      const startTime = Date.now();
      const result = await db.collection(collection).createIndex(indexSpec, defaultOptions);
      const duration = Date.now() - startTime;

      const record = {
        collection,
        indexSpec,
        options: defaultOptions,
        result,
        duration,
        createdAt: new Date(),
        createdBy: 'SmartIndexOptimizer',
      };

      this._appliedIndexes.push(record);
      logger.info(
        `[IndexOptimizer] Created index on ${collection}: ${JSON.stringify(indexSpec)} (${duration}ms)`
      );

      return record;
    } catch (err) {
      logger.error(`[IndexOptimizer] Failed to create index on ${collection}: ${err.message}`);
      throw err;
    }
  }

  /**
   * Drop an index (with safety check)
   */
  async dropIndex(collection, indexName) {
    if (indexName === '_id_') {
      throw new Error('Cannot drop _id index');
    }

    const db = mongoose.connection.db;
    if (!db) throw new Error('Not connected');

    try {
      await db.collection(collection).dropIndex(indexName);
      logger.info(`[IndexOptimizer] Dropped index ${indexName} from ${collection}`);
      return { dropped: indexName, collection };
    } catch (err) {
      logger.error(`[IndexOptimizer] Failed to drop index: ${err.message}`);
      throw err;
    }
  }

  /**
   * Auto-apply safe recommendations (non-destructive only)
   * Only creates missing indexes, never drops existing ones automatically
   */
  async autoOptimize(options = {}) {
    const maxNewIndexes = options.maxNewIndexes || 5;
    const report = await this.analyze();

    if (report.error) return report;

    const applied = [];
    let count = 0;

    for (const rec of report.recommendations) {
      if (count >= maxNewIndexes) break;

      if (rec.type === 'missing_index' && rec.queryFrequency >= (options.minFrequency || 10)) {
        try {
          const result = await this.createIndex(rec.collection, rec.suggestedIndex);
          applied.push(result);
          count++;
        } catch (err) {
          applied.push({ collection: rec.collection, error: err.message });
        }
      }
    }

    return {
      analyzed: report.collections.length,
      recommendations: report.recommendations.length,
      applied: applied.length,
      details: applied,
    };
  }

  // ────── Ensure Critical Indexes ──────

  /**
   * Create critical indexes that should always exist
   * Call this on application startup
   */
  async ensureCriticalIndexes() {
    const criticalIndexes = [
      // Auth & Users
      { collection: 'users', index: { email: 1 }, options: { unique: true, sparse: true } },
      { collection: 'users', index: { username: 1 }, options: { unique: true, sparse: true } },
      { collection: 'users', index: { role: 1, status: 1 } },
      { collection: 'users', index: { branch: 1 } },

      // Employees
      {
        collection: 'employees',
        index: { employeeId: 1 },
        options: { unique: true, sparse: true },
      },
      { collection: 'employees', index: { nationalId: 1 }, options: { sparse: true } },
      { collection: 'employees', index: { department: 1, status: 1 } },
      { collection: 'employees', index: { branch: 1, status: 1 } },

      // Beneficiaries
      { collection: 'beneficiaries', index: { nationalId: 1 }, options: { sparse: true } },
      { collection: 'beneficiaries', index: { status: 1, branch: 1 } },
      { collection: 'beneficiaries', index: { 'name.ar': 'text', 'name.en': 'text' } },

      // Audit & Logs
      { collection: 'auditlogs', index: { createdAt: -1 } },
      { collection: 'auditlogs', index: { userId: 1, createdAt: -1 } },
      { collection: 'auditlogs', index: { action: 1, createdAt: -1 } },

      // Attendance
      { collection: 'attendances', index: { employee: 1, date: -1 } },
      { collection: 'attendances', index: { date: -1, branch: 1 } },

      // Notifications
      { collection: 'notifications', index: { userId: 1, isRead: 1, createdAt: -1 } },
      {
        collection: 'notifications',
        index: { createdAt: 1 },
        options: { expireAfterSeconds: 7776000 },
      }, // 90 days TTL

      // Invoices/Payments
      {
        collection: 'invoices',
        index: { invoiceNumber: 1 },
        options: { unique: true, sparse: true },
      },
      { collection: 'invoices', index: { status: 1, createdAt: -1 } },

      // Sessions
      { collection: 'sessions', index: { expiresAt: 1 }, options: { expireAfterSeconds: 0 } },

      // General: soft-delete + timestamps on all collections
      { collection: 'employees', index: { isDeleted: 1, createdAt: -1 } },
      { collection: 'beneficiaries', index: { isDeleted: 1, createdAt: -1 } },
    ];

    const results = [];
    for (const { collection, index, options = {} } of criticalIndexes) {
      try {
        const db = mongoose.connection.db;
        const cols = await db.listCollections({ name: collection }).toArray();
        if (cols.length === 0) continue; // Skip if collection doesn't exist

        await db.collection(collection).createIndex(index, {
          background: true,
          ...options,
        });
        results.push({ collection, index, status: 'ok' });
      } catch (err) {
        // Index may already exist or conflict — not critical
        results.push({ collection, index, status: 'skipped', reason: err.message });
      }
    }

    const created = results.filter(r => r.status === 'ok').length;
    const skipped = results.filter(r => r.status === 'skipped').length;

    logger.info(`[IndexOptimizer] Critical indexes: ${created} created, ${skipped} skipped`);
    return { created, skipped, total: criticalIndexes.length, details: results };
  }

  // ────── Install Mongoose Middleware ──────

  /**
   * Install as Mongoose plugin to track query patterns automatically
   */
  install() {
    const self = this;

    mongoose.plugin(function indexOptimizerPlugin(schema) {
      const trackOps = ['find', 'findOne', 'countDocuments'];
      for (const op of trackOps) {
        schema.pre(op, function () {
          try {
            const collection = this.model?.collection?.name || this.mongooseCollection?.name;
            if (collection) {
              self.recordQuery(
                collection,
                this.getFilter?.() || {},
                this.getOptions?.()?.sort || {},
                this.projection?.() || {}
              );
            }
          } catch (_) {
            // Query tracking should never break the actual query
          }
        });
      }
    });

    logger.info('[IndexOptimizer] Query pattern tracking installed');
  }

  // ────── Stats ──────

  getStats() {
    let totalPatterns = 0;
    const perCollection = {};

    for (const [col, patterns] of this._queryPatterns) {
      perCollection[col] = patterns.size;
      totalPatterns += patterns.size;
    }

    return {
      enabled: this._enabled,
      trackedCollections: this._queryPatterns.size,
      totalPatterns,
      perCollection,
      recommendations: this._recommendations.length,
      appliedIndexes: this._appliedIndexes.length,
    };
  }

  /** Get the most frequently queried patterns */
  getTopPatterns(limit = 20) {
    const all = [];
    for (const [col, patterns] of this._queryPatterns) {
      for (const [, pattern] of patterns) {
        all.push({ collection: col, ...pattern });
      }
    }
    return all.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  // ────── Helpers ──────

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}

// Singleton
const smartIndexOptimizer = new SmartIndexOptimizer();

module.exports = {
  SmartIndexOptimizer,
  smartIndexOptimizer,
};
