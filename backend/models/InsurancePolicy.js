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

// ── W1106 core-linkage: emit when an insurance policy becomes active ──
insurancePolicySchema.pre('save', function flagInsurancePolicyActivated() {
  const becameActive =
    (this.isNew || this.isModified('status')) && this.status === 'active' && !this.deletedAt;
  this.$__insurancePolicyActivated = becameActive;
});

insurancePolicySchema.post('save', function emitInsurancePolicyActivated(doc) {
  if (!doc.$__insurancePolicyActivated) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    integrationBus.publish('insurance-policy', 'insurance_policy.activated', {
      policyId: String(doc._id),
      beneficiaryId: String(doc.beneficiaryId),
      ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
      policyNumber: doc.policyNumber,
      ...(doc.memberId ? { memberId: doc.memberId } : {}),
      ...(doc.planType ? { planType: doc.planType } : {}),
      startDate: doc.startDate,
      endDate: doc.endDate,
    });
  } catch (_err) {
    /* best-effort: never block the save on bus failure */
  }
});

const InsurancePolicy =
  mongoose.models.InsurancePolicy || mongoose.model('InsurancePolicy', insurancePolicySchema);

// ─── شركات التأمين السعودية المرخصة من مؤسسة النقد (SAMA) ─────────────────
const SAUDI_INSURANCE_COMPANIES = {
  TAWUNIYA: { nameAr: 'الشركة التعاونية للتأمين', nameEn: 'Tawuniya', code: 'TAWUNIYA' },
  BUPA_ARABIA: { nameAr: 'بوبا العربية للتأمين التعاوني', nameEn: 'Bupa Arabia', code: 'BUPA' },
  WALAA: { nameAr: 'ولاء للتأمين التعاوني', nameEn: 'Walaa Insurance', code: 'WALAA' },
  MALATH: { nameAr: 'ملاذ للتأمين التعاوني', nameEn: 'Malath Insurance', code: 'MALATH' },
  GULF_UNION: {
    nameAr: 'الاتحاد الخليجي للتأمين',
    nameEn: 'Gulf Union Insurance',
    code: 'GULF_UNION',
  },
  ALRAJHI_TAKAFUL: {
    nameAr: 'الراجحي للتكافل',
    nameEn: 'Al Rajhi Takaful',
    code: 'ALRAJHI_TAKAFUL',
  },
  MEDGULF: {
    nameAr: 'الشركة المتوسطة الخليجية للتأمين',
    nameEn: 'MedGulf Insurance',
    code: 'MEDGULF',
  },
  ALAHLEIA: {
    nameAr: 'الأهلية للتأمين التعاوني',
    nameEn: 'AlAhleia Insurance',
    code: 'ALAHLEIA',
  },
  BURUJ: { nameAr: 'البروج للتأمين التعاوني', nameEn: 'Buruj Insurance', code: 'BURUJ' },
  CHUBB: { nameAr: 'شركة شب للتأمين التعاوني', nameEn: 'Chubb Saudi Arabia', code: 'CHUBB' },
  ALLIANZ_SF: {
    nameAr: 'أليانز السعودية الفرنسية للتأمين',
    nameEn: 'Allianz SF Insurance',
    code: 'ALLIANZ_SF',
  },
  TRADE_UNION: {
    nameAr: 'الاتحاد التجاري للتأمين التعاوني',
    nameEn: 'Trade Union Insurance',
    code: 'TRADE_UNION',
  },
};

// ─── رموز مخالفات التأمين (نجم) ────────────────────────────────────────────
const INSURANCE_VIOLATION_CODES = [
  { code: 'V001', nameAr: 'قيادة بدون تأمين', nameEn: 'Driving without insurance', fine: 500 },
  {
    code: 'V002',
    nameAr: 'تأمين منتهي الصلاحية',
    nameEn: 'Expired insurance policy',
    fine: 500,
  },
  {
    code: 'V003',
    nameAr: 'عدم إبلاغ عن حادث',
    nameEn: 'Failure to report accident',
    fine: 1000,
  },
  {
    code: 'V004',
    nameAr: 'تقديم معلومات خاطئة',
    nameEn: 'Providing false information',
    fine: 2000,
  },
  {
    code: 'V005',
    nameAr: 'رفض دفع التعويض المستحق',
    nameEn: 'Refusing to pay due compensation',
    fine: 5000,
  },
  {
    code: 'V006',
    nameAr: 'مخالفة شروط الوثيقة',
    nameEn: 'Policy terms violation',
    fine: 1500,
  },
  { code: 'V007', nameAr: 'التأمين المزدوج', nameEn: 'Duplicate insurance', fine: 300 },
  {
    code: 'V008',
    nameAr: 'عدم تجديد الوثيقة',
    nameEn: 'Failure to renew policy',
    fine: 500,
  },
];

module.exports = InsurancePolicy;
module.exports.SAUDI_INSURANCE_COMPANIES = SAUDI_INSURANCE_COMPANIES;
module.exports.INSURANCE_VIOLATION_CODES = INSURANCE_VIOLATION_CODES;
