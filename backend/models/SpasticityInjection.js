'use strict';

/**
 * SpasticityInjection — Wave 715.
 *
 * "عيادة التشنّج وحقن البوتوكس (إدارة التوتّر العضلي)" — a tone-management
 * injection procedure (botulinum toxin A/B, phenol, or intrathecal
 * baclofen) for spasticity in cerebral-palsy and acquired-brain-injury
 * beneficiaries. Tracks the per-muscle injection map with Modified
 * Ashworth Scale (MAS) before/after + a reassessment/follow-up clock
 * (botulinum effect wears off in ~3–4 months → re-injection planning).
 *
 * Distinct from PhysiotherapyAssessment (W670, which records a spasticity
 * FIELD/Ashworth as part of a PT eval): this is the PROCEDURE record —
 * agent, dose, targeted muscles, guidance method, consent, complications,
 * follow-up — i.e. a botox/tone clinic, not an assessment.
 *
 * Wave-18 invariants:
 *   • agent ∈ AGENTS; status ∈ STATUSES
 *   • status=completed ⇒ consentObtained=true (invasive-procedure consent gate)
 *   • status=completed ⇒ at least one targetedMuscle
 *   • status=cancelled ⇒ cancelReason required
 *   • each targetedMuscle.side ∈ SIDES, .ashworthBefore ∈ MAS (sub-schema enum)
 */

const mongoose = require('mongoose');

const AGENTS = ['botulinum_toxin_a', 'botulinum_toxin_b', 'phenol', 'baclofen_itb', 'other'];
const STATUSES = ['planned', 'completed', 'cancelled'];
const SIDES = ['left', 'right', 'midline'];
const SEDATION = ['none', 'topical', 'local', 'conscious', 'general'];
const GUIDANCE = ['anatomical', 'ultrasound', 'e_stim', 'emg'];
// Modified Ashworth Scale (Bohannon & Smith 1987): 0,1,1+,2,3,4.
const MAS = ['0', '1', '1+', '2', '3', '4'];

const TargetedMuscleSchema = new mongoose.Schema(
  {
    muscle: { type: String, required: true, maxlength: 100 }, // gastrocnemius, hamstrings...
    side: { type: String, enum: SIDES, required: true },
    doseUnits: { type: Number, default: null, min: 0, max: 1000 },
    ashworthBefore: { type: String, enum: MAS.concat([null]), default: null },
    guidanceMethod: { type: String, enum: GUIDANCE.concat([null]), default: null },
  },
  { _id: true }
);

const SpasticityInjectionSchema = new mongoose.Schema(
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
    carePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },
    physicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    physicianName: { type: String, default: '', maxlength: 100 },

    agent: { type: String, enum: AGENTS, required: true, index: true },
    brandName: { type: String, default: '', maxlength: 80 }, // Botox / Dysport / ...
    procedureDate: { type: Date, required: true, index: true },
    totalDoseUnits: { type: Number, default: null, min: 0, max: 5000 },
    sedation: { type: String, enum: SEDATION, default: 'none' },

    targetedMuscles: { type: [TargetedMuscleSchema], default: () => [] },
    goals: { type: [String], default: () => [] }, // gait, hygiene, positioning, pain_relief

    consentObtained: { type: Boolean, default: false },
    complications: { type: String, default: '', maxlength: 500 },

    // Botulinum effect lasts ~3-4 months → reassessment/re-injection clock.
    followUpDueDate: { type: Date, default: null, index: true },
    reassessmentNotes: { type: String, default: '', maxlength: 1000 },

    status: { type: String, enum: STATUSES, default: 'planned', index: true },
    cancelReason: { type: String, default: '', maxlength: 300 },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'spasticity_injections' }
);

SpasticityInjectionSchema.index({ beneficiaryId: 1, procedureDate: -1 });
SpasticityInjectionSchema.index({ branchId: 1, status: 1 });
SpasticityInjectionSchema.index({ status: 1, followUpDueDate: 1 });

SpasticityInjectionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SpasticityInjectionSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!AGENTS.includes(this.agent)) {
    this.invalidate('agent', `must be one of ${AGENTS.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.status === 'completed') {
    if (!this.consentObtained) {
      this.invalidate(
        'consentObtained',
        'consent required before completing an injection procedure'
      );
      ok = false;
    }
    if (!Array.isArray(this.targetedMuscles) || this.targetedMuscles.length === 0) {
      this.invalidate(
        'targetedMuscles',
        'a completed procedure needs at least one targeted muscle'
      );
      ok = false;
    }
  }
  if (this.status === 'cancelled' && !String(this.cancelReason || '').trim()) {
    this.invalidate('cancelReason', 'cancelReason required when status=cancelled');
    ok = false;
  }
  return ok;
});

/** A completed procedure past its reassessment date (effect likely waning). */
SpasticityInjectionSchema.virtual('isFollowUpDue').get(function () {
  if (!this.followUpDueDate) return false;
  if (this.status !== 'completed') return false;
  return new Date(this.followUpDueDate).getTime() < Date.now();
});

SpasticityInjectionSchema.virtual('muscleCount').get(function () {
  return Array.isArray(this.targetedMuscles) ? this.targetedMuscles.length : 0;
});

SpasticityInjectionSchema.set('toJSON', { virtuals: true });
SpasticityInjectionSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.SpasticityInjection ||
  mongoose.model('SpasticityInjection', SpasticityInjectionSchema);

module.exports.AGENTS = AGENTS;
module.exports.STATUSES = STATUSES;
module.exports.SIDES = SIDES;
module.exports.SEDATION = SEDATION;
module.exports.GUIDANCE = GUIDANCE;
module.exports.MAS = MAS;
