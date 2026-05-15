/**
 * Vendor Model — نموذج الموردين
 */
const mongoose = require('mongoose');
const {
  nationalAddressSubschema,
  attachNationalAddressGuard,
} = require('./_shared/nationalAddress.subschema');

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: { type: String, trim: true },
    // العنوان الوطني السعودي — strict-verified via وَصِل when provided.
    nationalAddress: nationalAddressSubschema,
    rating: { type: Number, min: 0, max: 5, default: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blacklisted', 'pending'],
      default: 'active',
    },
    totalOrders: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    taxNumber: { type: String, trim: true },
    contractStart: Date,
    contractEnd: Date,
    paymentTerms: { type: String, trim: true },
    notes: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vendorSchema.index({ name: 1 });
vendorSchema.index({ status: 1 });
vendorSchema.index({ category: 1 });

attachNationalAddressGuard(vendorSchema);

module.exports = mongoose.models.Vendor || mongoose.model('Vendor', vendorSchema);
