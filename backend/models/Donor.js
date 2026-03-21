/* eslint-disable no-unused-vars */
/**
 * Donor Model — نموذج المتبرعين
 */
const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['individual', 'corporate', 'government', 'ngo'],
      default: 'individual',
    },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    totalDonations: { type: Number, default: 0 },
    donationsCount: { type: Number, default: 0 },
    firstDonation: Date,
    lastDonation: Date,
    preferredCampaign: String,
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

donorSchema.index({ name: 1 });
donorSchema.index({ status: 1 });

module.exports = mongoose.models.Donor || mongoose.model('Donor', donorSchema);
