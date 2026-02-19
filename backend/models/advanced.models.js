/**
 * Financial Management Models
 * نظام إدارة الشؤون المالية
 */

const mongoose = require('mongoose');

const financialSchema = new mongoose.Schema(
  {
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },

    // الفواتير
    invoices: [
      {
        invoiceNumber: String,
        date: Date,
        amount: Number,
        services: [String],
        status: { enum: ['pending', 'paid', 'partial', 'overdue'], default: 'pending' },
        dueDate: Date,
        paidDate: Date,
        paymentMethod: String,
      },
    ],

    // التكاليف والرسوم
    costs: [
      {
        description: String,
        amount: Number,
        category: { enum: ['tuition', 'therapy', 'supplies', 'transport', 'meals', 'other'] },
        date: Date,
      },
    ],

    // الخصومات والمنح
    discounts: [
      {
        reason: String,
        amount: Number,
        percentage: Number,
        approvedBy: String,
        date: Date,
      },
    ],

    // الدفعات
    payments: [
      {
        date: Date,
        amount: Number,
        method: { enum: ['cash', 'check', 'card', 'transfer', 'other'] },
        reference: String,
        verifiedBy: String,
      },
    ],

    // الرصيد والتقارير
    balance: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    outstandingAmount: { type: Number, default: 0 },
    lastPaymentDate: Date,
    notes: String,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'financial_records' }
);

financialSchema.index({ beneficiaryId: 1 });
financialSchema.index({ caseId: 1 });
financialSchema.index({ 'invoices.status': 1 });

/**
 * Reports & Analytics Models
 * نظام التقارير والتحليلات
 */

const reportsSchema = new mongoose.Schema(
  {
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },

    // التقارير المخصصة
    customReports: [
      {
        title: String,
        type: {
          enum: ['progress', 'financial', 'attendance', 'medical', 'behavioral', 'comprehensive'],
        },
        period: String,
        generatedDate: Date,
        generatedBy: String,
        content: String,
        format: { enum: ['pdf', 'excel', 'word', 'html'] },
        fileUrl: String,
      },
    ],

    // الإحصائيات
    statistics: {
      totalAttendance: Number,
      attendanceRate: Number,
      progressPercentage: Number,
      averageScore: Number,
      improvementRate: Number,
    },

    // البيانات المرئية
    charts: [
      {
        type: { enum: ['line', 'bar', 'pie', 'area'] },
        title: String,
        data: mongoose.Schema.Types.Mixed,
      },
    ],

    // الملخصات التنفيذية
    executiveSummary: {
      overallPerformance: String,
      keyAchievements: [String],
      areasForImprovement: [String],
      recommendations: [String],
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'reports' }
);

reportsSchema.index({ caseId: 1 });
reportsSchema.index({ beneficiaryId: 1 });
reportsSchema.index({ 'customReports.type': 1 });

/**
 * Settings & Admin Models
 * نظام الإعدادات والإدارة
 */

const settingsSchema = new mongoose.Schema(
  {
    centerId: String,

    // إعدادات المركز
    centerSettings: {
      name: String,
      address: String,
      phone: String,
      email: String,
      website: String,
      logo: String,
      timeZone: String,
      workingHours: {
        start: String,
        end: String,
      },
      holidays: [Date],
    },

    // الأدوار والصلاحيات
    roles: [
      {
        name: String,
        permissions: [String],
        description: String,
      },
    ],

    // الإعدادات النظام
    systemSettings: {
      language: { enum: ['ar', 'en'], default: 'ar' },
      dateFormat: String,
      currencySymbol: String,
      mailingEnabled: Boolean,
      smsEnabled: Boolean,
      backupFrequency: String,
      dataRetention: Number, // بالأيام
    },

    // السجلات والتدقيق
    auditLogs: [
      {
        timestamp: Date,
        userId: String,
        action: String,
        entity: String,
        changes: mongoose.Schema.Types.Mixed,
      },
    ],

    // النسخ الاحتياطية
    backups: [
      {
        date: Date,
        size: String,
        location: String,
        status: { enum: ['success', 'failed', 'in-progress'] },
      },
    ],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'settings' }
);

settingsSchema.index({ centerId: 1 });
settingsSchema.index({ 'auditLogs.timestamp': -1 });

module.exports = {
  Financial: mongoose.model('Financial', financialSchema),
  Reports: mongoose.model('Reports', reportsSchema),
  Settings: mongoose.model('Settings', settingsSchema),
};
