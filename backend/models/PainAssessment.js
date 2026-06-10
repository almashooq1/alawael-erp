'use strict';

/**
 * PainAssessment — W671.
 *
 * "تقييم الألم" — structured, age- and ability-appropriate pain assessment for
 * day-rehab beneficiaries. Pain in this population is frequently under-detected:
 * many beneficiaries are non-verbal or have cognitive/communication impairment,
 * so a single numeric scale is invalid. This model encodes WHICH scale was used
 * (so the score is interpretable), the body map, the functional impact, and
 * serial tracking that informs analgesia + therapy tolerance.
 *
 * Why a dedicated model (not VitalSign, not ClinicalAssessment):
 *   • VitalSign captures biometrics (HR/BP/temp) — pain is a separate, scale-
 *     dependent construct; a bare 0–10 number is meaningless without the scale.
 *   • Non-verbal observational scales (FLACC, NCCPC-R) score behaviour, not a
 *     self-report number — the model must record the scale family + raw items.
 *   • Functional impact (does pain block mobility / participation / ADL / sleep)
 *     is what drives the rehab plan, and doesn't fit a generic assessment score.
 *   • Reassessment-after-intervention (the pain-management loop) is the progress
 *     marker — captured via `intervention*` + `reassessment*` fields.
 *
 * Wave-18 invariants:
 *   • scale ∈ SCALES ; score within the scale's own range
 *   • painPresent=true → score ≥ 1 AND at least one bodyLocation
 *   • painPresent=false → score must be 0
 *   • scale='nccpc_r' or 'flacc' → observerType='observed' (these are
 *     observational scales — not self-report)
 *   • interventionGiven=true → interventionType required
 *   • reassessmentScore set → reassessmentAt required
 *   • status=finalized → assessedBy + assessedAt required
 */

const mongoose = require('mongoose');

// Pain scales grouped by which population they're validated for. The chosen
// scale determines the valid score range (enforced in invariants).
const SCALES = [
  'numeric_0_10', // self-report, cognitively able, ≥8y
  'wong_baker_faces', // self-report faces, ~3–7y or mild cognitive impairment
  'flacc', // observational (Face/Legs/Activity/Cry/Consolability) — pre-verbal / non-verbal, 0–10
  'nccpc_r', // Non-Communicating Children's Pain Checklist-Revised — severe cognitive impairment
  'cries', // neonatal/infant
  'evendol', // pediatric ED observational
];

// Max score per scale (min is always 0). Used by the invariant range check.
const SCALE_MAX = Object.freeze({
  numeric_0_10: 10,
  wong_baker_faces: 10,
  flacc: 10,
  nccpc_r: 90, // 30 items × 0–3
  cries: 10,
  evendol: 15,
});

const OBSERVER_TYPES = ['self_report', 'observed', 'proxy_report'];
const PAIN_QUALITIES = [
  'aching',
  'sharp',
  'burning',
  'cramping',
  'throbbing',
  'shooting',
  'tingling',
  'stiffness',
  'unknown',
];
const TIMING = ['constant', 'intermittent', 'on_movement', 'at_rest', 'nocturnal'];
const FUNCTIONAL_DOMAINS = ['mobility', 'participation', 'adl', 'sleep', 'mood', 'appetite'];
const INTERVENTION_TYPES = [
  'positioning',
  'heat_cold',
  'massage',
  'rest',
  'distraction',
  'analgesia_prn',
  'analgesia_scheduled',
  'referral',
  'other',
];
const STATUSES = ['draft', 'finalized'];

const PainAssessmentSchema = new mongoose.Schema(
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
    // Optional cross-link to a session whose tolerance this pain reading affects.
    therapySessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapySession',
      default: null,
    },

    date: { type: Date, required: true, index: true },
    reason: { type: String, default: '', maxlength: 300 }, // routine / pre-therapy / post-incident

    scale: { type: String, enum: SCALES, required: true, index: true },
    observerType: { type: String, enum: OBSERVER_TYPES, default: 'self_report' },
    painPresent: { type: Boolean, default: false, index: true },
    score: { type: Number, default: 0, min: 0, max: 90 },

    // Where it hurts (canonical body regions, multi-select) + free detail.
    bodyLocations: { type: [String], default: () => [] },
    bodyLocationDetail: { type: String, default: '', maxlength: 200 },

    quality: { type: String, enum: PAIN_QUALITIES.concat(['']), default: '' },
    timing: { type: String, enum: TIMING.concat(['']), default: '' },
    triggers: { type: [String], default: () => [] },
    relievingFactors: { type: [String], default: () => [] },

    // Functional impact — drives the rehab plan, not just the score.
    functionalImpact: {
      type: [String],
      default: () => [],
      validate: {
        validator: arr => arr.every(d => FUNCTIONAL_DOMAINS.includes(d)),
        message: 'invalid functional domain',
      },
    },

    // Intervention + the pain-management reassessment loop.
    interventionGiven: { type: Boolean, default: false },
    interventionType: { type: String, enum: INTERVENTION_TYPES.concat(['']), default: '' },
    interventionNote: { type: String, default: '', maxlength: 300 },
    reassessmentScore: { type: Number, default: null, min: 0, max: 90 },
    reassessmentAt: { type: Date, default: null },

    notes: { type: String, default: '', maxlength: 1000 },

    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },
    assessedAt: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
  },
  { timestamps: true, collection: 'pain_assessments' }
);

PainAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
PainAssessmentSchema.index({ branchId: 1, date: -1 });
PainAssessmentSchema.index({ painPresent: 1, date: -1 });
PainAssessmentSchema.index({ status: 1, date: -1 });

PainAssessmentSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

PainAssessmentSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!SCALES.includes(this.scale)) {
    this.invalidate('scale', `must be one of ${SCALES.join(',')}`);
    ok = false;
  } else {
    // Score must fall within the chosen scale's own range.
    const max = SCALE_MAX[this.scale];
    if (typeof this.score !== 'number' || this.score < 0 || this.score > max) {
      this.invalidate('score', `score for ${this.scale} must be 0..${max}`);
      ok = false;
    }
  }
  if (this.painPresent) {
    if (!(this.score >= 1)) {
      this.invalidate('score', 'score must be >= 1 when painPresent=true');
      ok = false;
    }
    if (!Array.isArray(this.bodyLocations) || this.bodyLocations.length === 0) {
      this.invalidate('bodyLocations', 'at least one body location required when painPresent=true');
      ok = false;
    }
  } else if (this.score !== 0) {
    this.invalidate('score', 'score must be 0 when painPresent=false');
    ok = false;
  }
  // Observational scales are never self-report.
  if ((this.scale === 'nccpc_r' || this.scale === 'flacc') && this.observerType === 'self_report') {
    this.invalidate(
      'observerType',
      `${this.scale} is an observational scale — observerType must be 'observed'`
    );
    ok = false;
  }
  if (this.interventionGiven && !String(this.interventionType || '').trim()) {
    this.invalidate('interventionType', 'interventionType required when interventionGiven=true');
    ok = false;
  }
  if (this.reassessmentScore != null && !this.reassessmentAt) {
    this.invalidate('reassessmentAt', 'reassessmentAt required when reassessmentScore is set');
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

/**
 * Operational helper — significant pain needing escalation/attention. Threshold
 * is normalized: ≥40% of the scale max, OR any functional impact while pain is
 * present. Surfaced as a virtual so dashboards don't re-derive per-scale cutoffs.
 */
PainAssessmentSchema.virtual('isSignificantPain').get(function () {
  if (!this.painPresent) return false;
  const max = SCALE_MAX[this.scale] || 10;
  const ratio = (this.score || 0) / max;
  return ratio >= 0.4 || (Array.isArray(this.functionalImpact) && this.functionalImpact.length > 0);
});

/** Did the intervention help? (delta after reassessment.) */
PainAssessmentSchema.virtual('painReduction').get(function () {
  if (this.reassessmentScore == null || typeof this.score !== 'number') return null;
  return this.score - this.reassessmentScore;
});

PainAssessmentSchema.set('toJSON', { virtuals: true });
PainAssessmentSchema.set('toObject', { virtuals: true });

// ── Unified-core linkage (W1047) — native pre-compile hooks (W954-safe).
// On the draft→finalized flip → pain_assessment timeline row (present pain
// escalates to warning).
PainAssessmentSchema.post('init', function () {
  this.$__prevStatus = this.status;
});
PainAssessmentSchema.post('save', function (doc) {
  try {
    if (doc.status !== 'finalized' || this.$__prevStatus === 'finalized') return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function' || !doc.beneficiaryId) return;
    Promise.resolve(
      integrationBus.publish('clinical-assessment', 'pain.assessment_finalized', {
        painAssessmentId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        scale: doc.scale,
        score: doc.score,
        painPresent: !!doc.painPresent,
      })
    ).catch(() => {});
  } catch (_) {
    /* never block persistence */
  }
});

module.exports =
  mongoose.models.PainAssessment || mongoose.model('PainAssessment', PainAssessmentSchema);

module.exports.SCALES = SCALES;
module.exports.SCALE_MAX = SCALE_MAX;
module.exports.OBSERVER_TYPES = OBSERVER_TYPES;
module.exports.PAIN_QUALITIES = PAIN_QUALITIES;
module.exports.TIMING = TIMING;
module.exports.FUNCTIONAL_DOMAINS = FUNCTIONAL_DOMAINS;
module.exports.INTERVENTION_TYPES = INTERVENTION_TYPES;
module.exports.STATUSES = STATUSES;
