/**
 * Unit tests for finance.service.js — Finance Service
 * Class with ALL static methods. Models: Transaction, Budget.
 * Also: logger, sanitize(escapeRegex), mongoose(inline for ObjectId).
 */

/* ── Chainable query helper ─────────────────────────────────────────── */
global.__fQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

/* ── Mock Transaction model ─────────────────────────────────────────── */
global.__fTransactionModel = jest.fn(function (data) {
  Object.assign(this, data);
  this._id = 'txn-1';
  this.status = data.status || 'completed';
  this.save = jest.fn().mockResolvedValue(this);
  this.toObject = jest.fn().mockReturnValue({ _id: 'txn-1', ...data, status: 'completed' });
});
global.__fTransactionModel.find = jest.fn(() => global.__fQ([]));
global.__fTransactionModel.findById = jest.fn(() => global.__fQ(null));
global.__fTransactionModel.findByIdAndUpdate = jest.fn(() => global.__fQ(null));
global.__fTransactionModel.countDocuments = jest.fn().mockResolvedValue(0);
global.__fTransactionModel.aggregate = jest.fn().mockResolvedValue([]);

jest.mock('../../models/Transaction', () => global.__fTransactionModel);

/* ── Mock Budget model ──────────────────────────────────────────────── */
global.__fBudgetModel = jest.fn(function (data) {
  Object.assign(this, data);
  this._id = 'bgt-1';
  this.save = jest.fn().mockResolvedValue(this);
  this.toObject = jest.fn().mockReturnValue({ _id: 'bgt-1', ...data });
});
global.__fBudgetModel.find = jest.fn(() => global.__fQ([]));
global.__fBudgetModel.findById = jest.fn(() => global.__fQ(null));
global.__fBudgetModel.findByIdAndUpdate = jest.fn(() => global.__fQ(null));

jest.mock('../../models/Budget', () => global.__fBudgetModel);

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

/* ── Ensure mongoose.Types.ObjectId.isValid is available ─────────────── */
const mongoose = require('mongoose');
if (!mongoose.Types.ObjectId.isValid) {
  mongoose.Types.ObjectId.isValid = jest.fn(() => false);
}

