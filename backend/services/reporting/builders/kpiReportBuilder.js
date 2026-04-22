/**
 * kpiReportBuilder.js — real builders for the 3 KPI reports:
 *   - exec.kpi.digest.daily     → buildExecDigest
 *   - exec.kpi.board.quarterly  → buildBoardPack
 *   - branch.kpi.monthly        → buildBranchKpiPack
 *
 * Phase 10 Commit 7h.
 *
 * All three wrap `kpiAggregator.aggregate()` with different filters.
 * The aggregator uses `ctx.valueResolver` (injected by the caller or
 * built via `createDefaultValueResolver` when a serviceLocator is
 * available) to turn KPI definitions into {value, status} pairs.
 *
 * The catalog for kpi.registry is discovered via `ctx.models.kpiRegistry`
 * (preferred) or a require fallback — we keep the contract uniform
 * with every other builder in the family.
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');
const { aggregate } = require('./kpiAggregator');

function loadRegistry(ctx) {
  if (ctx.models && ctx.models.kpiRegistry) return ctx.models.kpiRegistry;
  try {
    return require('../../../config/kpi.registry');
  } catch (_) {
    return null;
  }
}

function baseResult(report, fallbackId, periodKey, scopeKey, range) {
  return {
    reportType: (report && report.id) || fallbackId,
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    summary: { items: [], headlineMetric: null },
  };
}

function degradeOnBadPeriod(result, periodKey) {
  result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
  return result;
}

async function loadBranch(ctx, scope) {
  if (!scope || scope.type !== 'branch') return null;
  if (typeof ctx.loadBranch === 'function') {
    try {
      return (await ctx.loadBranch(scope.id)) || { id: scope.id };
    } catch (_) {
      return { id: scope.id };
    }
  }
  const Branch = ctx.models && (ctx.models.Branch?.model || ctx.models.Branch);
  if (!Branch || typeof Branch.findById !== 'function') return { id: scope.id };
  try {
    const b = await Branch.findById(scope.id);
    return b ? { id: String(b._id || b.id || scope.id), name: b.name || null } : { id: scope.id };
  } catch (_) {
    return { id: scope.id };
  }
}

function summariseStatuses({ counts, items }, label = 'status') {
  const topRed = items.filter(i => i.status === 'red').slice(0, 5);
  const lines = [
    `Green ${counts.green}; Amber ${counts.amber}; Red ${counts.red}; Unknown ${counts.unknown}`,
  ];
  if (topRed.length) {
    lines.push(`Red KPIs: ${topRed.map(i => i.id).join(', ')}`);
  }
  return {
    items: lines,
    headlineMetric: { label, value: `${counts.red} red / ${items.length} total` },
  };
}

// ─── 1. buildExecDigest (daily) ──────────────────────────────────

async function buildExecDigest({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'exec.kpi.digest.daily', periodKey, scopeKey, range);
  Object.assign(result, {
    counts: { green: 0, amber: 0, red: 0, unknown: 0 },
    kpis: [],
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const registry = loadRegistry(ctx);
  if (!registry) {
    result.summary.items.push('kpi.registry not available — digest empty.');
    return result;
  }
  // Daily digest: include hourly + daily KPIs. Weekly/monthly KPIs
  // are too slow-moving to flag on a daily cadence.
  const byFreqDaily = await aggregate(registry, {
    valueResolver: ctx.valueResolver,
    ctx: { ...ctx, scope, periodKey },
    filter: { frequency: 'daily' },
  });
  const byFreqHourly = await aggregate(registry, {
    valueResolver: ctx.valueResolver,
    ctx: { ...ctx, scope, periodKey },
    filter: { frequency: 'hourly' },
  });
  const items = [...byFreqHourly.items, ...byFreqDaily.items];
  const counts = { green: 0, amber: 0, red: 0, unknown: 0 };
  for (const i of items) counts[i.status] = (counts[i.status] || 0) + 1;

  result.counts = counts;
  result.kpis = items;
  const s = summariseStatuses({ counts, items }, 'red KPIs');
  result.summary = s;
  return result;
}

// ─── 2. buildBoardPack (quarterly) ───────────────────────────────

async function buildBoardPack({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'exec.kpi.board.quarterly', periodKey, scopeKey, range);
  Object.assign(result, {
    counts: { green: 0, amber: 0, red: 0, unknown: 0 },
    byDomain: {},
    byCompliance: {},
    kpis: [],
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const registry = loadRegistry(ctx);
  if (!registry) {
    result.summary.items.push('kpi.registry not available — pack empty.');
    return result;
  }
  const agg = await aggregate(registry, {
    valueResolver: ctx.valueResolver,
    ctx: { ...ctx, scope, periodKey },
  });
  const byDomain = {};
  const byCompliance = {};
  for (const i of agg.items) {
    const d = i.domain || 'unknown';
    byDomain[d] = byDomain[d] || { green: 0, amber: 0, red: 0, unknown: 0 };
    byDomain[d][i.status] += 1;
    for (const c of i.compliance || []) {
      byCompliance[c] = byCompliance[c] || { green: 0, amber: 0, red: 0, unknown: 0 };
      byCompliance[c][i.status] += 1;
    }
  }
  result.counts = agg.counts;
  result.byDomain = byDomain;
  result.byCompliance = byCompliance;
  result.kpis = agg.items;
  const s = summariseStatuses(agg, 'board view');
  result.summary = s;
  return result;
}

// ─── 3. buildBranchKpiPack (monthly) ─────────────────────────────

async function buildBranchKpiPack({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'branch.kpi.monthly', periodKey, scopeKey, range);
  Object.assign(result, {
    counts: { green: 0, amber: 0, red: 0, unknown: 0 },
    kpis: [],
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const registry = loadRegistry(ctx);
  if (!registry) {
    result.summary.items.push('kpi.registry not available — pack empty.');
    return result;
  }
  // Branch pack passes the branchId through to the valueResolver so
  // downstream services can scope the underlying query.
  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const agg = await aggregate(registry, {
    valueResolver: ctx.valueResolver,
    ctx: { ...ctx, scope, periodKey, branchId },
  });
  result.counts = agg.counts;
  result.kpis = agg.items;
  result.branch = await loadBranch(ctx, scope);
  const s = summariseStatuses(agg, 'branch KPIs');
  result.summary = s;
  return result;
}

module.exports = {
  buildExecDigest,
  buildBoardPack,
  buildBranchKpiPack,
  // exposed for tests
  summariseStatuses,
  loadRegistry,
};
