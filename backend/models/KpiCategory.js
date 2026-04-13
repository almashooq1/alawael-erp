/**
 * KpiCategory — فئات مؤشرات الأداء الرئيسية
 * النظام 36: لوحة KPIs الذكية
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

const kpiCategorySchema = new Schema(
  {
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    name: { type: String, required: true, maxlength: 150 },
    nameAr: { type: String, required: true, maxlength: 150 },
    code: { type: String, required: true, unique: true, maxlength: 50, index: true },
    // clinical, financial, operational, quality, hr
    icon: { type: String, default: null },
    color: { type: String, default: 'blue' },
    description: { type: String, default: null },
    descriptionAr: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// REMOVED DUPLICATE: code already has unique:true + index:true in schema
kpiCategorySchema.index({ isActive: 1 });

module.exports = mongoose.models.KpiCategory || mongoose.model('KpiCategory', kpiCategorySchema);
