'use strict';

/**
 * DrivingRehabAssessment — Wave 1022.
 *
 * "تقييم تأهيل القيادة" — fitness-to-drive + driver-rehabilitation
 * assessment for higher-functioning beneficiaries with a physical or
 * cognitive disability who are candidates for independent driving (often
 * in the vocational/independence-program track): spinal-cord injury,
 * amputation, hemiplegia, post-TBI, and stable neurological conditions.
 *
 * Why a dedicated model:
 *   • Driver rehabilitation is a recognized OT specialty (CDRS) with a
 *     distinct workflow: pre-driving clinical screen (vision + cognition +
 *     physical control + transfers) → adaptive-equipment prescription →
 *     on-road/simulator evaluation → a documented fitness recommendation.
 *   • Distinct from OrientationMobility (W1021) — O&M is PEDESTRIAN travel
 *     for the visually impaired; this is VEHICLE operation for the
 *     physically/cognitively impaired. No overlap.
 *   • The fitness recommendation drives licensing/restriction decisions
 *     and a re-assessment cadence a generic assessment can't express.
 *
 * Wave-18 invariants:
 *   • assessmentType / licenseStatus / recommendation / readinessLevel /
 *     onRoadAssessment ∈ their enums
 *   • recommendation = fit_with_adaptations ⇒ ≥1 adaptiveEquipmentNeeded
 *   • recommendation ∈ {not_fit_currently, further_training} ⇒ nextReviewDue
 *   • status = finalized ⇒ finalizedBy(name) + finalizedAt
 *   • nextReviewDue (when set) ≥ date
 */

const mongoose = require('mongoose');

const ASSESSMENT_TYPES = ['initial', 'reassessment', 'post_training', 'on_road'];
const LICENSE_STATUSES = ['none', 'learner', 'licensed', 'suspended'];
const COGNITIVE_LEVELS = ['pass', 'borderline', 'fail'];
const PHYSICAL_LEVELS = ['adequate', 'needs_adaptation', 'inadequate'];
const SEATING_LEVELS = ['independent', 'needs_aid', 'dependent'];
const ONROAD_OUTCOMES = ['not_done', 'passed', 'failed', 'conditional'];
const RECOMMENDATIONS = [
  'fit_to_drive',
  'fit_with_adaptations',
  'not_fit_currently',
  'further_training',
  'refer_on_road_evaluation',
];
const READINESS_LEVELS = ['not_ready', 'further_assessment', 'ready_with_adaptation', 'ready'];

// Adaptive-driving-equipment catalog (multi-select). Exported for UI.
const ADAPTIVE_EQUIPMENT = [
  'hand_controls',
  'left_foot_accelerator',
  'steering_knob',
  'pedal_extensions',
  'wheelchair_accessible_vehicle',
  'seat_modification',
  'mirror_adaptation',
  'parking_brake_extension',
  'reduced_effort_steering',
  'reduced_effort_braking',
];

// Common licensing restrictions (multi-select). Exported for UI.
const RESTRICTIONS = [
  'daytime_only',
  'automatic_transmission_only',
  'local_area_only',
  'no_highway',
  'adaptive_equipment_required',
  'corrective_lenses',
];

/**
 * computeReadiness — pure, exported static so the route, sweeper, and
 * behavioral test derive the readiness level identically. Conservative:
 * any hard-stop screen (vision/cognition/physical) blocks readiness.
 *
 * @param {object} f component screen levels
 * @returns {('not_ready'|'further_assessment'|'ready_with_adaptation'|'ready')}
 */
function computeReadiness(f = {}) {
  const visionOk = !!f.visionAdequate;
  const cog = f.cognitiveScreenLevel;
  const phys = f.physicalControlLevel;
  const seat = f.seatingTransfersLevel;
  // Hard stops — any one fails the screen outright.
  if (!visionOk || cog === 'fail' || phys === 'inadequate') return 'not_ready';
  // Incomplete clinical data → cannot clear yet.
  if (!cog || !phys) return 'further_assessment';
  // Adaptation pathway.
  if (
    cog === 'borderline' ||
    phys === 'needs_adaptation' ||
    seat === 'needs_aid' ||
    seat === 'dependent'
  ) {
    return 'ready_with_adaptation';
  }
  // Fully clear.
  if (cog === 'pass' && phys === 'adequate' && (seat === 'independent' || !seat)) return 'ready';
  return 'further_assessment';
}

