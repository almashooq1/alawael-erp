/**
 * نماذج منصة مُدد - نظام حماية الأجور
 * Mudad Platform Models - Wage Protection System (WPS)
 *
 * التكامل مع منصة مُدد التابعة لوزارة الموارد البشرية والتنمية الاجتماعية
 * Integration with Mudad platform under MHRSD
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ============================================================
// نموذج سجل الرواتب المرفوع لمُدد
// Mudad Salary Record Schema
// ============================================================
const MudadSalaryRecordSchema = new Schema(
  {
    // معلومات الموظف
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    employeeNationalId: {
      type: String,
      required: true,
      index: true,
    },
    employeeName: {
      ar: { type: String, required: true },
      en: { type: String },
    },

    // معلومات الراتب
    salaryMonth: {
      type: String, // YYYY-MM
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    basicSalary: { type: Number, required: true, min: 0 },
    housingAllowance: { type: Number, default: 0, min: 0 },
    transportAllowance: { type: Number, default: 0, min: 0 },
    otherAllowances: { type: Number, default: 0, min: 0 },
    totalSalary: { type: Number, required: true, min: 0 },
    deductions: { type: Number, default: 0, min: 0 },
    netSalary: { type: Number, required: true, min: 0 },

    // معلومات البنك
    bankCode: { type: String, required: true },
    bankName: { type: String, required: true },
    iban: {
      type: String,
      required: true,
      match: /^SA\d{22}$/,
    },

    // حالة الدفع
    paymentStatus: {
      type: String,
      enum: ['pending', 'submitted', 'processing', 'paid', 'rejected', 'returned', 'delayed'],
      default: 'pending',
      index: true,
    },
    paymentDate: { type: Date },
    paymentReference: { type: String },

    // حالة مُدد
    mudadStatus: {
      type: String,
      enum: ['draft', 'uploaded', 'validated', 'accepted', 'rejected', 'correction_needed'],
      default: 'draft',
      index: true,
    },
    mudadFileId: { type: String },
    mudadBatchId: { type: String, index: true },
    mudadRejectionReason: { type: String },
    mudadValidationErrors: [
      {
        field: String,
        message: String,
        code: String,
      },
    ],

    // معلومات الفرع والمنشأة
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    establishmentId: { type: String, required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization' },

    // حقول التدقيق
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    auditLog: [
      {
        action: { type: String, required: true },
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: Schema.Types.Mixed,
        ipAddress: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'mudad_salary_records',
  }
);

MudadSalaryRecordSchema.index({ salaryMonth: 1, employee: 1 }, { unique: true });
MudadSalaryRecordSchema.index({ mudadBatchId: 1, mudadStatus: 1 });
MudadSalaryRecordSchema.index({ establishmentId: 1, salaryMonth: 1 });

// ============================================================
// نموذج دفعة مُدد (Batch)
// Mudad Batch Upload Schema
// ============================================================
const MudadBatchSchema = new Schema(
  {
    batchNumber: {
      type: String,
      unique: true,
      required: true,
    },
    salaryMonth: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    establishmentId: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },

    // إحصائيات الدفعة
    totalEmployees: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    paidCount: { type: Number, default: 0 },
    rejectedCount: { type: Number, default: 0 },
    pendingCount: { type: Number, default: 0 },

    // حالة الدفعة
    status: {
      type: String,
      enum: [
        'draft',
        'generating',
        'generated',
        'validating',
        'validated',
        'uploading',
        'uploaded',
        'processing',
        'completed',
        'partially_completed',
        'rejected',
        'cancelled',
      ],
      default: 'draft',
      index: true,
    },

    // معلومات الملف
    fileFormat: {
      type: String,
      enum: ['WPS', 'SIF', 'CSV'],
      default: 'WPS',
    },
    filePath: { type: String },
    fileSize: { type: Number },
    fileChecksum: { type: String },

    // تواريخ مهمة
    generatedAt: { type: Date },
    uploadedAt: { type: Date },
    processedAt: { type: Date },
    completedAt: { type: Date },
    deadline: { type: Date },

    // أخطاء وتحذيرات
    validationErrors: [
      {
        employeeId: String,
        field: String,
        message: String,
        severity: { type: String, enum: ['error', 'warning'] },
      },
    ],
    rejectionReason: { type: String },

    // حقول التدقيق
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    auditLog: [
      {
        action: String,
        performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        performedAt: { type: Date, default: Date.now },
        details: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'mudad_batches',
  }
);

MudadBatchSchema.index({ establishmentId: 1, salaryMonth: 1 });

// ============================================================
// نموذج إعدادات مُدد
// Mudad Configuration Schema
// ============================================================
const MudadConfigSchema = new Schema(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      unique: true,
    },
    establishmentId: { type: String, required: true },
    molId: { type: String }, // رقم وزارة العمل

    // بيانات الاعتماد
    apiKey: { type: String },
    apiSecret: { type: String },
    certificatePath: { type: String },
    environment: {
      type: String,
      enum: ['sandbox', 'production'],
      default: 'sandbox',
    },

    // إعدادات البنك
    payerBankCode: { type: String, required: true },
    payerIban: { type: String, required: true },
    payerAccountName: { type: String },

    // إعدادات الجدولة
    autoUpload: { type: Boolean, default: false },
    uploadDayOfMonth: { type: Number, min: 1, max: 28, default: 25 },
    reminderDaysBefore: { type: Number, default: 5 },
    deadlineDayOfMonth: { type: Number, min: 1, max: 30, default: 3 },

    // إعدادات الإشعار
    notifyOnUpload: { type: Boolean, default: true },
    notifyOnRejection: { type: Boolean, default: true },
    notifyOnCompletion: { type: Boolean, default: true },
    notificationEmails: [{ type: String }],

    isActive: { type: Boolean, default: true },
    lastSyncAt: { type: Date },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'mudad_config',
  }
);

// ============================================================
// نموذج تقرير الامتثال
// Mudad Compliance Report Schema
// ============================================================
const MudadComplianceReportSchema = new Schema(
  {
    reportMonth: {
      type: String,
      required: true,
      match: /^\d{4}-(0[1-9]|1[0-2])$/,
    },
    establishmentId: { type: String, required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },

    // نسب الامتثال
    complianceRate: { type: Number, min: 0, max: 100 },
    onTimePaymentRate: { type: Number, min: 0, max: 100 },
    fullPaymentRate: { type: Number, min: 0, max: 100 },

    // إحصائيات
    totalEmployees: { type: Number, default: 0 },
    paidOnTime: { type: Number, default: 0 },
    paidLate: { type: Number, default: 0 },
    unpaid: { type: Number, default: 0 },
    partiallyPaid: { type: Number, default: 0 },

    // تفاصيل المخالفات
    violations: [
      {
        type: {
          type: String,
          enum: [
            'late_payment',
            'missing_payment',
            'partial_payment',
            'incorrect_amount',
            'invalid_iban',
            'missing_upload',
          ],
        },
        employeeId: { type: Schema.Types.ObjectId, ref: 'Employee' },
        employeeName: String,
        details: String,
        severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      },
    ],

    // حالة التقرير
    status: {
      type: String,
      enum: ['draft', 'generated', 'submitted', 'acknowledged'],
      default: 'draft',
    },
    overallRisk: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },

    generatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    generatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'mudad_compliance_reports',
  }
);

MudadComplianceReportSchema.index({ establishmentId: 1, reportMonth: 1 }, { unique: true });

// ============================================================
// التصدير
// ============================================================
const MudadSalaryRecord = mongoose.model('MudadSalaryRecord', MudadSalaryRecordSchema);
const MudadBatch = mongoose.model('MudadBatch', MudadBatchSchema);
const MudadConfig = mongoose.model('MudadConfig', MudadConfigSchema);
const MudadComplianceReport = mongoose.model('MudadComplianceReport', MudadComplianceReportSchema);

module.exports = {
  MudadSalaryRecord,
  MudadBatch,
  MudadConfig,
  MudadComplianceReport,
};
