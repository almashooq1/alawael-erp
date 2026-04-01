/**
 * GOSI Models — التأمينات الاجتماعية
 *
 * Schemas for Saudi social insurance integration:
 * - GOSISubscription  — employee registration & subscription
 * - GOSIContribution  — monthly contribution records
 * - GOSICertificate   — issued GOSI certificates
 * - GOSIComplianceReport — periodic compliance snapshots
 * - GOSINotification  — GOSI-related notifications
 */
const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════════════════════════════════════════
 * 1) GOSISubscription — تسجيل الموظف في التأمينات
 * ═══════════════════════════════════════════════════════ */
const gosiSubscriptionSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    gosiNumber: { type: String, unique: true, sparse: true },
    nationalId: { type: String },
    iqamaNumber: { type: String },
    fullNameArabic: { type: String },
    fullNameEnglish: { type: String },
    dateOfBirth: { type: Date },
    nationality: { type: String },
    isSaudi: { type: Boolean, default: false },
    jobTitle: { type: String },
    establishmentId: { type: String },
    // Wage & contributions
    basicSalary: { type: Number, default: 0 },
    housingAllowance: { type: Number, default: 0 },
    subscriberWage: { type: Number, default: 0 },
    employeeContribution: { type: Number, default: 0 },
    employerContribution: { type: Number, default: 0 },
    totalContribution: { type: Number, default: 0 },
    // Rates
    employeeRate: { type: Number },
    employerRate: { type: Number },
    // Status
    status: {
      type: String,
      enum: ['active', 'cancelled', 'pending', 'suspended'],
      default: 'pending',
      index: true,
    },
    registrationDate: { type: Date },
    cancellationDate: { type: Date },
    lastContributionDate: { type: Date },
    nextPaymentDue: { type: Date },
    totalContributionMonths: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    // Benefits flags
    annuities: { type: Boolean, default: false },
    occupationalHazards: { type: Boolean, default: true },
    // Compliance
    complianceStatus: {
      type: String,
      enum: ['compliant', 'non_compliant', 'warning', 'pending_review'],
      default: 'pending_review',
    },
    // Eligibility
    eligibilityScore: { type: Number, min: 0, max: 100 },
    eligible: { type: Boolean },
    eligibilityFactors: [{ factor: String, impact: String, score: Number }],
    // Metadata
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

gosiSubscriptionSchema.index({ organization: 1, status: 1 });
gosiSubscriptionSchema.index({ nationality: 1, isSaudi: 1 });

const GOSISubscription =
  mongoose.models.GOSISubscription || mongoose.model('GOSISubscription', gosiSubscriptionSchema);

/* ═══════════════════════════════════════════════════════
 * 2) GOSIContribution — سجل الاشتراكات الشهرية
 * ═══════════════════════════════════════════════════════ */
const gosiContributionSchema = new Schema(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'GOSISubscription',
      required: true,
      index: true,
    },
    employee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    period: { type: String, required: true }, // YYYY-MM
    subscriberWage: { type: Number, required: true },
    employeeContribution: { type: Number, required: true },
    employerContribution: { type: Number, required: true },
    totalContribution: { type: Number, required: true },
    paymentDate: { type: Date },
    paymentStatus: {
      type: String,
      enum: ['paid', 'pending', 'overdue', 'partial'],
      default: 'pending',
    },
    paymentReference: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

gosiContributionSchema.index({ subscription: 1, period: 1 }, { unique: true });

const GOSIContribution =
  mongoose.models.GOSIContribution || mongoose.model('GOSIContribution', gosiContributionSchema);

/* ═══════════════════════════════════════════════════════
 * 3) GOSICertificate — شهادات التأمينات
 * ═══════════════════════════════════════════════════════ */
const gosiCertificateSchema = new Schema(
  {
    subscription: { type: Schema.Types.ObjectId, ref: 'GOSISubscription', index: true },
    employee: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    gosiNumber: { type: String, required: true },
    certificateNumber: { type: String, unique: true },
    certificateType: {
      type: String,
      enum: ['standard', 'salary', 'employment', 'contribution_history'],
      default: 'standard',
    },
    issueDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    certificateUrl: { type: String },
    downloadUrl: { type: String },
    status: {
      type: String,
      enum: ['valid', 'expired', 'revoked'],
      default: 'valid',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const GOSICertificate =
  mongoose.models.GOSICertificate || mongoose.model('GOSICertificate', gosiCertificateSchema);

/* ═══════════════════════════════════════════════════════
 * 4) GOSIComplianceReport — تقارير الامتثال
 * ═══════════════════════════════════════════════════════ */
const gosiComplianceReportSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    period: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
    },
    totalEmployees: { type: Number, default: 0 },
    registeredEmployees: { type: Number, default: 0 },
    compliantEmployees: { type: Number, default: 0 },
    nonCompliantEmployees: { type: Number, default: 0 },
    complianceRate: { type: Number, min: 0, max: 100, default: 0 },
    monthlyContributions: { type: Number, default: 0 },
    violations: { type: Number, default: 0 },
    issues: [
      {
        employeeId: { type: Schema.Types.ObjectId, ref: 'User' },
        issue: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      },
    ],
    warnings: [
      {
        employeeId: { type: Schema.Types.ObjectId, ref: 'User' },
        warning: String,
      },
    ],
    details: [
      {
        item: String,
        name: String,
        compliant: Boolean,
        notes: String,
      },
    ],
    overallRisk: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

gosiComplianceReportSchema.index({ organization: 1, 'period.startDate': -1 });

const GOSIComplianceReport =
  mongoose.models.GOSIComplianceReport ||
  mongoose.models.GOSIComplianceReport ||
  mongoose.model('GOSIComplianceReport', gosiComplianceReportSchema);

/* ═══════════════════════════════════════════════════════
 * 5) GOSINotification — إشعارات التأمينات
 * ═══════════════════════════════════════════════════════ */
const gosiNotificationSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    type: {
      type: String,
      enum: [
        'gosi_registration_confirmation',
        'medical_insurance_expiry_warning',
        'compliance_issue_alert',
        'salary_update_confirmation',
        'document_expiry_reminder',
        'compliance_report_ready',
      ],
      required: true,
    },
    channels: [
      {
        type: String,
        enum: ['email', 'sms', 'push', 'in-app'],
      },
    ],
    priority: {
      type: String,
      enum: ['critical', 'high', 'normal', 'low'],
      default: 'normal',
    },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    actionUrl: { type: String },
    status: {
      type: String,
      enum: ['pending', 'sent', 'read', 'unread', 'failed'],
      default: 'pending',
    },
    templateData: { type: Schema.Types.Mixed },
    scheduledFor: { type: Date },
    sentAt: { type: Date },
    readAt: { type: Date },
  },
  { timestamps: true }
);

gosiNotificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });

const GOSINotification =
  mongoose.models.GOSINotification || mongoose.model('GOSINotification', gosiNotificationSchema);

/* ═══════════════════════════════════════════════════════
 * 6) GOSIPayment — سجلات دفع الاشتراكات الشهرية
 * ═══════════════════════════════════════════════════════ */
const gosiPaymentSchema = new Schema(
  {
    organization: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    period: { type: String, required: true, comment: 'YYYY-MM' }, // YYYY-MM
    totalEmployeeShare: { type: Number, default: 0, comment: 'إجمالي حصة الموظفين' },
    totalEmployerShare: { type: Number, default: 0, comment: 'إجمالي حصة صاحب العمل' },
    grandTotal: { type: Number, default: 0, comment: 'الإجمالي الكلي' },
    totalEmployees: { type: Number, default: 0 },
    saudiEmployees: { type: Number, default: 0 },
    gccEmployees: { type: Number, default: 0 },
    expatEmployees: { type: Number, default: 0 },
    sadadNumber: { type: String, comment: 'رقم سداد' },
    paymentDate: { type: Date },
    dueDate: { type: Date, comment: 'آخر موعد للسداد: 15 من الشهر التالي' },
    status: {
      type: String,
      enum: ['pending', 'submitted', 'paid', 'overdue', 'adjusted'],
      default: 'pending',
      index: true,
    },
    paymentDetails: { type: Schema.Types.Mixed },
    notes: { type: String },
    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

gosiPaymentSchema.index({ organization: 1, period: 1 }, { unique: true });
gosiPaymentSchema.index({ status: 1, dueDate: 1 });

const GOSIPayment = mongoose.models.GOSIPayment || mongoose.model('GOSIPayment', gosiPaymentSchema);

/* ═══════════════════════════════════════════════════════
 * 7) EndOfServiceCalculation — حسابات مكافأة نهاية الخدمة
 * ═══════════════════════════════════════════════════════ */
const endOfServiceSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true, index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    terminationType: {
      type: String,
      enum: [
        'employer_termination', // إنهاء من صاحب العمل (مادة 84)
        'contract_expiry', // انتهاء العقد (مادة 84)
        'resignation', // استقالة (مادة 85)
        'force_majeure', // قوة قاهرة (مادة 87)
        'female_marriage', // زواج الموظفة (مادة 87)
        'female_childbirth', // وضع الموظفة (مادة 87)
        'retirement', // تقاعد
        'death', // وفاة
        'disability', // عجز
      ],
      required: true,
    },
    startDate: { type: Date, required: true, comment: 'تاريخ بداية الخدمة' },
    endDate: { type: Date, required: true, comment: 'تاريخ نهاية الخدمة' },
    totalYears: { type: Number, comment: 'إجمالي سنوات الخدمة بالكسور' },
    lastSalary: { type: Number, comment: 'آخر راتب فعلي شامل' },
    basicSalary: { type: Number },
    housingAllowance: { type: Number, default: 0 },
    transportAllowance: { type: Number, default: 0 },
    otherAllowances: { type: Number, default: 0 },
    // تفصيل الحساب
    firstFiveYearsAmount: { type: Number, default: 0, comment: 'نصف شهر × 5 سنوات' },
    remainingYearsAmount: { type: Number, default: 0, comment: 'شهر كامل × بقية السنوات' },
    fractionYearAmount: { type: Number, default: 0, comment: 'كسور السنة' },
    fullEntitlement: { type: Number, comment: 'المستحق الكامل (مادة 84)' },
    entitlementRatio: { type: Number, default: 1.0, comment: 'النسبة المستحقة' },
    finalAmount: { type: Number, comment: 'المبلغ النهائي بعد تطبيق النسبة' },
    // المادة القانونية المطبقة
    applicableArticle: { type: String },
    ratioDescription: { type: String },
    // تفصيل الحساب الكامل (JSON)
    calculationBreakdown: { type: Schema.Types.Mixed },
    isEstimated: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['estimated', 'confirmed', 'paid'],
      default: 'estimated',
    },
    paidDate: { type: Date },
    calculatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

endOfServiceSchema.index({ employee: 1, status: 1 });
endOfServiceSchema.index({ organization: 1, createdAt: -1 });

const EndOfServiceCalculation =
  mongoose.models.EndOfServiceCalculation ||
  mongoose.model('EndOfServiceCalculation', endOfServiceSchema);

/* ═══════════════════════════════════════════════════════
 * Exports
 * ═══════════════════════════════════════════════════════ */
module.exports = {
  GOSISubscription,
  GOSIContribution,
  GOSICertificate,
  GOSIComplianceReport,
  GOSINotification,
  GOSIPayment,
  EndOfServiceCalculation,
};
