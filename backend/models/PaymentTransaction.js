/**
 * PaymentTransaction Model — System 38: Payment Gateway
 * بوابة الدفع الإلكتروني — معاملات الدفع
 */
const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    transactionNumber: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    // نوع البوابة وطريقة الدفع
    gateway: {
      type: String,
      enum: [
        'moyasar',
        'hyperpay',
        'paytabs',
        'tap',
        'sadad',
        'stcpay',
        'tabby',
        'tamara',
        'wallet',
        'manual',
      ],
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: [
        'mada',
        'visa',
        'mastercard',
        'apple_pay',
        'stc_pay',
        'sadad',
        'bank_transfer',
        'wallet',
        'tabby',
        'tamara',
      ],
      required: true,
    },

    // المبالغ
    amount: { type: Number, required: true, min: 0 },
    feeAmount: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    vatAmount: { type: Number, default: 0 }, // ضريبة القيمة المضافة 15%

    // الحالة
    status: {
      type: String,
      enum: [
        'pending',
        'processing',
        'paid',
        'failed',
        'refunded',
        'partially_refunded',
        'cancelled',
        'expired',
      ],
      default: 'pending',
    },

    // بيانات البوابة
    gatewayTransactionId: { type: String }, // معرف المعاملة في البوابة
    gatewayResponse: { type: mongoose.Schema.Types.Mixed }, // الاستجابة الكاملة
    gatewayMetadata: { type: mongoose.Schema.Types.Mixed },

    // الكيان المدفوع له (مورفي)
    payableType: { type: String }, // Invoice, Subscription, etc.
    payableId: { type: mongoose.Schema.Types.ObjectId },

    // المستفيد أو العميل
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    guardianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guardian' },
    customerName: { type: String },
    customerEmail: { type: String },
    customerPhone: { type: String },

    // التوقيت
    paidAt: { type: Date },
    failedAt: { type: Date },
    expiresAt: { type: Date },

    // إعادة المحاولة
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt: { type: Date },

    // الاشتراكات
    isRecurring: { type: Boolean, default: false },
    subscriptionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentSubscription' },

    // الاسترداد
    isRefunded: { type: Boolean, default: false },
    refundedAmount: { type: Number, default: 0 },

    // 3D Secure
    threeDSecureStatus: {
      type: String,
      enum: ['not_required', 'pending', 'authenticated', 'failed', 'attempted'],
      default: 'not_required',
    },
    threeDSecureUrl: { type: String },

    // SADAD
    sadadBillNumber: { type: String },
    sadadExpiry: { type: Date },

    // ZATCA Phase 2
    zatcaInvoiceUuid: { type: String },
    zatcaInvoiceHash: { type: String },
    zatcaQrCode: { type: String },
    zatcaReported: { type: Boolean, default: false },
    zatcaReportedAt: { type: Date },

    // ملاحظات
    description: { type: String },
    notes: { type: String },
    ipAddress: { type: String },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'payment_transactions',
  }
);

// Indexes
paymentTransactionSchema.index({ branchId: 1, status: 1 });
paymentTransactionSchema.index({ gateway: 1, status: 1 });
paymentTransactionSchema.index({ gatewayTransactionId: 1 });
paymentTransactionSchema.index({ payableType: 1, payableId: 1 });
paymentTransactionSchema.index({ beneficiaryId: 1, createdAt: -1 });
paymentTransactionSchema.index({ sadadBillNumber: 1 });
paymentTransactionSchema.index({ zatcaInvoiceUuid: 1 });
paymentTransactionSchema.index({ deletedAt: 1 });

// Virtual: مبلغ التغطية المتبقية
paymentTransactionSchema.virtual('remainingRefund').get(function () {
  return this.amount - this.refundedAmount;
});

module.exports =
  mongoose.models.PaymentTransaction ||
  mongoose.model('PaymentTransaction', paymentTransactionSchema);
