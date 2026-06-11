'use strict';

/**
 * SleepAssessment — Wave 1020.
 *
 * "تقييم النوم وبرنامج نظافة النوم" — structured screen of sleep problems +
 * a behavioral sleep-hygiene intervention plan for any beneficiary at the
 * day-rehab center. Sleep disturbance is one of the most prevalent and
 * under-treated comorbidities across the served population: autism (50-80%
 * prevalence), ADHD, intellectual disability, cerebral palsy, and
 * syndromic presentations. Poor sleep directly worsens daytime behavior,
 * learning, seizure threshold, and family stress.
 *
 * Why a dedicated model:
 *   • Sleep is a STANDING, re-assessable attribute driving a behavioral
 *     plan + a review cadence — not a one-off event. A tool-based screen
 *     (CSHQ / SDSC / BEARS) yields a severity that a generic assessment
 *     can't surface, and the high-severity cohort needs follow-up.
 *   • Obstructive-sleep-apnea suspicion (snoring + daytime sleepiness)
 *     must trigger an ENT/sleep-clinic referral — a domain-specific gate.
 *   • Distinct from SeizureEvent (W356) and the behavior plans — sleep is
 *     its own clinical domain that cross-references them (poor sleep lowers
 *     seizure threshold + worsens behavior) without overlapping.
 *
 * Wave-18 invariants:
 *   • tool ∈ TOOLS ; problemSeverity ∈ SEVERITY_LEVELS ; problemScore ≥ 0
 *   • problemSeverity ∈ {moderate,severe} ⇒ ≥1 sleepHygieneInterventions
 *   • problemSeverity = severe ⇒ nextReviewDue required
 *   • suspectedOSA = true ⇒ referralMade = true (OSA must be referred)
 *   • referralMade = true ⇒ referralTarget required
 *   • status = finalized ⇒ finalizedBy(name) + finalizedAt
 *   • nextReviewDue (when set) ≥ date
 */

const mongoose = require('mongoose');

// Recognized pediatric/disability sleep screening tools.
const TOOLS = ['cshq', 'sdsc', 'bears', 'clinical_judgment'];
const SEVERITY_LEVELS = ['none', 'mild', 'moderate', 'severe'];
const ASSESSMENT_TYPES = ['initial', 'scheduled', 'post_intervention', 'condition_change'];
const REFERRAL_TARGETS = ['pediatrician', 'sleep_clinic', 'ent', 'neurology', 'psychiatry'];

// Behavioral sleep-hygiene plan catalog (multi-select). Exported for UI.
const INTERVENTIONS = [
  'consistent_bedtime_routine',
  'reduce_evening_screen_time',
  'bedroom_environment_modification',
  'melatonin_review',
  'daytime_physical_activity',
  'caffeine_reduction',
  'bedtime_fading',
  'positive_bedtime_routine',
  'weighted_blanket_trial',
  'sleep_diary',
  'graduated_extinction',
  'referral_sleep_clinic',
  'referral_ent',
  'parent_education',
];

// The boolean problem-domain flags that feed the severity score.
const PROBLEM_FLAGS = [
  'bedtimeResistance',
  'sleepOnsetDelay',
  'frequentNightWakings',
  'earlyMorningWaking',
  'daytimeSleepiness',
  'snoring',
  'parasomnias',
  'restlessSleep',
  'coSleepingDependence',
  'nocturnalEnuresis',
];

const SCORE_THRESHOLD_MILD = 1; // 1-2 = mild
const SCORE_THRESHOLD_MODERATE = 3; // 3-5 = moderate
const SCORE_THRESHOLD_SEVERE = 6; // 6+ = severe

/**
 * computeSleepSeverity — pure, exported static so the route, sweeper, and
 * behavioral test all derive severity identically (write path == read path).
 *
 * @param {object} f factor inputs
 * @returns {{score:number, level:('none'|'mild'|'moderate'|'severe')}}
 */
function computeSleepSeverity(f = {}) {
  let score = 0;
  if (Number(f.sleepOnsetLatencyMinutes) > 30) score += 1;
  if (Number(f.nightWakingsPerNight) >= 2) score += 1;
  if (typeof f.totalSleepHours === 'number' && f.totalSleepHours > 0 && f.totalSleepHours < 7) {
    score += 1;
  }
  for (const flag of PROBLEM_FLAGS) {
    if (f[flag]) score += 1;
  }
  let level = 'none';
  if (score >= SCORE_THRESHOLD_SEVERE) level = 'severe';
  else if (score >= SCORE_THRESHOLD_MODERATE) level = 'moderate';
  else if (score >= SCORE_THRESHOLD_MILD) level = 'mild';
  return { score, level };
}

