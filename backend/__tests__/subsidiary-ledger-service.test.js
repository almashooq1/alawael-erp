/**
 * subsidiary-ledger-service.test.js — Phase 12 Commit 3.
 *
 * AR/AP subsidiary ledgers + GL control account reconciliation.
 */

'use strict';

const {
  buildAccountsReceivableLedger,
  buildAccountsPayableLedger,
  reconcileControlAccount,
  DEFAULT_AR_CONTROL_CODE,
  DEFAULT_AP_CONTROL_CODE,
} = require('../services/finance/subsidiaryLedgerService');

function mockModel(rows, branchField = 'branchId') {
  return {
    find: jest.fn(filter => {
      const out = (rows || []).filter(r => {
        if (filter.status && filter.status.$in && !filter.status.$in.includes(r.status))
          return false;
        if (filter.status && !filter.status.$in && r.status !== filter.status) return false;
        if (filter.deleted_at === null && r.deleted_at) return false;
        if (filter[branchField] && String(r[branchField]) !== String(filter[branchField]))
          return false;
        if (filter.branch_id && String(r.branch_id) !== String(filter.branch_id)) return false;
        if (filter.entry_date && filter.entry_date.$lte) {
          const d = new Date(r.entry_date).getTime();
          if (d > filter.entry_date.$lte.getTime()) return false;
        }
        return true;
      });
      return { lean: () => Promise.resolve(out) };
    }),
  };
}

describe('subsidiaryLedgerService — AR ledger', () => {
  test('groups invoices by beneficiary and computes outstanding', async () => {
    const invoices = [
      {
        _id: 'i1',
        beneficiary: 'b1',
        branchId: 'br1',
        totalAmount: 1000,
        amountPaid: 0,
        status: 'ISSUED',
        issueDate: new Date('2026-03-01'),
        dueDate: new Date('2026-03-31'),
      },
      {
        _id: 'i2',
        beneficiary: 'b1',
        branchId: 'br1',
        totalAmount: 500,
        amountPaid: 500,
        status: 'PAID',
        issueDate: new Date('2026-02-01'),
      },
      {
        _id: 'i3',
        beneficiary: 'b2',
        branchId: 'br1',
        totalAmount: 2000,
        amountPaid: 500,
        status: 'PARTIALLY_PAID',
        issueDate: new Date('2026-03-15'),
        dueDate: new Date('2026-04-15'),
      },
    ];
    const ledger = await buildAccountsReceivableLedger({
      InvoiceModel: mockModel(invoices),
      asOfDate: new Date('2026-04-22'),
    });
    expect(ledger.cards).toHaveLength(2);
    const b1 = ledger.cards.find(c => c.beneficiary === 'b1');
    expect(b1.totalBilled).toBe(1500);
    expect(b1.totalPaid).toBe(500);
    expect(b1.outstanding).toBe(1000);
    expect(b1.openInvoiceCount).toBe(1);
    const b2 = ledger.cards.find(c => c.beneficiary === 'b2');
    expect(b2.outstanding).toBe(1500);
    expect(ledger.totals.outstanding).toBe(2500);
  });

  test('excludes invoices issued after the as-of date', async () => {
    const invoices = [
      {
        beneficiary: 'b1',
        totalAmount: 1000,
        amountPaid: 0,
        status: 'ISSUED',
        issueDate: new Date('2026-05-10'),
      },
    ];
    const ledger = await buildAccountsReceivableLedger({
      InvoiceModel: mockModel(invoices),
      asOfDate: new Date('2026-04-22'),
    });
    expect(ledger.cards).toHaveLength(0);
  });

  test('scopes to a single branch when branchId is given', async () => {
    const invoices = [
      {
        beneficiary: 'b1',
        branchId: 'br1',
        totalAmount: 1000,
        amountPaid: 0,
        status: 'ISSUED',
        issueDate: new Date('2026-01-01'),
      },
      {
        beneficiary: 'b2',
        branchId: 'br2',
        totalAmount: 500,
        amountPaid: 0,
        status: 'ISSUED',
        issueDate: new Date('2026-01-01'),
      },
    ];
    const ledger = await buildAccountsReceivableLedger({
      InvoiceModel: mockModel(invoices),
      asOfDate: new Date('2026-04-22'),
      branchId: 'br1',
    });
    expect(ledger.cards).toHaveLength(1);
    expect(ledger.cards[0].beneficiary).toBe('b1');
    expect(ledger.totals.outstanding).toBe(1000);
  });
});

