/**
 * MedicationAdministration.js — نموذج إعطاء الأدوية (MAR)
 */
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MedicationAdministrationSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    prescription: { type: Schema.Types.ObjectId, ref: 'EmrPrescription' },
    medicationName: { type: String, required: true },
    dosage: { type: String, required: true },
    route: {
      type: String,
      enum: ['oral', 'iv', 'im', 'sc', 'topical', 'inhalation', 'rectal', 'ocular', 'otic', 'nasal', 'other'],
      default: 'oral',
    },
    scheduledTime: { type: Date, required: true },
    administeredTime: Date,
    status: {
      type: String,
      enum: ['scheduled', 'administered', 'refused', 'missed', 'held', 'discontinued'],
      default: 'scheduled',
    },
    administeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    witnessedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    location: String,
    notes: String,
    refusalReason: String,
    holdReason: String,
    sideEffects: [String],
    vitalSignsSnapshot: {
      bloodPressure: String,
      heartRate: Number,
      temperature: Number,
    },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

MedicationAdministrationSchema.index({ beneficiary: 1, scheduledTime: 1 });
MedicationAdministrationSchema.index({ status: 1, scheduledTime: 1 });
MedicationAdministrationSchema.index({ medicationName: 1 });

module.exports =
  mongoose.models.EmrMedicationAdministration ||
  mongoose.model('EmrMedicationAdministration', MedicationAdministrationSchema);
