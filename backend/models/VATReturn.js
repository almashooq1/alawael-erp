/**
 * ===================================================================
 * VAT RETURN MODEL - نموذج إقرار ضريبة القيمة المضافة
 * ===================================================================
 */

const mongoose = require('mongoose');

const vatReturnSchema = new mongoose.Schema(
  {
    // الفترة
    period: {
      startDate: {
        type: Date,
        required: true,
      },
      endDate: {
        type: Date,
        required: true,
      },
    },

    // المبيعات الخاضعة للضريبة
    taxableSales: {
      standardRated: {
        amount: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
      },
      zeroRated: {
        amount: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
      },
    },

    // المشتريات الخاضعة للضريبة
    taxablePurchases: {
      standardRated: {
        amount: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
      },
      imports: {
        amount: { type: Number, default: 0 },
        vat: { type: Number, default: 0 },
      },
    },

    // الإجماليات
    totalOutputVAT: {
      type: Number,
      required: true,
    },
    totalInputVAT: {
      type: Number,
      required: true,
    },
    netVAT: {
      type: Number,
      required: true,
    },
    // integer-halalas siblings (audit #5 EXPAND) — dual-written in pre('save')
    totalOutputVAT_halalas: { type: Number, default: 0 },
    totalInputVAT_halalas: { type: Number, default: 0 },
    netVAT_halalas: { type: Number, default: 0 },

    // التسويات
    adjustments: [
      {
        description: String,
        amount: Number,
        type: { type: String, enum: ['addition', 'deduction'] },
      },
    ],

    adjustedNetVAT: {
      type: Number,
      required: true,
    },
    adjustedNetVAT_halalas: { type: Number, default: 0 },

    // الحالة
    status: {
      type: String,
      enum: ['draft', 'filed', 'paid', 'amended'],
      default: 'draft',
    },

    // معلومات التقديم
    filedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    filedAt: Date,
    confirmationNumber: String,

    // الدفع
    paymentDate: Date,
    paymentReference: String,

    // المرفقات
    attachments: [
      {
        name: String,
        url: String,
        uploadedAt: Date,
      },
    ],

    // الملاحظات
    notes: String,

    // معلومات التتبع
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// فهرسة
// Money-Type Migration (audit #5) — dual-write integer-halalas siblings.
// Nested sales/purchases amount+vat sub-objects are deferred (per-category).
vatReturnSchema.pre('save', async function (next) {
  require('../intelligence/money.lib').deriveHalalas(this, [
    'totalOutputVAT',
    'totalInputVAT',
    'netVAT',
    'adjustedNetVAT',
  ]);
  next();
});

vatReturnSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
vatReturnSchema.index({ status: 1 });

module.exports = mongoose.models.VATReturn || mongoose.model('VATReturn', vatReturnSchema);
