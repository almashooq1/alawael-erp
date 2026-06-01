'use strict';

/**
 * psychometrics/norms.js — W694 normative score conversions.
 *
 * Pure conversions between a raw/derived score and the standard normative
 * metrics clinicians read: z-score, T-score, percentile, scaled score,
 * standard (deviation IQ) score. Given a normative reference {mean, sd} for
 * the relevant age band, these turn an absolute number into "where does this
 * child sit relative to the norm group".
 *
 * No DB, no I/O — deterministic math. The normative {mean, sd} come from the
 * Measure's published norms (stored on the catalog/admin record); this module
 * never invents norms, it only converts when norms are supplied.
 *
 * Conventions:
 *   z-score        mean 0,   sd 1
 *   T-score        mean 50,  sd 10   (common for behavior/symptom scales)
 *   scaled score   mean 10,  sd 3    (subtest-level)
 *   standard score mean 100, sd 15   (composite / IQ-type)
 *   percentile     0–100 via the standard-normal CDF
 */

/** Standard-normal CDF via the Abramowitz & Stegun 7.1.26 erf approximation. */
function normalCdf(z) {
  // erf approximation, |error| < 1.5e-7
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}

function isFiniteNum(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * z = (raw - mean) / sd
 * @param {number} raw
 * @param {{mean:number, sd:number}} norm
 * @returns {number|null}
 */
function zScore(raw, norm) {
  if (
    !isFiniteNum(raw) ||
    !norm ||
    !isFiniteNum(norm.mean) ||
    !isFiniteNum(norm.sd) ||
    norm.sd <= 0
  ) {
    return null;
  }
  return (raw - norm.mean) / norm.sd;
}

/** Generic standardiser: target distribution {mean, sd} from a z-score. */
function fromZ(z, targetMean, targetSd) {
  if (!isFiniteNum(z)) return null;
  return targetMean + z * targetSd;
}

/** T-score (mean 50, sd 10), rounded to integer. */
function tScore(raw, norm) {
  const z = zScore(raw, norm);
  if (z == null) return null;
  return Math.round(fromZ(z, 50, 10));
}

/** Scaled score (mean 10, sd 3), rounded, clamped to the conventional 1–19. */
function scaledScore(raw, norm) {
  const z = zScore(raw, norm);
  if (z == null) return null;
  return Math.max(1, Math.min(19, Math.round(fromZ(z, 10, 3))));
}

/** Standard / deviation-IQ score (mean 100, sd 15), rounded. */
function standardScore(raw, norm) {
  const z = zScore(raw, norm);
  if (z == null) return null;
  return Math.round(fromZ(z, 100, 15));
}

/**
 * Percentile rank (0.1–99.9) from a raw score + norm. `direction` controls
 * which tail is "better": for higher_better instruments a high raw → high
 * percentile; for lower_better (symptom severity) we invert so a high
 * percentile always means "better functioning / fewer symptoms".
 *
 * @param {number} raw
 * @param {{mean:number, sd:number}} norm
 * @param {'higher_better'|'lower_better'|'neutral'} [direction='higher_better']
 * @returns {number|null}
 */
function percentile(raw, norm, direction = 'higher_better') {
  const z = zScore(raw, norm);
  if (z == null) return null;
  let p = normalCdf(z) * 100;
  if (direction === 'lower_better') p = 100 - p;
  // Clamp away from exact 0/100 — published norm tables cap at 0.1/99.9.
  return Math.max(0.1, Math.min(99.9, Math.round(p * 10) / 10));
}

/** Coarse normative band for narrative use. */
function normativeBand(z, direction = 'higher_better') {
  if (!isFiniteNum(z)) return null;
  const adj = direction === 'lower_better' ? -z : z;
  if (adj >= 1.5) return 'well_above_average';
  if (adj >= 0.5) return 'above_average';
  if (adj > -0.5) return 'average';
  if (adj > -1.5) return 'below_average';
  return 'well_below_average';
}

/**
 * Convert a raw score into the full normative profile in one call.
 * @returns {{z:number, t:number, percentile:number, standardScore:number,
 *            scaledScore:number, band:string}|null}
 */
function profile(raw, norm, direction = 'higher_better') {
  const z = zScore(raw, norm);
  if (z == null) return null;
  return {
    z: Math.round(z * 100) / 100,
    t: tScore(raw, norm),
    percentile: percentile(raw, norm, direction),
    standardScore: standardScore(raw, norm),
    scaledScore: scaledScore(raw, norm),
    band: normativeBand(z, direction),
  };
}

module.exports = {
  normalCdf,
  zScore,
  fromZ,
  tScore,
  scaledScore,
  standardScore,
  percentile,
  normativeBand,
  profile,
};
