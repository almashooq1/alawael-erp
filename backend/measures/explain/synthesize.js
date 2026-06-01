'use strict';

/**
 * explain/synthesize.js — W695 explainable measure synthesizer.
 *
 * WHY this exists (the explainability gap):
 *   The platform already computes, separately:
 *     • a clinical band/severity (scoring + interpretation layers),
 *     • a trajectory classification over time (trend layer, W219),
 *     • a normative position + reliable change (psychometrics layer, W694),
 *     • a use-policy advisory (governance layer, W693).
 *   A clinician reading a dashboard needs ONE coherent, explainable story that
 *   fuses these signals — and every claim must trace back to its driver so the
 *   recommendation is auditable, never a black box.
 *
 *   This pure synthesizer takes the already-computed signals and returns a
 *   bilingual narrative with:
 *     • headline (band + trajectory in plain language),
 *     • drivers[]  — the explicit evidence each conclusion rests on,
 *     • recommendation (actionable next step),
 *     • flags[]    — safety advisories (screening-not-diagnosis, regression).
 *
 * No DB, no I/O, no recomputation — it only composes inputs the caller already
 * resolved. This keeps the "why" transparent: each driver names its source.
 */

// Recommendation actions — actionable, not just descriptive.
const ACTIONS = Object.freeze({
  CONTINUE: 'continue_current_plan',
  ESCALATE: 'escalate_review',
  REFER_DIAGNOSTIC: 'refer_for_diagnostic_assessment',
  ADJUST_PLAN: 'adjust_intervention_plan',
  CELEBRATE_TAPER: 'celebrate_and_consider_taper',
  GATHER_MORE: 'gather_more_data',
});

function pickAction({ trajectory, rciOutcome, isScreeningPositive }) {
  if (isScreeningPositive) return ACTIONS.REFER_DIAGNOSTIC;
  if (trajectory === 'REGRESSION' || rciOutcome === 'deteriorated') return ACTIONS.ESCALATE;
  if (trajectory === 'PLATEAU' || trajectory === 'STAGNANT') return ACTIONS.ADJUST_PLAN;
  if (trajectory === 'INSUFFICIENT_DATA') return ACTIONS.GATHER_MORE;
  if (trajectory === 'CEILING_ACHIEVED' || rciOutcome === 'recovered')
    return ACTIONS.CELEBRATE_TAPER;
  if (trajectory === 'SUSTAINED_IMPROVEMENT' || rciOutcome === 'improved') return ACTIONS.CONTINUE;
  return ACTIONS.CONTINUE;
}

const ACTION_TEXT = Object.freeze({
  continue_current_plan: {
    ar: 'الاستمرار على الخطة العلاجية الحالية مع المتابعة الدورية.',
    en: 'Continue the current intervention plan with routine follow-up.',
  },
  escalate_review: {
    ar: 'مراجعة عاجلة من الفريق المختص لتعديل الخطة بسبب مؤشر تراجع موثوق.',
    en: 'Escalate for a prompt team review — a reliable decline was detected.',
  },
  refer_for_diagnostic_assessment: {
    ar: 'الإحالة لتقييم تشخيصي شامل؛ النتيجة فرزية وليست تشخيصًا.',
    en: 'Refer for a comprehensive diagnostic assessment — this is a screen, not a diagnosis.',
  },
  adjust_intervention_plan: {
    ar: 'تعديل أهداف/شدّة التدخل لتجاوز حالة الثبات في التقدم.',
    en: 'Adjust intervention goals/intensity to break through the plateau.',
  },
  celebrate_and_consider_taper: {
    ar: 'تحقّق تقدم بارز؛ يُنظر في تخفيف الكثافة العلاجية تدريجيًا مع الحفاظ على المكتسبات.',
    en: 'Strong progress achieved — consider tapering intensity while maintaining gains.',
  },
  gather_more_data: {
    ar: 'بيانات غير كافية لاستنتاج موثوق؛ يلزم إعادة القياس قبل اتخاذ قرار.',
    en: 'Insufficient data for a reliable conclusion — re-administer before deciding.',
  },
});

// Plain-language trajectory phrasing (subset mirrors interpretation CATEGORIES).
const TRAJECTORY_TEXT = Object.freeze({
  SUSTAINED_IMPROVEMENT: { ar: 'تحسّن مستمر وواضح', en: 'sustained, clear improvement' },
  SLOW_PROGRESS: { ar: 'تقدّم بطيء لكنه إيجابي', en: 'slow but positive progress' },
  PLATEAU: { ar: 'ثبات في التقدم بعد تحسّن مبكر', en: 'a plateau after early gains' },
  STAGNANT: { ar: 'ركود دون تغيّر متوقّع', en: 'stagnation with no expected change' },
  REGRESSION: { ar: 'تراجع ملموس', en: 'a meaningful regression' },
  OSCILLATION: { ar: 'تذبذب دون اتجاه واضح', en: 'oscillation with no clear direction' },
  STABLE: { ar: 'استقرار ضمن النطاق المتوقع', en: 'stability within the expected range' },
  CEILING_ACHIEVED: { ar: 'بلوغ السقف الأعلى للمقياس', en: 'reaching the instrument ceiling' },
  INSUFFICIENT_DATA: { ar: 'بيانات غير كافية', en: 'insufficient data' },
  MIXED_DOMAINS: { ar: 'نتائج متباينة بين المجالات', en: 'mixed results across domains' },
});

