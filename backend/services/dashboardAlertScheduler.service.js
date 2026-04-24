/**
 * dashboardAlertScheduler.service.js — periodic alert evaluator
 * for the dashboard platform.
 *
 * Phase 18 Commit 8.2.
 *
 * Problem it solves: the coordinator (C8) only evaluates alerts
 * when a caller invokes `evaluateSnapshot()`. Dashboards do that
 * lazily when a user loads `/api/v1/dashboards/:id`. If nobody is
 * watching, nobody gets paged — even when a KPI crossed a
 * threshold hours ago.
 *
 * This scheduler runs `evaluateSnapshot` on a cadence for every
 * dashboard in the registry (or a configured subset), using the
 * injected KPI resolver to populate the snapshots. It's
 * deliberately simple:
 *
 *   - Single tick loop with `setInterval`.
 *   - Best-effort: one failing dashboard never breaks the rest of
 *     the tick.
 *   - Observable: keeps running counters + a last-tick report
 *     exposed via `status()` for the admin HTTP surface.
 *   - Respects test env (no auto-start; callers invoke `runOnce()`
 *     explicitly).
 *
 * The scheduler is framework-agnostic. It takes the coordinator
 * + resolver + dashboard registry as injected deps.
 */

'use strict';

const { DASHBOARDS } = require('../config/dashboard.registry');
const { byId: kpiById } = require('../config/kpi.registry');

const DEFAULT_INTERVAL_MS = 60 * 1000;

function buildAlertScheduler({
  coordinator,
  kpiResolver,
  intervalMs = DEFAULT_INTERVAL_MS,
  dashboards = DASHBOARDS,
  logger = console,
  clock = { now: () => Date.now() },
} = {}) {
  if (!coordinator || typeof coordinator.evaluateSnapshot !== 'function') {
    throw new Error('alertScheduler: coordinator.evaluateSnapshot is required');
  }
  if (typeof kpiResolver !== 'function') {
    throw new Error('alertScheduler: kpiResolver is required');
  }

  const state = {
    running: false,
    intervalHandle: null,
    startedAt: null,
    ticks: 0,
    lastTickAt: null,
    lastTickDurationMs: null,
    lastTickEvaluated: 0,
    lastTickFired: 0,
    lastTickErrors: [],
    totalEvaluated: 0,
    totalFired: 0,
  };

  async function resolveSnapshots(dashboard) {
    // Resolve every heroKpi on this dashboard in parallel; map
    // failures to `{ classification: 'unknown' }` so the coordinator
    // still sees the KPI (and can emit a `noop` decision).
    const ids = (dashboard.heroKpiIds || []).filter(Boolean);
    const results = await Promise.all(
      ids.map(async kpiId => {
        const kpi = kpiById(kpiId);
        if (!kpi) return { id: kpiId, classification: 'unknown', value: null, delta: null };
        try {
          const resolved = await kpiResolver(kpi, {});
          const value = resolved && typeof resolved.value === 'number' ? resolved.value : null;
          let classification = 'unknown';
          if (
            typeof value === 'number' &&
            kpi.warningThreshold != null &&
            kpi.criticalThreshold != null
          ) {
            if (kpi.direction === 'lower_is_better') {
              if (value >= kpi.criticalThreshold) classification = 'red';
              else if (value >= kpi.warningThreshold) classification = 'amber';
              else classification = 'green';
            } else {
              if (value <= kpi.criticalThreshold) classification = 'red';
              else if (value <= kpi.warningThreshold) classification = 'amber';
              else classification = 'green';
            }
          }
          return {
            id: kpi.id,
            value,
            delta: resolved && typeof resolved.delta === 'number' ? resolved.delta : null,
            classification,
          };
        } catch (err) {
          if (logger && logger.warn) {
            logger.warn(`[alertScheduler] resolve ${kpiId}: ${err.message}`);
          }
          return { id: kpiId, classification: 'unknown', value: null, delta: null };
        }
      })
    );
    return results;
  }

  async function runOnce() {
    const started = clock.now();
    let evaluated = 0;
    let fired = 0;
    const errors = [];

    for (const dashboard of dashboards) {
      try {
        const heroKpis = await resolveSnapshots(dashboard);
        if (heroKpis.length === 0) continue;
        const decisions = await coordinator.evaluateSnapshot({
          heroKpis,
          scope: { dashboardId: dashboard.id },
        });
        evaluated += decisions.length;
        for (const d of decisions) {
          if (d.action === 'fire' || d.action === 'escalate') fired += 1;
        }
      } catch (err) {
        errors.push({ dashboardId: dashboard.id, error: err.message });
        if (logger && logger.warn) {
          logger.warn(`[alertScheduler] dashboard ${dashboard.id}: ${err.message}`);
        }
      }
    }

    const durationMs = clock.now() - started;
    state.ticks += 1;
    state.lastTickAt = started;
    state.lastTickDurationMs = durationMs;
    state.lastTickEvaluated = evaluated;
    state.lastTickFired = fired;
    state.lastTickErrors = errors;
    state.totalEvaluated += evaluated;
    state.totalFired += fired;

    return { evaluated, fired, durationMs, errors };
  }

  function start() {
    if (state.running) return false;
    state.running = true;
    state.startedAt = clock.now();
    // Fire once immediately so ops see first results without
    // waiting a full interval.
    runOnce().catch(err => {
      if (logger && logger.warn)
        logger.warn(`[alertScheduler] initial tick failed: ${err.message}`);
    });
    state.intervalHandle = setInterval(() => {
      runOnce().catch(err => {
        if (logger && logger.warn) logger.warn(`[alertScheduler] tick failed: ${err.message}`);
      });
    }, intervalMs);
    if (typeof state.intervalHandle.unref === 'function') {
      state.intervalHandle.unref();
    }
    return true;
  }

  function stop() {
    if (!state.running) return false;
    state.running = false;
    if (state.intervalHandle) {
      clearInterval(state.intervalHandle);
      state.intervalHandle = null;
    }
    return true;
  }

  function status() {
    return {
      running: state.running,
      startedAt: state.startedAt,
      intervalMs,
      ticks: state.ticks,
      lastTickAt: state.lastTickAt,
      lastTickDurationMs: state.lastTickDurationMs,
      lastTickEvaluated: state.lastTickEvaluated,
      lastTickFired: state.lastTickFired,
      lastTickErrors: state.lastTickErrors.slice(),
      totalEvaluated: state.totalEvaluated,
      totalFired: state.totalFired,
      dashboardsWatched: dashboards.length,
    };
  }

  return { start, stop, runOnce, status };
}

module.exports = { buildAlertScheduler, DEFAULT_INTERVAL_MS };
