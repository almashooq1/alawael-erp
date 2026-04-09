'use strict';

/**
 * DDD Circuit Breaker
 * ═══════════════════════════════════════════════════════════════════════
 * Circuit breaker pattern for external service calls, retry policies
 * with exponential backoff, and graceful service degradation.
 *
 * Features:
 *  - Three-state circuit: closed → open → half-open
 *  - Configurable failure thresholds & reset timeouts
 *  - Automatic recovery with half-open probing
 *  - Retry with exponential backoff + jitter
 *  - Fallback support for graceful degradation
 *  - Persistent circuit state (MongoDB)
 *  - Circuit dashboard & monitoring
 *
 * @module dddCircuitBreaker
 */

const mongoose = require('mongoose');
const { Router } = require('express');

/* ═══════════════════════════════════════════════════════════════════════
   1. Circuit State Model
   ═══════════════════════════════════════════════════════════════════════ */
const circuitStateSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, unique: true, index: true },
    state: {
      type: String,
      enum: ['closed', 'open', 'half-open'],
      default: 'closed',
    },
    failureCount: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    halfOpenSuccesses: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    totalFailures: { type: Number, default: 0 },
    totalSuccesses: { type: Number, default: 0 },

    lastFailure: Date,
    lastSuccess: Date,
    lastStateChange: { type: Date, default: Date.now },
    lastError: String,

    config: {
      failureThreshold: { type: Number, default: 5 },
      resetTimeoutMs: { type: Number, default: 30000 },
      halfOpenRequests: { type: Number, default: 3 },
      monitorIntervalMs: { type: Number, default: 60000 },
    },

    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const DDDCircuitState =
  mongoose.models.DDDCircuitState || mongoose.model('DDDCircuitState', circuitStateSchema);

/* ═══════════════════════════════════════════════════════════════════════
   2. Circuit Event Log
   ═══════════════════════════════════════════════════════════════════════ */
