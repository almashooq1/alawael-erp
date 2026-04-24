/**
 * financial-statements-service.test.js — Phase 12 Commit 1.
 *
 * Unit tests for the new financial statements builders:
 *   Trial Balance, P&L, Cash Flow, Budget vs Actual,
 *   Aged AR / Aged AP, Branch consolidation.
 *
 * Uses injected model stubs — no Mongo, no network.
 */

'use strict';

const {
  buildTrialBalance,
  buildProfitAndLoss,
  buildCashFlow,
  buildBudgetVsActual,
  buildAgedReceivables,
  buildAgedPayables,
  consolidateBranchStatements,
  _internal,
} = require('../services/finance/financialStatementsService');

function mockJournalModel(entries) {
  return {
    find: jest.fn(filter => {
      const out = (entries || []).filter(e => {
        if (filter.status && e.status !== filter.status) return false;
        if (filter.deleted_at === null && e.deleted_at) return false;
        if (filter.branch_id && String(e.branch_id) !== String(filter.branch_id)) return false;
        if (filter.entry_date) {
          const d = new Date(e.entry_date).getTime();
          if (filter.entry_date.$gte && d < filter.entry_date.$gte.getTime()) return false;
          if (filter.entry_date.$lte && d > filter.entry_date.$lte.getTime()) return false;
          if (filter.entry_date.$lt && d >= filter.entry_date.$lt.getTime()) return false;
        }
        return true;
      });
      return {
        lean: () => Promise.resolve(out),
        then: (r, rj) => Promise.resolve(out).then(r, rj),
      };
    }),
  };
}

function mockCoaModel(accounts) {
  return {
    find: jest.fn(filter => {
      const out = (accounts || []).filter(a => {
        if (filter.is_active !== undefined && a.is_active !== filter.is_active) return false;
        return true;
      });
      return {
        lean: () => Promise.resolve(out),
        then: (r, rj) => Promise.resolve(out).then(r, rj),
      };
    }),
  };
}

function mockInvoiceModel(invoices) {
  return {
    find: jest.fn(filter => {
      const out = (invoices || []).filter(i => {
        if (filter.status && filter.status.$in && !filter.status.$in.includes(i.status))
          return false;
        if (filter.branchId && String(i.branchId) !== String(filter.branchId)) return false;
        return true;
      });
      return {
        lean: () => Promise.resolve(out),
        then: (r, rj) => Promise.resolve(out).then(r, rj),
      };
    }),
  };
}

function mockExpenseModel(expenses) {
  return {
    find: jest.fn(filter => {
      const out = (expenses || []).filter(e => {
        if (filter.status && e.status !== filter.status) return false;
        if (filter.branch_id && String(e.branch_id) !== String(filter.branch_id)) return false;
        return true;
      });
      return {
        lean: () => Promise.resolve(out),
        then: (r, rj) => Promise.resolve(out).then(r, rj),
      };
    }),
  };
}

function mockBudgetModel(budgets) {
  return {
    find: jest.fn(filter => {
      const out = (budgets || []).filter(b => {
        if (filter.fiscalYear && b.fiscalYear !== filter.fiscalYear) return false;
        if (filter.branch_id && String(b.branch_id) !== String(filter.branch_id)) return false;
        return true;
      });
      return {
        lean: () => Promise.resolve(out),
        then: (r, rj) => Promise.resolve(out).then(r, rj),
      };
    }),
  };
}

const COA = [
  {
    _id: 'a-1100',
    code: '1100',
    name_ar: 'النقدية',
    account_type: 'asset',
    account_subtype: 'cash',
    normal_balance: 'debit',
    is_active: true,
  },
  {
    _id: 'a-1200',
    code: '1200',
    name_ar: 'الذمم المدينة',
    account_type: 'asset',
    account_subtype: 'current_asset',
    normal_balance: 'debit',
    is_active: true,
  },
  {
    _id: 'a-2300',
    code: '2300',
    name_ar: 'ضريبة القيمة المضافة',
    account_type: 'liability',
    account_subtype: 'current_liability',
    normal_balance: 'credit',
    is_active: true,
  },
  {
    _id: 'a-4100',
    code: '4100',
    name_ar: 'إيرادات خدمات التأهيل',
    account_type: 'revenue',
    account_subtype: 'service_revenue',
    normal_balance: 'credit',
    is_active: true,
  },
  {
    _id: 'a-5100',
    code: '5100',
    name_ar: 'مصروف الرواتب',
    account_type: 'expense',
    account_subtype: 'salaries',
    normal_balance: 'debit',
    is_active: true,
  },
  {
    _id: 'a-5200',
    code: '5200',
    name_ar: 'إيجار',
    account_type: 'expense',
    account_subtype: 'rent',
    normal_balance: 'debit',
    is_active: true,
  },
];

