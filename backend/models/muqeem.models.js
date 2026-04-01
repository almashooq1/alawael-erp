/**
 * Muqeem Models — نماذج مقيم (وزارة الداخلية)
 *
 * Schemas for Muqeem (Saudi Passports Authority) integration:
 * - EmployeeResidency   — إقامات الموظفين
 * - VisaRequest         — طلبات التأشيرات
 * - MuqeemTransaction   — سجل معاملات مقيم
 * - TransferRequest     — طلبات نقل الخدمات (الكفالة)
 *
 * @module models/muqeem.models
 * @version 1.0.0
 */
'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════════════════════════════════════════
 * 1) EmployeeResidency — إقامات الموظفين
 * ═══════════════════════════════════════════════════════ */
const employeeResidencySchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    // بيانات الإقامة
    iqamaNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      comment: 'رقم الإقامة (10 أرقام)',
    },
    borderNumber: {
      type: String,
      trim: true,
      comment: 'رقم الحدود',
    },
    // بيانات جواز السفر
    passportNumber: { type: String, required: true, trim: true },
    passportCountryCode: {
      type: String,
      trim: true,
      comment: 'كود الدولة ISO 3166-1 alpha-2',
    },
    passportIssueDate: { type: Date },
    passportExpiryDate: { type: Date },
    passportIssuePlace: { type: String },
    // تواريخ الإقامة
    iqamaIssueDate: { type: Date, required: true },
    iqamaExpiryDate: { type: Date, required: true, index: true },
    iqamaIssuePlace: { type: String },
    // بيانات المهنة
    occupationCode: { type: String, comment: 'رمز المهنة في مقيم' },
    occupationNameAr: { type: String },
    occupationNameEn: { type: String },
    // بيانات الكفالة
    sponsorId: { type: String, comment: 'رقم المنشأة الكافلة' },
    // الحالة
    status: {
      type: String,
      enum: [
        'active',
        'expired',
        'cancelled',
        'transferred',
        'final_exit',
        'pending_renewal',
        'pending_transfer',
      ],
      default: 'active',
      index: true,
    },
    renewalFee: { type: Number },
    // بيانات الدخول والخروج
    lastEntryDate: { type: Date, comment: 'تاريخ آخر دخول' },
    lastExitDate: { type: Date, comment: 'تاريخ آخر خروج' },
    isInsideKingdom: { type: Boolean, default: true },
    // بيانات مقيم الإضافية
    muqeemData: { type: Schema.Types.Mixed, comment: 'بيانات إضافية من API مقيم' },
    // بيانات التنبيهات
    lastAlertSent: { type: Date },
    alertLevel: {
      type: String,
      enum: ['none', 'info', 'warning', 'urgent', 'critical', 'expired'],
      default: 'none',
    },
    // المراجعة
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// REMOVED DUPLICATE: employeeResidencySchema.index({ iqamaNumber: 1 }); — field already has index:true
employeeResidencySchema.index({ iqamaExpiryDate: 1, status: 1 });
employeeResidencySchema.index({ employee: 1, status: 1 });
employeeResidencySchema.index({ passportExpiryDate: 1, status: 1 });

