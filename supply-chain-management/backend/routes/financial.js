const express = require('express');
const router = express.Router();
const financialIntelligenceService = require('../services/financialIntelligenceService');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Budget = require('../models/Budget');

// Middleware for async error handling
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ==================== PAYMENT ENDPOINTS ====================

/**
 * CREATE PAYMENT
 * POST /api/financial/payments
 */
router.post(
  '/payments',
  asyncHandler(async (req, res) => {
    const { amount, customerId, currency, paymentMethod, paymentGateway, description } = req.body;

    if (!amount || !customerId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, customerId, paymentMethod',
      });
    }

    const transaction = await financialIntelligenceService.createPayment({
      amount,
      customerId,
      currency,
      paymentMethod,
      paymentGateway,
      description,
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Payment created successfully',
    });
  })
);

/**
 * COMPLETE PAYMENT
 * POST /api/financial/payments/:transactionId/complete
 */
router.post(
  '/payments/:transactionId/complete',
  asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { gatewayTransactionId, reference } = req.body;

    if (!gatewayTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'Gateway transaction ID is required',
      });
    }

    const transaction = await financialIntelligenceService.completePayment(
      transactionId,
      gatewayTransactionId,
      reference
    );

    res.status(200).json({
      success: true,
      data: transaction,
      message: 'Payment completed successfully',
    });
  })
);

/**
 * PROCESS REFUND
 * POST /api/financial/payments/:transactionId/refund
 */
router.post(
  '/payments/:transactionId/refund',
  asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, reason',
      });
    }

    const refund = await financialIntelligenceService.processRefund(transactionId, amount, reason);

    res.status(201).json({
      success: true,
      data: refund,
      message: 'Refund processed successfully',
    });
  })
);

/**
 * GET TRANSACTION HISTORY
 * GET /api/financial/payments/transactions/:customerId
 */
router.get(
  '/payments/transactions/:customerId',
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { startDate, endDate, type, status, limit = 50, skip = 0 } = req.query;

    const result = await financialIntelligenceService.getTransactionHistory(customerId, {
      startDate,
      endDate,
      type,
      status,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.status(200).json({
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        limit: result.limit,
        skip: result.skip,
      },
    });
  })
);

/**
 * GET SINGLE TRANSACTION
 * GET /api/financial/payments/:transactionId
 */
router.get(
  '/payments/:transactionId',
  asyncHandler(async (req, res) => {
    const { transactionId } = req.params;
    const transaction = await Transaction.findOne({ transactionId });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  })
);

/**
 * RECONCILE TRANSACTIONS
 * POST /api/financial/payments/reconcile
 */
router.post(
  '/reconcile',
  asyncHandler(async (req, res) => {
    const { bankStatement, notes } = req.body;

    if (!bankStatement || !Array.isArray(bankStatement)) {
      return res.status(400).json({
        success: false,
        error: 'Bank statement array is required',
      });
    }

    const result = await financialIntelligenceService.reconcileTransactions(bankStatement, {
      notes,
    });

    res.status(200).json({
      success: true,
      data: result,
      message: `Reconciliation complete: ${result.matched} matched, ${result.unmatched.length} unmatched`,
    });
  })
);

// ==================== INVOICE ENDPOINTS ====================

/**
 * CREATE INVOICE
 * POST /api/financial/invoices
 */
router.post(
  '/invoices',
  asyncHandler(async (req, res) => {
    const { customerId, vendorId, items, paymentTerms, dueDate } = req.body;

    if (!customerId || !vendorId || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, vendorId, items',
      });
    }

    const invoice = await financialIntelligenceService.createInvoice({
      customerId,
      vendorId,
      items,
      paymentTerms,
      dueDate,
    });

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    });
  })
);

/**
 * SEND INVOICE
 * POST /api/financial/invoices/:invoiceId/send
 */
router.post(
  '/invoices/:invoiceId/send',
  asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email is required',
      });
    }

    const invoice = await financialIntelligenceService.sendInvoice(invoiceId, recipientEmail);

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice sent successfully',
    });
  })
);

/**
 * GET OUTSTANDING INVOICES
 * GET /api/financial/invoices/outstanding/:customerId
 */
router.get(
  '/invoices/outstanding/:customerId',
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const result = await financialIntelligenceService.getOutstandingInvoices(customerId);

    res.status(200).json({
      success: true,
      data: {
        invoices: result.invoices,
        summary: result.summary,
      },
    });
  })
);

/**
 * GET INVOICES BY STATUS
 * GET /api/financial/invoices/status/:status
 */
router.get(
  '/invoices/status/:status',
  asyncHandler(async (req, res) => {
    const { status } = req.params;
    const { customerId } = req.query;

    const invoices = await financialIntelligenceService.getInvoicesByStatus(
      status,
      customerId || null
    );

    res.status(200).json({
      success: true,
      data: invoices,
    });
  })
);

/**
 * GET SINGLE INVOICE
 * GET /api/financial/invoices/:invoiceId
 */
router.get(
  '/invoices/:invoiceId',
  asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  })
);

/**
 * RECORD INVOICE PAYMENT
 * POST /api/financial/invoices/:invoiceId/payment
 */
