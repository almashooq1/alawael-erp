const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Budget = require('../models/Budget');
const { EventEmitter } = require('events');
const moment = require('moment');

/**
 * FinancialIntelligenceService
 * Manages payments, invoicing, budgeting, and financial analytics
 * Extends EventEmitter for real-time notifications
 */
class FinancialIntelligenceService extends EventEmitter {
  constructor() {
    super();
    this.name = 'FinancialIntelligenceService';
    console.log(`[${this.name}] Initialized`);
  }

  // ==================== TRANSACTION METHODS ====================

  /**
   * Create payment transaction
   */
  async createPayment(paymentData) {
    try {
      const {
        amount,
        customerId,
        currency = 'USD',
        paymentMethod,
        paymentGateway,
        description,
        orderId,
        invoiceId,
      } = paymentData;

      // Generate unique transaction ID
      const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Calculate net amount (amount minus fees)
      const processingFee = this.calculateProcessingFee(amount, paymentGateway);
      const platformFee = this.calculatePlatformFee(amount);
      const totalFees = processingFee + platformFee;
      const netAmount = amount - totalFees;

      const transaction = new Transaction({
        transactionId,
        type: 'payment',
        amount,
        currency,
        customerId,
        paymentMethod,
        paymentGateway,
        description,
        orderId,
        invoiceId,
        status: 'processing',
        processingFee,
        platformFee,
        totalFees,
        netAmount,
        reconciliationStatus: 'pending',
      });

      await transaction.save();
      this.emit('payment-created', { transactionId, amount, customerId });

      return transaction;
    } catch (error) {
      this.emit('payment-error', { error: error.message });
      throw error;
    }
  }

  /**
   * Mark payment as completed
   */
  async completePayment(transactionId, gatewayTxnId, reference) {
    try {
      const transaction = await Transaction.findOne({ transactionId });
      if (!transaction) throw new Error('Transaction not found');

      await transaction.markAsProcessed(gatewayTxnId, reference);

      // Update invoice if linked
      if (transaction.invoiceId) {
        const invoice = await Invoice.findById(transaction.invoiceId);
        if (invoice) {
          await invoice.recordPayment(transaction.amount, transaction._id);
          this.emit('invoice-payment-received', {
            invoiceId: transaction.invoiceId,
            amountPaid: transaction.amount,
            customerId: transaction.customerId,
          });
        }
      }

      this.emit('payment-completed', { transactionId, amount: transaction.amount });
      return transaction;
    } catch (error) {
      this.emit('payment-completion-error', { error: error.message });
      throw error;
    }
  }

