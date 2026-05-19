'use strict';

/**
 * saudi-labor-compliance.lib.js — Wave 137.
 *
 * Pure helpers encoding Saudi MOL (Ministry of Human Resources and
 * Social Development) labour-law thresholds. Used by the compliance
 * service to validate timesheet data and emit violations.
 *
 * Authority:
 *   - Saudi Labour Law (Royal Decree M/51) Articles 98–107
 *   - Ramadan adjustment (Article 98)
 *   - Nitaqat (Saudization) program
 *
 * Constants (DEFAULT_LIMITS):
 *   DAILY_MAX_MINUTES        — 8h = 480 (standard work day)
 *   DAILY_MAX_RAMADAN        — 6h = 360 (Muslim employees during
 *                              Ramadan; reduced from 8h per Art. 98)
 *   WEEKLY_MAX_MINUTES       — 48h = 2880 (Sat-Thu, Friday is the
 *                              weekly rest day per Art. 104)
 *   OVERTIME_MAX_MINUTES     — daily overtime cap (additional 4h max)
 *   MIN_WEEKLY_REST_HOURS    — 24h continuous (Art. 104)
 *   MIN_DAILY_BREAK_MINUTES  — 30min after 5 consecutive hours
 *                              (Art. 101)
 *   OVERTIME_MULTIPLIER      — 1.5× regular hourly rate (Art. 107)
 *
 * Nitaqat (Saudization) brackets (PLATINUM > GREEN > YELLOW > RED):
 *   Each industry/size has a target Saudization %. We expose a
 *   classifier that takes (saudiCount, totalCount, sizeBand) and
 *   returns the band name + the gap to the next-better band.
 *
 * Pure functions — no I/O, no globals. Service in
 * saudi-labor-compliance.service.js consumes them.
 */

const DEFAULT_LIMITS = Object.freeze({
  DAILY_MAX_MINUTES: 8 * 60, // 480
  DAILY_MAX_RAMADAN: 6 * 60, // 360
  WEEKLY_MAX_MINUTES: 48 * 60, // 2880
  OVERTIME_MAX_MINUTES: 4 * 60, // additional 4h max on top of daily
  MIN_WEEKLY_REST_HOURS: 24,
  MIN_DAILY_BREAK_MINUTES: 30,
  CONSECUTIVE_HOURS_BEFORE_BREAK: 5,
  OVERTIME_MULTIPLIER: 1.5,
  FRIDAY_REST_MULTIPLIER: 1.5, // working on Friday = 1.5× rate
});

const VIOLATION_KINDS = Object.freeze({
  DAILY_HOURS_EXCEEDED: 'daily-hours-exceeded',
  RAMADAN_HOURS_EXCEEDED: 'ramadan-hours-exceeded',
  WEEKLY_HOURS_EXCEEDED: 'weekly-hours-exceeded',
  OVERTIME_CAP_EXCEEDED: 'overtime-cap-exceeded',
  MISSING_WEEKLY_REST: 'missing-weekly-rest',
  MISSING_DAILY_BREAK: 'missing-daily-break',
  FRIDAY_WORK_UNCOMPENSATED: 'friday-work-uncompensated',
});

const NITAQAT_BANDS = Object.freeze(['platinum', 'green', 'yellow', 'red']);

// Industry-size → Saudization target % matrix (simplified).
// Real Nitaqat has dozens of industry-size combos; we cover the
// healthcare-relevant ones. Operator can override via config.
const NITAQAT_TARGETS = Object.freeze({
  'healthcare:small': { platinum: 35, green: 25, yellow: 15 },
  'healthcare:medium': { platinum: 40, green: 30, yellow: 20 },
  'healthcare:large': { platinum: 45, green: 35, yellow: 25 },
  'healthcare:huge': { platinum: 50, green: 40, yellow: 30 },
});

/**
 * isRamadanDay(date, ramadanRanges) — pure.
 * ramadanRanges is an array of { start, end } UTC date ranges, e.g.
 * [{start: '2026-02-18', end: '2026-03-19'}] for Ramadan 1447 AH.
 * Returns true if the date falls in any range.
 */
