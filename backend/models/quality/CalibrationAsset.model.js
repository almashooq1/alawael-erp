'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { CAL_STATUSES } = require('../../config/calibration.registry');

const calRecordSchema = new Schema(
  {
    calibratedAt: { type: Date, required: true },
    calibratedBy: { type: String, default: null }, // person or vendor name
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor', default: null },
    method: { type: String, default: null },
    referenceStandard: { type: String, default: null }, // traceability
    certificateNumber: { type: String, default: null },
    certificateUrl: { type: String, default: null },
    outcome: { type: String, enum: ['pass', 'pass_with_adjustment', 'fail'], required: true },
    deviationsMeasured: { type: String, default: null },
    nextDueDate: { type: Date, default: null },
    notes: { type: String, default: null },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: true }
);

const calAssetSchema = new Schema(
  {
    assetCode: { type: String, unique: true, index: true }, // CAL-YYYY-NNNN
    name: { type: String, required: true },
    type: { type: String, required: true }, // matches EQUIPMENT_TYPES.code
    serialNumber: { type: String, default: null },
    manufacturer: { type: String, default: null },
    model: { type: String, default: null },
    location: { type: String, default: null },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null, index: true },
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', default: null },

    calibrationFrequency: { type: Number, default: null }, // numeric value
    calibrationFrequencyUnit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'years'],
      default: 'months',
    },

    tolerance: { type: String, default: null }, // free-text like "± 0.1 mg"
    referenceStandard: { type: String, default: null }, // e.g. NIST traceable

    status: { type: String, enum: CAL_STATUSES, default: 'active', index: true },

    lastCalibratedAt: { type: Date, default: null },
    nextDueDate: { type: Date, default: null, index: true },
    outOfServiceReason: { type: String, default: null },

    calibrationRecords: { type: [calRecordSchema], default: [] },

    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true, collection: 'calibration_assets' }
);

calAssetSchema.index({ branchId: 1, status: 1 });
calAssetSchema.index({ status: 1, nextDueDate: 1 });

calAssetSchema.pre('validate', async function () {
  if (!this.assetCode) {
    const year = new Date().getUTCFullYear();
    const Model = mongoose.model('CalibrationAsset');
    const count = await Model.countDocuments({ assetCode: { $regex: `^CAL-${year}-` } });
    this.assetCode = `CAL-${year}-${String(count + 1).padStart(4, '0')}`;
  }
});

module.exports =
  mongoose.models.CalibrationAsset || mongoose.model('CalibrationAsset', calAssetSchema);
