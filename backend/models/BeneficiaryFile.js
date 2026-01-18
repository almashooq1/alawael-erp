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
  attachments: [String], // URLs to images/PDFs
});

const beneficiaryFileSchema = new mongoose.Schema(
  {
    fileNumber: { type: String, required: true, unique: true }, // e.g. PAT-2024-555
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to Login

    // Demographics
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    dob: { type: Date },
    gender: { type: String, enum: ['MALE', 'FEMALE'] },
    bloodType: String,

    // Contact
    phone: String,
    address: String,
    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
    },

    // Insurance
    insurance: {
      provider: { type: mongoose.Schema.Types.ObjectId, ref: 'InsuranceProvider' },
      policyNumber: String,
      expiryDate: Date,
    },

    // Medical
    medicalHistory: [medicalRecordSchema],
    allergies: [String],
    disabilities: [String],

    // Rehabilitation
    currentPlanId: { type: mongoose.Schema.Types.ObjectId }, // Link to Rehab Plan Module
    programStatus: { type: String, enum: ['ACTIVE', 'COMPLETED', 'HOLD', 'ASSESSMENT'], default: 'ASSESSMENT' },

    balance: { type: Number, default: 0 }, // Financial Balance
  },
  { timestamps: true },
);

module.exports = mongoose.model('BeneficiaryFile', beneficiaryFileSchema);
