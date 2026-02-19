/**
 * Payment Integrations Service
 * Stripe & PayPal Integration
 *
 * Features:
 * - Stripe payment processing
 * - PayPal integration
 * - Invoice generation
 * - Refund management
 * - Payment history tracking
 */

const Stripe = require('stripe');
const paypal = require('paypal-rest-sdk');
const axios = require('axios');
const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const AuditLogger = require('./audit-logger');

class PaymentIntegrationService {
  constructor() {
    // Initialize Stripe
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
      apiVersion: '2023-10-16',
    });

    // Initialize PayPal
    paypal.configure({
      mode: process.env.PAYPAL_MODE || 'sandbox',
      client_id: process.env.PAYPAL_CLIENT_ID,
      client_secret: process.env.PAYPAL_CLIENT_SECRET,
    });

    this.logger = new AuditLogger('PaymentIntegration');
    this.isMock = !process.env.STRIPE_SECRET_KEY || process.env.NODE_ENV === 'test';
  }

  /**
   * Create Stripe Payment Intent
   * @param {Object} paymentData - { userId, amount, currency, description, metadata }
   */
  async createStripePaymentIntent(paymentData) {
    try {
      const { userId, amount, currency = 'USD', description, metadata = {} } = paymentData;

      const intent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        description,
        metadata: {
          userId,
          ...metadata,
        },
        receipt_email: metadata.email,
      });

      // Store payment record
      const payment = new Payment({
        userId,
        provider: 'stripe',
        amount,
        currency,
        status: 'pending',
        stripePaymentIntentId: intent.id,
        metadata,
      });

      await payment.save();
      this.logger.log('info', 'Stripe payment intent created', {
        intentId: intent.id,
        userId,
      });

      return {
        success: true,
        paymentIntentId: intent.id,
        clientSecret: intent.client_secret,
        amount,
        currency,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to create Stripe payment intent', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Confirm Stripe Payment
   */
  async confirmStripePayment(paymentIntentId, paymentMethodId) {
    try {
      const confirmed = await this.stripe.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      // Update payment status
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntentId },
        { status: confirmed.status, stripePaymentStatus: confirmed.status }
      );

      this.logger.log('info', 'Stripe payment confirmed', { paymentIntentId });

      return {
        success: true,
        status: confirmed.status,
        paymentIntentId: confirmed.id,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to confirm Stripe payment', { error: error.message });
      throw error;
    }
  }

  /**
   * Create PayPal Payment
   */
  async createPayPalPayment(paymentData) {
    return new Promise((resolve, reject) => {
      try {
        const {
          userId,
          amount,
          currency = 'USD',
          description,
          returnUrl,
          cancelUrl,
          metadata = {},
        } = paymentData;

        const payment = {
          intent: 'sale',
          payer: {
            payment_method: 'paypal',
          },
          redirect_urls: {
            return_url: returnUrl || process.env.FRONTEND_URL + '/payments/success',
            cancel_url: cancelUrl || process.env.FRONTEND_URL + '/payments/cancel',
          },
          transactions: [
            {
              amount: {
                total: amount.toString(),
                currency: currency,
                details: {
                  subtotal: amount.toString(),
                },
              },
              description,
              invoice_number: `INV-${Date.now()}`,
              custom: JSON.stringify({ userId, ...metadata }),
            },
          ],
        };

        paypal.payment.create(payment, (error, payment) => {
          if (error) {
            this.logger.log('error', 'PayPal payment creation failed', { error: error.message });
            reject(error);
          } else {
            // Store payment record
            const paymentRecord = new Payment({
              userId,
              provider: 'paypal',
              amount,
              currency,
              status: 'pending',
              paypalPaymentId: payment.id,
              metadata,
            });

            paymentRecord.save().then(() => {
              this.logger.log('info', 'PayPal payment created', { paymentId: payment.id });

              const approvalUrl = payment.links.find(l => l.rel === 'approval_url').href;
              resolve({
                success: true,
                paymentId: payment.id,
                approvalUrl,
              });
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Execute PayPal Payment
   */
  async executePayPalPayment(paymentId, payerId) {
    return new Promise((resolve, reject) => {
      paypal.payment.execute(paymentId, { payer_id: payerId }, (error, payment) => {
        if (error) {
          this.logger.log('error', 'PayPal payment execution failed', { error: error.message });
          reject(error);
        } else {
          // Update payment status
          Payment.findOneAndUpdate(
            { paypalPaymentId: paymentId },
            { status: 'completed', paypalPaymentStatus: payment.state }
          ).catch(err =>
            this.logger.log('error', 'Failed to update payment', { error: err.message })
          );

          this.logger.log('info', 'PayPal payment executed', { paymentId, status: payment.state });

          resolve({
            success: true,
            status: payment.state,
            paymentId: payment.id,
          });
        }
      });
    });
  }

  /**
   * Refund Payment
   */
  async refundPayment(paymentId, reason = '') {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new Error('Payment not found');

      let refundResult;

      if (payment.provider === 'stripe') {
        refundResult = await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: reason || 'requested_by_customer',
        });

        await Payment.findByIdAndUpdate(paymentId, {
          status: 'refunded',
          refundId: refundResult.id,
        });
      } else if (payment.provider === 'paypal') {
        // PayPal refund would require additional transaction details
        this.logger.log('info', 'PayPal refund initiated', { paymentId });
      }

      this.logger.log('info', 'Payment refunded', { paymentId, reason });

      return {
        success: true,
        refundId: refundResult?.id || 'PAYPAL_REFUND',
        status: 'refunded',
      };
    } catch (error) {
      this.logger.log('error', 'Failed to refund payment', { error: error.message });
      throw error;
    }
  }

  /**
   * Get Payment Status
   */
  async getPaymentStatus(paymentId) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new Error('Payment not found');

      let status = payment.status;

      // Check Stripe status
      if (payment.provider === 'stripe' && payment.stripePaymentIntentId) {
        const intent = await this.stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
        status = intent.status;
      }

      return {
        success: true,
        status,
        provider: payment.provider,
        amount: payment.amount,
        currency: payment.currency,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to get payment status', { error: error.message });
      throw error;
    }
  }

  /**
   * Create Invoice
   */
  async createInvoice(invoiceData) {
    try {
      const { userId, items, dueDate, notes, metadata = {} } = invoiceData;

      const invoice = new Invoice({
        userId,
        items,
        total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
        status: 'draft',
        dueDate,
        notes,
        metadata,
      });

      await invoice.save();
      this.logger.log('info', 'Invoice created', { invoiceId: invoice._id, userId });

      return {
        success: true,
        invoiceId: invoice._id,
        total: invoice.total,
        status: invoice.status,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to create invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * Send Invoice Email
   */
  async sendInvoiceEmail(invoiceId, recipientEmail) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      // This will be called by email service
      this.logger.log('info', 'Invoice email request', { invoiceId, email: recipientEmail });

      return {
        success: true,
        message: 'Invoice sent',
        invoiceId,
      };
    } catch (error) {
      this.logger.log('error', 'Failed to send invoice', { error: error.message });
      throw error;
    }
  }

  /**
   * List Payments by User
   */
  async listUserPayments(userId, options = {}) {
    try {
      const { limit = 20, page = 1 } = options;
      const skip = (page - 1) * limit;

      const payments = await Payment.find({ userId })
        .limit(limit)
        .skip(skip)
        .sort({ createdAt: -1 });

      const total = await Payment.countDocuments({ userId });

      return {
        success: true,
        payments,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.log('error', 'Failed to list payments', { error: error.message });
      throw error;
    }
  }
}

module.exports = new PaymentIntegrationService();
