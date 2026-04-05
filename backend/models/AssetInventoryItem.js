/**
 * AssetInventoryItem Model — تفاصيل بنود الجرد
 * النظام 34: إدارة الأصول والموارد
 */
const mongoose = require('mongoose');

const assetInventoryItemSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    inventoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssetInventory',
      required: true,
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
    },
    status: {
      type: String,
      enum: ['found', 'missing', 'damaged', 'disposed'],
      required: true,
    },
    actualLocation: { type: String },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'damaged', null],
      default: null,
    },
    marketValue: { type: Number, min: 0 },
    notes: { type: String },
    scannedBy: { type: String },
    scannedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'asset_inventory_items' }
);

assetInventoryItemSchema.index({ inventoryId: 1 });
assetInventoryItemSchema.index({ assetId: 1 });
assetInventoryItemSchema.index({ status: 1 });

module.exports =
  mongoose.models.AssetInventoryItem ||
  mongoose.models.AssetInventoryItem ||
  mongoose.model('AssetInventoryItem', assetInventoryItemSchema);
