/**
 * 🔄 Advanced Query Batching & Debouncing
 *
 * Features:
 * - Automatic query batching within time window
 * - Debounce rapid identical queries
 * - Batch execution with optimized operations
 * - Memory-efficient batch processing
 */

class QueryBatcher {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 100;
    this.batchInterval = options.batchInterval || 10; // 10ms window
    this.maxWait = options.maxWait || 500; // Max wait time

    // Store pending batches by query type
    this.batches = new Map();

    // Store debounce timers
    this.debounceTimers = new Map();

    // Statistics
    this.stats = {
      totalBatches: 0,
      totalQueries: 0,
      batchedQueries: 0,
      debouncedQueries: 0,
      batchExecutionTime: 0,
    };
  }

  /**
   * Generate batch key from query signature
   */
  generateBatchKey(model, filter, options = {}) {
    const key = JSON.stringify({
      model: model.constructor.name || model.name,
      filter: this.simplifyFilter(filter),
      select: options.select,
      sort: options.sort,
    });
    return key;
  }

  /**
   * Simplify filter for batch key generation
   */
  simplifyFilter(filter) {
    if (typeof filter !== 'object') return filter;
    const simplified = {};
    for (const [key, value] of Object.entries(filter)) {
      if (typeof value === 'object' && value !== null) {
        simplified[key] = Object.keys(value).join(',');
      } else {
        simplified[key] = value;
      }
    }
    return simplified;
  }

  /**
   * Add query to batch
   */
  async addQuery(batchKey, executor) {
    this.stats.totalQueries++;

    // Initialize batch if not exists
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, {
        queries: [],
        promise: null,
        resolvers: [],
      });
    }

    const batch = this.batches.get(batchKey);
    batch.queries.push(executor);

    return new Promise(resolve => {
      batch.resolvers.push(resolve);

      // Execute batch when size reached or timeout
      if (batch.queries.length >= this.batchSize) {
        this.executeBatch(batchKey);
      } else if (!batch.timer) {
        batch.timer = setTimeout(() => {
          this.executeBatch(batchKey);
        }, this.batchInterval);
      }
    });
  }

  /**
   * Execute batched queries
   */
  async executeBatch(batchKey) {
    const batch = this.batches.get(batchKey);
    if (!batch) return;

    // Clear timer
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }

    const startTime = Date.now();
    const queryCount = batch.queries.length;

    try {
      // Execute all queries in parallel
      const results = await Promise.all(batch.queries.map(executor => executor()));

      // Resolve all pending promises
      batch.resolvers.forEach((resolve, index) => {
        resolve(results[index]);
      });

      this.stats.totalBatches++;
      this.stats.batchedQueries += queryCount;
      this.stats.batchExecutionTime += Date.now() - startTime;
    } catch (error) {
      // Reject all pending promises
      batch.resolvers.forEach(resolve => {
        resolve(null); // Return null instead of rejecting
      });
      console.error('[QueryBatcher] Batch execution failed:', error.message);
    }

    // Clean up
    this.batches.delete(batchKey);
  }

  /**
   * Debounce rapid identical queries
   */
  async debounceQuery(debounceKey, executor, wait = 50) {
    // Clear existing timer
    if (this.debounceTimers.has(debounceKey)) {
      clearTimeout(this.debounceTimers.get(debounceKey));
    }

    return new Promise(resolve => {
      const timer = setTimeout(async () => {
        try {
          const result = await executor();
          this.stats.debouncedQueries++;
          resolve(result);
        } catch (error) {
          console.error('[QueryBatcher] Debounced query failed:', error.message);
          resolve(null);
        }
        this.debounceTimers.delete(debounceKey);
      }, wait);

      this.debounceTimers.set(debounceKey, timer);
    });
  }

  /**
   * Batch find operations
   */
  async batchFind(Model, filters, options = {}) {
    const batchKey = this.generateBatchKey(Model, filters, options);

    return this.addQuery(batchKey, async () => {
      const query = Model.find(filters);

      if (options.select) query.select(options.select);
      if (options.sort) query.sort(options.sort);
      if (options.limit) query.limit(options.limit);
      if (options.skip) query.skip(options.skip);

      return query.lean().exec();
    });
  }

  /**
   * Batch findById operations
   */
  async batchFindById(Model, ids, options = {}) {
    const batchKey = `batch:${Model.constructor.name}:findByIds`;

    return this.addQuery(batchKey, async () => {
      const query = Model.find({ _id: { $in: ids } });

      if (options.select) query.select(options.select);
      if (options.sort) query.sort(options.sort);

      return query.lean().exec();
    });
  }

  /**
   * Batch count operations
   */
  async batchCount(Model, filter) {
    const batchKey = `batch:${Model.constructor.name}:count`;

    return this.addQuery(batchKey, async () => {
      return Model.countDocuments(filter);
    });
  }

  /**
   * Get batch statistics
   */
  getStats() {
    const avgBatchSize =
      this.stats.totalBatches > 0
        ? (this.stats.batchedQueries / this.stats.totalBatches).toFixed(2)
        : 0;

    const avgExecutionTime =
      this.stats.totalBatches > 0
        ? (this.stats.batchExecutionTime / this.stats.totalBatches).toFixed(2)
        : 0;

    return {
      totalBatches: this.stats.totalBatches,
      totalQueries: this.stats.totalQueries,
      batchedQueries: this.stats.batchedQueries,
      debouncedQueries: this.stats.debouncedQueries,
      avgBatchSize,
      avgExecutionTime: `${avgExecutionTime}ms`,
      pendingBatches: this.batches.size,
      pendingDebounces: this.debounceTimers.size,
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalBatches: 0,
      totalQueries: 0,
      batchedQueries: 0,
      debouncedQueries: 0,
      batchExecutionTime: 0,
    };
  }

  /**
   * Clear all pending operations
   */
  clear() {
    // Clear all timers
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // Clear batches
    this.batches.forEach(batch => {
      if (batch.timer) clearTimeout(batch.timer);
    });
    this.batches.clear();
  }
}

/**
 * Express middleware for query batching
 */
function queryBatchingMiddleware(batcher) {
  return (req, res, next) => {
    // Attach batcher to request
    req.batchFind = (Model, filters, options) => {
      return batcher.batchFind(Model, filters, options);
    };

    req.batchFindById = (Model, ids, options) => {
      return batcher.batchFindById(Model, ids, options);
    };

    req.batchCount = (Model, filter) => {
      return batcher.batchCount(Model, filter);
    };

    req.debounceQuery = (key, executor, wait) => {
      return batcher.debounceQuery(key, executor, wait);
    };

    next();
  };
}

// Global query batcher instance
let globalBatcher = null;

/**
 * Initialize global query batcher
 */
function initializeQueryBatcher(options = {}) {
  globalBatcher = new QueryBatcher(options);
  return globalBatcher;
}

/**
 * Get global query batcher
 */
function getQueryBatcher() {
  if (!globalBatcher) {
    globalBatcher = new QueryBatcher();
  }
  return globalBatcher;
}

module.exports = {
  QueryBatcher,
  queryBatchingMiddleware,
  initializeQueryBatcher,
  getQueryBatcher,
};
