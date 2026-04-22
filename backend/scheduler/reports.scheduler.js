/**
 * reports.scheduler.js — binds the 7 catalog periodicities to cron.
 *
 * Phase 10 Commit 1.
 *
 * For each non-`on_demand` periodicity, we schedule a cron job that
 * walks the catalog, filters entries with that periodicity, and calls
 * `reportingEngine.runInstance({ reportId, periodKey, scopeKey })` for
 * each report × scope combination the scopeProvider returns.
 *
 * A scopeProvider is how we fan one catalog entry out to many
 * instances: e.g. a per-beneficiary progress report needs one run per
 * active beneficiary, a branch occupancy report needs one run per
 * branch, an executive digest needs just one tenant-wide run.
 *
 * Two modes supported (matching alerts/scheduler.js convention):
 *   - cron expression via node-cron (default)
 *   - setInterval fallback (for tests)
 *
 * The scheduler never talks to models directly — it only asks the
 * engine to run. This keeps jobs idempotent and testable.
 */

'use strict';

const DEFAULT_SCOPE_PROVIDER = {
  async scopesFor(/* report, periodKey */) {
    return [undefined]; // one tenant-wide run
  },
  periodKey(periodicity, now = new Date()) {
    return defaultPeriodKey(periodicity, now);
  },
};

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Compute a period key stable within a given periodicity boundary.
 * Used as part of the instanceKey so re-runs inside the same period
 * upsert the same delivery row.
 */
function defaultPeriodKey(periodicity, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  switch (periodicity) {
    case 'daily':
      return `${y}-${pad2(m)}-${pad2(d)}`;
    case 'weekly':
      return `${y}-W${pad2(isoWeek(now))}`;
    case 'monthly':
      return `${y}-${pad2(m)}`;
    case 'quarterly':
      return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
    case 'semiannual':
      return `${y}-H${m <= 6 ? 1 : 2}`;
    case 'annual':
      return `${y}`;
    default:
      return `${y}-${pad2(m)}-${pad2(d)}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}`;
  }
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

class ReportsScheduler {
  /**
   * @param {Object} deps
   * @param {Object} deps.catalog         — `require('config/report.catalog')`
   * @param {Object} deps.engine          — ReportingEngine instance
   * @param {Object} [deps.scopeProvider] — `{ scopesFor(report, periodKey), periodKey(periodicity, now) }`
   * @param {Object} [deps.cron]          — `node-cron` module (optional; tests can omit)
   * @param {Object} [deps.logger]
   * @param {Object} [deps.clock]
   * @param {boolean} [deps.useInterval]  — if true, use setInterval instead of cron
   * @param {number} [deps.intervalMs]    — fallback interval (default 5 minutes)
   */
  constructor({
    catalog,
    engine,
    scopeProvider,
    cron,
    logger = console,
    clock,
    useInterval = false,
    intervalMs = 5 * 60 * 1000,
  }) {
    if (!catalog) throw new Error('ReportsScheduler: catalog required');
    if (!engine) throw new Error('ReportsScheduler: engine required');
    this.catalog = catalog;
    this.engine = engine;
    this.scopeProvider = scopeProvider || DEFAULT_SCOPE_PROVIDER;
    this.cron = cron;
    this.logger = logger;
    this.clock = clock || { now: () => new Date() };
    this.useInterval = useInterval;
    this.intervalMs = intervalMs;
    this._jobs = new Map(); // periodicity -> task handle
    this._running = new Set(); // periodicities currently ticking (re-entrance guard)
  }

  /**
   * Register one cron job per non-`on_demand` periodicity. Returns the
   * scheduler for chaining.
   */
  start() {
    const cronMap = this.catalog.PERIODICITY_CRON || {};
    for (const periodicity of this.catalog.PERIODICITIES) {
      if (periodicity === 'on_demand') continue;
      const cronExpr = cronMap[periodicity];
      if (!cronExpr) continue;
      this._schedulePeriodicity(periodicity, cronExpr);
    }
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

  /**
   * Run a single periodicity now — useful for testing and manual
   * kicks. Returns a `{ reportId → runInstance result }` summary.
   */
  async runPeriodicity(periodicity) {
    if (this._running.has(periodicity)) {
      return { skipped: true, reason: 'already running' };
    }
    this._running.add(periodicity);
    const summary = { periodicity, runs: [], errors: [] };
    try {
      const reports = this.catalog.byPeriodicity(periodicity);
      const now = this.clock.now();
      const periodKey = this.scopeProvider.periodKey
        ? this.scopeProvider.periodKey(periodicity, now)
        : defaultPeriodKey(periodicity, now);
      for (const report of reports) {
        let scopes = [undefined];
        try {
          scopes = await this.scopeProvider.scopesFor(report, periodKey);
          if (!Array.isArray(scopes) || scopes.length === 0) scopes = [undefined];
        } catch (err) {
          summary.errors.push(`scopesFor(${report.id}) failed: ${err.message}`);
          continue;
        }
        for (const scopeKey of scopes) {
          try {
            const result = await this.engine.runInstance({
              reportId: report.id,
              periodKey,
              scopeKey,
            });
            summary.runs.push({ reportId: report.id, scopeKey, result });
          } catch (err) {
            summary.errors.push(`runInstance(${report.id}, ${scopeKey}) crashed: ${err.message}`);
          }
        }
      }
    } finally {
      this._running.delete(periodicity);
    }
    return summary;
  }

  _schedulePeriodicity(periodicity, cronExpr) {
    const run = async () => {
      const s = await this.runPeriodicity(periodicity);
      if (this.logger.info) {
        this.logger.info(
          `[reports-scheduler] ${periodicity}: ${s.runs.length} runs, ${s.errors.length} errors`
        );
      }
      if (s.errors.length && this.logger.warn) {
        this.logger.warn(`[reports-scheduler] ${periodicity} errors: ${s.errors.join(' | ')}`);
      }
    };

    if (this.useInterval || !this.cron || typeof this.cron.schedule !== 'function') {
      const t = setInterval(() => {
        run().catch(err => {
          this.logger.error &&
            this.logger.error(`[reports-scheduler] tick crashed: ${err.message}`);
        });
      }, this.intervalMs);
      this._jobs.set(periodicity, t);
      return;
    }

    if (!this.cron.validate(cronExpr)) {
      this.logger.error &&
        this.logger.error(`[reports-scheduler] invalid cron for ${periodicity}: ${cronExpr}`);
      return;
    }
    const handle = this.cron.schedule(cronExpr, () => {
      run().catch(err => {
        this.logger.error && this.logger.error(`[reports-scheduler] tick crashed: ${err.message}`);
      });
    });
    this._jobs.set(periodicity, handle);
  }
}

module.exports = {
  ReportsScheduler,
  defaultPeriodKey,
  DEFAULT_SCOPE_PROVIDER,
};
