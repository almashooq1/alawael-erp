'use strict';

/**
 * measures/intelligence/plan-recommendation.js — W711
 *
 * WHY this exists (the connective-tissue gap, part 3):
 *   The deterioration signal (W709) tells the care team WHAT is sliding. The
 *   missing link is translating that signal into a concrete, reviewable
 *   *Plan-of-Care action proposal* — without ever auto-mutating the plan.
 *
 *   Platform doctrine is explicit: every smart recommendation must be
 *   EXPLAINABLE, every plan change must keep an Audit Trail + Versioning, and
 *   no sensitive clinical mutation may happen without role-based specialist
 *   approval. So this builder produces *proposals only*:
 *     • status = 'proposed', requiresApproval = true, autoApplied = false,
 *     • a bilingual rationale a clinician can defend,
 *     • the exact evidence (slope, cutoff crossing, latest vs previous,
 *       reasons) the signal was derived from — nothing hidden,
 *     • suggested actions framed as options, not commands.
 *
 *   Applying a proposal (mutating CarePlanVersion / Episode of Care) and the
 *   binding side of `measure.scored` are DEFERRED pending product sign-off.
 *   This module never imports a model, never emits, never writes.
 *
 * Contract: PURE. Input is a deterioration result (from detectDeterioration /
 * analyzeEpisode); output is an array of recommendation proposals.
 */

const { SEVERITY } = require('./deterioration');

/** Severities that warrant a plan-review proposal (stable/insufficient do not). */
const ACTIONABLE = new Set([SEVERITY.CRITICAL, SEVERITY.CONCERN, SEVERITY.WATCH]);

/** Urgency band attached to each proposal so a worklist can sort + SLA it. */
const URGENCY = Object.freeze({
  critical: { key: 'urgent', sla_hours: 24, ar: 'عاجل', en: 'Urgent' },
  concern: { key: 'high', sla_hours: 72, ar: 'مرتفع', en: 'High' },
  watch: { key: 'routine', sla_hours: 168, ar: 'روتيني', en: 'Routine' },
});

/** Suggested action menu per severity — options, never auto-applied commands. */
function _suggestedActions(severity) {
  switch (severity) {
    case SEVERITY.CRITICAL:
      return [
        {
          code: 'urgent_clinical_review',
          ar: 'مراجعة سريرية عاجلة من الأخصائي المسؤول',
          en: 'Urgent clinical review by the responsible specialist',
        },
        {
          code: 'escalate_care_team',
          ar: 'تصعيد للفريق العلاجي متعدد التخصصات',
          en: 'Escalate to the multidisciplinary care team',
        },
        {
          code: 'revise_plan_goals',
          ar: 'مراجعة أهداف الخطة العلاجية وتكثيف التدخل',
          en: 'Revise plan goals and intensify intervention',
        },
        {
          code: 'increase_measure_frequency',
          ar: 'زيادة وتيرة القياس للتحقق من الاتجاه',
          en: 'Increase measurement frequency to confirm the trend',
        },
      ];
    case SEVERITY.CONCERN:
      return [
        {
          code: 'schedule_plan_review',
          ar: 'إدراج المستفيد في مراجعة الخطة القادمة',
          en: 'Add the beneficiary to the next plan review',
        },
        {
          code: 'adjust_intervention',
          ar: 'مراجعة شدّة/نوع التدخل الحالي',
          en: 'Review the intensity/type of the current intervention',
        },
        {
          code: 'increase_measure_frequency',
          ar: 'زيادة وتيرة القياس',
          en: 'Increase measurement frequency',
        },
      ];
    default: // WATCH
      return [
        {
          code: 'close_monitoring',
          ar: 'متابعة لصيقة وإعادة القياس قبل أي قرار',
          en: 'Close monitoring and re-measure before any decision',
        },
        {
          code: 'no_change_yet',
          ar: 'الإبقاء على الخطة الحالية مع توثيق الملاحظة',
          en: 'Keep the current plan and document the observation',
        },
      ];
  }
}

