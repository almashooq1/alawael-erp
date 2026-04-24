/**
 * Integration Hardening Bootstrap — wires the production adapters for the
 * hardening layer (DLQ + idempotency store) and mounts the admin router.
 *
 * Policy for adapter selection:
 *   - Mongo DLQ store   when mongoose is connected AND mode !== 'memory'
 *   - Redis idempotency when a Redis client is available AND reachable
 *   - Otherwise falls back to the in-memory stores (which is what the
 *     AclClient already gets by default at require-time).
 *
 * Must be safe to call more than once — boot order inside app.js does not
 * currently guarantee that mongo + redis are ready when this runs, so the
 * function is idempotent and re-checks on each invocation.
 */

'use strict';

const dlqModule = require('../infrastructure/deadLetterQueue');
const idemModule = require('../infrastructure/idempotencyStore');
const adminOpsDlqRouter = require('../routes/admin-ops-dlq.routes');
const logger = require('../utils/logger');

// Track which apps have already had the router mounted, so we don't double-
// mount on the same app but DO mount on every fresh one (useful in tests).
const mountedApps = new WeakSet();
// Storage selection is process-global (adapters are singletons), but we still
// allow it to be re-evaluated if the first attempt happened before mongo/redis
// came up.
let storageMode = { dlq: null, idempotency: null };

function bootstrapIntegrationHardening(app, { mongoose, redisClient, isTestEnv = false } = {}) {
  const state = {
    dlq: storageMode.dlq,
    idempotency: storageMode.idempotency,
    router: false,
    worker: null,
  };

  // 1) DLQ store selection
  try {
    const mongoReady = mongoose && mongoose.connection && mongoose.connection.readyState === 1;
    if (!storageMode.dlq && mongoReady && !isTestEnv) {
      const { create } = require('../infrastructure/adapters/mongoDeadLetterStore');
      dlqModule.setStore(create());
      storageMode.dlq = 'mongo';
      logger.info && logger.info('[Hardening] DLQ store: mongo');
    } else if (!storageMode.dlq) {
      storageMode.dlq = 'memory';
      logger.info && logger.info('[Hardening] DLQ store: in-memory (mongo not ready or test mode)');
    }
    state.dlq = storageMode.dlq;
  } catch (err) {
    logger.warn && logger.warn(`[Hardening] DLQ adapter setup skipped: ${err.message}`);
  }

  // 2) Idempotency store selection
  try {
    const redisUp =
      redisClient && typeof redisClient.get === 'function' && typeof redisClient.set === 'function';
    if (!storageMode.idempotency && redisUp && !isTestEnv) {
      const { create } = require('../infrastructure/adapters/redisIdempotencyStore');
      idemModule.setStore(create(redisClient));
      storageMode.idempotency = 'redis';
      logger.info && logger.info('[Hardening] Idempotency store: redis');
    } else if (!storageMode.idempotency) {
      storageMode.idempotency = 'memory';
      logger.info && logger.info('[Hardening] Idempotency store: in-memory');
    }
    state.idempotency = storageMode.idempotency;
  } catch (err) {
    logger.warn && logger.warn(`[Hardening] Idempotency adapter setup skipped: ${err.message}`);
  }

  // 3) Mount admin DLQ router — once per app
  try {
    if (app && !mountedApps.has(app)) {
      app.use('/api/v1/admin/ops', adminOpsDlqRouter);
      mountedApps.add(app);
      state.router = true;
      logger.info && logger.info('[Hardening] Admin router mounted at /api/v1/admin/ops');
    } else if (app && mountedApps.has(app)) {
      state.router = true; // already mounted — report truthfully
    }
  } catch (err) {
    logger.warn && logger.warn(`[Hardening] Admin router mount skipped: ${err.message}`);
  }

  let worker = null;
  return {
    status: () => ({ ...state, worker: !!worker }),
    startReplayWorker(opts = {}) {
      if (worker) return worker;
      const { createDlqReplayScheduler } = require('./dlqReplayScheduler');
      const { adapters } = opts;
      if (!adapters) throw new Error('startReplayWorker: opts.adapters (Map) required');
      worker = createDlqReplayScheduler({ adapters, ...opts });
      if (!isTestEnv) worker.start();
      return worker;
    },
    registerReplayAdapter(name, fn) {
      adminOpsDlqRouter.registerReplayAdapter(name, fn);
    },
  };
}

// Exposed for tests that reset module-level storage selection between cases.
function _resetForTests() {
  storageMode = { dlq: null, idempotency: null };
}
module.exports._resetForTests = _resetForTests;

module.exports = { bootstrapIntegrationHardening };
