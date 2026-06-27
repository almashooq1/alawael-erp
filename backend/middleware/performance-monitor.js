/**
 * performance-monitor.js — Performance Monitoring Middleware
 * ═══════════════════════════════════════════════════════════════════════════
 * Tracks request latency, slow queries, and cache hit rates.
 */

'use strict';

const logger = require('../utils/logger');

const SLOW_REQUEST_THRESHOLD_MS = 1000; // log requests > 1s
const SLOW_QUERY_THRESHOLD_MS = 300;  // log DB queries > 300ms

/**
 * Express middleware: measure request latency and warn on slow requests
 */
function requestLatencyMonitor(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const duration = Number(process.hrtime.bigint() - start) / 1_000_000; // ms
    if (duration > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(
        `[SlowRequest] ${req.method} ${req.path} took ${duration.toFixed(1)}ms (${res.statusCode})`
      );
    }
  });

  next();
}

/**
 * Mongoose plugin: log queries slower than threshold
 */
function mongooseSlowQueryPlugin(schema, options) {
  schema.pre(['find', 'findOne', 'findOneAndUpdate', 'updateOne', 'updateMany', 'aggregate'], function () {
    this._startTime = Date.now();
  });

  schema.post(['find', 'findOne', 'findOneAndUpdate', 'updateOne', 'updateMany', 'aggregate'], function () {
    if (!this._startTime) return;
    const duration = Date.now() - this._startTime;
    if (duration > SLOW_QUERY_THRESHOLD_MS) {
      const modelName = this.model ? this.model.modelName : 'Unknown';
      logger.warn(
        `[SlowQuery] ${modelName}.${this.op} took ${duration}ms (filter: ${JSON.stringify(this.getFilter && this.getFilter())})`
      );
    }
  });
}

/**
 * Cache hit-rate tracker (wraps CacheService)
 */
class CacheMetrics {
  constructor() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
  }

  recordHit() { this.hits++; }
  recordMiss() { this.misses++; }
  recordSet() { this.sets++; }

  getStats() {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      hitRate: total > 0 ? (this.hits / total).toFixed(2) : 0,
    };
  }

  reset() {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
  }
}

module.exports = {
  requestLatencyMonitor,
  mongooseSlowQueryPlugin,
  CacheMetrics,
  SLOW_REQUEST_THRESHOLD_MS,
  SLOW_QUERY_THRESHOLD_MS,
};
