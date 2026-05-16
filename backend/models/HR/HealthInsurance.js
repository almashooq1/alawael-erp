'use strict';

const mongoose = require('mongoose');

const DependentSchema = new mongoose.Schema(
  {
    _id: false,
    fullName: { type: String, required: true, maxlength: 200 },
    relationship: {
      type: String,
      enum: ['spouse', 'son', 'daughter', 'father', 'mother', 'other'],
      required: true,
    },
    nationalId: { type: String, maxlength: 50 },
    dob: { type: Date },
    isCovered: { type: Boolean, default: true },
  },
  { _id: false }
);

const HealthInsuranceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      unique: true,
      index: true,
    },
    providerName: { type: String, required: true, maxlength: 200 },
    policyNumber: { type: String, maxlength: 100 },
    classType: { type: String, enum: ['VIP', 'A_PLUS', 'A', 'B', 'C'], default: 'A' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    annualLimit: { type: Number, default: 0 },
    copaymentPercent: { type: Number, default: 0, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending_renewal'],
      default: 'active',
      index: true,
    },
    dependents: { type: [DependentSchema], default: [] },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true, collection: 'hr_health_insurance' }
);

module.exports =
  mongoose.models.HealthInsurance || mongoose.model('HealthInsurance', HealthInsuranceSchema);
