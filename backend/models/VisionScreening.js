'use strict';

/**
 * VisionScreening — W720.
 *
 * "فحص النظر الوظيفي / مسح الرؤية" — a functional-vision screening for
 * day-rehab beneficiaries. Cortical Visual Impairment (CVI) affects 30–40% of
 * children with cerebral palsy; refractive error + strabismus are highly
 * prevalent in Down syndrome and autism. Undetected vision loss silently
 * undermines EVERY other therapy (PT/OT/SLP/education) and AAC access — so a
 * structured, longitudinal functional-vision record is a first-class need, not
 * a free-text note.
 *
 * Why a dedicated model (NOT a generic assessment, NOT AssistiveDevice):
 *   • This is a SCREEN (refer / monitor / pass), not a full ophthalmology exam —
 *     it captures functional vision in daily activities + acuity estimate + the
 *     CVI behavioural cluster, and drives an ophthalmology/optometry REFERRAL.
 *   • Acuity is method-dependent (Snellen vs Teller/Cardiff preferential-looking
 *     vs LEA symbols vs "observation only" for non-verbal kids) — a generic
 *     score field can't encode WHICH method produced the estimate.
 *   • CVI is diagnosed behaviourally (colour preference, complexity difficulty,
 *     visual latency, lower-field neglect…) — a multi-select sign cluster.
 *   • Longitudinal: post-glasses / post-CVI-intervention re-screen is the
 *     progress marker; serial comparison needs structured persistence.
 *
 * Wave-18 invariants:
 *   • screeningMethod ∈ METHODS ; outcome ∈ OUTCOMES
 *   • each eye's acuity (when set) ∈ ACUITY_LEVELS
 *   • outcome='refer' → referralReason required (cannot refer with no reason)
 *   • glassesPrescribed=true → glassesDetail required
 *   • cviSuspected=true → at least one cviSign required (no empty CVI flag)
 *   • status=finalized → screenedBy + screenedAt required
 *   • reassessmentDue (when set) must be ≥ date
 */

const mongoose = require('mongoose');

// Screening methods — vary by the beneficiary's ability to respond.
const METHODS = [
  'snellen_chart', // literate / verbal
  'lea_symbols', // preliterate
  'hotv', // matching
  'teller_cardiff_cards', // preferential looking (non-verbal / infants)
  'fixation_following', // basic CVI / profound disability
  'observation_only', // functional observation, no formal chart
];

// Functional acuity bands (method-agnostic estimate). '' = not measured.
const ACUITY_LEVELS = [
  '',
  'normal_6_6', // ~20/20
  'mild_6_12', // ~20/40
  'moderate_6_18', // ~20/60
  'severe_6_60', // ~20/200 (low vision)
  'profound_lt_6_60', // worse than 20/200
  'light_perception_only',
  'no_light_perception',
  'unable_to_assess',
];

const OUTCOMES = ['pass', 'monitor', 'refer'];

// CVI (Cortical Visual Impairment) behavioural cluster — multi-select.
const CVI_SIGNS = [
  'colour_preference', // strong preference (often red/yellow)
  'need_for_movement', // sees moving > static
  'visual_latency', // delayed visual response
  'visual_field_preference', // ignores a field (often lower)
  'difficulty_with_complexity', // can't pick target from busy array
  'light_gazing', // non-purposeful light staring
  'difficulty_with_distance', // near >> far
  'atypical_visual_reflexes',
  'absent_visually_guided_reach', // look-then-reach dissociation
  'difficulty_with_novelty',
];

// Functional-vision domains observed during the screen.
const FUNCTIONAL_DOMAINS = [
  'fixation',
  'tracking',
  'scanning',
  'reaching_to_vision',
  'face_recognition',
  'navigates_environment',
  'reads_or_symbols',
];

const STATUSES = ['draft', 'finalized'];

const VisionScreeningSchema = new mongoose.Schema(
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
    wearsCorrectionDuringScreen: { type: Boolean, default: false }, // tested with current glasses?

    // Per-eye functional acuity estimate (validated in __invariants).
    acuityRight: { type: String, default: '' },
    acuityLeft: { type: String, default: '' },
    acuityBinocular: { type: String, default: '' },

    // Functional vision in daily activities (multi-select of domains observed OK).
    functionalDomainsIntact: { type: [String], default: () => [] },

    // CVI behavioural cluster.
    cviSuspected: { type: Boolean, default: false },
    cviSigns: { type: [String], default: () => [] },

    // Other quick observations.
    strabismusObserved: { type: Boolean, default: false },
    nystagmusObserved: { type: Boolean, default: false },
    photophobiaObserved: { type: Boolean, default: false },

    // Outcome + action.
    outcome: { type: String, enum: OUTCOMES, default: 'monitor', index: true },
    referralReason: { type: String, default: '', maxlength: 500 }, // required when outcome='refer'
    referralTo: { type: String, default: '', maxlength: 120 }, // ophthalmology / optometry / low-vision

    glassesPrescribed: { type: Boolean, default: false },
    glassesDetail: { type: String, default: '', maxlength: 300 },

    recommendations: { type: String, default: '', maxlength: 1000 }, // classroom/therapy adaptations
    reassessmentDue: { type: Date, default: null },

    notes: { type: String, default: '', maxlength: 1000 },

    screenedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    screenedByName: { type: String, default: '', maxlength: 100 },
    screenedAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, collection: 'vision_screenings' }
);

