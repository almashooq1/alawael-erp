/**
 * dashboardAggregator.service.js — assembles a ready-to-render
 * payload for a given dashboard id.
 *
 * Phase 18 Commit 1.
 *
 * Responsibility: take `(dashboardId, role, filters)` and return a
 * self-contained JSON object that the frontend can drop into a
 * dashboard shell. Data resolution for each KPI is delegated to
 * an injected `kpiResolver` function — this keeps the aggregator
 * pure and unit-testable without mocking 40+ underlying services.
 *
 * The aggregator:
 *   1. Verifies the dashboard exists.
 *   2. Enforces audience-based visibility (role ∈ audience).
 *   3. Walks heroKpiIds → calls kpiResolver(kpi, filters) for each.
 *   4. Classifies each value via kpi.registry.classify(kpi, value).
 *   5. Builds a snapshot shape for the narrative service.
 *   6. Invokes dashboardNarrative.generate(...) for the summary.
 *   7. Returns dashboard metadata + hero values + widget references
 *      + narrative + a computed asOf timestamp for freshness UX.
 *
 * Contract with the kpiResolver:
 *   kpiResolver(kpi, filters) → Promise<{
 *     value: number | null,
 *     delta?: number | null,   // period-over-period delta as ratio
 *     sparkline?: Array<{ t: ISOString, v: number }>,
 *     asOf?: ISOString,
 *     source?: string,
 *   }>
 *
 * The resolver is allowed to throw or return null — the aggregator
 * fails soft per-KPI (classification becomes 'unknown') so one
 * broken data source never blanks the whole dashboard.
 */

'use strict';

const { byId: dashboardById, DASHBOARDS } = require('../config/dashboard.registry');
const { byId: kpiById, classify } = require('../config/kpi.registry');
const { byCode: widgetByCode } = require('../config/widget.catalog');
const narrative = require('./dashboardNarrative.service');
const { buildNarrativeFacade } = require('./dashboardNarrativeFacade.service');

// Default facade wraps the rule-based generator. Callers that want
// the LLM path inject a prebuilt facade via `build({ ...,
// narrativeService })`; this keeps the default aggregator
// synchronous-flavoured (rules never hit the network) while
// allowing Phase 18 C4 to plug in the LLM path at app.js boot.
const DEFAULT_NARRATIVE = buildNarrativeFacade({ llmGenerator: null });

/**
 * Build a safe, synchronous null-resolver — used when no resolver
 * is injected (e.g. the frontend asked for the blueprint only).
 */
function nullResolver() {
  return Promise.resolve({ value: null, delta: null, asOf: null, source: null });
}

/**
 * Normalise a resolver's return shape so the rest of the pipeline
 * can trust the fields exist.
 */
function normaliseResolved(resolved) {
  const out = {
    value: resolved && typeof resolved.value === 'number' ? resolved.value : null,
    delta: resolved && typeof resolved.delta === 'number' ? resolved.delta : null,
    sparkline: resolved && Array.isArray(resolved.sparkline) ? resolved.sparkline : [],
    asOf: resolved && typeof resolved.asOf === 'string' ? resolved.asOf : null,
    source: resolved && typeof resolved.source === 'string' ? resolved.source : null,
  };
  return out;
}

async function resolveOneKpi(kpiId, filters, resolver) {
  const kpi = kpiById(kpiId);
  if (!kpi) {
    return {
      id: kpiId,
      missing: true,
      value: null,
      classification: 'unknown',
      delta: null,
      sparkline: [],
      asOf: null,
      source: null,
    };
  }
  let resolved;
  try {
    resolved = await resolver(kpi, filters);
  } catch (err) {
    resolved = null;
  }
  const r = normaliseResolved(resolved);
  return {
    id: kpi.id,
    nameEn: kpi.nameEn,
    nameAr: kpi.nameAr,
    unit: kpi.unit,
    direction: kpi.direction,
    target: kpi.target,
    value: r.value,
    delta: r.delta,
    sparkline: r.sparkline,
    classification: classify(kpi, r.value),
    asOf: r.asOf,
    source: r.source,
    anomaly: resolved && resolved.anomaly ? resolved.anomaly : null,
  };
}

