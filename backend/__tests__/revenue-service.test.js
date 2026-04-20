/**
 * revenue-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/revenueService');

function inv({
  status = 'ISSUED',
  totalAmount = 100,
  beneficiary = 'B1',
  issuedDaysAgo = 10,
  dueInDays = null,
}) {
  const issueDate = new Date(Date.now() - issuedDaysAgo * 86400000);
  const dueDate = dueInDays === null ? null : new Date(issueDate.getTime() + dueInDays * 86400000);
  return { status, totalAmount, beneficiary, issueDate, dueDate };
}

describe('revenueService.summarize', () => {
  it('empty → zeros and null collection rate', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.grossRevenue).toBe(0);
    expect(s.collectionRate).toBeNull();
  });

  it('paid + outstanding split + collectionRate = paid/gross', () => {
    const s = svc.summarize([
      inv({ status: 'PAID', totalAmount: 300 }),
      inv({ status: 'ISSUED', totalAmount: 100 }),
    ]);
    expect(s.paidRevenue).toBe(300);
    expect(s.outstandingAmount).toBe(100);
    expect(s.grossRevenue).toBe(400);
    expect(s.collectionRate).toBe(75);
  });

  it('cancelled invoices do not contribute to gross', () => {
    const s = svc.summarize([
      inv({ status: 'PAID', totalAmount: 200 }),
      inv({ status: 'CANCELLED', totalAmount: 500 }),
    ]);
    expect(s.grossRevenue).toBe(200);
    expect(s.cancelledCount).toBe(1);
  });

  it('PARTIALLY_PAID counts as outstanding', () => {
    const s = svc.summarize([inv({ status: 'PARTIALLY_PAID', totalAmount: 50 })]);
    expect(s.outstandingAmount).toBe(50);
  });

  it('DRAFT tracked separately from outstanding', () => {
    const s = svc.summarize([
      inv({ status: 'DRAFT', totalAmount: 100 }),
      inv({ status: 'ISSUED', totalAmount: 100 }),
    ]);
    expect(s.draftAmount).toBe(100);
    expect(s.outstandingAmount).toBe(100);
  });
});

describe('revenueService.agingBuckets', () => {
  it('buckets invoices by days past due date', () => {
    const now = new Date();
    const items = [
      inv({ status: 'ISSUED', totalAmount: 100, issuedDaysAgo: 5, dueInDays: 10 }), // current
      inv({ status: 'OVERDUE', totalAmount: 200, issuedDaysAgo: 35, dueInDays: 10 }), // 25d late → 0-30
      inv({ status: 'OVERDUE', totalAmount: 300, issuedDaysAgo: 65, dueInDays: 10 }), // 55d late → 31-60
      inv({ status: 'OVERDUE', totalAmount: 400, issuedDaysAgo: 95, dueInDays: 10 }), // 85d late → 61-90
      inv({ status: 'OVERDUE', totalAmount: 500, issuedDaysAgo: 150, dueInDays: 10 }), // >90
    ];
    const b = svc.agingBuckets(items, now);
    expect(b.current.count).toBe(1);
    expect(b.d0to30.amount).toBe(200);
    expect(b.d31to60.amount).toBe(300);
    expect(b.d61to90.amount).toBe(400);
    expect(b.over90.amount).toBe(500);
    expect(b.totalOutstanding).toBe(1500);
  });

  it('paid / cancelled never enter aging', () => {
    const b = svc.agingBuckets([
      inv({ status: 'PAID', totalAmount: 9999 }),
      inv({ status: 'CANCELLED', totalAmount: 9999 }),
    ]);
    expect(b.totalOutstanding).toBe(0);
  });

  it('no dueDate → bucketed as current (no way to say it is late)', () => {
    const b = svc.agingBuckets([inv({ status: 'ISSUED', totalAmount: 100, dueInDays: null })]);
    expect(b.current.amount).toBe(100);
  });
});

describe('revenueService.topDebtors', () => {
  it('sums per beneficiary and sorts by outstanding desc', () => {
    const items = [
      inv({ status: 'ISSUED', totalAmount: 100, beneficiary: 'A' }),
      inv({ status: 'ISSUED', totalAmount: 300, beneficiary: 'A' }),
      inv({ status: 'ISSUED', totalAmount: 200, beneficiary: 'B' }),
    ];
    const top = svc.topDebtors(items);
    expect(top[0].beneficiary).toBe('A');
    expect(top[0].outstandingAmount).toBe(400);
    expect(top[1].beneficiary).toBe('B');
  });

  it('excludes paid invoices', () => {
    const top = svc.topDebtors([
      inv({ status: 'PAID', totalAmount: 1000, beneficiary: 'A' }),
      inv({ status: 'ISSUED', totalAmount: 50, beneficiary: 'B' }),
    ]);
    expect(top.length).toBe(1);
    expect(top[0].beneficiary).toBe('B');
  });

  it('honours n limit', () => {
    const items = ['A', 'B', 'C', 'D'].map(b =>
      inv({ status: 'ISSUED', totalAmount: 100, beneficiary: b })
    );
    expect(svc.topDebtors(items, 2).length).toBe(2);
  });
});

describe('revenueService.revenueByMonth', () => {
  it('groups issued+paid by YYYY-MM and computes collectionRate', () => {
    const months = svc.revenueByMonth([
      inv({ status: 'PAID', totalAmount: 300, issuedDaysAgo: 10 }),
      inv({ status: 'ISSUED', totalAmount: 100, issuedDaysAgo: 10 }),
    ]);
    expect(months.length).toBeGreaterThanOrEqual(1);
    const m = months[months.length - 1];
    expect(m.issued).toBe(400);
    expect(m.paid).toBe(300);
    expect(m.collectionRate).toBe(75);
  });

  it('excludes DRAFT and CANCELLED', () => {
    const months = svc.revenueByMonth([
      inv({ status: 'DRAFT', totalAmount: 1000 }),
      inv({ status: 'CANCELLED', totalAmount: 1000 }),
    ]);
    expect(months.length).toBe(0);
  });
});

describe('revenueService.detectOverdueAlarm', () => {
  it('fires when >90d AR exceeds the alarm %', () => {
    const buckets = {
      over90: { amount: 10000 },
      totalOutstanding: 20000,
    };
    expect(svc.detectOverdueAlarm(buckets)).toBe(true);
  });

  it('silent when >90d is under the absolute min-amount floor', () => {
    const buckets = {
      over90: { amount: 100 },
      totalOutstanding: 200,
    };
    expect(svc.detectOverdueAlarm(buckets)).toBe(false);
  });

  it('silent when total AR is 0', () => {
    expect(svc.detectOverdueAlarm({ over90: { amount: 0 }, totalOutstanding: 0 })).toBe(false);
  });
});
