'use strict';

/**
 * VendorSupplyContract — supplier framework contracts for /api/v1/purchasing/contracts.
 * W781 — separate from HR EmploymentContract and generic Contract.model.
 */

const mongoose = require('mongoose');

const vendorSupplyContractSchema = new mongoose.Schema(
  {
    contract_number: { type: String, unique: true, uppercase: true },
    vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    vendor_name: { type: String, required: true, trim: true },
    contract_type: {
      type: String,
      enum: ['annual', 'one_time', 'framework'],
      default: 'annual',
    },
    category: { type: String, trim: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    contract_value: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['draft', 'active', 'expired', 'terminated'],
      default: 'active',
    },
    auto_renew: { type: Boolean, default: false },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    notes: { type: String },
    is_deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vendorSupplyContractSchema.pre('save', async function () {
  if (!this.contract_number) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('VendorSupplyContract').countDocuments();
    this.contract_number = `CNT-${year}-${String(count + 1).padStart(3, '0')}`;
  }
});

vendorSupplyContractSchema.index({ vendor_id: 1, status: 1 });
vendorSupplyContractSchema.index({ end_date: 1, status: 1 });
vendorSupplyContractSchema.index({ is_deleted: 1 });

module.exports =
  mongoose.models.VendorSupplyContract ||
  mongoose.model('VendorSupplyContract', vendorSupplyContractSchema);
