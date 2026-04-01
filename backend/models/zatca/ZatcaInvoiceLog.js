/**
 * ZatcaInvoiceLog Model — سجل فواتير ZATCA
 * يخزن كل طلب/استجابة مع ZATCA API
 */
'use strict';

const mongoose = require('mongoose');

const zatcaInvoiceLogSchema = new mongoose.Schema(
  {
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      index: true,
    },

    // نوع الطلب
    requestType: {
      type: String,
      enum: ['clearance', 'reporting', 'compliance_check'],
      required: true,
    },

    // بيانات الفاتورة
    zatcaUuid: { type: String, required: true, index: true }, // UUID v4
    invoiceCounter: { type: Number, required: true }, // ICV
    invoiceHash: { type: String, default: null }, // SHA-256 Base64
    previousHash: { type: String, default: null }, // PIH

    // XML
    requestXml: { type: String, default: null },
    responseXml: { type: String, default: null },

    // نتيجة الاستجابة
    responseStatus: {
      type: String,
      enum: ['PASS', 'WARNING', 'ERROR', 'PENDING', null],
      default: null,
    },
    clearanceStatus: {
      type: String,
      enum: ['CLEARED', 'NOT_CLEARED', null],
      default: null,
    },
    reportingStatus: {
      type: String,
      enum: ['REPORTED', 'NOT_REPORTED', null],
      default: null,
    },

    // الرسائل
    warningMessages: { type: mongoose.Schema.Types.Mixed, default: [] },
    errorMessages: { type: mongoose.Schema.Types.Mixed, default: [] },
    infoMessages: { type: mongoose.Schema.Types.Mixed, default: [] },

    // عدد المحاولات
    attemptNumber: { type: Number, default: 1 },

    // Timestamps
    submittedAt: { type: Date, default: null },
    respondedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'zatca_invoice_logs',
  }
);

// Indexes
zatcaInvoiceLogSchema.index({ invoiceId: 1, requestType: 1 });
// REMOVED DUPLICATE: zatcaInvoiceLogSchema.index({ zatcaUuid: 1 }); — field already has index:true
zatcaInvoiceLogSchema.index({ responseStatus: 1 });
zatcaInvoiceLogSchema.index({ createdAt: -1 });

// Virtual: هل نجح الطلب؟
zatcaInvoiceLogSchema.virtual('isSuccess').get(function () {
  return ['PASS', 'WARNING'].includes(this.responseStatus);
});

const ZatcaInvoiceLog =
  mongoose.models.ZatcaInvoiceLog || mongoose.model('ZatcaInvoiceLog', zatcaInvoiceLogSchema);

module.exports = ZatcaInvoiceLog;
