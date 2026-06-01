'use strict';

/**
 * psychometrics/reliable-change.js — W694 Reliable Change Index (RCI) +
 * Jacobson-Truax clinical-significance classification.
 *
 * WHY this exists (the measurement gap):
 *   A raw score change between two administrations can be REAL improvement or
 *   just measurement noise. MCID/SDC bands (already in the trend layer) answer
 *   "is the change clinically meaningful?". The RCI answers the prior,
 *   statistical question: "is the change larger than the test's own error?"
 *
 *   RCI (Jacobson & Truax, 1991):
 *       Sdiff = SD_baseline * sqrt(2 * (1 - r_xx))
 *       RCI   = (x2 - x1) / Sdiff
 *   where r_xx is the test-retest reliability of the instrument. |RCI| > 1.96
 *   means the change is reliable at p < .05 (less than 5% chance of being noise).
 *
 *   Jacobson-Truax also classifies whether the person crossed a clinical
 *   cut-off (functional vs dysfunctional range), yielding the four standard
 *   outcome categories: recovered / improved / unchanged / deteriorated.
 *
 * No DB, no I/O. The reliability (r_xx), baseline SD, and clinical cut-off come
 * from the instrument's published psychometrics; this module never invents
 * them — it computes only when they are supplied.
 */

const RCI_CRITICAL_95 = 1.96; // two-tailed p < .05

const OUTCOMES = Object.freeze({
  RECOVERED: 'recovered', // reliable change AND crossed cut-off into functional range
  IMPROVED: 'improved', // reliable change toward better, did not cross cut-off
  UNCHANGED: 'unchanged', // change within measurement error
  DETERIORATED: 'deteriorated', // reliable change toward worse
});

function isFiniteNum(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Standard error of the difference.
 *   Sdiff = SD * sqrt(2 * (1 - r))
 * @param {number} sdBaseline baseline standard deviation of the norm group
 * @param {number} reliability test-retest reliability r_xx in [0,1)
 * @returns {number|null}
 */
function sdiff(sdBaseline, reliability) {
  if (!isFiniteNum(sdBaseline) || sdBaseline <= 0) return null;
  if (!isFiniteNum(reliability) || reliability < 0 || reliability >= 1) return null;
  return sdBaseline * Math.sqrt(2 * (1 - reliability));
}

/**
 * Reliable Change Index.
 * @param {number} x1 baseline score
 * @param {number} x2 follow-up score
 * @param {{ sdBaseline:number, reliability:number }} psy
 * @returns {{ rci:number, sdiff:number, reliable:boolean }|null}
 */
function rci(x1, x2, psy) {
  if (!isFiniteNum(x1) || !isFiniteNum(x2) || !psy) return null;
  const sd = sdiff(psy.sdBaseline, psy.reliability);
  if (sd == null || sd === 0) return null;
  const value = (x2 - x1) / sd;
  return {
    rci: Math.round(value * 100) / 100,
    sdiff: Math.round(sd * 100) / 100,
    reliable: Math.abs(value) >= RCI_CRITICAL_95,
  };
}

/**
 * Full Jacobson-Truax classification.
 *
 * @param {number} x1 baseline
 * @param {number} x2 follow-up
 * @param {Object} psy
 * @param {number} psy.sdBaseline
 * @param {number} psy.reliability
 * @param {'higher_better'|'lower_better'} [psy.direction='higher_better']
 * @param {number} [psy.clinicalCutoff]  score separating dysfunctional/functional
 * @returns {{ outcome:string, rci:number, reliable:boolean, sdiff:number,
 *            crossedCutoff:boolean, improvedDirection:boolean }|null}
 */
function classify(x1, x2, psy) {
  const base = rci(x1, x2, psy);
  if (!base) return null;
  const direction = psy.direction === 'lower_better' ? 'lower_better' : 'higher_better';
  const rawDelta = x2 - x1;
  // "improved" means moved in the instrument's better direction.
  const improvedDirection = direction === 'lower_better' ? rawDelta < 0 : rawDelta > 0;

  let crossedCutoff = false;
  if (isFiniteNum(psy.clinicalCutoff)) {
    const cut = psy.clinicalCutoff;
    if (direction === 'higher_better') {
      crossedCutoff = x1 < cut && x2 >= cut; // moved up into functional range
    } else {
      crossedCutoff = x1 > cut && x2 <= cut; // moved down into functional range
    }
  }

  let outcome;
  if (!base.reliable) {
    outcome = OUTCOMES.UNCHANGED;
  } else if (!improvedDirection) {
    outcome = OUTCOMES.DETERIORATED;
  } else if (crossedCutoff) {
    outcome = OUTCOMES.RECOVERED;
  } else {
    outcome = OUTCOMES.IMPROVED;
  }

  return {
    outcome,
    rci: base.rci,
    reliable: base.reliable,
    sdiff: base.sdiff,
    crossedCutoff,
    improvedDirection,
  };
}

module.exports = {
  RCI_CRITICAL_95,
  OUTCOMES,
  sdiff,
  rci,
  classify,
};
