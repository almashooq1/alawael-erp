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
vatReturnSchema.index({ 'period.startDate': 1, 'period.endDate': 1 });
vatReturnSchema.index({ status: 1 });

module.exports = mongoose.model('VATReturn', vatReturnSchema);
