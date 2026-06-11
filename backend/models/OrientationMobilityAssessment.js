'use strict';

/**
 * OrientationMobilityAssessment — Wave 1021.
 *
 * "تقييم التوجّه والحركة" — structured assessment of independent-travel
 * (Orientation & Mobility, O&M) skills + an individualized training plan
 * for blind, low-vision, and deafblind beneficiaries at the day-rehab
 * center. O&M is the discipline that teaches safe, efficient, independent
 * travel using the non-visual senses + a mobility aid (long cane, guide
 * dog, sighted guide, electronic travel aid).
 *
 * Why a dedicated model:
 *   • O&M is a STANDING skill profile that drives a training plan + a
 *     review cadence — not a one-off event. A domain-by-domain proficiency
 *     profile yields an independence level that a generic assessment can't
 *     surface, and the low-independence cohort needs a training plan.
 *   • Complements VisionScreening (W720) — that screens functional vision;
 *     this assesses the TRAVEL skills built on top of it. They cross-
 *     reference but don't overlap.
 *   • Distinct from AssistiveDevice (W359) — the cane is an aid; this is
 *     the skill of using it to travel independently.
 *
 * Wave-18 invariants:
 *   • visionStatus ∈ VISION_STATUSES ; primaryMobilityAid ∈ MOBILITY_AIDS
 *   • independenceLevel ∈ INDEPENDENCE_LEVELS ; independenceScore ≥ 0
 *   • independenceLevel ∈ {dependent,emerging} ⇒ ≥1 trainingGoals
 *     (a non-independent traveler with no plan is a finding)
 *   • status = finalized ⇒ finalizedBy(name) + finalizedAt
 *   • nextReviewDue (when set) ≥ date
 */

const mongoose = require('mongoose');

const VISION_STATUSES = ['blind', 'low_vision', 'functional_low_vision', 'deafblind'];
const MOBILITY_AIDS = [
  'long_cane',
  'support_cane',
  'guide_dog',
  'electronic_travel_aid',
  'sighted_guide',
  'none',
];
const ASSESSMENT_TYPES = ['initial', 'scheduled', 'progress', 'discharge'];
const PROFICIENCY_LEVELS = ['not_assessed', 'dependent', 'emerging', 'developing', 'independent'];
const INDEPENDENCE_LEVELS = ['dependent', 'emerging', 'developing', 'independent'];

// The O&M skill domains scored on the proficiency scale. Order matches the
// standard O&M curriculum progression (sensory → concepts → cane → travel).
const DOMAINS = [
  'sensoryAwareness',
  'spatialConcepts',
  'protectiveTechniques',
  'caneSkills',
  'indoorTravel',
  'outdoorResidentialTravel',
  'streetCrossing',
  'publicTransport',
  'problemSolving',
];

// Training-goal catalog (multi-select). Exported for UI.
const TRAINING_GOALS = [
  'sensory_training',
  'spatial_concept_development',
  'protective_techniques',
  'cane_skills_indoor',
  'cane_skills_outdoor',
  'residential_travel',
  'business_district_travel',
  'street_crossing',
  'public_transport',
  'problem_solving_recovery',
  'assistive_technology',
  'community_orientation',
];

const PROFICIENCY_POINTS = { dependent: 0, emerging: 1, developing: 2, independent: 3 };

const SCORE_THRESHOLD_EMERGING = 25;
const SCORE_THRESHOLD_DEVELOPING = 50;
const SCORE_THRESHOLD_INDEPENDENT = 75;

/**
 * computeIndependence — pure, exported static so the route, sweeper, and
 * behavioral test derive the independence level identically (write path ==
 * read path). Averages the proficiency points across ASSESSED domains
 * (skips 'not_assessed') and maps the 0-100 percentage to a level.
 *
 * @param {object} d domain → proficiency-level map
 * @returns {{score:number, level:('dependent'|'emerging'|'developing'|'independent')}}
 */
function computeIndependence(d = {}) {
  let sum = 0;
  let assessed = 0;
  for (const domain of DOMAINS) {
    const lvl = d[domain];
    if (lvl && Object.prototype.hasOwnProperty.call(PROFICIENCY_POINTS, lvl)) {
      sum += PROFICIENCY_POINTS[lvl];
      assessed += 1;
    }
  }
  if (assessed === 0) return { score: 0, level: 'dependent' };
  const score = Math.round((sum / (assessed * 3)) * 100);
  let level = 'dependent';
  if (score >= SCORE_THRESHOLD_INDEPENDENT) level = 'independent';
  else if (score >= SCORE_THRESHOLD_DEVELOPING) level = 'developing';
  else if (score >= SCORE_THRESHOLD_EMERGING) level = 'emerging';
  return { score, level };
}

const domainField = () => ({ type: String, enum: PROFICIENCY_LEVELS, default: 'not_assessed' });

