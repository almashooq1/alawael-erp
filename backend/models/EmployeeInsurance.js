/**
 * EmployeeInsurance Model — نموذج تأمين الموظفين الصحي
 *
 * تكامل شؤون الموظفين مع شركات التأمين السعودية المعتمدة من ساما
 *
 * ✅ ربط الموظف مع شركة التأمين الصحي
 * ✅ إدارة وثائق التأمين الصحي للموظفين والمعالين
 * ✅ فئات التغطية (VIP, A, B, C, D)
 * ✅ تتبع المطالبات الطبية
 * ✅ شبكة المستشفيات والعيادات المعتمدة
 * ✅ التجديد التلقائي والتنبيهات
 * ✅ احتساب أقساط التأمين في الرواتب
 * ✅ متوافق مع نظام مجلس الضمان الصحي التعاوني (CCHI)
 */

const mongoose = require('mongoose');

// ─── شركات التأمين الصحي السعودية المعتمدة من ساما ──────────────────────────
const SAUDI_HEALTH_INSURANCE_COMPANIES = {
  tawuniya: {
    nameAr: 'التعاونية للتأمين',
    nameEn: 'Tawuniya',
    code: 'TAW',
    logo: 'tawuniya.png',
    healthPlans: ['VIP', 'A', 'B', 'C'],
    website: 'https://www.tawuniya.com',
  },
  medgulf: {
    nameAr: 'ميدغلف للتأمين',
    nameEn: 'MedGulf',
    code: 'MED',
    logo: 'medgulf.png',
    healthPlans: ['VIP', 'A', 'B', 'C'],
    website: 'https://www.medgulf.com.sa',
  },
  bupa: {
    nameAr: 'بوبا العربية',
    nameEn: 'Bupa Arabia',
    code: 'BUP',
    logo: 'bupa.png',
    healthPlans: ['Gold', 'Silver', 'Bronze', 'Essential'],
    website: 'https://www.bupa.com.sa',
  },
  alrajhi: {
    nameAr: 'تكافل الراجحي',
    nameEn: 'Al Rajhi Takaful',
    code: 'RAJ',
    logo: 'alrajhi.png',
    healthPlans: ['VIP', 'A', 'B', 'C'],
    website: 'https://www.alrajhitakaful.com.sa',
  },
  saic: {
    nameAr: 'الاتحاد التجاري للتأمين',
    nameEn: 'SAIC',
    code: 'SAI',
    logo: 'saic.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.saic.com.sa',
  },
  sagr: {
    nameAr: 'الصقر للتأمين',
    nameEn: 'Al Sagr',
    code: 'SAG',
    logo: 'sagr.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.alsagr.com',
  },
  wataniya: {
    nameAr: 'الوطنية للتأمين',
    nameEn: 'Wataniya',
    code: 'WAT',
    logo: 'wataniya.png',
    healthPlans: ['VIP', 'A', 'B', 'C'],
    website: 'https://www.wataniya.com.sa',
  },
  walaa: {
    nameAr: 'ولاء للتأمين',
    nameEn: 'Walaa',
    code: 'WAL',
    logo: 'walaa.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.walaa.com',
  },
  malath: {
    nameAr: 'ملاذ للتأمين',
    nameEn: 'Malath',
    code: 'MAL',
    logo: 'malath.png',
    healthPlans: ['VIP', 'A', 'B', 'C'],
    website: 'https://www.malath.com.sa',
  },
  alinma: {
    nameAr: 'الإنماء طوكيو مارين',
    nameEn: 'Alinma Tokio Marine',
    code: 'ATM',
    logo: 'alinma.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.alinmatokio.com',
  },
  gulf_union: {
    nameAr: 'اتحاد الخليج للتأمين',
    nameEn: 'Gulf Union',
    code: 'GUL',
    logo: 'gulfunion.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.gulfunion.com.sa',
  },
  ahlia: {
    nameAr: 'الأهلية للتأمين',
    nameEn: 'Al Ahlia',
    code: 'AHL',
    logo: 'ahlia.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.alahlia.com.sa',
  },
  salama: {
    nameAr: 'سلامة للتأمين',
    nameEn: 'Salama',
    code: 'SLM',
    logo: 'salama.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.salama.com.sa',
  },
  arabia: {
    nameAr: 'العربية للتأمين',
    nameEn: 'Arabia Insurance',
    code: 'ARA',
    logo: 'arabia.png',
    healthPlans: ['A', 'B', 'C'],
    website: 'https://www.arabia-ins.com',
  },
};

