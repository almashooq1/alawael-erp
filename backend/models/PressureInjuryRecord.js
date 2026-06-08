'use strict';

/**
 * PressureInjuryRecord — Wave 1011.
 *
 * "سجل إصابات الضغط والعناية بالجلد" — a per-injury register tracking any
 * pressure injury (bedsore) or skin-integrity concern for an immobile or
 * wheelchair-dependent beneficiary at the day-rehab center. Target
 * population: cerebral palsy GMFCS IV–V, spina bifida, spinal-cord injury,
 * profound multiple disability, and any beneficiary in prolonged seated
 * or recumbent positioning.
 *
 * Why a dedicated model:
 *   • CBAHI/JCI accreditation explicitly require a pressure-injury register
 *     with NPIAP staging, a risk score (Braden), the offloading/treatment
 *     plan, and a documented healing trajectory. Facility-Acquired Pressure
 *     Injury (HAPI) rate is a reported quality metric — origin must be
 *     captured per record.
 *   • Distinct from SeatingPosturalAssessment (W675) — that scores *risk*
 *     from posture/seating; this is the *register of actual injuries* and
 *     their management. They cross-reference (a high seating-pressure risk
 *     should trigger surveillance) but don't overlap.
 *   • Distinct from FallsRiskAssessment (W1010) — falls vs. skin integrity
 *     are separate accreditation domains.
 *
 * Wave-18 invariants:
 *   • bodySite ∈ BODY_SITES ; bodySite=other ⇒ bodySiteOther
 *   • stage ∈ STAGES ; origin ∈ ORIGINS ; status ∈ STATUSES
 *   • bradenScore (when set) ∈ [6,23]
 *   • status=active ⇒ ≥1 offloadingOrders (an open injury with no plan is
 *     a finding)
 *   • infectionSigns=true ⇒ infectionAction required
 *   • status ∈ {healed,closed} ⇒ healedAt required
 *   • nextReviewDue (when set) ≥ date
 */

const mongoose = require('mongoose');

// NPIAP/NPUAP 2016 pressure-injury staging.
const STAGES = [
  'stage_1', // non-blanchable erythema, intact skin
  'stage_2', // partial-thickness skin loss, exposed dermis
  'stage_3', // full-thickness skin loss
  'stage_4', // full-thickness skin + tissue loss (muscle/bone)
  'unstageable', // obscured full-thickness (slough/eschar)
  'deep_tissue_injury', // persistent non-blanchable deep red/maroon/purple
];

const ORIGINS = ['facility_acquired', 'present_on_admission', 'community_acquired'];

const BODY_SITES = [
  'sacrum',
  'coccyx',
  'ischium_left',
  'ischium_right',
  'heel_left',
  'heel_right',
  'hip_left',
  'hip_right',
  'elbow_left',
  'elbow_right',
  'occiput',
  'ear',
  'scapula',
  'malleolus',
  'other',
];

const EXUDATE_LEVELS = ['none', 'light', 'moderate', 'heavy'];
const EXUDATE_TYPES = ['none', 'serous', 'serosanguineous', 'sanguineous', 'purulent'];
const STATUSES = ['active', 'monitoring', 'healing', 'healed', 'closed'];

// Offloading / treatment-plan catalog (multi-select). Exported for UI.
const OFFLOADING_ORDERS = [
  'repositioning_2hourly',
  'repositioning_schedule',
  'pressure_redistribution_cushion',
  'alternating_air_mattress',
  'heel_offloading_boots',
  'foam_dressing',
  'hydrocolloid_dressing',
  'hydrogel_dressing',
  'negative_pressure_therapy',
  'nutrition_referral',
  'wound_nurse_referral',
  'physician_referral',
  'seating_clinic_referral',
];

// Braden risk bands (lower score = higher risk).
function computeBradenRisk(score) {
  const s = Number(score);
  if (!Number.isFinite(s)) return null;
  if (s <= 9) return 'severe';
  if (s <= 12) return 'high';
  if (s <= 14) return 'moderate';
  if (s <= 18) return 'mild';
  return 'not_at_risk';
}

const ReassessmentSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    stage: { type: String, enum: STAGES },
    lengthCm: { type: Number, min: 0, max: 100, default: null },
    widthCm: { type: Number, min: 0, max: 100, default: null },
    depthCm: { type: Number, min: 0, max: 50, default: null },
    status: { type: String, enum: STATUSES, default: null },
    note: { type: String, default: '', maxlength: 500 },
    byName: { type: String, default: '', maxlength: 100 },
  },
  { _id: false }
);

