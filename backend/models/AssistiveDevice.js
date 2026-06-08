'use strict';

/**
 * AssistiveDevice — Wave 359.
 *
 * "الأجهزة المساعدة" — catalog + loan + maintenance lifecycle for any
 * device the center loans to a beneficiary: wheelchair, walker, hearing
 * aid, prosthetic, AAC device, standing frame, orthotics, etc.
 *
 * Distinct from generic InventoryItem.js — assistive devices have:
 *   • Per-unit serial numbers (each chair is a separate physical asset)
 *   • Loan lifecycle (requested → checked_out → returned/lost/damaged)
 *   • Maintenance schedule (preventive + corrective)
 *   • Cost-to-repair tracking
 *   • Insurance / warranty references
 *
 * Single-model design with embedded loans[] (last 50) + maintenance[]
 * (last 30) — mirrors IndividualEducationPlan W200b + RestraintSeclusion
 * W193b patterns. Queries "active loans" / "due maintenance" use top-level
 * fields (currentLoaneeId, nextMaintenanceDue) for fast indexing; deeper
 * history is in the subdoc arrays.
 *
 * Wave-18 invariants:
 *   • category ∈ {wheelchair, walker, hearing_aid, prosthetic, orthotic,
 *     aac_device, standing_frame, communication_board, other}
 *   • availability=loaned requires currentLoaneeId + currentLoanStartedAt
 *   • availability=available requires currentLoaneeId=null
 *   • availability=maintenance requires inMaintenanceSince
 *   • availability=retired blocks new loans (route layer enforces)
 *   • Each loan in loans[]: beneficiaryId + status + startedAt required
 *   • Each maintenance entry: kind + performedAt required
 *   • Cost fields are non-negative
 */

const mongoose = require('mongoose');

const CATEGORIES = [
  'wheelchair',
  'walker',
  'hearing_aid',
  'prosthetic',
  'orthotic',
  'aac_device',
  'standing_frame',
  'communication_board',
  'feeding_aid',
  'visual_aid',
  'sensory_tool',
  'other',
];

const AVAILABILITY = ['available', 'loaned', 'maintenance', 'retired'];

const LOAN_STATUSES = [
  'requested',
  'approved',
  'checked_out',
  'returned',
  'lost',
  'damaged',
  'cancelled',
];

const MAINTENANCE_KINDS = [
  'preventive', // scheduled checkup
  'corrective', // repair after fault
  'cleaning', // sanitization
  'calibration', // hearing aid / AAC device tuning
  'fitting', // re-fit (growth / posture change)
  'battery_replacement',
  'inspection',
];

const CONDITION_GRADES = ['new', 'excellent', 'good', 'fair', 'poor', 'broken'];

// ── Sub-schemas ──────────────────────────────────────────────────

const LoanSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
    },
    requestedAt: { type: Date, default: Date.now },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    requestedByName: { type: String, default: '', maxlength: 100 },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedByName: { type: String, default: '', maxlength: 100 },
    startedAt: { type: Date, required: true },
    expectedReturnAt: { type: Date, default: null },
    returnedAt: { type: Date, default: null },
    status: { type: String, enum: LOAN_STATUSES, required: true, default: 'requested' },
    conditionOnCheckout: { type: String, enum: CONDITION_GRADES, default: 'good' },
    conditionOnReturn: { type: String, enum: CONDITION_GRADES.concat([null]), default: null },
    purpose: { type: String, default: '', maxlength: 300 },
    deposit: { type: Number, default: 0, min: 0 },
    fee: { type: Number, default: 0, min: 0 },
    notes: { type: String, default: '', maxlength: 500 },
    incidentReportedAt: { type: Date, default: null }, // if lost/damaged
    incidentDetails: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const MaintenanceEntrySchema = new mongoose.Schema(
  {
    kind: { type: String, enum: MAINTENANCE_KINDS, required: true },
    performedAt: { type: Date, required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    performedByName: { type: String, default: '', maxlength: 100 },
    vendorName: { type: String, default: '', maxlength: 150 },
    description: { type: String, default: '', maxlength: 1000 },
    partsReplaced: { type: [String], default: () => [] },
    cost: { type: Number, default: 0, min: 0 },
    nextDueAt: { type: Date, default: null },
    invoiceRef: { type: String, default: '', maxlength: 100 },
  },
  { _id: true }
);

// ── Main schema ──────────────────────────────────────────────────

const AssistiveDeviceSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────
    assetTag: { type: String, required: true, maxlength: 50, index: true }, // internal short code
    serialNumber: { type: String, default: '', maxlength: 100, index: true },
    name: { type: String, required: true, maxlength: 200 },
    nameAr: { type: String, default: '', maxlength: 200 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    manufacturer: { type: String, default: '', maxlength: 100 },
    modelNumber: { type: String, default: '', maxlength: 100 },

    // ── Ownership + location ──────────────────────────────────────
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    storageLocation: { type: String, default: '', maxlength: 200 },

    // ── Acquisition ───────────────────────────────────────────────
    acquiredAt: { type: Date, default: null },
    acquiredFrom: { type: String, default: '', maxlength: 200 },
    acquisitionCost: { type: Number, default: 0, min: 0 },
    fundingSource: {
      type: String,
      enum: ['government', 'insurance', 'donation', 'self_purchase', 'mixed', null],
      default: null,
    },
    warrantyExpiresAt: { type: Date, default: null },

    // ── Current state (denormalized for fast filtering) ────────────
    availability: { type: String, enum: AVAILABILITY, default: 'available', index: true },
    currentCondition: { type: String, enum: CONDITION_GRADES, default: 'good' },
    currentLoaneeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
      index: true,
    },
    currentLoanStartedAt: { type: Date, default: null },
    currentLoanExpectedReturnAt: { type: Date, default: null },
    inMaintenanceSince: { type: Date, default: null },

    // ── Maintenance schedule ──────────────────────────────────────
    maintenanceIntervalDays: { type: Number, default: null, min: 1, max: 3650 },
    nextMaintenanceDue: { type: Date, default: null, index: true },

    // ── Embedded history (capped) ──────────────────────────────────
    loans: { type: [LoanSchema], default: () => [] }, // cap 50 newest
    maintenance: { type: [MaintenanceEntrySchema], default: () => [] }, // cap 30 newest

    // ── Retirement / disposal ─────────────────────────────────────
    retiredAt: { type: Date, default: null },
    retirementReason: { type: String, default: '', maxlength: 500 },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'assistive_devices' }
);

AssistiveDeviceSchema.index({ assetTag: 1, branchId: 1 }, { unique: true });
AssistiveDeviceSchema.index({ category: 1, availability: 1 });
AssistiveDeviceSchema.index({ branchId: 1, nextMaintenanceDue: 1 });

AssistiveDeviceSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

AssistiveDeviceSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!CATEGORIES.includes(this.category)) {
    this.invalidate('category', `must be one of ${CATEGORIES.join(',')}`);
    ok = false;
  }
  if (!AVAILABILITY.includes(this.availability)) {
    this.invalidate('availability', `must be one of ${AVAILABILITY.join(',')}`);
    ok = false;
  }
  if (!String(this.assetTag || '').trim()) {
    this.invalidate('assetTag', 'assetTag required');
    ok = false;
  }
  if (!String(this.name || '').trim()) {
    this.invalidate('name', 'name required');
    ok = false;
  }

  // Loaned ⇒ currentLoaneeId + currentLoanStartedAt
  if (this.availability === 'loaned') {
    if (!this.currentLoaneeId) {
      this.invalidate('currentLoaneeId', 'currentLoaneeId required when loaned');
      ok = false;
    }
    if (!this.currentLoanStartedAt) {
      this.invalidate('currentLoanStartedAt', 'currentLoanStartedAt required when loaned');
      ok = false;
    }
  }

  // Available ⇒ no currentLoaneeId
  if (this.availability === 'available' && this.currentLoaneeId) {
    this.invalidate('currentLoaneeId', 'currentLoaneeId must be null when availability=available');
    ok = false;
  }

  // Maintenance ⇒ inMaintenanceSince
  if (this.availability === 'maintenance' && !this.inMaintenanceSince) {
    this.invalidate('inMaintenanceSince', 'inMaintenanceSince required when in maintenance');
    ok = false;
  }

  // Retired ⇒ retiredAt + retirementReason
  if (this.availability === 'retired') {
    if (!this.retiredAt) {
      this.invalidate('retiredAt', 'retiredAt required when retired');
      ok = false;
    }
    if (!String(this.retirementReason || '').trim()) {
      this.invalidate('retirementReason', 'retirementReason required when retired');
      ok = false;
    }
  }

  // Loan-subdoc integrity
  if (Array.isArray(this.loans)) {
    for (let i = 0; i < this.loans.length; i++) {
      const l = this.loans[i];
      if (!l.beneficiaryId) {
        this.invalidate(`loans.${i}.beneficiaryId`, 'beneficiaryId required');
        ok = false;
      }
      if (!LOAN_STATUSES.includes(l.status)) {
        this.invalidate(`loans.${i}.status`, 'status required');
        ok = false;
      }
      if (!l.startedAt) {
        this.invalidate(`loans.${i}.startedAt`, 'startedAt required');
        ok = false;
      }
    }
  }

  // Maintenance-entry integrity
  if (Array.isArray(this.maintenance)) {
    for (let i = 0; i < this.maintenance.length; i++) {
      const m = this.maintenance[i];
      if (!MAINTENANCE_KINDS.includes(m.kind)) {
        this.invalidate(`maintenance.${i}.kind`, 'kind required');
        ok = false;
      }
      if (!m.performedAt) {
        this.invalidate(`maintenance.${i}.performedAt`, 'performedAt required');
        ok = false;
      }
    }
  }

  return ok;
});

