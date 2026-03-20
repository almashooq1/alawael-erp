/* eslint-disable no-unused-vars */
/**
 * ===================================================================
 * CREDIT NOTE / DEBIT NOTE MODEL - نموذج إشعارات الدائن والمدين
 * ===================================================================
 */

const mongoose = require('mongoose');

const creditNoteItemSchema = new mongoose.Schema({
  description: { type: String, required: true, trim: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  amount: { type: Number, required: true },
  taxRate: { type: Number, default: 0.15 },
  taxAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
});

const creditNoteSchema = new mongoose.Schema(
  {
    // معلومات الإشعار
    noteNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['credit', 'debit'],
    },

    // مرجع الفاتورة الأصلية
    originalInvoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccountingInvoice',
    },
    originalInvoiceNumber: { type: String, trim: true },

    // بيانات العميل/المورد
    partyType: {
      type: String,
      enum: ['customer', 'supplier'],
      required: true,
    },
    partyName: { type: String, required: true, trim: true },
    partyId: { type: mongoose.Schema.Types.ObjectId },

    // التاريخ
    issueDate: { type: Date, required: true, default: Date.now },

    // السبب
    reason: {
      type: String,
      required: true,
      enum: [
        'return', // مرتجعات
        'discount', // خصم لاحق
        'pricing_error', // خطأ في التسعير
        'damaged_goods', // بضائع تالفة
        'service_issue', // مشكلة في الخدمة
        'overcharge', // زيادة في المبلغ
        'other', // أخرى
      ],
    },
    reasonDescription: { type: String, trim: true },

    // البنود
    items: [creditNoteItemSchema],

    // المبالغ
    subtotal: { type: Number, required: true },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    currency: { type: String, default: 'SAR' },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'applied', 'cancelled'],
      default: 'draft',
    },

    // تطبيق الإشعار
    appliedToInvoices: [
      {
        invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AccountingInvoice' },
        amount: Number,
        appliedAt: Date,
      },
    ],
    remainingAmount: { type: Number },

    // اعتمادات
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },

    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

creditNoteSchema.index({ type: 1, status: 1 });
creditNoteSchema.index({ partyType: 1, partyName: 1 });
creditNoteSchema.index({ originalInvoiceId: 1 });

module.exports = mongoose.model('CreditNote', creditNoteSchema);
