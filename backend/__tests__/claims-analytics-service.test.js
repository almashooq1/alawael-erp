/**
 * claims-analytics-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/claimsAnalyticsService');

function claim({
  status = 'APPROVED',
  totalAmount = 1000,
  approvedAmount = null,
  insurerName = 'Bupa',
  reason = null,
  serviceDaysAgo = 5,
}) {
  return {
    totalAmount,
    approvedAmount: approvedAmount ?? (status === 'APPROVED' ? totalAmount : null),
    insurerName,
    serviceDate: new Date(Date.now() - serviceDaysAgo * 86400000),
    nphies: { submission: { status, reason } },
  };
}

describe('claimsAnalyticsService.summarize', () => {
  it('empty → zeros, null approval rate', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.approvalRate).toBeNull();
  });

  it('approvalRate = approved / (approved + rejected)', () => {
    const s = svc.summarize([
      claim({ status: 'APPROVED', totalAmount: 100 }),
      claim({ status: 'APPROVED', totalAmount: 100 }),
      claim({ status: 'REJECTED', totalAmount: 100 }),
      claim({ status: 'PENDING_REVIEW', totalAmount: 100 }),
    ]);
    // 2 approved, 1 rejected → 66.7%; pending excluded from denominator
    expect(s.approvalRate).toBe(66.7);
    expect(s.approvedCount).toBe(2);
    expect(s.rejectedCount).toBe(1);
    expect(s.pendingCount).toBe(1);
  });

  it('separates total / approved / rejected amounts', () => {
    const s = svc.summarize([
      claim({ status: 'APPROVED', totalAmount: 500, approvedAmount: 400 }),
      claim({ status: 'REJECTED', totalAmount: 300 }),
    ]);
    expect(s.approvedAmount).toBe(400);
    expect(s.rejectedAmount).toBe(300);
    expect(s.totalAmount).toBe(800);
  });

  it('ERROR status tallied separately', () => {
    const s = svc.summarize([claim({ status: 'ERROR' })]);
    expect(s.errorCount).toBe(1);
    expect(s.approvalRate).toBeNull();
  });
});

describe('claimsAnalyticsService.rejectionReasons', () => {
  it('aggregates by reason and sorts by count desc', () => {
    const claims = [
      claim({ status: 'REJECTED', reason: 'خارج التغطية' }),
      claim({ status: 'REJECTED', reason: 'خارج التغطية' }),
      claim({ status: 'REJECTED', reason: 'بيانات ناقصة' }),
      claim({ status: 'APPROVED' }),
    ];
    const reasons = svc.rejectionReasons(claims);
    expect(reasons[0].reason).toBe('خارج التغطية');
    expect(reasons[0].count).toBe(2);
    expect(reasons[1].reason).toBe('بيانات ناقصة');
  });

  it('falls back to "غير محدّد" when reason missing', () => {
    const reasons = svc.rejectionReasons([claim({ status: 'REJECTED', reason: null })]);
    expect(reasons[0].reason).toBe('غير محدّد');
  });

  it('ignores non-rejected claims', () => {
    const reasons = svc.rejectionReasons([claim({ status: 'APPROVED' })]);
    expect(reasons).toEqual([]);
  });

  it('honours n limit', () => {
    const items = ['A', 'B', 'C', 'D'].map(r => claim({ status: 'REJECTED', reason: r }));
    expect(svc.rejectionReasons(items, 2).length).toBe(2);
  });
});

describe('claimsAnalyticsService.byInsurer', () => {
  it('per-insurer approval rate + totals', () => {
    const rows = svc.byInsurer([
      claim({ status: 'APPROVED', insurerName: 'Bupa', totalAmount: 100 }),
      claim({ status: 'APPROVED', insurerName: 'Bupa', totalAmount: 100 }),
      claim({ status: 'REJECTED', insurerName: 'Bupa', totalAmount: 100 }),
      claim({ status: 'APPROVED', insurerName: 'Tawuniya', totalAmount: 50 }),
    ]);
    const bupa = rows.find(r => r.insurer === 'Bupa');
    expect(bupa.approvalRate).toBe(66.7);
    expect(bupa.total).toBe(3);
    const tawuniya = rows.find(r => r.insurer === 'Tawuniya');
    expect(tawuniya.approvalRate).toBe(100);
  });

  it('sorts by volume desc', () => {
    const rows = svc.byInsurer([
      claim({ insurerName: 'A' }),
      claim({ insurerName: 'B' }),
      claim({ insurerName: 'B' }),
    ]);
    expect(rows[0].insurer).toBe('B');
  });
});

describe('claimsAnalyticsService.monthlyTrend', () => {
  it('groups by YYYY-MM with approved/rejected counts', () => {
    const months = svc.monthlyTrend([
      claim({ status: 'APPROVED', serviceDaysAgo: 5 }),
      claim({ status: 'REJECTED', serviceDaysAgo: 5 }),
    ]);
    expect(months.length).toBe(1);
    expect(months[0].submitted).toBe(2);
    expect(months[0].approved).toBe(1);
    expect(months[0].rejected).toBe(1);
    expect(months[0].approvalRate).toBe(50);
  });

  it('skips claims without serviceDate', () => {
    const months = svc.monthlyTrend([{ nphies: { submission: { status: 'APPROVED' } } }]);
    expect(months.length).toBe(0);
  });
});

describe('claimsAnalyticsService.detectRejectionSpike', () => {
  it('fires when rolling rejection rate exceeds threshold', () => {
    const claims = [];
    for (let i = 0; i < 8; i++) claims.push(claim({ status: 'APPROVED', serviceDaysAgo: 5 }));
    for (let i = 0; i < 5; i++) claims.push(claim({ status: 'REJECTED', serviceDaysAgo: 5 }));
    const s = svc.detectRejectionSpike(claims);
    // settled=13, rejected=5 → 38.5% → above 20% alarm
    expect(s.active).toBe(true);
    expect(s.rejectionRate).toBeGreaterThan(20);
  });

  it('silent when sample below minimum', () => {
    const claims = [claim({ status: 'REJECTED', serviceDaysAgo: 5 })];
    const s = svc.detectRejectionSpike(claims);
    expect(s.active).toBe(false);
    expect(s.settled).toBe(1);
  });

  it('silent when rate healthy', () => {
    const claims = [];
    for (let i = 0; i < 20; i++) claims.push(claim({ status: 'APPROVED', serviceDaysAgo: 5 }));
    const s = svc.detectRejectionSpike(claims);
    expect(s.active).toBe(false);
    expect(s.rejectionRate).toBe(0);
  });

  it('ignores claims outside the window', () => {
    const claims = [];
    for (let i = 0; i < 20; i++) claims.push(claim({ status: 'REJECTED', serviceDaysAgo: 200 }));
    const s = svc.detectRejectionSpike(claims);
    // All claims outside 30-day window → settled=0 → silent
    expect(s.active).toBe(false);
    expect(s.settled).toBe(0);
  });
});
