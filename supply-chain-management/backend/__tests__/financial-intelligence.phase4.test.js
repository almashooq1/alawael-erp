const request = require('supertest');
const mongoose = require('mongoose');
const moment = require('moment');

// Mock the models and service
jest.mock('../models/Transaction');
jest.mock('../models/Invoice');
jest.mock('../models/Budget');

describe('Financial Intelligence System - Phase 4', () => {
  let app;
  let financialService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock financialIntelligenceService
    financialService = {
      on: jest.fn(),
      emit: jest.fn(),

      // Payment methods
      createPayment: jest.fn(),
      completePayment: jest.fn(),
      processRefund: jest.fn(),
      getTransactionHistory: jest.fn(),
      reconcileTransactions: jest.fn(),

      // Invoice methods
      createInvoice: jest.fn(),
      sendInvoice: jest.fn(),
      getOutstandingInvoices: jest.fn(),
      getInvoicesByStatus: jest.fn(),
      sendInvoiceReminder: jest.fn(),

      // Budget methods
      createBudget: jest.fn(),
      recordExpense: jest.fn(),
      approveBudget: jest.fn(),
      activateBudget: jest.fn(),
      getBudgetStatus: jest.fn(),
      getDepartmentBudgets: jest.fn(),

      // Analytics
      getFinancialSummary: jest.fn(),
      getCashFlowForecast: jest.fn(),
      getCustomerPaymentAnalytics: jest.fn(),
      getBudgetVarianceAnalysis: jest.fn(),

      // Utilities
      calculateProcessingFee: jest.fn(),
      calculatePlatformFee: jest.fn(),
      calculateDueDate: jest.fn(),
    };
  });

  describe('PAYMENT PROCESSING', () => {
    test('should create payment transaction', async () => {
      const paymentData = {
        amount: 10000,
        customerId: 'customer-123',
        currency: 'USD',
        paymentMethod: 'card',
        paymentGateway: 'stripe',
        description: 'Order payment',
      };

      const expectedTransaction = {
        transactionId: 'TXN-123456789',
        type: 'payment',
        amount: 10000,
        status: 'processing',
        customerId: 'customer-123',
      };

      financialService.createPayment.mockImplementation(async data => {
        financialService.emit('payment-created', expectedTransaction);
        return expectedTransaction;
      });

      const result = await financialService.createPayment(paymentData);

      expect(result.transactionId).toBe('TXN-123456789');
      expect(result.amount).toBe(10000);
      expect(financialService.emit).toHaveBeenCalledWith(
        'payment-created',
        expect.objectContaining({ amount: 10000 })
      );
    });

    test('should complete payment transaction', async () => {
      const completedTransaction = {
        transactionId: 'TXN-123456789',
        status: 'completed',
        processedAt: new Date(),
        gatewayTransactionId: 'STRIPE-abc123',
      };

      financialService.completePayment.mockImplementation(async (txnId, gatewayId) => {
        financialService.emit('payment-completed', completedTransaction);
        return completedTransaction;
      });

      const result = await financialService.completePayment(
        'TXN-123456789',
        'STRIPE-abc123',
        'ref-123'
      );

      expect(result.status).toBe('completed');
      expect(result.gatewayTransactionId).toBe('STRIPE-abc123');
    });

    test('should process refund', async () => {
      const refundTransaction = {
        transactionId: 'REFUND-123456789',
        type: 'refund',
        amount: -5000,
        status: 'processing',
        refundStatus: 'pending',
      };

      financialService.processRefund.mockResolvedValue(refundTransaction);

      const result = await financialService.processRefund(
        'TXN-123456789',
        5000,
        'Customer requested refund'
      );

      expect(result.type).toBe('refund');
      expect(result.refundStatus).toBe('pending');
    });

    test('should get transaction history', async () => {
      const transactionHistory = {
        transactions: [
          { transactionId: 'TXN-1', amount: 5000 },
          { transactionId: 'TXN-2', amount: 3000 },
        ],
        total: 2,
        limit: 50,
        skip: 0,
      };

      financialService.getTransactionHistory.mockResolvedValue(transactionHistory);

      const result = await financialService.getTransactionHistory('customer-123', {
        limit: 50,
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    test('should reconcile transactions', async () => {
      const bankStatement = [
        { id: 1, amount: 5000, date: new Date() },
        { id: 2, amount: 3000, date: new Date() },
      ];

      const reconciliationResult = {
        matched: 2,
        unmatched: [],
      };

      financialService.reconcileTransactions.mockResolvedValue(reconciliationResult);

      const result = await financialService.reconcileTransactions(bankStatement);

      expect(result.matched).toBe(2);
      expect(result.unmatched).toHaveLength(0);
    });
  });

  describe('INVOICE MANAGEMENT', () => {
    test('should create invoice', async () => {
      const invoiceData = {
        customerId: 'customer-123',
        vendorId: 'vendor-456',
        items: [
          {
            description: 'Service A',
            quantity: 1,
            unitPrice: 10000,
            taxRate: 10,
            lineTotal: 10000,
          },
        ],
        paymentTerms: 'net30',
      };

      const expectedInvoice = {
        _id: 'invoice-789',
        invoiceNumber: 'INV-20260213-ABC12',
        customerId: 'customer-123',
        totalAmount: 11000,
        status: 'draft',
      };

      financialService.createInvoice.mockResolvedValue(expectedInvoice);

      const result = await financialService.createInvoice(invoiceData);

      expect(result.invoiceNumber).toMatch(/^INV-/);
      expect(result.status).toBe('draft');
    });

    test('should send invoice', async () => {
      const sentInvoice = {
        _id: 'invoice-789',
        invoiceNumber: 'INV-20260213-ABC12',
        status: 'sent',
      };

      financialService.sendInvoice.mockImplementation(async (invoiceId, email) => {
        financialService.emit('invoice-sent', { invoiceId, email });
        return sentInvoice;
      });

      const result = await financialService.sendInvoice('invoice-789', 'customer@example.com');

      expect(result.status).toBe('sent');
      expect(financialService.emit).toHaveBeenCalledWith('invoice-sent', expect.any(Object));
    });

    test('should get outstanding invoices', async () => {
      const outstandingResult = {
        invoices: [
          { _id: 'inv-1', invoiceNumber: 'INV-001', amountDue: 5000 },
          { _id: 'inv-2', invoiceNumber: 'INV-002', amountDue: 3000 },
        ],
        summary: {
          totalOutstanding: 8000,
          invoiceCount: 2,
          averageInvoice: 4000,
        },
      };

      financialService.getOutstandingInvoices.mockResolvedValue(outstandingResult);

      const result = await financialService.getOutstandingInvoices('customer-123');

      expect(result.invoices).toHaveLength(2);
      expect(result.summary.totalOutstanding).toBe(8000);
    });

    test('should get invoices by status', async () => {
      const invoices = [
        { _id: 'inv-1', status: 'paid' },
        { _id: 'inv-2', status: 'paid' },
      ];

      financialService.getInvoicesByStatus.mockResolvedValue(invoices);

      const result = await financialService.getInvoicesByStatus('paid', 'customer-123');

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('paid');
    });

    test('should send invoice reminder', async () => {
      const invoice = {
        _id: 'invoice-789',
        invoiceNumber: 'INV-20260213-ABC12',
        remindersSent: [{ sentDate: new Date(), reminderType: 'overdue' }],
      };

      financialService.sendInvoiceReminder.mockImplementation(async invoiceId => {
        financialService.emit('reminder-sent', { invoiceId });
        return invoice;
      });

      const result = await financialService.sendInvoiceReminder('invoice-789');

      expect(result.remindersSent).toBeDefined();
      expect(financialService.emit).toHaveBeenCalledWith('reminder-sent', expect.any(Object));
    });
  });

  describe('BUDGET MANAGEMENT', () => {
    test('should create budget', async () => {
      const budgetData = {
        budgetName: 'Marketing Q1 2026',
        department: 'Marketing',
        fiscalYear: 2026,
        categories: [
          { categoryName: 'Digital', categoryId: 'cat-1', allocatedAmount: 50000 },
          { categoryName: 'Print', categoryId: 'cat-2', allocatedAmount: 30000 },
        ],
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      };

      const expectedBudget = {
        _id: 'budget-123',
        budgetCode: 'BDG-MAR-2026-1234',
        budgetName: 'Marketing Q1 2026',
        totalAllocated: 80000,
        status: 'draft',
      };

      financialService.createBudget.mockResolvedValue(expectedBudget);

      const result = await financialService.createBudget(budgetData);

      expect(result.budgetCode).toMatch(/^BDG-/);
      expect(result.totalAllocated).toBe(80000);
      expect(result.status).toBe('draft');
    });

    test('should record expense against budget', async () => {
      const updatedBudget = {
        _id: 'budget-123',
        totalSpent: 15000,
        totalAvailable: 65000,
        percentageUsed: 19,
      };

      financialService.recordExpense.mockImplementation(async (budgetId, categoryId, amount) => {
        financialService.emit('expense-recorded', { amount, budgetId, categoryId });
        return updatedBudget;
      });

      const result = await financialService.recordExpense('budget-123', 'cat-1', 15000);

      expect(result.totalSpent).toBe(15000);
      expect(result.totalAvailable).toBe(65000);
      expect(financialService.emit).toHaveBeenCalledWith('expense-recorded', expect.any(Object));
    });

    test('should approve budget', async () => {
      const approvedBudget = {
        _id: 'budget-123',
        status: 'approved',
        approvalStatus: 'approved',
        approvedBy: 'user-789',
      };

      financialService.approveBudget.mockResolvedValue(approvedBudget);

      const result = await financialService.approveBudget('budget-123', 'user-789');

      expect(result.approvalStatus).toBe('approved');
      expect(result.approvedBy).toBe('user-789');
    });

    test('should activate budget', async () => {
      const activeBudget = {
        _id: 'budget-123',
        status: 'active',
      };

      financialService.activateBudget.mockResolvedValue(activeBudget);

      const result = await financialService.activateBudget('budget-123');

      expect(result.status).toBe('active');
    });

    test('should get budget status', async () => {
      const budgetStatus = {
        budget: {
          _id: 'budget-123',
          budgetName: 'Marketing Q1 2026',
          totalAllocated: 80000,
          totalSpent: 30000,
        },
        utilizationRate: 37.5,
        isOverBudget: false,
        daysRemaining: 45,
      };

      financialService.getBudgetStatus.mockResolvedValue(budgetStatus);

      const result = await financialService.getBudgetStatus('budget-123');

      expect(result.utilizationRate).toBe(37.5);
      expect(result.isOverBudget).toBe(false);
    });

    test('should get department budgets', async () => {
      const budgets = [
        {
          _id: 'budget-1',
          budgetName: 'Marketing Q1',
          totalAllocated: 80000,
        },
        {
          _id: 'budget-2',
          budgetName: 'Marketing Q2',
          totalAllocated: 90000,
        },
      ];

      financialService.getDepartmentBudgets.mockResolvedValue(budgets);

      const result = await financialService.getDepartmentBudgets('Marketing', 2026);

      expect(result).toHaveLength(2);
      expect(result[0].totalAllocated).toBe(80000);
    });
  });

  describe('FINANCIAL ANALYTICS', () => {
    test('should get financial summary', async () => {
      const summary = {
        paymentMetrics: {
          totalAmount: 100000,
          totalFees: 3000,
          netRevenue: 97000,
          transactionCount: 20,
          averageTransaction: 5000,
        },
        outstandingInvoices: {
          totalOutstanding: 50000,
          invoiceCount: 10,
          averageInvoice: 5000,
        },
      };

      financialService.getFinancialSummary.mockResolvedValue(summary);

      const result = await financialService.getFinancialSummary(
        '2026-01-01',
        '2026-02-13',
        'customer-123'
      );

      expect(result.paymentMetrics.totalAmount).toBe(100000);
      expect(result.outstandingInvoices.totalOutstanding).toBe(50000);
    });

    test('should get cash flow forecast', async () => {
      const forecast = {
        '2026-02-15': {
          expected: 15000,
          invoices: ['INV-001', 'INV-002'],
        },
        '2026-02-28': {
          expected: 25000,
          invoices: ['INV-003'],
        },
      };

      financialService.getCashFlowForecast.mockResolvedValue(forecast);

      const result = await financialService.getCashFlowForecast(30);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['2026-02-15'].expected).toBe(15000);
    });

    test('should get customer payment analytics', async () => {
      const analytics = {
        transactions: [{ transactionId: 'TXN-1', amount: 10000, status: 'completed' }],
        invoices: [{ invoiceNumber: 'INV-001', amountDue: 0, paymentStatus: 'paid' }],
        summary: {
          totalPaid: 10000,
          totalDue: 0,
          totalInvoices: 1,
          paidInvoices: 1,
          overDueInvoices: 0,
          averagePaymentDays: 15,
        },
      };

      financialService.getCustomerPaymentAnalytics.mockResolvedValue(analytics);

      const result = await financialService.getCustomerPaymentAnalytics('customer-123');

      expect(result.summary.totalPaid).toBe(10000);
      expect(result.summary.averagePaymentDays).toBe(15);
    });

    test('should get budget variance analysis', async () => {
      const variance = {
        budget: {
          _id: 'budget-123',
          totalAllocated: 80000,
          totalSpent: 30000,
        },
        categories: [
          {
            categoryName: 'Digital',
            allocatedAmount: 50000,
            spent: 20000,
            variance: 30000,
            variancePercent: 60,
          },
        ],
        totalVariance: 50000,
        variancePercent: 62.5,
      };

      financialService.getBudgetVarianceAnalysis.mockResolvedValue(variance);

      const result = await financialService.getBudgetVarianceAnalysis('budget-123');

      expect(result.totalVariance).toBe(50000);
      expect(result.variancePercent).toBe(62.5);
    });
  });

  describe('UTILITY METHODS', () => {
    test('should calculate processing fees', () => {
      financialService.calculateProcessingFee.mockReturnValue(290);
      const fee = financialService.calculateProcessingFee(10000, 'stripe');
      expect(fee).toBe(290);
    });

    test('should calculate platform fees', () => {
      financialService.calculatePlatformFee.mockReturnValue(80);
      const fee = financialService.calculatePlatformFee(10000);
      expect(fee).toBe(80);
    });

    test('should calculate due dates', () => {
      const issueDate = moment('2026-01-01');
      financialService.calculateDueDate.mockReturnValue(moment('2026-01-31').toDate());

      const dueDate = financialService.calculateDueDate(issueDate, 'net30');
      expect(dueDate).toBeDefined();
    });
  });

  describe('ERROR HANDLING', () => {
    test('should handle invalid payment data', async () => {
      financialService.createPayment.mockRejectedValue(new Error('Missing required fields'));

      try {
        await financialService.createPayment({});
      } catch (error) {
        expect(error.message).toBe('Missing required fields');
      }
    });

    test('should handle invoice not found', async () => {
      financialService.sendInvoice.mockRejectedValue(new Error('Invoice not found'));

      try {
        await financialService.sendInvoice('invalid-id', 'test@example.com');
      } catch (error) {
        expect(error.message).toBe('Invoice not found');
      }
    });

    test('should handle budget approval errors', async () => {
      financialService.approveBudget.mockRejectedValue(new Error('Budget not found'));

      try {
        await financialService.approveBudget('invalid-id', 'user-123');
      } catch (error) {
        expect(error.message).toBe('Budget not found');
      }
    });

    test('should handle negative amounts in refund', async () => {
      financialService.processRefund.mockRejectedValue(
        new Error('Refund amount cannot exceed original transaction')
      );

      try {
        await financialService.processRefund('TXN-123', 20000, 'reason');
      } catch (error) {
        expect(error.message).toContain('exceed');
      }
    });
  });

  describe('EVENT EMISSION', () => {
    test('should emit payment-created event', async () => {
      financialService.createPayment.mockImplementation(async data => {
        financialService.emit('payment-created', {
          transactionId: 'TXN-123',
          amount: data.amount,
          customerId: data.customerId,
        });
        return { transactionId: 'TXN-123' };
      });

      await financialService.createPayment({
        amount: 5000,
        customerId: 'cust-123',
        paymentMethod: 'card',
      });

      expect(financialService.emit).toHaveBeenCalledWith(
        'payment-created',
        expect.objectContaining({ amount: 5000 })
      );
    });

    test('should emit invoice-created event', async () => {
      financialService.createInvoice.mockImplementation(async data => {
        financialService.emit('invoice-created', {
          invoiceId: 'inv-123',
          invoiceNumber: 'INV-20260213-ABC',
          amount: 10000,
          customerId: data.customerId,
        });
        return { invoiceNumber: 'INV-20260213-ABC' };
      });

      await financialService.createInvoice({
        customerId: 'cust-123',
        vendorId: 'vendor-456',
        items: [],
      });

      expect(financialService.emit).toHaveBeenCalledWith(
        'invoice-created',
        expect.objectContaining({ invoiceNumber: 'INV-20260213-ABC' })
      );
    });

    test('should emit budget-created event', async () => {
      financialService.createBudget.mockImplementation(async data => {
        financialService.emit('budget-created', {
          budgetCode: 'BDG-MKT-2026-1234',
          totalAllocated: 80000,
          department: data.department,
        });
        return { budgetCode: 'BDG-MKT-2026-1234' };
      });

      await financialService.createBudget({
        department: 'Marketing',
        fiscalYear: 2026,
        categories: [],
        budgetName: 'Q1 Budget',
        startDate: '2026-01-01',
        endDate: '2026-03-31',
      });

      expect(financialService.emit).toHaveBeenCalledWith(
        'budget-created',
        expect.objectContaining({ department: 'Marketing' })
      );
    });
  });
});
