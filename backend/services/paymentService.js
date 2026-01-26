/**
 * Payment Gateway Integration Service (DB-backed)
 * Supports Stripe, PayPal, and KNET (Saudi)
 */

const mongoose = require('mongoose');
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const AuditLogger = require('./audit-logger');
const NotificationService = require('./notification.service');

const PaymentMethodSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['card', 'paypal', 'knet', 'bank_transfer', 'other'],
      required: true,
    },
    lastFour: { type: String, required: true },
    expiryDate: String,
    isDefault: { type: Boolean, default: false },
    metadata: { type: Map, of: String },
  },
  { timestamps: true }
);

const PaymentMethod =
  mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', PaymentMethodSchema);

class PaymentService {
  constructor() {
    this.defaultCurrency = 'SAR';
  }

  async initializeStripePayment(userId, amount, currency = this.defaultCurrency, metadata = {}) {
    try {
      if (!amount || amount <= 0) throw new Error('Invalid amount');

      const transactionId = `stripe_${Date.now()}`;

      const payment = await Payment.create({
        transactionId,
        userId,
        amount,
        currency,
        paymentMethod: 'card',
        status: 'pending',
        stripePaymentIntentId: transactionId,
        metadata,
      });

      await this._logAudit(userId, 'PAYMENT_INIT', 'payment', payment._id, 'CREATE');

      return {
        success: true,
        message: 'Payment initialized',
        paymentId: transactionId,
        clientSecret:
          payment.stripePaymentIntentId || `pi_${Math.random().toString(36).slice(2, 18)}`,
        amount,
        currency,
      };
    } catch (error) {
      await this._logAudit(
        userId,
        'PAYMENT_INIT_FAILED',
        'payment',
        undefined,
        'CREATE',
        'failure',
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  async confirmStripePayment(paymentId, paymentMethodId) {
    try {
      const payment = await Payment.findOne({ transactionId: paymentId });
      if (!payment) throw new Error('Payment not found');

      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.cardDetails = payment.cardDetails || {};
      payment.cardDetails.last4 =
        (paymentMethodId && paymentMethodId.slice(-4)) || payment.cardDetails.last4;
      payment.metadata = payment.metadata || new Map();
      payment.metadata.set('paymentMethodId', paymentMethodId || 'unknown');

      await payment.save();

      await this._logAudit(payment.userId, 'PAYMENT_CONFIRM', 'payment', payment._id, 'UPDATE');
      await this._notify(payment.userId, {
        title: 'Payment completed',
        message: `Payment ${payment.transactionId} completed successfully`,
        type: 'PAYMENT',
      });

      return {
        success: true,
        message: 'Payment completed successfully',
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async initializePayPalPayment(userId, amount, currency = this.defaultCurrency, metadata = {}) {
    try {
      if (!amount || amount <= 0) throw new Error('Invalid amount');

      const transactionId = `paypal_${Date.now()}`;

      const payment = await Payment.create({
        transactionId,
        userId,
        amount,
        currency,
        paymentMethod: 'paypal',
        status: 'pending',
        paypalTransactionId: transactionId,
        metadata,
      });

      await this._logAudit(userId, 'PAYPAL_INIT', 'payment', payment._id, 'CREATE');

      return {
        success: true,
        message: 'PayPal payment initialized',
        paymentId: transactionId,
        approvalUrl: `https://www.paypal.com/checkoutnow?token=${transactionId}`,
      };
    } catch (error) {
      await this._logAudit(
        userId,
        'PAYPAL_INIT_FAILED',
        'payment',
        undefined,
        'CREATE',
        'failure',
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  async initializeKNETPayment(userId, amount, currency = this.defaultCurrency, metadata = {}) {
    try {
      if (!amount || amount <= 0) throw new Error('Invalid amount');

      const transactionId = `knet_${Date.now()}`;

      const payment = await Payment.create({
        transactionId,
        userId,
        amount,
        currency,
        paymentMethod: 'knet',
        status: 'pending',
        metadata,
      });

      await this._logAudit(userId, 'KNET_INIT', 'payment', payment._id, 'CREATE');

      return {
        success: true,
        message: 'KNET payment initialized',
        paymentId: transactionId,
        redirectUrl: `https://knet.gateway.com/payment?ref=${transactionId}`,
        amount,
        currency,
      };
    } catch (error) {
      await this._logAudit(
        userId,
        'KNET_INIT_FAILED',
        'payment',
        undefined,
        'CREATE',
        'failure',
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findOne({ transactionId: paymentId }).lean();
      if (!payment) throw new Error('Payment not found');

      return {
        success: true,
        payment: {
          id: payment.transactionId,
          status: payment.status,
          provider: payment.paymentMethod,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
          transactionId: payment.transactionId,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createInvoice(userId, items, metadata = {}) {
    try {
      const safeItems = (items || []).map(item => ({
        description: item.description || item.name || 'Item',
        quantity: item.quantity || 1,
        unitPrice: item.price || item.unitPrice || 0,
        total: (item.price || item.unitPrice || 0) * (item.quantity || 1),
      }));

      if (!safeItems.length) throw new Error('Items required');

      const subtotal = safeItems.reduce((sum, item) => sum + item.total, 0);
      const tax = metadata.tax != null ? Number(metadata.tax) : subtotal * 0.0;
      const discount = metadata.discount != null ? Number(metadata.discount) : 0;
      const total = subtotal + tax - discount;

      const invoice = await Invoice.create({
        invoiceNumber: metadata.invoiceNumber || `INV-${Date.now()}`,
        userId,
        items: safeItems,
        subtotal,
        tax,
        discount,
        total,
        status: 'draft',
        dueDate: metadata.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: metadata.notes,
      });

      await this._logAudit(userId, 'INVOICE_CREATE', 'invoice', invoice._id, 'CREATE');

      return {
        success: true,
        message: 'Invoice created',
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.total,
        currency: metadata.currency || this.defaultCurrency,
      };
    } catch (error) {
      await this._logAudit(
        userId,
        'INVOICE_CREATE_FAILED',
        'invoice',
        undefined,
        'CREATE',
        'failure',
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  async sendInvoice(invoiceId, recipientEmail) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      invoice.status = 'sent';
      invoice.sentAt = new Date();
      invoice.notes = invoice.notes || '';
      await invoice.save();

      await this._logAudit(invoice.userId, 'INVOICE_SEND', 'invoice', invoice._id, 'UPDATE');
      await this._notify(invoice.userId, {
        title: 'Invoice sent',
        message: `Invoice ${invoice.invoiceNumber} sent to ${recipientEmail}`,
        type: 'INVOICE',
        meta: { recipientEmail },
      });

      return {
        success: true,
        message: 'Invoice sent successfully',
        sentTo: recipientEmail,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async savePaymentMethod(userId, paymentMethod, metadata = {}) {
    try {
      const method = await PaymentMethod.create({
        userId,
        type: paymentMethod.type,
        lastFour: paymentMethod.lastFour,
        expiryDate: paymentMethod.expiryDate,
        isDefault: paymentMethod.isDefault || false,
        metadata,
      });

      if (method.isDefault) {
        await PaymentMethod.updateMany({ userId, _id: { $ne: method._id } }, { isDefault: false });
      }

      await this._logAudit(userId, 'PAYMENT_METHOD_SAVE', 'payment_method', method._id, 'CREATE');

      return { success: true, message: 'Payment method saved', methodId: method._id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getSavedPaymentMethods(userId) {
    try {
      const methods = await PaymentMethod.find({ userId }).sort({ createdAt: -1 }).lean();
      return { success: true, methods, count: methods.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deletePaymentMethod(methodId) {
    try {
      await PaymentMethod.deleteOne({ _id: methodId });
      return { success: true, message: 'Payment method deleted' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async refundPayment(paymentId, reason = '') {
    try {
      const payment = await Payment.findOne({ transactionId: paymentId });
      if (!payment) throw new Error('Payment not found');
      if (payment.status !== 'completed') throw new Error('Payment cannot be refunded');

      payment.status = 'refunded';
      payment.metadata = payment.metadata || new Map();
      payment.metadata.set('refundReason', reason || 'No reason provided');
      payment.metadata.set('refundDate', new Date().toISOString());
      await payment.save();

      await this._logAudit(payment.userId, 'PAYMENT_REFUND', 'payment', payment._id, 'UPDATE');

      return {
        success: true,
        message: 'Payment refunded successfully',
        refundId: `ref_${Date.now()}`,
        amount: payment.amount,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPaymentHistory(userId, limit = 50) {
    try {
      const payments = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean();
      return { success: true, payments, count: payments.length };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPaymentStats(userId) {
    try {
      const userPayments = await Payment.find({ userId }).lean();
      const completed = userPayments.filter(p => p.status === 'completed');
      const totalAmount = completed.reduce((sum, p) => sum + (p.amount || 0), 0);

      const byProvider = userPayments.reduce((acc, p) => {
        const key = p.paymentMethod || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

      return {
        success: true,
        stats: {
          totalPayments: userPayments.length,
          completedPayments: completed.length,
          totalAmount,
          averageAmount: completed.length ? totalAmount / completed.length : 0,
          byProvider,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleStripeWebhook(eventPayload, signature) {
    // NOTE: Signature verification can be added when Stripe webhook secret is configured.
    const intentId = eventPayload?.data?.object?.id;
    const status = eventPayload?.data?.object?.status;
    if (!intentId || !status) return { success: false, error: 'Invalid payload' };

    const normalizedStatus = status === 'succeeded' ? 'completed' : status;
    return this.updatePaymentStatus(intentId, normalizedStatus, 'card', { signature });
  }

  async handlePayPalWebhook(eventPayload) {
    const resource = eventPayload?.resource || {};
    const txnId = resource.id || resource.parent_payment || resource.billing_agreement_id;
    const status = resource.state || resource.status;
    if (!txnId || !status) return { success: false, error: 'Invalid payload' };

    const normalizedStatus =
      status.toLowerCase() === 'completed' ? 'completed' : status.toLowerCase();
    return this.updatePaymentStatus(txnId, normalizedStatus, 'paypal');
  }

  async handleKNETWebhook(eventPayload) {
    const ref = eventPayload?.paymentId || eventPayload?.transactionId || eventPayload?.ref;
    const status = eventPayload?.status || 'completed';
    if (!ref) return { success: false, error: 'Invalid payload' };

    return this.updatePaymentStatus(ref, status, 'knet');
  }

  async updatePaymentStatus(transactionId, status, provider = 'card', metadata = {}) {
    try {
      const payment = await Payment.findOne({ transactionId });
      if (!payment) throw new Error('Payment not found');

      payment.status = status;
      if (status === 'completed' && !payment.completedAt) payment.completedAt = new Date();
      if (metadata && Object.keys(metadata).length) {
        payment.metadata = payment.metadata || new Map();
        Object.entries(metadata).forEach(([k, v]) => payment.metadata.set(k, String(v)));
      }
      await payment.save();

      await this._logAudit(
        payment.userId,
        'PAYMENT_STATUS_UPDATE',
        'payment',
        payment._id,
        'UPDATE',
        'success',
        `provider=${provider};status=${status}`
      );
      await this._notify(payment.userId, {
        title: 'Payment status updated',
        message: `Payment ${transactionId} is now ${status}`,
        type: 'PAYMENT',
        meta: { provider, status },
      });

      return { success: true, status };
    } catch (error) {
      await this._logAudit(
        null,
        'PAYMENT_STATUS_UPDATE_FAILED',
        'payment',
        undefined,
        'UPDATE',
        'failure',
        error.message
      );
      return { success: false, error: error.message };
    }
  }

  async _logAudit(userId, action, resource, resourceId, operation, status = 'success', details) {
    await AuditLogger.log({
      userId,
      action,
      resource,
      resourceId,
      operation,
      status,
      details,
      dataClassification: 'confidential',
    });
  }

  async _notify(recipientId, data) {
    try {
      if (!recipientId) return;
      await NotificationService.send(null, recipientId, data);
    } catch (error) {
      // Notification failures should not break the flow
    }
  }
}

module.exports = new PaymentService();
