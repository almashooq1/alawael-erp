/**
 * Database Indexing Optimizer - محسّن فهرسة قاعدة البيانات
 *
 * الميزات:
 * ✅ Auto Index Creation
 * ✅ Index Performance Analysis
 * ✅ Index Recommendations
 * ✅ Compound Indexes
 */

const mongoose = require('mongoose');

// ============================================================================
// INDEX STRATEGIES
// ============================================================================

const INDEX_STRATEGIES = {
  // Common indexes for all collections
  common: [
    { fields: { createdAt: -1 }, options: { background: true } },
    { fields: { updatedAt: -1 }, options: { background: true } },
  ],

  // User collection indexes
  users: [
    { fields: { email: 1 }, options: { unique: true, background: true } },
    { fields: { username: 1 }, options: { unique: true, sparse: true, background: true } },
    { fields: { role: 1, status: 1 }, options: { background: true } },
    { fields: { 'profile.department': 1 }, options: { background: true } },
    { fields: { lastLogin: -1 }, options: { background: true } },
    // Text index for search
    {
      fields: { email: 'text', username: 'text', 'profile.fullName': 'text' },
      options: { background: true },
    },
  ],

  // Payment transactions
  payments: [
    { fields: { userId: 1, createdAt: -1 }, options: { background: true } },
    { fields: { status: 1, createdAt: -1 }, options: { background: true } },
    { fields: { transactionId: 1 }, options: { unique: true, background: true } },
    { fields: { amount: 1, currency: 1 }, options: { background: true } },
    { fields: { 'metadata.orderId': 1 }, options: { sparse: true, background: true } },
  ],

  // Reports
  reports: [
    { fields: { type: 1, status: 1, createdAt: -1 }, options: { background: true } },
    { fields: { userId: 1, type: 1 }, options: { background: true } },
    { fields: { scheduledAt: 1, status: 1 }, options: { background: true } },
  ],

  // Notifications
  notifications: [
    { fields: { userId: 1, read: 1, createdAt: -1 }, options: { background: true } },
    { fields: { type: 1, status: 1 }, options: { background: true } },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0, background: true } },
  ],

  // Audit logs
  auditLogs: [
    { fields: { userId: 1, createdAt: -1 }, options: { background: true } },
    { fields: { action: 1, resource: 1, createdAt: -1 }, options: { background: true } },
    { fields: { ipAddress: 1, createdAt: -1 }, options: { background: true } },
    // TTL index - auto-delete old logs
    { fields: { createdAt: 1 }, options: { expireAfterSeconds: 7776000, background: true } }, // 90 days
  ],

  // Sessions
  sessions: [
    { fields: { userId: 1, expiresAt: 1 }, options: { background: true } },
    { fields: { token: 1 }, options: { unique: true, background: true } },
    { fields: { expiresAt: 1 }, options: { expireAfterSeconds: 0, background: true } },
  ],
};

// ============================================================================
// INDEX OPTIMIZER CLASS
// ============================================================================

class IndexOptimizer {
  constructor() {
    this.indexStats = {};
  }

  // ============================================================================
  // CREATE INDEXES
  // ============================================================================
  async createIndexes(collectionName, strategy = 'common') {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);

      const indexes = INDEX_STRATEGIES[strategy] || INDEX_STRATEGIES.common;
      const results = [];

      console.log(`📊 Creating indexes for collection: ${collectionName}`);

      for (const index of indexes) {
        try {
          const result = await collection.createIndex(index.fields, index.options);
          results.push({
            index: index.fields,
            result,
            status: 'created',
          });
          console.log(`  ✅ Index created:`, index.fields);
        } catch (error) {
          if (error.code === 85) {
            // Index already exists
            results.push({
              index: index.fields,
              result: 'exists',
              status: 'exists',
            });
          } else {
            console.error(`  ❌ Failed to create index:`, index.fields, error.message);
            results.push({
              index: index.fields,
              error: error.message,
              status: 'failed',
            });
          }
        }
      }

