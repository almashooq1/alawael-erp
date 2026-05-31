'use strict';

/**
 * SeatingPosturalAssessment — W675.
 *
 * "تقييم الجلوس والوضعية / إدارة الوضعية على مدار 24 ساعة" — a clinical
 * seating + postural-management evaluation for day-rehab beneficiaries who are
 * dependent for positioning (cerebral palsy GMFCS IV–V, severe hypotonia,
 * progressive neuromuscular disease, post-TBI). For these children the
 * wheelchair / seating system is a 24-hour medical device: a wrong setup
 * causes pressure injury, accelerates scoliosis / hip migration, compromises
 * respiration and feeding, and blocks participation in therapy and education.
 *
 * Why a dedicated model (NOT AssistiveDevice, NOT PhysiotherapyAssessment):
 *   • AssistiveDevice tracks the wheelchair as INVENTORY (loan, maintenance,
 *     cost, condition). It does NOT capture the clinical seating PRESCRIPTION
 *     — postural support per body segment, pressure-injury risk, the 24-hour
 *     positioning plan, cushion/support recommendation with justification.
 *   • PhysiotherapyAssessment (W672) captures ROM / tone / strength / gait —
 *     the impairment level. Seating is the participation/equipment level: how
 *     the impairment is accommodated in sitting/lying/standing across the day.
 *   • Pressure-injury risk + bony-prominence sites drive a mitigation plan and
 *     a re-assessment cadence — a life-safety decision a generic note can't hold.
 *   • Longitudinal: growth, tone change, and skin breakdown all trigger a
 *     re-fit; serial comparison (initial → review) is the whole point.
 *
 * Wave-18 invariants:
 *   • assessmentType ∈ ASSESSMENT_TYPES ; positioningContext ∈ CONTEXTS
 *   • every posturalSupports[].segment ∈ BODY_SEGMENTS and .support ∈ SUPPORT_LEVELS
 *   • pressureInjuryRisk ∈ RISK_LEVELS
 *   • pressureInjuryRisk ∈ {moderate,high} → mitigationPlan required (cannot
 *     leave an at-risk child without a documented skin-protection plan)
 *   • existingPressureInjury=true → injuryStage + injurySite required
 *   • assessmentType='discharge' → outcomeSummary required
 *   • status=finalized → assessedBy + assessedAt required
 *   • reassessmentDue (when set) must be ≥ date
 */

const mongoose = require('mongoose');

const ASSESSMENT_TYPES = ['initial', 'review', 'refit', 'discharge'];

// Where the positioning plan applies — a 24-hour view, not just the chair.
const CONTEXTS = ['sitting', 'lying', 'standing', 'transfers', 'transport', 'multiple'];

// GMFCS — Gross Motor Function Classification System (seating relevance climbs
// steeply at IV–V). '' = not classified / not applicable.
const GMFCS_LEVELS = ['I', 'II', 'III', 'IV', 'V', ''];

// Body segments a seating system supports.
const BODY_SEGMENTS = [
  'head_neck',
  'trunk',
  'pelvis',
  'hips',
  'lower_extremities',
  'upper_extremities',
  'feet',
];

// How much external support a segment needs.
const SUPPORT_LEVELS = ['none', 'monitor', 'minimal', 'moderate', 'total'];

// Pressure-injury risk band (simplified Braden-style clinical judgement).
const RISK_LEVELS = ['none', 'low', 'moderate', 'high'];

// NPUAP/EPUAP pressure-injury staging.
const INJURY_STAGES = [
  '',
  'stage_1',
  'stage_2',
  'stage_3',
  'stage_4',
  'unstageable',
  'deep_tissue',
];

// Seating equipment categories recommended / in use.
const EQUIPMENT_TYPES = [
  'standard_wheelchair',
  'tilt_in_space_wheelchair',
  'powered_wheelchair',
  'buggy_stroller',
  'activity_chair',
  'standing_frame',
  'sleep_system',
  'custom_moulded_seat',
  'other',
];