describe('subsidiaryLedgerService — AP ledger', () => {
  test('groups expenses by vendor and computes outstanding', async () => {
    const expenses = [
      {
        _id: 'e1',
        vendor: 'Acme',
        branch_id: 'br1',
        amount: 800,
        status: 'approved',
        date: new Date('2026-03-01'),
        paid: false,
      },
      {
        _id: 'e2',
        vendor: 'Acme',
        branch_id: 'br1',
        amount: 1200,
        status: 'approved',
        date: new Date('2026-03-15'),
        paid: true,
        paidAt: new Date('2026-03-20'),
      },
      {
        _id: 'e3',
        vendor: 'Zed Co',
        branch_id: 'br1',
        amount: 300,
        status: 'pending',
        date: new Date('2026-04-01'),
      },
    ];
    const ledger = await buildAccountsPayableLedger({
      ExpenseModel: mockModel(expenses, 'branch_id'),
      asOfDate: new Date('2026-04-22'),
    });
    const acme = ledger.cards.find(c => c.vendor === 'Acme');
    expect(acme.totalInvoiced).toBe(2000);
    expect(acme.totalPaid).toBe(1200);
    expect(acme.outstanding).toBe(800);
    const zed = ledger.cards.find(c => c.vendor === 'Zed Co');
    expect(zed.outstanding).toBe(300);
    expect(ledger.totals.outstanding).toBe(1100);
  });

  test('places vendorless expenses under a placeholder bucket', async () => {
    const expenses = [
      { vendor: null, amount: 100, status: 'approved', date: new Date('2026-03-01') },
      { vendor: '', amount: 50, status: 'approved', date: new Date('2026-03-01') },
    ];
    const ledger = await buildAccountsPayableLedger({
      ExpenseModel: mockModel(expenses, 'branch_id'),
      asOfDate: new Date('2026-04-22'),
    });
    expect(ledger.cards).toHaveLength(1);
    expect(ledger.cards[0].vendor).toBe('(no-vendor)');
    expect(ledger.cards[0].outstanding).toBe(150);
  });
});

describe('subsidiaryLedgerService — reconcileControlAccount', () => {
  test('AR subsidiary total matches 1200 control account → isReconciled=true', async () => {
    const entries = [
      {
        status: 'posted',
        entry_date: new Date('2026-03-10'),
        branch_id: 'br1',
        lines: [
          { account_code: '1200', debit: 1500, credit: 0 },
          { account_code: '4100', debit: 0, credit: 1500 },
        ],
      },
      {
        status: 'posted',
        entry_date: new Date('2026-03-20'),
        branch_id: 'br1',
        lines: [
          { account_code: '1100', debit: 500, credit: 0 },
          { account_code: '1200', debit: 0, credit: 500 },
        ],
      },
    ];
    const rec = await reconcileControlAccount({
      JournalEntryModel: mockModel(entries, 'branch_id'),
      controlAccountCode: '1200',
      asOfDate: new Date('2026-04-22'),
      subsidiaryTotal: 1000,
      normalSide: 'debit',
    });
    expect(rec.controlBalance).toBe(1000);
    expect(rec.difference).toBe(0);
    expect(rec.isReconciled).toBe(true);
  });

  test('flags reconciliation difference when subsidiary disagrees with GL', async () => {
    const entries = [
      {
        status: 'posted',
        entry_date: new Date('2026-03-10'),
        lines: [{ account_code: '1200', debit: 1500, credit: 0 }],
      },
    ];
    const rec = await reconcileControlAccount({
      JournalEntryModel: mockModel(entries, 'branch_id'),
      controlAccountCode: '1200',
      asOfDate: new Date('2026-04-22'),
      subsidiaryTotal: 1000,
    });
    expect(rec.difference).toBe(500);
    expect(rec.isReconciled).toBe(false);
  });

  test('AP reconciliation treats credits as the normal side', async () => {
    const entries = [
      {
        status: 'posted',
        entry_date: new Date('2026-03-10'),
        lines: [
          { account_code: '5100', debit: 800, credit: 0 },
          { account_code: '2100', debit: 0, credit: 800 },
        ],
      },
    ];
    const rec = await reconcileControlAccount({
      JournalEntryModel: mockModel(entries, 'branch_id'),
      controlAccountCode: '2100',
      asOfDate: new Date('2026-04-22'),
      subsidiaryTotal: 800,
      normalSide: 'credit',
    });
    expect(rec.controlBalance).toBe(800);
    expect(rec.isReconciled).toBe(true);
  });
});

describe('subsidiaryLedgerService — end-to-end with reconciliation', () => {
  test('AR ledger reconciles cleanly against posted GL entries', async () => {
    const invoices = [
      {
        beneficiary: 'b1',
        branchId: 'br1',
        totalAmount: 1000,
        amountPaid: 0,
        status: 'ISSUED',
        issueDate: new Date('2026-03-01'),
      },
    ];
    const entries = [
      {
        status: 'posted',
        entry_date: new Date('2026-03-01'),
        branch_id: 'br1',
        lines: [
          { account_code: '1200', debit: 1000, credit: 0 },
          { account_code: '4100', debit: 0, credit: 1000 },
        ],
      },
    ];
    const ledger = await buildAccountsReceivableLedger({
      InvoiceModel: mockModel(invoices),
      JournalEntryModel: mockModel(entries, 'branch_id'),
      asOfDate: new Date('2026-04-22'),
    });
    expect(ledger.reconciliation.isReconciled).toBe(true);
    expect(ledger.reconciliation.subsidiaryTotal).toBe(1000);
  });
});

describe('subsidiaryLedgerService — exports', () => {
  test('exposes default control codes', () => {
    expect(DEFAULT_AR_CONTROL_CODE).toBe('1200');
    expect(DEFAULT_AP_CONTROL_CODE).toBe('2100');
  });
});