const OrientationMobilityAssessmentSchema = new mongoose.Schema(
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
    visionScreeningId: {
      // cross-link to the W720 functional-vision screen, when present.
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VisionScreening',
      default: null,
    },

    date: { type: Date, required: true, index: true },
    assessmentType: { type: String, enum: ASSESSMENT_TYPES, default: 'initial', index: true },
    visionStatus: { type: String, enum: VISION_STATUSES, default: 'low_vision', index: true },
    primaryMobilityAid: { type: String, enum: MOBILITY_AIDS, default: 'long_cane' },

    // ── Skill-domain proficiency profile ─────────────────────────────
    sensoryAwareness: domainField(),
    spatialConcepts: domainField(),
    protectiveTechniques: domainField(),
    caneSkills: domainField(),
    indoorTravel: domainField(),
    outdoorResidentialTravel: domainField(),
    streetCrossing: domainField(),
    publicTransport: domainField(),
    problemSolving: domainField(),

    // ── Computed result ──────────────────────────────────────────────
    independenceScore: { type: Number, default: 0, min: 0, max: 100, index: true },
    independenceLevel: {
      type: String,
      enum: INDEPENDENCE_LEVELS,
      default: 'dependent',
      index: true,
    },

    // ── Training plan ────────────────────────────────────────────────
    trainingGoals: { type: [String], default: () => [] },
    sessionsPerWeek: { type: Number, default: null, min: 0, max: 14 },
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
  { timestamps: true, collection: 'orientation_mobility_assessments' }
);

OrientationMobilityAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
OrientationMobilityAssessmentSchema.index({ branchId: 1, independenceLevel: 1, status: 1 });
OrientationMobilityAssessmentSchema.index({ status: 1, nextReviewDue: 1 });
OrientationMobilityAssessmentSchema.index({ independenceLevel: 1, date: -1 });

OrientationMobilityAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

OrientationMobilityAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!VISION_STATUSES.includes(this.visionStatus)) {
    this.invalidate('visionStatus', `must be one of ${VISION_STATUSES.join(',')}`);
    ok = false;
  }
  if (!MOBILITY_AIDS.includes(this.primaryMobilityAid)) {
    this.invalidate('primaryMobilityAid', `must be one of ${MOBILITY_AIDS.join(',')}`);
    ok = false;
  }
  if (!INDEPENDENCE_LEVELS.includes(this.independenceLevel)) {
    this.invalidate('independenceLevel', `must be one of ${INDEPENDENCE_LEVELS.join(',')}`);
    ok = false;
  }
  if (typeof this.independenceScore === 'number' && this.independenceScore < 0) {
    this.invalidate('independenceScore', 'independenceScore must be >= 0');
    ok = false;
  }
  if (this.independenceLevel === 'dependent' || this.independenceLevel === 'emerging') {
    if (!Array.isArray(this.trainingGoals) || this.trainingGoals.length === 0) {
      this.invalidate(
        'trainingGoals',
        'at least one training goal required when independence is dependent/emerging'
      );
      ok = false;
    }
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
 * isIndependent — surfaced for dashboards + discharge review without
 * re-deriving from the score.
 */
OrientationMobilityAssessmentSchema.virtual('isIndependent').get(function () {
  return this.independenceLevel === 'independent';
});

/**
 * isReassessmentOverdue — a finalized assessment whose review date lapsed.
 */
OrientationMobilityAssessmentSchema.virtual('isReassessmentOverdue').get(function () {
  return (
    this.status === 'finalized' &&
    this.nextReviewDue instanceof Date &&
    this.nextReviewDue.getTime() < Date.now()
  );
});

OrientationMobilityAssessmentSchema.set('toJSON', { virtuals: true });
OrientationMobilityAssessmentSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1046) — native pre-compile hooks (W954-safe).
// On the draft→finalized flip → mobility_assessment timeline row.
OrientationMobilityAssessmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
OrientationMobilityAssessmentSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId)
      return;
    Promise.resolve(
      integrationBus.publish('clinical-safety', 'om.assessment_finalized', {
        orientationMobilityAssessmentId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        independenceLevel: doc.independenceLevel,
        independenceScore: doc.independenceScore,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.OrientationMobilityAssessment ||
  mongoose.model('OrientationMobilityAssessment', OrientationMobilityAssessmentSchema);

module.exports.VISION_STATUSES = VISION_STATUSES;
module.exports.MOBILITY_AIDS = MOBILITY_AIDS;
module.exports.ASSESSMENT_TYPES = ASSESSMENT_TYPES;
module.exports.PROFICIENCY_LEVELS = PROFICIENCY_LEVELS;
module.exports.INDEPENDENCE_LEVELS = INDEPENDENCE_LEVELS;
module.exports.DOMAINS = DOMAINS;
module.exports.TRAINING_GOALS = TRAINING_GOALS;
module.exports.SCORE_THRESHOLD_EMERGING = SCORE_THRESHOLD_EMERGING;
module.exports.SCORE_THRESHOLD_DEVELOPING = SCORE_THRESHOLD_DEVELOPING;
module.exports.SCORE_THRESHOLD_INDEPENDENT = SCORE_THRESHOLD_INDEPENDENT;
module.exports.computeIndependence = computeIndependence;
