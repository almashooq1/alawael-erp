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
  mongoose.models.GOSIComplianceReport || mongoose.model('GOSIComplianceReport', gosiComplianceReportSchema);

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
 * Exports
 * ═══════════════════════════════════════════════════════ */
module.exports = {
  GOSISubscription,
  GOSIContribution,
  GOSICertificate,
  GOSIComplianceReport,
  GOSINotification,
};
