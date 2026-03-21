/**
 * InsurancePolicy Model — نموذج وثيقة التأمين السعودية
 *
 * ✅ شركات التأمين السعودية المعتمدة (SAMA)
 * ✅ أنواع الوثائق (طرف ثالث، شامل، بريميوم)
 * ✅ المطالبات والتعويضات
 * ✅ تجديد تلقائي وتتبع الانتهاء
 * ✅ ربط مع المركبات والسائقين
 */

const mongoose = require('mongoose');

// ─── شركات التأمين السعودية المعتمدة من ساما ────────────────────────────────
const SAUDI_INSURANCE_COMPANIES = {
  tawuniya: { nameAr: 'التعاونية للتأمين', nameEn: 'Tawuniya', code: 'TAW', logo: 'tawuniya.png' },
  medgulf: { nameAr: 'ميدغلف للتأمين', nameEn: 'MedGulf', code: 'MED', logo: 'medgulf.png' },
  bupa: { nameAr: 'بوبا العربية', nameEn: 'Bupa Arabia', code: 'BUP', logo: 'bupa.png' },
  alrajhi: {
    nameAr: 'تكافل الراجحي',
    nameEn: 'Al Rajhi Takaful',
    code: 'RAJ',
    logo: 'alrajhi.png',
  },
  saic: { nameAr: 'الاتحاد التجاري للتأمين', nameEn: 'SAIC', code: 'SAI', logo: 'saic.png' },
  sagr: { nameAr: 'الصقر للتأمين', nameEn: 'Al Sagr', code: 'SAG', logo: 'sagr.png' },
  arabia: {
    nameAr: 'العربية للتأمين',
    nameEn: 'Arabia Insurance',
    code: 'ARA',
    logo: 'arabia.png',
  },
  wataniya: { nameAr: 'الوطنية للتأمين', nameEn: 'Wataniya', code: 'WAT', logo: 'wataniya.png' },
  walaa: { nameAr: 'ولاء للتأمين', nameEn: 'Walaa', code: 'WAL', logo: 'walaa.png' },
  malath: { nameAr: 'ملاذ للتأمين', nameEn: 'Malath', code: 'MAL', logo: 'malath.png' },
  alinma: {
    nameAr: 'الإنماء طوكيو مارين',
    nameEn: 'Alinma Tokio Marine',
    code: 'ATM',
    logo: 'alinma.png',
  },
  gulf_union: {
    nameAr: 'اتحاد الخليج للتأمين',
    nameEn: 'Gulf Union',
    code: 'GUL',
    logo: 'gulfunion.png',
  },
  ahlia: { nameAr: 'الأهلية للتأمين', nameEn: 'Al Ahlia', code: 'AHL', logo: 'ahlia.png' },
  salama: { nameAr: 'سلامة للتأمين', nameEn: 'Salama', code: 'SLM', logo: 'salama.png' },
};

// ─── المخالفات المتعلقة بالتأمين (نظام ساهر / المرور) ──────────────────────
const INSURANCE_VIOLATION_CODES = {
  NO_INSURANCE: { code: 102, descriptionAr: 'قيادة مركبة بدون تأمين ساري', fine: 500 },
  NO_CARD: { code: 103, descriptionAr: 'عدم حمل بطاقة التأمين', fine: 200 },
  EXPIRED: { code: 104, descriptionAr: 'التأمين منتهي الصلاحية', fine: 500 },
  INVALID_POLICY: { code: 105, descriptionAr: 'وثيقة تأمين غير صالحة', fine: 300 },
};

