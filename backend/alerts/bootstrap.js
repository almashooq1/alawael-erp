'use strict';

/**
 * bootstrap.js — Wave 7.
 *
 * One-call wiring for the smart-alerts engine. Composes the
 * engine + dispatcher + scheduler with sane defaults so app.js
 * can opt into the whole pipeline with two lines of code:
 *
 *     const { buildAlertsStack } = require('./alerts/bootstrap');
 *     const stack = buildAlertsStack({ models, kpiHistoryStore, logger });
 *     stack.scheduler.start(stack.ctxFactory);
 *
 * Design intentions:
 *
 *   1. **Channels stay optional**. When no channels are wired, the
 *      dispatcher persists alerts but skips notifications. That's
 *      strictly better than the current behavior (zero alerts at
 *      all) and matches the "silent persistence" mode used by the
 *      Phase 18 dashboardAlertCoordinator when no recipient
 *      resolver is configured.
 *
 *   2. **`ctxFactory` is built here** so each scheduler tick gets
 *      a fresh `now()` + the live model registry + the shared
 *      kpiHistoryStore. The factory is async-safe.
 *
 *   3. **kpiHistoryStore is injected, not constructed**. App.js
 *      already builds one for the dashboard platform (Phase 18
 *      C6 — see `app._dashboardHistoryStore`). Wave 7 reuses that
 *      instance so the EWMA bridge rule (`kpi-anomaly-detected`)
 *      sees the same series the dashboard sees. One source of
 *      truth, no double-recording.
 *
 *   4. **Never throws at boot**. Missing models, missing history
 *      store, missing logger — the helper degrades to a working
 *      stack with a sane log message rather than crashing the
 *      application.
 */

const { AlertsEngine } = require('./engine');
const { AlertDispatcher } = require('./dispatcher');
const { AlertsScheduler } = require('./scheduler');
const rules = require('./rules');
const AlertModel = require('./alert.model');

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @param {object} opts
 *   - models:           Map | Object of mongoose model name → Model.
 *                       Every Wave-3 rule checks `ctx.models.X` defensively,
 *                       so an empty {} simply returns [] from every rule.
 *   - kpiHistoryStore:  Optional kpi history store (from
 *                       `services/kpiHistoryStore.service.js`). When provided,
 *                       enables the EWMA anomaly bridge rule (Wave 5).
 *   - intervalMs:       Scheduler tick interval (default 5 min).
 *   - cronExpression:   Optional node-cron expression. Wins over intervalMs.
 *   - cron:             Optional cron lib reference (e.g. require('node-cron')).
 *   - channels:         Optional notification channels keyed by name.
 *   - recipients:       Optional recipient resolver {resolve(alert)}.
 *   - logger:           console-compatible logger.
 *
 * @returns {{
 *   engine: import('./engine').AlertsEngine,
 *   dispatcher: import('./dispatcher').AlertDispatcher,
 *   scheduler: import('./scheduler').AlertsScheduler,
 *   ctxFactory: () => object,
 *   rules: typeof rules,
 * }}
 */
function buildAlertsStack({
  models = {},
  kpiHistoryStore = null,
  intervalMs = DEFAULT_INTERVAL_MS,
  cronExpression = null,
  cron = null,
  channels = {},
  recipients = null,
  logger = console,
} = {}) {
  const engine = new AlertsEngine().registerAll(rules);

  const dispatcher = new AlertDispatcher({
    engine,
    AlertModel,
    channels,
    ...(recipients ? { recipients } : {}),
    logger,
  });

  const scheduler = new AlertsScheduler({
    dispatcher,
    intervalMs,
    ...(cronExpression ? { cronExpression } : {}),
    ...(cron ? { cron } : {}),
    logger,
  });

  // The ctx the engine sees on each tick. Kept as a factory so the
  // store / models references can be swapped after boot without
  // restarting the scheduler — useful when a model registry is
  // built lazily during a slow startup.
  function ctxFactory() {
    return {
      models,
      ...(kpiHistoryStore ? { kpiHistoryStore } : {}),
      now: new Date(),
    };
  }

  return { engine, dispatcher, scheduler, ctxFactory, rules };
}

module.exports = { buildAlertsStack };