const PressureInjuryRecordSchema = new mongoose.Schema(
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

    date: { type: Date, required: true, index: true }, // date identified / assessed
    bodySite: { type: String, enum: BODY_SITES, required: true, index: true },
    bodySiteOther: { type: String, default: '', maxlength: 100 },

    stage: { type: String, enum: STAGES, required: true, index: true },
    medicalDeviceRelated: { type: Boolean, default: false },
    origin: { type: String, enum: ORIGINS, default: 'facility_acquired', index: true },

    // ── Risk context (Braden) ────────────────────────────────────────
    bradenScore: { type: Number, default: null, min: 6, max: 23 },
    bradenRiskLevel: {
      type: String,
      enum: ['severe', 'high', 'moderate', 'mild', 'not_at_risk', null],
      default: null,
    },

    // ── Current wound characteristics ────────────────────────────────
    lengthCm: { type: Number, default: null, min: 0, max: 100 },
    widthCm: { type: Number, default: null, min: 0, max: 100 },
    depthCm: { type: Number, default: null, min: 0, max: 50 },
    woundBed: { type: [String], default: () => [] }, // granulation/slough/necrotic/epithelial
    exudateLevel: { type: String, enum: EXUDATE_LEVELS, default: 'none' },
    exudateType: { type: String, enum: EXUDATE_TYPES, default: 'none' },
    infectionSigns: { type: Boolean, default: false },
    infectionAction: { type: String, default: '', maxlength: 300 },
    painLevel: { type: Number, default: null, min: 0, max: 10 },

    // ── Offloading / treatment plan ──────────────────────────────────
    offloadingOrders: { type: [String], default: () => [] },
    dressingType: { type: String, default: '', maxlength: 120 },
    repositioningFrequencyHours: { type: Number, default: null, min: 0, max: 24 },

    // ── Lifecycle ────────────────────────────────────────────────────
    status: { type: String, enum: STATUSES, default: 'active', index: true },
    nextReviewDue: { type: Date, default: null, index: true },
    healedAt: { type: Date, default: null },

    reassessments: { type: [ReassessmentSchema], default: () => [] },

    notes: { type: String, default: '', maxlength: 1000 },

    identifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    identifiedByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'pressure_injury_records' }
);

PressureInjuryRecordSchema.index({ beneficiaryId: 1, date: -1 });
PressureInjuryRecordSchema.index({ branchId: 1, status: 1, origin: 1 });
PressureInjuryRecordSchema.index({ status: 1, nextReviewDue: 1 });
PressureInjuryRecordSchema.index({ stage: 1, date: -1 });

PressureInjuryRecordSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

PressureInjuryRecordSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!BODY_SITES.includes(this.bodySite)) {
    this.invalidate('bodySite', `must be one of ${BODY_SITES.join(',')}`);
    ok = false;
  }
  if (this.bodySite === 'other' && !String(this.bodySiteOther || '').trim()) {
    this.invalidate('bodySiteOther', 'bodySiteOther required when bodySite=other');
    ok = false;
  }
  if (!STAGES.includes(this.stage)) {
    this.invalidate('stage', `must be one of ${STAGES.join(',')}`);
    ok = false;
  }
  if (!ORIGINS.includes(this.origin)) {
    this.invalidate('origin', `must be one of ${ORIGINS.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (this.bradenScore != null && (this.bradenScore < 6 || this.bradenScore > 23)) {
    this.invalidate('bradenScore', 'bradenScore must be within the Braden range 6-23');
    ok = false;
  }
  if (
    this.status === 'active' &&
    (!Array.isArray(this.offloadingOrders) || this.offloadingOrders.length === 0)
  ) {
    this.invalidate(
      'offloadingOrders',
      'at least one offloading/treatment order required for an active injury'
    );
    ok = false;
  }
  if (this.infectionSigns && !String(this.infectionAction || '').trim()) {
    this.invalidate('infectionAction', 'infectionAction required when infectionSigns=true');
    ok = false;
  }
  if ((this.status === 'healed' || this.status === 'closed') && !this.healedAt) {
    this.invalidate('healedAt', 'healedAt required when status is healed/closed');
    ok = false;
  }
  if (this.nextReviewDue && this.date && this.nextReviewDue < this.date) {
    this.invalidate('nextReviewDue', 'nextReviewDue must be >= record date');
    ok = false;
  }
  return ok;
});

/**
 * areaCm2 — wound surface area for the healing-trajectory chart, without
 * re-deriving on the client.
 */
PressureInjuryRecordSchema.virtual('areaCm2').get(function () {
  if (typeof this.lengthCm === 'number' && typeof this.widthCm === 'number') {
    return Math.round(this.lengthCm * this.widthCm * 100) / 100;
  }
  return null;
});

/**
 * isFacilityAcquired — HAPI flag. Facility-acquired pressure injuries are
 * the reported accreditation quality metric.
 */
PressureInjuryRecordSchema.virtual('isFacilityAcquired').get(function () {
  return this.origin === 'facility_acquired';
});

/**
 * isReassessmentOverdue — an active/monitoring injury whose review date
 * lapsed. Surfaced for the clinical-safety sweeper (W1012).
 */
PressureInjuryRecordSchema.virtual('isReassessmentOverdue').get(function () {
  return (
    (this.status === 'active' || this.status === 'monitoring' || this.status === 'healing') &&
    this.nextReviewDue instanceof Date &&
    this.nextReviewDue.getTime() < Date.now()
  );
});

PressureInjuryRecordSchema.set('toJSON', { virtuals: true });
PressureInjuryRecordSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.PressureInjuryRecord ||
  mongoose.model('PressureInjuryRecord', PressureInjuryRecordSchema);

module.exports.STAGES = STAGES;
module.exports.ORIGINS = ORIGINS;
module.exports.BODY_SITES = BODY_SITES;
module.exports.EXUDATE_LEVELS = EXUDATE_LEVELS;
module.exports.EXUDATE_TYPES = EXUDATE_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.OFFLOADING_ORDERS = OFFLOADING_ORDERS;
module.exports.computeBradenRisk = computeBradenRisk;
