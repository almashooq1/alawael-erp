/**
 * PaymentWebhook Model — System 38: Payment Gateway
 * سجلات Webhook الواردة من بوابات الدفع
 */
const mongoose = require('mongoose');

const paymentWebhookSchema = new mongoose.Schema(
  {
    gateway: {
      type: String,
      enum: ['moyasar', 'hyperpay', 'paytabs', 'tap', 'sadad', 'stcpay', 'tabby', 'tamara'],
      required: true,
    },
    eventType: { type: String, required: true }, // payment.paid, payment.failed, refund.completed...
    gatewayEventId: { type: String }, // معرف الحدث في البوابة

    payload: { type: mongoose.Schema.Types.Mixed, required: true }, // البيانات الخام

    status: {
      type: String,
      enum: ['received', 'processed', 'failed', 'invalid_signature'],
      default: 'received',
    },

    attempts: { type: Number, default: 1 },
    lastAttemptAt: { type: Date },
    processedAt: { type: Date },
    errorMessage: { type: String },

    // التحقق من التوقيع
    signature: { type: String },
    signatureValid: { type: Boolean },

    // ربط بالمعاملة
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PaymentTransaction' },

    // بيانات الطلب
    ipAddress: { type: String },
    headers: { type: mongoose.Schema.Types.Mixed },

    // Soft delete
    deletedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    collection: 'payment_webhooks',
  }
);

paymentWebhookSchema.index({ gateway: 1, status: 1 });
paymentWebhookSchema.index({ gatewayEventId: 1 });
paymentWebhookSchema.index({ transactionId: 1 });
paymentWebhookSchema.index({ status: 1, createdAt: -1 });
paymentWebhookSchema.index({ deletedAt: 1 });

module.exports =
  mongoose.models.PaymentWebhook || mongoose.model('PaymentWebhook', paymentWebhookSchema);
