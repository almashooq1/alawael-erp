/**
 * kpiAggregator.js — resolves each KPI in kpi.registry to its current
 * value + classification.
 *
 * Phase 10 Commit 7h.
 *
 * kpi.registry defines 34 KPIs, each with a `dataSource.service`,
 * `dataSource.method`, `dataSource.path`. Resolving a value means:
 *   1. Find the service by name (via injected serviceLocator OR via
 *      require under `backend/services/`).
 *   2. Call its method with ctx (branch scope, period).
 *   3. Navigate the result via a dot-path expression.
 *   4. classify(kpi, value) → 'green' | 'amber' | 'red' | 'unknown'.
 *
 * All of the above is injectable through `valueResolver`. The default
 * resolver in production does the three steps; tests inject a
 * deterministic stub (`{[kpiId]: value}` → resolver).
 *
 * Degradation: resolver that throws OR returns undefined → the KPI
 * lands in the result with `value = null, status = 'unknown'`. The
 * aggregate never throws — the exec digest must always produce
 * something for the dashboard.
 */

'use strict';

/**
 * Build the default valueResolver — walks `service.method(ctx)` and
 * navigates a simple dot-path through the result. Advanced JMESPath-
 * style expressions in `dataSource.path` fall back to null (operator
 * supplies a richer resolver in production when those KPIs are wired).
 */
function createDefaultValueResolver({ serviceLocator, logger = console } = {}) {
  return async function defaultResolver(kpi, ctx = {}) {
    if (!kpi || !kpi.dataSource || !serviceLocator) return null;
    const { service, method, path } = kpi.dataSource;
    const svc =
      typeof serviceLocator.get === 'function'
        ? serviceLocator.get(service)
        : serviceLocator[service];
    if (!svc || typeof svc[method] !== 'function') return null;
    let out;
    try {
      out = await svc[method](ctx);
    } catch (err) {
      logger.warn && logger.warn(`kpiAggregator: ${kpi.id}: ${err.message}`);
      return null;
    }
    return navigatePath(out, path);
  };
}

/**
 * Walks a simple dot-path through an object. Returns null for
 * complex expressions (anything with brackets or question marks)
 * so the caller can degrade cleanly.
 */
function navigatePath(value, path) {
  if (value == null) return null;
  if (!path) return typeof value === 'number' ? value : null;
  // Refuse JMESPath-style expressions — no bracket filter support yet.
  if (/[\[\]?=*]/.test(path)) return null;
  const segs = path.split('.').filter(Boolean);
  let node = value;
  for (const seg of segs) {
    if (node == null || typeof node !== 'object') return null;
    node = node[seg];
  }
  return typeof node === 'number' ? node : null;
}

/**
 * @param {Object} catalog        kpi.registry module
 * @param {Object} [opts]
 * @param {Function} [opts.valueResolver]   `(kpi, ctx) → number|null`
 * @param {Object}   [opts.filter]          `{ domain, frequency, owner, compliance }`
 * @param {Object}   [opts.ctx]             passed verbatim to the resolver
 * @param {Function} [opts.classify]        overrides registry.classify for tests
 * @returns {Promise<{ at: string, counts: {green, amber, red, unknown}, items: [...] }>}
 */
async function aggregate(catalog, opts = {}) {
  const { valueResolver, filter = {}, ctx = {}, classify } = opts;
  const registryClassify = classify || (catalog && catalog.classify) || (() => 'unknown');
  const rows = (catalog && catalog.KPIS) || [];
  const picked = rows.filter(k => {
    if (!k) return false;
    if (filter.domain && k.domain !== filter.domain) return false;
    if (filter.frequency && k.frequency !== filter.frequency) return false;
    if (filter.owner && k.owner !== filter.owner) return false;
    if (filter.compliance) {
      const list = k.compliance || [];
      if (!list.some(c => String(c).includes(filter.compliance))) return false;
    }
    if (Array.isArray(filter.ids) && !filter.ids.includes(k.id)) return false;
    return true;
  });

  const items = [];
  const counts = { green: 0, amber: 0, red: 0, unknown: 0 };
  for (const k of picked) {
    let value = null;
    if (typeof valueResolver === 'function') {
      try {
        const v = await valueResolver(k, ctx);
        value = typeof v === 'number' && Number.isFinite(v) ? v : null;
      } catch (_) {
        value = null;
      }
    }
    const status = value == null ? 'unknown' : registryClassify(k, value);
    counts[status] = (counts[status] || 0) + 1;
    items.push({
      id: k.id,
      nameEn: k.nameEn,
      nameAr: k.nameAr,
      domain: k.domain,
      unit: k.unit,
      direction: k.direction,
      target: k.target,
      warningThreshold: k.warningThreshold,
      criticalThreshold: k.criticalThreshold,
      owner: k.owner,
      compliance: k.compliance || [],
      value,
      status,
    });
  }
  return { at: new Date().toISOString(), counts, items };
}

module.exports = {
  aggregate,
  createDefaultValueResolver,
  navigatePath,
};
