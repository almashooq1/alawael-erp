/**
 * InsuranceCompany Model — System 40: Smart Insurance
 * شركات التأمين الصحي
 */
const mongoose = require('mongoose');

const insuranceCompanySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    uuid: { type: String, unique: true, required: true },

    name: { type: String, required: true },
    nameAr: { type: String, required: true },
    code: { type: String, unique: true, required: true, uppercase: true },

    // CCHI / NPHIES
    cchiCode: { type: String }, // رمز هيئة التأمين الصحي التعاوني
    nphiesId: { type: String }, // معرف منظومة تبادل المعلومات الصحية

    // معلومات الاتصال
    licenseNumber: { type: String },
    phone: { type: String },
    email: { type: String },
    address: { type: String },

    // API الخاص بالشركة
    apiEndpoint: { type: String },
    apiCredentials: { type: mongoose.Schema.Types.Mixed, select: false }, // بيانات اعتماد API (مخفية)

    // الميزات المدعومة
    supportsNphies: { type: Boolean, default: false },
    supportsRealtimeEligibility: { type: Boolean, default: false },
    supportsElectronicClaims: { type: Boolean, default: false },
    supportsPriorAuth: { type: Boolean, default: false },

    isActive: { type: Boolean, default: true },
    notes: { type: String },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'insurance_companies',
  }
);

insuranceCompanySchema.index({ branchId: 1, isActive: 1 });
insuranceCompanySchema.index({ cchiCode: 1 });
insuranceCompanySchema.index({ nphiesId: 1 });
insuranceCompanySchema.index({ deletedAt: 1 });

module.exports =
  mongoose.models.InsuranceCompany || mongoose.model('InsuranceCompany', insuranceCompanySchema);
