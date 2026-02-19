/**
 * Query Optimization System - نظام تحسين الاستعلامات
 *
 * الميزات:
 * ✅ Query Builder with optimization
 * ✅ Automatic pagination
 * ✅ Field selection optimization
 * ✅ Query performance monitoring
 */

const mongoose = require('mongoose');

// ============================================================================
// QUERY OPTIMIZER CLASS
// ============================================================================

class QueryOptimizer {
  constructor() {
    this.queryStats = new Map();
    this.slowQueryThreshold = 100; // milliseconds
  }

  // ============================================================================
  // OPTIMIZE SELECT FIELDS
  // ============================================================================
  optimizeSelect(fields = []) {
    if (!fields || fields.length === 0) {
      return {}; // Return all fields
    }

    // Convert array to MongoDB projection
    const projection = {};
    fields.forEach(field => {
      projection[field] = 1;
    });

    // Always include _id unless explicitly excluded
    if (!fields.includes('_id') && !fields.includes('-_id')) {
      projection._id = 1;
    }

    return projection;
  }

  // ============================================================================
  // OPTIMIZE PAGINATION
  // ============================================================================
  optimizePagination(query = {}) {
    const { page = 1, limit = 20, sort = '-createdAt', ...filters } = query;

    // Validate and sanitize
    const sanitizedPage = Math.max(1, parseInt(page) || 1);
    const sanitizedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (sanitizedPage - 1) * sanitizedLimit;

    // Parse sort
    const sortObj = this.parseSort(sort);

    return {
      filters,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        skip,
      },
      sort: sortObj,
    };
  }

  // ============================================================================
  // PARSE SORT
  // ============================================================================
  parseSort(sort) {
    if (typeof sort === 'object') {
      return sort;
    }

    const sortObj = {};
    const fields = sort.split(',');

    fields.forEach(field => {
      if (field.startsWith('-')) {
        sortObj[field.substring(1)] = -1;
      } else {
        sortObj[field] = 1;
      }
    });

    return sortObj;
  }

  // ============================================================================
  // BUILD OPTIMIZED QUERY
  // ============================================================================
  async buildQuery(Model, options = {}) {
    const {
      filters = {},
      select = [],
      populate = [],
      page = 1,
      limit = 20,
      sort = '-createdAt',
      lean = true,
    } = options;

    const startTime = Date.now();

    try {
      // Optimize pagination
      const { pagination, sort: sortObj } = this.optimizePagination({
        page,
        limit,
        sort,
        ...filters,
      });

      // Build query
      let query = Model.find(filters);

      // Apply select
      if (select.length > 0) {
        const projection = this.optimizeSelect(select);
        query = query.select(projection);
      }

      // Apply sort
      query = query.sort(sortObj);

      // Apply pagination
      query = query.skip(pagination.skip).limit(pagination.limit);

      // Apply populate
      if (populate.length > 0) {
        populate.forEach(pop => {
          query = query.populate(pop);
        });
      }

      // Apply lean for better performance
      if (lean) {
        query = query.lean();
      }

      // Execute query
      const data = await query.exec();

      // Get total count (optimized)
      const total = await Model.countDocuments(filters);

      const executionTime = Date.now() - startTime;
      this.recordQuery(Model.modelName, executionTime, filters);

      return {
        data,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          pages: Math.ceil(total / pagination.limit),
          hasNext: pagination.page < Math.ceil(total / pagination.limit),
          hasPrev: pagination.page > 1,
        },
        executionTime,
      };
    } catch (error) {
      console.error('Query optimization error:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // AGGREGATE WITH OPTIMIZATION
  // ============================================================================
  async buildAggregation(Model, pipeline = [], options = {}) {
    const { page = null, limit = null, allowDiskUse = true } = options;

    const startTime = Date.now();

    try {
      let aggregation = Model.aggregate(pipeline);

      // Add pagination stages if requested
      if (page !== null && limit !== null) {
        const skip = (page - 1) * limit;
        aggregation = aggregation.skip(skip).limit(limit);
      }

      // Allow disk use for large aggregations
      if (allowDiskUse) {
        aggregation = aggregation.allowDiskUse(true);
      }

      const data = await aggregation.exec();
      const executionTime = Date.now() - startTime;

      this.recordQuery(Model.modelName, executionTime, { aggregation: true });

      return {
        data,
        executionTime,
      };
    } catch (error) {
      console.error('Aggregation error:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================
  async batchUpdate(Model, updates = [], options = {}) {
    const { batchSize = 100 } = options;
    const startTime = Date.now();

    try {
      const results = [];

      // Process in batches
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);

        const bulkOps = batch.map(update => ({
          updateOne: {
            filter: update.filter,
            update: update.update,
            upsert: update.upsert || false,
          },
        }));

        const result = await Model.bulkWrite(bulkOps);
        results.push(result);
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        batches: results.length,
        modified: results.reduce((sum, r) => sum + r.modifiedCount, 0),
        inserted: results.reduce((sum, r) => sum + r.upsertedCount, 0),
        executionTime,
      };
    } catch (error) {
      console.error('Batch update error:', error.message);
      throw error;
    }
  }

  // ============================================================================
  // OPTIMIZE LOOKUP (JOIN)
  // ============================================================================
  optimizeLookup(from, localField, foreignField, as, options = {}) {
    const { project = null, unwind = false, preserveNullAndEmptyArrays = true } = options;

    const stages = [];

    // Lookup stage
    stages.push({
      $lookup: {
        from,
        localField,
        foreignField,
        as,
      },
    });

    // Project specific fields from lookup
    if (project) {
      const projectStage = {};
      project.forEach(field => {
        projectStage[`${as}.${field}`] = 1;
      });
      stages.push({ $project: projectStage });
    }

    // Unwind if needed
    if (unwind) {
      stages.push({
        $unwind: {
          path: `$${as}`,
          preserveNullAndEmptyArrays,
        },
      });
    }

    return stages;
  }

  // ============================================================================
  // RECORD QUERY STATS
  // ============================================================================
  recordQuery(modelName, executionTime, filters = {}) {
    if (!this.queryStats.has(modelName)) {
      this.queryStats.set(modelName, {
        count: 0,
        totalTime: 0,
        avgTime: 0,
        slowQueries: 0,
        filters: new Map(),
      });
    }

    const stats = this.queryStats.get(modelName);
    stats.count++;
    stats.totalTime += executionTime;
    stats.avgTime = stats.totalTime / stats.count;

    if (executionTime > this.slowQueryThreshold) {
      stats.slowQueries++;
      console.warn(`⚠️  Slow query detected in ${modelName}: ${executionTime}ms`, filters);
    }

    // Track filter usage
    const filterKey = JSON.stringify(filters);
    const filterCount = stats.filters.get(filterKey) || 0;
    stats.filters.set(filterKey, filterCount + 1);
  }

  // ============================================================================
  // GET STATISTICS
  // ============================================================================
  getStats() {
    const stats = {};

    this.queryStats.forEach((value, key) => {
      stats[key] = {
        totalQueries: value.count,
        averageTime: Math.round(value.avgTime),
        totalTime: value.totalTime,
        slowQueries: value.slowQueries,
        slowQueryRate: ((value.slowQueries / value.count) * 100).toFixed(2) + '%',
        topFilters: Array.from(value.filters.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([filter, count]) => ({ filter, count })),
      };
    });

    return stats;
  }

  // ============================================================================
  // RESET STATISTICS
  // ============================================================================
  resetStats() {
    this.queryStats.clear();
    console.log('📊 Query statistics reset');
  }
}

// ============================================================================
// QUERY BUILDER HELPER
// ============================================================================

class QueryBuilder {
  constructor(Model) {
    this.Model = Model;
    this.filters = {};
    this.selectFields = [];
    this.populateFields = [];
    this.sortOptions = '-createdAt';
    this.paginationOptions = { page: 1, limit: 20 };
    this.leanOption = true;
  }

  where(field, operator, value) {
    if (arguments.length === 2) {
      // Simple equality: where('name', 'John')
      this.filters[field] = operator;
    } else {
      // Operator: where('age', '>', 18)
      const operatorMap = {
        '>': '$gt',
        '>=': '$gte',
        '<': '$lt',
        '<=': '$lte',
        '!=': '$ne',
        in: '$in',
        nin: '$nin',
      };

      const mongoOperator = operatorMap[operator] || operator;
      this.filters[field] = { [mongoOperator]: value };
    }

    return this;
  }

  select(...fields) {
    this.selectFields = fields;
    return this;
  }

  populate(field, select = null) {
    if (select) {
      this.populateFields.push({ path: field, select });
    } else {
      this.populateFields.push(field);
    }
    return this;
  }

  sort(sort) {
    this.sortOptions = sort;
    return this;
  }

  page(page, limit = 20) {
    this.paginationOptions = { page, limit };
    return this;
  }

  lean(value = true) {
    this.leanOption = value;
    return this;
  }

  async execute() {
    return queryOptimizer.buildQuery(this.Model, {
      filters: this.filters,
      select: this.selectFields,
      populate: this.populateFields,
      sort: this.sortOptions,
      ...this.paginationOptions,
      lean: this.leanOption,
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

const queryOptimizer = new QueryOptimizer();

module.exports = {
  queryOptimizer,
  QueryBuilder,

  // Helper to create query builder
  query: Model => new QueryBuilder(Model),
};
