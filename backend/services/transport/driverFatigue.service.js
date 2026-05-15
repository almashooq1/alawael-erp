/**
 * Driver fatigue detection — Phase K1
 *
 * Pure function that scans a driver's recent GPS points + trips and
 * decides whether the driver should take a break. Thresholds follow
 * common GCC commercial-driver guidance (4.5h continuous driving,
 * 11h cumulative per day) — tunable via options.
 *
 * Inputs:
 *   - sorted GPS points (timestamp ASC) for the driver's vehicles
 *     in the relevant window
 *   - the driver's trips covering that window (for trip context)
 *
 * Outputs a fatigue state:
 *   level:   'ok' | 'warning' | 'critical'
 *   reason:  'continuous_drive_4h' | 'daily_drive_11h' | 'no_break_today' | null
 *   metrics: { continuousMinutes, dailyMinutes, lastBreakAt, longestSegmentMinutes }
 *   recommendation: Arabic actionable string
 */
'use strict';

const DEFAULT_OPTS = {
  // A "break" is detected when the vehicle stops (speed <= 2 km/h)
  // for at least this many minutes
  breakThresholdMinutes: 15,
  // Speed at which the driver counts as "driving"
  movingSpeedKmh: 5,
  // Warn after 4 hours continuous driving (typical EU + GCC norm: 4.5h)
  continuousWarnMinutes: 4 * 60,
  // Critical at 4.5 hours
  continuousCriticalMinutes: 4.5 * 60,
  // Daily cap: warn at 8h, critical at 11h
  dailyWarnMinutes: 8 * 60,
  dailyCriticalMinutes: 11 * 60,
  // Max gap between GPS points still counted as the same drive
  // (longer gap → assume off-duty / network outage)
  maxGapMinutes: 30,
};

function fatigueLevel(continuousMin, dailyMin, opts) {
  if (continuousMin >= opts.continuousCriticalMinutes || dailyMin >= opts.dailyCriticalMinutes) {
    return 'critical';
  }
  if (continuousMin >= opts.continuousWarnMinutes || dailyMin >= opts.dailyWarnMinutes) {
    return 'warning';
  }
  return 'ok';
}

function fatigueReason(continuousMin, dailyMin, opts) {
  if (continuousMin >= opts.continuousCriticalMinutes) return 'continuous_drive_critical';
  if (dailyMin >= opts.dailyCriticalMinutes) return 'daily_drive_critical';
  if (continuousMin >= opts.continuousWarnMinutes) return 'continuous_drive_warn';
  if (dailyMin >= opts.dailyWarnMinutes) return 'daily_drive_warn';
  return null;
}

function arabicRecommendation(reason, metrics) {
  switch (reason) {
    case 'continuous_drive_critical':
      return `قيادة متواصلة ${Math.round(metrics.continuousMinutes)}د — توقف الآن واسترح ${Math.round(metrics.continuousMinutes / 10)} دقيقة على الأقل`;
    case 'continuous_drive_warn':
      return `اقتربت من 4 ساعات متواصلة — خذ استراحة 15 دقيقة قريباً`;
    case 'daily_drive_critical':
      return `قيادة ${Math.round(metrics.dailyMinutes / 60)} ساعة اليوم — لا يجوز قيادة إضافية بدون استراحة طويلة`;
    case 'daily_drive_warn':
      return `وصلت لـ ${Math.round(metrics.dailyMinutes / 60)} ساعات قيادة اليوم — راقب إجمالي الوقت`;
    default:
      return null;
  }
}

/**
 * Scan a single driver's GPS stream + trips for fatigue.
 *
 * @param {Object} args
 * @param {Array<{timestamp, speed}>} args.points - GPS points ASC by timestamp
 * @param {Array<{trip_date, actual_departure, actual_arrival, status}>} [args.trips]
 * @param {Date} [args.now] - reference "now" (default new Date())
 * @param {Object} [args.options] - threshold overrides (see DEFAULT_OPTS)
 */
