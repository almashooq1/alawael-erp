/**
 * redFlagScheduler.js — Beneficiary-360 Foundation Commit 7.
 *
 * Cron-driven sweep that runs `engine.evaluateBeneficiary` + applies
 * transitions to the store for every active beneficiary at a fixed
 * cadence. This is what moves red flags from "evaluated on UI visit"
 * to "continuously monitored" — the product intent of the 360
 * profile.
 *
 * Design decisions:
 *
 *   1. The scheduler knows nothing about WHICH beneficiaries to
 *      evaluate — callers inject `getBeneficiaryIds` async function.
 *      For production that is typically a DB query ("active within
 *      branch X") or a paginator over all active beneficiaries. For
 *      tests, a canned array.
 *
 *   2. `runOnce` is the pure core — no cron, no timers. Tests and
 *      the admin "re-scan all" button both call it directly. `start`
 *      / `stop` are the scheduling wrapper and are optional.
 *
 *   3. Per-beneficiary errors don't sink the sweep. The engine
 *      already isolates service-level errors per flag; this layer
 *      additionally isolates beneficiary-level errors (bad id, DB
 *      transient) so one bad record can't skip the rest.
 *
 *   4. Concurrency: evaluations run sequentially per beneficiary to
 *      keep database load predictable. A production deployment that
 *      needs parallelism can batch with `Promise.all` — but at that
 *      point backpressure matters and it's worth introducing a real
 *      queue rather than racing writes to Mongo. Not today.
 *
 *   5. `node-cron` is the default scheduler; it's already a
 *      dependency. Callers can inject an alternate scheduler (e.g.,
 *      BullMQ, k8s CronJob) through the `cron` dep.
 */

'use strict';

const DEFAULT_LOGGER = {
  info: () => {},
  warn: () => {},
  error: () => {},
};

function createScheduledEvaluator(deps = {}) {
  const engine = deps.engine;
  const store = deps.store;
  const getBeneficiaryIds = deps.getBeneficiaryIds;
  const logger = deps.logger || DEFAULT_LOGGER;
  const cron = deps.cron; // optional — required only for start()/stop()

  if (engine == null || typeof engine.evaluateBeneficiary !== 'function') {
    throw new Error('redFlagScheduler: engine with evaluateBeneficiary() is required');
  }
  if (store == null || typeof store.applyVerdicts !== 'function') {
    throw new Error('redFlagScheduler: store with applyVerdicts() is required');
  }
  if (typeof getBeneficiaryIds !== 'function') {
    throw new Error('redFlagScheduler: getBeneficiaryIds() async function is required');
  }

  let currentTask = null;
  let lastRunSummary = null;

  /**
   * Run one sweep over all beneficiaries. Returns a summary object
   * suitable for logging and the admin-observability dashboard.
   * Never throws — per-beneficiary errors are collected in
   * `errored` and the sweep continues.
   */
  async function runOnce(options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const startedAtMs = Date.now();

    let ids;
    try {
      ids = await getBeneficiaryIds();
    } catch (err) {
      logger.error('[redFlagScheduler] getBeneficiaryIds failed', err);
      return {
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date().toISOString(),
        totalBeneficiaries: 0,
        succeeded: 0,
        errored: 1,
        totals: {
          newlyRaised: 0,
          newlyResolved: 0,
          stillRaised: 0,
          suppressedByCooldown: 0,
          errored: 0,
        },
        perBeneficiary: [],
        fatalError: err.message || String(err),
      };
    }

    if (!Array.isArray(ids)) {
      throw new Error('redFlagScheduler: getBeneficiaryIds must return an array');
    }

    const perBeneficiary = [];
    const totals = {
      newlyRaised: 0,
      newlyResolved: 0,
      stillRaised: 0,
      suppressedByCooldown: 0,
      errored: 0,
    };
    let succeeded = 0;
    let errored = 0;

    for (const beneficiaryId of ids) {
      try {
        const evalResult = await engine.evaluateBeneficiary(beneficiaryId, { now });
        const transitions = await store.applyVerdicts(beneficiaryId, evalResult.verdicts, { now });
        const summary = {
          beneficiaryId,
          flagsEvaluated: evalResult.flagsEvaluated,
          newlyRaised: transitions.newlyRaised.length,
          newlyResolved: transitions.newlyResolved.length,
          stillRaised: transitions.stillRaised.length,
          suppressedByCooldown: transitions.suppressedByCooldown.length,
          errored: transitions.errored.length,
        };
        perBeneficiary.push(summary);
        totals.newlyRaised += summary.newlyRaised;
        totals.newlyResolved += summary.newlyResolved;
        totals.stillRaised += summary.stillRaised;
        totals.suppressedByCooldown += summary.suppressedByCooldown;
        totals.errored += summary.errored;
        succeeded++;
      } catch (err) {
        errored++;
        perBeneficiary.push({
          beneficiaryId,
          error: err.message || String(err),
        });
        logger.warn(
          `[redFlagScheduler] evaluation failed for beneficiary ${beneficiaryId}: ${err.message}`
        );
      }
    }

    const finishedAtMs = Date.now();
    lastRunSummary = {
      startedAt: new Date(startedAtMs).toISOString(),
      finishedAt: new Date(finishedAtMs).toISOString(),
      durationMs: finishedAtMs - startedAtMs,
      totalBeneficiaries: ids.length,
      succeeded,
      errored,
      totals,
      perBeneficiary,
    };

    logger.info(
      `[redFlagScheduler] sweep complete — ${ids.length} beneficiaries, ${totals.newlyRaised} newly raised, ${totals.newlyResolved} resolved, ${errored} failed`
    );
    return lastRunSummary;
  }

  /**
   * Start a cron-driven sweep. Default cadence: every 6 hours.
   * Returns the active task so callers can reference it (logs,
   * graceful shutdown). Throws if no cron dependency was injected.
   */
  function start({ expression = '0 */6 * * *' } = {}) {
    if (cron == null || typeof cron.schedule !== 'function') {
      throw new Error(
        'redFlagScheduler: start() requires a cron dep with schedule(); inject node-cron or equivalent'
      );
    }
    if (currentTask != null) {
      logger.warn('[redFlagScheduler] start() called while already running — ignored');
      return currentTask;
    }
    currentTask = cron.schedule(expression, () => {
      runOnce().catch(err => logger.error('[redFlagScheduler] sweep threw', err));
    });
    logger.info(`[redFlagScheduler] scheduled with expression "${expression}"`);
    return currentTask;
  }

  function stop() {
    if (currentTask != null) {
      currentTask.stop();
      currentTask = null;
      logger.info('[redFlagScheduler] stopped');
    }
  }

  function getLastRunSummary() {
    return lastRunSummary;
  }

  return Object.freeze({ runOnce, start, stop, getLastRunSummary });
}

module.exports = { createScheduledEvaluator };
