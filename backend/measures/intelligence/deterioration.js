'use strict';

/**
 * measures/intelligence/deterioration.js — W709 cross-measure deterioration
 * detector for clinical decision support.
 *
 * WHY this exists (the connective-tissue gap):
 *   The trend layer (measures/trend/*) already turns ONE measure's history into
 *   a trajectory classification. The scoring layer already exposes per-measure
 *   `delta` and `cutoff`. But nothing fused these ACROSS the measures attached
 *   to a single beneficiary into one decision-grade "is this person sliding?"
 *   signal that a deterioration dashboard or care-team alert can rank and act on.
 *   This library is that fusion point.
 *
 * Contract: PURE. No DB, no I/O, no clock. The caller resolves the beneficiary's
 * measures + their administration history from persistence and passes plain
 * data in. This module composes regression + classify and adds:
 *   • last-vs-previous delta in the *worsening* direction,
 *   • cutoff-crossing detection (entering the at-risk zone),
 *   • a per-measure severity + priority, and
 *   • a beneficiary-level roll-up (worst-of, with counts).
 *
 *   detectDeterioration({ measures, options? }) → {
 *     summary:  { status, priority, evaluated, declining, critical, insufficient },
 *     signals:  [ per-measure signal, sorted worst-first ],
 *     meta:     { measureCount, totalAdministrations }
 *   }
 *
 * It deliberately does NOT mutate any Episode of Care, Plan, or emit a
 * `measure.scored` event — those touch sensitive mutation paths and require a
 * product decision. Consumers read this signal and decide.
 */

const { fitLinear } = require('../trend/regression');
const { classify } = require('../trend/classify');

/** Per-measure deterioration severity, ordered worst → best. */
const SEVERITY = Object.freeze({
  CRITICAL: 'critical',
  CONCERN: 'concern',
  WATCH: 'watch',
  STABLE: 'stable',
  INSUFFICIENT: 'insufficient',
});

const SEVERITY_RANK = Object.freeze({
  critical: 4,
  concern: 3,
  watch: 2,
  stable: 1,
  insufficient: 0,
});

const STATUS_LABEL = Object.freeze({
  critical: { ar: 'تدهور حرج — تدخّل عاجل', en: 'Critical deterioration — urgent action' },
  concern: { ar: 'تدهور مؤكَّد — مراجعة الخطة', en: 'Confirmed decline — review the plan' },
  watch: { ar: 'مؤشّرات تراجع — متابعة لصيقة', en: 'Early decline signs — close monitoring' },
  stable: { ar: 'مستقر', en: 'Stable' },
  insufficient: { ar: 'بيانات غير كافية', en: 'Insufficient data' },
});

/** worsening sign: which direction of value change is BAD for this measure. */
function _worseningSign(direction) {
  // higher_better → a DROP (negative change) is worsening → sign +1 means
  // we negate change. We return the multiplier that makes "worsening" positive.
  return direction === 'lower_better' ? 1 : -1;
}

/**
 * Order administrations chronologically and return numeric values only.
 * @param {Array<{date:*,value:number}>} admins
 * @returns {{ ordered: Array, values: number[], spanDays: number|null }}
 */
function _prepare(admins) {
  const cleaned = (Array.isArray(admins) ? admins : [])
    .filter(a => a && a.date != null && Number.isFinite(a.value))
    .map(a => ({ t: new Date(a.date).getTime(), value: a.value, date: a.date }))
    .filter(a => Number.isFinite(a.t))
    .sort((a, b) => a.t - b.t);
  const spanDays =
    cleaned.length >= 2 ? (cleaned[cleaned.length - 1].t - cleaned[0].t) / 86400000 : null;
  return { ordered: cleaned, values: cleaned.map(a => a.value), spanDays };
}

/**
 * Evaluate ONE measure's history into a deterioration signal.
 *
 * @param {Object} measure
 * @param {string} measure.measureCode
 * @param {string} [measure.name_ar]
 * @param {string} [measure.name_en]
 * @param {string} measure.direction          'higher_better' | 'lower_better' | 'neutral'
 * @param {number} [measure.cutoff]           at-risk threshold (worse side)
 * @param {number} [measure.sdc]              smallest detectable change (per score unit)
 * @param {string} [measure.latestBandSeverity] severity of the latest interpreted band
 * @param {Array}  measure.administrations    [{ date, value }]
 * @param {Object} [options]
 * @returns {Object} signal
 */