const circuitEventSchema = new mongoose.Schema(
  {
    serviceName: { type: String, required: true, index: true },
    eventType: {
      type: String,
      enum: ['trip', 'reset', 'half-open', 'success', 'failure', 'fallback', 'manual-reset'],
      required: true,
    },
    previousState: String,
    newState: String,
    error: String,
    durationMs: Number,
    metadata: mongoose.Schema.Types.Mixed,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

circuitEventSchema.index({ serviceName: 1, createdAt: -1 });

const DDDCircuitEvent =
  mongoose.models.DDDCircuitEvent || mongoose.model('DDDCircuitEvent', circuitEventSchema);

/* ═══════════════════════════════════════════════════════════════════════
   3. Default Circuit Configurations
   ═══════════════════════════════════════════════════════════════════════ */
const CIRCUIT_DEFAULTS = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenRequests: 3,
  monitorIntervalMs: 60000,
};

const PRE_CONFIGURED_CIRCUITS = [
  {
    serviceName: 'mongodb',
    config: { failureThreshold: 3, resetTimeoutMs: 10000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'redis',
    config: { failureThreshold: 5, resetTimeoutMs: 15000, halfOpenRequests: 3 },
  },
  {
    serviceName: 'email-service',
    config: { failureThreshold: 5, resetTimeoutMs: 60000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'sms-service',
    config: { failureThreshold: 3, resetTimeoutMs: 120000, halfOpenRequests: 1 },
  },
  {
    serviceName: 'push-notification',
    config: { failureThreshold: 5, resetTimeoutMs: 60000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'fhir-endpoint',
    config: { failureThreshold: 3, resetTimeoutMs: 30000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'webhook-delivery',
    config: { failureThreshold: 10, resetTimeoutMs: 30000, halfOpenRequests: 5 },
  },
  {
    serviceName: 's3-storage',
    config: { failureThreshold: 3, resetTimeoutMs: 20000, halfOpenRequests: 2 },
  },
  {
    serviceName: 'ai-recommendation-engine',
    config: { failureThreshold: 5, resetTimeoutMs: 45000, halfOpenRequests: 3 },
  },
  {
    serviceName: 'external-assessment-api',
    config: { failureThreshold: 3, resetTimeoutMs: 60000, halfOpenRequests: 2 },
  },
];

/* ═══════════════════════════════════════════════════════════════════════
   4. CircuitBreaker Class
   ═══════════════════════════════════════════════════════════════════════ */
class CircuitBreaker {
  /**
   * @param {string} serviceName - Unique service identifier
   * @param {Object} config - Circuit configuration overrides
   */
  constructor(serviceName, config = {}) {
    this.serviceName = serviceName;
    this.config = { ...CIRCUIT_DEFAULTS, ...config };
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenSuccesses = 0;
    this.lastFailure = null;
    this.lastError = null;
    this._initialized = false;
  }

  async _init() {
    if (this._initialized) return;
    try {
      const stored = await DDDCircuitState.findOne({ serviceName: this.serviceName });
      if (stored) {
        this.state = stored.state;
        this.failureCount = stored.failureCount;
        this.successCount = stored.successCount;
        this.halfOpenSuccesses = stored.halfOpenSuccesses;
        this.lastFailure = stored.lastFailure;
        this.lastError = stored.lastError;
      }
    } catch {
      /* first run */
    }
    this._initialized = true;
  }

  async _persist(eventType, extra = {}) {
    try {
      await DDDCircuitState.findOneAndUpdate(
        { serviceName: this.serviceName },
        {
          $set: {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            halfOpenSuccesses: this.halfOpenSuccesses,
            lastFailure: this.lastFailure,
            lastError: this.lastError,
            lastStateChange: new Date(),
            config: this.config,
          },
          $inc: {
            totalRequests: 1,
            ...(extra.failed ? { totalFailures: 1 } : { totalSuccesses: 1 }),
          },
        },
        { upsert: true }
      );

      if (eventType) {
        await DDDCircuitEvent.create({
          serviceName: this.serviceName,
          eventType,
          previousState: extra.prevState,
          newState: this.state,
          error: extra.error,
          durationMs: extra.durationMs,
        });
      }
    } catch {
      /* persistence failure shouldn't break circuit logic */
    }
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @param {Function} fn - Async function to execute
   * @param {Function} [fallback] - Fallback function if circuit is open
   * @returns {Promise<any>}
   */
  async execute(fn, fallback) {
    await this._init();

    /* Check if circuit should transition from open to half-open */
    if (this.state === 'open') {
      const elapsed = Date.now() - (this.lastFailure?.getTime() || 0);
      if (elapsed >= this.config.resetTimeoutMs) {
        const prevState = this.state;
        this.state = 'half-open';
        this.halfOpenSuccesses = 0;
        await this._persist('half-open', { prevState });
      } else {
        /* Circuit is open — use fallback or throw */
        if (fallback) {
          await this._persist('fallback', { failed: true });
          return fallback();
        }
        throw new Error(
          `Circuit breaker OPEN for ${this.serviceName}. Retry after ${Math.ceil((this.config.resetTimeoutMs - elapsed) / 1000)}s`
        );
      }
    }

    /* Execute the function */
    const start = Date.now();
    try {
      const result = await fn();
      await this._onSuccess(Date.now() - start);
      return result;
    } catch (err) {
      await this._onFailure(err, Date.now() - start);
      if (fallback) return fallback();
      throw err;
    }
  }

  async _onSuccess(durationMs) {
    this.successCount++;

    if (this.state === 'half-open') {
      this.halfOpenSuccesses++;
      if (this.halfOpenSuccesses >= this.config.halfOpenRequests) {
        const prevState = this.state;
        this.state = 'closed';
        this.failureCount = 0;
        this.halfOpenSuccesses = 0;
        await this._persist('reset', { prevState, durationMs });
        return;
      }
    } else {
      this.failureCount = Math.max(0, this.failureCount - 1); // decay on success
    }

    await this._persist('success', { durationMs });
  }

  async _onFailure(err, durationMs) {
    this.failureCount++;
    this.lastFailure = new Date();
    this.lastError = err.message;

    if (this.state === 'half-open') {
      /* Any failure in half-open trips immediately */
      const prevState = this.state;
      this.state = 'open';
      await this._persist('trip', { prevState, error: err.message, durationMs, failed: true });
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      const prevState = this.state;
      this.state = 'open';
      await this._persist('trip', { prevState, error: err.message, durationMs, failed: true });
    } else {
      await this._persist('failure', { error: err.message, durationMs, failed: true });
    }
  }

  async reset() {
    const prevState = this.state;
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenSuccesses = 0;
    this.lastError = null;
    await this._persist('manual-reset', { prevState });
  }

  getStatus() {
    return {
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      config: this.config,
      lastFailure: this.lastFailure,
      lastError: this.lastError,
    };
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   5. Circuit Registry
   ═══════════════════════════════════════════════════════════════════════ */
const circuitRegistry = {};

function getCircuit(serviceName, config) {
  if (!circuitRegistry[serviceName]) {
    const preConfig = PRE_CONFIGURED_CIRCUITS.find(c => c.serviceName === serviceName);
    circuitRegistry[serviceName] = new CircuitBreaker(serviceName, config || preConfig?.config);
  }
  return circuitRegistry[serviceName];
}

function listCircuits() {
  return Object.values(circuitRegistry).map(cb => cb.getStatus());
}

/* ═══════════════════════════════════════════════════════════════════════
   6. Retry with Exponential Backoff
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Retry a function with exponential backoff and jitter.
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} opts - { maxRetries, baseDelayMs, maxDelayMs, jitter }
 * @returns {Promise<any>}
 */
async function withRetry(fn, opts = {}) {
  const { maxRetries = 3, baseDelayMs = 1000, maxDelayMs = 30000, jitter = true } = opts;

  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxRetries) {
        let delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        if (jitter) delay = delay * (0.5 + Math.random() * 0.5);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastErr;
}

/**
 * Execute a function with a fallback value if it throws.
 *
 * @param {Function} fn - Primary async function
 * @param {any} fallbackValue - Value to return on failure (or a function returning value)
 * @returns {Promise<any>}
 */
async function withFallback(fn, fallbackValue) {
  try {
    return await fn();
  } catch {
    return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   7. Circuit Dashboard
   ═══════════════════════════════════════════════════════════════════════ */
async function getCircuitDashboard() {
  const [allStates, recentEvents, eventCounts] = await Promise.all([
    DDDCircuitState.find({ isDeleted: { $ne: true } }).lean(),
    DDDCircuitEvent.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    DDDCircuitEvent.aggregate([
      {
        $match: { isDeleted: { $ne: true }, createdAt: { $gte: new Date(Date.now() - 86400000) } },
      },
      { $group: { _id: { service: '$serviceName', event: '$eventType' }, count: { $sum: 1 } } },
    ]),
  ]);

  const byState = { closed: 0, open: 0, 'half-open': 0 };
  for (const s of allStates) {
    byState[s.state] = (byState[s.state] || 0) + 1;
  }

  return {
    totalCircuits: allStates.length,
    byState,
    inMemoryCircuits: Object.keys(circuitRegistry).length,
    preConfigured: PRE_CONFIGURED_CIRCUITS.length,
    circuits: allStates.map(s => ({
      serviceName: s.serviceName,
      state: s.state,
      failureCount: s.failureCount,
      totalRequests: s.totalRequests,
      totalFailures: s.totalFailures,
      lastFailure: s.lastFailure,
      lastError: s.lastError,
    })),
    recentEvents: recentEvents.slice(0, 10),
    last24hEvents: eventCounts.reduce((m, r) => {
      if (!m[r._id.service]) m[r._id.service] = {};
      m[r._id.service][r._id.event] = r.count;
      return m;
    }, {}),
  };
}

async function seedCircuits() {
  let created = 0;
  for (const def of PRE_CONFIGURED_CIRCUITS) {
    const exists = await DDDCircuitState.findOne({ serviceName: def.serviceName });
    if (!exists) {
      await DDDCircuitState.create({
        serviceName: def.serviceName,
        state: 'closed',
        config: def.config,
      });
      created++;
    }
  }
  return { created, total: PRE_CONFIGURED_CIRCUITS.length };
}

/* ═══════════════════════════════════════════════════════════════════════
   8. Express Router
   ═══════════════════════════════════════════════════════════════════════ */
function createCircuitBreakerRouter() {
  const router = Router();

  /* Dashboard */
  router.get('/circuits/dashboard', async (_req, res) => {
    try {
      const dashboard = await getCircuitDashboard();
      res.json({ success: true, ...dashboard });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* List all circuits */
  router.get('/circuits', async (_req, res) => {
    try {
      const states = await DDDCircuitState.find({ isDeleted: { $ne: true } }).lean();
      res.json({ success: true, count: states.length, circuits: states });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Get single circuit */
  router.get('/circuits/:name', async (req, res) => {
    try {
      const state = await DDDCircuitState.findOne({
        serviceName: req.params.name,
        isDeleted: { $ne: true },
      }).lean();
      if (!state) return res.status(404).json({ success: false, error: 'Circuit not found' });
      res.json({ success: true, circuit: state });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Reset circuit */
  router.post('/circuits/:name/reset', async (req, res) => {
    try {
      const cb = getCircuit(req.params.name);
      await cb.reset();
      res.json({
        success: true,
        message: `Circuit ${req.params.name} reset`,
        status: cb.getStatus(),
      });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  /* Circuit events */
  router.get('/circuits/:name/events', async (req, res) => {
    try {
      const events = await DDDCircuitEvent.find({
        serviceName: req.params.name,
        isDeleted: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();
      res.json({ success: true, count: events.length, events });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* Seed pre-configured */
  router.post('/circuits/seed', async (_req, res) => {
    try {
      const result = await seedCircuits();
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  /* In-memory status */
  router.get('/circuits/memory/status', (_req, res) => {
    res.json({ success: true, circuits: listCircuits() });
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════
   Exports
   ═══════════════════════════════════════════════════════════════════════ */
module.exports = {
  DDDCircuitState,
  DDDCircuitEvent,
  CircuitBreaker,
  CIRCUIT_DEFAULTS,
  PRE_CONFIGURED_CIRCUITS,
  getCircuit,
  listCircuits,
  withRetry,
  withFallback,
  getCircuitDashboard,
  seedCircuits,
  createCircuitBreakerRouter,
};