function invoiceEntry({ branch = 'br1', date = '2026-03-15', amount = 1000, vat = 150 } = {}) {
  return {
    status: 'posted',
    deleted_at: null,
    entry_date: new Date(date),
    entry_type: 'invoice',
    branch_id: branch,
    lines: [
      { account_code: '1200', debit: amount + vat, credit: 0 },
      { account_code: '4100', debit: 0, credit: amount },
      { account_code: '2300', debit: 0, credit: vat },
    ],
  };
}

function paymentEntry({ branch = 'br1', date = '2026-03-20', amount = 1150 } = {}) {
  return {
    status: 'posted',
    deleted_at: null,
    entry_date: new Date(date),
    entry_type: 'payment',
    branch_id: branch,
    lines: [
      { account_code: '1100', debit: amount, credit: 0 },
      { account_code: '1200', debit: 0, credit: amount },
    ],
  };
}

function payrollEntry({ branch = 'br1', date = '2026-03-28', salary = 5000 } = {}) {
  return {
    status: 'posted',
    deleted_at: null,
    entry_date: new Date(date),
    entry_type: 'payroll',
    branch_id: branch,
    lines: [
      { account_code: '5100', debit: salary, credit: 0 },
      { account_code: '1100', debit: 0, credit: salary },
    ],
  };
}

describe('financialStatementsService — Trial Balance', () => {
  test('balances debit and credit totals across posted entries', async () => {
    const tb = await buildTrialBalance({
      JournalEntryModel: mockJournalModel([invoiceEntry(), paymentEntry(), payrollEntry()]),
      ChartOfAccountModel: mockCoaModel(COA),
      asOfDate: new Date('2026-04-01'),
    });
    expect(tb.totals.isBalanced).toBe(true);
    expect(tb.totals.debit).toBe(tb.totals.credit);
  });

  test('excludes draft and reversed entries', async () => {
    const tb = await buildTrialBalance({
      JournalEntryModel: mockJournalModel([
        invoiceEntry(),
        { ...invoiceEntry(), status: 'draft' },
        { ...payrollEntry(), status: 'reversed' },
      ]),
      ChartOfAccountModel: mockCoaModel(COA),
      asOfDate: new Date('2026-04-01'),
    });
    // only invoiceEntry counted: 1150 total
    expect(tb.totals.debit).toBe(1150);
  });

  test('scopes to a single branch when branchId given', async () => {
    const tb = await buildTrialBalance({
      JournalEntryModel: mockJournalModel([
        invoiceEntry({ branch: 'br1' }),
        invoiceEntry({ branch: 'br2' }),
      ]),
      ChartOfAccountModel: mockCoaModel(COA),
      asOfDate: new Date('2026-04-01'),
      branchId: 'br1',
    });
    expect(tb.branchId).toBe('br1');
    expect(tb.totals.debit).toBe(1150); // only one branch
  });
});

describe('financialStatementsService — Profit & Loss', () => {
  test('computes revenue, expenses, and net income for the period', async () => {
    const pl = await buildProfitAndLoss({
      JournalEntryModel: mockJournalModel([
        invoiceEntry({ amount: 1000 }),
        invoiceEntry({ amount: 500 }),
        payrollEntry({ salary: 800 }),
      ]),
      ChartOfAccountModel: mockCoaModel(COA),
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
    });
    expect(pl.revenue.total).toBe(1500);
    expect(pl.expenses.total).toBe(800);
    expect(pl.netIncome).toBe(700);
    expect(pl.expenses.byCategory.salaries).toBe(800);
  });

  test('ignores entries outside the period window', async () => {
    const pl = await buildProfitAndLoss({
      JournalEntryModel: mockJournalModel([
        invoiceEntry({ date: '2026-03-15', amount: 1000 }),
        invoiceEntry({ date: '2026-05-15', amount: 9999 }),
      ]),
      ChartOfAccountModel: mockCoaModel(COA),
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
    });
    expect(pl.revenue.total).toBe(1000);
  });

  test('returns zeros when no matching postings', async () => {
    const pl = await buildProfitAndLoss({
      JournalEntryModel: mockJournalModel([]),
      ChartOfAccountModel: mockCoaModel(COA),
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
    });
    expect(pl.revenue.total).toBe(0);
    expect(pl.expenses.total).toBe(0);
    expect(pl.netIncome).toBe(0);
  });
});