const DrivingRehabAssessmentSchema = new mongoose.Schema(
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
    licenseStatus: { type: String, enum: LICENSE_STATUSES, default: 'none' },

    // ── Pre-driving clinical screen ──────────────────────────────────
    visionAdequate: { type: Boolean, default: false }, // meets the vision standard
    cognitiveScreenLevel: { type: String, enum: COGNITIVE_LEVELS.concat([null]), default: null },
    physicalControlLevel: { type: String, enum: PHYSICAL_LEVELS.concat([null]), default: null },
    seatingTransfersLevel: { type: String, enum: SEATING_LEVELS.concat([null]), default: null },

    // ── Computed readiness ───────────────────────────────────────────
    readinessLevel: {
      type: String,
      enum: READINESS_LEVELS,
      default: 'further_assessment',
      index: true,
    },

    // ── Adaptive equipment + on-road ─────────────────────────────────
    adaptiveEquipmentNeeded: { type: [String], default: () => [] },
    onRoadAssessment: { type: String, enum: ONROAD_OUTCOMES, default: 'not_done' },

    // ── Recommendation + restrictions ────────────────────────────────
    recommendation: {
      type: String,
      enum: RECOMMENDATIONS,
      default: 'further_training',
      index: true,
    },
    restrictions: { type: [String], default: () => [] },
    planNotes: { type: String, default: '', maxlength: 1000 },
    nextReviewDue: { type: Date, default: null, index: true },

    notes: { type: String, default: '', maxlength: 1000 },

    // ── Lifecycle ────────────────────────────────────────────────────
    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },

    status: { type: String, enum: ['draft', 'finalized'], default: 'draft', index: true },
    finalizedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    finalizedByName: { type: String, default: '', maxlength: 100 },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'driving_rehab_assessments' }
);

DrivingRehabAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
DrivingRehabAssessmentSchema.index({ branchId: 1, recommendation: 1, status: 1 });
DrivingRehabAssessmentSchema.index({ status: 1, nextReviewDue: 1 });
DrivingRehabAssessmentSchema.index({ readinessLevel: 1, date: -1 });

DrivingRehabAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

DrivingRehabAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!ASSESSMENT_TYPES.includes(this.assessmentType)) {
    this.invalidate('assessmentType', `must be one of ${ASSESSMENT_TYPES.join(',')}`);
    ok = false;
  }
  if (!LICENSE_STATUSES.includes(this.licenseStatus)) {
    this.invalidate('licenseStatus', `must be one of ${LICENSE_STATUSES.join(',')}`);
    ok = false;
  }
  if (!READINESS_LEVELS.includes(this.readinessLevel)) {
    this.invalidate('readinessLevel', `must be one of ${READINESS_LEVELS.join(',')}`);
    ok = false;
  }
  if (!RECOMMENDATIONS.includes(this.recommendation)) {
    this.invalidate('recommendation', `must be one of ${RECOMMENDATIONS.join(',')}`);
    ok = false;
  }
  if (!ONROAD_OUTCOMES.includes(this.onRoadAssessment)) {
    this.invalidate('onRoadAssessment', `must be one of ${ONROAD_OUTCOMES.join(',')}`);
    ok = false;
  }
  if (this.recommendation === 'fit_with_adaptations') {
    if (!Array.isArray(this.adaptiveEquipmentNeeded) || this.adaptiveEquipmentNeeded.length === 0) {
      this.invalidate(
        'adaptiveEquipmentNeeded',
        'at least one adaptive-equipment item required when recommendation=fit_with_adaptations'
      );
      ok = false;
    }
  }
  if (
    (this.recommendation === 'not_fit_currently' || this.recommendation === 'further_training') &&
    !this.nextReviewDue
  ) {
    this.invalidate('nextReviewDue', 'nextReviewDue required when not fit / further training');
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
 * isFitToDrive — surfaced for dashboards. True when the documented
 * recommendation clears the beneficiary to drive (with or without
 * adaptations).
 */
DrivingRehabAssessmentSchema.virtual('isFitToDrive').get(function () {
  return this.recommendation === 'fit_to_drive' || this.recommendation === 'fit_with_adaptations';
});

/**
 * isReassessmentOverdue — a finalized assessment whose review date lapsed.
 */
DrivingRehabAssessmentSchema.virtual('isReassessmentOverdue').get(function () {
  return (
    this.status === 'finalized' &&
    this.nextReviewDue instanceof Date &&
    this.nextReviewDue.getTime() < Date.now()
  );
});

DrivingRehabAssessmentSchema.set('toJSON', { virtuals: true });
DrivingRehabAssessmentSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1046) — native pre-compile hooks (W954-safe).
// On the draft→finalized flip → driving_assessment timeline row.
DrivingRehabAssessmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
DrivingRehabAssessmentSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId)
      return;
    Promise.resolve(
      integrationBus.publish('clinical-safety', 'driving.assessment_finalized', {
        drivingRehabAssessmentId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        recommendation: doc.recommendation,
        readinessLevel: doc.readinessLevel,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.DrivingRehabAssessment ||
  mongoose.model('DrivingRehabAssessment', DrivingRehabAssessmentSchema);

module.exports.ASSESSMENT_TYPES = ASSESSMENT_TYPES;
module.exports.LICENSE_STATUSES = LICENSE_STATUSES;
module.exports.COGNITIVE_LEVELS = COGNITIVE_LEVELS;
module.exports.PHYSICAL_LEVELS = PHYSICAL_LEVELS;
module.exports.SEATING_LEVELS = SEATING_LEVELS;
module.exports.ONROAD_OUTCOMES = ONROAD_OUTCOMES;
module.exports.RECOMMENDATIONS = RECOMMENDATIONS;
module.exports.READINESS_LEVELS = READINESS_LEVELS;
module.exports.ADAPTIVE_EQUIPMENT = ADAPTIVE_EQUIPMENT;
module.exports.RESTRICTIONS = RESTRICTIONS;
module.exports.computeReadiness = computeReadiness;