  /**
   * Process refund
   */
  async processRefund(originalTransactionId, amount, reason) {
    try {
      const originalTransaction = await Transaction.findOne({
        transactionId: originalTransactionId,
      });
      if (!originalTransaction) throw new Error('Original transaction not found');

      // Create refund transaction
      const refundId = `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const transaction = new Transaction({
        transactionId: refundId,
        type: 'refund',
        amount: -amount,
        currency: originalTransaction.currency,
        customerId: originalTransaction.customerId,
        invoiceId: originalTransaction.invoiceId,
        paymentMethod: originalTransaction.paymentMethod,
        status: 'processing',
        netAmount: -amount,
        originalTransactionId: originalTransaction._id,
        refundReason: reason,
        refundStatus: 'pending',
      });

      await transaction.save();

      // Mark original transaction as refunding
      await originalTransaction.initiateRefund(amount, reason);

      this.emit('refund-initiated', {
        refundId,
        originalTransactionId,
        amount,
        customerId: originalTransaction.customerId,
      });

      return transaction;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Complete refund
   */
  async completeRefund(refundTransactionId) {
    try {
      const refundTxn = await Transaction.findOne({
        transactionId: refundTransactionId,
      });
      if (!refundTxn) throw new Error('Refund transaction not found');

      const originalTxn = await Transaction.findById(refundTxn.originalTransactionId);
      if (originalTxn) {
        await originalTxn.completeRefund();
      }

      refundTxn.status = 'completed';
      refundTxn.refundStatus = 'completed';
      await refundTxn.save();

      this.emit('refund-completed', {
        refundId: refundTransactionId,
        amount: refundTxn.amount,
      });

      return refundTxn;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(customerId, options = {}) {
    try {
      const { startDate, endDate, type, status, limit = 50, skip = 0 } = options;

      const query = { customerId, deletedAt: null };

      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (type) query.type = type;
      if (status) query.status = status;

      const total = await Transaction.countDocuments(query);
      const transactions = await Transaction.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);

      return { transactions, total, limit, skip };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reconcile transactions
   */
  async reconcileTransactions(bankStatement, options = {}) {
    try {
      const pending = await Transaction.getPendingReconciliation();
      let matched = 0;
      let unmatched = [];

      for (const txn of pending) {
        const statementEntry = bankStatement.find(
          s => Math.abs(s.amount - txn.amount) < 0.01 && Math.abs(s.date - txn.processedAt) < 1
        );

        if (statementEntry) {
          await txn.reconcile(statementEntry, options.notes);
          matched++;
        } else {
          unmatched.push(txn);
        }
      }

      this.emit('reconciliation-complete', { matched, unmatched: unmatched.length });
      return { matched, unmatched };
    } catch (error) {
      throw error;
    }
  }

  // ==================== INVOICE METHODS ====================

  /**
   * Create invoice
   */
  async createInvoice(invoiceData) {
    try {
      const {
        customerId,
        vendorId,
        items = [],
        paymentTerms = 'net30',
        dueDate,
        poNumber,
      } = invoiceData;

      // Calculate amounts
      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const taxAmount = items.reduce(
        (sum, item) => sum + (item.lineTotal * (item.taxRate || 0)) / 100,
        0
      );
      const totalAmount =
        subtotal + taxAmount + (invoiceData.shippingCost || 0) - (invoiceData.discountAmount || 0);

      // Generate invoice number
      const invoiceNumber = `INV-${moment().format('YYYYMMDD')}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Calculate due date if not provided
      const calculatedDueDate = dueDate || this.calculateDueDate(moment(), paymentTerms);

      const invoice = new Invoice({
        invoiceNumber,
        customerId,
        vendorId,
        items,
        subtotal,
        taxAmount,
        totalAmount,
        amountDue: totalAmount,
        issueDate: moment().toDate(),
        dueDate: calculatedDueDate,
        paymentTerms,
        poNumber,
        status: 'draft',
        paymentStatus: 'unpaid',
      });

      await invoice.save();

      this.emit('invoice-created', {
        invoiceId: invoice._id,
        invoiceNumber,
        amount: totalAmount,
        customerId,
      });

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send invoice
   */
  async sendInvoice(invoiceId, recipientEmail) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      await invoice.markAsSent();

      this.emit('invoice-sent', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        recipientEmail,
      });

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get outstanding invoices
   */
  async getOutstandingInvoices(customerId = null) {
    try {
      const invoices = await Invoice.getOverdueInvoices(customerId);
      const outstanding = await Invoice.getTotalOutstanding(customerId);

      return {
        invoices,
        summary: outstanding[0] || {
          totalOutstanding: 0,
          invoiceCount: 0,
          averageInvoice: 0,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get invoices by status
   */
  async getInvoicesByStatus(status, customerId = null) {
    try {
      return await Invoice.getByStatus(status, customerId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send invoice reminder
   */
  async sendInvoiceReminder(invoiceId) {
    try {
      const invoice = await Invoice.findById(invoiceId);
      if (!invoice) throw new Error('Invoice not found');

      await invoice.sendReminder('overdue');

      this.emit('reminder-sent', {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        daysOverdue: -moment(invoice.dueDate).diff(moment(), 'days'),
      });

      return invoice;
    } catch (error) {
      throw error;
    }
  }

  // ==================== BUDGET METHODS ====================

  /**
   * Create budget
   */
  async createBudget(budgetData) {
    try {
      const {
        budgetName,
        department,
        fiscalYear,
        categories = [],
        startDate,
        endDate,
      } = budgetData;

      // Generate budget code
      const budgetCode = `BDG-${department.substring(0, 3).toUpperCase()}-${fiscalYear}-${Date.now() % 10000}`;

      // Calculate total allocated
      const totalAllocated = categories.reduce((sum, cat) => sum + cat.allocatedAmount, 0);

      const budget = new Budget({
        budgetName,
        budgetCode,
        department,
        fiscalYear,
        categories,
        totalAllocated,
        totalAvailable: totalAllocated,
        startDate,
        endDate,
        status: 'draft',
        approvalStatus: 'pending',
      });

      await budget.save();

      this.emit('budget-created', {
        budgetId: budget._id,
        budgetCode,
        totalAllocated,
        department,
      });

      return budget;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record expense against budget
   */
  async recordExpense(budgetId, categoryId, amount) {
    try {
      const budget = await Budget.findById(budgetId);
      if (!budget) throw new Error('Budget not found');

      await budget.recordExpense(amount, categoryId);

      this.emit('expense-recorded', {
        budgetId,
        categoryId,
        amount,
        remainingBalance: budget.totalAvailable,
      });

      return budget;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Approve budget
   */
  async approveBudget(budgetId, userId) {
    try {
      const budget = await Budget.findById(budgetId);
      if (!budget) throw new Error('Budget not found');

      await budget.approve(userId);

      this.emit('budget-approved', {
        budgetId,
        budgetCode: budget.budgetCode,
        totalAllocated: budget.totalAllocated,
      });

      return budget;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Activate budget
   */
  async activateBudget(budgetId) {
    try {
      const budget = await Budget.findById(budgetId);
      if (!budget) throw new Error('Budget not found');

      await budget.activate();

      this.emit('budget-activated', {
        budgetId,
        budgetCode: budget.budgetCode,
      });

      return budget;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get budget status
   */
  async getBudgetStatus(budgetId) {
    try {
      const budget = await Budget.findById(budgetId);
      if (!budget) throw new Error('Budget not found');

      return {
        budget,
        utilizationRate: budget.utilizationRate,
        isOverBudget: budget.percentageUsed > 100,
        daysRemaining: budget.daysRemaining,
        isExpired: budget.isExpired,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get departmental budgets
   */
  async getDepartmentBudgets(department, fiscalYear) {
    try {
      return await Budget.find({
        department,
        fiscalYear,
        deletedAt: null,
      });
    } catch (error) {
      throw error;
    }
  }

  // ==================== ANALYTICS & REPORTING ====================

  /**
   * Get financial summary
   */
  async getFinancialSummary(startDate, endDate, customerId = null) {
    try {
      const query = {
        createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        deletedAt: null,
      };

      if (customerId) query.customerId = customerId;

      const revenue = await Transaction.calculateRevenue(query);
      const outstandingInvoices = await Invoice.getTotalOutstanding(customerId);

      return {
        paymentMetrics: revenue[0] || {
          totalAmount: 0,
          totalFees: 0,
          netRevenue: 0,
          transactionCount: 0,
          averageTransaction: 0,
        },
        outstandingInvoices: outstandingInvoices[0] || {
          totalOutstanding: 0,
          invoiceCount: 0,
          averageInvoice: 0,
        },
        dateRange: { startDate, endDate },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get cash flow forecast
   */
  async getCashFlowForecast(days = 30) {
    try {
      const startDate = moment().toDate();
      const endDate = moment().add(days, 'days').toDate();

      const pendingInvoices = await Invoice.find({
        dueDate: { $gte: startDate, $lte: endDate },
        paymentStatus: { $in: ['unpaid', 'partially_paid'] },
        deletedAt: null,
      }).sort({ dueDate: 1 });

      const forecast = {};
      for (const invoice of pendingInvoices) {
        const date = moment(invoice.dueDate).format('YYYY-MM-DD');
        if (!forecast[date]) {
          forecast[date] = { expected: 0, invoices: [] };
        }
        forecast[date].expected += invoice.amountDue;
        forecast[date].invoices.push(invoice.invoiceNumber);
      }

      return forecast;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get customer payment history
   */
  async getCustomerPaymentAnalytics(customerId) {
    try {
      const transactions = await Transaction.find({
        customerId,
        type: 'payment',
        status: 'completed',
        deletedAt: null,
      }).sort({ createdAt: -1 });

      const invoices = await Invoice.find({
        customerId,
        deletedAt: null,
      });

      const totalPaid = transactions.reduce((sum, t) => sum + t.amount, 0);
      const totalDue = invoices.reduce((sum, i) => sum + i.amountDue, 0);
      const averagePaymentTime = this.calculateAveragePaymentTime(invoices);

      return {
        transactions,
        invoices,
        summary: {
          totalPaid,
          totalDue,
          totalInvoices: invoices.length,
          paidInvoices: invoices.filter(i => i.paymentStatus === 'paid').length,
          overDueInvoices: invoices.filter(i => i.isOverdue).length,
          averagePaymentDays: averagePaymentTime,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get budget variance analysis
   */
  async getBudgetVarianceAnalysis(budgetId) {
    try {
      const budget = await Budget.findById(budgetId);
      if (!budget) throw new Error('Budget not found');

      const categories = budget.categories.map(cat => ({
        ...cat,
        variance: cat.allocatedAmount - cat.spent,
        variancePercent:
          cat.allocatedAmount > 0
            ? ((cat.allocatedAmount - cat.spent) / cat.allocatedAmount) * 100
            : 0,
      }));

      return {
        budget,
        categories,
        totalVariance: budget.totalAllocated - budget.totalSpent,
        variancePercent:
          budget.totalAllocated > 0
            ? ((budget.totalAllocated - budget.totalSpent) / budget.totalAllocated) * 100
            : 0,
      };
    } catch (error) {
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Calculate processing fee based on gateway
   */
  calculateProcessingFee(amount, gateway = 'stripe') {
    const feePercentages = {
      stripe: 0.029, // 2.9%
      paypal: 0.034, // 3.4%
      razorpay: 0.02, // 2%
      square: 0.029, // 2.9%
      custom: 0.025, // 2.5%
    };

    const percentage = feePercentages[gateway] || 0.025;
    return Math.round(amount * percentage);
  }

  /**
   * Calculate platform fee
   */
  calculatePlatformFee(amount) {
    // Platform fee: $0.30 + 0.5%
    return Math.round(30 + amount * 0.005);
  }

  /**
   * Calculate due date based on payment terms
   */
  calculateDueDate(issueDate, paymentTerms) {
    const termDays = {
      immediate: 0,
      net15: 15,
      net30: 30,
      net60: 60,
      net90: 90,
    };

    const days = termDays[paymentTerms] || 30;
    return moment(issueDate).add(days, 'days').toDate();
  }

  /**
   * Calculate average payment time
   */
  calculateAveragePaymentTime(invoices) {
    const paidInvoices = invoices.filter(i => i.paidDate);
    if (paidInvoices.length === 0) return 0;

    const totalDays = paidInvoices.reduce((sum, invoice) => {
      const days = moment(invoice.paidDate).diff(moment(invoice.issueDate), 'days');
      return sum + days;
    }, 0);

    return Math.round(totalDays / paidInvoices.length);
  }
}

// Export singleton instance
module.exports = new FinancialIntelligenceService();
