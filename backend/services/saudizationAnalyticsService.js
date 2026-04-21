/**
 * saudizationAnalyticsService — pure math over NitaqatCalculation snapshots.
 *
 * MOL Nitaqat policy (Saudi workforce localization) classifies every
 * establishment into a band (platinum/high_green/mid_green/low_green/red).
 * Red band = hiring freeze + visa block. Staying green is not optional —
 * it's a legal operating requirement.
 *
 * This service turns historical NitaqatCalculation snapshots (already
 * computed by the Nitaqat calculator) into forward-looking intelligence:
 *   • where are we now (current band, % to next)
 *   • where are we trending (band changes over time)
 *   • when will we hit red (runway projection from recent trajectory)
 *   • what to do about it (Saudis to hire, expats that can leave)
 *
 * Functions:
 *   • currentStatus(snapshots)      latest snapshot + band gap math
 *   • monthlyTrend(snapshots)       Saudization % + band per month
 *   • bandHistory(snapshots)        band-change events timeline
 *   • runwayProjection(snapshots)   months until red band at current slope
 *   • detectRiskAlarm(snapshots)    trip when runway ≤ NITAQAT_ALARM_MONTHS
 */

'use strict';

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

function envFloat(name, fallback) {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

const THRESHOLDS = {
  // Months of runway below which we trip the alarm — enough time for
  // HR to onboard Saudi hires before the band drops.
  get alarmMonths() {
    return envInt('NITAQAT_ALARM_MONTHS', 3);
  },
  // Minimum snapshots needed before runway projection is trustworthy.
  get projectionMinSnapshots() {
    return envInt('NITAQAT_PROJECTION_MIN_SNAPSHOTS', 3);
  },
  // % drop per month that's considered "declining" vs stable.
  get decliningPctPerMonth() {
    return envFloat('NITAQAT_DECLINING_THRESHOLD_PCT', 0.5);
  },
};

const BAND_ORDER = ['red', 'low_green', 'mid_green', 'high_green', 'platinum'];
const BAND_LABELS = {
  red: 'الأحمر',
  low_green: 'الأخضر المنخفض',
  mid_green: 'الأخضر المتوسط',
  high_green: 'الأخضر المرتفع',
  platinum: 'البلاتيني',
};

function bandRank(band) {
  const i = BAND_ORDER.indexOf(band);
  return i === -1 ? null : i;
}

function sortByDateAsc(snapshots) {
  return [...snapshots].sort((a, b) => {
    const da = a?.calculationDate ? new Date(a.calculationDate).getTime() : 0;
    const db = b?.calculationDate ? new Date(b.calculationDate).getTime() : 0;
    return da - db;
  });
}

/**
 * The latest snapshot + derived signals (band gap, next-band target).
 */
function currentStatus(snapshots) {
  if (!snapshots || snapshots.length === 0) {
    return { hasData: false };
  }
  const sorted = sortByDateAsc(snapshots);
  const latest = sorted[sorted.length - 1];
  const currentBand = latest.nitaqatBand;
  const rank = bandRank(currentBand);
  const nextBand = rank != null && rank < BAND_ORDER.length - 1 ? BAND_ORDER[rank + 1] : null;
  const previousBand = rank != null && rank > 0 ? BAND_ORDER[rank - 1] : null;
  return {
    hasData: true,
    calculationDate: latest.calculationDate,
    currentBand,
    currentBandLabel: BAND_LABELS[currentBand] || currentBand,
    nextBand,
    nextBandLabel: nextBand ? BAND_LABELS[nextBand] : null,
    previousBand,
    previousBandLabel: previousBand ? BAND_LABELS[previousBand] : null,
    saudizationPercentage: latest.saudizationPercentage || 0,
    totalEmployees: latest.totalEmployees || 0,
    saudiEmployees: latest.saudiEmployees || 0,
    expatEmployees: latest.expatEmployees || 0,
    weightedSaudiCount: latest.weightedSaudiCount || 0,
    saudisNeededForNextBand: latest.saudisNeededForNextBand || 0,
    maxExpatsAllowed: latest.maxExpatsAllowed || 0,
    thresholds: {
      redMax: latest.redMax,
      lowGreenMax: latest.lowGreenMax,
      midGreenMax: latest.midGreenMax,
      highGreenMax: latest.highGreenMax,
    },
  };
}

function monthlyTrend(snapshots) {
  if (!snapshots || snapshots.length === 0) return [];
  const byMonth = new Map();
  for (const s of snapshots) {
    if (!s?.calculationDate) continue;
    const key = new Date(s.calculationDate).toISOString().slice(0, 7);
    // Keep the LAST snapshot per month (end-of-month state).
    const existing = byMonth.get(key);
    if (!existing || new Date(s.calculationDate) > new Date(existing.calculationDate)) {
      byMonth.set(key, s);
    }
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, s]) => ({
      month,
      saudizationPercentage: Math.round((s.saudizationPercentage || 0) * 10) / 10,
      band: s.nitaqatBand,
      totalEmployees: s.totalEmployees || 0,
      saudiEmployees: s.saudiEmployees || 0,
    }));
}

