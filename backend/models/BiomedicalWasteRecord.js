'use strict';

/**
 * BiomedicalWasteRecord — W1123.
 *
 * Healthcare (biomedical / clinical) waste tracking from generation → disposal,
 * a CBAHI + Saudi GAMEP/MOH + WHO "cradle-to-grave" requirement that had no
 * model in the platform (the 2026-06-10 new-system audit gap). Each record is a
 * consignment/batch of a single waste category, segregated at source, optionally
 * stored, collected by a licensed contractor, and finally treated/disposed with
 * a manifest (consignment note) + certificate of destruction.
 *
 * Categories follow WHO healthcare-waste classes; container colour follows the
 * Saudi/WHO colour code (yellow = infectious/sharps, red = pathological/anatomical,
 * blue = pharmaceutical, black = general/non-hazardous, white = sharps puncture-proof).
 *
 * Lifecycle:  generated → stored → collected → disposed   (+ rejected escape)
 *
 * Wave-18 invariants (declared via the `__invariants` virtual path + validate):
 *   • wasteCategory ∈ CATEGORIES; status ∈ STATUSES; disposalMethod ∈ DISPOSAL_METHODS
 *   • quantityKg > 0
 *   • status=stored    ⇒ storageLocation + storedAt
 *   • status=collected ⇒ collectionVendor + collectionDate
 *   • status=disposed  ⇒ disposalMethod + disposalFacility + disposalDate
 *   • status=rejected  ⇒ rejectedReason
 *   • sharps category  ⇒ punctureProofContainer === true
 *   • generationDate required always
 *
 * Org/operational scope (no beneficiaryId) → feeds the org `Alert` sink, not the
 * per-beneficiary CareTimeline. An `overdue-storage` smart-alert rule (W1124)
 * consumes the `storageOverdue` virtual.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// WHO healthcare-waste categories.
const CATEGORIES = [
  'infectious', // potentially infectious (cultures, contaminated dressings)
  'sharps', // needles, blades, broken glass
  'pathological', // human tissue, body parts, anatomical waste
  'pharmaceutical', // expired / unused medicines
  'cytotoxic', // chemotherapy / genotoxic agents
  'chemical', // disinfectants, solvents, reagents
  'radioactive', // diagnostic / therapeutic radionuclides
  'general', // non-hazardous, municipal-equivalent
];

// Saudi / WHO container colour code.
const CONTAINER_COLORS = ['yellow', 'red', 'blue', 'black', 'white', 'other'];

const STATUSES = ['generated', 'stored', 'collected', 'disposed', 'rejected'];

const DISPOSAL_METHODS = [
  'incineration',
  'autoclave_steam',
  'chemical_disinfection',
  'microwave',
  'encapsulation',
  'sanitary_landfill',
  'return_to_supplier',
];

const GENERATION_DEPARTMENTS = [
  'clinic',
  'nursing',
  'laboratory',
  'pharmacy',
  'therapy',
  'dental',
  'housekeeping',
  'kitchen',
  'other',
];

// Hazardous categories that must never be downgraded to a general (black) bin.
const HAZARDOUS = ['infectious', 'sharps', 'pathological', 'cytotoxic', 'radioactive'];

const BiomedicalWasteRecordSchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },

    // Human-readable consignment id (auto: BMW-YYYY-NNNN).
    recordNumber: { type: String, unique: true, index: true },

    wasteCategory: { type: String, enum: CATEGORIES, required: true, index: true },
    containerColor: { type: String, enum: CONTAINER_COLORS, default: 'yellow' },
    punctureProofContainer: { type: Boolean, default: false },

    quantityKg: { type: Number, required: true, min: 0 },
    containerCount: { type: Number, default: 1, min: 1 },

    // ── Generation (segregation at source) ───────────────────────────
    generationDate: { type: Date, required: true, index: true },
    generationDepartment: { type: String, enum: GENERATION_DEPARTMENTS, default: 'clinic', index: true },
    generationLocationNote: { type: String, default: '', maxlength: 300 },
    segregatedByName: { type: String, default: '', maxlength: 120 },
    segregatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    status: { type: String, enum: STATUSES, default: 'generated', required: true, index: true },

    // ── Temporary storage ────────────────────────────────────────────
    storageLocation: { type: String, default: '', maxlength: 200 },
    storedAt: { type: Date, default: null },
    // WHO: infectious/pathological waste max on-site storage (hours) before treatment.
    maxStorageHours: { type: Number, default: 48, min: 1, max: 720 },

    // ── Collection by a licensed contractor ──────────────────────────
    collectionVendor: { type: String, default: '', maxlength: 200 },
    collectedByName: { type: String, default: '', maxlength: 120 },
    collectionDate: { type: Date, default: null },
    manifestNumber: { type: String, default: '', maxlength: 100, index: true },

    // ── Treatment / disposal ─────────────────────────────────────────
    disposalMethod: { type: String, enum: [...DISPOSAL_METHODS, ''], default: '' },
    disposalFacility: { type: String, default: '', maxlength: 200 },
    disposalDate: { type: Date, default: null },
    treatmentCertificateRef: { type: String, default: '', maxlength: 200 },

    rejectedReason: { type: String, default: '', maxlength: 500 },

    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '', maxlength: 1000 },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'biomedical_waste_records' }
);

BiomedicalWasteRecordSchema.index({ branchId: 1, status: 1, generationDate: -1 });
BiomedicalWasteRecordSchema.index({ branchId: 1, wasteCategory: 1, status: 1 });
BiomedicalWasteRecordSchema.index({ status: 1, storedAt: 1 });

// ── Virtuals ────────────────────────────────────────────────────────
// On-site storage time-limit breach (compliance signal). True only while the
// consignment is still in `stored` state past its storedAt + maxStorageHours.
BiomedicalWasteRecordSchema.virtual('storageOverdue').get(function () {
  if (this.status !== 'stored' || !this.storedAt) return false;
  const deadline = new Date(this.storedAt).getTime() + (this.maxStorageHours || 48) * 3600 * 1000;
  return Date.now() > deadline;
});

BiomedicalWasteRecordSchema.virtual('isHazardous').get(function () {
  return HAZARDOUS.includes(this.wasteCategory);
});

BiomedicalWasteRecordSchema.set('toJSON', { virtuals: true });
BiomedicalWasteRecordSchema.set('toObject', { virtuals: true });

// ── Auto record number (BMW-YYYY-NNNN) ──────────────────────────────
BiomedicalWasteRecordSchema.pre('save', async function () {
  if (!this.recordNumber) {
    const year = new Date(this.generationDate || Date.now()).getFullYear();
    const Model = mongoose.model('BiomedicalWasteRecord');
    const count = await Model.countDocuments({ recordNumber: { $regex: `^BMW-${year}-` } });
    this.recordNumber = `BMW-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

// ── Wave-18 invariants ──────────────────────────────────────────────
BiomedicalWasteRecordSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

// Force the __invariants validator to run on EVERY save (create + status-change
// updates), not only on create — otherwise a `findById → set status → save`
// transition skips it (the path is select:false + unmodified). W1123.
BiomedicalWasteRecordSchema.pre('validate', function () {
  this.markModified('__invariants');
});

BiomedicalWasteRecordSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!CATEGORIES.includes(this.wasteCategory)) {
    this.invalidate('wasteCategory', `must be one of ${CATEGORIES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (!(this.quantityKg > 0)) {
    this.invalidate('quantityKg', 'quantityKg must be > 0');
    ok = false;
  }
  if (!this.generationDate) {
    this.invalidate('generationDate', 'generationDate required');
    ok = false;
  }
  // Sharps must be in a puncture-proof container (WHO/CBAHI safety rule).
  if (this.wasteCategory === 'sharps' && this.punctureProofContainer !== true) {
    this.invalidate('punctureProofContainer', 'sharps waste requires a puncture-proof container');
    ok = false;
  }
  if (this.status === 'stored') {
    if (!String(this.storageLocation || '').trim()) {
      this.invalidate('storageLocation', 'storageLocation required when status=stored');
      ok = false;
    }
    if (!this.storedAt) {
      this.invalidate('storedAt', 'storedAt required when status=stored');
      ok = false;
    }
  }
  if (this.status === 'collected') {
    if (!String(this.collectionVendor || '').trim()) {
      this.invalidate('collectionVendor', 'collectionVendor required when status=collected');
      ok = false;
    }
    if (!this.collectionDate) {
      this.invalidate('collectionDate', 'collectionDate required when status=collected');
      ok = false;
    }
  }
  if (this.status === 'disposed') {
    if (!DISPOSAL_METHODS.includes(this.disposalMethod)) {
      this.invalidate('disposalMethod', 'valid disposalMethod required when status=disposed');
      ok = false;
    }
    if (!String(this.disposalFacility || '').trim()) {
      this.invalidate('disposalFacility', 'disposalFacility required when status=disposed');
      ok = false;
    }
    if (!this.disposalDate) {
      this.invalidate('disposalDate', 'disposalDate required when status=disposed');
      ok = false;
    }
  }
  if (this.status === 'rejected' && !String(this.rejectedReason || '').trim()) {
    this.invalidate('rejectedReason', 'rejectedReason required when status=rejected');
    ok = false;
  }
  return ok;
});

const BiomedicalWasteRecord =
  mongoose.models.BiomedicalWasteRecord ||
  mongoose.model('BiomedicalWasteRecord', BiomedicalWasteRecordSchema);

module.exports = BiomedicalWasteRecord;
module.exports.CATEGORIES = CATEGORIES;
module.exports.CONTAINER_COLORS = CONTAINER_COLORS;
module.exports.STATUSES = STATUSES;
module.exports.DISPOSAL_METHODS = DISPOSAL_METHODS;
module.exports.GENERATION_DEPARTMENTS = GENERATION_DEPARTMENTS;
module.exports.HAZARDOUS = HAZARDOUS;
