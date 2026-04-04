/**
 * DrugLibrary Model — نموذج مكتبة الأدوية والجرعات
 * البرومبت 32: نظام دعم القرار السريري CDSS
 */
const mongoose = require('mongoose');

const drugLibrarySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true },
    code: { type: String, required: true, unique: true, maxlength: 50 },
    genericName: { type: String, required: true, maxlength: 255 },
    genericNameAr: { type: String, required: true, maxlength: 255 },
    brandNames: { type: String, maxlength: 500 }, // مفصولة بفاصلة
    drugClass: { type: String, required: true, maxlength: 100 },
    drugClassAr: { type: String, required: true, maxlength: 100 },
    mechanismOfAction: { type: String },
    standardDosages: { type: mongoose.Schema.Types.Mixed }, // [{route, dose, frequency, unit, min_dose, max_dose}]
    contraindications: { type: mongoose.Schema.Types.Mixed },
    sideEffects: { type: mongoose.Schema.Types.Mixed },
    drugInteractions: { type: mongoose.Schema.Types.Mixed }, // [{drug_code, severity, description}]
    monitoringParameters: { type: mongoose.Schema.Types.Mixed },
    isControlled: { type: Boolean, default: false },
    requiresRenalAdjustment: { type: Boolean, default: false },
    requiresHepaticAdjustment: { type: Boolean, default: false },
    pregnancyCategory: { type: String, enum: ['A', 'B', 'C', 'D', 'X', null], default: null },
    isActive: { type: Boolean, default: true },
    saudiDrugCode: { type: String, maxlength: 50 }, // رمز هيئة الغذاء والدواء
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

drugLibrarySchema.index({ branchId: 1, drugClass: 1 });
drugLibrarySchema.index({ isActive: 1 });
drugLibrarySchema.index({ genericName: 'text', brandNames: 'text' });

drugLibrarySchema.pre('save', function (next) {
  if (!this.uuid) this.uuid = require('crypto').randomUUID();
  next();
});

module.exports = mongoose.model('DrugLibrary', drugLibrarySchema);
