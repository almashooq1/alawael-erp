'use strict';

/**
 * StaffHealthRecord — W1125.
 *
 * Occupational-health surveillance for healthcare workers — a CBAHI + Saudi MOH
 * + OSHA requirement that the platform had no model for (the 2026-06-10
 * new-system audit gap; the Employee model carries zero health fields). One
 * record per occupational-health event/surveillance item, keyed by employee.
 *
 * recordType drives which fields matter:
 *   immunization        — vaccineName + doseNumber + administeredDate (Hep-B, flu, …)
 *   tb_screening        — result (TST/IGRA negative/positive/indeterminate)
 *   fitness_for_work    — fitnessLevel (fit / fit_with_restrictions / unfit)
 *   exposure_incident   — exposureType (needlestick/sharps/splash) + PEP + timeliness
 *   periodic_checkup    — general periodic medical
 *   respirator_fit_test — result (pass/fail), nextDueDate (annual)
 *
 * Lifecycle: open → in_progress → completed|cleared|restricted|follow_up_required → closed
 *
 * Occupational health is CONFIDENTIAL (default true) — the route restricts READ
 * to occupational-health / HR / physician / admin roles, never the broad staff.
 *
 * Org/staff-scoped (no beneficiaryId) → feeds the org `Alert` sink (an
 * overdue-surveillance rule can consume `surveillanceOverdue`), not CareTimeline.
 *
 * Wave-18 invariants (via __invariants validate + a pre('validate') markModified
 * so they fire on UPDATE-saves too, not only create — the W1123 lesson):
 *   • recordType ∈ TYPES; status ∈ STATUSES; eventDate required
 *   • exposure_incident ⇒ exposureType
 *   • immunization      ⇒ vaccineName
 *   • status=restricted ⇒ restrictions text
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const TYPES = [
  'immunization',
  'tb_screening',
  'fitness_for_work',
  'exposure_incident',
  'periodic_checkup',
  'respirator_fit_test',
];

const STATUSES = [
  'open',
  'in_progress',
  'completed',
  'cleared',
  'restricted',
  'follow_up_required',
  'closed',
];

const EXPOSURE_TYPES = [
  'needlestick',
  'sharps',
  'splash_mucous',
  'splash_skin',
  'aerosol',
  'other',
];
const FITNESS_LEVELS = ['fit', 'fit_with_restrictions', 'temporarily_unfit', 'unfit'];
const RESULTS = ['negative', 'positive', 'indeterminate', 'pass', 'fail', 'not_applicable'];

const StaffHealthRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    employeeName: { type: String, default: '', maxlength: 160 },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },

    recordNumber: { type: String, unique: true, index: true }, // OHR-YYYY-NNNN

    recordType: { type: String, enum: TYPES, required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'open', required: true, index: true },

    eventDate: { type: Date, required: true, index: true },
    nextDueDate: { type: Date, default: null, index: true }, // booster / re-screen / annual fit-test

    outcome: { type: String, default: '', maxlength: 1000 },
    findings: { type: String, default: '', maxlength: 2000 },
    restrictions: { type: String, default: '', maxlength: 1000 },

    // ── Immunization ─────────────────────────────────────────────────
    vaccineName: { type: String, default: '', maxlength: 120 },
    doseNumber: { type: Number, default: null, min: 1, max: 20 },
    administeredDate: { type: Date, default: null },
    lotNumber: { type: String, default: '', maxlength: 80 },

    // ── Exposure incident ────────────────────────────────────────────
    exposureType: { type: String, enum: [...EXPOSURE_TYPES, ''], default: '' },
    sourcePatientKnown: { type: Boolean, default: false },
    bodyFluidType: { type: String, default: '', maxlength: 120 },
    postExposureProphylaxis: { type: String, default: '', maxlength: 500 },
    reportedWithin2h: { type: Boolean, default: false }, // PEP timeliness flag

    // ── Fitness / screening result ───────────────────────────────────
    fitnessLevel: { type: String, enum: [...FITNESS_LEVELS, ''], default: '' },
    result: { type: String, enum: [...RESULTS, ''], default: '' },

    confidential: { type: Boolean, default: true },
    assessedByName: { type: String, default: '', maxlength: 120 },
    assessedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: '', maxlength: 1000 },

    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'staff_health_records' }
);

StaffHealthRecordSchema.index({ branchId: 1, recordType: 1, status: 1 });
StaffHealthRecordSchema.index({ employeeId: 1, recordType: 1, eventDate: -1 });
StaffHealthRecordSchema.index({ status: 1, nextDueDate: 1 });

// ── Virtuals ────────────────────────────────────────────────────────
// Surveillance overdue: a periodic item whose nextDueDate has passed while the
// record is still actionable (not closed). Drives an ops alert + the /due cohort.
StaffHealthRecordSchema.virtual('surveillanceOverdue').get(function () {
  if (!this.nextDueDate || this.status === 'closed') return false;
  return new Date(this.nextDueDate).getTime() < Date.now();
});

StaffHealthRecordSchema.set('toJSON', { virtuals: true });
StaffHealthRecordSchema.set('toObject', { virtuals: true });

// ── Auto record number (OHR-YYYY-NNNN) ──────────────────────────────
StaffHealthRecordSchema.pre('save', async function () {
  if (!this.recordNumber) {
    const year = new Date(this.eventDate || Date.now()).getFullYear();
    const Model = mongoose.model('StaffHealthRecord');
    const count = await Model.countDocuments({ recordNumber: { $regex: `^OHR-${year}-` } });
    this.recordNumber = `OHR-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

// ── Wave-18 invariants ──────────────────────────────────────────────
StaffHealthRecordSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

// Force the validator to run on every save (create + update). W1123 lesson:
// a select:false __invariants path is skipped on update-saves otherwise.
StaffHealthRecordSchema.pre('validate', function () {
  this.markModified('__invariants');
});

StaffHealthRecordSchema.path('__invariants').validate(function () {
  let ok = true;
  if (!TYPES.includes(this.recordType)) {
    this.invalidate('recordType', `must be one of ${TYPES.join(',')}`);
    ok = false;
  }
  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }
  if (!this.eventDate) {
    this.invalidate('eventDate', 'eventDate required');
    ok = false;
  }
  if (this.recordType === 'exposure_incident' && !EXPOSURE_TYPES.includes(this.exposureType)) {
    this.invalidate('exposureType', 'exposureType required for an exposure_incident');
    ok = false;
  }
  if (this.recordType === 'immunization' && !String(this.vaccineName || '').trim()) {
    this.invalidate('vaccineName', 'vaccineName required for an immunization record');
    ok = false;
  }
  if (this.status === 'restricted' && !String(this.restrictions || '').trim()) {
    this.invalidate('restrictions', 'restrictions text required when status=restricted');
    ok = false;
  }
  return ok;
});

const StaffHealthRecord =
  mongoose.models.StaffHealthRecord || mongoose.model('StaffHealthRecord', StaffHealthRecordSchema);

module.exports = StaffHealthRecord;
module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;
module.exports.EXPOSURE_TYPES = EXPOSURE_TYPES;
module.exports.FITNESS_LEVELS = FITNESS_LEVELS;
module.exports.RESULTS = RESULTS;