function evaluateMeasure(measure, _options = {}) {
  const code = measure.measureCode;
  const direction = measure.direction || 'higher_better';
  const { ordered, spanDays } = _prepare(measure.administrations);
  const n = ordered.length;

  const base = {
    measureCode: code,
    name_ar: measure.name_ar || code,
    name_en: measure.name_en || code,
    direction,
    administrations: n,
    latestValue: n ? ordered[n - 1].value : null,
    previousValue: n >= 2 ? ordered[n - 2].value : null,
    latestBandSeverity: measure.latestBandSeverity || null,
    classification: null,
    slopePerMonth: null,
    r2: null,
    confidence: 'low',
    declining: false,
    cutoffCrossed: false,
    severity: SEVERITY.INSUFFICIENT,
    priority: 0,
    reasons: [],
  };

  if (direction === 'neutral') {
    base.severity = SEVERITY.INSUFFICIENT;
    base.reasons.push('neutral_direction_not_evaluated');
    return base;
  }

  if (n < 2) {
    base.reasons.push('need_at_least_two_administrations');
    return base;
  }

  const worsen = _worseningSign(direction);
  const latest = ordered[n - 1].value;
  const previous = ordered[n - 2].value;
  const stepChange = (latest - previous) * worsen; // > 0 means it got worse

  // Cutoff crossing into the at-risk zone (worse side of cutoff).
  if (Number.isFinite(measure.cutoff)) {
    const inRisk = v => (direction === 'lower_better' ? v >= measure.cutoff : v <= measure.cutoff);
    base.cutoffCrossed = !inRisk(previous) && inRisk(latest);
    if (base.cutoffCrossed) base.reasons.push('crossed_at_risk_cutoff');
  }

  // Reliable trend (needs ≥3 points). Compose the existing trend layer.
  let reliableRegression = false;
  if (n >= 3) {
    const t0 = ordered[0].t;
    const points = ordered.map(a => ({ x: (a.t - t0) / 86400000, y: a.value }));
    const fit = fitLinear(points);
    const cls = classify(fit, {
      direction,
      sdc: measure.sdc,
      spanDays: spanDays || undefined,
    });
    base.classification = cls.classification;
    base.slopePerMonth = cls.slopePerMonth;
    base.r2 = cls.r2;
    base.confidence = cls.confidence;
    reliableRegression = cls.classification === 'regression';
    if (reliableRegression) base.reasons.push('reliable_downward_trend');
    if (cls.classification === 'oscillation') base.reasons.push('unstable_oscillation');
  } else {
    base.reasons.push('trend_needs_three_administrations');
  }

  // Single-step worsening beyond noise (SDC when known, else any worsening).
  const noiseFloor = Number.isFinite(measure.sdc) ? measure.sdc : 0;
  const stepWorsening = stepChange > noiseFloor;
  if (stepWorsening) base.reasons.push('latest_administration_worse');

  // Latest band already flagged critical/severe by the scoring layer.
  const bandCritical =
    base.latestBandSeverity === 'critical' || base.latestBandSeverity === 'severe';

  // ── Severity fusion ──────────────────────────────────────────────
  let severity = SEVERITY.STABLE;
  if (reliableRegression && (base.cutoffCrossed || bandCritical)) {
    severity = SEVERITY.CRITICAL;
  } else if (reliableRegression || base.cutoffCrossed) {
    severity = SEVERITY.CONCERN;
  } else if (stepWorsening || base.classification === 'oscillation') {
    severity = SEVERITY.WATCH;
  }

  base.declining =
    severity === SEVERITY.CRITICAL || severity === SEVERITY.CONCERN || severity === SEVERITY.WATCH;
  base.severity = severity;
  base.priority =
    SEVERITY_RANK[severity] * 10 +
    (base.cutoffCrossed ? 3 : 0) +
    (bandCritical ? 2 : 0) +
    (reliableRegression ? 2 : 0);

  const rec = _recommend(severity);
  base.recommendation_ar = rec.ar;
  base.recommendation_en = rec.en;
  return base;
}

function _recommend(severity) {
  switch (severity) {
    case SEVERITY.CRITICAL:
      return {
        ar: 'إخطار الفريق العلاجي فورًا ومراجعة عاجلة لحلقة الرعاية والخطة العلاجية.',
        en: 'Notify the care team immediately and urgently review the episode of care and plan.',
      };
    case SEVERITY.CONCERN:
      return {
        ar: 'إدراج المستفيد في مراجعة الخطة القادمة وزيادة وتيرة القياس.',
        en: 'Add the beneficiary to the next plan review and increase measurement frequency.',
      };
    case SEVERITY.WATCH:
      return {
        ar: 'متابعة لصيقة وإعادة القياس قبل اتخاذ قرار سريري.',
        en: 'Monitor closely and re-measure before any clinical decision.',
      };
    default:
      return {
        ar: 'الاستمرار في الخطة الحالية والقياس الدوري المعتاد.',
        en: 'Continue the current plan and routine periodic measurement.',
      };
  }
}

/**
 * Roll a beneficiary's measures up into one deterioration picture.
 *
 * @param {Object} input
 * @param {Array}  input.measures   array of measure inputs (see evaluateMeasure)
 * @param {Object} [input.options]
 * @returns {Object} { summary, signals, meta }
 */
function detectDeterioration(input = {}) {
  const measures = Array.isArray(input.measures) ? input.measures : [];
  const options = input.options || {};

  const signals = measures
    .map(m => evaluateMeasure(m, options))
    .sort(
      (a, b) => b.priority - a.priority || SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
    );

  const evaluated = signals.filter(s => s.severity !== SEVERITY.INSUFFICIENT).length;
  const declining = signals.filter(s => s.declining).length;
  const critical = signals.filter(s => s.severity === SEVERITY.CRITICAL).length;
  const insufficient = signals.filter(s => s.severity === SEVERITY.INSUFFICIENT).length;

  let status = SEVERITY.STABLE;
  if (critical > 0) status = SEVERITY.CRITICAL;
  else if (signals.some(s => s.severity === SEVERITY.CONCERN)) status = SEVERITY.CONCERN;
  else if (signals.some(s => s.severity === SEVERITY.WATCH)) status = SEVERITY.WATCH;
  else if (evaluated === 0) status = SEVERITY.INSUFFICIENT;

  const priority =
    critical * 100 +
    signals.filter(s => s.severity === SEVERITY.CONCERN).length * 30 +
    signals.filter(s => s.severity === SEVERITY.WATCH).length * 10;

  const totalAdministrations = measures.reduce(
    (s, m) => s + (Array.isArray(m.administrations) ? m.administrations.length : 0),
    0
  );

  return {
    summary: {
      status,
      label_ar: STATUS_LABEL[status].ar,
      label_en: STATUS_LABEL[status].en,
      priority,
      evaluated,
      declining,
      critical,
      insufficient,
    },
    signals,
    meta: { measureCount: measures.length, totalAdministrations },
  };
}

module.exports = {
  SEVERITY,
  SEVERITY_RANK,
  evaluateMeasure,
  detectDeterioration,
};
