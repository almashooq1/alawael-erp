/**
 * InsurancePolicy Model — System 40: Smart Insurance
 * وثائق التأمين الصحي للمستفيدين
 */
const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    policyNumber: { type: String, required: true },
    policyUuid: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    insuranceCompanyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InsuranceCompany',
      required: true,
    },

    // بيانات العضوية
    memberId: { type: String, required: true }, // رقم العضو
    cardNumber: { type: String },
    groupNumber: { type: String },

    // بيانات الخطة
    planName: { type: String },
    planType: {
      type: String,
      enum: ['basic', 'enhanced', 'premium', 'vip'],
      default: 'basic',
    },

    // تواريخ الوثيقة
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'expired', 'suspended', 'cancelled', 'pending'],
      default: 'active',
    },

    // التغطية
    coverageLimit: { type: Number, default: null }, // null = غير محدود
    usedCoverage: { type: Number, default: 0 },
    deductibleAmount: { type: Number, default: 0 }, // مبلغ الخصم
    copayPercentage: { type: Number, default: 0 }, // نسبة المشاركة
    copayMaxAmount: { type: Number, default: null },

    // NPHIES
    nphiesPolicyId: { type: String },

    // الخدمات
    coveredServices: [{ type: String }],
    excludedServices: [{ type: String }],
    requiresPriorAuth: { type: Boolean, default: false },

    // المستند
    documentPath: { type: String },
    lastVerifiedAt: { type: Date },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'insurance_policies',
  }
);

insurancePolicySchema.index({ branchId: 1, status: 1 });
insurancePolicySchema.index({ beneficiaryId: 1, status: 1 });
insurancePolicySchema.index({ insuranceCompanyId: 1, status: 1 });
insurancePolicySchema.index({ endDate: 1 }); // للتنبيهات
insurancePolicySchema.index({ nphiesPolicyId: 1 });
insurancePolicySchema.index({ deletedAt: 1 });

// Virtual: التغطية المتبقية
insurancePolicySchema.virtual('remainingCoverage').get(function () {
  if (!this.coverageLimit) return null;
  return this.coverageLimit - this.usedCoverage;
});

// Virtual: هل انتهت صلاحيتها؟
insurancePolicySchema.virtual('isExpired').get(function () {
  return this.endDate < new Date();
});

// Virtual: أيام حتى الانتهاء
insurancePolicySchema.virtual('daysUntilExpiry').get(function () {
  const diff = this.endDate - new Date();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
});

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