/**
 * Timeline of band-change events only (skips months with no change).
 * Useful for a timeline view showing "we went green → we stayed → we
 * went yellow in March".
 */
function bandHistory(snapshots) {
  if (!snapshots || snapshots.length === 0) return [];
  const sorted = sortByDateAsc(snapshots);
  const events = [];
  let lastBand = null;
  for (const s of sorted) {
    if (s.nitaqatBand !== lastBand) {
      events.push({
        date: s.calculationDate,
        band: s.nitaqatBand,
        bandLabel: BAND_LABELS[s.nitaqatBand] || s.nitaqatBand,
        previousBand: lastBand,
        direction: lastBand == null ? 'initial' : rankDirection(lastBand, s.nitaqatBand),
        saudizationPercentage: s.saudizationPercentage || 0,
      });
      lastBand = s.nitaqatBand;
    }
  }
  return events;
}

function rankDirection(from, to) {
  const fr = bandRank(from);
  const tr = bandRank(to);
  if (fr == null || tr == null) return 'unknown';
  if (tr > fr) return 'improved';
  if (tr < fr) return 'declined';
  return 'same';
}

/**
 * Extrapolate the current trajectory to estimate when the
 * establishment would hit red. Uses linear regression on the last 6
 * months of Saudization %. Insufficient history or stable/improving
 * trajectory returns `runwayMonths = null`.
 */
function runwayProjection(snapshots) {
  const trend = monthlyTrend(snapshots);
  if (trend.length < THRESHOLDS.projectionMinSnapshots) {
    return {
      runwayMonths: null,
      reason: 'insufficient_history',
      monthsObserved: trend.length,
      required: THRESHOLDS.projectionMinSnapshots,
    };
  }

  // Use last 6 months (or all if less).
  const recent = trend.slice(-6);
  const n = recent.length;
  if (n < 2) return { runwayMonths: null, reason: 'insufficient_history' };

  // Simple linear slope via least-squares (month-index vs pct).
  const xs = recent.map((_, i) => i);
  const ys = recent.map(m => m.saudizationPercentage);
  const xMean = xs.reduce((a, b) => a + b, 0) / n;
  const yMean = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den; // pct-per-month
  const latestPct = ys[ys.length - 1];
  const latestSnap = snapshots[snapshots.length - 1] || {};
  const redMax = latestSnap.redMax || 0;

  // Stable or improving trajectory.
  if (slope >= 0 || Math.abs(slope) < THRESHOLDS.decliningPctPerMonth) {
    return {
      runwayMonths: null,
      reason: slope >= 0 ? 'stable_or_improving' : 'decline_below_threshold',
      slopePctPerMonth: Math.round(slope * 100) / 100,
      latestPct,
      redMaxThreshold: redMax,
    };
  }

  // Declining. Compute months until we cross redMax.
  if (latestPct <= redMax) {
    return {
      runwayMonths: 0,
      reason: 'already_red',
      slopePctPerMonth: Math.round(slope * 100) / 100,
      latestPct,
      redMaxThreshold: redMax,
    };
  }
  const runway = Math.round(((latestPct - redMax) / Math.abs(slope)) * 10) / 10;
  return {
    runwayMonths: runway,
    reason: 'declining',
    slopePctPerMonth: Math.round(slope * 100) / 100,
    latestPct,
    redMaxThreshold: redMax,
  };
}

/**
 * Fires when the establishment is red OR runway to red is ≤ alarmMonths.
 * Gives HR actionable warning: "you have 3 months to hire X Saudis
 * before you lose your green band".
 */
function detectRiskAlarm(snapshots) {
  const status = currentStatus(snapshots);
  if (!status.hasData) return { active: false, reason: 'no_data' };
  if (status.currentBand === 'red') {
    return {
      active: true,
      reason: 'already_red',
      currentBand: 'red',
      saudisNeededForNextBand: status.saudisNeededForNextBand,
    };
  }
  const runway = runwayProjection(snapshots);
  if (runway.runwayMonths != null && runway.runwayMonths <= THRESHOLDS.alarmMonths) {
    return {
      active: true,
      reason: 'runway_short',
      runwayMonths: runway.runwayMonths,
      threshold: THRESHOLDS.alarmMonths,
      currentBand: status.currentBand,
      saudisNeededForNextBand: status.saudisNeededForNextBand,
      slopePctPerMonth: runway.slopePctPerMonth,
    };
  }
  return {
    active: false,
    currentBand: status.currentBand,
    runwayMonths: runway.runwayMonths,
    threshold: THRESHOLDS.alarmMonths,
  };
}

module.exports = {
  THRESHOLDS,
  BAND_ORDER,
  BAND_LABELS,
  bandRank,
  currentStatus,
  monthlyTrend,
  bandHistory,
  runwayProjection,
  detectRiskAlarm,
};
