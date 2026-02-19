/**
 * Database Query Optimization Middleware
 * middleware لتحسين استعلامات قاعدة البيانات
 *
 * Features:
 * - Automatic query optimization
 * - Lean queries for better performance
 * - Pagination helpers
 * - Field selection optimization
 * - Index usage tracking
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const { performanceMetrics } = require('../utils/performanceMetrics');

/**
 * Query optimization utility
 */
class QueryOptimizer {
  /**
   * Apply lean() to queries automatically
   * Returns plain JavaScript objects instead of Mongoose documents
   */
  static applyLean(query) {
    if (query && typeof query.lean === 'function') {
      return query.lean();
    }
    return query;
  }

  /**
   * Apply field selection to reduce data transfer
   */
  static selectFields(query, fields) {
    if (query && fields) {
      return query.select(fields);
    }
    return query;
  }

  /**
   * Apply pagination with optimization
   */
  static paginate(query, page = 1, limit = 10) {
    const validPage = Math.max(1, parseInt(page));
    const validLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (validPage - 1) * validLimit;

    if (query) {
      return query.skip(skip).limit(validLimit);
    }
    return query;
  }

  /**
   * Apply sorting with index awareness
   */
  static sort(query, sortField = '-createdAt') {
    if (query && sortField) {
      return query.sort(sortField);
    }
    return query;
  }

  /**
   * Track slow queries
   */
  static async trackQuery(queryName, queryFn) {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;

      // Track in performance metrics
      if (performanceMetrics) {
        performanceMetrics.trackDatabaseQuery(queryName, duration);
      }

      // Log slow queries
      if (duration > 100) {
        logger.warn('Slow database query detected', {
          query: queryName,
          duration: `${duration}ms`,
          threshold: '100ms',
        });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query error', {
        query: queryName,
        duration: `${duration}ms`,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Optimize populate operations
   */
  static optimizePopulate(query, populateOptions) {
    if (!query || !populateOptions) return query;

    if (Array.isArray(populateOptions)) {
      populateOptions.forEach(option => {
        query = query.populate(option);
      });
    } else {
      query = query.populate(populateOptions);
    }

    return query;
  }

  /**
   * Add index hints for complex queries
   */
  static hint(query, indexName) {
    if (query && indexName) {
      return query.hint(indexName);
    }
    return query;
  }

  /**
   * Explain query for debugging
   */
  static async explainQuery(query) {
    if (!query) return null;

    try {
      const explanation = await query.explain('executionStats');
      return {
        executionTimeMs: explanation.executionStats.executionTimeMillis,
        totalDocsExamined: explanation.executionStats.totalDocsExamined,
        totalKeysExamined: explanation.executionStats.totalKeysExamined,
        indexesUsed: explanation.executionStats.executionStages?.inputStage?.indexName || 'none',
      };
    } catch (error) {
      logger.error('Query explain error', { error: error.message });
      return null;
    }
  }
}

/**
 * Mongoose plugin for automatic query optimization
 */
const queryOptimizationPlugin = schema => {
  // Optimize find queries
  schema.pre('find', function () {
    // Apply lean by default for read operations
    if (!this.mongooseOptions().lean) {
      this.lean();
    }
  });

  // Optimize findOne queries
  schema.pre('findOne', function () {
    if (!this.mongooseOptions().lean) {
      this.lean();
    }
  });

  // Track query execution time
  schema.post('find', function (docs) {
    const duration = Date.now() - (this._startTime || Date.now());
    if (duration > 100) {
      logger.debug('Query completed', {
        model: this.model.modelName,
        duration: `${duration}ms`,
        docsReturned: docs.length,
      });
    }
  });
};

/**
 * Express middleware for query optimization hints
 */
const queryOptimizationMiddleware = (req, res, next) => {
  // Add query helper methods to request
  req.optimizeQuery = query => {
    let optimized = query;

    // Apply lean if not already applied
    optimized = QueryOptimizer.applyLean(optimized);

    // Apply pagination from query params
    if (req.query.page || req.query.limit) {
      optimized = QueryOptimizer.paginate(optimized, req.query.page, req.query.limit);
    }

    // Apply sorting from query params
    if (req.query.sort) {
      optimized = QueryOptimizer.sort(optimized, req.query.sort);
    }

    // Apply field selection from query params
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      optimized = QueryOptimizer.selectFields(optimized, fields);
    }

    return optimized;
  };

  // Add pagination helper
  req.getPagination = () => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    return { page, limit, skip: (page - 1) * limit };
  };

  next();
};

/**
 * Batch query helper
 */
const batchQuery = async (Model, ids, options = {}) => {
  const batchSize = options.batchSize || 100;
  const results = [];

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    const batchResults = await Model.find({ _id: { $in: batch } })
      .lean()
      .exec();
    results.push(...batchResults);
  }

  return results;
};

/**
 * Aggregation pipeline helpers
 */
const aggregationHelpers = {
  /**
   * Add pagination to aggregation pipeline
   */
  addPagination: (pipeline, page = 1, limit = 10) => {
    const skip = (page - 1) * limit;
    return [...pipeline, { $skip: skip }, { $limit: limit }];
  },

  /**
   * Add sorting to aggregation pipeline
   */
  addSort: (pipeline, sortField = '-createdAt') => {
    const sortObj = {};
    if (sortField.startsWith('-')) {
      sortObj[sortField.slice(1)] = -1;
    } else {
      sortObj[sortField] = 1;
    }
    return [...pipeline, { $sort: sortObj }];
  },

  /**
   * Add field projection
   */
  addProjection: (pipeline, fields) => {
    const projection = {};
    fields.forEach(field => {
      projection[field] = 1;
    });
    return [...pipeline, { $project: projection }];
  },

  /**
   * Count documents with aggregation
   */
  addCount: pipeline => {
    return [...pipeline, { $count: 'total' }];
  },
};

module.exports = {
  QueryOptimizer,
  queryOptimizationPlugin,
  queryOptimizationMiddleware,
  batchQuery,
  aggregationHelpers,
};
