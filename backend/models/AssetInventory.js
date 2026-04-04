/**
 * AssetInventory Model — الجرد الدوري للأصول
 * النظام 34: إدارة الأصول والموارد
 */
const mongoose = require('mongoose');

const assetInventorySchema = new mongoose.Schema(
  {
    inventoryNumber: { type: String, required: true, unique: true, uppercase: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    title: { type: String, required: true },
    inventoryDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'approved'],
      default: 'draft',
    },
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    totalAssetsCounted: { type: Number, default: 0 },
    assetsFound: { type: Number, default: 0 },
    assetsMissing: { type: Number, default: 0 },
    assetsDamaged: { type: Number, default: 0 },
    totalBookValue: { type: Number, default: 0 },
    totalMarketValue: { type: Number },
    notes: { type: String },
    completedAt: { type: Date },
    approvedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'asset_inventories' }
);

assetInventorySchema.index({ inventoryDate: 1 });
assetInventorySchema.index({ status: 1 });
assetInventorySchema.index({ branchId: 1 });

module.exports =
  mongoose.models.AssetInventory || mongoose.model('AssetInventory', assetInventorySchema);