// ─── فئات التغطية الصحية (CCHI) ───────────────────────────────────────────
const COVERAGE_CLASSES = {
  VIP: {
    nameAr: 'فئة كبار الشخصيات',
    nameEn: 'VIP',
    maxCoverage: 500000,
    roomType: 'جناح خاص',
    dentalCoverage: true,
    opticalCoverage: true,
    maternityCoverage: true,
    internationalCoverage: true,
    chronicDiseases: true,
    preExistingConditions: true,
  },
  A: {
    nameAr: 'الفئة أ',
    nameEn: 'Class A',
    maxCoverage: 500000,
    roomType: 'غرفة خاصة',
    dentalCoverage: true,
    opticalCoverage: true,
    maternityCoverage: true,
    internationalCoverage: false,
    chronicDiseases: true,
    preExistingConditions: true,
  },
  B: {
    nameAr: 'الفئة ب',
    nameEn: 'Class B',
    maxCoverage: 250000,
    roomType: 'غرفة مشتركة',
    dentalCoverage: true,
    opticalCoverage: true,
    maternityCoverage: true,
    internationalCoverage: false,
    chronicDiseases: true,
    preExistingConditions: false,
  },
  C: {
    nameAr: 'الفئة ج',
    nameEn: 'Class C',
    maxCoverage: 250000,
    roomType: 'غرفة مشتركة',
    dentalCoverage: false,
    opticalCoverage: false,
    maternityCoverage: true,
    internationalCoverage: false,
    chronicDiseases: true,
    preExistingConditions: false,
  },
  D: {
    nameAr: 'الفئة د (الحد الأدنى)',
    nameEn: 'Class D (Minimum)',
    maxCoverage: 150000,
    roomType: 'غرفة مشتركة',
    dentalCoverage: false,
    opticalCoverage: false,
    maternityCoverage: false,
    internationalCoverage: false,
    chronicDiseases: false,
    preExistingConditions: false,
  },
};

// ─── مخطط المعال (التابع) ────────────────────────────────────────────────────
const DependentSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'اسم التابع مطلوب'] },
  nameEn: String,
  nationalId: { type: String, required: [true, 'رقم الهوية مطلوب'] },
  dateOfBirth: { type: Date, required: [true, 'تاريخ الميلاد مطلوب'] },
  gender: {
    type: String,
    enum: ['male', 'female'],
    required: true,
  },
  relationship: {
    type: String,
    enum: ['spouse', 'son', 'daughter', 'father', 'mother', 'other'],
    required: [true, 'صلة القرابة مطلوبة'],
  },
  relationshipAr: String,
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed'],
  },
  memberNumber: String, // رقم العضوية لدى شركة التأمين
  cardNumber: String, // رقم بطاقة التأمين
  coverageClass: {
    type: String,
    enum: ['VIP', 'A', 'B', 'C', 'D'],
    default: 'C',
  },
  premium: { type: Number, default: 0 }, // قسط التابع
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled', 'pending'],
    default: 'pending',
  },
  addedDate: { type: Date, default: Date.now },
  removedDate: Date,
  removalReason: String,
  medicalDeclaration: {
    hasChronicDisease: { type: Boolean, default: false },
    diseases: [String],
    medications: [String],
    lastCheckupDate: Date,
  },
});

