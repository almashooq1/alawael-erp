/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  mrn: { type: String, unique: true },
  dob: { type: Date },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now },
});

// Compound index: filter active beneficiaries sorted by name (admin list view)
beneficiarySchema.index({ status: 1, name: 1 });

module.exports = mongoose.models.Beneficiary || mongoose.model('Beneficiary', beneficiarySchema);
