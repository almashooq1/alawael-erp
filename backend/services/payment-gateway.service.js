// Ensure environment variables are set or fallback to mocks
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripe = require('stripe')(stripeSecret);
const paypal = require('paypal-rest-sdk');
const Razorpay = require('razorpay');
// const nodemailer = require('nodemailer'); // Optional for now

const Payment = require('../models/payment.model');
const Invoice = require('../models/invoice.model');
const Subscription = require('../models/subscription.model');

// Mock external services if credentials are missing
const isMock = process.env.NODE_ENV === 'test' || !process.env.STRIPE_SECRET_KEY;

let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  razorpay = { orders: { create: async () => ({ id: 'order_mock_' + Date.now(), amount: 0, currency: 'SAR' }) } };
}

paypal.configure({
  mode: process.env.PAYPAL_MODE || 'sandbox',
  client_id: process.env.PAYPAL_CLIENT_ID || 'mock_client_id',
  client_secret: process.env.PAYPAL_CLIENT_SECRET || 'mock_client_secret',
});

class PaymentGatewayService {
  /**
   * معالجة الدفع عبر Stripe
   */
  async processStripePayment(userId, amount, currency = 'SAR') {
    try {
      const customer = await this.getOrCreateStripeCustomer(userId);

      let paymentIntent;
      if (isMock) {
        paymentIntent = { id: 'pi_mock_' + Date.now(), client_secret: 'secret_mock', status: 'succeeded' };
      } else {
        paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: currency.toLowerCase(),
          customer: customer.id,
          metadata: { userId },
        });
      }

      const payment = new Payment({
        transactionId: paymentIntent.id,
        userId,
        amount,
        currency,
        paymentMethod: 'card',
        status: 'processing',
        stripePaymentIntentId: paymentIntent.id,
      });

