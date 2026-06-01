'use strict';

/**
 * AudiologyScreening — W722.
 *
 * "فحص السمع الوظيفي / مسح السمع" — a functional-hearing screening for
 * day-rehab beneficiaries. Hearing loss is highly prevalent and routinely
 * under-detected in this population: ~independent or co-occurring in many
 * children with cerebral palsy, Down syndrome (chronic otitis media → fluctuating
 * conductive loss), autism, and NICU/TORCH histories. Undetected hearing loss
 * silently caps EVERY language, AAC, education and behaviour goal — so a
 * structured, longitudinal functional-hearing record is a first-class need, not
 * a free-text note. The sibling of VisionScreening (W720) on the sensory axis.
 *
 * Why a dedicated model (NOT a generic assessment, NOT AssistiveDevice):
 *   • This is a SCREEN (refer / monitor / pass), not a full diagnostic
 *     audiology work-up — it captures functional hearing + a per-ear level
 *     estimate + tympanometry + the behavioural risk cluster, and drives an
 *     ENT / audiology REFERRAL.
 *   • Level is method-dependent (pure-tone vs play/VRA for young kids vs OAE/ABR
 *     for non-responsive vs behavioural-observation) — a generic score field
 *     can't encode WHICH method produced the estimate.
 *   • Tympanometry (A/As/Ad/B/C) is a distinct middle-ear measure per ear, the
 *     key signal for the effusion that dominates this population's fluctuating loss.
 *   • Longitudinal: post-grommets / post-amplification re-screen is the progress
 *     marker; serial comparison needs structured persistence.
 *
 * Wave-18 invariants:
 *   • screeningMethod ∈ METHODS ; outcome ∈ OUTCOMES ; hearingLossType ∈ LOSS_TYPES
 *   • each ear's hearing level (when set) ∈ HEARING_LEVELS
 *   • each ear's tympanometry (when set) ∈ TYMPANOMETRY_TYPES
 *   • outcome='refer' → referralReason required (cannot refer with no reason)
 *   • amplificationRecommended=true → amplificationDetail required
 *   • riskIndicatorsPresent=true → at least one riskIndicator required
 *   • status=finalized → screenedBy/Name + screenedAt required
 *   • reassessmentDue (when set) must be ≥ date
 */

const mongoose = require('mongoose');

// Screening methods — vary by the beneficiary's ability to respond.
const METHODS = [
  'pure_tone_audiometry', // literate / verbal, headphones + hand-raise
  'play_audiometry', // conditioned play (toddlers)
  'visual_reinforcement_audiometry', // VRA (infants 6–24mo)
  'otoacoustic_emissions', // OAE (objective, cochlear)
  'auditory_brainstem_response', // ABR / BAER (objective, non-responsive)
  'tympanometry_only', // middle-ear screen only
  'behavioral_observation', // functional observation, no formal audiometry
  'otoscopy_only', // visual canal/drum inspection only
];

// Functional hearing bands per ear (dB HL estimate). '' = not measured.
const HEARING_LEVELS = [
  '',
  'normal_le_25', // ≤25 dB HL
  'mild_26_40',
  'moderate_41_55',
  'moderately_severe_56_70',
  'severe_71_90',
  'profound_gt_90', // >90 dB HL
  'unable_to_assess',
];

// Tympanometry trace type per ear (Jerger classification). '' = not done.
const TYMPANOMETRY_TYPES = [
  '',
  'A', // normal middle-ear pressure + compliance
  'As', // shallow (stiff — otosclerosis / scarring)
  'Ad', // deep (hypermobile — ossicular discontinuity)
  'B', // flat (effusion / perforation / impacted cerumen)
  'C', // negative pressure (eustachian-tube dysfunction)
];

const LOSS_TYPES = ['none', 'conductive', 'sensorineural', 'mixed', 'unknown'];

const OUTCOMES = ['pass', 'monitor', 'refer'];