// ─── مخطط المطالبة ──────────────────────────────────────────────────────────
const ClaimSchema = new mongoose.Schema(
  {
    claimNumber: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'accident',
        'theft',
        'natural_disaster',
        'fire',
        'vandalism',
        'glass',
        'tow',
        'third_party_liability',
        'bodily_injury',
        'total_loss',
      ],
      required: true,
    },
    typeAr: String,
    status: {
      type: String,
      enum: ['submitted', 'under_review', 'approved', 'rejected', 'paid', 'appealed', 'closed'],
      default: 'submitted',
    },
    statusAr: String,
    description: String,
    incidentDate: { type: Date, required: true },
    reportDate: { type: Date, default: Date.now },
    location: {
      city: String,
      district: String,
      coordinates: { lat: Number, lng: Number },
    },
    estimatedDamage: Number,
    approvedAmount: Number,
    paidAmount: Number,
    deductible: Number,
    policeReportNumber: String,
    najmReportNumber: String, // رقم تقرير نجم
    documents: [
      {
        name: String,
        type: {
          type: String,
          enum: [
            'police_report',
            'najm_report',
            'photos',
            'repair_estimate',
            'medical_report',
            'driver_license',
            'registration',
            'other',
          ],
        },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    thirdParty: {
      name: String,
      phone: String,
      plateNumber: String,
      insuranceCompany: String,
      policyNumber: String,
    },
    repairShop: {
      name: String,
      address: String,
      phone: String,
      estimateCost: Number,
      approvedCost: Number,
    },
    timeline: [
      {
        action: String,
        date: { type: Date, default: Date.now },
        notes: String,
        performedBy: String,
      },
    ],
    rejectionReason: String,
    reviewNotes: String,
  },
  { _id: true, timestamps: true }
);

// ─── مخطط الوثيقة الرئيسي ───────────────────────────────────────────────────
const InsurancePolicySchema = new mongoose.Schema(
  {
    // معلومات الوثيقة
    policyNumber: { type: String, required: true, unique: true },
    companyKey: {
      type: String,
      enum: Object.keys(SAUDI_INSURANCE_COMPANIES),
      required: true,
    },
    companyNameAr: String,
    companyNameEn: String,
    companyCode: String,

    // نوع التأمين
    policyType: {
      type: String,
      enum: ['third_party', 'comprehensive', 'premium'],
      required: true,
    },
    policyTypeAr: String,

    // الفترة
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    issueDate: { type: Date, default: Date.now },

    // المبالغ
    premium: { type: Number, required: true }, // قسط التأمين السنوي
    coverage: { type: Number, required: true }, // مبلغ التغطية
    deductible: { type: Number, default: 0 }, // مبلغ التحمل
    discount: { type: Number, default: 0 }, // خصم عدم المطالبة NCD
    vatAmount: { type: Number, default: 0 }, // ضريبة القيمة المضافة
    totalPremium: Number, // الإجمالي شامل الضريبة

    // حالة الوثيقة
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'suspended', 'pending_renewal'],
      default: 'active',
      index: true,
    },
    statusAr: String,

    // ربط المركبة
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    vehiclePlateNumber: String,
    vehicleMake: String,
    vehicleModel: String,
    vehicleYear: Number,
    vehicleVIN: String,

    // ربط السائق / المالك
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ownerName: String,
    ownerNationalId: String,
    ownerPhone: String,
    ownerEmail: String,

    // السائقين المشمولين
    coveredDrivers: [
      {
        name: String,
        nationalId: String,
        dateOfBirth: Date,
        licenseNumber: String,
        relation: { type: String, enum: ['owner', 'employee', 'family', 'authorized'] },
      },
    ],

    // التغطيات الإضافية
    additionalCoverage: {
      personalAccident: { type: Boolean, default: false },
      naturalDisaster: { type: Boolean, default: false },
      gccExtension: { type: Boolean, default: false }, // تمديد دول الخليج
      agency: { type: Boolean, default: false }, // إصلاح الوكالة
      roadAssistance: { type: Boolean, default: false }, // مساعدة الطريق
      replacementCar: { type: Boolean, default: false }, // سيارة بديلة
      windshieldProtection: { type: Boolean, default: false }, // حماية الزجاج
    },

    // خصم عدم المطالبة (NCD)
    ncd: {
      years: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      verified: { type: Boolean, default: false },
      verificationDate: Date,
    },

    // المطالبات
    claims: [ClaimSchema],

    // تجديد
    renewal: {
      autoRenew: { type: Boolean, default: false },
      reminderSent: { type: Boolean, default: false },
      reminderDate: Date,
      previousPolicyNumber: String,
      renewalQuoteAmount: Number,
      renewalStatus: {
        type: String,
        enum: ['not_due', 'reminder_sent', 'quote_received', 'renewed', 'lapsed'],
      },
    },

    // بيانات إضافية
    notes: String,
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // تتبع
    tenantId: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Virtuals ────────────────────────────────────────────────────────────────
