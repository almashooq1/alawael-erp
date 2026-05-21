'use strict';

/**
 * measureAdminAnomalyDetector.service.js — §11 carve-out from
 * docs/blueprint/36-future-intelligence-layer.md.
 *
 * Pure rule-based anomaly detection for MeasureApplication records.
 * No ML, no clinical recommendation — only data-quality flags surfaced
 * for human review.
 *
 * Scope discipline (this is the WHOLE point of §11):
 *   - Detector is pure: ({ admin, measure }) → flags[]
 *   - No I/O, no DB lookups, no schema field added yet
 *   - Not wired to MeasureApplication pre-save hook — that is a
 *     separate integration decision the team makes when ready
 *   - Returns an array of flag objects; consumers decide what to do
 *     with them (warn / require ack / block save)
 *
 * What it does NOT do:
 *   - Does NOT claim "data is wrong" — it claims "this LOOKS like
 *     a data-quality concern, please verify"
 *   - Does NOT replace W211 baseline lock or correction workflow
 *   - Does NOT replace assessor-bias detection (that needs cohort
 *     statistics, deferred per docs/blueprint/36 §3.10)
 *
 * Anomaly types (intentionally limited to 5 high-signal rules):
 *   - IMPOSSIBLY_FAST_ADMIN
 *   - DURATION_IMPLAUSIBLY_LONG
 *   - OUT_OF_RANGE_SCORE
 *   - IMPLAUSIBLE_DELTA (vs frozen SDC at admin time)
 *   - PATTERN_FILLING_HOMOGENEOUS
 *
 * Each flag carries: { type, severity, evidence_ar, evidence_en, fields }.
 * Severity is informational only — UI/service consumers decide policy.
 */

const SEVERITY = Object.freeze({ LOW: 'low', MEDIUM: 'medium', HIGH: 'high' });

const FAST_ADMIN_FLOOR_MINUTES = 5;
const FAST_ADMIN_EXPECTED_FLOOR = 30;
const LONG_ADMIN_RATIO = 3;
const IMPLAUSIBLE_DELTA_SDC_MULTIPLE = 10;
const HOMOGENEOUS_MIN_ITEMS = 5;

/**
 * @typedef {Object} AnomalyFlag
 * @property {string} type
 * @property {'low'|'medium'|'high'} severity
 * @property {string} evidence_ar
 * @property {string} evidence_en
 * @property {Object} fields - structured evidence for downstream processing
 */

/**
 * @param {Object} input
 * @param {Object} input.admin    - MeasureApplication-shaped (lean or doc)
 * @param {Object} input.measure  - Measure-shaped (lean)
 * @returns {AnomalyFlag[]}
 */
function detectAnomalies({ admin, measure }) {
  if (!admin || typeof admin !== 'object') return [];
  if (!measure || typeof measure !== 'object') return [];

  const flags = [];

  const fast = checkImpossiblyFast(admin, measure);
  if (fast) flags.push(fast);

  const long = checkImplausiblyLong(admin, measure);
  if (long) flags.push(long);

  const range = checkOutOfRange(admin, measure);
  if (range) flags.push(range);

  const delta = checkImplausibleDelta(admin);
  if (delta) flags.push(delta);

  const homogeneous = checkPatternFilling(admin);
  if (homogeneous) flags.push(homogeneous);

  return flags;
}

// ─── Individual rules ─────────────────────────────────────────────────

function checkImpossiblyFast(admin, measure) {
  const dur = numericOrNull(admin.duration);
  const expected = numericOrNull(measure.administrationTime);
  if (dur == null || expected == null) return null;
  if (dur < FAST_ADMIN_FLOOR_MINUTES && expected >= FAST_ADMIN_EXPECTED_FLOOR) {
    return {
      type: 'IMPOSSIBLY_FAST_ADMIN',
      severity: SEVERITY.MEDIUM,
      evidence_ar: `مدّة التطبيق ${dur} دقيقة بينما المتوقع ≥ ${expected} دقيقة — يُرجى التحقق.`,
      evidence_en: `duration=${dur}min, expected≥${expected}min`,
      fields: { actualMinutes: dur, expectedMinutes: expected },
    };
  }
  return null;
}

