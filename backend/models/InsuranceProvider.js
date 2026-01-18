const mongoose = require('mongoose');

const insuranceProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g. Bupa, Tawuniya
    code: { type: String, required: true },
    contactEmail: String,
    contactPhone: String,
    coverageDetails: { type: mongoose.Schema.Types.Mixed }, // Custom JSON for rules
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('InsuranceProvider', insuranceProviderSchema);
