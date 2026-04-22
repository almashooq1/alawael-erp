/**
 * sessionReportBuilder.js — real builder for `session.volume.daily`
 * (and any other catalog entry naming `sessionReportBuilder.buildVolume`).
 *
 * Phase 10 Commit 7b.
 *
 * Queries the TherapySession model by date range + optional branch
 * scope, rolls up session counts by status + sessionType, and emits a
 * stable JSON shape for the renderer.
 *
 * This also establishes the aggregation template the next three
 * builders (therapist productivity, branch occupancy, fleet
 * punctuality) will follow: `parsePeriodKey → Mongoose find → status
 * rollup → headline metric → stable {summary,items} contract`.
 *
 * Output shape:
 *
 *   {
 *     reportType,
 *     periodKey,
 *     scopeKey,
 *     generatedAt,
 *     range: { start, end },
 *     branch: { id, name? } | null,
 *     totals: {
 *       total,
 *       scheduled, confirmed, inProgress, completed,
 *       cancelledByPatient, cancelledByCenter, noShow, rescheduled,
 *     },
 *     byType: Array<{ sessionType, count }>,
 *     completionRate: number | null,    completed / (completed + all-cancelled + no-show)
 *     cancellationRate: number | null,  (cancelled-by-patient + cancelled-by-center) / total
 *     noShowRate: number | null,         no-show / total
 *     summary: { items: string[], headlineMetric: { label, value } | null },
 *   }
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

const STATUS_KEYS = Object.freeze({
  SCHEDULED: 'scheduled',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
  CANCELLED_BY_PATIENT: 'cancelledByPatient',
  CANCELLED_BY_CENTER: 'cancelledByCenter',
  NO_SHOW: 'noShow',
  RESCHEDULED: 'rescheduled',
});

function emptyTotals() {
  return {
    total: 0,
    scheduled: 0,
    confirmed: 0,
    inProgress: 0,
    completed: 0,
    cancelledByPatient: 0,
    cancelledByCenter: 0,
    noShow: 0,
    rescheduled: 0,
  };
}

function rollupSessions(rows) {
  const totals = emptyTotals();
  const byType = new Map();
  for (const r of rows || []) {
    totals.total += 1;
    const key = STATUS_KEYS[r && r.status];
    if (key) totals[key] += 1;
    const t = (r && (r.sessionType || r.type)) || 'unknown';
    byType.set(t, (byType.get(t) || 0) + 1);
  }
  return { totals, byType };
}

function pct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return num / den;
}

function computeRates(totals) {
  const cancelled = totals.cancelledByPatient + totals.cancelledByCenter;
  const settled = totals.completed + cancelled + totals.noShow;
  return {
    completionRate: pct(totals.completed, settled),
    cancellationRate: pct(cancelled, totals.total),
    noShowRate: pct(totals.noShow, totals.total),
  };
}

function formatPct(x) {
  if (x == null) return '—';
  return `${Math.round(x * 1000) / 10}%`;
}

function buildSummary(totals, rates, byType) {
  const items = [];
  items.push(`Total sessions: ${totals.total}`);
  items.push(`Completed: ${totals.completed}`);
  if (totals.noShow > 0) items.push(`No-shows: ${totals.noShow} (${formatPct(rates.noShowRate)})`);
  const cancelled = totals.cancelledByPatient + totals.cancelledByCenter;
  if (cancelled > 0) {
    items.push(
      `Cancelled: ${cancelled} (${totals.cancelledByPatient} patient + ${totals.cancelledByCenter} center)`
    );
  }
  const topTypes = [...byType.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  if (topTypes.length) {
    items.push(`Top session types: ${topTypes.map(([t, n]) => `${t}=${n}`).join(', ')}`);
  }
  const headlineMetric = totals.total
    ? { label: 'completion rate', value: formatPct(rates.completionRate) }
    : null;
  return { items, headlineMetric };
}

async function listSessions(Model, { start, end, scope }) {
  if (!Model) return [];
  const filter = { date: { $gte: start, $lt: end } };
  if (scope && scope.type === 'branch' && scope.id) {
    filter.branchId = scope.id;
  }
  if (scope && scope.type === 'therapist' && scope.id) {
    filter.therapist = scope.id;
  }
  if (scope && scope.type === 'beneficiary' && scope.id) {
    filter.beneficiary = scope.id;
  }
  try {
    return (await Model.find(filter)) || [];
  } catch (_) {
    return [];
  }
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

/**
 * Build a session-volume report for a period.
 *
 * Accepts optional scopes (branch / therapist / beneficiary); without
 * a scope the output is tenant-wide for the period.
 */
async function buildVolume({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = {
    reportType: (report && report.id) || 'session.volume.daily',
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    totals: emptyTotals(),
    byType: [],
    completionRate: null,
    cancellationRate: null,
    noShowRate: null,
    summary: { items: [], headlineMetric: null },
  };

  if (!range) {
    result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
    return result;
  }

  const Model =
    ctx.models &&
    (ctx.models.TherapySession?.model ||
      ctx.models.TherapySession ||
      ctx.models.Session?.model ||
      ctx.models.Session);
  const rows = await listSessions(Model, { start: range.start, end: range.end, scope });
  const { totals, byType } = rollupSessions(rows);
  result.totals = totals;
  result.byType = [...byType.entries()].map(([sessionType, count]) => ({ sessionType, count }));
  Object.assign(result, computeRates(totals));
  result.summary = buildSummary(totals, result, byType);
  result.branch = await loadBranch(ctx, scope);
  return result;
}

module.exports = {
  buildVolume,
  // Exposed for tests:
  STATUS_KEYS,
  rollupSessions,
  computeRates,
  buildSummary,
};