function isRamadanDay(date, ramadanRanges = []) {
  if (!Array.isArray(ramadanRanges) || ramadanRanges.length === 0) return false;
  const t = new Date(date).getTime();
  return ramadanRanges.some(r => {
    const s = new Date(r.start).getTime();
    const e = new Date(r.end).getTime() + 24 * 60 * 60_000 - 1;
    return t >= s && t <= e;
  });
}

/**
 * isFriday(date) — Friday = day 5 in UTC (Sun=0, Sat=6).
 */
function isFriday(date) {
  return new Date(date).getUTCDay() === 5;
}

/**
 * checkDay({workedMinutes, date, isMuslim, ramadanRanges, limits}) →
 *   { violations: [...], allowedMaxMinutes }
 *
 * Per-day check. Returns the list of violation kinds (could be 0, 1,
 * or several) along with the allowed max for that day's context.
 */
function checkDay({
  workedMinutes,
  date,
  isMuslim = true,
  ramadanRanges = [],
  limits = DEFAULT_LIMITS,
} = {}) {
  const violations = [];
  if (typeof workedMinutes !== 'number' || workedMinutes < 0) {
    return { violations, allowedMaxMinutes: limits.DAILY_MAX_MINUTES };
  }
  const ramadan = isMuslim && isRamadanDay(date, ramadanRanges);
  const allowedMax = ramadan ? limits.DAILY_MAX_RAMADAN : limits.DAILY_MAX_MINUTES;
  if (workedMinutes > allowedMax + limits.OVERTIME_MAX_MINUTES) {
    violations.push(VIOLATION_KINDS.OVERTIME_CAP_EXCEEDED);
  }
  if (workedMinutes > allowedMax) {
    violations.push(
      ramadan ? VIOLATION_KINDS.RAMADAN_HOURS_EXCEEDED : VIOLATION_KINDS.DAILY_HOURS_EXCEEDED
    );
  }
  // Break violation: ≥5h without ≥30min break. Caller must pass break-
  // taken signal via opts.breakMinutes (default 0).
  // We don't have break-event data in DailyAttendanceRecord by default,
  // so this rule is best-effort: only fire if explicit breakMinutes
  // provided AND insufficient.
  if (
    arguments[0] &&
    typeof arguments[0].breakMinutes === 'number' &&
    workedMinutes >= limits.CONSECUTIVE_HOURS_BEFORE_BREAK * 60 &&
    arguments[0].breakMinutes < limits.MIN_DAILY_BREAK_MINUTES
  ) {
    violations.push(VIOLATION_KINDS.MISSING_DAILY_BREAK);
  }
  return { violations, allowedMaxMinutes: allowedMax };
}

/**
 * checkWeek({days, limits, ramadanRanges, isMuslim}) →
 *   { violations: [...], totalMinutes, weeklyRestHours }
 *
 * days is an array of {date, workedMinutes, isRestDay?}.
 * Detects:
 *   - WEEKLY_HOURS_EXCEEDED: sum > 48h (or 36h all-Ramadan week)
 *   - MISSING_WEEKLY_REST: no rest day with ≥24h gap from prev/next
 *   - FRIDAY_WORK_UNCOMPENSATED: worked Friday but no flag for
 *     compensation
 */
function checkWeek({
  days = [],
  isMuslim = true,
  ramadanRanges = [],
  limits = DEFAULT_LIMITS,
} = {}) {
  const violations = [];
  let totalMinutes = 0;
  let ramadanDaysInWeek = 0;
  let hasFridayWork = false;
  let fridayCompensated = false;
  let restDayCount = 0;

  for (const d of days) {
    const min = typeof d.workedMinutes === 'number' ? d.workedMinutes : 0;
    totalMinutes += min;
    if (isMuslim && isRamadanDay(d.date, ramadanRanges)) ramadanDaysInWeek += 1;
    if (isFriday(d.date) && min > 0) {
      hasFridayWork = true;
      if (d.fridayCompensated === true) fridayCompensated = true;
    }
    if (d.isRestDay === true || min === 0) restDayCount += 1;
  }

  // Effective weekly cap: prorate for Ramadan days (6h instead of 8h).
  const ramadanCap = limits.DAILY_MAX_RAMADAN;
  const regularCap = limits.DAILY_MAX_MINUTES;
  const effectiveCap =
    ramadanCap * ramadanDaysInWeek + regularCap * Math.max(0, 6 - ramadanDaysInWeek);
  if (totalMinutes > effectiveCap) {
    violations.push(VIOLATION_KINDS.WEEKLY_HOURS_EXCEEDED);
  }
  if (restDayCount === 0) {
    violations.push(VIOLATION_KINDS.MISSING_WEEKLY_REST);
  }
  if (hasFridayWork && !fridayCompensated) {
    violations.push(VIOLATION_KINDS.FRIDAY_WORK_UNCOMPENSATED);
  }
  return {
    violations,
    totalMinutes,
    weeklyCapMinutes: effectiveCap,
    restDayCount,
    ramadanDaysInWeek,
  };
}

