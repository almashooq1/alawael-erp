'use strict';

const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    code: { type: String, unique: true, required: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String, default: null },
    type: {
      type: String,
      enum: ['main', 'sub', 'transit'],
      default: 'main',
    },
    location: { type: String, default: null },
    managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

warehouseSchema.index({ branchId: 1, isActive: 1 });

module.exports = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);
