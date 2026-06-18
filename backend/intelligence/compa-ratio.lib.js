'use strict';

/**
 * compa-ratio.lib.js — pure compa-ratio math for pay-equity (W1385).
 *
 * compa-ratio = actual salary ÷ the MIDPOINT of the pay band the employee's ROLE
 * maps to. <1 = paid below the band midpoint, 1 = at midpoint, >1 = above. It is
 * the standard "is this person paid fairly for their grade" lens that the W1193
 * pay-equity analysis lacked (it had only demographic gaps + cohort outliers).
 *
 * Deliberately role-based, never salary-inferred: the band must come from the
 * employee's job→band mapping, NOT from "which band's range contains this salary"
 * (that would put everyone inside their band by construction and could never
 * reveal under-payment). When an employee has no mapping or the band has no
 * midpoint, compa-ratio is null and the employee is simply excluded — never
 * coerced, never guessed.
 *
 * No DB, no Date, no I/O — unit-testable in isolation.
 */

const DEFAULT_BELOW = 0.8; // < 80% of midpoint → underpaid for the band
const DEFAULT_ABOVE = 1.2; // > 120% of midpoint → above the band

const BANDS = Object.freeze({
  below: { key: 'below', ar: 'أقل من النطاق' },
  within: { key: 'within', ar: 'ضمن النطاق' },
  above: { key: 'above', ar: 'أعلى من النطاق' },
});

function round(n, dp = 2) {
  if (!Number.isFinite(n)) return null;
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** compa-ratio = salary / midSalary, or null when either input is unusable. */
function compaRatio(salary, midSalary) {
  const s = Number(salary);
  const m = Number(midSalary);
  if (!Number.isFinite(s) || s <= 0) return null;
  if (!Number.isFinite(m) || m <= 0) return null;
  return round(s / m, 3);
}

/** Classify a compa-ratio into below / within / above the band. */
function classifyCompaRatio(ratio, { belowThreshold = DEFAULT_BELOW, aboveThreshold = DEFAULT_ABOVE } = {}) {
  if (!Number.isFinite(ratio)) return null;
  if (ratio < belowThreshold) return BANDS.below;
  if (ratio > aboveThreshold) return BANDS.above;
  return BANDS.within;
}

/** Median of a numeric array (sorted copy), or null when empty. */
function median(values) {
  const xs = (values || []).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const mid = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[mid] : round((xs[mid - 1] + xs[mid]) / 2, 3);
}

/**
 * Aggregate compa-ratio stats over entries that HAVE a numeric compaRatio.
 * @param {Array<{compaRatio:number}>} entries
 * Returns counts/percentages + median; `belowPct` is the equity-risk signal
 * (share of mapped employees paid below their band midpoint threshold).
 */
function compaRatioStats(entries, opts = {}) {
  const belowThreshold = opts.belowThreshold ?? DEFAULT_BELOW;
  const aboveThreshold = opts.aboveThreshold ?? DEFAULT_ABOVE;
  const rated = (entries || []).filter((e) => e && Number.isFinite(e.compaRatio));
  let below = 0;
  let within = 0;
  let above = 0;
  for (const e of rated) {
    const c = classifyCompaRatio(e.compaRatio, { belowThreshold, aboveThreshold });
    if (c === BANDS.below) below += 1;
    else if (c === BANDS.above) above += 1;
    else within += 1;
  }
  const n = rated.length;
  return {
    rated: n,
    belowCount: below,
    withinCount: within,
    aboveCount: above,
    belowPct: n ? round((below / n) * 100, 1) : 0,
    withinPct: n ? round((within / n) * 100, 1) : 0,
    abovePct: n ? round((above / n) * 100, 1) : 0,
    medianCompaRatio: median(rated.map((e) => e.compaRatio)),
    thresholds: { below: belowThreshold, above: aboveThreshold },
  };
}

module.exports = {
  DEFAULT_BELOW,
  DEFAULT_ABOVE,
  BANDS,
  round,
  compaRatio,
  classifyCompaRatio,
  median,
  compaRatioStats,
};
