/**
 * AssetCategory Model — تصنيفات الأصول الثابتة
 * النظام 34: إدارة الأصول والموارد
 */
const mongoose = require('mongoose');

const assetCategorySchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AssetCategory', default: null },
    depreciationMethod: {
      type: String,
      enum: [
        'straight_line',
        'declining_balance',
        'double_declining_balance',
        'units_of_production',
        'sum_of_years_digits',
      ],
      default: 'straight_line',
    },
    usefulLifeYears: { type: Number, default: 5, min: 0 },
    salvageValuePercent: { type: Number, default: 0, min: 0, max: 100 },
    assetAccountCode: { type: String, trim: true },
    depreciationAccountCode: { type: String, trim: true },
    expenseAccountCode: { type: String, trim: true },
    requiresMaintenance: { type: Boolean, default: false },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'asset_categories' }
);

// REMOVED DUPLICATE: code already has unique:true in schema
assetCategorySchema.index({ parentId: 1 });
assetCategorySchema.index({ depreciationMethod: 1 });
assetCategorySchema.index({ isActive: 1 });

module.exports =
  mongoose.models.AssetCategory || mongoose.model('AssetCategory', assetCategorySchema);
