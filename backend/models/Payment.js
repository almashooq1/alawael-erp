/**
 * ===================================================================
 * PAYMENT MODEL - نموذج الدفعة
 * ===================================================================
 */

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    // الفاتورة المرتبطة
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },

    // الرقم المرجعي
    reference: {
      type: String,
      required: true,
      unique: true,
    },

    // تاريخ الدفع
    paymentDate: {
      type: Date,
      required: true,
    },

    // المبلغ
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // العملة
    currency: {
      type: String,
      default: 'SAR',
    },

    // طريقة الدفع
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card', 'other'],
      required: true,
    },

    // الحساب البنكي
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
    },

    // معلومات إضافية
    checkNumber: String,
    bankName: String,
    transactionId: String,

    // الحالة
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },

    // الملاحظات
    notes: String,

    // المرفقات
    attachments: [
      {
        name: String,
        url: String,
        uploadedAt: Date,
      },
    ],

    // معلومات التتبع
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    processedAt: Date,
  },
  {
    timestamps: true,
  }
);

// فهرسة (reference already has unique:true index)
paymentSchema.index({ invoiceId: 1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