describe('financialStatementsService — Cash Flow', () => {
  test('inflows are positive movements on cash/bank accounts', async () => {
    const cf = await buildCashFlow({
      JournalEntryModel: mockJournalModel([
        paymentEntry({ amount: 1150 }),
        payrollEntry({ salary: 500 }),
      ]),
      ChartOfAccountModel: mockCoaModel(COA),
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
    });
    expect(cf.totals.inflow).toBe(1150);
    expect(cf.totals.outflow).toBe(500);
    expect(cf.totals.net).toBe(650);
  });

  test('groups cash movements by entry_type', async () => {
    const cf = await buildCashFlow({
      JournalEntryModel: mockJournalModel([
        paymentEntry({ amount: 1000 }),
        payrollEntry({ salary: 400 }),
      ]),
      ChartOfAccountModel: mockCoaModel(COA),
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-31'),
    });
    const byType = Object.fromEntries(cf.byType.map(r => [r.entry_type, r]));
    expect(byType.payment.inflow).toBe(1000);
    expect(byType.payroll.outflow).toBe(400);
  });
});

describe('financialStatementsService — Budget vs Actual', () => {
  test('compares posted actuals to budget lines and flags overruns', async () => {
    const bva = await buildBudgetVsActual({
      BudgetModel: mockBudgetModel([
        {
          fiscalYear: 2026,
          name: 'FY26 OpEx',
          lines: [
            { accountId: 'a-5100', amount: 1000 },
            { accountId: 'a-5200', amount: 500 },
          ],
        },
      ]),
      JournalEntryModel: mockJournalModel([payrollEntry({ salary: 1200 })]),
      ChartOfAccountModel: mockCoaModel(COA),
      fiscalYear: 2026,
    });
    const salaries = bva.lines.find(l => l.accountCode === '5100');
    expect(salaries.budgeted).toBe(1000);
    expect(salaries.actual).toBe(1200);
    expect(salaries.variance).toBe(-200);
    expect(salaries.status).toBe('over');
    const rent = bva.lines.find(l => l.accountCode === '5200');
    expect(rent.status).toBe('under');
  });

  test('returns empty shape when no budgets exist for the year', async () => {
    const bva = await buildBudgetVsActual({
      BudgetModel: mockBudgetModel([]),
      JournalEntryModel: mockJournalModel([]),
      ChartOfAccountModel: mockCoaModel(COA),
      fiscalYear: 2030,
    });
    expect(bva.lines).toEqual([]);
    expect(bva.totals.budgeted).toBe(0);
  });
});

describe('financialStatementsService — Aged Receivables', () => {
  test('buckets unpaid invoices by days overdue', async () => {
    const asOf = new Date('2026-04-22');
    const ar = await buildAgedReceivables({
      InvoiceModel: mockInvoiceModel([
        {
          _id: 'i1',
          invoiceNumber: 'INV-1',
          status: 'ISSUED',
          totalAmount: 1000,
          amountPaid: 0,
          dueDate: new Date('2026-04-10'),
          branchId: 'br1',
        },
        {
          _id: 'i2',
          invoiceNumber: 'INV-2',
          status: 'OVERDUE',
          totalAmount: 2000,
          amountPaid: 500,
          dueDate: new Date('2026-02-10'),
          branchId: 'br1',
        },
        {
          _id: 'i3',
          invoiceNumber: 'INV-3',
          status: 'PAID',
          totalAmount: 500,
          amountPaid: 500,
          dueDate: new Date('2026-02-10'),
          branchId: 'br1',
        },
      ]),
      asOfDate: asOf,
    });
    expect(ar.rows).toHaveLength(2); // paid one skipped (not in unpaid statuses + outstanding=0)
    expect(ar.totalOutstanding).toBe(1000 + 1500);
    const inv1 = ar.rows.find(r => r.invoiceNumber === 'INV-1');
    expect(inv1.bucket).toBe('0-30');
    const inv2 = ar.rows.find(r => r.invoiceNumber === 'INV-2');
    expect(['61-90', '31-60', '91-120']).toContain(inv2.bucket);
  });
});

