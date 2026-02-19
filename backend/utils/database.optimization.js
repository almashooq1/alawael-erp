/**
 * 🗄️ Database Performance Optimization Utilities
 * Phase 3: Database Query Optimization
 * Target: Reduce database response time to <200ms
 */

const mongoose = require('mongoose');

/**
 * Performance Optimization Utilities
 */
const DatabaseOptimization = {
  /**
   * 1. Query Optimization Strategies
   */

  /**
   * ✅ Lean Queries - Return plain objects (5-10x faster)
   * Use for read-only operations where document methods aren't needed
   */
  optimizeReadQuery: async (Model, filter = {}, options = {}) => {
    const {
      fields = null,
      sort = null,
      limit = null,
      skip = 0,
      lean = true, // ✅ Key optimization
    } = options;

    let query = Model.find(filter);

    // Select specific fields
    if (fields) {
      query = query.select(fields);
    }

    // Sorting
    if (sort) {
      query = query.sort(sort);
    }

    // Pagination
    if (skip) {
      query = query.skip(skip);
    }
    if (limit) {
      query = query.limit(limit);
    }

    // Lean for performance
    if (lean) {
      query = query.lean();
    }

    return query.exec();
  },

  /**
   * ✅ Batch Queries - Prevent N+1 problems
   * Fetch all data in one query with populate
   */
  optimizeBatchQuery: async (Model, filter = {}, populatePaths = []) => {
    let query = Model.find(filter).lean();

    // Populate relationships
    for (const path of populatePaths) {
      query = query.populate(path, {}, null, { limit: 50 }); // Add limits
    }

    return query.exec();
  },

  /**
   * ✅ Indexed Queries - Use database indexes
   * Automatically detected based on schema
   */
  ensureIndexes: async Model => {
    try {
      await Model.collection.createIndexes();
      console.log(`✅ Indexes created for ${Model.collection.name}`);
    } catch (error) {
      console.error(`❌ Index creation failed: ${error.message}`);
    }
  },

  /**
   * 2. Connection Pooling Optimization
   */

  /**
   * Configure MongoDB connection for optimal performance
   */
  configureOptimalConnection: () => {
    return {
      // Connection pool settings
      maxPoolSize: 20, // ✅ Optimal for most applications
      minPoolSize: 5,

      // Timeouts
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,

      // Retries
      retryWrites: true,
      retryReads: true,

      // Connection settings
      connectTimeoutMS: 10000,

      // Compression
      compressors: ['snappy', 'zlib'],
      zlibCompressionLevel: 6,

      // Auth
      authSource: 'admin',
    };
  },

  /**
   * 3. Aggregation Pipeline Optimization
   */

  /**
   * ✅ Aggregation Pipeline - Group and filter efficiently
   * Moves filtering to database (server-side)
   */
  optimizeAggregation: async (Model, pipeline = []) => {
    const optimizedPipeline = [
      // 1️⃣ Match early to reduce document count
      ...pipeline.filter(stage => stage.$match),

      // 2️⃣ Project to reduce field count
      ...pipeline.filter(stage => stage.$project),

      // 3️⃣ Group for aggregations
      ...pipeline.filter(stage => stage.$group),

      // 4️⃣ Sort
      ...pipeline.filter(stage => stage.$sort),

      // 5️⃣ Skip/limit for pagination
      ...pipeline.filter(stage => stage.$skip || stage.$limit),

      // 6️⃣ Remaining stages
      ...pipeline.filter(
        stage =>
          !stage.$match &&
          !stage.$project &&
          !stage.$group &&
          !stage.$sort &&
          !stage.$skip &&
          !stage.$limit
      ),
    ];

    return Model.aggregate(optimizedPipeline);
  },

  /**
   * 4. Query Result Caching
   */

  // Simple in-memory cache
  cache: new Map(),

  /**
   * ✅ Cache Query Results - Avoid repeated queries
   */
  getCachedQuery: async (Model, key, ttl = 60000, queryFn) => {
    const cacheKey = `${Model.collection.name}:${key}`;

    // Check cache
    const cached = DatabaseOptimization.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Execute query
    const result = await queryFn();

    // Store in cache
    DatabaseOptimization.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + ttl,
    });

    return result;
  },

  /**
   * Clear cache for specific model
   */
  clearCache: Model => {
    const prefix = `${Model.collection.name}:`;
    for (const key of DatabaseOptimization.cache.keys()) {
      if (key.startsWith(prefix)) {
        DatabaseOptimization.cache.delete(key);
      }
    }
  },

  /**
   * 5. Bulk Operations
   */

  /**
   * ✅ Bulk Write Operations - Multiple operations in one request
   */
  bulkWrite: async (Model, operations = []) => {
    if (operations.length === 0) return { ok: 1 };

    try {
      return await Model.collection.bulkWrite(operations);
    } catch (error) {
      console.error('Bulk write error:', error);
      throw error;
    }
  },

  /**
   * ✅ Batch Insert - Insert many documents efficiently
   */
  batchInsert: async (Model, documents, batchSize = 1000) => {
    const results = [];

    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      const inserted = await Model.insertMany(batch, { ordered: false });
      results.push(...inserted);
    }

    return results;
  },

  /**
   * 6. Index Analysis & Recommendations
   */

  /**
   * ✅ Analyze Query Performance
   */
  analyzeQueryPerformance: async (Model, query = {}, options = {}) => {
    const explain = await Model.find(query).explain('executionStats');

    return {
      executionStages: explain.executionStats,
      docsExamined: explain.executionStats.totalDocsExamined,
      docsReturned: explain.executionStats.nReturned,
      efficiency: Math.round(
        (explain.executionStats.nReturned / explain.executionStats.totalDocsExamined) * 100
      ),
    };
  },

  /**
   * Recommended indexes for common models
   */
  getRecommendedIndexes: modelName => {
    const indexes = {
      User: [
        { email: 1 }, // Fast email lookup
        { username: 1 }, // Fast username lookup
        { createdAt: -1 }, // Recent users
        { status: 1, createdAt: -1 }, // Compound index
      ],
      AuditLog: [
        { userId: 1, timestamp: -1 }, // User activity timeline
        { eventType: 1, severity: 1 }, // Event filtering
        { timestamp: -1 }, // Recent events
        { ipAddress: 1, timestamp: -1 }, // IP-based analysis
      ],
      Document: [
        { userId: 1, createdAt: -1 }, // User documents
        { status: 1, createdAt: -1 }, // Status filtering
        { title: 'text' }, // Text search
      ],
    };

    return indexes[modelName] || [];
  },

  /**
   * 7. Connection Monitoring
   */

  /**
   * Monitor database performance
   */
  getConnectionStats: () => {
    const connection = mongoose.connection;

    return {
      state: connection.readyState,
      host: connection.host,
      port: connection.port,
      name: connection.name,
      collections: Object.keys(connection.collections).length,
      models: Object.keys(connection.models).length,
    };
  },

  /**
   * 8. Cleanup & Maintenance
   */

  /**
   * Remove expired documents (archive old records)
   */
  removeExpiredDocuments: async (Model, expiryField, daysOld) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return Model.deleteMany({
      [expiryField]: { $lt: cutoffDate },
    });
  },

  /**
   * Archive old documents instead of deleting
   */
  archiveOldDocuments: async (Model, archiveModel, expiryField, daysOld) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    // Find old documents
    const oldDocs = await Model.find({
      [expiryField]: { $lt: cutoffDate },
    });

    if (oldDocs.length === 0) return { archived: 0 };

    // Insert into archive
    await archiveModel.insertMany(oldDocs);

    // Delete from main collection
    await Model.deleteMany({
      [expiryField]: { $lt: cutoffDate },
    });

    return { archived: oldDocs.length };
  },
};

/**
 * Performance Benchmarking Utilities
 */
const PerformanceBenchmark = {
  /**
   * Measure query execution time
   */
  measureQueryTime: async (queryFn, label = 'Query') => {
    const start = Date.now();
    const result = await queryFn();
    const duration = Date.now() - start;

    console.log(`⏱️  ${label}: ${duration}ms`);

    return { result, duration };
  },

  /**
   * Benchmark multiple queries
   */
  benchmarkQueries: async (queries = {}) => {
    const results = {};

    for (const [label, queryFn] of Object.entries(queries)) {
      const { duration } = await PerformanceBenchmark.measureQueryTime(queryFn, label);
      results[label] = duration;
    }

    return results;
  },

  /**
   * Memory usage snapshot
   */
  getMemoryUsage: () => {
    const usage = process.memoryUsage();

    return {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`, // Total memory
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
    };
  },
};

module.exports = {
  DatabaseOptimization,
  PerformanceBenchmark,
};