router.post(
  '/invoices/:invoiceId/payment',
  asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;
    const { amount, transactionId } = req.body;

    if (!amount || !transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: amount, transactionId',
      });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    await invoice.recordPayment(amount, transactionId);

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Payment recorded successfully',
    });
  })
);

/**
 * SEND INVOICE REMINDER
 * POST /api/financial/invoices/:invoiceId/reminder
 */
router.post(
  '/invoices/:invoiceId/reminder',
  asyncHandler(async (req, res) => {
    const { invoiceId } = req.params;

    const invoice = await financialIntelligenceService.sendInvoiceReminder(invoiceId);

    res.status(200).json({
      success: true,
      data: invoice,
      message: 'Invoice reminder sent successfully',
    });
  })
);

// ==================== BUDGET ENDPOINTS ====================

/**
 * CREATE BUDGET
 * POST /api/financial/budgets
 */
router.post(
  '/budgets',
  asyncHandler(async (req, res) => {
    const { budgetName, department, fiscalYear, categories, startDate, endDate } = req.body;

    if (!budgetName || !department || !fiscalYear || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const budget = await financialIntelligenceService.createBudget({
      budgetName,
      department,
      fiscalYear,
      categories,
      startDate,
      endDate,
    });

    res.status(201).json({
      success: true,
      data: budget,
      message: 'Budget created successfully',
    });
  })
);

/**
 * RECORD EXPENSE
 * POST /api/financial/budgets/:budgetId/expense
 */
router.post(
  '/budgets/:budgetId/expense',
  asyncHandler(async (req, res) => {
    const { budgetId } = req.params;
    const { categoryId, amount } = req.body;

    if (!categoryId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: categoryId, amount',
      });
    }

    const budget = await financialIntelligenceService.recordExpense(budgetId, categoryId, amount);

    res.status(200).json({
      success: true,
      data: budget,
      message: 'Expense recorded successfully',
    });
  })
);

/**
 * APPROVE BUDGET
 * POST /api/financial/budgets/:budgetId/approve
 */
router.post(
  '/budgets/:budgetId/approve',
  asyncHandler(async (req, res) => {
    const { budgetId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required',
      });
    }

    const budget = await financialIntelligenceService.approveBudget(budgetId, userId);

    res.status(200).json({
      success: true,
      data: budget,
      message: 'Budget approved successfully',
    });
  })
);

/**
 * ACTIVATE BUDGET
 * POST /api/financial/budgets/:budgetId/activate
 */
router.post(
  '/budgets/:budgetId/activate',
  asyncHandler(async (req, res) => {
    const { budgetId } = req.params;

    const budget = await financialIntelligenceService.activateBudget(budgetId);

    res.status(200).json({
      success: true,
      data: budget,
      message: 'Budget activated successfully',
    });
  })
);

/**
 * GET BUDGET STATUS
 * GET /api/financial/budgets/:budgetId
 */
router.get(
  '/budgets/:budgetId',
  asyncHandler(async (req, res) => {
    const { budgetId } = req.params;

    const status = await financialIntelligenceService.getBudgetStatus(budgetId);

    res.status(200).json({
      success: true,
      data: status,
    });
  })
);

/**
 * GET DEPARTMENT BUDGETS
 * GET /api/financial/budgets/department/:department/:fiscalYear
 */
router.get(
  '/budgets/department/:department/:fiscalYear',
  asyncHandler(async (req, res) => {
    const { department, fiscalYear } = req.params;

    const budgets = await financialIntelligenceService.getDepartmentBudgets(
      department,
      parseInt(fiscalYear)
    );

    res.status(200).json({
      success: true,
      data: budgets,
    });
  })
);

// ==================== ANALYTICS ENDPOINTS ====================

/**
 * GET FINANCIAL SUMMARY
 * GET /api/financial/analytics/summary
 */
router.get(
  '/analytics/summary',
  asyncHandler(async (req, res) => {
    const { startDate, endDate, customerId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
      });
    }

    const summary = await financialIntelligenceService.getFinancialSummary(
      startDate,
      endDate,
      customerId || null
    );

    res.status(200).json({
      success: true,
      data: summary,
    });
  })
);

/**
 * GET CASH FLOW FORECAST
 * GET /api/financial/analytics/cash-flow
 */
router.get(
  '/analytics/cash-flow',
  asyncHandler(async (req, res) => {
    const { days = 30 } = req.query;

    const forecast = await financialIntelligenceService.getCashFlowForecast(parseInt(days));

    res.status(200).json({
      success: true,
      data: forecast,
    });
  })
);

/**
 * GET CUSTOMER PAYMENT ANALYTICS
 * GET /api/financial/analytics/customer/:customerId
 */
router.get(
  '/analytics/customer/:customerId',
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    const analytics = await financialIntelligenceService.getCustomerPaymentAnalytics(customerId);

    res.status(200).json({
      success: true,
      data: analytics,
    });
  })
);

/**
 * GET BUDGET VARIANCE ANALYSIS
 * GET /api/financial/analytics/budget/:budgetId/variance
 */
router.get(
  '/analytics/budget/:budgetId/variance',
  asyncHandler(async (req, res) => {
    const { budgetId } = req.params;

    const variance = await financialIntelligenceService.getBudgetVarianceAnalysis(budgetId);

    res.status(200).json({
      success: true,
      data: variance,
    });
  })
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('[Financial Routes Error]', error.message);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

module.exports = router;
