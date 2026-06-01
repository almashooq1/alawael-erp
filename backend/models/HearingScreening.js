'use strict';

/**
 * HearingScreening — W724.
 *
 * "فحص السمع / المسح السمعي" — a functional hearing-screening record for
 * day-rehab beneficiaries. Conductive hearing loss affects 60-80% of children
 * with Down syndrome; auditory processing issues are elevated in autism.
 * Undetected hearing loss → language delay, educational failure, and behavioural
 * problems, and it silently undermines speech therapy + AAC. So a structured,
 * longitudinal, persisted, branch-scoped hearing-SCREEN is a first-class need.
 *
 * Why a dedicated Mongoose model (NOT the existing HearingRehabilitationService):
 *   • `rehabilitation-services/hearing-rehabilitation-service.js` is an IN-MEMORY
 *     `Map()`-backed prototype — no persistence (lost on restart), no Mongoose
 *     schema, no route, no branch-scoping, no finalize lifecycle, no TTL. It is
 *     a service stub, not a record of truth.
 *   • This is the persisted SCREEN sibling of VisionScreening (W720): method-aware
 *     (newborn OAE vs play vs conventional audiometry vs VRA/BOA for infants),
 *     per-ear threshold band, WHO hearing-loss grade, loss type, the outcome
 *     triage (pass / monitor / refer), and an ENT/audiology REFERRAL.
 *   • Longitudinal: post-grommet / post-hearing-aid re-screen is the progress
 *     marker; serial comparison needs structured persistence.
 *
 * Wave-18 invariants:
 *   • screeningMethod ∈ METHODS ; outcome ∈ OUTCOMES ; lossType ∈ LOSS_TYPES
 *   • each ear's threshold band (when set) ∈ THRESHOLD_BANDS
 *   • outcome='refer' → referralReason required (no silent refer)
 *   • hearingAidRecommended=true → hearingAidDetail required
 *   • lossDetected=true → at least one affected ear (right/left) flagged
 *   • status=finalized → screenedBy + screenedAt required
 *   • reassessmentDue (when set) must be ≥ date
 */

const mongoose = require('mongoose');

// Screening methods — vary by age + ability to respond.
const METHODS = [
  'oae', // otoacoustic emissions (newborn / non-responsive)
  'abr', // auditory brainstem response (objective)
  'boa', // behavioural observation audiometry (infants)
  'vra', // visual reinforcement audiometry (6mo-2.5y)
  'play_audiometry', // conditioned play (2.5-5y)
  'pure_tone_audiometry', // conventional (verbal / school age)
  'tympanometry', // middle-ear function (conductive screen)
  'observation_only', // functional observation, no equipment
];

// Per-ear hearing threshold band (WHO grades of hearing loss, dB HL). '' = not measured.
const THRESHOLD_BANDS = [
  '',
  'normal_lt_20', // < 20 dB
  'mild_20_34', // 20-34 dB
  'moderate_35_49', // 35-49 dB
  'moderately_severe_50_64', // 50-64 dB
  'severe_65_79', // 65-79 dB
  'profound_80_94', // 80-94 dB
  'complete_gte_95', // >= 95 dB / total
  'unable_to_assess',
];

const OUTCOMES = ['pass', 'monitor', 'refer'];

// Type of hearing loss (drives management — medical vs amplification vs implant).
const LOSS_TYPES = ['none', 'conductive', 'sensorineural', 'mixed', 'auditory_neuropathy', 'unknown'];

// WHO overall severity grade.
const SEVERITY = ['none', 'mild', 'moderate', 'moderately_severe', 'severe', 'profound'];

// Functional listening behaviours observed (multi-select of those INTACT).
const FUNCTIONAL_DOMAINS = [
  'localizes_sound',
  'responds_to_name',
  'startles_to_loud',
  'follows_verbal_instruction',
  'discriminates_speech_in_quiet',
  'discriminates_speech_in_noise',
];

const STATUSES = ['draft', 'finalized'];

