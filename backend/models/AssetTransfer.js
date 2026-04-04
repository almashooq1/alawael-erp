/**
 * AssetTransfer Model — نقل الأصول بين الفروع
 * النظام 34: إدارة الأصول والموارد
 */
const mongoose = require('mongoose');

const assetTransferSchema = new mongoose.Schema(
  {
    transferNumber: { type: String, required: true, unique: true, uppercase: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    fromBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    toBranchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    fromLocation: { type: String },
    toLocation: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'in_transit', 'received', 'rejected'],
      default: 'pending',
    },
    transferDate: { type: Date, required: true },
    actualTransferDate: { type: Date },
    receivedDate: { type: Date },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true },
    notes: { type: String },
    conditionBefore: {
      condition: String,
      notes: String,
      images: [String],
    },
    conditionAfter: {
      condition: String,
      notes: String,
      images: [String],
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'asset_transfers' }
);

assetTransferSchema.index({ transferNumber: 1 });
assetTransferSchema.index({ status: 1 });
assetTransferSchema.index({ assetId: 1 });
assetTransferSchema.index({ fromBranchId: 1 });
assetTransferSchema.index({ toBranchId: 1 });

module.exports =
  mongoose.models.AssetTransfer || mongoose.model('AssetTransfer', assetTransferSchema);
