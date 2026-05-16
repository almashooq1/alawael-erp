'use strict';

const mongoose = require('mongoose');

const AssetAssignmentSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    assetType: {
      type: String,
      enum: [
        'laptop',
        'phone',
        'badge',
        'sim_card',
        'vehicle',
        'uniform',
        'equipment',
        'access_card',
        'other',
      ],
      required: true,
      index: true,
    },
    assetCode: { type: String, maxlength: 50 },
    serialNumber: { type: String, maxlength: 100 },
    brand: { type: String, maxlength: 100 },
    model: { type: String, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    assignedAt: { type: Date, default: Date.now },
    returnedAt: { type: Date, default: null },
    expectedReturnAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['assigned', 'returned', 'lost', 'damaged', 'replaced'],
      default: 'assigned',
      index: true,
    },
    conditionOnAssign: { type: String, enum: ['new', 'good', 'fair', 'used'], default: 'good' },
    conditionOnReturn: {
      type: String,
      enum: ['new', 'good', 'fair', 'used', 'damaged'],
      default: null,
    },
    notes: { type: String, maxlength: 1000 },
  },
  { timestamps: true, collection: 'hr_asset_assignments' }
);

module.exports =
  mongoose.models.AssetAssignment || mongoose.model('AssetAssignment', AssetAssignmentSchema);