/**
 * computeOvertimePay({regularHourlyRate, dailyOvertimeMinutes, fridayWorked})
 *   → { regularHours, overtimeHours, overtimePay, fridayPay }
 *
 * Pure pay-math helper. Service can call this to estimate the wage
 * impact of detected overtime — useful for the cost-control dashboard
 * (executive persona).
 */
function computeOvertimePay({
  regularHourlyRate,
  dailyOvertimeMinutes = 0,
  fridayWorkedMinutes = 0,
  limits = DEFAULT_LIMITS,
} = {}) {
  if (typeof regularHourlyRate !== 'number' || regularHourlyRate < 0) {
    return { ok: false, reason: 'INVALID_RATE' };
  }
  const otHours = dailyOvertimeMinutes / 60;
  const fridayHours = fridayWorkedMinutes / 60;
  const overtimePay = otHours * regularHourlyRate * limits.OVERTIME_MULTIPLIER;
  const fridayPay = fridayHours * regularHourlyRate * limits.FRIDAY_REST_MULTIPLIER;
  return {
    ok: true,
    overtimeHours: otHours,
    fridayHours,
    overtimePay,
    fridayPay,
    totalAdditionalPay: overtimePay + fridayPay,
  };
}

/**
 * classifyNitaqat({saudiCount, totalCount, sizeBand, industry}) →
 *   { band, pct, gapToNextBetter }
 *
 * sizeBand ∈ {small, medium, large, huge} (employee count bands).
 * industry default 'healthcare'. Returns the current band + the
 * Saudization percentage gap needed to reach the next-better band.
 */
function classifyNitaqat({
  saudiCount = 0,
  totalCount = 0,
  sizeBand = 'small',
  industry = 'healthcare',
  customTargets = null,
} = {}) {
  if (totalCount <= 0) {
    return {
      band: 'red',
      pct: 0,
      gapToNextBetter: null,
      reason: 'NO_EMPLOYEES',
    };
  }
  const key = `${industry}:${sizeBand}`;
  const targets = customTargets || NITAQAT_TARGETS[key];
  if (!targets) {
    return {
      band: 'red',
      pct: Math.round((saudiCount / totalCount) * 100),
      gapToNextBetter: null,
      reason: 'UNKNOWN_INDUSTRY_SIZE',
    };
  }
  const pct = (saudiCount / totalCount) * 100;
  let band;
  if (pct >= targets.platinum) band = 'platinum';
  else if (pct >= targets.green) band = 'green';
  else if (pct >= targets.yellow) band = 'yellow';
  else band = 'red';

  let gapToNextBetter = null;
  if (band === 'red') {
    gapToNextBetter = targets.yellow - pct;
  } else if (band === 'yellow') {
    gapToNextBetter = targets.green - pct;
  } else if (band === 'green') {
    gapToNextBetter = targets.platinum - pct;
  }
  return {
    band,
    pct: Math.round(pct * 10) / 10,
    gapToNextBetter: gapToNextBetter == null ? null : Math.round(gapToNextBetter * 10) / 10,
    targets,
  };
}

module.exports = {
  DEFAULT_LIMITS,
  VIOLATION_KINDS,
  NITAQAT_BANDS,
  NITAQAT_TARGETS,
  isRamadanDay,
  isFriday,
  checkDay,
  checkWeek,
  computeOvertimePay,
  classifyNitaqat,
};
