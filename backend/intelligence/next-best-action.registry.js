'use strict';

/**
 * next-best-action.registry.js — W1206 (Blueprint 43, R6 + §4.2)
 *
 * Canonical catalogue of Next-Best-Action codes — the unifying layer that
 * reads the beneficiary state (episode phase machine §2.1) + the golden
 * thread (W1090–W1167) + the alert producers (W337/W339/W429 adapters +
 * W286 risk orchestrator) and proposes THE next step per beneficiary.
 *
 * Pure frozen data. Signal gathering + ranking live in
 * services/nextBestAction.service.js. Priorities: lower = more urgent;
 * safety always wins (tenet: السلامة طبقة عرضية مستمرة §10.2).
 *
 * The 4 golden-thread codes (LINK_MEASURE / CAPTURE_BASELINE /
 * RECORD_PROGRESS / NO_SESSIONS) are owned by goldenThread.service (W1158) —
 * this registry DECORATES them with unified priorities/labels, it does not
 * re-derive them. Drift guard cross-checks the code lists stay in sync.
 */

const NBA_CODES = Object.freeze({
  ESCALATE_SAFETY: 'ESCALATE_SAFETY',
  LINK_MEASURE: 'LINK_MEASURE',
  CAPTURE_BASELINE: 'CAPTURE_BASELINE',
  STALE_ASSESSMENT: 'STALE_ASSESSMENT',
  REVIEW_PLAN: 'REVIEW_PLAN',
  SUGGEST_GOAL_CLOSURE: 'SUGGEST_GOAL_CLOSURE',
  RECORD_PROGRESS: 'RECORD_PROGRESS',
  NO_SESSIONS: 'NO_SESSIONS',
});

/** Codes produced by goldenThread.service.deriveNextActions (W1158). */
const GOLDEN_THREAD_CODES = Object.freeze([
  'LINK_MEASURE',
  'CAPTURE_BASELINE',
  'RECORD_PROGRESS',
  'NO_SESSIONS',
]);

/** MeasureAlert.alertType values that map to a plan-review NBA. */
const PLAN_REVIEW_ALERT_TYPES = Object.freeze([
  'PLATEAU_DETECTED',
  'REGRESSION_DETECTED',
  'FORECAST_OFF_TRACK',
]);

/** RiskSnapshot.overallTier values that trigger the safety escalation NBA. */
const SAFETY_TIERS = Object.freeze(['high', 'critical']);

/** Days an assessment-family episode phase may run without a baseline (§4.2). */
const STALE_ASSESSMENT_DAYS = 14;

/** Episode phases counted as "assessment family" for the stale rule. */
const ASSESSMENT_PHASES = Object.freeze(['intake', 'triage', 'initial_assessment']);

/** Active-goal progress (%) at/above which closure review is suggested. */
const CLOSURE_SUGGESTION_PROGRESS = 90;

const NBA_ACTIONS = Object.freeze({
  ESCALATE_SAFETY: Object.freeze({
    code: 'ESCALATE_SAFETY',
    priority: 0,
    icon: '🚨',
    titleAr: 'تصعيد فوري — خطورة مرتفعة نشطة',
    titleEn: 'Immediate escalation — active high risk',
    actionAr: 'راية خطورة حمراء نشطة — صعّد فوراً وأشعِر الفريق متعدد التخصصات (MDT)',
    source: 'risk-snapshot',
  }),
  LINK_MEASURE: Object.freeze({
    code: 'LINK_MEASURE',
    priority: 1,
    icon: '🔗',
    titleAr: 'اربط الهدف بمقياس',
    titleEn: 'Link the goal to a measure',
    actionAr: 'هدف بلا مقياس مرتبط — اربطه بأداة قياس من المكتبة لإغلاق الخيط الذهبي',
    source: 'golden-thread',
  }),
  CAPTURE_BASELINE: Object.freeze({
    code: 'CAPTURE_BASELINE',
    priority: 2,
    icon: '📏',
    titleAr: 'سجّل خط الأساس',
    titleEn: 'Capture the baseline',
    actionAr: 'مقياس مرتبط دون خط أساس — طبّق المقياس وسجّل القياس الأول',
    source: 'golden-thread',
  }),
  STALE_ASSESSMENT: Object.freeze({
    code: 'STALE_ASSESSMENT',
    priority: 2,
    icon: '⏰',
    titleAr: 'أكمل التقييم المتأخر',
    titleEn: 'Complete the overdue assessment',
    actionAr: `مضى أكثر من ${STALE_ASSESSMENT_DAYS} يوماً في مرحلة التقييم بلا خط أساس مكتمل — أكمل المقياس لإغلاق التقييم`,
    source: 'episode-phase',
  }),
  REVIEW_PLAN: Object.freeze({
    code: 'REVIEW_PLAN',
    priority: 3,
    icon: '🔄',
    titleAr: 'راجع الخطة — استجابة غير كافية',
    titleEn: 'Review the plan — insufficient response',
    actionAr: 'هضبة/تراجع/انحراف عن المسار المتوقع — راجع الخطة وفكّر في تدخّل بديل',
    source: 'measure-alert',
  }),
  SUGGEST_GOAL_CLOSURE: Object.freeze({
    code: 'SUGGEST_GOAL_CLOSURE',
    priority: 3,
    icon: '✅',
    titleAr: 'اقترح إغلاق الهدف',
    titleEn: 'Suggest goal closure',
    actionAr: `التقدّم بلغ ${CLOSURE_SUGGESTION_PROGRESS}% أو أكثر — راجع تحقق الهدف واقترح إغلاقه وهدفاً تالياً`,
    source: 'goal-progress',
  }),
  RECORD_PROGRESS: Object.freeze({
    code: 'RECORD_PROGRESS',
    priority: 4,
    icon: '📈',
    titleAr: 'سجّل قياس تقدّم',
    titleEn: 'Record a progress measurement',
    actionAr: 'خط أساس موجود دون قياس تقدّم لاحق — أعد تطبيق المقياس لتوثيق الاتجاه',
    source: 'golden-thread',
  }),
  NO_SESSIONS: Object.freeze({
    code: 'NO_SESSIONS',
    priority: 5,
    icon: '📅',
    titleAr: 'اربط الجلسات بالهدف',
    titleEn: 'Link sessions to the goal',
    actionAr: 'هدف مكتمل الربط دون جلسات مسجّلة — جدوِل/وثّق جلسة تخدم الهدف',
    source: 'golden-thread',
  }),
});

/** Decorate a raw action (by code) with the unified catalogue metadata. */
function decorate(code, extra = {}) {
  const base = NBA_ACTIONS[code];
  if (!base) return null;
  return { ...base, ...extra };
}

module.exports = {
  NBA_CODES,
  NBA_ACTIONS,
  GOLDEN_THREAD_CODES,
  PLAN_REVIEW_ALERT_TYPES,
  SAFETY_TIERS,
  STALE_ASSESSMENT_DAYS,
  ASSESSMENT_PHASES,
  CLOSURE_SUGGESTION_PROGRESS,
  decorate,
};
