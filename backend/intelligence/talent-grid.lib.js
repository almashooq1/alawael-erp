/**
 * talent-grid.lib.js — pure 9-box talent-matrix logic (W1198).
 *
 * The 9-box places each employee on a Performance × Potential grid (each axis
 * low/medium/high = band 1/2/3). Performance is data-derivable from the latest
 * PerformanceEvaluation; potential is a manager judgement (there is no objective
 * "potential" signal — that's why the box is a REVIEW, not an auto-classification).
 *
 * All functions are pure (no DB, no Date). Box numbering follows the common
 * HR convention with box 1 = bottom-left (low perf / low potential) increasing
 * left→right then bottom→top, so box 9 = top-right (high perf / high potential):
 *
 *        potential →   low(1)  med(2)  high(3)
 *   perf high(3)         7       8       9
 *   perf med(2)          4       5       6
 *   perf low(1)          1       2       3
 */

'use strict';

const BANDS = Object.freeze({ LOW: 1, MEDIUM: 2, HIGH: 3 });

// Arabic 5-point overallRating → performance band.
const RATING_TO_BAND = Object.freeze({
  ممتاز: 3,
  'جيد جداً': 3,
  جيد: 2,
  مقبول: 1,
  ضعيف: 1,
});

// box → canonical talent segment label (en + ar).
const SEGMENTS = Object.freeze({
  9: { key: 'star', en: 'Star', ar: 'نجم' },
  8: { key: 'high_potential', en: 'High Potential', ar: 'إمكانات عالية' },
  7: { key: 'high_professional', en: 'High Professional', ar: 'محترف متميز' },
  6: { key: 'rising_star', en: 'Rising Star', ar: 'نجم صاعد' },
  5: { key: 'core_player', en: 'Core Player', ar: 'لاعب أساسي' },
  4: { key: 'solid_professional', en: 'Solid Professional', ar: 'محترف ثابت' },
  3: { key: 'enigma', en: 'Enigma / Potential Gem', ar: 'إمكانات غير مستغلة' },
  2: { key: 'inconsistent', en: 'Inconsistent Player', ar: 'لاعب متذبذب' },
  1: { key: 'underperformer', en: 'Underperformer', ar: 'ضعيف الأداء' },
});

// high-level action group per box (the "so what")
const ACTION_GROUP = Object.freeze({
  9: 'develop_retain', 8: 'develop_retain', 6: 'develop_retain', // top-right cluster
  7: 'leverage', 5: 'leverage', 3: 'develop', // diagonal / observe
  4: 'observe', 2: 'improve', 1: 'manage_out', // bottom-left cluster
});

function clampBand(n) {
  const v = Math.round(Number(n));
  if (v <= BANDS.LOW) return BANDS.LOW;
  if (v >= BANDS.HIGH) return BANDS.HIGH;
  return v;
}

/** Derive a performance band (1-3) from an evaluation's rating and/or 1-5 score. */
function performanceBand({ overallRating, overallScore } = {}) {
  if (overallRating && RATING_TO_BAND[overallRating]) return RATING_TO_BAND[overallRating];
  if (Number.isFinite(Number(overallScore))) {
    const s = Number(overallScore);
    if (s >= 4) return BANDS.HIGH;
    if (s >= 3) return BANDS.MEDIUM;
    if (s > 0) return BANDS.LOW;
  }
  return null; // not derivable → caller must supply a manual band
}

/** box 1-9 from perf + potential bands (1-3 each). */
function boxOf(perfBand, potentialBand) {
  const p = clampBand(perfBand);
  const q = clampBand(potentialBand);
  return (p - 1) * 3 + q; // perf row offset + potential column
}

function segmentOf(box) {
  return SEGMENTS[box] || null;
}

function actionGroupOf(box) {
  return ACTION_GROUP[box] || null;
}

const HIPO_BOXES = Object.freeze([6, 8, 9]); // high potential (top-right cluster)
const RISK_BOXES = Object.freeze([1, 2, 4]); // low-perf / low-potential cluster

function isHiPo(box) {
  return HIPO_BOXES.includes(box);
}
function isRisk(box) {
  return RISK_BOXES.includes(box);
}

/**
 * Aggregate a set of reviews `[{ box, ... }]` into a grid distribution + segment
 * counts + hiPo / risk rates. Reviews without a valid box are ignored.
 */
function buildGrid(reviews) {
  const counts = {};
  for (let b = 1; b <= 9; b++) counts[b] = 0;
  let total = 0;
  let hipo = 0;
  let risk = 0;
  for (const r of reviews || []) {
    const b = r && Number(r.box);
    if (!(b >= 1 && b <= 9)) continue;
    counts[b]++;
    total++;
    if (isHiPo(b)) hipo++;
    if (isRisk(b)) risk++;
  }
  const segments = {};
  for (let b = 1; b <= 9; b++) {
    if (counts[b]) segments[SEGMENTS[b].key] = counts[b];
  }
  const pct = n => (total ? Math.round((n / total) * 1000) / 10 : 0);
  return {
    total,
    counts, // box → headcount
    segments, // segment key → headcount
    hiPo: { count: hipo, ratePct: pct(hipo) },
    risk: { count: risk, ratePct: pct(risk) },
  };
}

module.exports = {
  BANDS,
  RATING_TO_BAND,
  SEGMENTS,
  HIPO_BOXES,
  RISK_BOXES,
  clampBand,
  performanceBand,
  boxOf,
  segmentOf,
  actionGroupOf,
  isHiPo,
  isRisk,
  buildGrid,
};