// Pressure-relief / cushion class.
const CUSHION_TYPES = ['none', 'foam', 'gel', 'air_cell', 'honeycomb', 'custom_contoured', 'other'];

const STATUSES = ['draft', 'finalized'];

// One postural-support requirement for a single body segment.
const PosturalSupportSchema = new mongoose.Schema(
  {
    segment: { type: String, default: '' }, // validated against BODY_SEGMENTS in __invariants
    support: { type: String, default: '' }, // validated against SUPPORT_LEVELS in __invariants
    device: { type: String, default: '', maxlength: 80 }, // lateral trunk supports, headrest, pommel…
    note: { type: String, default: '', maxlength: 120 },
  },
  { _id: false }
);

const SeatingPosturalAssessmentSchema = new mongoose.Schema(
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
    // The wheelchair / seating device in inventory this prescription configures.
    assistiveDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssistiveDevice',
      default: null,
    },

    date: { type: Date, required: true, index: true },
    assessmentType: { type: String, enum: ASSESSMENT_TYPES, default: 'initial', index: true },
    positioningContext: { type: String, enum: CONTEXTS, default: 'sitting' },
    gmfcsLevel: { type: String, enum: GMFCS_LEVELS, default: '' },
    reason: { type: String, default: '', maxlength: 300 },

    // Clinical observation.
    posturalObservation: { type: String, default: '', maxlength: 600 },
    fixedDeformities: { type: [String], default: () => [] }, // scoliosis, windswept hips, kyphosis…
    toleratesUpright: { type: Boolean, default: true },
    sittingToleranceMinutes: { type: Number, default: null, min: 0, max: 1440 },

    // Per-segment postural support needs (the prescription core).
    posturalSupports: { type: [PosturalSupportSchema], default: () => [] },

    // Pressure-injury management — the life-safety axis.
    pressureInjuryRisk: { type: String, enum: RISK_LEVELS, default: 'none', index: true },
    bonyProminenceSites: { type: [String], default: () => [] }, // sacrum, ischial_tuberosities, heels…
    existingPressureInjury: { type: Boolean, default: false },
    injuryStage: { type: String, enum: INJURY_STAGES, default: '' },
    injurySite: { type: String, default: '', maxlength: 80 },
    mitigationPlan: { type: String, default: '', maxlength: 1000 }, // repositioning schedule, offloading…
    repositioningIntervalMinutes: { type: Number, default: null, min: 0, max: 1440 },

    // Equipment recommendation.
    equipmentType: { type: String, enum: EQUIPMENT_TYPES.concat(['']), default: '' },
    cushionType: { type: String, enum: CUSHION_TYPES, default: 'none' },
    equipmentRecommendation: { type: String, default: '', maxlength: 1000 },

    // 24-hour positioning plan — free narrative per posture across the day.
    positioningPlan: { type: String, default: '', maxlength: 1500 },

    goalsSummary: { type: String, default: '', maxlength: 1000 },
    outcomeSummary: { type: String, default: '', maxlength: 1000 }, // required at discharge
    caregiverEducationGiven: { type: Boolean, default: false },
    reassessmentDue: { type: Date, default: null },

    notes: { type: String, default: '', maxlength: 1000 },

    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },
    assessedAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, collection: 'seating_postural_assessments' }
);

SeatingPosturalAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
SeatingPosturalAssessmentSchema.index({ branchId: 1, date: -1 });
SeatingPosturalAssessmentSchema.index({ pressureInjuryRisk: 1, date: -1 });
SeatingPosturalAssessmentSchema.index({ status: 1, date: -1 });

SeatingPosturalAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SeatingPosturalAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!ASSESSMENT_TYPES.includes(this.assessmentType)) {
    this.invalidate('assessmentType', `must be one of ${ASSESSMENT_TYPES.join(',')}`);
    ok = false;
  }
  if (!CONTEXTS.includes(this.positioningContext)) {
    this.invalidate('positioningContext', `must be one of ${CONTEXTS.join(',')}`);
    ok = false;
  }
  if (!RISK_LEVELS.includes(this.pressureInjuryRisk)) {
    this.invalidate('pressureInjuryRisk', `must be one of ${RISK_LEVELS.join(',')}`);
    ok = false;
  }
  // Validate embedded per-segment support value-sets.
  for (const s of this.posturalSupports || []) {
    if (s.segment && !BODY_SEGMENTS.includes(s.segment)) {
      this.invalidate('posturalSupports', `segment must be one of ${BODY_SEGMENTS.join(',')}`);
      ok = false;
      break;
    }
    if (s.support && !SUPPORT_LEVELS.includes(s.support)) {
      this.invalidate('posturalSupports', `support must be one of ${SUPPORT_LEVELS.join(',')}`);
      ok = false;
      break;
    }
  }
  // An at-risk child must have a documented skin-protection plan — no silent risk.
  if (
    ['moderate', 'high'].includes(this.pressureInjuryRisk) &&
    !String(this.mitigationPlan || '').trim()
  ) {
    this.invalidate(
      'mitigationPlan',
      'mitigationPlan required when pressureInjuryRisk is moderate or high'
    );
    ok = false;
  }
  // An existing injury must be staged + sited (drives wound care + offloading).
  if (this.existingPressureInjury) {
    if (!this.injuryStage || !INJURY_STAGES.includes(this.injuryStage) || this.injuryStage === '') {
      this.invalidate('injuryStage', 'injuryStage required when existingPressureInjury=true');
      ok = false;
    }
    if (!String(this.injurySite || '').trim()) {
      this.invalidate('injurySite', 'injurySite required when existingPressureInjury=true');
      ok = false;
    }
  }
  // A discharge assessment must state the outcome.
  if (this.assessmentType === 'discharge' && !String(this.outcomeSummary || '').trim()) {
    this.invalidate('outcomeSummary', 'outcomeSummary required for a discharge assessment');
    ok = false;
  }
  if (this.reassessmentDue && this.date && this.reassessmentDue < this.date) {
    this.invalidate('reassessmentDue', 'reassessmentDue must be >= assessment date');
    ok = false;
  }
  if (this.status === 'finalized') {
    if (!this.assessedBy && !String(this.assessedByName || '').trim()) {
      this.invalidate('assessedBy', 'assessor required to finalize');
      ok = false;
    }
    if (!this.assessedAt) {
      this.invalidate('assessedAt', 'assessedAt required to finalize');
      ok = false;
    }
  }
  return ok;
});

/** True when the child carries a clinically significant skin-breakdown risk. */
SeatingPosturalAssessmentSchema.virtual('isPressureAtRisk').get(function () {
  return (
    this.existingPressureInjury ||
    this.pressureInjuryRisk === 'high' ||
    this.pressureInjuryRisk === 'moderate'
  );
});

/** Count of body segments with a defined support need — completeness signal. */
SeatingPosturalAssessmentSchema.virtual('segmentsSupported').get(function () {
  return Array.isArray(this.posturalSupports)
    ? this.posturalSupports.filter(s => s.support && s.support !== 'none').length
    : 0;
});

SeatingPosturalAssessmentSchema.set('toJSON', { virtuals: true });
SeatingPosturalAssessmentSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.SeatingPosturalAssessment ||
  mongoose.model('SeatingPosturalAssessment', SeatingPosturalAssessmentSchema);

module.exports.ASSESSMENT_TYPES = ASSESSMENT_TYPES;
module.exports.CONTEXTS = CONTEXTS;
module.exports.GMFCS_LEVELS = GMFCS_LEVELS;
module.exports.BODY_SEGMENTS = BODY_SEGMENTS;
module.exports.SUPPORT_LEVELS = SUPPORT_LEVELS;
module.exports.RISK_LEVELS = RISK_LEVELS;
module.exports.INJURY_STAGES = INJURY_STAGES;
module.exports.EQUIPMENT_TYPES = EQUIPMENT_TYPES;
module.exports.CUSHION_TYPES = CUSHION_TYPES;
module.exports.STATUSES = STATUSES;