const HearingScreeningSchema = new mongoose.Schema(
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
    reason: { type: String, default: '', maxlength: 300 }, // newborn / intake / annual / concern

    screeningMethod: { type: String, enum: METHODS, required: true, index: true },
    wearsHearingAidDuringScreen: { type: Boolean, default: false },

    // Per-ear threshold band (validated in __invariants).
    thresholdRight: { type: String, default: '' },
    thresholdLeft: { type: String, default: '' },
    speechRecognitionPct: { type: Number, default: null, min: 0, max: 100 },

    // Loss characterisation.
    lossDetected: { type: Boolean, default: false },
    rightEarAffected: { type: Boolean, default: false },
    leftEarAffected: { type: Boolean, default: false },
    lossType: { type: String, enum: LOSS_TYPES, default: 'none' },
    severity: { type: String, enum: SEVERITY, default: 'none' },

    // Functional listening (multi-select of INTACT behaviours).
    functionalDomainsIntact: { type: [String], default: () => [] },

    // Middle-ear / quick observations.
    tympanometryAbnormal: { type: Boolean, default: false }, // suggests effusion / conductive
    historyOfEarInfections: { type: Boolean, default: false },

    // Outcome + action.
    outcome: { type: String, enum: OUTCOMES, default: 'monitor', index: true },
    referralReason: { type: String, default: '', maxlength: 500 }, // required when outcome='refer'
    referralTo: { type: String, default: '', maxlength: 120 }, // ENT / audiology / cochlear-implant

    hearingAidRecommended: { type: Boolean, default: false },
    hearingAidDetail: { type: String, default: '', maxlength: 300 },

    recommendations: { type: String, default: '', maxlength: 1000 }, // classroom/therapy adaptations
    reassessmentDue: { type: Date, default: null },

    notes: { type: String, default: '', maxlength: 1000 },

    screenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    screenedByName: { type: String, default: '', maxlength: 100 },
    screenedAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, collection: 'hearing_screenings' }
);

HearingScreeningSchema.index({ beneficiaryId: 1, date: -1 });
HearingScreeningSchema.index({ branchId: 1, date: -1 });
HearingScreeningSchema.index({ outcome: 1, date: -1 });
HearingScreeningSchema.index({ status: 1, date: -1 });

HearingScreeningSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HearingScreeningSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!METHODS.includes(this.screeningMethod)) {
    this.invalidate('screeningMethod', `must be one of ${METHODS.join(',')}`);
    ok = false;
  }
  if (!OUTCOMES.includes(this.outcome)) {
    this.invalidate('outcome', `must be one of ${OUTCOMES.join(',')}`);
    ok = false;
  }
  if (!LOSS_TYPES.includes(this.lossType)) {
    this.invalidate('lossType', `must be one of ${LOSS_TYPES.join(',')}`);
    ok = false;
  }
  // Per-ear threshold value-set (empty = not measured = allowed).
  for (const [field, val] of [
    ['thresholdRight', this.thresholdRight],
    ['thresholdLeft', this.thresholdLeft],
  ]) {
    if (val && !THRESHOLD_BANDS.includes(val)) {
      this.invalidate(
        field,
        `${field} must be one of ${THRESHOLD_BANDS.filter(Boolean).join(',')}`
      );
      ok = false;
    }
  }
  // A referral must carry a reason.
  if (this.outcome === 'refer' && !String(this.referralReason || '').trim()) {
    this.invalidate('referralReason', 'referralReason required when outcome=refer');
    ok = false;
  }
  // Hearing aid recommended must say what.
  if (this.hearingAidRecommended && !String(this.hearingAidDetail || '').trim()) {
    this.invalidate('hearingAidDetail', 'hearingAidDetail required when hearingAidRecommended=true');
    ok = false;
  }
  // A detected loss must localise to at least one ear.
  if (this.lossDetected && !this.rightEarAffected && !this.leftEarAffected) {
    this.invalidate(
      'lossDetected',
      'at least one ear (rightEarAffected/leftEarAffected) required when lossDetected=true'
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
HearingScreeningSchema.virtual('needsReferral').get(function () {
  return this.outcome === 'refer';
});

/** True when loss is bilateral — the higher-impact, language-critical case. */
HearingScreeningSchema.virtual('isBilateral').get(function () {
  return !!(this.lossDetected && this.rightEarAffected && this.leftEarAffected);
});

HearingScreeningSchema.set('toJSON', { virtuals: true });
HearingScreeningSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.HearingScreening || mongoose.model('HearingScreening', HearingScreeningSchema);

module.exports.METHODS = METHODS;
module.exports.THRESHOLD_BANDS = THRESHOLD_BANDS;
module.exports.OUTCOMES = OUTCOMES;
module.exports.LOSS_TYPES = LOSS_TYPES;
module.exports.SEVERITY = SEVERITY;
module.exports.FUNCTIONAL_DOMAINS = FUNCTIONAL_DOMAINS;
module.exports.STATUSES = STATUSES;