const RCI_TEXT = Object.freeze({
  recovered: {
    ar: 'تعافٍ موثوق إحصائيًا مع تجاوز الحد السريري',
    en: 'statistically reliable recovery past the clinical cut-off',
  },
  improved: { ar: 'تحسّن موثوق إحصائيًا', en: 'a statistically reliable improvement' },
  unchanged: { ar: 'تغيّر ضمن حدود الخطأ القياسي', en: 'change within measurement error' },
  deteriorated: { ar: 'تدهور موثوق إحصائيًا', en: 'a statistically reliable deterioration' },
});

function clean(arr) {
  return arr.filter(Boolean);
}

/**
 * Compose the explainable narrative.
 *
 * @param {Object} signals
 * @param {Object} signals.measure         Measure document (code, name, name_ar, purpose)
 * @param {string} [signals.bandLabel]     resolved band label (en)
 * @param {string} [signals.bandLabel_ar]  resolved band label (ar)
 * @param {string} [signals.severity]      normal|mild|moderate|severe
 * @param {string} [signals.trajectory]    one of TRAJECTORY_TEXT keys
 * @param {Object} [signals.norm]          { t, percentile, band } from psychometrics.normProfile
 * @param {Object} [signals.change]        { outcome, rci, reliable } from psychometrics.classifyChange
 * @param {Object} [signals.advisory]      { ar, en, action } from clinical-use.confirmatoryAdvisory
 * @param {boolean}[signals.isScreeningPositive]
 * @returns {{ headline:{ar:string,en:string}, drivers:Array,
 *            recommendation:{action:string,ar:string,en:string}, flags:Array }}
 */
function synthesize(signals = {}) {
  const {
    measure = {},
    bandLabel,
    bandLabel_ar,
    severity,
    trajectory,
    norm,
    change,
    advisory,
    isScreeningPositive = false,
  } = signals;

  const measureName = measure.name_ar || measure.name || measure.code || 'المقياس';
  const traj = trajectory && TRAJECTORY_TEXT[trajectory];

  // ── headline ─────────────────────────────────────────────────────────
  const headline = {
    ar: `${measureName}: ` + clean([bandLabel_ar || bandLabel, traj && traj.ar]).join(' — ') + '.',
    en: `${measure.name || measure.code}: ` + clean([bandLabel, traj && traj.en]).join(' — ') + '.',
  };

  // ── drivers (each conclusion names its evidence source) ──────────────
  const drivers = [];
  if (bandLabel || severity) {
    drivers.push({
      source: 'interpretation_band',
      ar: `التصنيف السريري: ${bandLabel_ar || bandLabel || severity}.`,
      en: `Clinical band: ${bandLabel || severity}.`,
    });
  }
  if (traj) {
    drivers.push({
      source: 'trend_classification',
      ar: `اتجاه التقدّم عبر الزمن: ${traj.ar}.`,
      en: `Trajectory over time: ${traj.en}.`,
    });
  }
  if (norm && (norm.percentile != null || norm.t != null)) {
    drivers.push({
      source: 'normative_position',
      ar:
        `الموضع المعياري: المئيني ${norm.percentile ?? '—'}` +
        (norm.t != null ? `، الدرجة التائية ${norm.t}` : '') +
        '.',
      en:
        `Normative position: ${norm.percentile ?? '—'}th percentile` +
        (norm.t != null ? `, T-score ${norm.t}` : '') +
        '.',
    });
  }
  if (change && change.outcome && RCI_TEXT[change.outcome]) {
    drivers.push({
      source: 'reliable_change_index',
      ar: `التغيّر الموثوق: ${RCI_TEXT[change.outcome].ar} (RCI=${change.rci ?? '—'}).`,
      en: `Reliable change: ${RCI_TEXT[change.outcome].en} (RCI=${change.rci ?? '—'}).`,
    });
  }

  // ── safety flags ─────────────────────────────────────────────────────
  const flags = [];
  if (advisory) {
    flags.push({ type: 'SCREENING_NOT_DIAGNOSTIC', ar: advisory.ar, en: advisory.en });
  }
  if (trajectory === 'REGRESSION' || (change && change.outcome === 'deteriorated')) {
    flags.push({
      type: 'RELIABLE_DECLINE',
      ar: 'رُصد تراجع موثوق يستدعي مراجعة عاجلة.',
      en: 'A reliable decline was detected and warrants prompt review.',
    });
  }

  // ── recommendation ───────────────────────────────────────────────────
  const action = pickAction({
    trajectory,
    rciOutcome: change && change.outcome,
    isScreeningPositive: isScreeningPositive || Boolean(advisory),
  });
  const recommendation = {
    action,
    ar: ACTION_TEXT[action].ar,
    en: ACTION_TEXT[action].en,
  };

  return { headline, drivers, recommendation, flags };
}

module.exports = { ACTIONS, ACTION_TEXT, TRAJECTORY_TEXT, RCI_TEXT, pickAction, synthesize };
