'use strict';

/**
 * MedicationAdministrationRecord (MAR) — Wave 191b.
 *
 * "سجل تعاطي الأدوية اليومي" — per-dose log for medications administered
 * at the day-rehab center. Required by CBAHI accreditation + اللائحة
 * التنفيذية لمزاولة المهن الصحية.
 *
 * Distinct from existing Medication / Prescription models:
 *  • Medication = the prescribed drug (dose, frequency, prescriber).
 *  • MAR = the actual administration event (who gave it, when, refused?).
 *  • One Medication produces many MAR rows (one per scheduled dose).
 *
 * Wave-18 invariants:
 *   • status='administered' → actualTime + administeredBy required
 *   • status='refused' → refusalReason required
 *   • controlled-substance route → witnessedBy required
 */

const mongoose = require('mongoose');

const STATUSES = ['scheduled', 'administered', 'refused', 'missed', 'held'];
const ROUTES = ['oral', 'topical', 'injection', 'inhaled', 'rectal', 'eye_drops', 'ear_drops'];

const MarSchema = new mongoose.Schema(
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
    medicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Medication',
      default: null,
    },
    // Denormalized for offline/print readability — if the prescription is
    // amended, this row keeps the historical name/dose at administration time.
    medicationName: { type: String, required: true, maxlength: 200 },
    dose: { type: String, default: '', maxlength: 100 },
    route: { type: String, enum: ROUTES, default: 'oral' },
    isControlled: { type: Boolean, default: false },

    date: { type: Date, required: true, index: true },
    scheduledTime: { type: Date, required: true },
    actualTime: { type: Date, default: null },

    status: { type: String, enum: STATUSES, default: 'scheduled', index: true },
    administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    administeredByName: { type: String, default: '', maxlength: 100 },
    witnessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    witnessedByName: { type: String, default: '', maxlength: 100 },

    refusalReason: { type: String, default: '', maxlength: 500 },
    sideEffects: { type: String, default: '', maxlength: 500 },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, collection: 'medication_administration_records' }
);

MarSchema.index({ beneficiaryId: 1, scheduledTime: 1 });
MarSchema.index({ date: 1, status: 1 });
MarSchema.index({ branchId: 1, date: -1 });

MarSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

MarSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.status === 'administered') {
    if (!this.actualTime) {
      this.invalidate('actualTime', 'required when status=administered');
      ok = false;
    }
    if (!this.administeredBy && !this.administeredByName) {
      this.invalidate('administeredBy', 'administeredBy or administeredByName required');
      ok = false;
    }
  }
  if (this.status === 'refused' && !String(this.refusalReason || '').trim()) {
    this.invalidate('refusalReason', 'required when status=refused');
    ok = false;
  }
  if (
    this.isControlled &&
    this.status === 'administered' &&
    !this.witnessedBy &&
    !this.witnessedByName
  ) {
    this.invalidate('witnessedBy', 'controlled-substance administration requires a witness');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.MedicationAdministrationRecord ||
  mongoose.model('MedicationAdministrationRecord', MarSchema);

module.exports.STATUSES = STATUSES;
module.exports.ROUTES = ROUTES;
