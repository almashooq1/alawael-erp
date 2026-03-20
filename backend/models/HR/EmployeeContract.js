/**
 * Employee Contract Model — إدارة العقود
 * Full contract lifecycle: creation, renewal, amendment, termination
 * Compliant with Saudi Labor Law & Qiwa platform
 */
const mongoose = require('mongoose');

const AmendmentSchema = new mongoose.Schema(
  {
    amendmentNumber: { type: String, required: true },
    type: {
      type: String,
      enum: [
        'تعديل الراتب',
        'تعديل المسمى',
        'تعديل المهام',
        'تعديل الموقع',
        'تعديل ساعات العمل',
        'تعديل البدلات',
        'أخرى',
      ],
      required: true,
    },
    description: { type: String, required: true },
    previousValue: { type: String },
    newValue: { type: String },
    effectiveDate: { type: Date, required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employeeAcknowledged: { type: Boolean, default: false },
    acknowledgedDate: { type: Date },
  },
  { timestamps: true }
);

const EmployeeContractSchema = new mongoose.Schema(
  {
    contractNumber: {
      type: String,
      unique: true,
      required: true,
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    // ── Contract Type ──
    contractType: {
      type: String,
      enum: ['دوام كامل', 'دوام جزئي', 'مؤقت', 'موسمي', 'تدريب', 'استشاري', 'عن بعد'],
      required: true,
    },
    // ── Duration ──
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    isOpenEnded: { type: Boolean, default: false },
    probationPeriod: {
      duration: { type: Number, default: 90 }, // days
      endDate: { type: Date },
      status: {
        type: String,
        enum: ['سارية', 'اجتازها', 'لم يجتزها', 'ممددة'],
        default: 'سارية',
      },
    },
    // ── Financial Terms ──
    basicSalary: { type: Number, required: true },
    housingAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    totalPackage: { type: Number },
    currency: { type: String, default: 'SAR' },
    // ── Position Details ──
    jobTitle: { type: String, required: true },
    jobTitleEn: { type: String },
    department: { type: String },
    workLocation: { type: String },
    workingHoursPerWeek: { type: Number, default: 48 },
    // ── Qiwa Integration ──
    qiwaContractId: { type: String },
    qiwaStatus: {
      type: String,
      enum: ['غير مسجل', 'قيد التسجيل', 'مسجل', 'محدّث', 'ملغي'],
      default: 'غير مسجل',
    },
    molReferenceNumber: { type: String },
    // ── Notice Period ──
    noticePeriod: {
      employeeDays: { type: Number, default: 30 },
      employerDays: { type: Number, default: 60 },
    },
    // ── Non-Compete ──
    nonCompeteClause: {
      enabled: { type: Boolean, default: false },
      durationMonths: { type: Number },
      geographic: { type: String },
      industry: { type: String },
    },
    // ── Benefits Included ──
    benefits: {
      annualLeave: { type: Number, default: 21 }, // days per year — Saudi Labor Law Art 109
      sickLeave: { type: Number, default: 120 },
      medicalInsurance: { type: Boolean, default: true },
      airTickets: { type: Boolean, default: false },
      airTicketsCount: { type: Number, default: 0 }, // per year
      endOfServiceBenefit: { type: Boolean, default: true },
    },
    // ── Renewal ──
    renewalHistory: [
      {
        previousEndDate: { type: Date },
        newEndDate: { type: Date },
        renewedAt: { type: Date, default: Date.now },
        renewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        notes: { type: String },
      },
    ],
    autoRenewal: { type: Boolean, default: true },
    renewalReminderDays: { type: Number, default: 60 },
    // ── Amendments ──
    amendments: [AmendmentSchema],
    // ── Termination ──
    terminationDetails: {
      terminated: { type: Boolean, default: false },
      terminationDate: { type: Date },
      terminationReason: {
        type: String,
        enum: [
          'انتهاء العقد',
          'استقالة',
          'إنهاء بالتراضي',
          'فصل تأديبي',
          'فصل بسبب المادة 80',
          'تقاعد',
          'وفاة',
          'عجز صحي',
          'إنهاء فترة التجربة',
          'تخفيض عمالة',
        ],
      },
      lastWorkingDay: { type: Date },
      exitInterviewDone: { type: Boolean, default: false },
      settlementAmount: { type: Number },
    },
    // ── Status ──
    status: {
      type: String,
      enum: ['مسودة', 'ساري', 'قيد التجديد', 'منتهي', 'ملغي', 'معلّق'],
      default: 'مسودة',
    },
    // ── Documents ──
    attachments: [
      {
        name: { type: String },
        fileUrl: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtuals ──
EmployeeContractSchema.virtual('daysUntilExpiry').get(function () {
  if (!this.endDate || this.isOpenEnded) return null;
  return Math.ceil((this.endDate - new Date()) / (1000 * 60 * 60 * 24));
});

EmployeeContractSchema.virtual('isExpired').get(function () {
  if (this.isOpenEnded) return false;
  return this.endDate && new Date() > this.endDate;
});

EmployeeContractSchema.virtual('isInProbation').get(function () {
  return this.probationPeriod?.status === 'سارية';
});

// ── Pre-save ──
EmployeeContractSchema.pre('save', function (next) {
  // Auto-calc total package
  this.totalPackage =
    (this.basicSalary || 0) +
    (this.housingAllowance || 0) +
    (this.transportAllowance || 0) +
    (this.otherAllowances || 0);

  // Auto-calc probation end date
  if (this.startDate && this.probationPeriod?.duration) {
    const pEnd = new Date(this.startDate);
    pEnd.setDate(pEnd.getDate() + this.probationPeriod.duration);
    this.probationPeriod.endDate = pEnd;
  }

  // Auto-generate contract number
  if (!this.contractNumber) {
    const y = new Date().getFullYear();
    const r = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    this.contractNumber = `CTR-${y}-${r}`;
  }
  next();
});

// ── Indexes ──
EmployeeContractSchema.index({ employeeId: 1, status: 1 });
EmployeeContractSchema.index({ endDate: 1, status: 1 });
EmployeeContractSchema.index({ qiwaStatus: 1 });

module.exports = mongoose.model('EmployeeContract', EmployeeContractSchema);
