/**
 * pay-equity.lib.js — pure pay-equity statistics (W1193).
 *
 * Data-driven demographic pay-gap + cohort-outlier analysis. ALL functions are
 * pure (no DB, no mongoose, no Date.now): given an array of plain employee rows
 * `{ gender, nationality, salary, department, jobTitle }` they return metrics.
 * The service layer is responsible for loading the (branch-scoped) rows and
 * mapping `total_salary` → `salary`.
 *
 * Definitions (kept deliberately simple + explainable — this drives compliance
 * conversations, so each number must be defensible):
 *   - median pay gap %  = (refMedian - groupMedian) / refMedian * 100, where the
 *     reference group is the higher-paid one (gap is always reported as the
 *     disadvantaged group's shortfall, sign carried in `direction`).
 *   - cohort outlier    = an employee whose salary is below
 *     cohortMedian * (1 - thresholdPct/100) within their cohort (department, or
 *     department+jobTitle when `byTitle`), cohort size ≥ MIN_COHORT.
 *   - equityScore (0-100) = 100 minus weighted penalties for the gender gap, the
 *     nationality gap, and the outlier rate. Higher = more equitable.
 */

'use strict';

const MIN_GROUP = 3; // never report a gap on a group smaller than this (privacy + noise)
const MIN_COHORT = 4; // never flag an outlier in a cohort smaller than this
const DEFAULT_OUTLIER_PCT = 20; // >20% below cohort median = flagged

function isValidSalary(v) {
  // reject null/undefined/'' BEFORE Number() — `Number(null)===0` and `null>=0`
  // would otherwise leak a missing salary in as 0, dragging medians + faking
  // outliers. Only a real, finite, non-negative number counts.
  if (v === null || v === undefined || v === '') return false;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0;
}

function toNumbers(arr) {
  return arr.filter(isValidSalary).map(Number);
}

