'use strict';

const mongoose = require('mongoose');

const branchServiceSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    serviceCode: { type: String, required: true, trim: true }, // pt, ot, speech, aba, psychology
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    descriptionAr: { type: String, default: null },
    defaultDurationMinutes: { type: Number, default: 45 },
    price: { type: Number, required: true, min: 0 }, // سعر الجلسة
    insurancePrice: { type: Number, default: null },
    vatRate: { type: Number, default: 15.0 },
    vatInclusive: { type: Boolean, default: false },
    vatCategory: {
      type: String,
      enum: ['standard', 'exempt', 'zero_rated'],
      default: 'standard',
    },
    maxSessionsPerWeek: { type: Number, default: null },
    minAge: { type: Number, default: null },
    maxAge: { type: Number, default: null },
    requiredDocuments: { type: [String], default: [] },
    prerequisites: { type: [String], default: [] },
    requiresReferral: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

branchServiceSchema.index({ branchId: 1, serviceCode: 1 }, { unique: true });
branchServiceSchema.index({ branchId: 1, isActive: 1 });

module.exports = mongoose.model('BranchService', branchServiceSchema);