AssistiveDeviceSchema.virtual('isLoanOverdue').get(function () {
  return !!(
    this.availability === 'loaned' &&
    this.currentLoanExpectedReturnAt &&
    new Date(this.currentLoanExpectedReturnAt) < new Date()
  );
});

AssistiveDeviceSchema.virtual('isMaintenanceOverdue').get(function () {
  return !!(this.nextMaintenanceDue && new Date(this.nextMaintenanceDue) < new Date());
});

AssistiveDeviceSchema.set('toJSON', { virtuals: true });
AssistiveDeviceSchema.set('toObject', { virtuals: true });

// ── W1028 — assistive-device loan-return producer ────────────────────
// When a loaned device is handed back (availability flips to 'available'
// and a loan reaches status 'returned'), emit a closure milestone onto the
// beneficiary's unified-core timeline. Non-callback hook family → W483-safe
// even under the global async mongoose plugins. The literal
// `integrationBus.publish` keeps the W389/W392 producer-coverage guards happy.
AssistiveDeviceSchema.pre('save', function () {
  this.$__deviceReturnedNow = false;
  this.$__returnedLoan = null;
  const becameAvailable = this.isModified('availability') && this.availability === 'available';
  if (becameAvailable && Array.isArray(this.loans) && this.loans.length) {
    let best = null;
    for (const l of this.loans) {
      if (l.status === 'returned' && l.returnedAt && l.beneficiaryId) {
        if (!best || new Date(l.returnedAt) >= new Date(best.returnedAt)) best = l;
      }
    }
    if (best) {
      this.$__deviceReturnedNow = true;
      this.$__returnedLoan = best;
    }
  }
});

AssistiveDeviceSchema.post('save', function emitAssistiveDeviceReturned(doc) {
  try {
    if (!this.$__deviceReturnedNow || !this.$__returnedLoan) return;
    const loan = this.$__returnedLoan;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;

    Promise.resolve(
      integrationBus.publish('assistive-devices', 'assistive_device.returned', {
        deviceId: String(doc._id),
        assetTag: doc.assetTag || '',
        beneficiaryId: String(loan.beneficiaryId),
        branchId: doc.branchId ? String(doc.branchId) : '',
        category: doc.category || '',
        conditionOnReturn: loan.conditionOnReturn || '',
        returnedAt: loan.returnedAt || new Date(),
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired (e.g. unit tests) — never block persistence */
  }
});

module.exports =
  mongoose.models.AssistiveDevice || mongoose.model('AssistiveDevice', AssistiveDeviceSchema);

module.exports.CATEGORIES = CATEGORIES;
module.exports.AVAILABILITY = AVAILABILITY;
module.exports.LOAN_STATUSES = LOAN_STATUSES;
module.exports.MAINTENANCE_KINDS = MAINTENANCE_KINDS;
module.exports.CONDITION_GRADES = CONDITION_GRADES;