// Behavioural / history risk indicators (JCIH-aligned) — multi-select.
const RISK_INDICATORS = [
  'no_startle_to_loud_sound',
  'does_not_turn_to_voice',
  'delayed_or_absent_speech',
  'frequent_ear_infections', // recurrent otitis media
  'family_history_of_hearing_loss',
  'nicu_stay_over_5_days',
  'torch_infection_history', // CMV/rubella/toxo etc
  'craniofacial_anomaly',
  'ototoxic_medication_exposure',
  'parent_caregiver_concern',
  'meningitis_history',
  'speech_regression',
];

// Functional-hearing behaviours observed OK during the screen (multi-select).
const FUNCTIONAL_DOMAINS = [
  'responds_to_name',
  'localizes_sound',
  'follows_verbal_instruction',
  'responds_to_environmental_sound',
  'discriminates_speech_in_quiet',
  'uses_amplification_consistently',
];

const STATUSES = ['draft', 'finalized'];

const AudiologyScreeningSchema = new mongoose.Schema(
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
    reason: { type: String, default: '', maxlength: 300 }, // intake / annual / concern-triggered

    screeningMethod: { type: String, enum: METHODS, required: true, index: true },
    wearsAmplificationDuringScreen: { type: Boolean, default: false }, // tested with current aids/CI?

    // Per-ear functional hearing-level estimate (validated in __invariants).
    levelRight: { type: String, default: '' },
    levelLeft: { type: String, default: '' },

    // Per-ear tympanometry trace (middle-ear status).
    tympanometryRight: { type: String, default: '' },
    tympanometryLeft: { type: String, default: '' },

    hearingLossType: { type: String, enum: LOSS_TYPES, default: 'unknown', index: true },

    // Functional hearing in daily activities (multi-select of behaviours observed OK).
    functionalDomainsIntact: { type: [String], default: () => [] },

    // Risk cluster.
    riskIndicatorsPresent: { type: Boolean, default: false },
    riskIndicators: { type: [String], default: () => [] },

    // Quick observations.
    otoscopyAbnormal: { type: Boolean, default: false }, // wax / inflammation / perforation seen
    otoscopyDetail: { type: String, default: '', maxlength: 300 },

    // Outcome + action.
    outcome: { type: String, enum: OUTCOMES, default: 'monitor', index: true },
    referralReason: { type: String, default: '', maxlength: 500 }, // required when outcome='refer'
    referralTo: { type: String, default: '', maxlength: 120 }, // ENT / audiology / cochlear-implant program

    amplificationRecommended: { type: Boolean, default: false },
    amplificationDetail: { type: String, default: '', maxlength: 300 }, // hearing aid / CI candidacy / FM system

    recommendations: { type: String, default: '', maxlength: 1000 }, // classroom/therapy adaptations
    reassessmentDue: { type: Date, default: null },

    notes: { type: String, default: '', maxlength: 1000 },

    screenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    screenedByName: { type: String, default: '', maxlength: 100 },
    screenedAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, collection: 'audiology_screenings' }
);

AudiologyScreeningSchema.index({ beneficiaryId: 1, date: -1 });
AudiologyScreeningSchema.index({ branchId: 1, date: -1 });
AudiologyScreeningSchema.index({ outcome: 1, date: -1 });
AudiologyScreeningSchema.index({ status: 1, date: -1 });

AudiologyScreeningSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AudiologyScreeningSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!METHODS.includes(this.screeningMethod)) {
    this.invalidate('screeningMethod', `must be one of ${METHODS.join(',')}`);
    ok = false;
  }
  if (!OUTCOMES.includes(this.outcome)) {
    this.invalidate('outcome', `must be one of ${OUTCOMES.join(',')}`);
    ok = false;
  }
  if (!LOSS_TYPES.includes(this.hearingLossType)) {
    this.invalidate('hearingLossType', `must be one of ${LOSS_TYPES.join(',')}`);
    ok = false;
  }
  // Per-ear hearing-level value-set (empty = not measured = allowed).
  for (const [field, val] of [
    ['levelRight', this.levelRight],
    ['levelLeft', this.levelLeft],
  ]) {
    if (val && !HEARING_LEVELS.includes(val)) {
      this.invalidate(field, `${field} must be one of ${HEARING_LEVELS.filter(Boolean).join(',')}`);
      ok = false;
    }
  }
  // Per-ear tympanometry value-set.
  for (const [field, val] of [
    ['tympanometryRight', this.tympanometryRight],
    ['tympanometryLeft', this.tympanometryLeft],
  ]) {
    if (val && !TYMPANOMETRY_TYPES.includes(val)) {
      this.invalidate(
        field,
        `${field} must be one of ${TYMPANOMETRY_TYPES.filter(Boolean).join(',')}`
      );
      ok = false;
    }
  }
  // Risk-indicator value-set.
  for (const s of this.riskIndicators || []) {
    if (!RISK_INDICATORS.includes(s)) {
      this.invalidate('riskIndicators', `invalid risk indicator: ${s}`);
      ok = false;
      break;
    }
  }
  // A referral must carry a reason — no silent "refer".
  if (this.outcome === 'refer' && !String(this.referralReason || '').trim()) {
    this.invalidate('referralReason', 'referralReason required when outcome=refer');
    ok = false;
  }
  // Amplification recommendation must say what.
  if (this.amplificationRecommended && !String(this.amplificationDetail || '').trim()) {
    this.invalidate(
      'amplificationDetail',
      'amplificationDetail required when amplificationRecommended=true'
    );
    ok = false;
  }
  // A risk flag must be evidenced by at least one indicator.
  if (
    this.riskIndicatorsPresent &&
    (!Array.isArray(this.riskIndicators) || this.riskIndicators.length === 0)
  ) {
    this.invalidate(
      'riskIndicators',
      'at least one riskIndicator required when riskIndicatorsPresent=true'
    );
    ok = false;
  }
  if (this.reassessmentDue && this.date && this.reassessmentDue < this.date) {
    this.invalidate('reassessmentDue', 'reassessmentDue must be >= screening date');
    ok = false;
  }
  if (this.status === 'finalized') {
    if (!this.screenedBy && !String(this.screenedByName || '').trim()) {
      this.invalidate('screenedBy', 'screener required to finalize');
      ok = false;
    }
    if (!this.screenedAt) {
      this.invalidate('screenedAt', 'screenedAt required to finalize');
      ok = false;
    }
  }
  return ok;
});

/** True when the screen should drive an external referral (hearing at risk). */
AudiologyScreeningSchema.virtual('needsReferral').get(function () {
  return this.outcome === 'refer';
});

/** Count of risk indicators present — quick severity signal. */
AudiologyScreeningSchema.virtual('riskIndicatorCount').get(function () {
  return Array.isArray(this.riskIndicators) ? this.riskIndicators.length : 0;
});

/** Worse of the two ears' measured levels — null when neither measured. */
AudiologyScreeningSchema.virtual('worseEarLevel').get(function () {
  const order = HEARING_LEVELS.filter(Boolean);
  const r = order.indexOf(this.levelRight);
  const l = order.indexOf(this.levelLeft);
  const measured = [r, l].filter(i => i >= 0);
  if (!measured.length) return null;
  return order[Math.max(...measured)];
});

AudiologyScreeningSchema.set('toJSON', { virtuals: true });
AudiologyScreeningSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.AudiologyScreening ||
  mongoose.model('AudiologyScreening', AudiologyScreeningSchema);

module.exports.METHODS = METHODS;
module.exports.HEARING_LEVELS = HEARING_LEVELS;
module.exports.TYMPANOMETRY_TYPES = TYMPANOMETRY_TYPES;
module.exports.LOSS_TYPES = LOSS_TYPES;
module.exports.OUTCOMES = OUTCOMES;
module.exports.RISK_INDICATORS = RISK_INDICATORS;
module.exports.FUNCTIONAL_DOMAINS = FUNCTIONAL_DOMAINS;
module.exports.STATUSES = STATUSES;