// ─── مخطط المطالبة الطبية ────────────────────────────────────────────────────
const MedicalClaimSchema = new mongoose.Schema({
  claimNumber: { type: String, required: true },
  claimant: {
    type: String,
    enum: ['employee', 'dependent'],
    required: true,
  },
  dependentId: { type: mongoose.Schema.Types.ObjectId },
  dependentName: String,
  claimType: {
    type: String,
    enum: [
      'outpatient',
      'inpatient',
      'dental',
      'optical',
      'maternity',
      'emergency',
      'pharmacy',
      'lab_radiology',
      'physiotherapy',
      'psychiatric',
      'chronic_disease',
    ],
    required: true,
  },
  claimTypeAr: String,
  provider: {
    name: String,
    type: {
      type: String,
      enum: ['hospital', 'clinic', 'pharmacy', 'lab', 'optical_center', 'dental_clinic'],
    },
    city: String,
    networkStatus: { type: String, enum: ['in_network', 'out_network'] },
  },
  diagnosis: {
    icdCode: String, // رمز التشخيص الدولي
    description: String,
    descriptionAr: String,
  },
  treatment: {
    description: String,
    procedures: [String],
    medications: [{ name: String, quantity: Number, unitPrice: Number }],
  },
  amounts: {
    claimed: { type: Number, required: true },
    approved: Number,
    paid: Number,
    deductible: Number,
    coPayment: Number, // نسبة التحمل
    outOfPocket: Number, // المبلغ المدفوع من الموظف
  },
  status: {
    type: String,
    enum: [
      'submitted',
      'under_review',
      'approved',
      'partially_approved',
      'rejected',
      'paid',
      'appealed',
    ],
    default: 'submitted',
  },
  statusAr: String,
  submittedDate: { type: Date, default: Date.now },
  reviewedDate: Date,
  paidDate: Date,
  rejectionReason: String,
  appealDetails: String,
  documents: [
    {
      name: String,
      url: String,
      type: {
        type: String,
        enum: ['prescription', 'receipt', 'medical_report', 'lab_result', 'referral', 'other'],
      },
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  approvalCode: String, // رقم الموافقة المسبقة
  notes: String,
});

// ─── مخطط وثيقة تأمين الموظف الصحي ──────────────────────────────────────────
const EmployeeInsuranceSchema = new mongoose.Schema(
  {
    // ── ربط الموظف ──────────────────────────────────────────
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'معرف الموظف مطلوب'],
      index: true,
    },
    employeeId: { type: String, required: true, index: true }, // رقم الموظف EMP-XXX
    employeeName: String,
    employeeNameEn: String,
    department: String,
    position: String,
    nationalId: { type: String, required: [true, 'رقم الهوية مطلوب'], index: true },

    // ── بيانات شركة التأمين ──────────────────────────────────
    insuranceCompany: {
      type: String,
      enum: Object.keys(SAUDI_HEALTH_INSURANCE_COMPANIES),
      required: [true, 'شركة التأمين مطلوبة'],
      index: true,
    },
    insuranceCompanyNameAr: String,
    insuranceCompanyNameEn: String,

    // ── بيانات الوثيقة ──────────────────────────────────────
    policyNumber: { type: String, required: [true, 'رقم الوثيقة مطلوب'], unique: true },
    groupPolicyNumber: String, // رقم الوثيقة الجماعية
    memberNumber: { type: String, index: true }, // رقم العضوية
    cardNumber: String, // رقم بطاقة التأمين
    cchiNumber: String, // رقم مجلس الضمان الصحي

    // ── فترة التغطية ─────────────────────────────────────────
    startDate: { type: Date, required: [true, 'تاريخ البداية مطلوب'] },
    endDate: { type: Date, required: [true, 'تاريخ الانتهاء مطلوب'] },
    effectiveDate: Date, // تاريخ سريان التغطية الفعلي

    // ── فئة التغطية ──────────────────────────────────────────
    coverageClass: {
      type: String,
      enum: ['VIP', 'A', 'B', 'C', 'D'],
      required: [true, 'فئة التغطية مطلوبة'],
      default: 'B',
    },
    maxCoverageAmount: Number, // الحد الأقصى للتغطية
    usedAmount: { type: Number, default: 0 }, // المبلغ المستخدم

    // ── التغطية التفصيلية ────────────────────────────────────
    coverageDetails: {
      inpatient: { covered: { type: Boolean, default: true }, limit: Number, coPayPercent: Number },
      outpatient: {
        covered: { type: Boolean, default: true },
        limit: Number,
        coPayPercent: Number,
      },
      dental: { covered: { type: Boolean, default: false }, limit: Number, coPayPercent: Number },
      optical: { covered: { type: Boolean, default: false }, limit: Number, coPayPercent: Number },
      maternity: {
        covered: { type: Boolean, default: true },
        limit: Number,
        waitingPeriod: Number,
      },
      emergency: { covered: { type: Boolean, default: true }, limit: Number },
      pharmacy: { covered: { type: Boolean, default: true }, limit: Number, coPayPercent: Number },
      labRadiology: { covered: { type: Boolean, default: true }, limit: Number },
      physiotherapy: { covered: { type: Boolean, default: false }, sessionsPerYear: Number },
      psychiatric: { covered: { type: Boolean, default: false }, sessionsPerYear: Number },
      chronicDiseases: { covered: { type: Boolean, default: true } },
      preExistingConditions: { covered: { type: Boolean, default: false }, waitingPeriod: Number },
    },

    // ── الأقساط والتكاليف ────────────────────────────────────
    premium: {
      employeePremium: { type: Number, default: 0 }, // قسط الموظف
      dependentsPremium: { type: Number, default: 0 }, // أقساط المعالين
      totalAnnualPremium: { type: Number, default: 0 }, // إجمالي القسط السنوي
      monthlyDeduction: { type: Number, default: 0 }, // الخصم الشهري من الراتب
      employerShare: { type: Number, default: 0 }, // حصة صاحب العمل
      employeeShare: { type: Number, default: 0 }, // حصة الموظف
      employerSharePercent: { type: Number, default: 100, min: 0, max: 100 },
      vatAmount: { type: Number, default: 0 }, // ضريبة القيمة المضافة
      paidToDate: { type: Number, default: 0 }, // المبلغ المدفوع حتى تاريخه
      paymentFrequency: {
        type: String,
        enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
        default: 'monthly',
      },
    },

    // ── المعالون (التابعون) ───────────────────────────────────
    dependents: [DependentSchema],

    // ── المطالبات الطبية ──────────────────────────────────────
    claims: [MedicalClaimSchema],

    // ── الحالة ───────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended', 'expired', 'cancelled', 'renewal_pending'],
      default: 'pending',
      index: true,
    },
    statusAr: String,

    // ── التجديد ──────────────────────────────────────────────
    renewal: {
      autoRenew: { type: Boolean, default: true },
      renewalDate: Date,
      renewalStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'completed'] },
      renewalHistory: [
        {
          fromDate: Date,
          toDate: Date,
          premium: Number,
          renewedAt: Date,
          renewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        },
      ],
      remindersSent: { type: Number, default: 0 },
      lastReminderDate: Date,
    },

    // ── شبكة مقدمي الخدمة ────────────────────────────────────
    networkProviders: [
      {
        name: String,
        nameEn: String,
        type: {
          type: String,
          enum: ['hospital', 'clinic', 'pharmacy', 'lab', 'optical_center', 'dental_clinic'],
        },
        city: String,
        phone: String,
        address: String,
        approvedServices: [String],
      },
    ],

    // ── سجل النشاطات ─────────────────────────────────────────
    activityLog: [
      {
        action: String,
        actionAr: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByName: String,
        timestamp: { type: Date, default: Date.now },
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // ── ملاحظات ──────────────────────────────────────────────
    notes: String,
    internalNotes: String,

    // ── بيانات إدارية ─────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────
EmployeeInsuranceSchema.index({ employee: 1, status: 1 });
EmployeeInsuranceSchema.index({ insuranceCompany: 1, status: 1 });
EmployeeInsuranceSchema.index({ endDate: 1, status: 1 }); // for expiring policies
EmployeeInsuranceSchema.index({ department: 1, insuranceCompany: 1 });
EmployeeInsuranceSchema.index({ 'claims.status': 1 });

// ─── Virtuals ────────────────────────────────────────────────────────────────
EmployeeInsuranceSchema.virtual('isActive').get(function () {
  return this.status === 'active' && this.endDate > new Date();
});

EmployeeInsuranceSchema.virtual('isExpiring').get(function () {
  if (this.status !== 'active') return false;
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return this.endDate - Date.now() <= thirtyDays;
});

EmployeeInsuranceSchema.virtual('daysUntilExpiry').get(function () {
  return Math.ceil((this.endDate - Date.now()) / (24 * 60 * 60 * 1000));
});

EmployeeInsuranceSchema.virtual('coverageUsagePercent').get(function () {
  if (!this.maxCoverageAmount) return 0;
  return Math.round((this.usedAmount / this.maxCoverageAmount) * 100);
});

EmployeeInsuranceSchema.virtual('totalDependents').get(function () {
  return this.dependents ? this.dependents.filter(d => d.status === 'active').length : 0;
});

EmployeeInsuranceSchema.virtual('totalMembers').get(function () {
  return 1 + this.totalDependents; // الموظف + المعالون
});

EmployeeInsuranceSchema.virtual('companyInfo').get(function () {
  return SAUDI_HEALTH_INSURANCE_COMPANIES[this.insuranceCompany] || null;
});

EmployeeInsuranceSchema.virtual('coverageClassInfo').get(function () {
  return COVERAGE_CLASSES[this.coverageClass] || null;
});

// ─── Pre-save ────────────────────────────────────────────────────────────────
EmployeeInsuranceSchema.pre('save', async function () {
  // Auto-fill Arabic names
  const company = SAUDI_HEALTH_INSURANCE_COMPANIES[this.insuranceCompany];
  if (company) {
    this.insuranceCompanyNameAr = company.nameAr;
    this.insuranceCompanyNameEn = company.nameEn;
  }

  // Auto-fill status Arabic
  const statusMap = {
    active: 'نشط',
    pending: 'قيد الانتظار',
    suspended: 'معلق',
    expired: 'منتهي',
    cancelled: 'ملغي',
    renewal_pending: 'بانتظار التجديد',
  };
  this.statusAr = statusMap[this.status] || this.status;

  // Auto-fill relationship Arabic for dependents
  const relMap = {
    spouse: 'زوج/زوجة',
    son: 'ابن',
    daughter: 'ابنة',
    father: 'أب',
    mother: 'أم',
    other: 'آخر',
  };
  if (this.dependents) {
    this.dependents.forEach(dep => {
      dep.relationshipAr = relMap[dep.relationship] || dep.relationship;
    });
  }

  // Auto-fill claim type Arabic
  const claimTypeMap = {
    outpatient: 'عيادة خارجية',
    inpatient: 'تنويم',
    dental: 'أسنان',
    optical: 'نظارات',
    maternity: 'ولادة',
    emergency: 'طوارئ',
    pharmacy: 'صيدلية',
    lab_radiology: 'مختبر وأشعة',
    physiotherapy: 'علاج طبيعي',
    psychiatric: 'نفسي',
    chronic_disease: 'أمراض مزمنة',
  };
  const claimStatusMap = {
    submitted: 'مقدمة',
    under_review: 'قيد المراجعة',
    approved: 'مقبولة',
    partially_approved: 'مقبولة جزئياً',
    rejected: 'مرفوضة',
    paid: 'مدفوعة',
    appealed: 'مستأنفة',
  };
  if (this.claims) {
    this.claims.forEach(claim => {
      claim.claimTypeAr = claimTypeMap[claim.claimType] || claim.claimType;
      claim.statusAr = claimStatusMap[claim.status] || claim.status;
    });
  }

  // Auto-set max coverage from class
  if (this.coverageClass && COVERAGE_CLASSES[this.coverageClass]) {
    this.maxCoverageAmount =
      this.maxCoverageAmount || COVERAGE_CLASSES[this.coverageClass].maxCoverage;
  }

  // Calculate totals
  if (this.premium) {
    const depPrem = this.dependents ? this.dependents.reduce((s, d) => s + (d.premium || 0), 0) : 0;
    this.premium.dependentsPremium = depPrem;
    this.premium.totalAnnualPremium = (this.premium.employeePremium || 0) + depPrem;
    this.premium.vatAmount = this.premium.totalAnnualPremium * 0.15; // VAT 15%
    this.premium.employerShare =
      this.premium.totalAnnualPremium * (this.premium.employerSharePercent / 100);
    this.premium.employeeShare = this.premium.totalAnnualPremium - this.premium.employerShare;
    this.premium.monthlyDeduction = this.premium.employeeShare / 12;
  }
});

// ─── Statics ─────────────────────────────────────────────────────────────────
EmployeeInsuranceSchema.statics.getInsuranceStats = async function () {
  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [
    totalPolicies,
    activePolicies,
    pendingPolicies,
    expiredPolicies,
    expiringPolicies,
    byCompany,
    byClass,
    byDepartment,
    financials,
    claimStats,
  ] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({ status: 'active' }),
    this.countDocuments({ status: 'pending' }),
    this.countDocuments({ status: 'expired' }),
    this.countDocuments({ status: 'active', endDate: { $lte: thirtyDays, $gt: now } }),
    this.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$insuranceCompany',
          count: { $sum: 1 },
          totalPremium: { $sum: '$premium.totalAnnualPremium' },
        },
      },
      { $sort: { count: -1 } },
    ]),
    this.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$coverageClass', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    this.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          totalPremium: { $sum: '$premium.totalAnnualPremium' },
        },
      },
      { $sort: { count: -1 } },
    ]),
    this.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalAnnualPremium: { $sum: '$premium.totalAnnualPremium' },
          totalEmployerShare: { $sum: '$premium.employerShare' },
          totalEmployeeShare: { $sum: '$premium.employeeShare' },
          totalVAT: { $sum: '$premium.vatAmount' },
          avgPremium: { $avg: '$premium.totalAnnualPremium' },
          totalDependents: { $sum: { $size: { $ifNull: ['$dependents', []] } } },
          totalMembers: {
            $sum: {
              $add: [1, { $size: { $ifNull: ['$dependents', []] } }],
            },
          },
        },
      },
    ]),
    this.aggregate([
      { $unwind: '$claims' },
      {
        $group: {
          _id: '$claims.status',
          count: { $sum: 1 },
          totalClaimed: { $sum: '$claims.amounts.claimed' },
          totalApproved: { $sum: { $ifNull: ['$claims.amounts.approved', 0] } },
          totalPaid: { $sum: { $ifNull: ['$claims.amounts.paid', 0] } },
        },
      },
    ]),
  ]);

  const fin = financials[0] || {};

  return {
    totalPolicies,
    activePolicies,
    pendingPolicies,
    expiredPolicies,
    expiringPolicies,
    byCompany: byCompany.map(c => ({
      company: c._id,
      companyInfo: SAUDI_HEALTH_INSURANCE_COMPANIES[c._id],
      count: c.count,
      totalPremium: c.totalPremium,
    })),
    byClass,
    byDepartment,
    financials: {
      totalAnnualPremium: fin.totalAnnualPremium || 0,
      totalEmployerShare: fin.totalEmployerShare || 0,
      totalEmployeeShare: fin.totalEmployeeShare || 0,
      totalVAT: fin.totalVAT || 0,
      avgPremium: Math.round(fin.avgPremium || 0),
      totalDependents: fin.totalDependents || 0,
      totalMembers: fin.totalMembers || 0,
    },
    claimStats,
  };
};

EmployeeInsuranceSchema.statics.getExpiringPolicies = async function (days = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    endDate: { $lte: futureDate, $gt: now },
  })
    .populate('employee', 'firstName lastName employeeId department position')
    .sort({ endDate: 1 });
};

const EmployeeInsurance =
  mongoose.models.EmployeeInsurance || mongoose.model('EmployeeInsurance', EmployeeInsuranceSchema);

module.exports = {
  EmployeeInsurance,
  SAUDI_HEALTH_INSURANCE_COMPANIES,
  COVERAGE_CLASSES,
};
