/**
 * PaymentSubscription Model — System 38: Payment Gateway
 * اشتراكات الدفع المتكرر
 */
const mongoose = require('mongoose');

const paymentSubscriptionSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    subscriptionNumber: { type: String, unique: true, required: true },
    uuid: { type: String, unique: true, required: true },

    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    gateway: {
      type: String,
      enum: ['moyasar', 'hyperpay', 'paytabs', 'tap'],
      required: true,
    },
    gatewaySubscriptionId: { type: String }, // معرف الاشتراك في البوابة

    planName: { type: String, required: true },
    planNameAr: { type: String },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR' },
    interval: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
      default: 'monthly',
    },

    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'expired', 'pending'],
      default: 'pending',
    },

    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    nextBillingDate: { type: Date },
    lastBilledAt: { type: Date },

    failedAttempts: { type: Number, default: 0 },
    maxFailedAttempts: { type: Number, default: 3 },

    cancelledAt: { type: Date },
    cancelReason: { type: String },

    metadata: { type: mongoose.Schema.Types.Mixed },
    notes: { type: String },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'payment_subscriptions',
  }
);

paymentSubscriptionSchema.index({ branchId: 1, status: 1 });
paymentSubscriptionSchema.index({ beneficiaryId: 1, status: 1 });
paymentSubscriptionSchema.index({ nextBillingDate: 1, status: 1 });
paymentSubscriptionSchema.index({ deletedAt: 1 });

module.exports =
  mongoose.models.PaymentSubscription ||
  mongoose.model('PaymentSubscription', paymentSubscriptionSchema);
