const mongoose = require('mongoose');

const beneficiarySchema = new mongoose.Schema({
  name: { type: String, required: true },
  mrn: { type: String, unique: true },
  dob: { type: Date },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Beneficiary || mongoose.model('Beneficiary', beneficiarySchema);