      return results;
    } catch (error) {
      console.error(`Failed to create indexes for ${collectionName}:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // CREATE ALL INDEXES
  // ============================================================================
  async createAllIndexes() {
    const results = {};

    for (const [collection, _indexes] of Object.entries(INDEX_STRATEGIES)) {
      if (collection === 'common') continue;

      try {
        results[collection] = await this.createIndexes(collection, collection);
      } catch (error) {
        results[collection] = { error: error.message };
      }
    }

    return results;
  }

  // ============================================================================
  // ANALYZE INDEX USAGE
  // ============================================================================
  async analyzeIndexUsage(collectionName) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);

      // Get index stats
      const stats = await collection.aggregate([{ $indexStats: {} }]).toArray();

      const analysis = stats.map(stat => ({
        name: stat.name,
        usageCount: stat.accesses?.ops || 0,
        since: stat.accesses?.since || null,
        size: stat.spec ? JSON.stringify(stat.spec).length : 0,
        efficiency: this.calculateIndexEfficiency(stat),
      }));

      // Sort by usage
      analysis.sort((a, b) => b.usageCount - a.usageCount);

      this.indexStats[collectionName] = analysis;
      return analysis;
    } catch (error) {
      console.error(`Failed to analyze indexes for ${collectionName}:`, error.message);
      return [];
    }
  }

  // ============================================================================
  // CALCULATE INDEX EFFICIENCY
  // ============================================================================
  calculateIndexEfficiency(stat) {
    const usageCount = stat.accesses?.ops || 0;

    if (usageCount === 0) return 'unused';
    if (usageCount < 10) return 'low';
    if (usageCount < 100) return 'medium';
    return 'high';
  }

  // ============================================================================
  // GET RECOMMENDATIONS
  // ============================================================================
  async getRecommendations(collectionName) {
    try {
      const analysis = await this.analyzeIndexUsage(collectionName);
      const recommendations = [];

      // Check for unused indexes
      const unusedIndexes = analysis.filter(
        idx => idx.efficiency === 'unused' && idx.name !== '_id_'
      );
      if (unusedIndexes.length > 0) {
        recommendations.push({
          type: 'remove_unused',
          severity: 'medium',
          message: `Found ${unusedIndexes.length} unused indexes`,
          indexes: unusedIndexes.map(idx => idx.name),
          action: 'Consider removing these indexes to improve write performance',
        });
      }

      // Check for low usage indexes
      const lowUsageIndexes = analysis.filter(
        idx => idx.efficiency === 'low' && idx.name !== '_id_'
      );
      if (lowUsageIndexes.length > 0) {
        recommendations.push({
          type: 'review_low_usage',
          severity: 'low',
          message: `Found ${lowUsageIndexes.length} low-usage indexes`,
          indexes: lowUsageIndexes.map(idx => idx.name),
          action: 'Review if these indexes are still needed',
        });
      }

      // Check for missing common indexes
      const existingIndexNames = analysis.map(idx => idx.name);
      const commonPatterns = ['createdAt', 'updatedAt', 'userId', 'status'];

      const missingCommonIndexes = commonPatterns.filter(
        pattern => !existingIndexNames.some(name => name.includes(pattern))
      );

      if (missingCommonIndexes.length > 0) {
        recommendations.push({
          type: 'add_common_indexes',
          severity: 'high',
          message: `Missing common indexes: ${missingCommonIndexes.join(', ')}`,
          fields: missingCommonIndexes,
          action: 'Consider adding indexes on these commonly queried fields',
        });
      }

      return recommendations;
    } catch (error) {
      console.error(`Failed to get recommendations for ${collectionName}:`, error.message);
      return [];
    }
  }

  // ============================================================================
  // DROP UNUSED INDEXES
  // ============================================================================
  async dropUnusedIndexes(collectionName, options = {}) {
    const { dryRun = true, minUsage = 0 } = options;

    try {
      const analysis = await this.analyzeIndexUsage(collectionName);
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);

      const toDrop = analysis.filter(
        idx => idx.usageCount <= minUsage && idx.name !== '_id_' // Never drop the primary index
      );

      if (dryRun) {
        console.log(`🔍 Dry run - would drop ${toDrop.length} indexes:`);
        toDrop.forEach(idx => console.log(`  - ${idx.name} (used ${idx.usageCount} times)`));
        return { dryRun: true, wouldDrop: toDrop.length, indexes: toDrop.map(i => i.name) };
      }

      const dropped = [];
      for (const idx of toDrop) {
        try {
          await collection.dropIndex(idx.name);
          dropped.push(idx.name);
          console.log(`  ✅ Dropped index: ${idx.name}`);
        } catch (error) {
          console.error(`  ❌ Failed to drop index ${idx.name}:`, error.message);
        }
      }

      return { dropped: dropped.length, indexes: dropped };
    } catch (error) {
      console.error(`Failed to drop unused indexes for ${collectionName}:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // EXPLAIN QUERY
  // ============================================================================
  async explainQuery(collectionName, query, projection = {}) {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(collectionName);

      const explanation = await collection.find(query, { projection }).explain('executionStats');

      const analysis = {
        query,
        totalDocsExamined: explanation.executionStats.totalDocsExamined,
        totalKeysExamined: explanation.executionStats.totalKeysExamined,
        nReturned: explanation.executionStats.nReturned,
        executionTimeMs: explanation.executionStats.executionTimeMillis,
        indexUsed: explanation.executionStats.executionStages?.indexName || 'COLLSCAN',
        efficiency: this.calculateQueryEfficiency(explanation.executionStats),
      };

      return analysis;
    } catch (error) {
      console.error(`Failed to explain query for ${collectionName}:`, error.message);
      throw error;
    }
  }

  // ============================================================================
  // CALCULATE QUERY EFFICIENCY
  // ============================================================================
  calculateQueryEfficiency(stats) {
    const { totalDocsExamined, nReturned } = stats;

    if (nReturned === 0) return 'no_results';

    const ratio = totalDocsExamined / nReturned;

    if (ratio === 1) return 'excellent';
    if (ratio <= 2) return 'good';
    if (ratio <= 10) return 'fair';
    return 'poor';
  }
}

// ============================================================================
// QUERY OPTIMIZER MIDDLEWARE
// ============================================================================

function queryOptimizerMiddleware() {
  return async (req, res, next) => {
    // Add query hints to req object
    req.queryOptimizer = {
      addIndex: fields => {
        req._suggestedIndexes = req._suggestedIndexes || [];
        req._suggestedIndexes.push(fields);
      },
      getHints: () => req._suggestedIndexes || [],
    };

    next();
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

const indexOptimizer = new IndexOptimizer();

module.exports = {
  indexOptimizer,
  INDEX_STRATEGIES,
  queryOptimizerMiddleware,
};
