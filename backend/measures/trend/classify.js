'use strict';

/**
 * classify.js — Wave 219 trajectory classifier.
 *
 * Turns a slope+CI fit (from regression.js) into a clinical
 * classification a therapist can act on. Output codes are stable —
 * the W220 Alert Engine consumes them; the W221 dashboards display
 * them. Don't rename without bumping callers.
 *
 * Classifications:
 *   - insufficient_data      : <3 admins, or fit returned null
 *   - linear_improvement     : slope in "good" direction + R² ≥ 0.5
 *   - slow_improvement       : good direction but R² < 0.5 (noisy)
 *   - plateau                : CI95 includes 0 across recent window
 *                              AND magnitude vs SDC is tiny
 *   - regression             : slope in "bad" direction with CI not
 *                              crossing 0 (statistically reliable
 *                              backslide)
 *   - oscillation            : CI95 wide enough that direction
 *                              can't be claimed; usually means
 *                              measurement error (rater drift) or
 *                              actual clinical instability
 */

const CLASSIFICATIONS = Object.freeze({
  INSUFFICIENT: 'insufficient_data',
  LINEAR_IMPROVEMENT: 'linear_improvement',
  SLOW_IMPROVEMENT: 'slow_improvement',
  PLATEAU: 'plateau',
  REGRESSION: 'regression',
  OSCILLATION: 'oscillation',
});

function _improvedSign(direction) {
  // Direction defaults to higher_better when unspecified — the
  // engine's most common case.
  if (direction === 'lower_better') return -1;
  return 1;
}

/**
 * @param {Object|null} fit         — regression.fitLinear output
 * @param {Object}      opts
 * @param {string}      [opts.direction='higher_better']
 * @param {number}      [opts.sdc] — measure.interpretation.sdc.value (per-day or per-score-unit)
 * @param {number}      [opts.spanDays] — total time span covered
 * @param {number}      [opts.r2Threshold=0.5]
 * @returns {Object} { classification, slopePerMonth, slopePerDay,
 *                     ci95PerMonth, r2, confidence, message_ar }
 */
function classify(fit, opts = {}) {
  const direction = opts.direction || 'higher_better';
  const r2Threshold = opts.r2Threshold ?? 0.5;
  const sdc = opts.sdc;

  if (!fit) {
    return {
      classification: CLASSIFICATIONS.INSUFFICIENT,
      slopePerDay: null,
      slopePerMonth: null,
      ci95PerMonth: null,
      r2: null,
      confidence: 'low',
      message_ar: 'بيانات غير كافية للحكم (يلزم 3 قياسات على الأقل)',
    };
  }

  const slopePerDay = fit.slope;
  const slopePerMonth = slopePerDay * 30;
  const ci95PerMonth = fit.ci95 ? [fit.ci95[0] * 30, fit.ci95[1] * 30] : null;
  const r2 = fit.r2;
  const goodSign = _improvedSign(direction);
  const improvedSlope = slopePerDay * goodSign;

  // CI includes 0?
  const ciIncludesZero = fit.ci95 ? fit.ci95[0] <= 0 && fit.ci95[1] >= 0 : true;

  // ─── Plateau: CI includes 0 AND the absolute slope is tiny ─────
  // "Tiny" = total change over the spanned period < SDC. When SDC
  // is missing fall back to <1% per month.
  const spanDays = Number.isFinite(opts.spanDays) ? opts.spanDays : null;
  let isPlateau = false;
  if (ciIncludesZero) {
    if (sdc != null && spanDays != null && spanDays > 0) {
      const totalChange = Math.abs(slopePerDay * spanDays);
      isPlateau = totalChange < sdc;
    } else {
      // Fallback heuristic: per-month slope tiny in absolute terms.
      isPlateau = Math.abs(slopePerMonth) < 1;
    }
  }

  // ─── Regression: slope in the bad direction with CI not crossing 0 ─
  if (improvedSlope < 0 && !ciIncludesZero) {
    return {
      classification: CLASSIFICATIONS.REGRESSION,
      slopePerDay,
      slopePerMonth,
      ci95PerMonth,
      r2,
      confidence: r2 >= r2Threshold ? 'high' : 'medium',
      message_ar: 'تراجع موثوق إحصائياً — مراجعة فورية للخطة العلاجية',
    };
  }

  if (isPlateau) {
    return {
      classification: CLASSIFICATIONS.PLATEAU,
      slopePerDay,
      slopePerMonth,
      ci95PerMonth,
      r2,
      confidence: 'medium',
      message_ar: 'ثبات دون تقدّم ملموس — يُقترح تعديل أهداف العلاج',
    };
  }

  // ─── Oscillation: wide CI, can't claim direction ───────────────
  if (ciIncludesZero) {
    return {
      classification: CLASSIFICATIONS.OSCILLATION,
      slopePerDay,
      slopePerMonth,
      ci95PerMonth,
      r2,
      confidence: 'low',
      message_ar: 'تذبذب في القياسات — تحقق من اتساق التطبيق',
    };
  }

  // ─── Improvement paths ─────────────────────────────────────────
  if (improvedSlope > 0) {
    if (r2 >= r2Threshold) {
      return {
        classification: CLASSIFICATIONS.LINEAR_IMPROVEMENT,
        slopePerDay,
        slopePerMonth,
        ci95PerMonth,
        r2,
        confidence: 'high',
        message_ar: 'تحسّن خطي مستمر',
      };
    }
    return {
      classification: CLASSIFICATIONS.SLOW_IMPROVEMENT,
      slopePerDay,
      slopePerMonth,
      ci95PerMonth,
      r2,
      confidence: 'medium',
      message_ar: 'تحسّن مع بعض التذبذب — الاتجاه إيجابي إجمالاً',
    };
  }

  // Fallback (shouldn't normally hit — CI excludes 0 + improved slope
  // negative was handled above; this branch is improved slope === 0
  // with CI not crossing 0, which is mathematically rare).
  return {
    classification: CLASSIFICATIONS.OSCILLATION,
    slopePerDay,
    slopePerMonth,
    ci95PerMonth,
    r2,
    confidence: 'low',
    message_ar: 'نمط غير حاسم',
  };
}

module.exports = { classify, CLASSIFICATIONS };
