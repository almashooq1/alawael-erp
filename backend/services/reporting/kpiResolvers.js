/**
 * kpiResolvers.js — reporting-backed value resolver for the KPI
 * aggregator.
 *
 * Phase 10 Commit 13.
 *
 * The KPI aggregator calls `valueResolver(kpi, ctx) → number | null`.
 * This module's `createReportingValueResolver()` returns a resolver
 * that dispatches on `kpi.dataSource.service` to the matching Phase-10
 * report builder (financeReportBuilder / hrReportBuilder / etc.),
 * calls the declared method with a builder-shaped input, then
 * navigates `kpi.dataSource.path` through the result to extract the
 * numeric value.
 *
 * This closes the loop opened by P10-C12: 5 new KPIs declared entries
 * in kpi.registry pointing at real builders, but the default value
 * resolver didn't know how to call a builder. Now it does.
 *
 * Design:
 *   - Pure dispatch: no hard-coded KPI ids; any KPI whose
 *     `dataSource.service` matches a known module resolves through
 *     its declared method + path.
 *   - Builder input is constructed from ctx (periodKey + scopeKey).
 *     A periodKey fallback is derived from `kpi.frequency` so the
 *     resolver still works when called without an explicit period
 *     (executive dashboards usually pick the current period).
 *   - Fully backward-compatible with the existing aggregator: returns
 *     `null` for any KPI it can't resolve — the aggregator then
 *     degrades to `status='unknown'`, same behaviour as before.
 *   - `navigatePath` is reused from kpiAggregator so we have a single
 *     dot-path walker.
 */

'use strict';

const { navigatePath } = require('./builders/kpiAggregator');

// Default dispatch table — maps kpi.dataSource.service → builder
// module. Operators can extend via `deps.modules` at creation time.
const DEFAULT_MODULES = {
  financeReportBuilder: require('./builders/financeReportBuilder'),
  hrReportBuilder: require('./builders/hrReportBuilder'),
  fleetReportBuilder: require('./builders/fleetReportBuilder'),
  qualityReportBuilder: require('./builders/qualityReportBuilder'),
  attendanceReportBuilder: require('./builders/attendanceReportBuilder'),
  sessionReportBuilder: require('./builders/sessionReportBuilder'),
  therapistReportBuilder: require('./builders/therapistReportBuilder'),
  branchReportBuilder: require('./builders/branchReportBuilder'),
  crmReportBuilder: require('./builders/crmReportBuilder'),
};

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/**
 * Derive a sensible periodKey for a KPI from its frequency, given a
 * reference clock. Used only when the caller didn't supply one.
 */
function defaultPeriodKeyForFrequency(frequency, now = new Date()) {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  const d = now.getUTCDate();
  switch (frequency) {
    case 'hourly':
    case 'daily':
      return `${y}-${pad2(m)}-${pad2(d)}`;
    case 'weekly':
      return `${y}-W${pad2(isoWeek(now))}`;
    case 'monthly':
      return `${y}-${pad2(m)}`;
    default:
      return `${y}-${pad2(m)}-${pad2(d)}`;
  }
}

/**
 * @param {Object} [deps]
 * @param {Object} [deps.modules]      — override / extend the default module map
 * @param {Object} [deps.clock]        — `{ now() → Date }` for deterministic tests
 * @param {Object} [deps.logger]
 * @returns {(kpi, ctx) => Promise<number|null>}
 */
function createReportingValueResolver(deps = {}) {
  const modules = { ...DEFAULT_MODULES, ...(deps.modules || {}) };
  const clock = deps.clock || { now: () => new Date() };
  const logger = deps.logger || console;

  return async function reportingValueResolver(kpi, ctx = {}) {
    if (!kpi || !kpi.dataSource) return null;
    const { service, method, path } = kpi.dataSource;
    const mod = modules[service];
    if (!mod) return null;
    const fn = mod[method];
    if (typeof fn !== 'function') return null;

    const periodKey = ctx.periodKey || defaultPeriodKeyForFrequency(kpi.frequency, clock.now());
    const scopeKey = ctx.scopeKey;

    // Build the input every Phase-10 builder expects.
    const input = {
      report: { id: kpi.id },
      periodKey,
      scopeKey: scopeKey || undefined,
      ctx: {
        models: ctx.models,
        // Reuse optional ctx hooks (loadBranch / loadBeneficiary /
        // loadTherapists etc.) so builders hydrate names the same
        // way they do when driven by the scheduler.
        loadBranch: ctx.loadBranch,
        loadBeneficiary: ctx.loadBeneficiary,
        loadTherapists: ctx.loadTherapists,
        clock: ctx.clock,
      },
    };

    let doc;
    try {
      doc = await fn(input);
    } catch (err) {
      logger.warn &&
        logger.warn(`kpiResolvers: ${kpi.id} via ${service}.${method}: ${err.message}`);
      return null;
    }
    if (!doc) return null;

    const value = navigatePath(doc, path);
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  };
}

module.exports = {
  createReportingValueResolver,
  defaultPeriodKeyForFrequency,
  DEFAULT_MODULES,
};
