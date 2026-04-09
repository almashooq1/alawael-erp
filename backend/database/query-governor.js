/**
 * Query Resource Governor - Al-Awael ERP
 * حاكم موارد الاستعلامات
 *
 * Features:
 *  - Per-user / per-role query rate budgets
 *  - maxTimeMS enforcement on all queries
 *  - Max aggregation pipeline depth limiter
 *  - Long-running operation auto-killer
 *  - Resource consumption dashboard per consumer
 *  - Query complexity scoring
 *  - Throttling slow consumers
 *  - Integration with circuit-breaker
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Query Governor
// ══════════════════════════════════════════════════════════════════
class QueryGovernor {
  constructor(options = {}) {
    this._enabled = options.enabled !== false;
    this._defaultMaxTimeMs = options.defaultMaxTimeMs || 30000; // 30s
    this._maxAggregationStages = options.maxAggregationStages || 20;
    this._maxQueryLimit = options.maxQueryLimit || 5000;
    this._longRunningThresholdMs = options.longRunningThresholdMs || 60000; // 1min
    this._killThresholdMs = options.killThresholdMs || 120000; // 2min
    this._checkIntervalMs = options.checkIntervalMs || 30000; // 30s

    // Rate budgets: role -> { queriesPerMinute, writesPerMinute }
    this._rateBudgets = new Map(
      Object.entries(
        options.rateBudgets || {
          viewer: { queriesPerMinute: 60, writesPerMinute: 0 },
          user: { queriesPerMinute: 120, writesPerMinute: 30 },
          admin: { queriesPerMinute: 300, writesPerMinute: 100 },
          superAdmin: { queriesPerMinute: Infinity, writesPerMinute: Infinity },
        }
      )
    );

    // Sliding window counters: `userId:minute` -> count
    this._queryCounters = new Map();
    this._writeCounters = new Map();
    this._throttled = new Set(); // userIds currently throttled

    // Active query tracking
    this._activeQueries = new Map(); // queryId -> { start, userId, model, op }
    this._queryIdCounter = 0;

    // Metrics
    this._metrics = {
      totalQueries: 0,
      totalWrites: 0,
      throttledQueries: 0,
      killedOperations: 0,
      complexityRejections: 0,
      byRole: {},
      byModel: {},
      slowQueries: [],
    };

    this._monitorTimer = null;
  }

  // ────── Mongoose Plugin ──────

  /**
   * Plugin that injects governance on every query
   * Usage: schema.plugin(governor.plugin(), { modelName: 'Product' })
   */
  plugin() {
    const self = this;

    return function queryGovernorPlugin(schema, pluginOptions = {}) {
      const modelName = pluginOptions.modelName || 'Unknown';

      // ── Reads ──
      const readHooks = ['find', 'findOne', 'findOneAndUpdate', 'countDocuments', 'distinct'];
      for (const hook of readHooks) {
        schema.pre(hook, function () {
          if (!self._enabled) return;
          self._governQuery(this, modelName, 'read');
        });
      }

      // ── Writes ──
      schema.pre('save', function (next) {
        if (!self._enabled) return next();
        const ctx = self._getContext();
        if (ctx && !self._checkWriteBudget(ctx.userId, ctx.role)) {
          return next(new Error('Write rate limit exceeded. Please try again later.'));
        }
        self._trackMetric(modelName, 'write');
        next();
      });

      const writeHooks = ['updateMany', 'deleteMany', 'insertMany'];
      for (const hook of writeHooks) {
        schema.pre(hook, function () {
          if (!self._enabled) return;
          const ctx = self._getContext();
          if (ctx && !self._checkWriteBudget(ctx.userId, ctx.role)) {
            throw new Error('Write rate limit exceeded. Please try again later.');
          }
          self._trackMetric(modelName, 'write');
        });
      }

      // ── Aggregation ──
      schema.pre('aggregate', function () {
        if (!self._enabled) return;
        const pipeline = this.pipeline();

        // Check pipeline depth
        if (pipeline.length > self._maxAggregationStages) {
          self._metrics.complexityRejections++;
          throw new Error(
            `Aggregation too complex: ${pipeline.length} stages (max: ${self._maxAggregationStages})`
          );
        }

        // Enforce maxTimeMS
        this.options.maxTimeMS = self._defaultMaxTimeMs;

        // Check for unbounded $lookup (no limit inside)
        for (const stage of pipeline) {
          if (stage.$lookup?.pipeline && stage.$lookup.pipeline.length > 10) {
            logger.warn(
              `[Governor] Complex $lookup in ${modelName}: ${stage.$lookup.pipeline.length} sub-stages`
            );
          }
        }

        self._trackMetric(modelName, 'aggregation');
      });
    };
  }

  // ────── Governance Logic ──────

  _governQuery(query, modelName, type) {
    // 1. Enforce maxTimeMS
    if (!query.getOptions().maxTimeMS) {
      query.maxTimeMS(this._defaultMaxTimeMs);
    }

    // 2. Enforce limit cap
    const opts = query.getOptions();
    if (!opts.limit || opts.limit > this._maxQueryLimit) {
      query.limit(this._maxQueryLimit);
    }

    // 3. Rate budget check
    const ctx = this._getContext();
    if (ctx) {
      if (!this._checkQueryBudget(ctx.userId, ctx.role)) {
        this._metrics.throttledQueries++;
        throw new Error('Query rate limit exceeded. Please slow down.');
      }
    }

    // 4. Track
    this._trackMetric(modelName, type);
    this._metrics.totalQueries++;
  }

  _checkQueryBudget(userId, role) {
    if (!userId) return true;
    const budget = this._rateBudgets.get(role);
    if (!budget || budget.queriesPerMinute === Infinity) return true;

    const key = `${userId}:${this._currentMinute()}`;
    const count = (this._queryCounters.get(key) || 0) + 1;
    this._queryCounters.set(key, count);

    if (count > budget.queriesPerMinute) {
      this._throttled.add(String(userId));
      logger.warn(
        `[Governor] User ${userId} (${role}) exceeded query budget: ${count}/${budget.queriesPerMinute}/min`
      );
      return false;
    }
    return true;
  }

  _checkWriteBudget(userId, role) {
    if (!userId) return true;
    const budget = this._rateBudgets.get(role);
    if (!budget || budget.writesPerMinute === Infinity) return true;

    const key = `${userId}:${this._currentMinute()}`;
    const count = (this._writeCounters.get(key) || 0) + 1;
    this._writeCounters.set(key, count);

    if (count > budget.writesPerMinute) {
      logger.warn(
        `[Governor] User ${userId} (${role}) exceeded write budget: ${count}/${budget.writesPerMinute}/min`
      );
      return false;
    }
    return true;
  }

  _getContext() {
    // Try to get from AsyncLocalStorage (if tenant isolator is available)
    try {
      const { tenantStore } = require('./multi-tenant-isolator');
      const store = tenantStore.getStore();
      if (store) return store;
    } catch (_) {
      // Not available
    }
    return null;
  }

  // ────── Long-Running Operation Monitor ──────

  startMonitor() {
    if (this._monitorTimer) return;

    this._monitorTimer = setInterval(async () => {
      try {
        await this._checkLongRunningOps();
        this._cleanupCounters();
      } catch (err) {
        logger.error(`[Governor] Monitor error: ${err.message}`);
      }
    }, this._checkIntervalMs);

    logger.info(`[Governor] Monitor started (interval: ${this._checkIntervalMs}ms)`);
  }

  stopMonitor() {
    if (this._monitorTimer) {
      clearInterval(this._monitorTimer);
      this._monitorTimer = null;
      logger.info('[Governor] Monitor stopped');
    }
  }

  async _checkLongRunningOps() {
    const db = mongoose.connection.db;
    if (!db) return;

    try {
      const admin = db.admin();
      const result = await admin.command({ currentOp: 1, active: true });
      const ops = result.inprog || [];

      const longRunning = ops.filter(
        op => op.microsecs_running && op.microsecs_running > this._longRunningThresholdMs * 1000
      );

      for (const op of longRunning) {
        const durationMs = Math.floor(op.microsecs_running / 1000);
        const entry = {
          opId: op.opid,
          operation: op.op,
          namespace: op.ns,
          durationMs,
          command: op.command ? JSON.stringify(op.command).slice(0, 200) : 'N/A',
        };

        if (durationMs > this._killThresholdMs) {
          // Auto-kill
          try {
            await admin.command({ killOp: 1, op: op.opid });
            this._metrics.killedOperations++;
            logger.warn(
              `[Governor] KILLED long operation after ${(durationMs / 1000).toFixed(1)}s`,
              entry
            );
          } catch (killErr) {
            logger.error(`[Governor] Failed to kill op ${op.opid}: ${killErr.message}`);
          }
        } else {
          logger.warn(
            `[Governor] Long-running operation: ${(durationMs / 1000).toFixed(1)}s`,
            entry
          );
        }

        // Track slow query
        this._metrics.slowQueries.push({
          ...entry,
          timestamp: new Date(),
        });
        if (this._metrics.slowQueries.length > 100) {
          this._metrics.slowQueries = this._metrics.slowQueries.slice(-100);
        }
      }
    } catch (err) {
      // currentOp might require admin privileges
      if (!err.message.includes('not authorized')) {
        logger.error(`[Governor] currentOp check failed: ${err.message}`);
      }
    }
  }

  _cleanupCounters() {
    const currentMin = this._currentMinute();
    // Remove old minute counters
    for (const [key] of this._queryCounters) {
      if (!key.endsWith(`:${currentMin}`)) {
        this._queryCounters.delete(key);
      }
    }
    for (const [key] of this._writeCounters) {
      if (!key.endsWith(`:${currentMin}`)) {
        this._writeCounters.delete(key);
      }
    }
    // Clear throttled
    this._throttled.clear();
  }

  // ────── Query Complexity Scorer ──────

  scoreQueryComplexity(query) {
    let score = 0;
    const filter = typeof query.getFilter === 'function' ? query.getFilter() : query;

    // Count filter conditions
    const keys = Object.keys(filter);
    score += keys.length * 2;

    // Regex is expensive
    for (const val of Object.values(filter)) {
      if (val instanceof RegExp || val?.$regex) score += 10;
      if (val?.$in && Array.isArray(val.$in)) score += val.$in.length;
      if (val?.$or || val?.$and) score += 5;
      if (val?.$elemMatch) score += 8;
      if (val?.$exists !== undefined) score += 3;
    }

    // Nested $or/$and
    if (filter.$or) score += filter.$or.length * 3;
    if (filter.$and) score += filter.$and.length * 2;

    return {
      score,
      level: score < 10 ? 'simple' : score < 30 ? 'moderate' : score < 60 ? 'complex' : 'expensive',
    };
  }

  scorePipelineComplexity(pipeline) {
    let score = 0;

    for (const stage of pipeline) {
      const [op] = Object.keys(stage);
      switch (op) {
        case '$match':
          score += 2;
          break;
        case '$project':
          score += 1;
          break;
        case '$sort':
          score += 3;
          break;
        case '$group':
          score += 5;
          break;
        case '$lookup':
          score += 10;
          break;
        case '$unwind':
          score += 4;
          break;
        case '$facet':
          score += 15;
          break;
        case '$graphLookup':
          score += 20;
          break;
        case '$merge':
          score += 8;
          break;
        case '$out':
          score += 8;
          break;
        default:
          score += 2;
      }
    }

    return {
      score,
      stages: pipeline.length,
      level: score < 15 ? 'simple' : score < 40 ? 'moderate' : score < 80 ? 'complex' : 'expensive',
    };
  }

  // ────── Budget Configuration ──────

  setRateBudget(role, budget) {
    this._rateBudgets.set(role, {
      queriesPerMinute: budget.queriesPerMinute ?? 120,
      writesPerMinute: budget.writesPerMinute ?? 30,
    });
    return this;
  }

  // ────── Metrics ──────

  _trackMetric(modelName, type) {
    // By model
    if (!this._metrics.byModel[modelName]) {
      this._metrics.byModel[modelName] = { reads: 0, writes: 0, aggregations: 0 };
    }
    this._metrics.byModel[modelName][
      type === 'read' ? 'reads' : type === 'write' ? 'writes' : 'aggregations'
    ]++;
  }

  _currentMinute() {
    return Math.floor(Date.now() / 60000);
  }

  getMetrics() {
    return {
      ...this._metrics,
      activeThrottled: [...this._throttled],
      rateBudgets: Object.fromEntries(this._rateBudgets),
      config: {
        maxTimeMs: this._defaultMaxTimeMs,
        maxAggregationStages: this._maxAggregationStages,
        maxQueryLimit: this._maxQueryLimit,
        longRunningThresholdMs: this._longRunningThresholdMs,
        killThresholdMs: this._killThresholdMs,
      },
      monitoring: !!this._monitorTimer,
    };
  }

  async getCurrentOps() {
    const db = mongoose.connection.db;
    if (!db) return [];

    try {
      const admin = db.admin();
      const result = await admin.command({ currentOp: 1, active: true });
      return (result.inprog || []).map(op => ({
        opId: op.opid,
        operation: op.op,
        namespace: op.ns,
        durationMs: op.microsecs_running ? Math.floor(op.microsecs_running / 1000) : 0,
        waitingForLock: op.waitingForLock || false,
        client: op.client,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Express middleware for per-request governance
   */
  middleware() {
    const self = this;
    return (req, _res, next) => {
      if (!self._enabled) return next();

      req._governorQueryId = ++self._queryIdCounter;
      req._governorStart = Date.now();

      const role = req.user?.role || 'user';
      if (!self._metrics.byRole[role]) {
        self._metrics.byRole[role] = { queries: 0, throttled: 0 };
      }
      self._metrics.byRole[role].queries++;

      next();
    };
  }
}

// Singleton
const queryGovernor = new QueryGovernor();

module.exports = {
  QueryGovernor,
  queryGovernor,
};