/* ── SUT ────────────────────────────────────────────────────────────── */
const FinanceService = require('../../services/finance.service');
const Transaction = require('../../models/Transaction');
const Budget = require('../../models/Budget');
const Q = global.__fQ;

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  Transaction.find.mockImplementation(() => Q([]));
  Transaction.findById.mockImplementation(() => Q(null));
  Transaction.findByIdAndUpdate.mockImplementation(() => Q(null));
  Transaction.countDocuments.mockResolvedValue(0);
  Transaction.aggregate.mockResolvedValue([]);
  Budget.find.mockImplementation(() => Q([]));
  Budget.findById.mockImplementation(() => Q(null));
  Budget.findByIdAndUpdate.mockImplementation(() => Q(null));
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('FinanceService', () => {
  /* ── createTransaction ───────────────────────────────────────────── */
  describe('createTransaction', () => {
    test('creates valid transaction', async () => {
      const res = await FinanceService.createTransaction({
        userId: 'u1',
        amount: 500,
        type: 'income',
        description: 'Salary',
      });
      expect(res.success).toBe(true);
      expect(res.transaction).toBeDefined();
    });

    test('throws for amount <= 0', async () => {
      await expect(
        FinanceService.createTransaction({
          amount: 0,
          type: 'income',
          description: 'X',
        })
      ).rejects.toThrow('positive number');
    });

    test('throws for invalid type', async () => {
      await expect(
        FinanceService.createTransaction({
          amount: 100,
          type: 'invalid',
          description: 'X',
        })
      ).rejects.toThrow('Invalid transaction type');
    });

    test('throws for missing description', async () => {
      await expect(
        FinanceService.createTransaction({
          amount: 100,
          type: 'income',
        })
      ).rejects.toThrow('Description is required');
    });
  });

  /* ── getTransactions ─────────────────────────────────────────────── */
  describe('getTransactions', () => {
    test('returns paginated transactions', async () => {
      Transaction.find.mockImplementation(() => Q([{ _id: 't1' }]));
      Transaction.countDocuments.mockResolvedValue(1);
      const res = await FinanceService.getTransactions('u1');
      expect(res.success).toBe(true);
      expect(res.transactions).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    test('applies filters', async () => {
      Transaction.find.mockImplementation(() => Q([]));
      await FinanceService.getTransactions('u1', {
        type: 'income',
        category: 'salary',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        status: 'completed',
        search: 'test',
      });
      expect(Transaction.find).toHaveBeenCalled();
    });
  });

  /* ── getTransactionById ──────────────────────────────────────────── */
  describe('getTransactionById', () => {
    test('returns transaction', async () => {
      Transaction.findById.mockImplementation(() => Q({ _id: 't1' }));
      const res = await FinanceService.getTransactionById('t1');
      expect(res.success).toBe(true);
    });

    test('throws for not found', async () => {
      await expect(FinanceService.getTransactionById('nope')).rejects.toThrow('not found');
    });
  });

  /* ── getBalance ──────────────────────────────────────────────────── */
  describe('getBalance', () => {
    test('calculates balance from aggregates', async () => {
      Transaction.aggregate
        .mockResolvedValueOnce([{ _id: null, total: 10000 }]) // income
        .mockResolvedValueOnce([{ _id: null, total: 3000 }]); // expense
      const res = await FinanceService.getBalance('u1');
      expect(res.success).toBe(true);
      expect(res.totalIncome).toBe(10000);
      expect(res.totalExpense).toBe(3000);
      expect(res.balance).toBe(7000);
    });

    test('handles zero totals', async () => {
      Transaction.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      const res = await FinanceService.getBalance('u1');
      expect(res.balance).toBe(0);
    });
  });

  /* ── updateTransaction ───────────────────────────────────────────── */
  describe('updateTransaction', () => {
    test('updates transaction', async () => {
      Transaction.findByIdAndUpdate.mockImplementation(() => Q({ _id: 't1', amount: 999 }));
      const res = await FinanceService.updateTransaction('t1', { amount: 999 });
      expect(res.success).toBe(true);
    });

    test('throws for not found', async () => {
      await expect(FinanceService.updateTransaction('nope', {})).rejects.toThrow('not found');
    });
  });

  /* ── deleteTransaction ───────────────────────────────────────────── */
  describe('deleteTransaction', () => {
    test('soft-deletes transaction', async () => {
      Transaction.findByIdAndUpdate.mockImplementation(() => Q({ _id: 't1' }));
      const res = await FinanceService.deleteTransaction('t1');
      expect(res.success).toBe(true);
      expect(res.deletedId).toBe('t1');
    });

    test('throws for not found', async () => {
      await expect(FinanceService.deleteTransaction('nope')).rejects.toThrow('not found');
    });
  });

  /* ── createBudget ────────────────────────────────────────────────── */
  describe('createBudget', () => {
    test('creates valid budget', async () => {
      const res = await FinanceService.createBudget({
        userId: 'u1',
        name: 'Marketing',
        limit: 5000,
        category: 'marketing',
      });
      expect(res.success).toBe(true);
      expect(res.budget).toBeDefined();
    });

    test('throws for missing name', async () => {
      await expect(FinanceService.createBudget({ limit: 5000 })).rejects.toThrow(
        'Name and positive limit'
      );
    });

    test('throws for limit <= 0', async () => {
      await expect(FinanceService.createBudget({ name: 'X', limit: 0 })).rejects.toThrow(
        'Name and positive limit'
      );
    });
  });

  /* ── getBudgets ──────────────────────────────────────────────────── */
  describe('getBudgets', () => {
    test('returns budgets with spent amounts', async () => {
      Budget.find.mockImplementation(() => Q([{ _id: 'b1', category: 'marketing', limit: 5000 }]));
      Transaction.aggregate.mockResolvedValue([{ _id: null, total: 2000 }]);
      const res = await FinanceService.getBudgets('u1');
      expect(res.success).toBe(true);
      expect(res.budgets).toHaveLength(1);
      expect(res.budgets[0].spent).toBe(2000);
      expect(res.budgets[0].remaining).toBe(3000);
    });
  });

  /* ── getBudgetById ───────────────────────────────────────────────── */
  describe('getBudgetById', () => {
    test('returns budget', async () => {
      Budget.findById.mockImplementation(() => Q({ _id: 'b1' }));
      const res = await FinanceService.getBudgetById('b1');
      expect(res.success).toBe(true);
    });

    test('throws for not found', async () => {
      await expect(FinanceService.getBudgetById('nope')).rejects.toThrow('not found');
    });
  });

  /* ── checkBudgetStatus ───────────────────────────────────────────── */
  describe('checkBudgetStatus', () => {
    test('returns ok status when under budget', async () => {
      const budgetDoc = { _id: 'b1', limit: 10000, category: 'general', save: jest.fn() };
      Budget.findById.mockResolvedValue(budgetDoc);
      Transaction.aggregate.mockResolvedValue([{ _id: null, total: 5000 }]);
      const res = await FinanceService.checkBudgetStatus('b1');
      expect(res.success).toBe(true);
      expect(res.status).toBe('ok');
      expect(res.percentageUsed).toBe(50);
      expect(budgetDoc.save).toHaveBeenCalled();
    });

    test('returns warning when > 80%', async () => {
      const budgetDoc = { _id: 'b2', limit: 10000, category: 'ops', save: jest.fn() };
      Budget.findById.mockResolvedValue(budgetDoc);
      Transaction.aggregate.mockResolvedValue([{ _id: null, total: 8500 }]);
      const res = await FinanceService.checkBudgetStatus('b2');
      expect(res.status).toBe('warning');
    });

    test('returns exceeded when > 100%', async () => {
      const budgetDoc = { _id: 'b3', limit: 10000, category: 'x', save: jest.fn() };
      Budget.findById.mockResolvedValue(budgetDoc);
      Transaction.aggregate.mockResolvedValue([{ _id: null, total: 12000 }]);
      const res = await FinanceService.checkBudgetStatus('b3');
      expect(res.status).toBe('exceeded');
    });

    test('throws for not found', async () => {
      await expect(FinanceService.checkBudgetStatus('nope')).rejects.toThrow('not found');
    });
  });

  /* ── deleteBudget ────────────────────────────────────────────────── */
  describe('deleteBudget', () => {
    test('soft-deletes budget', async () => {
      Budget.findByIdAndUpdate.mockImplementation(() => Q({ _id: 'b1' }));
      const res = await FinanceService.deleteBudget('b1');
      expect(res.success).toBe(true);
      expect(res.deletedId).toBe('b1');
    });

    test('throws for not found', async () => {
      await expect(FinanceService.deleteBudget('nope')).rejects.toThrow('not found');
    });
  });

  /* ── reconcile ───────────────────────────────────────────────────── */
  describe('reconcile', () => {
    test('reconciles with no discrepancies', async () => {
      Transaction.find.mockImplementation(() => Q([{ _id: 't1', amount: 100 }]));
      const res = await FinanceService.reconcile('u1');
      expect(res.success).toBe(true);
      expect(res.reconciled).toBe(true);
      expect(res.discrepancies).toBe(0);
    });

    test('detects discrepancies', async () => {
      Transaction.find.mockImplementation(() => Q([{ _id: 't1', amount: 0 }]));
      const res = await FinanceService.reconcile('u1');
      expect(res.discrepancies).toBe(1);
    });
  });

  /* ── getSummary ──────────────────────────────────────────────────── */
  describe('getSummary', () => {
    test('returns financial summary', async () => {
      Transaction.find.mockImplementation(() =>
        Q([
          { type: 'income', amount: 5000, category: 'salary' },
          { type: 'expense', amount: 1000, category: 'food' },
        ])
      );
      const res = await FinanceService.getSummary('u1', '2024-01-01', '2024-12-31');
      expect(res.success).toBe(true);
      expect(res.summary.totalIncome).toBe(5000);
      expect(res.summary.totalExpense).toBe(1000);
      expect(res.summary.balance).toBe(4000);
      expect(res.byCategory.salary.income).toBe(5000);
      expect(res.byCategory.food.expense).toBe(1000);
    });
  });

  /* ── exportTransactions ──────────────────────────────────────────── */
  describe('exportTransactions', () => {
    test('exports transactions', async () => {
      Transaction.find.mockImplementation(() => Q([{ _id: 't1' }]));
      const res = await FinanceService.exportTransactions('u1', 'json');
      expect(res.success).toBe(true);
      expect(res.count).toBe(1);
      expect(res.format).toBe('json');
    });
  });

  /* ── getCategories ───────────────────────────────────────────────── */
  describe('getCategories', () => {
    test('returns category list', async () => {
      const res = await FinanceService.getCategories();
      expect(res.success).toBe(true);
      expect(res.categories.length).toBeGreaterThan(0);
      expect(res.categories).toContain('income');
    });
  });

  /* ── bulkCreateTransactions ──────────────────────────────────────── */
  describe('bulkCreateTransactions', () => {
    test('creates multiple transactions', async () => {
      const txns = [
        { amount: 100, type: 'income', description: 'A' },
        { amount: 200, type: 'expense', description: 'B' },
      ];
      const res = await FinanceService.bulkCreateTransactions('u1', txns);
      expect(res.success).toBe(true);
      expect(res.created).toBe(2);
    });

    test('throws for empty array', async () => {
      await expect(FinanceService.bulkCreateTransactions('u1', [])).rejects.toThrow('Invalid');
    });
  });

  /* ── getStatistics ───────────────────────────────────────────────── */
  describe('getStatistics', () => {
    test('returns statistics', async () => {
      Transaction.find.mockImplementation(() =>
        Q([
          { type: 'income', amount: 5000 },
          { type: 'expense', amount: 2000 },
        ])
      );
      const res = await FinanceService.getStatistics('u1');
      expect(res.success).toBe(true);
      expect(res.statistics.totalTransactions).toBe(2);
      expect(res.statistics.incomeTransactions).toBe(1);
      expect(res.statistics.expenseTransactions).toBe(1);
      expect(res.statistics.averageTransaction).toBe(3500);
    });
  });
});
