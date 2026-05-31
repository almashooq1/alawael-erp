'use strict';

/**
 * ProstheticOrthoticOrder — Wave 680.
 *
 * "عيادة الأطراف الصناعية والأجهزة التقويمية والجلوس" — the clinical
 * fabrication/fitting lifecycle for a custom prosthesis, orthosis, or
 * wheelchair-seating system prescribed to a beneficiary.
 *
 * Why a dedicated model (rather than reusing AssistiveDevice — W359):
 *   • AssistiveDevice tracks a physical asset's LOAN + MAINTENANCE
 *     lifecycle (requested → checked_out → returned) — it is an
 *     inventory record. This model tracks the CLINICAL ORDER lifecycle:
 *     prescribe → measure/cast → fabricate → fit → deliver → follow-up.
 *   • P&O devices are custom-made per beneficiary anatomy; they need
 *     measurement/casting data, an in-house-vs-outsourced fabrication
 *     stage, a fitting outcome (re-fabricate loop), and a structured
 *     follow-up/adjustment schedule — none of which fit an asset loan.
 *   • Wheelchair-seating systems are folded in here (not AAC, not loan)
 *     because they are clinically fabricated + fitted with postural and
 *     pressure assessment — the same workflow shape as an orthosis.
 *
 * Relationship to AssistiveDevice: once a delivered device needs to be
 * tracked as a loanable/maintainable asset, an AssistiveDevice record
 * may be created and cross-linked via `deliveredDeviceId` (optional).
 *
 * Wave-18 invariants:
 *   • deviceCategory ∈ CATEGORIES; stage ∈ STAGES
 *   • fabricationType=outsourced ⇒ vendorName required
 *   • castingRequired=true ⇒ castingDate required
 *   • stage ∈ {delivered, follow_up, completed} ⇒ deliveredDate required
 *   • fitOutcome=refabricate ⇒ fittingNotes required
 *   • stage=cancelled ⇒ cancelReason required
 *   • deviceCategory=wheelchair_seating AND stage past fabrication ⇒
 *     posturalAssessment required (seating clinic gate)
 */

const mongoose = require('mongoose');

// Device families a P&O / seating clinic fabricates + fits.
const CATEGORIES = [
  'afo', // ankle-foot orthosis
  'kafo', // knee-ankle-foot orthosis
  'spinal_orthosis', // TLSO / scoliosis brace
  'upper_limb_orthosis', // wrist/hand/elbow splint
  'cranial_orthosis', // cranial remolding helmet
  'foot_orthosis', // custom insoles / UCBL
  'lower_limb_prosthesis',
  'upper_limb_prosthesis',
  'wheelchair_seating', // custom seating + positioning system
  'standing_frame',
  'other',
];

// Linear fabrication/fitting lifecycle with a re-fabricate loop and a
// cancel escape. follow_up may repeat before completion.
const STAGES = [
  'prescribed',
  'measured',
  'fabrication',
  'fitting',
  'delivered',
  'follow_up',
  'completed',
  'cancelled',
];

// Allowed stage transitions (BFS-reachable from 'prescribed').
const TRANSITIONS = Object.freeze({
  prescribed: ['measured', 'cancelled'],
  measured: ['fabrication', 'cancelled'],
  fabrication: ['fitting', 'cancelled'],
  fitting: ['delivered', 'fabrication', 'cancelled'], // refabricate loop
  delivered: ['follow_up', 'completed', 'cancelled'],
  follow_up: ['follow_up', 'completed', 'cancelled'],
  completed: [],
  cancelled: [],
});

const LATERALITY = ['left', 'right', 'bilateral', 'not_applicable'];
const FABRICATION_TYPES = ['in_house', 'outsourced'];
const FIT_OUTCOMES = ['good_fit', 'adjustment_needed', 'refabricate'];
const FUNDING_SOURCES = ['insurance', 'sponsorship', 'self_pay', 'ministry', 'charity', 'other'];

const FollowUpSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    byName: { type: String, default: '', maxlength: 100 },
    outcome: { type: String, default: '', maxlength: 500 },
    adjustmentMade: { type: Boolean, default: false },
    nextDueDate: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { _id: true }
);