InsurancePolicySchema.virtual('isActive').get(function () {
  return this.status === 'active' && new Date(this.endDate) > new Date();
});

InsurancePolicySchema.virtual('daysRemaining').get(function () {
  return Math.ceil((new Date(this.endDate) - new Date()) / (1000 * 60 * 60 * 24));
});

InsurancePolicySchema.virtual('isExpiringSoon').get(function () {
  const days = this.daysRemaining;
  return days > 0 && days <= 30;
});

InsurancePolicySchema.virtual('totalClaims').get(function () {
  return this.claims?.length || 0;
});

InsurancePolicySchema.virtual('totalClaimAmount').get(function () {
  return this.claims?.reduce((sum, c) => sum + (c.paidAmount || 0), 0) || 0;
});

InsurancePolicySchema.virtual('alertLevel').get(function () {
  const days = this.daysRemaining;
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 15) return 'high';
  if (days <= 30) return 'medium';
  return 'normal';
});

// ─── Pre-save ────────────────────────────────────────────────────────────────
InsurancePolicySchema.pre('save', async function () {
  // حساب الأسماء العربية تلقائياً
  if (this.companyKey) {
    const company = SAUDI_INSURANCE_COMPANIES[this.companyKey];
    if (company) {
      this.companyNameAr = company.nameAr;
      this.companyNameEn = company.nameEn;
      this.companyCode = company.code;
    }
  }

  // حساب نوع الوثيقة بالعربي
  const typeMap = {
    third_party: 'تأمين ضد الغير (طرف ثالث)',
    comprehensive: 'تأمين شامل',
    premium: 'تأمين بريميوم',
  };
  this.policyTypeAr = typeMap[this.policyType] || this.policyType;

  // حساب الحالة بالعربي
  const statusMap = {
    active: 'ساري',
    expired: 'منتهي',
    cancelled: 'ملغي',
    suspended: 'معلق',
    pending_renewal: 'بانتظار التجديد',
  };
  this.statusAr = statusMap[this.status] || this.status;

  // حساب إجمالي القسط شامل الضريبة (15% VAT)
  if (this.premium) {
    this.vatAmount = this.premium * 0.15;
    this.totalPremium = this.premium + this.vatAmount - (this.discount || 0);
  }

  // تحديث حالة الوثيقة تلقائياً
  if (this.endDate && new Date(this.endDate) < new Date() && this.status === 'active') {
    this.status = 'expired';
    this.statusAr = 'منتهي';
  }
});

// ─── Indexes ─────────────────────────────────────────────────────────────────
InsurancePolicySchema.index({ vehicle: 1, status: 1 });
InsurancePolicySchema.index({ companyKey: 1 });
InsurancePolicySchema.index({ ownerNationalId: 1 });
InsurancePolicySchema.index({ 'claims.claimNumber': 1 });
InsurancePolicySchema.index({ tenantId: 1 });

// ─── Statics ─────────────────────────────────────────────────────────────────
InsurancePolicySchema.statics.getExpiringPolicies = function (days = 30, tenantId = null) {
  const query = {
    status: 'active',
    endDate: { $lte: new Date(Date.now() + days * 24 * 60 * 60 * 1000), $gte: new Date() },
  };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query).sort({ endDate: 1 });
};

InsurancePolicySchema.statics.getExpiredPolicies = function (tenantId = null) {
  const query = { status: { $in: ['active', 'expired'] }, endDate: { $lt: new Date() } };
  if (tenantId) query.tenantId = tenantId;
  return this.find(query).sort({ endDate: -1 });
};

InsurancePolicySchema.statics.getActiveByVehicle = function (vehicleId) {
  return this.findOne({ vehicle: vehicleId, status: 'active', endDate: { $gt: new Date() } }).sort({
    endDate: -1,
  });
};

// ─── Export ──────────────────────────────────────────────────────────────────
const InsurancePolicy = mongoose.model('InsurancePolicy', InsurancePolicySchema);

module.exports = InsurancePolicy;
module.exports.SAUDI_INSURANCE_COMPANIES = SAUDI_INSURANCE_COMPANIES;
module.exports.INSURANCE_VIOLATION_CODES = INSURANCE_VIOLATION_CODES;