// حساب الأيام المتبقية
employeeResidencySchema.virtual('daysUntilExpiry').get(function () {
  if (!this.iqamaExpiryDate) return null;
  const diff = this.iqamaExpiryDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// حساب الأيام المتبقية للجواز
employeeResidencySchema.virtual('passportDaysUntilExpiry').get(function () {
  if (!this.passportExpiryDate) return null;
  const diff = this.passportExpiryDate - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const EmployeeResidency =
  mongoose.models.EmployeeResidency || mongoose.model('EmployeeResidency', employeeResidencySchema);

/* ═══════════════════════════════════════════════════════
 * 2) VisaRequest — طلبات التأشيرات
 * ═══════════════════════════════════════════════════════ */
const visaRequestSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    residency: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeResidency',
      required: true,
    },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    // بيانات التأشيرة
    visaNumber: { type: String, unique: true, sparse: true },
    visaType: {
      type: String,
      enum: [
        'exit_reentry_single', // خروج وعودة مفردة
        'exit_reentry_multiple', // خروج وعودة متعددة
        'final_exit', // خروج نهائي
      ],
      required: true,
    },
    requestDate: { type: Date, default: Date.now, required: true },
    visaStartDate: { type: Date },
    visaEndDate: { type: Date, index: true },
    durationDays: { type: Number, comment: 'مدة التأشيرة بالأيام' },
    destinationCountry: { type: String },
    purpose: { type: String },
    visaFee: { type: Number },
    // الحالة
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'issued', 'used', 'expired', 'cancelled', 'rejected'],
      default: 'draft',
      index: true,
    },
    rejectionReason: { type: String },
    // بيانات مقيم
    muqeemRequestId: { type: String },
    muqeemResponse: { type: Schema.Types.Mixed },
    // تواريخ الخروج الفعلية
    actualExitDate: { type: Date },
    actualReturnDate: { type: Date },
    // الموافقات
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

visaRequestSchema.index({ employee: 1, visaType: 1, status: 1 });
// REMOVED DUPLICATE: visaRequestSchema.index({ visaNumber: 1 }); — field already has index:true
visaRequestSchema.index({ visaEndDate: 1, status: 1 });

const VisaRequest = mongoose.models.VisaRequest || mongoose.model('VisaRequest', visaRequestSchema);

/* ═══════════════════════════════════════════════════════
 * 3) MuqeemTransaction — سجل معاملات مقيم
 * ═══════════════════════════════════════════════════════ */
const muqeemTransactionSchema = new Schema(
  {
    employee: { type: Schema.Types.ObjectId, ref: 'Employee', index: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    transactionType: {
      type: String,
      enum: [
        'iqama_issue',
        'iqama_renew',
        'iqama_query',
        'visa_exit_reentry',
        'visa_final_exit',
        'visa_cancel',
        'visa_extend',
        'transfer_request',
        'transfer_release',
        'transfer_query',
        'employee_query',
        'data_update',
        'report_query',
        'occupation_change',
      ],
      required: true,
    },
    referenceNumber: { type: String, index: true },
    requestData: { type: Schema.Types.Mixed },
    responseData: { type: Schema.Types.Mixed },
    httpStatusCode: { type: Number },
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'timeout'],
      default: 'pending',
      index: true,
    },
    errorMessage: { type: String },
    feeAmount: { type: Number },
    sadadNumber: { type: String, comment: 'رقم سداد' },
    // تفاصيل الطلب
    initiatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ipAddress: { type: String },
    processingTimeMs: { type: Number },
  },
  { timestamps: true }
);

muqeemTransactionSchema.index({ employee: 1, transactionType: 1 });
muqeemTransactionSchema.index({ createdAt: -1 });

const MuqeemTransaction =
  mongoose.models.MuqeemTransaction || mongoose.model('MuqeemTransaction', muqeemTransactionSchema);

/* ═══════════════════════════════════════════════════════
 * 4) TransferRequest — طلبات نقل الخدمات (الكفالة)
 * ═══════════════════════════════════════════════════════ */
const transferRequestSchema = new Schema(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    residency: {
      type: Schema.Types.ObjectId,
      ref: 'EmployeeResidency',
      required: true,
    },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    direction: {
      type: String,
      enum: ['incoming', 'outgoing'],
      required: true,
      comment: 'incoming = استقدام، outgoing = تنازل',
    },
    fromEstablishment: { type: String, comment: 'رقم المنشأة المحوِّلة' },
    toEstablishment: { type: String, comment: 'رقم المنشأة المستقبلة' },
    muqeemRequestId: { type: String, index: true },
    requestDate: { type: Date, default: Date.now, required: true },
    responseDeadline: { type: Date, comment: 'آخر موعد للرد (15 يوم)' },
    status: {
      type: String,
      enum: [
        'pending_request',
        'pending_approval',
        'approved',
        'rejected',
        'cancelled',
        'completed',
        'expired',
      ],
      default: 'pending_request',
      index: true,
    },
    notes: { type: String },
    rejectionReason: { type: String },
    // الموافقات
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    // بيانات مقيم
    muqeemResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

transferRequestSchema.index({ employee: 1, status: 1 });
// REMOVED DUPLICATE: transferRequestSchema.index({ muqeemRequestId: 1 }); — field already has index:true

const TransferRequest =
  mongoose.models.TransferRequest || mongoose.model('TransferRequest', transferRequestSchema);

/* ═══════════════════════════════════════════════════════
 * Exports
 * ═══════════════════════════════════════════════════════ */
module.exports = {
  EmployeeResidency,
  VisaRequest,
  MuqeemTransaction,
  TransferRequest,
};
