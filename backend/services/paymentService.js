/**
 * Payment Gateway Integration Service
 * Supports Stripe, PayPal, and KNET (Saudi)
 */

// In-memory storage (replace with MongoDB)
let payments = new Map();
let invoices = new Map();
let paymentMethods = new Map();

class PaymentService {
  /**
   * Initialize payment with Stripe
   */
  async initializeStripePayment(userId, amount, currency = 'SAR', metadata = {}) {
    try {
      const paymentId = `stripe_${Date.now()}`;

      const payment = {
        id: paymentId,
        provider: 'stripe',
        userId,
        amount,
        currency,
        status: 'pending',
        metadata,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };

      payments.set(paymentId, payment);

      // In production, call Stripe API
      // const intent = await stripe.paymentIntents.create({...})

      return {
        success: true,
        message: 'Payment initialized',
        paymentId,
        clientSecret: 'pi_' + Math.random().toString(36).substr(2, 20),
        amount,
        currency,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Confirm Stripe payment
   */
  async confirmStripePayment(paymentId, paymentMethod) {
    try {
      const payment = payments.get(paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      // In production, confirm with Stripe
      // const confirmed = await stripe.paymentIntents.confirm(...)

      payment.status = 'completed';
      payment.completedAt = new Date();
      payment.paymentMethod = paymentMethod;
      payment.transactionId = 'txn_' + Math.random().toString(36).substr(2, 15);

      payments.set(paymentId, payment);

      return {
        success: true,
        message: 'Payment completed successfully',
        transactionId: payment.transactionId,
        amount: payment.amount,
        currency: payment.currency,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initialize PayPal payment
   */
  async initializePayPalPayment(userId, amount, currency = 'SAR', metadata = {}) {
    try {
      const paymentId = `paypal_${Date.now()}`;

      const payment = {
        id: paymentId,
        provider: 'paypal',
        userId,
        amount,
        currency,
        status: 'pending',
        metadata,
        createdAt: new Date(),
      };

      payments.set(paymentId, payment);

      // In production, call PayPal API
      // const order = await client.execute(request)

      return {
        success: true,
        message: 'PayPal payment initialized',
        paymentId,
        approvalUrl: 'https://www.paypal.com/checkoutnow?token=ec-xxx',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initialize KNET payment (Saudi Arabia)
   */
  async initializeKNETPayment(userId, amount, currency = 'SAR', metadata = {}) {
    try {
      const paymentId = `knet_${Date.now()}`;

      const payment = {
        id: paymentId,
        provider: 'knet',
        userId,
        amount,
        currency,
        status: 'pending',
        metadata,
        createdAt: new Date(),
      };

      payments.set(paymentId, payment);

      // In production, call KNET API
      // const response = await knetGateway.initiateTransaction(...)

      return {
        success: true,
        message: 'KNET payment initialized',
        paymentId,
        redirectUrl: 'https://knet.gateway.com/payment?ref=' + paymentId,
        amount,
        currency: 'SAR',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId) {
    try {
      const payment = payments.get(paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      return {
        success: true,
        payment: {
          id: payment.id,
          status: payment.status,
          provider: payment.provider,
          amount: payment.amount,
          currency: payment.currency,
          createdAt: payment.createdAt,
          completedAt: payment.completedAt,
          transactionId: payment.transactionId,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create invoice
   */
  async createInvoice(userId, items, metadata = {}) {
    try {
      const invoiceId = `inv_${Date.now()}`;

      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const invoice = {
        id: invoiceId,
        userId,
        items,
        totalAmount,
        currency: metadata.currency || 'SAR',
        status: 'draft',
        createdAt: new Date(),
        dueDate: metadata.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata,
      };

      invoices.set(invoiceId, invoice);

      return {
        success: true,
        message: 'Invoice created',
        invoiceId,
        totalAmount,
        currency: invoice.currency,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send invoice
   */
  async sendInvoice(invoiceId, recipientEmail) {
    try {
      const invoice = invoices.get(invoiceId);

      if (!invoice) {
        return {
          success: false,
          error: 'Invoice not found',
        };
      }

      invoice.status = 'sent';
      invoice.sentAt = new Date();
      invoice.sentTo = recipientEmail;

      // In production, send via email service
      // await emailService.sendInvoice(recipientEmail, invoice)

      invoices.set(invoiceId, invoice);

      return {
        success: true,
        message: 'Invoice sent successfully',
        sentTo: recipientEmail,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Save payment method
   */
  async savePaymentMethod(userId, paymentMethod, metadata = {}) {
    try {
      const methodId = `pm_${Date.now()}`;

      const method = {
        id: methodId,
        userId,
        type: paymentMethod.type, // 'card', 'paypal', 'knet'
        lastFour: paymentMethod.lastFour,
        expiryDate: paymentMethod.expiryDate,
        isDefault: paymentMethod.isDefault || false,
        metadata,
        createdAt: new Date(),
      };

      paymentMethods.set(methodId, method);

      return {
        success: true,
        message: 'Payment method saved',
        methodId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get saved payment methods
   */
  async getSavedPaymentMethods(userId) {
    try {
      const methods = Array.from(paymentMethods.values())
        .filter(m => m.userId === userId)
        .map(m => ({
          id: m.id,
          type: m.type,
          lastFour: m.lastFour,
          expiryDate: m.expiryDate,
          isDefault: m.isDefault,
          createdAt: m.createdAt,
        }));

      return {
        success: true,
        methods,
        count: methods.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete payment method
   */
  async deletePaymentMethod(methodId) {
    try {
      paymentMethods.delete(methodId);

      return {
        success: true,
        message: 'Payment method deleted',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId, reason = '') {
    try {
      const payment = payments.get(paymentId);

      if (!payment) {
        return {
          success: false,
          error: 'Payment not found',
        };
      }

      if (payment.status !== 'completed') {
        return {
          success: false,
          error: 'Payment cannot be refunded',
        };
      }

      const refundId = `ref_${Date.now()}`;

      payment.status = 'refunded';
      payment.refundId = refundId;
      payment.refundReason = reason;
      payment.refundedAt = new Date();

      payments.set(paymentId, payment);

      // In production, call payment provider API

      return {
        success: true,
        message: 'Payment refunded successfully',
        refundId,
        amount: payment.amount,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId, limit = 50) {
    try {
      const userPayments = Array.from(payments.values())
        .filter(p => p.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      return {
        success: true,
        payments: userPayments,
        count: userPayments.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate payment statistics
   */
  async getPaymentStats(userId) {
    try {
      const userPayments = Array.from(payments.values()).filter(p => p.userId === userId);

      const stats = {
        totalPayments: userPayments.length,
        completedPayments: userPayments.filter(p => p.status === 'completed').length,
        totalAmount: userPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0),
        averageAmount: 0,
        byProvider: {},
      };

      // Calculate average
      if (stats.completedPayments > 0) {
        stats.averageAmount = stats.totalAmount / stats.completedPayments;
      }

      // Count by provider
      userPayments.forEach(p => {
        stats.byProvider[p.provider] = (stats.byProvider[p.provider] || 0) + 1;
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = PaymentService;