function mean(values) {
  const v = toNumbers(values);
  if (!v.length) return null;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

function median(values) {
  const v = toNumbers(values).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

function round(n, dp = 2) {
  if (n == null || !Number.isFinite(n)) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/**
 * Two-group pay gap. Returns null `gapPct` when either group is below MIN_GROUP
 * so we never publish a gap that doubles as a re-identification vector.
 */
function twoGroupGap(rows, classify, labelA, labelB) {
  const a = rows.filter(r => classify(r) === labelA).map(r => r.salary);
  const b = rows.filter(r => classify(r) === labelB).map(r => r.salary);
  const out = {
    [`${labelA}Count`]: a.length,
    [`${labelB}Count`]: b.length,
    [`${labelA}Median`]: round(median(a)),
    [`${labelB}Median`]: round(median(b)),
    [`${labelA}Mean`]: round(mean(a)),
    [`${labelB}Mean`]: round(mean(b)),
    medianGapPct: null,
    meanGapPct: null,
    direction: null, // which label is disadvantaged (lower median)
    reportable: false,
  };
  if (a.length < MIN_GROUP || b.length < MIN_GROUP) return out;
  const ma = median(a);
  const mb = median(b);
  const ref = Math.max(ma, mb);
  out.medianGapPct = ref ? round((Math.abs(ma - mb) / ref) * 100) : 0;
  const xa = mean(a);
  const xb = mean(b);
  const refMean = Math.max(xa, xb);
  out.meanGapPct = refMean ? round((Math.abs(xa - xb) / refMean) * 100) : 0;
  out.direction = ma < mb ? labelA : ma > mb ? labelB : 'equal';
  out.reportable = true;
  return out;
}

/** Gender gap (male vs female). */
function computeGenderGap(rows) {
  return twoGroupGap(rows, r => r.gender, 'male', 'female');
}

/**
 * Nationality gap (Saudi vs non-Saudi). Saudi = nationality 'SA' / 'SAU' /
 * 'saudi' (case-insensitive); everything else is non-Saudi. Relevant to the
 * Nitaqat/Saudization context where Saudi vs expat pay parity is scrutinised.
 */
function isSaudi(nationality) {
  const n = String(nationality || '')
    .trim()
    .toLowerCase();
  return n === 'sa' || n === 'sau' || n === 'saudi' || n === 'ksa' || n === 'السعودية';
}
function computeNationalityGap(rows) {
  return twoGroupGap(
    rows,
    r => (isSaudi(r.nationality) ? 'saudi' : 'nonSaudi'),
    'saudi',
    'nonSaudi'
  );
}

/**
 * Cohort outliers — employees paid > thresholdPct below the median of their
 * cohort. Cohort = department (or department + jobTitle when byTitle), size must
 * be ≥ MIN_COHORT. Returns the flagged rows annotated with cohort context.
 */
function findCohortOutliers(rows, { thresholdPct = DEFAULT_OUTLIER_PCT, byTitle = false } = {}) {
  const key = r =>
    byTitle ? `${r.department || '?'}|${r.jobTitle || '?'}` : `${r.department || '?'}`;
  const cohorts = new Map();
  for (const r of rows) {
    const k = key(r);
    if (!cohorts.has(k)) cohorts.set(k, []);
    cohorts.get(k).push(r);
  }
  const flagged = [];
  for (const [k, members] of cohorts) {
    if (members.length < MIN_COHORT) continue;
    const med = median(members.map(m => m.salary));
    if (!med) continue;
    const floor = med * (1 - thresholdPct / 100);
    for (const m of members) {
      if (Number(m.salary) < floor) {
        flagged.push({
          ...m,
          cohort: k,
          cohortMedian: round(med),
          shortfallPct: round(((med - m.salary) / med) * 100),
        });
      }
    }
  }
  return flagged.sort((a, b) => b.shortfallPct - a.shortfallPct);
}

/**
 * Composite equity score 0-100. Penalises the larger of mean/median gender gap,
 * the nationality gap, and the outlier rate. Weights chosen so a "clean" payroll
 * (no reportable gaps, no outliers) scores 100 and each 10pp of gap costs ~10
 * points. Clamped to [0,100].
 */
function computeEquityScore({ genderGap, nationalityGap, outlierRatePct }) {
  const gapOf = g => (g && g.reportable ? Math.max(g.medianGapPct || 0, g.meanGapPct || 0) : 0);
  const gender = gapOf(genderGap);
  const nat = gapOf(nationalityGap);
  const penalty = gender * 1.0 + nat * 1.0 + (outlierRatePct || 0) * 0.5;
  return round(Math.max(0, Math.min(100, 100 - penalty)), 1);
}

/**
 * Full analysis over a set of employee rows. `rows` must already be the in-scope
 * (branch-filtered, active) set with `salary` populated.
 */
function analyzePayEquity(rows, opts = {}) {
  const clean = (rows || []).filter(r => r && isValidSalary(r.salary));
  const genderGap = computeGenderGap(clean);
  const nationalityGap = computeNationalityGap(clean);
  const outliers = findCohortOutliers(clean, opts);
  const outlierRatePct = clean.length ? round((outliers.length / clean.length) * 100) : 0;
  const equityScore = computeEquityScore({ genderGap, nationalityGap, outlierRatePct });
  return {
    headcount: clean.length,
    genderGap,
    nationalityGap,
    cohortOutliers: {
      count: outliers.length,
      ratePct: outlierRatePct,
      thresholdPct: opts.thresholdPct || DEFAULT_OUTLIER_PCT,
      byTitle: !!opts.byTitle,
    },
    equityScore,
    flagged: outliers,
  };
}

module.exports = {
  MIN_GROUP,
  MIN_COHORT,
  DEFAULT_OUTLIER_PCT,
  mean,
  median,
  round,
  twoGroupGap,
  isSaudi,
  computeGenderGap,
  computeNationalityGap,
  findCohortOutliers,
  computeEquityScore,
  analyzePayEquity,
};
