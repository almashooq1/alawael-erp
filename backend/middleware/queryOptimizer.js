const logger = require('../utils/logger');

/**
 * Query Optimizer Middleware
 * Optimizes MongoDB queries for better performance
 */
class QueryOptimizer {
  // Track query performance
  static queryMetrics = {
    total: 0,
    slow: 0,
    average: 0,
    slowThreshold: 100, // ms
  };

  /**
   * Middleware to track query execution time
   */
  static middleware = schema => {
    // Track find operations
    schema.pre(/^find/, function () {
      this.startTime = Date.now();
    });

    schema.post(/^find/, function () {
      const executionTime = Date.now() - this.startTime;
      QueryOptimizer.trackQuery(executionTime, this.getQuery());
    });

    // Track updateOne
    schema.pre('updateOne', function () {
      this.startTime = Date.now();
    });

    schema.post('updateOne', function () {
      const executionTime = Date.now() - this.startTime;
      QueryOptimizer.trackQuery(executionTime, this.getQuery());
    });

    // Track deleteOne
    schema.pre('deleteOne', function () {
      this.startTime = Date.now();
    });

    schema.post('deleteOne', function () {
      const executionTime = Date.now() - this.startTime;
      QueryOptimizer.trackQuery(executionTime, this.getQuery());
    });
  };

  /**
   * Track query metrics
   */
  static trackQuery(executionTime, query) {
    QueryOptimizer.queryMetrics.total++;

    if (executionTime > QueryOptimizer.queryMetrics.slowThreshold) {
      QueryOptimizer.queryMetrics.slow++;
      logger.warn(`Slow query detected (${executionTime}ms):`, query);
    }

    // Update average
    QueryOptimizer.queryMetrics.average =
      (QueryOptimizer.queryMetrics.average * (QueryOptimizer.queryMetrics.total - 1) +
        executionTime) /
      QueryOptimizer.queryMetrics.total;
  }

  /**
   * Get query metrics
   */
  static getMetrics() {
    return {
      ...QueryOptimizer.queryMetrics,
      slowPercentage: (
        (QueryOptimizer.queryMetrics.slow / QueryOptimizer.queryMetrics.total) *
        100
      ).toFixed(2),
    };
  }

  /**
   * Helper to create optimized queries
   */
  static optimizeQuery(Model, options = {}) {
    let query = Model.find();

    // Apply select (only get needed fields)
    if (options.select) {
      query = query.select(options.select);
    }

    // Apply lean() for read-only queries (faster)
    if (options.lean !== false) {
      query = query.lean();
    }

    // Apply populate
    if (options.populate) {
      query = query.populate(options.populate);
    }

    // Apply sort
    if (options.sort) {
      query = query.sort(options.sort);
    }

    // Apply skip (for pagination)
    if (options.skip) {
      query = query.skip(options.skip);
    }

    // Apply limit (for pagination)
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Apply filters
    if (options.filter) {
      query = query.where(options.filter);
    }

    return query;
  }

  /**
   * Batch operations for better performance
   */
  static async batchInsert(Model, documents, batchSize = 1000) {
    try {
      const results = [];
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const inserted = await Model.insertMany(batch, { ordered: false });
        results.push(...inserted);
      }
      return results;
    } catch (error) {
      logger.error('Batch insert error:', error);
      throw error;
    }
  }

  /**
   * Batch updates for better performance
   */
  static async batchUpdate(Model, updates) {
    try {
      const operations = updates.map(({ filter, update, options = {} }) => ({
        updateMany: {
          filter,
          update: { $set: update },
          ...options,
        },
      }));

      return await Model.collection.bulkWrite(operations);
    } catch (error) {
      logger.error('Batch update error:', error);
      throw error;
    }
  }

  /**
   * Create indexes for better query performance
   */
  static createIndexes(Model, indexSpecs) {
    try {
      indexSpecs.forEach(spec => {
        Model.collection.createIndex(spec.keys, spec.options);
      });
      logger.info('Indexes created successfully');
    } catch (error) {
      logger.error('Index creation error:', error);
    }
  }
}

module.exports = QueryOptimizer;