describe('financialStatementsService — Aged Payables', () => {
  test('groups approved-unpaid expenses into buckets', async () => {
    const ap = await buildAgedPayables({
      ExpenseModel: mockExpenseModel([
        {
          _id: 'e1',
          status: 'approved',
          amount: 500,
          vendor: 'V1',
          category: 'rent',
          date: new Date('2026-04-01'),
          branch_id: 'br1',
        },
        {
          _id: 'e2',
          status: 'approved',
          amount: 800,
          vendor: 'V2',
          category: 'utilities',
          date: new Date('2026-01-01'),
          branch_id: 'br1',
          paid: true,
        },
        {
          _id: 'e3',
          status: 'pending',
          amount: 200,
          vendor: 'V3',
          category: 'other',
          date: new Date('2026-04-01'),
          branch_id: 'br1',
        },
      ]),
      asOfDate: new Date('2026-04-22'),
    });
    expect(ap.rows).toHaveLength(1); // paid one and pending one excluded
    expect(ap.totalOutstanding).toBe(500);
  });
});

describe('financialStatementsService — Branch consolidation', () => {
  test('sums per-branch P&Ls into a consolidated view', () => {
    const branch1 = {
      branchId: 'br1',
      revenue: { byAccount: [{ code: '4100', name_ar: 'إيرادات', amount: 1000 }], total: 1000 },
      expenses: {
        byAccount: [{ code: '5100', name_ar: 'رواتب', subtype: 'salaries', amount: 600 }],
        byCategory: { salaries: 600 },
        total: 600,
      },
      netIncome: 400,
    };
    const branch2 = {
      branchId: 'br2',
      revenue: { byAccount: [{ code: '4100', name_ar: 'إيرادات', amount: 500 }], total: 500 },
      expenses: {
        byAccount: [{ code: '5100', name_ar: 'رواتب', subtype: 'salaries', amount: 300 }],
        byCategory: { salaries: 300 },
        total: 300,
      },
      netIncome: 200,
    };
    const consol = consolidateBranchStatements({ branchStatements: [branch1, branch2] });
    expect(consol.revenue.total).toBe(1500);
    expect(consol.expenses.total).toBe(900);
    expect(consol.netIncome).toBe(600);
    expect(consol.branches).toHaveLength(2);
  });

  test('applies inter-branch eliminations', () => {
    const branch1 = {
      branchId: 'br1',
      revenue: { byAccount: [{ code: '4100', name_ar: 'إيرادات', amount: 1000 }], total: 1000 },
      expenses: { byAccount: [], byCategory: {}, total: 0 },
      netIncome: 1000,
    };
    const branch2 = {
      branchId: 'br2',
      revenue: { byAccount: [], total: 0 },
      expenses: {
        byAccount: [{ code: '5200', name_ar: 'إيجار', subtype: 'rent', amount: 200 }],
        byCategory: { rent: 200 },
        total: 200,
      },
      netIncome: -200,
    };
    const consol = consolidateBranchStatements({
      branchStatements: [branch1, branch2],
      eliminations: [{ accountCode: '4100', amount: 100 }],
    });
    // revenue reduced by 100 via elimination
    expect(consol.revenue.total).toBe(900);
    expect(consol.netIncome).toBe(700);
  });
});

describe('financialStatementsService — internal helpers', () => {
  test('bucketize picks the right label', () => {
    const buckets = _internal.DEFAULT_AGING_BUCKETS;
    expect(_internal.bucketize(10, buckets)).toBe('0-30');
    expect(_internal.bucketize(45, buckets)).toBe('31-60');
    expect(_internal.bucketize(200, buckets)).toBe('120+');
  });

  test('ageInDays returns 0 for not-yet-due', () => {
    const d = _internal.ageInDays({ dueDate: new Date('2026-05-01') }, new Date('2026-04-22'));
    expect(d).toBe(0);
  });
});
