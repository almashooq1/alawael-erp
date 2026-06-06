/**
 * PaymentRefund Model — System 38: Payment Gateway
 * استرداد المدفوعات
 */
const mongoose = require('mongoose');

const paymentRefundSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    refundNumber: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentTransaction',
      required: true,
    },
    gatewayRefundId: { type: String }, // معرف الاسترداد في البوابة

    amount: { type: Number, required: true, min: 0 },
    // integer-halalas sibling (audit #5 EXPAND) — dual-written in pre('save')
    amount_halalas: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },

    reason: { type: String, required: true },
    reasonCode: { type: String }, // كود السبب

    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },

    processedAt: { type: Date },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    notes: { type: String },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'payment_refunds',
  }
);

// Money-Type Migration (audit #5) — dual-write integer-halalas siblings.
// New async hook (none existed) per the W483/Mongoose-9 async doctrine.
paymentRefundSchema.pre('save', async function () {
  require('../intelligence/money.lib').deriveHalalas(this, ['amount']);
});

paymentRefundSchema.index({ branchId: 1, status: 1 });
paymentRefundSchema.index({ transactionId: 1 });
paymentRefundSchema.index({ gatewayRefundId: 1 });
paymentRefundSchema.index({ deletedAt: 1 });

module.exports =
  mongoose.models.PaymentRefund || mongoose.model('PaymentRefund', paymentRefundSchema);
