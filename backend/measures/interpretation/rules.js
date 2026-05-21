'use strict';

/**
 * measures/interpretation/rules.js — Wave 232
 *
 * Pure interpretation layer. Takes a fully-resolved context object
 * (built by services/measureProgressInterpreter.service.js from DB
 * reads) and returns:
 *
 *   pickCategory(ctx)       — one of CATEGORIES
 *   computeConfidence(ctx)  — one of CONFIDENCE_TIERS
 *   renderTemplate(category, vars, locale)
 *                           — { ar, en } resolved strings
 *
 * No DB access, no I/O. Every test exercising the decision tree hits
 * these helpers directly.
 *
 * Why a pure layer (matches W212/W218 pattern):
 *   • the interpretation is deterministic given inputs — no benefit
 *     to mixing it with DB access
 *   • we can fuzz the priority order without spinning up Mongo
 *   • the orchestrator becomes a thin glue layer (~150 LOC)
 *
 * Categories — priority order matters (first match wins):
 *
 *   1.  INSUFFICIENT_DATA      — < 3 admins OR no baseline
 *   2.  CEILING_ACHIEVED       — value at top of range AND direction was positive
 *   3.  REGRESSION             — sustained meaningful loss
 *   4.  PLATEAU                — early improvement then long stability
 *   5.  SUSTAINED_IMPROVEMENT  — meaningful gain, R² >= 0.5
 *   6.  SLOW_PROGRESS          — positive direction but not at MCID
 *   7.  OSCILLATION            — wide CI95, no clear direction
 *   8.  STAGNANT               — should have moved by now (MCID_NOT_MET signal)
 *   9.  STABLE                 — within stability band (no signal)
 *   10. MIXED_DOMAINS          — composite with mixed subscale directions
 *                                (handled separately by orchestrator; pickCategory
 *                                receives a synthesized ctx.isMixed flag)
 */

// ─── Canonical category set ───────────────────────────────────────────
const CATEGORIES = Object.freeze({
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  CEILING_ACHIEVED: 'CEILING_ACHIEVED',
  REGRESSION: 'REGRESSION',
  PLATEAU: 'PLATEAU',
  SUSTAINED_IMPROVEMENT: 'SUSTAINED_IMPROVEMENT',
  SLOW_PROGRESS: 'SLOW_PROGRESS',
  OSCILLATION: 'OSCILLATION',
  STAGNANT: 'STAGNANT',
  STABLE: 'STABLE',
  MIXED_DOMAINS: 'MIXED_DOMAINS',
});

// UI color mapping — single source of truth.
const CATEGORY_COLORS = Object.freeze({
  INSUFFICIENT_DATA: 'gray',
  STABLE: 'gray',
  SUSTAINED_IMPROVEMENT: 'green_dark',
  CEILING_ACHIEVED: 'green_dark',
  SLOW_PROGRESS: 'green_light',
  PLATEAU: 'yellow',
  OSCILLATION: 'yellow',
  STAGNANT: 'yellow',
  MIXED_DOMAINS: 'yellow',
  REGRESSION: 'red',
});

// Worst-wins ranking for rollups (higher = more concerning).
const CATEGORY_SEVERITY = Object.freeze({
  INSUFFICIENT_DATA: 0,
  CEILING_ACHIEVED: 0,
  SUSTAINED_IMPROVEMENT: 1,
  SLOW_PROGRESS: 2,
  STABLE: 3,
  MIXED_DOMAINS: 4,
  OSCILLATION: 5,
  STAGNANT: 6,
  PLATEAU: 7,
  REGRESSION: 10,
});

const CONFIDENCE_TIERS = Object.freeze({
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
});