/**
 * Core entry point. `role` is an RBAC role code. If the dashboard
 * is not visible to that role, a typed error is thrown so the
 * route layer can return 403.
 */
async function build({
  dashboardId,
  role,
  filters = {},
  kpiResolver,
  narrativeService,
  clock = () => new Date(),
} = {}) {
  const dashboard = dashboardById(dashboardId);
  if (!dashboard) {
    const err = new Error(`Unknown dashboard: ${dashboardId}`);
    err.code = 'DASHBOARD_NOT_FOUND';
    throw err;
  }

  // Audience check. `super_admin` bypasses per project convention —
  // every other role must be in the explicit audience list.
  if (role && role !== 'super_admin' && !dashboard.audience.includes(role)) {
    const err = new Error(`Role "${role}" is not authorised for dashboard "${dashboardId}"`);
    err.code = 'DASHBOARD_FORBIDDEN';
    throw err;
  }

  const resolver = typeof kpiResolver === 'function' ? kpiResolver : nullResolver;

  // Resolve all hero KPIs concurrently — each is independent and we
  // want the dashboard build to finish in roughly max(resolverMs)
  // rather than sum(resolverMs).
  const heroResults = await Promise.all(
    dashboard.heroKpiIds.map(id => resolveOneKpi(id, filters, resolver))
  );

  const widgets = dashboard.widgetIds
    .map(code => widgetByCode(code))
    .filter(Boolean)
    .map(w => ({
      code: w.code,
      nameEn: w.nameEn,
      nameAr: w.nameAr,
      dataShape: w.dataShape,
      defaultSpan: w.defaultSpan,
      supports: w.supports,
    }));

  const narrativeInput = {
    dashboardId: dashboard.id,
    kpiSnapshots: heroResults.map(h => ({
      id: h.id,
      nameEn: h.nameEn,
      nameAr: h.nameAr,
      unit: h.unit,
      target: h.target,
      value: h.value,
      delta: h.delta,
      classification: h.classification,
      anomaly: h.anomaly || null,
    })),
    context: { now: clock() },
  };

  // Narrative generation can be sync (the rule-based default) or
  // async (the LLM-backed facade). Either way, `await` is safe.
  const narrSvc = narrativeService || DEFAULT_NARRATIVE;
  const narr =
    typeof narrSvc.generate === 'function'
      ? await narrSvc.generate(narrativeInput)
      : narrative.generate(narrativeInput);

  return {
    dashboard: {
      id: dashboard.id,
      level: dashboard.level,
      titleEn: dashboard.titleEn,
      titleAr: dashboard.titleAr,
      audience: dashboard.audience,
      filters: dashboard.filters,
      drillPaths: dashboard.drillPaths,
      alertSeverityFloor: dashboard.alertSeverityFloor,
      refreshIntervalSeconds: dashboard.refreshIntervalSeconds,
    },
    heroKpis: heroResults,
    widgets,
    narrative: narr,
    filters,
    asOf: clock().toISOString(),
  };
}

/**
 * Lightweight catalog endpoint — lists every dashboard visible to
 * a role plus its audience metadata. No KPI data is fetched.
 * Meant for the frontend navigation rail and the permission-matrix
 * audit view.
 */
function listForRole(role) {
  return DASHBOARDS.filter(d => (role === 'super_admin' ? true : d.audience.includes(role))).map(
    d => ({
      id: d.id,
      level: d.level,
      titleEn: d.titleEn,
      titleAr: d.titleAr,
      audience: d.audience,
      refreshIntervalSeconds: d.refreshIntervalSeconds,
    })
  );
}

module.exports = {
  build,
  listForRole,
  _internals: { resolveOneKpi, normaliseResolved },
};
