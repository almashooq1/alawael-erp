/**
 * reports-ops.scheduler.js — runs the three ops sweeps (retry,
 * escalation, retention) on independent cron cadences.
 *
 * Phase 10 Commit 6.
 *
 * Cadences (Riyadh local):
 *   retry       : every 5 minutes           '*\/5 * * * *'
 *   escalation  : every 15 minutes          '*\/15 * * * *'
 *   retention   : daily at 03:00            '0 3 * * *'
 *
 * Mirrors the ReportsScheduler design: re-entrance guard per sweep,
 * setInterval fallback for tests, injected cron module for prod.
 */

'use strict';

const { runRetrySweep } = require('../services/reporting/retryService');
const { runEscalationSweep } = require('../services/reporting/escalationService');
const { runRetentionSweep } = require('../services/reporting/retentionService');

const DEFAULT_CRON = Object.freeze({
  retry: '*/5 * * * *',
  escalation: '*/15 * * * *',
  retention: '0 3 * * *',
});

class ReportsOpsScheduler {
  /**
   * @param {Object} deps
   * @param {Object} deps.DeliveryModel
   * @param {Object} deps.catalog
   * @param {Object} deps.engine
   * @param {Object} [deps.recipientResolver]
   * @param {Object} [deps.channels]
   * @param {Object} [deps.eventBus]
   * @param {Object} [deps.cron]          node-cron module (prod)
   * @param {boolean}[deps.useInterval]   force setInterval mode (tests)
   * @param {Object} [deps.intervalsMs]   per-sweep intervals when useInterval
   * @param {Object} [deps.cronMap]       override DEFAULT_CRON
   * @param {Object} [deps.logger]
   * @param {Object} [deps.clock]
   */
  constructor({
    DeliveryModel,
    catalog,
    engine,
    recipientResolver,
    channels,
    eventBus,
    cron,
    useInterval = false,
    intervalsMs = {},
    cronMap = DEFAULT_CRON,
    logger = console,
    clock,
  } = {}) {
    if (!DeliveryModel) throw new Error('ReportsOpsScheduler: DeliveryModel required');
    if (!catalog) throw new Error('ReportsOpsScheduler: catalog required');
    if (!engine) throw new Error('ReportsOpsScheduler: engine required');
    this.DeliveryModel = DeliveryModel;
    this.catalog = catalog;
    this.engine = engine;
    this.recipientResolver = recipientResolver;
    this.channels = channels;
    this.eventBus = eventBus;
    this.cron = cron;
    this.useInterval = useInterval;
    this.intervalsMs = {
      retry: 5 * 60 * 1000,
      escalation: 15 * 60 * 1000,
      retention: 24 * 3600 * 1000,
      ...intervalsMs,
    };
    this.cronMap = { ...DEFAULT_CRON, ...cronMap };
    this.logger = logger;
    this.clock = clock || { now: () => new Date() };
    this._jobs = new Map();
    this._running = new Set();
  }

  // ─── Public API ─────────────────────────────────────────────

  start() {
    this._schedule('retry', () => this.runRetry());
    this._schedule('escalation', () => this.runEscalation());
    this._schedule('retention', () => this.runRetention());
    return this;
  }

  stop() {
    for (const [, handle] of this._jobs) {
      try {
        if (handle && typeof handle.stop === 'function') handle.stop();
        else if (handle) clearInterval(handle);
      } catch (_) {
        /* ignore */
      }
    }
    this._jobs.clear();
  }

  isRunning() {
    return this._jobs.size > 0;
  }

  async runRetry() {
    if (this._running.has('retry')) {
      return { skipped: true, reason: 'already running' };
    }
    this._running.add('retry');
    try {
      const s = await runRetrySweep({
        DeliveryModel: this.DeliveryModel,
        engine: this.engine,
        eventBus: this.eventBus,
        logger: this.logger,
        now: this.clock.now(),
      });
      this._logSummary('retry', s);
      return s;
    } finally {
      this._running.delete('retry');
    }
  }

  async runEscalation() {
    if (this._running.has('escalation')) {
      return { skipped: true, reason: 'already running' };
    }
    this._running.add('escalation');
    try {
      const s = await runEscalationSweep({
        DeliveryModel: this.DeliveryModel,
        catalog: this.catalog,
        recipientResolver: this.recipientResolver,
        channels: this.channels,
        eventBus: this.eventBus,
        logger: this.logger,
        now: this.clock.now(),
      });
      this._logSummary('escalation', s);
      return s;
    } finally {
      this._running.delete('escalation');
    }
  }

  async runRetention({ dryRun = false } = {}) {
    if (this._running.has('retention')) {
      return { skipped: true, reason: 'already running' };
    }
    this._running.add('retention');
    try {
      const s = await runRetentionSweep({
        DeliveryModel: this.DeliveryModel,
        catalog: this.catalog,
        eventBus: this.eventBus,
        logger: this.logger,
        now: this.clock.now(),
        dryRun,
      });
      this._logSummary('retention', s);
      return s;
    } finally {
      this._running.delete('retention');
    }
  }

  // ─── Internals ──────────────────────────────────────────────

  _schedule(name, runFn) {
    const run = () =>
      runFn().catch(err => {
        this.logger.error && this.logger.error(`[reports-ops ${name}] crashed: ${err.message}`);
      });

    if (this.useInterval || !this.cron || typeof this.cron.schedule !== 'function') {
      const t = setInterval(run, this.intervalsMs[name]);
      this._jobs.set(name, t);
      return;
    }
    const expr = this.cronMap[name];
    if (!this.cron.validate(expr)) {
      this.logger.error && this.logger.error(`[reports-ops] invalid cron for ${name}: ${expr}`);
      return;
    }
    const handle = this.cron.schedule(expr, run);
    this._jobs.set(name, handle);
  }

  _logSummary(name, summary) {
    if (!this.logger.info) return;
    const parts = Object.entries(summary)
      .filter(([k]) => k !== 'byReport' && k !== 'errors')
      .map(([k, v]) => `${k}=${v}`);
    this.logger.info(`[reports-ops ${name}] ${parts.join(' ')}`);
    if (summary.errors && summary.errors.length && this.logger.warn) {
      this.logger.warn(`[reports-ops ${name}] errors: ${summary.errors.slice(0, 5).join(' | ')}`);
    }
  }
}

module.exports = { ReportsOpsScheduler, DEFAULT_CRON };
