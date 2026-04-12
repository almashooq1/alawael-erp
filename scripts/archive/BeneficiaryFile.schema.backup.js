/**
 * BeneficiaryFile Schema Backup
 * ═══════════════════════════════════════════════════════════════
 * Archived 2025-06-10 during migration to canonical 'Beneficiary' model.
 * This is for reference only — NOT loaded by the application.
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  diagnosis: String,
  treatmentPlan: String,
  prescription: [
    {
      medication: String,
      dosage: String,
      duration: String,
    },
  ],
  attachments: [String],
});

const beneficiaryFileSchema = new mongoose.Schema(
  {
    fileNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dob: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE'] },
    bloodType: String,
    phone: String,
    address: String,
    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
    },
    insurance: {
      provider: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProvider' },
      policyNumber: String,
      expiryDate: Date,
    },
    medicalHistory: [medicalRecordSchema],
    allergies: [String],
    disabilities: [String],
    currentPlanId: { type: mongoose.Schema.Types.ObjectId },
    programStatus: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'HOLD', 'ASSESSMENT'],
      default: 'ASSESSMENT',
    },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = beneficiaryFileSchema;
