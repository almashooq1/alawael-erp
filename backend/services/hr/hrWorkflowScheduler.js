'use strict';

/**
 * hrWorkflowScheduler.js — Phase 30 follow-up.
 *
 * Wraps `hrWorkflowEngine.run()` in a cron schedule. Same shape as
 * `redFlagScheduler.js` so the rest of the platform's scheduler
 * conventions (DI, runOnce, start, stop, getLastRunSummary) carry over
 * unchanged.
 *
 * Why this lives in its own file rather than inside the engine: the
 * engine is a pure rule-evaluator and is exercised heavily in unit
 * tests with mocked models. Mixing cron lifecycle into the engine
 * complicates the test harness for no real win — schedulers are
 * inherently a runtime concern.
 *
 * Default cadence: every 2 hours. Override via `start({ expression })`
 * or env var `HR_WORKFLOW_CRON`. Set `HR_WORKFLOW_DISABLED=true` to
 * skip starting entirely (useful in dev / test).
 *
 * Public API:
 *   const scheduler = createHrWorkflowScheduler({ engine, cron, logger });
 *   await scheduler.runOnce();    // execute one sweep, return summary
 *   scheduler.start();            // begin cron sweeps
 *   scheduler.stop();             // cancel the cron task
 *   scheduler.getLastRunSummary(); // recent execution report
 */

const DEFAULT_EXPRESSION = process.env.HR_WORKFLOW_CRON || '0 */2 * * *';

function createHrWorkflowScheduler({ engine, cron = null, logger = console } = {}) {
  if (!engine || typeof engine.run !== 'function') {
    throw new Error('hrWorkflowScheduler: engine with run() is required');
  }

  let currentTask = null;
  let lastRunSummary = null;
  let running = false;

  async function runOnce() {
    if (running) {
      logger.warn(
        '[hrWorkflowScheduler] runOnce() called while previous run still active — skipped'
      );
      return null;
    }
    running = true;
    const startedAtMs = Date.now();
    try {
      const result = await engine.run();
      const finishedAtMs = Date.now();
      const totalFindings = (result.summary || []).reduce(
        (acc, s) => acc + (s.findings?.length || 0),
        0
      );
      const totalFired = (result.summary || []).reduce((acc, s) => acc + (s.fired || 0), 0);
      lastRunSummary = {
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date(finishedAtMs).toISOString(),
        durationMs: finishedAtMs - startedAtMs,
        rulesEvaluated: (result.summary || []).length,
        totalFindings,
        totalFired,
        // Keep per-rule shape compact — full findings list lives in audit log
        perRule: (result.summary || []).map(s => ({
          ruleId: s.ruleId,
          skipped: s.skipped,
          error: s.error,
          findings: s.findings?.length || 0,
          fired: s.fired || 0,
        })),
      };
      logger.info(
        `[hrWorkflowScheduler] sweep complete — ${(result.summary || []).length} rules, ${totalFindings} findings, ${totalFired} fired`
      );
      return lastRunSummary;
    } catch (err) {
      logger.error('[hrWorkflowScheduler] sweep threw', err.message || err);
      lastRunSummary = {
        startedAt: new Date(startedAtMs).toISOString(),
        finishedAt: new Date().toISOString(),
        error: err.message || String(err),
      };
      throw err;
    } finally {
      running = false;
    }
  }

  function start({ expression = DEFAULT_EXPRESSION } = {}) {
    if (cron == null || typeof cron.schedule !== 'function') {
      throw new Error(
        'hrWorkflowScheduler: start() requires a cron dep with schedule(); inject node-cron or equivalent'
      );
    }
    if (currentTask != null) {
      logger.warn('[hrWorkflowScheduler] start() called while already running — ignored');
      return currentTask;
    }
    currentTask = cron.schedule(expression, () => {
      runOnce().catch(err => logger.error('[hrWorkflowScheduler] sweep error', err.message));
    });
    logger.info(`[hrWorkflowScheduler] scheduled with expression "${expression}"`);
    return currentTask;
  }

  function stop() {
    if (currentTask != null) {
      currentTask.stop();
      currentTask = null;
      logger.info('[hrWorkflowScheduler] stopped');
    }
  }

  function getLastRunSummary() {
    return lastRunSummary;
  }

  return Object.freeze({ runOnce, start, stop, getLastRunSummary });
}

module.exports = { createHrWorkflowScheduler };