function checkImplausiblyLong(admin, measure) {
  const dur = numericOrNull(admin.duration);
  const expected = numericOrNull(measure.administrationTime);
  if (dur == null || expected == null || expected === 0) return null;
  if (dur > expected * LONG_ADMIN_RATIO) {
    return {
      type: 'DURATION_IMPLAUSIBLY_LONG',
      severity: SEVERITY.LOW,
      evidence_ar: `مدّة التطبيق ${dur} دقيقة (أكثر من ${LONG_ADMIN_RATIO}× المتوقع ${expected} دقيقة).`,
      evidence_en: `duration=${dur}min, expected~${expected}min, ratio=${(dur / expected).toFixed(1)}`,
      fields: { actualMinutes: dur, expectedMinutes: expected, ratio: dur / expected },
    };
  }
  return null;
}

function checkOutOfRange(admin, measure) {
  const score = numericOrNull(admin.totalRawScore);
  const min = numericOrNull(measure.minScore);
  const max = numericOrNull(measure.maxScore);
  if (score == null || min == null || max == null) return null;
  if (score < min || score > max) {
    return {
      type: 'OUT_OF_RANGE_SCORE',
      severity: SEVERITY.HIGH,
      evidence_ar: `الدرجة الإجمالية ${score} خارج النطاق المسموح [${min}، ${max}].`,
      evidence_en: `totalRawScore=${score}, range=[${min}, ${max}]`,
      fields: { score, min, max },
    };
  }
  return null;
}

function checkImplausibleDelta(admin) {
  const change = numericOrNull(admin.comparison && admin.comparison.changeFromBaseline);
  const sdc = numericOrNull(admin.sdcAtAdministration && admin.sdcAtAdministration.value);
  if (change == null || sdc == null || sdc <= 0) return null;
  const absChange = Math.abs(change);
  const threshold = IMPLAUSIBLE_DELTA_SDC_MULTIPLE * sdc;
  if (absChange > threshold) {
    return {
      type: 'IMPLAUSIBLE_DELTA',
      severity: SEVERITY.HIGH,
      evidence_ar: `تغيّر الدرجة عن الأساس ${change.toFixed(1)} (يتجاوز ${IMPLAUSIBLE_DELTA_SDC_MULTIPLE}× SDC = ${threshold.toFixed(1)}) — تحقّق من الإدخال.`,
      evidence_en: `|delta|=${absChange.toFixed(1)} > ${IMPLAUSIBLE_DELTA_SDC_MULTIPLE}×SDC (${threshold.toFixed(1)})`,
      fields: { changeFromBaseline: change, sdc, threshold },
    };
  }
  return null;
}

function checkPatternFilling(admin) {
  const allItems = collectItemScores(admin);
  if (allItems.length < HOMOGENEOUS_MIN_ITEMS) return null;
  const first = allItems[0];
  const allSame = allItems.every(v => v === first);
  if (!allSame) return null;
  return {
    type: 'PATTERN_FILLING_HOMOGENEOUS',
    severity: SEVERITY.MEDIUM,
    evidence_ar: `جميع البنود الـ${allItems.length} حصلت على نفس الدرجة (${first}) — قد يدل على إدخال غير متأنّي.`,
    evidence_en: `all ${allItems.length} items scored ${first}`,
    fields: { itemCount: allItems.length, sharedValue: first },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function numericOrNull(v) {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function collectItemScores(admin) {
  const out = [];
  if (!Array.isArray(admin.domainScores)) return out;
  for (const d of admin.domainScores) {
    if (!d || !Array.isArray(d.itemScores)) continue;
    for (const it of d.itemScores) {
      const n = numericOrNull(it && it.rawScore);
      if (n != null) out.push(n);
    }
  }
  return out;
}

module.exports = {
  detectAnomalies,
  SEVERITY,
  // exported for tests + future tuning
  THRESHOLDS: Object.freeze({
    FAST_ADMIN_FLOOR_MINUTES,
    FAST_ADMIN_EXPECTED_FLOOR,
    LONG_ADMIN_RATIO,
    IMPLAUSIBLE_DELTA_SDC_MULTIPLE,
    HOMOGENEOUS_MIN_ITEMS,
  }),
};