// Thresholds — org-wide fallbacks. Per-measure overrides come from W210
// `measure.interpretation.mcid` / `.sdc`.
const DEFAULT_THRESHOLDS = Object.freeze({
  meaningfulPctOfRange: 0.2, // 20% of range when MCID unavailable
  plateauMinConsecutive: 3, // consecutive admins within stable band
  plateauMinDays: 60, // AND span at least N days
  regressionMinConsecutive: 2, // consecutive declining admins
  ceilingEpsilonPct: 0.02, // within 2% of max
  floorEpsilonPct: 0.02,
  stagnantMinAdmins: 5, // 5+ admins without MCID = stagnant
  oscillationMinAbsSlope: 0, // null CI requirement; check via ci95ContainsZero
  confidence: {
    [CONFIDENCE_TIERS.LOW]: 3,
    [CONFIDENCE_TIERS.MEDIUM]: 5,
    [CONFIDENCE_TIERS.HIGH]: 8,
    [CONFIDENCE_TIERS.VERY_HIGH]: 12,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────────

function _safeNumber(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function _directionMultiplier(scoringDirection) {
  return scoringDirection === 'lower_better' ? -1 : 1;
}

/**
 * Sign-aware delta from baseline.
 *   higher_better:  current - baseline   (positive = improving)
 *   lower_better:   baseline - current   (positive = improving)
 */
function directionAwareDelta(baselineValue, currentValue, scoringDirection) {
  const b = _safeNumber(baselineValue);
  const c = _safeNumber(currentValue);
  if (b == null || c == null) return null;
  return (c - b) * _directionMultiplier(scoringDirection);
}

/**
 * Returns the resolved MCID value to use. Per-measure mcid wins; falls
 * back to a percent-of-range. Returns { value, source, missing }.
 */
function resolveMcid(measure, thresholds = DEFAULT_THRESHOLDS) {
  const mcid = measure?.interpretation?.mcid;
  if (
    mcid &&
    Number.isFinite(mcid.value) &&
    (mcid.status === 'established' || mcid.status === 'provisional')
  ) {
    return { value: mcid.value, source: 'measure', missing: false };
  }
  const range = _computeRange(measure);
  if (range != null && range > 0) {
    return {
      value: range * thresholds.meaningfulPctOfRange,
      source: 'pct_of_range_fallback',
      missing: true,
    };
  }
  return { value: null, source: 'unresolved', missing: true };
}

/**
 * SDC fallback — half of MCID when measure lacks an explicit SDC.
 */
function resolveSdc(measure, mcidValue) {
  const sdcRaw = measure?.interpretation?.sdc;
  if (sdcRaw && Number.isFinite(sdcRaw.value)) {
    return { value: sdcRaw.value, source: 'measure' };
  }
  if (Number.isFinite(mcidValue)) {
    return { value: mcidValue * 0.5, source: 'mcid_half_fallback' };
  }
  return { value: null, source: 'unresolved' };
}

function _computeRange(measure) {
  const dMin = measure?.derivedRange?.min;
  const dMax = measure?.derivedRange?.max;
  if (Number.isFinite(dMin) && Number.isFinite(dMax)) return dMax - dMin;
  const mMin = _safeNumber(measure?.minScore);
  const mMax = _safeNumber(measure?.maxScore);
  if (mMin != null && mMax != null) return mMax - mMin;
  return null;
}

/**
 * Detect plateau: last K admins all within stable band AND span >= minDays
 * AND the earliest baseline-to-mid change was meaningful (i.e. there WAS
 * progress before the flatline).
 */
function detectPlateau(ctx, thresholds = DEFAULT_THRESHOLDS) {
  const { history, baseline, sdcValue, mcidValue, scoringDirection } = ctx;
  if (!history || history.length < thresholds.plateauMinConsecutive) return false;
  if (!Number.isFinite(sdcValue)) return false;
  const recent = history.slice(-thresholds.plateauMinConsecutive);
  const recentValues = recent.map(h => h.value).filter(v => Number.isFinite(v));
  if (recentValues.length < thresholds.plateauMinConsecutive) return false;
  const min = Math.min(...recentValues);
  const max = Math.max(...recentValues);
  const range = max - min;
  if (range > sdcValue) return false;

  const spanDays =
    (new Date(recent[recent.length - 1].date).getTime() - new Date(recent[0].date).getTime()) /
    86400000;
  if (spanDays < thresholds.plateauMinDays) return false;

  // Required: early improvement before the flatline.
  if (!baseline) return false;
  const midIndex = Math.floor(history.length / 2);
  const midPoint = history[midIndex];
  if (!midPoint) return false;
  const earlyDelta = directionAwareDelta(baseline.value, midPoint.value, scoringDirection);
  if (!Number.isFinite(mcidValue)) return earlyDelta != null && earlyDelta > 0;
  return earlyDelta != null && earlyDelta >= mcidValue * 0.5; // half-MCID counts as "had progress"
}

/**
 * Detect regression: last K admins with negative direction-aware delta
 * AND total drop from peak >= mcid.
 */
function detectRegression(ctx, thresholds = DEFAULT_THRESHOLDS) {
  const { history, mcidValue, scoringDirection } = ctx;
  if (!history || history.length < thresholds.regressionMinConsecutive + 1) return false;
  if (!Number.isFinite(mcidValue)) return false;
  const values = history.map(h => h.value).filter(Number.isFinite);
  if (values.length < thresholds.regressionMinConsecutive + 1) return false;

  // Peak = best historical value in the direction.
  const mult = _directionMultiplier(scoringDirection);
  let peak = values[0] * mult;
  let peakIndex = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i] * mult > peak) {
      peak = values[i] * mult;
      peakIndex = i;
    }
  }
  const current = values[values.length - 1] * mult;
  const peakDrop = peak - current;
  if (peakDrop < mcidValue) return false;

  // Last K admins must all be below the peak (declining since peak).
  if (peakIndex > values.length - thresholds.regressionMinConsecutive - 1) return false;
  return true;
}

/**
 * Check if value is at ceiling (top of range, given direction).
 */
function atCeiling(value, measure, scoringDirection, thresholds = DEFAULT_THRESHOLDS) {
  const range = _computeRange(measure);
  if (range == null || range <= 0) return false;
  const v = _safeNumber(value);
  if (v == null) return false;
  const eps = range * thresholds.ceilingEpsilonPct;
  if (scoringDirection === 'lower_better') {
    const min = _safeNumber(measure?.minScore) ?? measure?.derivedRange?.min;
    return min != null && v <= min + eps;
  }
  const max = _safeNumber(measure?.maxScore) ?? measure?.derivedRange?.max;
  return max != null && v >= max - eps;
}

// ─── pickCategory ─────────────────────────────────────────────────────

/**
 * Main decision tree. ctx shape:
 *   {
 *     history: [{ value, date, applicationId }],
 *     baseline: { value, date, applicationId } | null,
 *     current:  { value, date, applicationId } | null,
 *     prior:    { value, date, applicationId } | null,
 *     measure:  W210 measure doc,
 *     scoringDirection: 'higher_better' | 'lower_better',
 *     mcidValue, sdcValue,           // pre-resolved by orchestrator
 *     trendFit: { slope, r2, ci95Lower, ci95Upper, n } | null,
 *     openAlertTypes: Set<string>,   // 'REGRESSION_DETECTED' | 'PLATEAU_DETECTED' | 'MCID_NOT_MET'
 *     isMixed: boolean,              // composite measure: subscales disagree
 *     atCeiling: boolean,            // pre-computed
 *   }
 */
function pickCategory(ctx, thresholds = DEFAULT_THRESHOLDS) {
  // 1. Insufficient data
  if (!ctx.baseline || !ctx.current) return CATEGORIES.INSUFFICIENT_DATA;
  if (!Array.isArray(ctx.history) || ctx.history.length < 3) {
    return CATEGORIES.INSUFFICIENT_DATA;
  }

  const delta = directionAwareDelta(ctx.baseline.value, ctx.current.value, ctx.scoringDirection);

  // 2. Ceiling — value at top + reached via positive direction
  if (ctx.atCeiling && Number.isFinite(delta) && delta >= 0) {
    return CATEGORIES.CEILING_ACHIEVED;
  }

  // 3. Mixed-domains short-circuit (composite measures)
  if (ctx.isMixed) return CATEGORIES.MIXED_DOMAINS;

  // 4. Regression — either alert fired OR detector matches
  const hasRegressionAlert = ctx.openAlertTypes?.has?.('REGRESSION_DETECTED');
  if (hasRegressionAlert || detectRegression(ctx, thresholds)) {
    return CATEGORIES.REGRESSION;
  }

  // 5. Plateau — either alert fired OR detector matches
  const hasPlateauAlert = ctx.openAlertTypes?.has?.('PLATEAU_DETECTED');
  if (hasPlateauAlert || detectPlateau(ctx, thresholds)) {
    return CATEGORIES.PLATEAU;
  }

  const mcidMet = Number.isFinite(ctx.mcidValue) && Math.abs(delta) >= ctx.mcidValue;
  const sdcMet = Number.isFinite(ctx.sdcValue) && Math.abs(delta) >= ctx.sdcValue;
  const positive = delta > 0;

  // 6. Sustained improvement — strong positive trend + MCID
  if (positive && mcidMet) {
    const r2 = ctx.trendFit?.r2;
    // If we have a fit with high R², extra confidence — but MCID alone qualifies.
    if (r2 == null || r2 >= 0.5) return CATEGORIES.SUSTAINED_IMPROVEMENT;
    // Low R² with MCID = noisy positive — still slow progress
    return CATEGORIES.SLOW_PROGRESS;
  }

  // 7. Oscillation — CI95 spans zero AND noise > sdc.
  //    Checked BEFORE slow_progress: when CI95 brackets zero, we
  //    genuinely cannot claim direction — even a positive sdc-met delta
  //    is in the noise band.
  if (ctx.trendFit && ctx.trendFit.ci95Lower != null && ctx.trendFit.ci95Upper != null) {
    const ciSpansZero = ctx.trendFit.ci95Lower <= 0 && ctx.trendFit.ci95Upper >= 0;
    const noisy = Number.isFinite(ctx.sdcValue) && Math.abs(delta) > ctx.sdcValue && ciSpansZero;
    if (noisy) return CATEGORIES.OSCILLATION;
  }

  // 8. Slow progress — positive direction past SDC but below MCID
  if (positive && sdcMet) return CATEGORIES.SLOW_PROGRESS;

  // 9. Stagnant — alert fired OR n>=5 admins, no MCID, no direction
  const hasMcidNotMet = ctx.openAlertTypes?.has?.('MCID_NOT_MET');
  if (hasMcidNotMet) return CATEGORIES.STAGNANT;
  if (
    ctx.history.length >= thresholds.stagnantMinAdmins &&
    !mcidMet &&
    Math.abs(delta) < (ctx.sdcValue || Infinity)
  ) {
    return CATEGORIES.STAGNANT;
  }

  // 10. Default
  return CATEGORIES.STABLE;
}

// ─── computeConfidence ────────────────────────────────────────────────

function computeConfidence(ctx, thresholds = DEFAULT_THRESHOLDS) {
  const n = Array.isArray(ctx.history) ? ctx.history.length : 0;
  if (n < thresholds.confidence[CONFIDENCE_TIERS.LOW]) return CONFIDENCE_TIERS.NONE;

  let tier = CONFIDENCE_TIERS.LOW;
  if (n >= thresholds.confidence[CONFIDENCE_TIERS.VERY_HIGH]) tier = CONFIDENCE_TIERS.VERY_HIGH;
  else if (n >= thresholds.confidence[CONFIDENCE_TIERS.HIGH]) tier = CONFIDENCE_TIERS.HIGH;
  else if (n >= thresholds.confidence[CONFIDENCE_TIERS.MEDIUM]) tier = CONFIDENCE_TIERS.MEDIUM;

  // Dampeners — each drops one tier.
  let dampens = 0;
  if (ctx.staleness === true) dampens += 1;
  if (ctx.versionMismatchInHistory === true) dampens += 1;
  if (ctx.actorInconsistency === true) dampens += 1;
  if (
    ctx.trendFit &&
    Number.isFinite(ctx.trendFit.r2) &&
    ctx.trendFit.r2 < 0.3 &&
    [CATEGORIES.SUSTAINED_IMPROVEMENT, CATEGORIES.REGRESSION].includes(ctx.tentativeCategory)
  ) {
    dampens += 1;
  }

  const order = [
    CONFIDENCE_TIERS.NONE,
    CONFIDENCE_TIERS.LOW,
    CONFIDENCE_TIERS.MEDIUM,
    CONFIDENCE_TIERS.HIGH,
    CONFIDENCE_TIERS.VERY_HIGH,
  ];
  let idx = order.indexOf(tier) - dampens;
  if (idx < 0) idx = 0;
  return order[idx];
}

// ─── renderTemplate ───────────────────────────────────────────────────

const TEMPLATES = Object.freeze({
  INSUFFICIENT_DATA: {
    ar: 'بيانات غير كافية للتفسير في {measureName_ar}: نحتاج {needed} قياسات إضافية على الأقل.',
    en: 'Insufficient data for interpretation on {measureName}: at least {needed} more administrations required.',
  },
  CEILING_ACHIEVED: {
    ar: 'بلغ المستفيد سقف {measureName_ar} (الحد الأقصى {maxScore}). يُوصى بالانتقال إلى مقياس أكثر تحديًا أو إنهاء هذا الهدف ضمن الخطة.',
    en: 'Beneficiary reached ceiling on {measureName} (max {maxScore}). Recommend transition to a more challenging measure or close this goal.',
  },
  SUSTAINED_IMPROVEMENT: {
    ar: 'تحسّن متّسق في {measureName_ar}: الدرجة انتقلت من {baselineValue} إلى {currentValue} ({percentSign}{percentChange}%) خلال {daysSinceBaseline} يومًا — تغيّر سريري ذو دلالة (MCID={mcid}).',
    en: 'Sustained improvement on {measureName}: score moved from {baselineValue} to {currentValue} ({percentSign}{percentChange}%) over {daysSinceBaseline} days — clinically meaningful change (MCID={mcid}).',
  },
  SLOW_PROGRESS: {
    ar: 'تقدم بطيء في {measureName_ar}: الاتجاه إيجابي ({absoluteDelta}+) لكنه ما زال دون عتبة الأهمية السريرية ({mcid}). يُوصى بمتابعة جلسة إضافية قبل إعادة تقييم الخطة.',
    en: 'Slow progress on {measureName}: trend is positive ({absoluteDelta}+) but below MCID threshold ({mcid}). Recommend extending current plan before review.',
  },
  STABLE: {
    ar: 'ثبات في {measureName_ar}: الدرجة الحالية ({currentValue}) ضمن نطاق الثبات (±{sdc}) من الأساس. لا تغيّر جوهري منذ {daysSinceBaseline} يومًا.',
    en: 'Stable {measureName}: current score ({currentValue}) within stability band (±{sdc}) of baseline. No meaningful change in {daysSinceBaseline} days.',
  },
  PLATEAU: {
    ar: 'هضبة في {measureName_ar}: تحسّن مبكر ثم استقرار. يُقترح مراجعة الخطة لتعديل الكثافة أو تغيير النهج العلاجي.',
    en: 'Plateau on {measureName}: early improvement followed by stability. Consider adjusting intensity or therapeutic approach.',
  },
  OSCILLATION: {
    ar: 'تذبذب في {measureName_ar}: تباين كبير بين القياسات بدون اتجاه واضح. يُوصى بمراجعة شروط التطبيق (المُقيّم، الإعداد، الوقت من اليوم) قبل التفسير.',
    en: 'Oscillation on {measureName}: high variance without clear direction. Review administration conditions (rater, setting, time-of-day) before interpreting.',
  },
  REGRESSION: {
    ar: '⚠️ تراجع في {measureName_ar}: الدرجة هبطت من {baselineValue} إلى {currentValue} ({percentChange}%) — تجاوز عتبة الأهمية السريرية. يلزم: (1) تحقق طبي، (2) مراجعة الخطة، (3) إخطار الفريق متعدد التخصصات.',
    en: '⚠️ Regression on {measureName}: score dropped from {baselineValue} to {currentValue} ({percentChange}%) — exceeds MCID. Required: (1) medical check, (2) plan review, (3) MDT notification.',
  },
  STAGNANT: {
    ar: 'ركود في {measureName_ar}: مرّ {daysSinceBaseline} يومًا و {historyCount} قياسات دون تحقيق العتبة السريرية ({mcid}). يُوصى بإعادة تقييم ملاءمة الخطة.',
    en: 'Stagnant on {measureName}: {historyCount} measurements over {daysSinceBaseline} days without reaching MCID ({mcid}). Recommend plan-fit review.',
  },
  MIXED_DOMAINS: {
    ar: 'تفاوت بين أبعاد {measureName_ar}: {improvingDomains} في تقدّم، {regressingDomains} في تراجع. يلزم تفسير منفصل لكل بُعد.',
    en: 'Mixed-domain pattern on {measureName}: {improvingDomains} improving, {regressingDomains} regressing. Per-domain interpretation required.',
  },
});

// Eastern Arabic numerals for Arabic locale rendering.
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function formatNumber(v, locale) {
  if (v == null || (typeof v !== 'number' && typeof v !== 'string')) return '—';
  const str = typeof v === 'number' ? (Number.isInteger(v) ? String(v) : v.toFixed(1)) : String(v);
  if (locale === 'ar') {
    return str.replace(/-/g, '−').replace(/\d/g, d => AR_DIGITS[Number(d)]);
  }
  return str;
}

function _substitute(template, vars, locale) {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const v = vars[key];
    if (v == null) return '';
    if (typeof v === 'number') return formatNumber(v, locale);
    return String(v);
  });
}

function renderTemplate(category, vars, locale = 'ar') {
  const tpl = TEMPLATES[category];
  if (!tpl) {
    return { ar: vars.measureName_ar || '', en: vars.measureName || '' };
  }
  return {
    ar: _substitute(tpl.ar, vars, 'ar'),
    en: _substitute(tpl.en, vars, 'en'),
  };
}

module.exports = {
  CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_SEVERITY,
  CONFIDENCE_TIERS,
  DEFAULT_THRESHOLDS,
  TEMPLATES,
  pickCategory,
  computeConfidence,
  renderTemplate,
  // Exposed for testing + orchestrator reuse
  directionAwareDelta,
  resolveMcid,
  resolveSdc,
  atCeiling,
  detectPlateau,
  detectRegression,
  formatNumber,
};
