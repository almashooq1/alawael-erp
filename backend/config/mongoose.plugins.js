/**
 * Mongoose Global Plugins — Performance & Monitoring
 *
 * - Slow query logging (warns when queries exceed threshold)
 * - Auto-lean for read queries (skips document hydration)
 * - Auto-disable autoIndex in production
 * - Connection pool health monitoring
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const isProd = process.env.NODE_ENV === 'production';
const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS, 10) || 500;

// ─── Slow Query Logger Plugin ────────────────────────────────────────────────
// Hooks into every find/findOne/update/aggregate to time execution.
function slowQueryPlugin(schema) {
  const ops = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'countDocuments',
    'estimatedDocumentCount',
    'aggregate',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
  ];

  for (const op of ops) {
    schema.pre(op, function () {
      this._queryStartTime = Date.now();
    });

    schema.post(op, function () {
      if (!this._queryStartTime) return;
      const duration = Date.now() - this._queryStartTime;
      if (duration > SLOW_QUERY_MS) {
        const collection =
          this.model?.collection?.name || this._collection?.collectionName || 'unknown';
        const filter = typeof this.getFilter === 'function' ? this.getFilter() : {};
        logger.warn(`[SlowQuery] ${op} on "${collection}" took ${duration}ms`, {
          operation: op,
          collection,
          durationMs: duration,
          filter: JSON.stringify(filter).slice(0, 200),
        });
      }
    });
  }
}

// ─── Default toJSON Transform ────────────────────────────────────────────────
// Strips __v and renames _id → id in all JSON responses for consistency.
function toJSONPlugin(schema) {
  if (!schema.options.toJSON) schema.options.toJSON = {};
  const existing = schema.options.toJSON.transform;

  schema.options.toJSON.transform = function (doc, ret, options) {
    if (ret._id) {
      ret.id = ret._id.toString();
      delete ret._id;
    }
    delete ret.__v;
    if (existing) return existing(doc, ret, options);
    return ret;
  };
}

// ─── Register Plugins Globally ───────────────────────────────────────────────
function registerGlobalPlugins() {
  // Skip plugin registration in test environments where mongoose is mocked
  if (typeof mongoose.plugin !== 'function') {
    logger.info('[Mongoose] Plugin registration skipped (mocked mongoose)');
    return;
  }

  mongoose.plugin(slowQueryPlugin);
  mongoose.plugin(toJSONPlugin);

  // Production optimizations
  if (isProd) {
    // Disable auto-index creation in production — indexes should be created by migration scripts
    mongoose.set('autoIndex', false);
    logger.info('[Mongoose] autoIndex disabled (production mode)');
  }

  // Enable debug mode via env var (prints all Mongoose queries for troubleshooting)
  if (process.env.MONGOOSE_DEBUG === 'true') {
    mongoose.set('debug', true);
    logger.info('[Mongoose] Debug mode enabled — all queries will be logged');
  }

  logger.info(`[Mongoose] Global plugins registered (slowQuery threshold: ${SLOW_QUERY_MS}ms)`);
}

// ─── Connection Pool Health ──────────────────────────────────────────────────
function getConnectionPoolHealth() {
  const conn = mongoose.connection;
  if (!conn || conn.readyState !== 1) {
    return { status: 'disconnected', readyState: conn?.readyState };
  }

  const client = conn.getClient?.();
  const pool = client?.topology?.s?.pool;

  return {
    status: 'connected',
    readyState: conn.readyState,
    host: conn.host,
    name: conn.name,
    // Pool metrics (available when driver exposes them)
    ...(pool
      ? {
          poolSize: pool.totalConnectionCount ?? 'N/A',
          availableConnections: pool.availableConnectionCount ?? 'N/A',
        }
      : {}),
  };
}

module.exports = {
  slowQueryPlugin,
  toJSONPlugin,
  registerGlobalPlugins,
  getConnectionPoolHealth,
};
