/**
 * Portal Payment Service
 * 
 * Handles payment operations and processing
 * - Payment processing
 * - Invoice generation
 * - Installment management
 * - Financial reporting
 */

const PortalPayment = require('../models/PortalPayment');
const Guardian = require('../models/Guardian');
const PortalNotification = require('../models/PortalNotification');

class PaymentService {
  /**
   * Process payment
   * @param {String} paymentId
   * @param {Number} amount
   * @param {String} method
   */
  static async processPayment(paymentId, amount, method) {
    try {
      const payment = await PortalPayment.findById(paymentId);

      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      if (amount <= 0 || amount > (payment.amount - payment.amountPaid)) {
        return { success: false, message: 'Invalid payment amount' };
      }

      // Update payment record
      payment.amountPaid += amount;
      payment.paymentMethod = method;
      payment.paidDate = new Date();

      // Update status
      if (payment.amountPaid >= payment.amount) {
        payment.status = 'paid';
      } else if (payment.amountPaid > 0) {
        payment.status = 'partially_paid';
      }

      await payment.save();

      // Update guardian financial summary
      const guardian = await Guardian.findById(payment.guardianId);
      await guardian.updateFinancialSummary();

      return {
        success: true,
        message: 'Payment processed successfully',
        payment: payment.toObject()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate invoice
   * @param {String} paymentId
   */
  static async generateInvoice(paymentId) {
    try {
      const payment = await PortalPayment.findById(paymentId)
        .populate('guardianId', 'firstName_ar firstName_en email')
        .populate('beneficiaryId', 'firstName_ar firstName_en');

      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      const invoice = {
        invoiceNumber: payment.invoiceNumber,
        date: new Date().toISOString(),
        dueDate: payment.dueDate,
        amount: payment.amount,
        guardian: payment.guardianId,
        beneficiary: payment.beneficiaryId,
        description: payment.description
      };

      // You would integrate with a PDF library here
      // For now, save the invoice metadata
      payment.receiptGenerated = true;
      payment.invoiceSentAt = new Date();
      await payment.save();

      return {
        success: true,
        invoice
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create installment plan
   * @param {String} paymentId
   * @param {Number} numInstallments
   */
  static async createInstallmentPlan(paymentId, numInstallments) {
    try {
      const payment = await PortalPayment.findById(paymentId);

      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      const installmentAmount = payment.amount / numInstallments;
      const daysPerMonth = 30;

      payment.isInstallment = true;
      payment.totalInstallments = numInstallments;
      payment.installmentPlan = [];

      for (let i = 1; i <= numInstallments; i++) {
        const installmentDueDate = new Date(payment.dueDate);
        installmentDueDate.setDate(installmentDueDate.getDate() + (daysPerMonth * (i - 1)));

        payment.installmentPlan.push({
          number: i,
          amount: installmentAmount,
          dueDate: installmentDueDate,
          status: 'pending',
          amountPaid: 0
        });
      }

      await payment.save();

      return {
        success: true,
        message: 'Installment plan created',
        plan: payment.installmentPlan
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Pay installment
   * @param {String} paymentId
   * @param {Number} installmentNumber
   * @param {Number} amount
   */
  static async payInstallment(paymentId, installmentNumber, amount) {
    try {
      const payment = await PortalPayment.findById(paymentId);

      if (!payment || !payment.isInstallment) {
        return { success: false, message: 'Invalid payment or not an installment' };
      }

      const installment = payment.installmentPlan.find(
        ip => ip.number === installmentNumber
      );

      if (!installment) {
        return { success: false, message: 'Installment not found' };
      }

      if (amount <= 0 || amount > (installment.amount - installment.amountPaid)) {
        return { success: false, message: 'Invalid amount' };
      }

      installment.amountPaid += amount;
      if (installment.amountPaid >= installment.amount) {
        installment.status = 'paid';
      }

      payment.amountPaid += amount;

      if (payment.amountPaid >= payment.amount) {
        payment.status = 'paid';
      } else if (payment.amountPaid > 0) {
        payment.status = 'partially_paid';
      }

      await payment.save();

      return {
        success: true,
        message: 'Installment paid',
        payment: payment.toObject()
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply discount
   * @param {String} paymentId
   * @param {Number} discountAmount
   * @param {String} reason
   */
  static async applyDiscount(paymentId, discountAmount, reason) {
    try {
      const payment = await PortalPayment.findById(paymentId);

      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      if (discountAmount > payment.amount) {
        return { success: false, message: 'Discount exceeds payment amount' };
      }

      payment.discountApplied = discountAmount;
      payment.finalAmount = payment.amount - discountAmount;

      await payment.save();

      return {
        success: true,
        message: 'Discount applied',
        discountAmount,
        finalAmount: payment.finalAmount
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply penalty charge
   * @param {String} paymentId
   * @param {Number} penaltyAmount
   */
  static async applyPenaltyCharge(paymentId, penaltyAmount) {
    try {
      const payment = await PortalPayment.findById(paymentId);

      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      payment.penaltyCharge = penaltyAmount;
      payment.finalAmount = payment.amount + penaltyAmount;

      await payment.save();

      return {
        success: true,
        message: 'Penalty applied',
        penaltyCharge: penaltyAmount
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment reminder
   * @param {String} paymentId
   */
  static async sendPaymentReminder(paymentId) {
    try {
      const payment = await PortalPayment.findById(paymentId)
        .populate('guardianId', 'email phone')
        .populate('beneficiaryId', 'firstName_ar');

      if (!payment) {
        return { success: false, message: 'Payment not found' };
      }

      const days = Math.ceil((payment.dueDate - new Date()) / (1000 * 60 * 60 * 24));

      await PortalNotification.createAndSend({
        guardianId: payment.guardianId._id,
        type: 'payment',
        priority: days <= 3 ? 'urgent' : 'normal',
        title_ar: 'تذكير الدفع',
        title_en: 'Payment Reminder',
        message_ar: `يستحق الدفع: ${payment.amount} في ${payment.dueDate.toLocaleDateString('ar-SA')}`,
        message_en: `Payment due: ${payment.amount} on ${payment.dueDate.toLocaleDateString()}`,
        relatedType: 'payment',
        relatedId: paymentId
      });

      payment.reminderSentAt = new Date();
      payment.reminderCount = (payment.reminderCount || 0) + 1;
      await payment.save();

      return {
        success: true,
        message: 'Reminder sent'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Check and update overdue payments
   */
  static async checkAndUpdateOverdue() {
    try {
      const now = new Date();

      const overduePayments = await PortalPayment.find({
        dueDate: { $lt: now },
        status: { $in: ['pending', 'partially_paid'] }
      });

      for (const payment of overduePayments) {
        payment.status = 'overdue';
        payment.daysOverdue = Math.floor((now - payment.dueDate) / (1000 * 60 * 60 * 24));

        // Auto-apply late fee after 30 days
        if (payment.daysOverdue > 30) {
          const lateFee = (payment.amount * 0.05); // 5% late fee
          payment.penaltyCharge = lateFee;
        }

        await payment.save();

        // Notify guardian
        await PortalNotification.createAndSend({
          guardianId: payment.guardianId,
          type: 'alert',
          priority: 'urgent',
          title_ar: 'دفع متأخر',
          title_en: 'Overdue Payment',
          message_ar: 'لديك دفع متأخر يتطلب اهتمامك الفوري',
          message_en: 'You have an overdue payment requiring immediate attention'
        });
      }

      return {
        success: true,
        processed: overduePayments.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Request refund
   * @param {String} paymentId
   * @param {String} reason
   */
  static async requestRefund(paymentId, reason) {
    try {
      const payment = await PortalPayment.findById(paymentId);

      if (!payment || payment.status !== 'paid') {
        return { success: false, message: 'Only paid payments can be refunded' };
      }

      payment.refundAmount = payment.amountPaid;
      payment.refundReason = reason;
      payment.refundRequestedAt = new Date();
      payment.status = 'refund_pending';

      await payment.save();

      // Notify admin
      // await NotificationService.notifyAdminOfRefundRequest(paymentId);

      return {
        success: true,
        message: 'Refund request submitted'
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Process refund
   * @param {String} paymentId
   */
  static async processRefund(paymentId) {
    try {
      const payment = await PortalPayment.findById(paymentId);

      if (!payment || !payment.refundAmount) {
        return { success: false, message: 'No refund pending' };
      }

      payment.refundProcessedAt = new Date();
      payment.status = 'refunded';

      await payment.save();

      // Notify guardian
      await PortalNotification.createAndSend({
        guardianId: payment.guardianId,
        type: 'payment',
        title_ar: 'تم معالجة الاسترداد',
        title_en: 'Refund Processed',
        message_ar: `تم استرجاع المبلغ: ${payment.refundAmount}`,
        message_en: `Refund processed: ${payment.refundAmount}`
      });

      return {
        success: true,
        message: 'Refund processed',
        refundAmount: payment.refundAmount
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Get payment statistics
   * @param {String} guardianId
   */
  static async getPaymentStatistics(guardianId) {
    try {
      const payments = await PortalPayment.find({ guardianId }).lean();

      const stats = {
        totalPayments: payments.length,
        totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
        totalPaid: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amountPaid, 0),
        totalDue: payments
          .filter(p => ['pending', 'partially_paid', 'overdue'].includes(p.status))
          .reduce((sum, p) => sum + (p.amount - p.amountPaid), 0),
        overdue: payments.filter(p => p.status === 'overdue').length,
        pending: payments.filter(p => p.status === 'pending').length,
        paidPercentage: ((payments.filter(p => p.status === 'paid').length / payments.length) * 100).toFixed(2) + '%'
      };

      return stats;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate payment schedule
   * @param {String} guardianId
   * @param {Number} months
   */
  static async generatePaymentSchedule(guardianId, months = 12) {
    try {
      const payments = await PortalPayment.find({ guardianId })
        .sort({ dueDate: 1 })
        .lean();

      const schedule = {
        total: 0,
        expectedMonthly: [],
        paymentsByMonth: {}
      };

      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);
        const monthKey = date.toISOString().slice(0, 7);

        const monthPayments = payments.filter(p => {
          const dueMonth = new Date(p.dueDate).toISOString().slice(0, 7);
          return dueMonth === monthKey;
        });

        const monthTotal = monthPayments.reduce((sum, p) => sum + p.amount, 0);
        if (monthTotal > 0) {
          schedule.expectedMonthly.push({
            month: monthKey,
            amount: monthTotal,
            count: monthPayments.length
          });
          schedule.total += monthTotal;
        }
      }

      return schedule;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = PaymentService;