function analyzeDriver(args) {
  const a = args || {};
  const opts = { ...DEFAULT_OPTS, ...(a.options || {}) };
  const now = a.now ? new Date(a.now) : new Date();
  const points = Array.isArray(a.points) ? a.points : [];

  // Window we care about: the same calendar day as `now`
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  // Filter to today's points only — fatigue resets at midnight
  const todays = points.filter(p => {
    const t = new Date(p.timestamp).getTime();
    return t >= startOfDay.getTime() && t <= now.getTime();
  });

  if (todays.length < 2) {
    return {
      level: 'ok',
      reason: null,
      metrics: {
        continuousMinutes: 0,
        dailyMinutes: 0,
        longestSegmentMinutes: 0,
        lastBreakAt: null,
        samples: todays.length,
      },
      recommendation: null,
      thresholds: opts,
    };
  }

  // Walk the points and compute drive segments separated by breaks
  // (speed <= movingSpeedKmh for >= breakThresholdMinutes).
  let dailyDriveMs = 0;
  let segmentStartIdx = 0;
  let longestSegmentMs = 0;
  let lastBreakAt = null;

  const segments = [];
  let i = 0;
  while (i < todays.length) {
    // Skip over stationary samples to detect breaks
    let j = i;
    while (j < todays.length && (todays[j].speed || 0) <= opts.movingSpeedKmh) j++;

    if (j > i) {
      const breakStart = new Date(todays[i].timestamp).getTime();
      const breakEnd = new Date(todays[j - 1].timestamp).getTime();
      const breakMs = breakEnd - breakStart;
      if (breakMs >= opts.breakThresholdMinutes * 60 * 1000) {
        // Real break — close current segment if any
        if (segmentStartIdx < i) {
          const segMs =
            new Date(todays[i - 1].timestamp).getTime() -
            new Date(todays[segmentStartIdx].timestamp).getTime();
          segments.push({ from: segmentStartIdx, to: i - 1, ms: segMs });
          dailyDriveMs += segMs;
          if (segMs > longestSegmentMs) longestSegmentMs = segMs;
        }
        lastBreakAt = new Date(breakEnd);
        segmentStartIdx = j; // next segment starts after the break
      }
    }
    i = j === i ? i + 1 : j;
  }

  // Close trailing segment
  if (segmentStartIdx < todays.length - 1) {
    const segMs =
      new Date(todays[todays.length - 1].timestamp).getTime() -
      new Date(todays[segmentStartIdx].timestamp).getTime();
    segments.push({ from: segmentStartIdx, to: todays.length - 1, ms: segMs, isCurrent: true });
    dailyDriveMs += segMs;
    if (segMs > longestSegmentMs) longestSegmentMs = segMs;
  }

  // Continuous = the trailing segment if it's still in progress
  const currentSeg = segments[segments.length - 1];
  const continuousMs = currentSeg && currentSeg.isCurrent ? currentSeg.ms : 0;

  const continuousMinutes = continuousMs / 60000;
  const dailyMinutes = dailyDriveMs / 60000;
  const longestSegmentMinutes = longestSegmentMs / 60000;

  const level = fatigueLevel(continuousMinutes, dailyMinutes, opts);
  const reason = fatigueReason(continuousMinutes, dailyMinutes, opts);
  const metrics = {
    continuousMinutes: Math.round(continuousMinutes),
    dailyMinutes: Math.round(dailyMinutes),
    longestSegmentMinutes: Math.round(longestSegmentMinutes),
    lastBreakAt,
    samples: todays.length,
    segments: segments.length,
  };
  const recommendation = arabicRecommendation(reason, metrics);

  return { level, reason, metrics, recommendation, thresholds: opts };
}

module.exports = {
  DEFAULT_OPTS,
  analyzeDriver,
  fatigueLevel,
  fatigueReason,
  arabicRecommendation,
};
