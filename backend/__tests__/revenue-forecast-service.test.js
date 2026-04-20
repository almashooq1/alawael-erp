/**
 * revenue-forecast-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/revenueForecastService');

function inv({
  status = 'ISSUED',
  totalAmount = 1000,
  issuedMonthsAgo = 1,
  paidDaysAfterIssue = null,
  provider = null,
}) {
  const issueDate = new Date();
  issueDate.setMonth(issueDate.getMonth() - issuedMonthsAgo);
  const updatedAt =
    paidDaysAfterIssue != null
      ? new Date(issueDate.getTime() + paidDaysAfterIssue * 86400000)
      : null;
  return {
    status,
    totalAmount,
    issueDate,
    updatedAt,
    insurance: provider ? { provider } : undefined,
  };
}

describe('revenueForecastService.dso', () => {
  it('null when no qualifying invoices', () => {
    expect(svc.dso([])).toBeNull();
    expect(svc.dso([inv({ status: 'DRAFT' })])).toBeNull();
  });

  it('computes weighted DSO for paid + outstanding invoices', () => {
    const now = new Date();
    const items = [
      // 100 paid after 30 days, 500 outstanding for 60 days
      inv({ status: 'PAID', totalAmount: 100, issuedMonthsAgo: 1, paidDaysAfterIssue: 30 }),
      inv({ status: 'ISSUED', totalAmount: 500, issuedMonthsAgo: 2 }),
    ];
    const d = svc.dso(items, now);
    // weighted: (30*100 + ~60*500) / 600 ≈ 55
    expect(d).toBeGreaterThan(40);
    expect(d).toBeLessThan(70);
  });

  it('excludes DRAFT and CANCELLED', () => {
    const items = [
      inv({ status: 'DRAFT', totalAmount: 9999 }),
      inv({ status: 'CANCELLED', totalAmount: 9999 }),
      inv({ status: 'PAID', totalAmount: 100, paidDaysAfterIssue: 10 }),
    ];
    const d = svc.dso(items);
    expect(d).toBeLessThan(15); // only the paid one counts
  });
});

describe('revenueForecastService.velocityByInsurer', () => {
  it('groups by provider and averages days-to-paid', () => {
    const items = [
      inv({ status: 'PAID', totalAmount: 100, paidDaysAfterIssue: 20, provider: 'bupa' }),
      inv({ status: 'PAID', totalAmount: 200, paidDaysAfterIssue: 40, provider: 'bupa' }),
      inv({ status: 'PAID', totalAmount: 100, paidDaysAfterIssue: 90, provider: 'slow' }),
    ];
    const rows = svc.velocityByInsurer(items);
    const bupa = rows.find(r => r.insurer === 'bupa');
    expect(bupa.avgDaysToPaid).toBe(30);
    expect(bupa.paidCount).toBe(2);
    expect(rows[0].insurer).toBe('slow'); // sorted by slowest first
  });

  it('ignores unpaid invoices (no days-to-paid signal)', () => {
    const rows = svc.velocityByInsurer([
      inv({ status: 'ISSUED', provider: 'any', paidDaysAfterIssue: 20 }),
    ]);
    expect(rows).toEqual([]);
  });

  it('skips invoices with no insurance provider', () => {
    const rows = svc.velocityByInsurer([
      inv({ status: 'PAID', totalAmount: 100, paidDaysAfterIssue: 20 }),
    ]);
    expect(rows).toEqual([]);
  });
});

describe('revenueForecastService.cohortCollection', () => {
  it('reports per-cohort collection by month-age', () => {
    const cohorts = svc.cohortCollection([
      // Jan cohort: 500 issued, 300 paid in 30d, 450 paid by 90d
      inv({ status: 'PAID', totalAmount: 300, issuedMonthsAgo: 3, paidDaysAfterIssue: 25 }),
      inv({ status: 'PAID', totalAmount: 150, issuedMonthsAgo: 3, paidDaysAfterIssue: 75 }),
      inv({ status: 'ISSUED', totalAmount: 50, issuedMonthsAgo: 3 }),
    ]);
    expect(cohorts.length).toBe(1);
    expect(cohorts[0].issued).toBe(500);
    expect(cohorts[0].pct30d).toBe(60); // 300/500
    expect(cohorts[0].pct90d).toBe(90); // (300+150)/500
  });

  it('sorts cohorts ascending by month', () => {
    const cohorts = svc.cohortCollection([
      inv({ status: 'PAID', totalAmount: 100, issuedMonthsAgo: 5, paidDaysAfterIssue: 10 }),
      inv({ status: 'PAID', totalAmount: 100, issuedMonthsAgo: 1, paidDaysAfterIssue: 10 }),
    ]);
    expect(cohorts[0].cohort < cohorts[1].cohort).toBe(true);
  });
});

describe('revenueForecastService.trailingAverages', () => {
  it('averages across trailing months', () => {
    const items = [];
    // 3 months × 1000 issued, 800 paid each
    for (let m = 1; m <= 3; m++) {
      items.push(inv({ status: 'PAID', totalAmount: 800, issuedMonthsAgo: m }));
      items.push(inv({ status: 'ISSUED', totalAmount: 200, issuedMonthsAgo: m }));
    }
    const t = svc.trailingAverages(items);
    expect(t.issuedAvg).toBe(1000);
    expect(t.paidAvg).toBe(800);
    expect(t.collectionRate).toBe(80);
    expect(t.monthsObserved).toBe(3);
  });

  it('returns zeros with no history', () => {
    const t = svc.trailingAverages([]);
    expect(t.issuedAvg).toBe(0);
    expect(t.collectionRate).toBeNull();
  });
});

describe('revenueForecastService.projectMonths', () => {
  it('refuses to project with insufficient history', () => {
    const p = svc.projectMonths([inv({ status: 'PAID', issuedMonthsAgo: 1 })]);
    expect(p.insufficient).toBe(true);
    expect(p.required).toBeGreaterThan(0);
  });

  it('projects N months with confidence decay', () => {
    const items = [];
    for (let m = 1; m <= 6; m++) {
      items.push(inv({ status: 'PAID', totalAmount: 800, issuedMonthsAgo: m }));
      items.push(inv({ status: 'ISSUED', totalAmount: 200, issuedMonthsAgo: m }));
    }
    const p = svc.projectMonths(items, 3);
    expect(p.insufficient).toBe(false);
    expect(p.projections.length).toBe(3);
    expect(p.projections[0].projectedIssued).toBe(1000);
    expect(p.projections[0].projectedCollected).toBe(800);
    expect(p.projections[0].confidence).toBeGreaterThan(p.projections[2].confidence);
  });
});

describe('revenueForecastService.detectCashflowRisk', () => {
  it('fires when latest month dropped sharply', () => {
    const items = [];
    // 5 prior months at 10000 each
    for (let m = 2; m <= 6; m++) {
      items.push(inv({ status: 'ISSUED', totalAmount: 10000, issuedMonthsAgo: m }));
    }
    // Latest month crashed to 2000 (80% drop)
    items.push(inv({ status: 'ISSUED', totalAmount: 2000, issuedMonthsAgo: 0 }));
    const r = svc.detectCashflowRisk(items);
    expect(r.active).toBe(true);
    expect(r.dropPct).toBeGreaterThan(50);
  });

  it('silent when latest month is flat', () => {
    const items = [];
    for (let m = 0; m <= 5; m++) {
      items.push(inv({ status: 'ISSUED', totalAmount: 10000, issuedMonthsAgo: m }));
    }
    const r = svc.detectCashflowRisk(items);
    expect(r.active).toBe(false);
    expect(Math.abs(r.dropPct)).toBeLessThan(5);
  });

  it('silent when insufficient history', () => {
    const r = svc.detectCashflowRisk([inv({ totalAmount: 1000, issuedMonthsAgo: 0 })]);
    expect(r.active).toBe(false);
    expect(r.reason).toBe('insufficient_history');
  });
});
