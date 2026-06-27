/**
 * Prescription.js — نموذج الوصفات الطبية
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MedicationItemSchema = new Schema(
  {
    medicationName: { type: String, required: true },
    genericName: String,
    dosage: { type: String, required: true },
    route: {
      type: String,
      enum: ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'rectal', 'ocular', 'otic', 'nasal', 'other'],
      default: 'oral',
    },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    quantity: { type: Number, required: true },
    instructions: { ar: String, en: String },
    refills: { type: Number, default: 0 },
    isPRN: { type: Boolean, default: false },
    prnReason: String,
  },
  { _id: true }
);

const PrescriptionSchema = new Schema(
  {
    prescriptionNumber: {
      type: String,
      unique: true,
      default: function () {
        return (
          'RX-' +
          Date.now().toString(36).toUpperCase() +
          Math.random().toString(36).substring(2, 6).toUpperCase()
        );
      },
    },
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    medicalRecord: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    prescribedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    prescribedDate: { type: Date, default: Date.now, required: true },
    diagnosis: {
      code: String,
      description: { ar: String, en: String },
    },
    medications: [MedicationItemSchema],
    status: {
      type: String,
      enum: ['active', 'completed', 'discontinued', 'on_hold', 'cancelled'],
      default: 'active',
    },
    startDate: { type: Date, default: Date.now },
    endDate: Date,
    pharmacyNotes: { ar: String, en: String },
    interactionsChecked: { type: Boolean, default: false },
    interactionAlerts: [
      {
        severity: { type: String, enum: ['minor', 'moderate', 'major', 'contraindicated'] },
        description: String,
        medicationsInvolved: [String],
      },
    ],
    dispensedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dispensedAt: Date,
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isDeleted: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

PrescriptionSchema.index({ beneficiary: 1, prescribedDate: -1 });
PrescriptionSchema.index({ prescriptionNumber: 1 });
PrescriptionSchema.index({ status: 1 });

module.exports =
  mongoose.models.EmrPrescription ||
  mongoose.model('EmrPrescription', PrescriptionSchema);
