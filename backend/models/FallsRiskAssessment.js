'use strict';

/**
 * FallsRiskAssessment — Wave 1010.
 *
 * "تقييم خطر السقوط والوقاية منه" — periodic falls-risk screening + an
 * individualized prevention plan for any beneficiary at the day-rehab
 * center. Target population is broad: cerebral palsy (GMFCS II–IV),
 * ataxic/hypotonic presentations, post-seizure recovery, visual
 * impairment, medication-induced sedation, and any mobility-impaired
 * adult in vocational/independence programs.
 *
 * Why a dedicated model (rather than reusing quality/Incident or a
 * generic assessment):
 *   • Falls-risk is a STANDING attribute that drives a prevention plan
 *     and a re-assessment cadence — not a one-off event. CBAHI/JCI
 *     accreditation require a documented, tool-based screen with a
 *     review trigger after any fall, medication change, or condition
 *     change.
 *   • The risk SCORE → LEVEL mapping is tool-specific (Morse / Humpty
 *     Dumpty pediatric / STRATIFY) — a generic assessment can't surface
 *     the standardized score or the high-risk cohort for supervision
 *     staffing.
 *   • Distinct from SeatingPosturalAssessment (W675) — that scores
 *     wheelchair/posture/pressure risk; this scores ambulatory fall
 *     risk + supervision level. They cross-reference but don't overlap.
 *   • Distinct from a fall INCIDENT (quality/Incident) — a fall is the
 *     event; this is the standing risk + the plan that should have
 *     prevented it. Denormalizes `lastFallDate` +
 *     `numberOfFallsLast6Months` as scoring inputs only.
 *
 * Wave-18 invariants:
 *   • tool ∈ TOOLS ; riskLevel ∈ RISK_LEVELS ; riskScore ≥ 0
 *   • riskLevel=high ⇒ ≥1 preventionInterventions AND nextReviewDue set
 *     (a high-risk screen with no plan and no review date is a finding)
 *   • assessmentType=post_fall ⇒ lastFallDate required
 *   • (historyOfFalling OR numberOfFallsLast6Months>0) ⇒ lastFallDate
 *   • status=finalized ⇒ finalizedBy(name) + finalizedAt required
 *   • nextReviewDue (when set) ≥ date
 */

const mongoose = require('mongoose');

// Recognized falls-risk screening tools. clinical_judgment = structured
// observation when no validated tool fits (common in profound ID).
const TOOLS = ['morse', 'humpty_dumpty', 'stratify', 'clinical_judgment'];
const RISK_LEVELS = ['low', 'moderate', 'high'];
const ASSESSMENT_TYPES = [
  'initial',
  'scheduled',
  'post_fall',
  'condition_change',
  'medication_change',
];
const GAIT_LEVELS = ['none', 'mild', 'moderate', 'severe'];
const MOBILITY_AIDS = [
  'none',
  'cane',
  'walker',
  'wheelchair',
  'furniture_surfing', // clutches furniture/walls — Morse high-risk marker
  'staff_assist',
];
const SUPERVISION_LEVELS = ['independent', 'intermittent', 'within_arms_reach', 'one_to_one'];
const STATUSES = ['draft', 'finalized'];

// Prevention-plan catalog (multi-select). Exported for the create-form UI.
const INTERVENTIONS = [
  'supervision_increase',
  'gait_aid_provided',
  'environmental_modification',
  'non_slip_footwear',
  'hip_protectors',
  'bed_chair_alarm',
  'physiotherapy_referral',
  'occupational_therapy_referral',
  'medication_review',
  'vision_referral',
  'toileting_schedule',
  'caregiver_education',
];

// Level thresholds — Morse-aligned bands, reused for all tools so the
// high-risk cohort is comparable across tools.
const SCORE_THRESHOLD_MODERATE = 25;
const SCORE_THRESHOLD_HIGH = 50;