/** Build the bilingual, defensible rationale string from the signal's evidence. */
function _rationale(signal) {
  const parts_ar = [];
  const parts_en = [];
  if (signal.cutoffCrossed) {
    parts_ar.push('تجاوز المستفيد عتبة الخطر في آخر قياس');
    parts_en.push('the beneficiary crossed the at-risk cutoff on the latest administration');
  }
  if (signal.classification === 'regression') {
    parts_ar.push('اتجاه تراجع موثوق عبر القياسات المتتابعة');
    parts_en.push('a reliable downward trend across successive administrations');
  }
  if (signal.classification === 'oscillation') {
    parts_ar.push('تذبذب غير مستقر في النتائج');
    parts_en.push('unstable oscillation in results');
  }
  if (
    Number.isFinite(signal.latestValue) &&
    Number.isFinite(signal.previousValue) &&
    signal.latestValue !== signal.previousValue
  ) {
    parts_ar.push(`تغيّر القيمة من ${signal.previousValue} إلى ${signal.latestValue}`);
    parts_en.push(`value changed from ${signal.previousValue} to ${signal.latestValue}`);
  }
  if (signal.latestBandSeverity === 'critical' || signal.latestBandSeverity === 'severe') {
    parts_ar.push('النطاق التفسيري الأخير في المستوى الحرج/الشديد');
    parts_en.push('the latest interpreted band is in the critical/severe range');
  }
  const join_ar = parts_ar.length ? parts_ar.join('، ') : 'مؤشرات تراجع مبكرة';
  const join_en = parts_en.length ? parts_en.join('; ') : 'early decline indicators';
  return {
    ar: `يُقترح مراجعة خطة الرعاية لمقياس ${signal.name_ar}: ${join_ar}.`,
    en: `Plan-of-care review proposed for ${signal.name_en}: ${join_en}.`,
  };
}

/**
 * Build plan-of-care recommendation PROPOSALS from a deterioration result.
 *
 * @param {Object} deterioration   result of detectDeterioration / analyzeEpisode
 * @param {Object} [ctx]
 * @param {*} [ctx.episodeId]
 * @param {*} [ctx.beneficiaryId]
 * @returns {Array<Object>} proposals — sorted worst-first, never auto-applied
 */
function buildPlanRecommendations(deterioration, ctx = {}) {
  const signals =
    deterioration && Array.isArray(deterioration.signals) ? deterioration.signals : [];
  const episodeId =
    ctx.episodeId != null
      ? ctx.episodeId
      : deterioration && deterioration.episodeId != null
        ? deterioration.episodeId
        : null;
  const beneficiaryId =
    ctx.beneficiaryId != null
      ? ctx.beneficiaryId
      : deterioration && deterioration.beneficiaryId != null
        ? deterioration.beneficiaryId
        : null;

  return signals
    .filter(s => ACTIONABLE.has(s.severity))
    .map(s => {
      const urgency = URGENCY[s.severity] || URGENCY.watch;
      const rationale = _rationale(s);
      return {
        // Identity is left to the caller — pure builder assigns no IDs / timestamps.
        kind: 'plan_of_care_review',
        episodeId,
        beneficiaryId,
        measureCode: s.measureCode,
        measureName_ar: s.name_ar,
        measureName_en: s.name_en,
        severity: s.severity,
        priority: s.priority,
        urgency: urgency.key,
        urgency_ar: urgency.ar,
        urgency_en: urgency.en,
        slaHours: urgency.sla_hours,
        // Governance flags — explicit, not implied.
        status: 'proposed',
        requiresApproval: true,
        autoApplied: false,
        approverRoles: ['specialist', 'clinical_lead'],
        rationale_ar: rationale.ar,
        rationale_en: rationale.en,
        // Full explainability — the exact evidence the proposal rests on.
        evidence: {
          classification: s.classification,
          slopePerMonth: s.slopePerMonth,
          r2: s.r2,
          confidence: s.confidence,
          cutoffCrossed: s.cutoffCrossed,
          latestValue: s.latestValue,
          previousValue: s.previousValue,
          latestBandSeverity: s.latestBandSeverity,
          administrations: s.administrations,
          reasons: s.reasons,
        },
        suggestedActions: _suggestedActions(s.severity),
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

module.exports = {
  ACTIONABLE,
  buildPlanRecommendations,
};
