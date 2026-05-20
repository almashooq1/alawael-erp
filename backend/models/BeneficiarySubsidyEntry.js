'use strict';

/**
 * BeneficiarySubsidyEntry — Wave 205b.
 *
 * "إعانات ومعاشات المستفيد" — monthly financial support records.
 * Tracks the multiple government / center subsidies a beneficiary
 * receives (or owes):
 *   • معاش الضمان الاجتماعي
 *   • إعانة الأشخاص ذوي الإعاقة
 *   • رسوم المركز (الأهل)
 *   • دعم وزاري
 *   • أخرى
 *
 * One row per (beneficiaryId, year, month, subsidyType). View can
 * aggregate per-year, per-month, per-beneficiary.
 */

const mongoose = require('mongoose');

const TYPES = [
  'social_security', // معاش الضمان
  'disability_allowance', // إعانة الإعاقة
  'center_fees', // رسوم المركز (parent payment to center)
  'ministry_support', // دعم وزاري للمركز
  'other',
];
const STATUSES = ['expected', 'received', 'overdue', 'cancelled'];

const SubsidyEntrySchema = new mongoose.Schema(
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

    year: { type: Number, required: true, min: 2020, max: 2050, index: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },

    subsidyType: { type: String, enum: TYPES, required: true, index: true },
    amountSAR: { type: Number, required: true, min: 0 },

    status: { type: String, enum: STATUSES, default: 'expected', index: true },
    expectedDate: { type: Date, default: null },
    receivedDate: { type: Date, default: null },
    receiptNumber: { type: String, default: '', maxlength: 50 },

    notes: { type: String, default: '', maxlength: 500 },
    enteredByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'beneficiary_subsidy_entries' }
);

// One row per (beneficiary, year, month, type)
SubsidyEntrySchema.index({ beneficiaryId: 1, year: 1, month: 1, subsidyType: 1 }, { unique: true });
SubsidyEntrySchema.index({ year: 1, month: 1, status: 1 });
SubsidyEntrySchema.index({ branchId: 1, year: 1, month: 1 });

SubsidyEntrySchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SubsidyEntrySchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.status === 'received' && !this.receivedDate) {
    this.invalidate('receivedDate', 'required when status=received');
    ok = false;
  }
  return ok;
});

module.exports =
  mongoose.models.BeneficiarySubsidyEntry ||
  mongoose.model('BeneficiarySubsidyEntry', SubsidyEntrySchema);

module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;
