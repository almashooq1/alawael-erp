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

// ─── Legacy Hook Adapter (mongoose 9 compat) ────────────────────────────────
// Mongoose 9 stopped passing `next` to document-level pre/post hooks. This
// codebase has 90+ models defined with the legacy
//   `function (next) { ...sync work...; next(); }`
// shape, which now throws "TypeError: next is not a function" at save-time.
//
// Rather than rewrite every model, we patch `Schema.prototype.pre`/`post`
// once: any hook function that declares a single `next` parameter is wrapped
// so it sees a real `next` callback again. We honour the user calling
// `next(err)` as a rejection, sync `next()` as resolution, and a returned
// Promise (for `async function (next)`) as a fallback completion signal.
//
// Modern hooks (no parameter, return-promise) and parallel hooks (two
// parameters: next + done) bypass the wrapper untouched.
// Extract the sole declared parameter name of a 1-arg function (best-effort).
function firstParamName(fn) {
  const src = Function.prototype.toString.call(fn);
  let m = src.match(/^(?:async\s+)?function\b[^(]*\(\s*([^),\s]+)/);
  if (!m) m = src.match(/^\s*\(\s*([^),\s]+)\s*\)\s*=>/); // (p) =>
  if (!m) m = src.match(/^\s*([A-Za-z_$][\w$]*)\s*=>/); //  p  =>
  return m ? m[1] : null;
}

function legacyHookAdapter(fn) {
  if (typeof fn !== 'function') return fn;
  if (fn.length !== 1) return fn; // 0 = modern, 2 = parallel — leave alone
  // W954 (2026-06-08) — CRITICAL: only adapt a TRUE legacy callback hook, whose
  // sole parameter is the `next` continuation. A 1-param POST hook receives the
  // document (`post('save', function (doc) {…})`), NOT next. Wrapping it passed
  // `next` in as `doc`; since the body neither calls next() nor returns a
  // thenable, the wrapper Promise NEVER resolved → every .save()/.create() on
  // any model carrying such a post hook HUNG until the caller timed out. This
  // shim is registered globally in server.js, so it silently broke saves in
  // production — a root cause of "البيانات لا تُحفظ" (data won't save). Keying on
  // the param name leaves `(doc)` post hooks (and `(err)` handlers) untouched
  // while still rescuing genuine `function (next) {…}` legacy hooks. (When the
  // source can't be parsed, fall through and wrap — preserves the W946 rescue.)
  const p = firstParamName(fn);
  if (p && p !== 'next') return fn;
  // Avoid double-wrapping when registerGlobalPlugins runs again in tests.
  if (fn.__legacyShimmed) return fn;

  const wrapped = async function shimmedHook() {
    return new Promise((resolve, reject) => {
      let settled = false;
      const next = err => {
        if (settled) return;
        settled = true;
        if (err) reject(err);
        else resolve();
      };
      try {
        const ret = fn.call(this, next);
        if (ret && typeof ret.then === 'function') {
          ret.then(
            () => next(),
            e => next(e)
          );
        }
      } catch (e) {
        next(e);
      }
    });
  };
  wrapped.__legacyShimmed = true;
  return wrapped;
}

(function patchSchemaPreForLegacyHooks() {
  if (!mongoose || !mongoose.Schema || !mongoose.Schema.prototype) return;
  const proto = mongoose.Schema.prototype;
  if (proto.__legacyHookShimInstalled) return;
  for (const method of ['pre', 'post']) {
    const orig = proto[method];
    if (typeof orig !== 'function') continue;
    proto[method] = function patched(...args) {
      // pre/post signature: (event, [options], fn). The hook fn is always
      // the last argument when one is supplied.
      const last = args[args.length - 1];
      if (typeof last === 'function') {
        args[args.length - 1] = legacyHookAdapter(last);
      }
      return orig.apply(this, args);
    };
  }
  proto.__legacyHookShimInstalled = true;
})();

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
  // Exported for the W954 regression guard (legacy-hook-adapter-wave954.test.js).
  legacyHookAdapter,
  firstParamName,
};
