/**
 * branchReportBuilder.js — real builder for `branch.occupancy.weekly`
 * (and any catalog entry naming `branchReportBuilder.buildOccupancy`).
 *
 * Phase 10 Commit 7d.
 *
 * Measures how full the branch is versus its declared capacity. The
 * branch model already carries a `capacity` block with:
 *
 *   { total_rooms, therapy_rooms, consultation_rooms,
 *     max_daily_sessions, max_patients }
 *
 * and the TherapySession collection gives us actual volume. Occupancy
 * rate = (actual sessions in period) / (max_daily_sessions × period days).
 *
 * Output shape:
 *
 *   {
 *     reportType, periodKey, scopeKey, generatedAt, range,
 *     branch: { id, name?, capacity? } | null,
 *     days: number,
 *     actual: {
 *       totalSessions, completedSessions,
 *       activePatients,         // unique beneficiaries served
 *       therapistsActive,       // unique therapists running sessions
 *     },
 *     capacity: {
 *       maxDailySessions,
 *       maxPatients,
 *       therapyRooms,
 *       capacityForPeriod,      // max_daily_sessions × days
 *     } | null,
 *     occupancyRate: number | null,   // actual.totalSessions / capacityForPeriod
 *     utilisationByRoom: null,        // reserved; needs room-level booking data
 *     summary: { items, headlineMetric },
 *   }
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

async function listSessions(Model, { start, end, branchId }) {
  if (!Model) return [];
  const filter = { date: { $gte: start, $lt: end } };
  if (branchId) filter.branchId = branchId;
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
    if (!b) return { id: scope.id };
    return {
      id: String(b._id || b.id || scope.id),
      name: b.name || null,
      capacity: b.capacity || null,
    };
  } catch (_) {
    return { id: scope.id };
  }
}

function daysBetween(start, end) {
  if (!(start instanceof Date) || !(end instanceof Date)) return 0;
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (24 * 3600 * 1000)));
}

function pct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return num / den;
}

function formatPct(x) {
  if (x == null || !Number.isFinite(x)) return '—';
  return `${Math.round(x * 1000) / 10}%`;
}

function summariseSessions(rows) {
  const beneficiaries = new Set();
  const therapists = new Set();
  let total = 0;
  let completed = 0;
  for (const s of rows || []) {
    total += 1;
    if (s.status === 'COMPLETED') completed += 1;
    const b = s.beneficiary || s.beneficiaryId;
    const t = s.therapist || s.therapistId;
    if (b) beneficiaries.add(String(b));
    if (t) therapists.add(String(t));
  }
  return {
    totalSessions: total,
    completedSessions: completed,
    activePatients: beneficiaries.size,
    therapistsActive: therapists.size,
  };
}

function capacityBlock(branch, days) {
  const cap = branch && branch.capacity;
  if (!cap) return null;
  const maxDaily = Number(cap.max_daily_sessions) || 0;
  return {
    maxDailySessions: maxDaily,
    maxPatients: Number(cap.max_patients) || 0,
    therapyRooms: Number(cap.therapy_rooms) || 0,
    capacityForPeriod: maxDaily * days,
  };
}

async function buildOccupancy({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = {
    reportType: (report && report.id) || 'branch.occupancy.weekly',
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    days: 0,
    actual: {
      totalSessions: 0,
      completedSessions: 0,
      activePatients: 0,
      therapistsActive: 0,
    },
    capacity: null,
    occupancyRate: null,
    utilisationByRoom: null,
    summary: { items: [], headlineMetric: null },
  };
  if (!range) {
    result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
    return result;
  }
  result.days = daysBetween(range.start, range.end);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Model =
    ctx.models &&
    (ctx.models.TherapySession?.model ||
      ctx.models.TherapySession ||
      ctx.models.Session?.model ||
      ctx.models.Session);
  const rows = await listSessions(Model, { start: range.start, end: range.end, branchId });
  result.actual = summariseSessions(rows);
  result.branch = await loadBranch(ctx, scope);
  result.capacity = capacityBlock(result.branch, result.days);
  if (result.capacity && result.capacity.capacityForPeriod > 0) {
    result.occupancyRate = pct(result.actual.totalSessions, result.capacity.capacityForPeriod);
  }

  result.summary.items = [
    `Period: ${result.days} day${result.days === 1 ? '' : 's'}`,
    `Sessions held: ${result.actual.totalSessions} (${result.actual.completedSessions} completed)`,
    `Active beneficiaries: ${result.actual.activePatients}`,
    `Active therapists: ${result.actual.therapistsActive}`,
  ];
  if (result.capacity) {
    result.summary.items.push(
      `Capacity: ${result.capacity.capacityForPeriod} sessions (${result.capacity.maxDailySessions}/day × ${result.days} days)`
    );
  }
  result.summary.headlineMetric =
    result.occupancyRate == null
      ? null
      : { label: 'occupancy rate', value: formatPct(result.occupancyRate) };
  return result;
}

module.exports = {
  buildOccupancy,
  // Exposed for tests:
  summariseSessions,
  capacityBlock,
  daysBetween,
};