VisionScreeningSchema.index({ beneficiaryId: 1, date: -1 });
VisionScreeningSchema.index({ branchId: 1, date: -1 });
VisionScreeningSchema.index({ outcome: 1, date: -1 });
VisionScreeningSchema.index({ status: 1, date: -1 });

VisionScreeningSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

VisionScreeningSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!METHODS.includes(this.screeningMethod)) {
    this.invalidate('screeningMethod', `must be one of ${METHODS.join(',')}`);
    ok = false;
  }
  if (!OUTCOMES.includes(this.outcome)) {
    this.invalidate('outcome', `must be one of ${OUTCOMES.join(',')}`);
    ok = false;
  }
  // Per-eye acuity value-set (empty = not measured = allowed).
  for (const [field, val] of [
    ['acuityRight', this.acuityRight],
    ['acuityLeft', this.acuityLeft],
    ['acuityBinocular', this.acuityBinocular],
  ]) {
    if (val && !ACUITY_LEVELS.includes(val)) {
      this.invalidate(field, `${field} must be one of ${ACUITY_LEVELS.filter(Boolean).join(',')}`);
      ok = false;
    }
  }
  // CVI sign value-set.
  for (const s of this.cviSigns || []) {
    if (!CVI_SIGNS.includes(s)) {
      this.invalidate('cviSigns', `invalid CVI sign: ${s}`);
      ok = false;
      break;
    }
  }
  // A referral must carry a reason — no silent "refer".
  if (this.outcome === 'refer' && !String(this.referralReason || '').trim()) {
    this.invalidate('referralReason', 'referralReason required when outcome=refer');
    ok = false;
  }
  // Glasses prescribed must say what.
  if (this.glassesPrescribed && !String(this.glassesDetail || '').trim()) {
    this.invalidate('glassesDetail', 'glassesDetail required when glassesPrescribed=true');
    ok = false;
  }
  // A CVI suspicion must be evidenced by at least one behavioural sign.
  if (this.cviSuspected && (!Array.isArray(this.cviSigns) || this.cviSigns.length === 0)) {
    this.invalidate('cviSigns', 'at least one cviSign required when cviSuspected=true');
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

/** True when the screen should drive an external referral (vision at risk). */
VisionScreeningSchema.virtual('needsReferral').get(function () {
  return this.outcome === 'refer';
});

/** Count of CVI behavioural signs present — quick severity signal. */
VisionScreeningSchema.virtual('cviSignCount').get(function () {
  return Array.isArray(this.cviSigns) ? this.cviSigns.length : 0;
});

VisionScreeningSchema.set('toJSON', { virtuals: true });
VisionScreeningSchema.set('toObject', { virtuals: true });

// W980 — surface a finalized vision screening on the unified-core timeline,
// flagging outcome='refer' (needs ophthalmology/optometry) as a warning. Fires
// when status reaches 'finalized' (created-as-finalized OR draft→finalized,
// once). Native pre-compile hooks per the proven W970 pattern; guarded,
// fire-and-forget. Consumed by dddCrossModuleSubscribers.js.
VisionScreeningSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
VisionScreeningSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;
    if (!doc.beneficiaryId) return;
    Promise.resolve(
      integrationBus.publish('screenings', 'screening.vision_completed', {
        screeningId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        outcome: doc.outcome || '',
        referralTo: doc.referralTo || '',
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired — never block persistence */
  }
});

module.exports =
  mongoose.models.VisionScreening || mongoose.model('VisionScreening', VisionScreeningSchema);

module.exports.METHODS = METHODS;
module.exports.ACUITY_LEVELS = ACUITY_LEVELS;
module.exports.OUTCOMES = OUTCOMES;
module.exports.CVI_SIGNS = CVI_SIGNS;
module.exports.FUNCTIONAL_DOMAINS = FUNCTIONAL_DOMAINS;
module.exports.STATUSES = STATUSES;
