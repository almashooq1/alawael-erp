/**
 * fleetReportBuilder.js — real builder for `fleet.punctuality.weekly`.
 *
 * Phase 10 Commit 7d.
 *
 * Trip model has Arabic status enum (جاهزة / جارية / اكتملت / ملغاة =
 * ready / in-progress / completed / cancelled), plus distance, duration,
 * violations[], and speedingIncidents[]. It does NOT currently carry
 * scheduled-vs-actual arrival, so we proxy "punctuality" as:
 *
 *   completionRate = completed / (completed + cancelled)
 *
 * and surface avg duration, avg distance, total violations and
 * speeding incidents so ops can spot problem vehicles / drivers. When
 * a future migration adds `scheduledArrival` / `actualArrival`, swap
 * the proxy for a real on-time-rate without changing the output
 * contract beyond a `onTimeRate` field.
 *
 * Output shape:
 *
 *   {
 *     reportType, periodKey, scopeKey, generatedAt, range,
 *     totals: { trips, completed, cancelled, inProgress, ready },
 *     completionRate: number | null,
 *     avgDurationMinutes: number | null,
 *     avgDistanceKm: number | null,
 *     violations: number,
 *     speedingIncidents: number,
 *     byVehicle: Array<{ vehicleId, trips, completed, cancelled,
 *       totalDistanceKm, totalDurationMinutes, violations }>
 *       (sorted by trips desc),
 *     summary: { items, headlineMetric },
 *   }
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

const STATUS_AR = Object.freeze({
  READY: 'جاهزة',
  IN_PROGRESS: 'جارية',
  COMPLETED: 'اكتملت',
  CANCELLED: 'ملغاة',
});

function emptyTotals() {
  return { trips: 0, completed: 0, cancelled: 0, inProgress: 0, ready: 0 };
}

function statusBucket(status) {
  switch (status) {
    case STATUS_AR.COMPLETED:
      return 'completed';
    case STATUS_AR.CANCELLED:
      return 'cancelled';
    case STATUS_AR.IN_PROGRESS:
      return 'inProgress';
    case STATUS_AR.READY:
      return 'ready';
    default:
      return null;
  }
}

function pct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return num / den;
}

function formatPct(x) {
  if (x == null || !Number.isFinite(x)) return '—';
  return `${Math.round(x * 1000) / 10}%`;
}

function rollupTrips(rows) {
  const totals = emptyTotals();
  let totalDuration = 0;
  let durationCount = 0;
  let totalDistance = 0;
  let distanceCount = 0;
  let violations = 0;
  let speeding = 0;
  const byVehicle = new Map();
  for (const t of rows || []) {
    totals.trips += 1;
    const b = statusBucket(t.status);
    if (b) totals[b] += 1;
    if (Number.isFinite(t.duration)) {
      totalDuration += Number(t.duration);
      durationCount += 1;
    }
    if (Number.isFinite(t.distance)) {
      totalDistance += Number(t.distance);
      distanceCount += 1;
    }
    if (Array.isArray(t.violations)) violations += t.violations.length;
    if (Array.isArray(t.speedingIncidents)) speeding += t.speedingIncidents.length;

    const vk = t.vehicle ? String(t.vehicle) : null;
    if (vk) {
      const node = byVehicle.get(vk) || {
        vehicleId: vk,
        trips: 0,
        completed: 0,
        cancelled: 0,
        totalDistanceKm: 0,
        totalDurationMinutes: 0,
        violations: 0,
      };
      node.trips += 1;
      if (b === 'completed') node.completed += 1;
      if (b === 'cancelled') node.cancelled += 1;
      if (Number.isFinite(t.distance)) node.totalDistanceKm += Number(t.distance);
      if (Number.isFinite(t.duration)) node.totalDurationMinutes += Number(t.duration);
      if (Array.isArray(t.violations)) node.violations += t.violations.length;
      byVehicle.set(vk, node);
    }
  }
  return {
    totals,
    avgDurationMinutes:
      durationCount > 0 ? Math.round((totalDuration / durationCount) * 10) / 10 : null,
    avgDistanceKm: distanceCount > 0 ? Math.round((totalDistance / distanceCount) * 10) / 10 : null,
    violations,
    speedingIncidents: speeding,
    byVehicle,
  };
}

async function listTrips(Model, { start, end, scope }) {
  if (!Model) return [];
  const filter = { startTime: { $gte: start, $lt: end } };
  if (scope && scope.type === 'vehicle' && scope.id) filter.vehicle = scope.id;
  if (scope && scope.type === 'driver' && scope.id) filter.driver = scope.id;
  try {
    return (await Model.find(filter)) || [];
  } catch (_) {
    return [];
  }
}

async function buildPunctuality({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = {
    reportType: (report && report.id) || 'fleet.punctuality.weekly',
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    totals: emptyTotals(),
    completionRate: null,
    avgDurationMinutes: null,
    avgDistanceKm: null,
    violations: 0,
    speedingIncidents: 0,
    byVehicle: [],
    summary: { items: [], headlineMetric: null },
  };
  if (!range) {
    result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
    return result;
  }

  const Model = ctx.models && (ctx.models.Trip?.model || ctx.models.Trip);
  const rows = await listTrips(Model, { start: range.start, end: range.end, scope });
  const rollup = rollupTrips(rows);
  result.totals = rollup.totals;
  result.avgDurationMinutes = rollup.avgDurationMinutes;
  result.avgDistanceKm = rollup.avgDistanceKm;
  result.violations = rollup.violations;
  result.speedingIncidents = rollup.speedingIncidents;
  result.completionRate = pct(
    result.totals.completed,
    result.totals.completed + result.totals.cancelled
  );
  result.byVehicle = [...rollup.byVehicle.values()].sort((a, b) => b.trips - a.trips);

  result.summary.items = [
    `Trips: ${result.totals.trips} (${result.totals.completed} completed, ${result.totals.cancelled} cancelled)`,
  ];
  if (result.avgDurationMinutes != null) {
    result.summary.items.push(`Avg duration: ${result.avgDurationMinutes} min`);
  }
  if (result.avgDistanceKm != null) {
    result.summary.items.push(`Avg distance: ${result.avgDistanceKm} km`);
  }
  if (result.violations || result.speedingIncidents) {
    result.summary.items.push(
      `Violations: ${result.violations}; Speeding incidents: ${result.speedingIncidents}`
    );
  }
  if (result.byVehicle.length) {
    result.summary.items.push(
      `Top vehicle: ${result.byVehicle[0].vehicleId} (${result.byVehicle[0].trips} trips)`
    );
  }
  result.summary.headlineMetric = result.totals.trips
    ? { label: 'completion rate', value: formatPct(result.completionRate) }
    : null;
  return result;
}

module.exports = {
  buildPunctuality,
  // Exposed for tests:
  STATUS_AR,
  statusBucket,
  rollupTrips,
};