const SleepAssessmentSchema = new mongoose.Schema(
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
    tool: { type: String, enum: TOOLS, default: 'bears', index: true },

    // ── Quantitative sleep parameters ────────────────────────────────
    bedtime: { type: String, default: '', maxlength: 10 }, // "21:30"
    wakeTime: { type: String, default: '', maxlength: 10 },
    sleepOnsetLatencyMinutes: { type: Number, default: null, min: 0, max: 600 },
    nightWakingsPerNight: { type: Number, default: null, min: 0, max: 30 },
    totalSleepHours: { type: Number, default: null, min: 0, max: 24 },

    // ── Problem-domain flags ─────────────────────────────────────────
    bedtimeResistance: { type: Boolean, default: false },
    sleepOnsetDelay: { type: Boolean, default: false },
    frequentNightWakings: { type: Boolean, default: false },
    earlyMorningWaking: { type: Boolean, default: false },
    daytimeSleepiness: { type: Boolean, default: false },
    snoring: { type: Boolean, default: false }, // sleep-disordered-breathing marker
    parasomnias: { type: Boolean, default: false }, // nightmares/terrors/sleepwalking
    restlessSleep: { type: Boolean, default: false },
    coSleepingDependence: { type: Boolean, default: false },
    nocturnalEnuresis: { type: Boolean, default: false },

    // ── Computed result ──────────────────────────────────────────────
    problemScore: { type: Number, default: 0, min: 0, max: 1000, index: true },
    problemSeverity: { type: String, enum: SEVERITY_LEVELS, default: 'none', index: true },
    suspectedOSA: { type: Boolean, default: false }, // obstructive sleep apnea suspicion

    // ── Intervention plan ────────────────────────────────────────────
    sleepHygieneInterventions: { type: [String], default: () => [] },
    melatoninReviewed: { type: Boolean, default: false },
    referralMade: { type: Boolean, default: false },
    referralTarget: {
      type: String,
      enum: REFERRAL_TARGETS.concat([null]),
      default: null,
    },
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
  { timestamps: true, collection: 'sleep_assessments' }
);

SleepAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
SleepAssessmentSchema.index({ branchId: 1, problemSeverity: 1, status: 1 });
SleepAssessmentSchema.index({ status: 1, nextReviewDue: 1 });
SleepAssessmentSchema.index({ problemSeverity: 1, date: -1 });

SleepAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SleepAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!TOOLS.includes(this.tool)) {
    this.invalidate('tool', `must be one of ${TOOLS.join(',')}`);
    ok = false;
  }
  if (!SEVERITY_LEVELS.includes(this.problemSeverity)) {
    this.invalidate('problemSeverity', `must be one of ${SEVERITY_LEVELS.join(',')}`);
    ok = false;
  }
  if (typeof this.problemScore === 'number' && this.problemScore < 0) {
    this.invalidate('problemScore', 'problemScore must be >= 0');
    ok = false;
  }
  if (this.problemSeverity === 'moderate' || this.problemSeverity === 'severe') {
    if (
      !Array.isArray(this.sleepHygieneInterventions) ||
      this.sleepHygieneInterventions.length === 0
    ) {
      this.invalidate(
        'sleepHygieneInterventions',
        'at least one sleep-hygiene intervention required when severity is moderate/severe'
      );
      ok = false;
    }
  }
  if (this.problemSeverity === 'severe' && !this.nextReviewDue) {
    this.invalidate('nextReviewDue', 'nextReviewDue required when severity is severe');
    ok = false;
  }
  if (this.suspectedOSA && !this.referralMade) {
    this.invalidate('referralMade', 'a referral is required when OSA is suspected');
    ok = false;
  }
  if (this.referralMade && !this.referralTarget) {
    this.invalidate('referralTarget', 'referralTarget required when a referral is made');
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
 * isHighSeverity — surfaced for dashboards + the follow-up roster without
 * re-deriving from the score.
 */
SleepAssessmentSchema.virtual('isHighSeverity').get(function () {
  return this.problemSeverity === 'severe';
});

/**
 * isReassessmentOverdue — a finalized assessment whose review date lapsed.
 */
SleepAssessmentSchema.virtual('isReassessmentOverdue').get(function () {
  return (
    this.status === 'finalized' &&
    this.nextReviewDue instanceof Date &&
    this.nextReviewDue.getTime() < Date.now()
  );
});

SleepAssessmentSchema.set('toJSON', { virtuals: true });
SleepAssessmentSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1046) — native pre-compile hooks (W954-safe).
// On the draft→finalized flip → sleep_assessment timeline row.
SleepAssessmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
SleepAssessmentSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId)
      return;
    Promise.resolve(
      integrationBus.publish('clinical-safety', 'sleep.assessment_finalized', {
        sleepAssessmentId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        problemSeverity: doc.problemSeverity,
        suspectedOSA: !!doc.suspectedOSA,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.SleepAssessment || mongoose.model('SleepAssessment', SleepAssessmentSchema);

module.exports.TOOLS = TOOLS;
module.exports.SEVERITY_LEVELS = SEVERITY_LEVELS;
module.exports.ASSESSMENT_TYPES = ASSESSMENT_TYPES;
module.exports.REFERRAL_TARGETS = REFERRAL_TARGETS;
module.exports.INTERVENTIONS = INTERVENTIONS;
module.exports.PROBLEM_FLAGS = PROBLEM_FLAGS;
module.exports.SCORE_THRESHOLD_MILD = SCORE_THRESHOLD_MILD;
module.exports.SCORE_THRESHOLD_MODERATE = SCORE_THRESHOLD_MODERATE;
module.exports.SCORE_THRESHOLD_SEVERE = SCORE_THRESHOLD_SEVERE;
module.exports.computeSleepSeverity = computeSleepSeverity;