const ProstheticOrthoticOrderSchema = new mongoose.Schema(
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

    deviceCategory: { type: String, enum: CATEGORIES, required: true, index: true },
    laterality: { type: String, enum: LATERALITY, default: 'not_applicable' },
    diagnosis: { type: String, default: '', maxlength: 300 },
    clinicalGoal: { type: String, default: '', maxlength: 500 },

    // ── Prescription ──────────────────────────────────────────────────
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    prescribedByName: { type: String, default: '', maxlength: 100 },
    prescribedDate: { type: Date, required: true, index: true },

    stage: { type: String, enum: STAGES, default: 'prescribed', index: true },

    // ── Measurement / casting ─────────────────────────────────────────
    measurementDate: { type: Date, default: null },
    measuredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    measuredByName: { type: String, default: '', maxlength: 100 },
    castingRequired: { type: Boolean, default: false },
    castingDate: { type: Date, default: null },
    measurementNotes: { type: String, default: '', maxlength: 1000 },
    scanFileRef: { type: String, default: '', maxlength: 300 }, // 3D scan / photo URL

    // ── Fabrication ───────────────────────────────────────────────────
    fabricationType: { type: String, enum: FABRICATION_TYPES, default: 'in_house' },
    vendorName: { type: String, default: '', maxlength: 150 },
    fabricationStartDate: { type: Date, default: null },
    fabricationCompletedDate: { type: Date, default: null },
    estimatedCost: { type: Number, default: null, min: 0 },
    fundingSource: { type: String, enum: FUNDING_SOURCES.concat([null]), default: null },

    // ── Fitting ───────────────────────────────────────────────────────
    fittingDate: { type: Date, default: null },
    fittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    fittedByName: { type: String, default: '', maxlength: 100 },
    fitOutcome: { type: String, enum: FIT_OUTCOMES.concat([null]), default: null },
    fittingNotes: { type: String, default: '', maxlength: 1000 },
    comfortScore: { type: Number, default: null, min: 0, max: 10 },

    // ── Seating-clinic specific ───────────────────────────────────────
    posturalAssessment: { type: String, default: '', maxlength: 1000 },
    pressureMappingDone: { type: Boolean, default: false },
    pressureAreasNoted: { type: Boolean, default: false },

    // ── Delivery ──────────────────────────────────────────────────────
    deliveredDate: { type: Date, default: null },
    deliveredToName: { type: String, default: '', maxlength: 100 },
    wearingSchedule: { type: String, default: '', maxlength: 500 },
    warrantyMonths: { type: Number, default: null, min: 0, max: 120 },
    deliveredDeviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssistiveDevice',
      default: null,
    },

    // ── Follow-up / review ────────────────────────────────────────────
    followUpDueDate: { type: Date, default: null, index: true },
    reviewIntervalMonths: { type: Number, default: null, min: 1, max: 36 },
    followUps: { type: [FollowUpSchema], default: () => [] },

    // ── Closure ───────────────────────────────────────────────────────
    completedDate: { type: Date, default: null },
    outcomeNotes: { type: String, default: '', maxlength: 1000 },
    abandoned: { type: Boolean, default: false },
    abandonReason: { type: String, default: '', maxlength: 500 },
    cancelReason: { type: String, default: '', maxlength: 500 },

    parentNotifiedAt: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 1000 },
  },
  { timestamps: true, collection: 'prosthetic_orthotic_orders' }
);

ProstheticOrthoticOrderSchema.index({ beneficiaryId: 1, prescribedDate: -1 });
ProstheticOrthoticOrderSchema.index({ branchId: 1, stage: 1 });
ProstheticOrthoticOrderSchema.index({ stage: 1, followUpDueDate: 1 });
ProstheticOrthoticOrderSchema.index({ deviceCategory: 1, prescribedDate: -1 });

ProstheticOrthoticOrderSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

const TERMINAL = ['completed', 'cancelled'];
const DELIVERED_OR_LATER = ['delivered', 'follow_up', 'completed'];
const POST_FABRICATION = ['fitting', 'delivered', 'follow_up', 'completed'];

ProstheticOrthoticOrderSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!CATEGORIES.includes(this.deviceCategory)) {
    this.invalidate('deviceCategory', `must be one of ${CATEGORIES.join(',')}`);
    ok = false;
  }
  if (!STAGES.includes(this.stage)) {
    this.invalidate('stage', `must be one of ${STAGES.join(',')}`);
    ok = false;
  }
  if (this.fabricationType === 'outsourced' && !String(this.vendorName || '').trim()) {
    this.invalidate('vendorName', 'vendorName required when fabricationType=outsourced');
    ok = false;
  }
  if (this.castingRequired && !this.castingDate) {
    this.invalidate('castingDate', 'castingDate required when castingRequired=true');
    ok = false;
  }
  if (DELIVERED_OR_LATER.includes(this.stage) && !this.deliveredDate) {
    this.invalidate('deliveredDate', 'deliveredDate required once stage reaches delivered');
    ok = false;
  }
  if (this.fitOutcome === 'refabricate' && !String(this.fittingNotes || '').trim()) {
    this.invalidate('fittingNotes', 'fittingNotes required when fitOutcome=refabricate');
    ok = false;
  }
  if (this.stage === 'cancelled' && !String(this.cancelReason || '').trim()) {
    this.invalidate('cancelReason', 'cancelReason required when stage=cancelled');
    ok = false;
  }
  if (
    this.deviceCategory === 'wheelchair_seating' &&
    POST_FABRICATION.includes(this.stage) &&
    !String(this.posturalAssessment || '').trim()
  ) {
    this.invalidate(
      'posturalAssessment',
      'posturalAssessment required for wheelchair_seating once fitting begins'
    );
    ok = false;
  }
  return ok;
});

/**
 * Operational helper — a delivered device whose follow-up review is past
 * due. Surfaced for the "overdue follow-ups" dashboard tile + alerting,
 * without re-deriving the date math per caller.
 */
ProstheticOrthoticOrderSchema.virtual('isOverdueFollowUp').get(function () {
  if (!this.followUpDueDate) return false;
  if (TERMINAL.includes(this.stage)) return false;
  return new Date(this.followUpDueDate).getTime() < Date.now();
});

ProstheticOrthoticOrderSchema.virtual('isActive').get(function () {
  return !TERMINAL.includes(this.stage);
});

ProstheticOrthoticOrderSchema.set('toJSON', { virtuals: true });
ProstheticOrthoticOrderSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.ProstheticOrthoticOrder ||
  mongoose.model('ProstheticOrthoticOrder', ProstheticOrthoticOrderSchema);

module.exports.CATEGORIES = CATEGORIES;
module.exports.STAGES = STAGES;
module.exports.TRANSITIONS = TRANSITIONS;
module.exports.LATERALITY = LATERALITY;
module.exports.FABRICATION_TYPES = FABRICATION_TYPES;
module.exports.FIT_OUTCOMES = FIT_OUTCOMES;
module.exports.FUNDING_SOURCES = FUNDING_SOURCES;