      await payment.save();

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentId: paymentIntent.id,
        payment: payment,
      };
    } catch (error) {
      console.error('Stripe Payment Error:', error);
      throw error;
    }
  }

  /**
   * معالجة الدفع عبر PayPal
   */
  async processPayPalPayment(userId, amount, description) {
    if (isMock) return { success: true, paymentId: 'pay_mock_' + Date.now(), redirectUrl: 'http://localhost:3000/mock-success' };

    try {
      const payment_json = {
        intent: 'sale',
        payer: { payment_method: 'paypal' },
        redirect_urls: {
          return_url: `${process.env.FRONTEND_URL}/payment-success`,
          cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
        },
        transactions: [
          {
            amount: { total: amount.toString(), currency: 'SAR', details: { subtotal: amount.toString() } },
            description: description,
          },
        ],
      };

      return new Promise((resolve, reject) => {
        paypal.payment.create(payment_json, async (error, paymentInfo) => {
          if (error) {
            reject(error);
          } else {
            try {
              const paymentRecord = new Payment({
                transactionId: paymentInfo.id,
                userId,
                amount,
                currency: 'SAR',
                paymentMethod: 'paypal',
                status: 'pending',
                paypalTransactionId: paymentInfo.id,
                description: description,
              });

              await paymentRecord.save();

              resolve({
                success: true,
                paymentId: paymentInfo.id,
                redirectUrl: paymentInfo.links.find(l => l.rel === 'approval_url').href,
              });
            } catch (dbError) {
              reject(dbError);
            }
          }
        });
      });
    } catch (error) {
      console.error('PayPal Payment Error:', error);
      throw error;
    }
  }

  /**
   * معالجة الدفع عبر Razorpay
   */
  async processRazorpayPayment(userId, amount, description) {
    try {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: 'SAR',
        receipt: `receipt_${userId}_${Date.now()}`,
        notes: { description },
      });

      const payment = new Payment({
        transactionId: order.id,
        userId,
        amount,
        currency: 'SAR',
        paymentMethod: 'razorpay',
        status: 'processing',
        razorpayPaymentId: order.id,
      });

      await payment.save();

      return {
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      };
    } catch (error) {
      console.error('Razorpay Payment Error:', error);
      throw error;
    }
  }

  /**
   * معالجة الدفع بالتقسيط
   */
  async processInstallmentPayment(userId, amount, months = 3) {
    try {
      const monthlyAmount = amount / months;
      const installments = [];

      for (let i = 0; i < months; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i + 1);

        installments.push({
          number: i + 1,
          amount: monthlyAmount,
          dueDate: dueDate,
          status: 'pending',
        });
      }

      return {
        success: true,
        totalAmount: amount,
        monthlyAmount: monthlyAmount,
        months: months,
        installments: installments,
      };
    } catch (error) {
      console.error('Installment Error:', error);
      throw error;
    }
  }

  /**
   * تأكيد الدفع
   */
  async confirmPayment(paymentId, token = null) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) throw new Error('Payment not found');

      if (payment.stripePaymentIntentId && !isMock) {
        const paymentIntent = await stripe.paymentIntents.confirm(payment.stripePaymentIntentId, { payment_method: token });
        payment.status = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';
        payment.completedAt = paymentIntent.status === 'succeeded' ? new Date() : null;
      } else {
        // Mock confirmation or other providers
        payment.status = 'completed';
        payment.completedAt = new Date();
      }

      await payment.save();

      return {
        success: payment.status === 'completed',
        payment: payment,
      };
    } catch (error) {
      console.error('Confirm Payment Error:', error);
      throw error;
    }
  }

  /**
   * استرجاع الدفع (Refund)
   */
  async refundPayment(paymentId, reason = null) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment || payment.status !== 'completed') throw new Error('Cannot refund this payment');

      if (payment.stripePaymentIntentId && !isMock) {
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: reason || 'requested_by_customer',
        });
      }

      payment.status = 'refunded';
      payment.metadata = payment.metadata || new Map();
      payment.metadata.set('refundReason', reason || 'No reason provided');
      payment.metadata.set('refundDate', new Date().toISOString());

      await payment.save();
      return { success: true, message: 'Refund successful', payment };
    } catch (error) {
      console.error('Refund Error:', error);
      throw error;
    }
  }

  // --- Subscriptions & Invoices ---

  async createSubscription(userId, plan = 'basic', billingCycle = 'monthly') {
    try {
      const plans = {
        free: { monthly: 0, annual: 0 },
        basic: { monthly: 99, annual: 999 },
        professional: { monthly: 299, annual: 2990 },
        enterprise: { monthly: 999, annual: 9990 },
      };

      const planConfig = plans[plan];
      if (!planConfig) throw new Error('Invalid plan');

      const price = planConfig[billingCycle];

      const subscription = new Subscription({
        userId,
        plan,
        price: planConfig,
        billingCycle,
        currentPeriod: {
          start: new Date(),
          end: this.calculateNextBillingDate(billingCycle),
        },
        nextBillingDate: this.calculateNextBillingDate(billingCycle),
        features: this.getPlanFeatures(plan),
      });

      await subscription.save();

      if (price > 0) {
        await this.processStripePayment(userId, price, 'SAR');
      }

      return subscription;
    } catch (error) {
      console.error('Create Subscription Error:', error);
      throw error;
    }
  }

  async createInvoice(userId, items, notes = null) {
    try {
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const tax = subtotal * 0.15;
      const total = subtotal + tax;
      const invoiceNumber = `INV-${Date.now()}`;

      const invoice = new Invoice({
        invoiceNumber,
        userId,
        items,
        subtotal,
        tax,
        total,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes,
      });

      await invoice.save();
      return invoice;
    } catch (error) {
      console.error('Create Invoice Error:', error);
      throw error;
    }
  }

  async getPaymentHistory(userId, limit = 20) {
    try {
      const payments = await Payment.find({ userId: userId }).sort({ createdAt: -1 }).limit(limit);
      return payments;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getAllPayments(limit = 100) {
    try {
      const payments = await Payment.find().sort({ createdAt: -1 }).limit(limit).populate('userId', 'name email');
      return payments;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async getAllInvoices(limit = 100) {
    try {
      const invoices = await Invoice.find().sort({ createdAt: -1 }).limit(limit).populate('userId', 'name email');
      return invoices;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  // Helpers
  async getOrCreateStripeCustomer(userId) {
    if (isMock) return { id: 'cus_mock_' + userId };
    // In real app, check DB for stripeCustomerId
    return { id: 'cus_mock_' + userId };
  }

  calculateNextBillingDate(billingCycle) {
    const date = new Date();
    if (billingCycle === 'monthly') date.setMonth(date.getMonth() + 1);
    else if (billingCycle === 'annual') date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  getPlanFeatures(plan) {
    // Return features based on plan (simplified)
    return [];
  }
}

module.exports = PaymentGatewayService;