/**
 * computeRisk — pure, tool-agnostic additive scoring over the captured
 * factor flags. Kept as a static so the route, the reassessment sweeper,
 * and the behavioral test all score identically (no drift between the
 * write path and the read path).
 *
 * @param {object} f factor inputs
 * @returns {{score:number, level:('low'|'moderate'|'high')}}
 */
function computeRisk(f = {}) {
  let score = 0;
  if (f.historyOfFalling) score += 25;
  if (Number(f.numberOfFallsLast6Months) >= 2) score += 10;
  if (f.seizureDisorder) score += 15;
  switch (f.gaitBalanceImpairment) {
    case 'mild':
      score += 10;
      break;
    case 'moderate':
      score += 20;
      break;
    case 'severe':
      score += 30;
      break;
    default:
      break;
  }
  // Morse "ambulatory aid": crutch/cane/walker=15, furniture=30,
  // none/wheelchair(seated)/staff-assist=0.
  if (f.mobilityAid === 'cane' || f.mobilityAid === 'walker') score += 15;
  else if (f.mobilityAid === 'furniture_surfing') score += 30;
  if (f.visualImpairment) score += 10;
  if (f.cognitiveBehavioralImpairment) score += 15;
  if (f.highRiskMedication) score += 10;
  if (f.continenceUrgency) score += 10;

  let level = 'low';
  if (score >= SCORE_THRESHOLD_HIGH) level = 'high';
  else if (score >= SCORE_THRESHOLD_MODERATE) level = 'moderate';
  return { score, level };
}

const FallsRiskAssessmentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },
    carePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },

    date: { type: Date, required: true, index: true },
    assessmentType: { type: String, enum: ASSESSMENT_TYPES, default: 'initial', index: true },
    tool: { type: String, enum: TOOLS, default: 'morse', index: true },

    // ── Scoring factor inputs ────────────────────────────────────────
    historyOfFalling: { type: Boolean, default: false },
    numberOfFallsLast6Months: { type: Number, default: 0, min: 0, max: 500 },
    lastFallDate: { type: Date, default: null },
    gaitBalanceImpairment: { type: String, enum: GAIT_LEVELS, default: 'none' },
    mobilityAid: { type: String, enum: MOBILITY_AIDS, default: 'none' },
    visualImpairment: { type: Boolean, default: false },
    cognitiveBehavioralImpairment: { type: Boolean, default: false },
    seizureDisorder: { type: Boolean, default: false },
    highRiskMedication: { type: Boolean, default: false }, // sedatives/anticonvulsants/antihypertensives
    continenceUrgency: { type: Boolean, default: false },
    environmentalHazards: { type: [String], default: () => [] },

    // ── Computed result ──────────────────────────────────────────────
    riskScore: { type: Number, default: 0, min: 0, max: 1000, index: true },
    riskLevel: { type: String, enum: RISK_LEVELS, default: 'low', index: true },

    // ── Prevention plan ──────────────────────────────────────────────
    preventionInterventions: { type: [String], default: () => [] },
    supervisionLevel: { type: String, enum: SUPERVISION_LEVELS, default: 'independent' },
    preventionNotes: { type: String, default: '', maxlength: 1000 },
    nextReviewDue: { type: Date, default: null, index: true },

    notes: { type: String, default: '', maxlength: 1000 },

    // ── Lifecycle ────────────────────────────────────────────────────
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedByName: { type: String, default: '', maxlength: 100 },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'falls_risk_assessments' }
);

FallsRiskAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
FallsRiskAssessmentSchema.index({ branchId: 1, riskLevel: 1, status: 1 });
FallsRiskAssessmentSchema.index({ status: 1, nextReviewDue: 1 });
FallsRiskAssessmentSchema.index({ riskLevel: 1, date: -1 });

FallsRiskAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

FallsRiskAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!TOOLS.includes(this.tool)) {
    this.invalidate('tool', `must be one of ${TOOLS.join(',')}`);
    ok = false;
  }
  if (!RISK_LEVELS.includes(this.riskLevel)) {
    this.invalidate('riskLevel', `must be one of ${RISK_LEVELS.join(',')}`);
    ok = false;
  }
  if (typeof this.riskScore === 'number' && this.riskScore < 0) {
    this.invalidate('riskScore', 'riskScore must be >= 0');
    ok = false;
  }
  if (this.riskLevel === 'high') {
    if (!Array.isArray(this.preventionInterventions) || this.preventionInterventions.length === 0) {
      this.invalidate(
        'preventionInterventions',
        'at least one prevention intervention required when riskLevel=high'
      );
      ok = false;
    }
    if (!this.nextReviewDue) {
      this.invalidate('nextReviewDue', 'nextReviewDue required when riskLevel=high');
      ok = false;
    }
  }
  if (this.assessmentType === 'post_fall' && !this.lastFallDate) {
    this.invalidate('lastFallDate', 'lastFallDate required when assessmentType=post_fall');
    ok = false;
  }
  if ((this.historyOfFalling || Number(this.numberOfFallsLast6Months) > 0) && !this.lastFallDate) {
    this.invalidate('lastFallDate', 'lastFallDate required when a fall history is recorded');
    ok = false;
  }
  if (this.nextReviewDue && this.date && this.nextReviewDue < this.date) {
    this.invalidate('nextReviewDue', 'nextReviewDue must be >= assessment date');
    ok = false;
  }
  if (this.status === 'finalized') {
    if (!this.finalizedBy && !String(this.finalizedByName || '').trim()) {
      this.invalidate('finalizedBy', 'finalizer required to finalize');
      ok = false;
    }
    if (!this.finalizedAt) {
      this.invalidate('finalizedAt', 'finalizedAt required to finalize');
      ok = false;
    }
  }
  return ok;
});

/**
 * isHighRisk — surfaced for dashboards + the supervision-staffing roster
 * without re-deriving from score.
 */
FallsRiskAssessmentSchema.virtual('isHighRisk').get(function () {
  return this.riskLevel === 'high';
});

/**
 * isReassessmentOverdue — a finalized assessment whose review date has
 * passed. The clinical-safety sweeper (W1012) flags these so a high-risk
 * beneficiary never silently drifts past their review cadence.
 */
FallsRiskAssessmentSchema.virtual('isReassessmentOverdue').get(function () {
  return (
    this.status === 'finalized' &&
    this.nextReviewDue instanceof Date &&
    this.nextReviewDue.getTime() < Date.now()
  );
});

FallsRiskAssessmentSchema.set('toJSON', { virtuals: true });
FallsRiskAssessmentSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1046) ──────────────────────────────────────
// Native pre-compile hooks (defined BEFORE mongoose.model) so they ACTUALLY
// fire at runtime. Signature `function(doc)` — NOT a 1-param `next` (W954
// legacy-shim hang trap). On the draft→finalized flip, publish to the
// integration bus → dddCrossModuleSubscribers → CareTimeline (falls_risk_assessed).
FallsRiskAssessmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
FallsRiskAssessmentSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId)
      return;
    Promise.resolve(
      integrationBus.publish('clinical-safety', 'falls.assessment_finalized', {
        fallsRiskAssessmentId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        riskLevel: doc.riskLevel,
        riskScore: doc.riskScore,
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports =
  mongoose.models.FallsRiskAssessment ||
  mongoose.model('FallsRiskAssessment', FallsRiskAssessmentSchema);

module.exports.TOOLS = TOOLS;
module.exports.RISK_LEVELS = RISK_LEVELS;
module.exports.ASSESSMENT_TYPES = ASSESSMENT_TYPES;
module.exports.GAIT_LEVELS = GAIT_LEVELS;
module.exports.MOBILITY_AIDS = MOBILITY_AIDS;
module.exports.SUPERVISION_LEVELS = SUPERVISION_LEVELS;
module.exports.STATUSES = STATUSES;
module.exports.INTERVENTIONS = INTERVENTIONS;
module.exports.SCORE_THRESHOLD_MODERATE = SCORE_THRESHOLD_MODERATE;
module.exports.SCORE_THRESHOLD_HIGH = SCORE_THRESHOLD_HIGH;
module.exports.computeRisk = computeRisk;
