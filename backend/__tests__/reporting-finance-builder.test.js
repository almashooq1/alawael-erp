/**
 * reporting-finance-builder.test.js — Phase 10 Commit 7f.
 */

'use strict';

const {
  buildClaimsPack,
  buildCollectionsPack,
  buildRevenueReview,
  buildAgingReport,
  rollupClaims,
  rollupCollections,
  rollupRevenue,
  rollupAging,
  bucketAge,
  PAID_STATUSES,
  REVENUE_STATUSES,
  UNPAID_STATUSES,
  AGING_BUCKETS,
} = require('../services/reporting/builders/financeReportBuilder');

function inv(overrides = {}) {
  return {
    _id: 'inv1',
    invoiceNumber: 'INV-2026-0001',
    branchId: 'br1',
    beneficiary: 'b1',
    status: 'ISSUED',
    paymentMethod: 'CASH',
    totalAmount: 500,
    subTotal: 476.19,
    taxAmount: 23.81,
    discount: 0,
    issueDate: new Date('2026-04-20T08:00:00Z'),
    dueDate: new Date('2026-05-20T00:00:00Z'),
    insurance: null,
    ...overrides,
  };
}

function makeModel(rows) {
  return {
    model: {
      find: jest.fn(async filter => {
        return rows.filter(r => {
          if (filter.branchId && String(r.branchId) !== String(filter.branchId)) return false;
          if (filter.status) {
            if (filter.status.$in) {
              if (!filter.status.$in.includes(r.status)) return false;
            } else if (r.status !== filter.status) {
              return false;
            }
          }
          const df = filter.issueDate ? 'issueDate' : null;
          if (df) {
            const d = new Date(r[df]).getTime();
            const c = filter[df];
            if (c.$gte && d < c.$gte.getTime()) return false;
            if (c.$lt && d >= c.$lt.getTime()) return false;
          }
          return true;
        });
      }),
    },
  };
}

// ─── Constants + helpers ─────────────────────────────────────────

describe('constants', () => {
  test('PARTIALLY_PAID lives in both PAID_STATUSES and UNPAID_STATUSES (intentional: collected+outstanding)', () => {
    // A partially-paid invoice contributes to collected AND to aging —
    // the overlap is load-bearing, not a bug. Assert the exact membership.
    expect(PAID_STATUSES).toEqual(['PAID', 'PARTIALLY_PAID']);
    expect(UNPAID_STATUSES).toEqual(['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']);
  });
  test('REVENUE_STATUSES includes OVERDUE but excludes CANCELLED + DRAFT', () => {
    expect(REVENUE_STATUSES).toContain('OVERDUE');
    expect(REVENUE_STATUSES).not.toContain('CANCELLED');
    expect(REVENUE_STATUSES).not.toContain('DRAFT');
  });
  test('AGING_BUCKETS has 4 contiguous ranges', () => {
    expect(AGING_BUCKETS).toEqual(['0-30', '31-60', '61-90', '91+']);
  });
});

describe('bucketAge', () => {
  test('maps days to buckets with inclusive upper bounds', () => {
    expect(bucketAge(0)).toBe('0-30');
    expect(bucketAge(30)).toBe('0-30');
    expect(bucketAge(31)).toBe('31-60');
    expect(bucketAge(60)).toBe('31-60');
    expect(bucketAge(61)).toBe('61-90');
    expect(bucketAge(90)).toBe('61-90');
    expect(bucketAge(91)).toBe('91+');
    expect(bucketAge(10000)).toBe('91+');
    expect(bucketAge(-1)).toBeNull();
    expect(bucketAge(null)).toBeNull();
  });
});

// ─── rollupClaims ────────────────────────────────────────────────

describe('rollupClaims', () => {
  test('only counts invoices with an insurance.provider block', () => {
    const rows = [
      inv({ insurance: null }),
      inv({ insurance: { provider: 'prov1', status: 'APPROVED', coverageAmount: 300 } }),
      inv({ insurance: { provider: 'prov1', status: 'REJECTED', coverageAmount: 200 } }),
      inv({ insurance: { provider: 'prov2', status: 'PENDING', coverageAmount: 100 } }),
    ];
    const out = rollupClaims(rows);
    expect(out.withInsurance).toBe(3);
    expect(out.byStatus).toMatchObject({ APPROVED: 1, REJECTED: 1, PENDING: 1 });
    expect(out.claimedAmount).toBe(600);
    expect(out.approvedAmount).toBe(300);
    expect(out.rejectedAmount).toBe(200);
    // approval rate = 1/2 (among decided: approved + rejected)
    expect(out.approvalRate).toBeCloseTo(0.5);
    expect(out.denialRate).toBeCloseTo(0.5);
    // byProvider sorted by amount desc
    expect(out.byProvider[0].providerId).toBe('prov1');
    expect(out.byProvider[0].amount).toBe(500);
  });

  test('pending-only set returns null rates (no decisions yet)', () => {
    const rows = [inv({ insurance: { provider: 'p', status: 'PENDING', coverageAmount: 100 } })];
    const out = rollupClaims(rows);
    expect(out.approvalRate).toBeNull();
    expect(out.denialRate).toBeNull();
  });
});

// ─── rollupCollections ───────────────────────────────────────────

describe('rollupCollections', () => {
  test('PAID → full totalAmount + DSO; PARTIALLY_PAID → covered amount; outstanding otherwise', () => {
    const rows = [
      inv({
        status: 'PAID',
        totalAmount: 500,
        issueDate: new Date('2026-04-01T00:00:00Z'),
        updatedAt: new Date('2026-04-11T00:00:00Z'),
      }),
      inv({
        status: 'PARTIALLY_PAID',
        totalAmount: 400,
        insurance: { coverageAmount: 250 },
      }),
      inv({ status: 'ISSUED', totalAmount: 200 }),
      inv({ status: 'OVERDUE', totalAmount: 300 }),
      inv({ status: 'CANCELLED', totalAmount: 999 }), // ignored
      inv({ status: 'DRAFT', totalAmount: 999 }), // ignored
    ];
    const out = rollupCollections(rows);
    expect(out.collected).toBe(750); // 500 + 250
    expect(out.outstanding).toBe(650); // (400 - 250) + 200 + 300
    expect(out.invoicesPaid).toBe(2);
    expect(out.invoicesOutstanding).toBe(2);
    expect(out.avgDsoDays).toBe(10);
  });

  test('no paid invoices → avgDsoDays null', () => {
    const out = rollupCollections([inv({ status: 'ISSUED' })]);
    expect(out.avgDsoDays).toBeNull();
  });
});

// ─── rollupRevenue ───────────────────────────────────────────────

describe('rollupRevenue', () => {
  test('sums booked + tax + discount across REVENUE_STATUSES only', () => {
    const rows = [
      inv({
        status: 'ISSUED',
        totalAmount: 500,
        taxAmount: 75,
        discount: 25,
        paymentMethod: 'CASH',
      }),
      inv({
        status: 'PAID',
        totalAmount: 1000,
        taxAmount: 150,
        discount: 0,
        paymentMethod: 'CARD',
      }),
      inv({ status: 'OVERDUE', totalAmount: 400, taxAmount: 60, paymentMethod: 'INSURANCE' }),
      inv({ status: 'CANCELLED', totalAmount: 999 }), // excluded
      inv({ status: 'DRAFT', totalAmount: 999 }), // excluded
    ];
    const out = rollupRevenue(rows);
    expect(out.invoices).toBe(3);
    expect(out.booked).toBe(1900);
    expect(out.tax).toBe(285);
    expect(out.discount).toBe(25);
    expect(out.avgInvoice).toBeCloseTo(1900 / 3, 1);
    expect(out.byPaymentMethod.CASH).toBe(500);
    expect(out.byPaymentMethod.CARD).toBe(1000);
    expect(out.byPaymentMethod.INSURANCE).toBe(400);
  });

  test('empty set yields zeros', () => {
    const out = rollupRevenue([]);
    expect(out.invoices).toBe(0);
    expect(out.booked).toBe(0);
    expect(out.avgInvoice).toBe(0);
  });
});

// ─── rollupAging ─────────────────────────────────────────────────

describe('rollupAging', () => {
  test('buckets unpaid invoices by days past dueDate', () => {
    const now = new Date('2026-04-22T00:00:00Z');
    const rows = [
      // 10 days past due → 0-30
      inv({ status: 'ISSUED', totalAmount: 100, dueDate: new Date('2026-04-12T00:00:00Z') }),
      // 45 days past due → 31-60
      inv({ status: 'OVERDUE', totalAmount: 200, dueDate: new Date('2026-03-08T00:00:00Z') }),
      // 100 days past due → 91+
      inv({ status: 'OVERDUE', totalAmount: 500, dueDate: new Date('2026-01-12T00:00:00Z') }),
      // not yet due → excluded
      inv({ status: 'ISSUED', dueDate: new Date('2026-05-01T00:00:00Z') }),
      // PAID → excluded
      inv({ status: 'PAID', dueDate: new Date('2026-01-01T00:00:00Z') }),
    ];
    const out = rollupAging(rows, now);
    expect(out.totalUnpaid).toBe(3);
    expect(out.totalAmount).toBe(800);
    expect(out.buckets).toEqual({ '0-30': 1, '31-60': 1, '61-90': 0, '91+': 1 });
    expect(out.amounts['91+']).toBe(500);
  });

  test('rows without dueDate are skipped', () => {
    const out = rollupAging([inv({ status: 'ISSUED', dueDate: null })]);
    expect(out.totalUnpaid).toBe(0);
  });
});

// ─── buildClaimsPack ─────────────────────────────────────────────

describe('buildClaimsPack (weekly)', () => {
  const report = { id: 'finance.claims.weekly' };

  test('aggregates weekly claims with approval/denial rates', async () => {
    const rows = [
      inv({
        issueDate: new Date('2026-04-21T09:00:00Z'),
        insurance: { provider: 'prov1', status: 'APPROVED', coverageAmount: 300 },
      }),
      inv({
        issueDate: new Date('2026-04-22T09:00:00Z'),
        insurance: { provider: 'prov1', status: 'REJECTED', coverageAmount: 100 },
      }),
      // out-of-range
      inv({
        issueDate: new Date('2026-04-10T09:00:00Z'),
        insurance: { provider: 'prov1', status: 'APPROVED', coverageAmount: 999 },
      }),
    ];
    const doc = await buildClaimsPack({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Invoice: makeModel(rows) } },
    });
    expect(doc.totals.invoicesWithInsurance).toBe(2);
    expect(doc.totals.claimedAmount).toBe(400);
    expect(doc.approvalRate).toBeCloseTo(0.5);
    expect(doc.summary.headlineMetric.label).toBe('denial rate');
  });

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildClaimsPack({ report, periodKey: 'nope' });
    expect(doc.totals.invoicesWithInsurance).toBe(0);
  });
});

// ─── buildCollectionsPack ────────────────────────────────────────

describe('buildCollectionsPack (monthly, confidential)', () => {
  const report = { id: 'finance.collections.monthly' };

  test('emits collected / outstanding totals + DSO + collection rate', async () => {
    const rows = [
      inv({
        status: 'PAID',
        totalAmount: 800,
        issueDate: new Date('2026-04-02T00:00:00Z'),
        updatedAt: new Date('2026-04-17T00:00:00Z'),
      }),
      inv({ status: 'ISSUED', totalAmount: 200, issueDate: new Date('2026-04-10T00:00:00Z') }),
    ];
    const doc = await buildCollectionsPack({
      report,
      periodKey: '2026-04',
      ctx: { models: { Invoice: makeModel(rows) } },
    });
    expect(doc.totals.collected).toBe(800);
    expect(doc.totals.outstanding).toBe(200);
    expect(doc.avgDsoDays).toBeCloseTo(15, 1);
    expect(doc.collectionRate).toBeCloseTo(800 / 1000);
    expect(doc.summary.headlineMetric.label).toBe('collected');
  });
});

// ─── buildRevenueReview ──────────────────────────────────────────

describe('buildRevenueReview (quarterly, confidential)', () => {
  const report = { id: 'finance.revenue.quarterly' };

  test('compares current to prior quarter and emits growthRate', async () => {
    const rows = [
      // Q1 2026 (prior): 1000
      inv({ status: 'PAID', totalAmount: 1000, issueDate: new Date('2026-02-15T00:00:00Z') }),
      // Q2 2026 (current): 2000 total
      inv({ status: 'PAID', totalAmount: 1200, issueDate: new Date('2026-04-10T00:00:00Z') }),
      inv({ status: 'ISSUED', totalAmount: 800, issueDate: new Date('2026-05-01T00:00:00Z') }),
    ];
    const doc = await buildRevenueReview({
      report,
      periodKey: '2026-Q2',
      ctx: { models: { Invoice: makeModel(rows) } },
    });
    expect(doc.totals.booked).toBe(2000);
    expect(doc.priorPeriod.booked).toBe(1000);
    expect(doc.growthRate).toBeCloseTo(1); // 100% growth
    expect(doc.summary.headlineMetric.label).toBe('booked revenue');
  });

  test('growthRate is null when prior period is empty', async () => {
    const rows = [
      inv({ status: 'PAID', totalAmount: 500, issueDate: new Date('2026-04-10T00:00:00Z') }),
    ];
    const doc = await buildRevenueReview({
      report,
      periodKey: '2026-Q2',
      ctx: { models: { Invoice: makeModel(rows) } },
    });
    expect(doc.growthRate).toBeNull();
  });
});

// ─── buildAgingReport ────────────────────────────────────────────

describe('buildAgingReport (weekly)', () => {
  const report = { id: 'finance.invoices.aging.weekly' };

  test('buckets unpaid invoices into 4 age ranges + agingRatio for 91+', async () => {
    // Force clock.now to a known date so bucket math is deterministic.
    const now = new Date('2026-04-22T00:00:00Z');
    const rows = [
      inv({ status: 'ISSUED', totalAmount: 100, dueDate: new Date('2026-04-12T00:00:00Z') }),
      inv({ status: 'OVERDUE', totalAmount: 200, dueDate: new Date('2026-03-08T00:00:00Z') }),
      inv({ status: 'OVERDUE', totalAmount: 500, dueDate: new Date('2026-01-12T00:00:00Z') }),
      inv({ status: 'PAID', dueDate: new Date('2026-01-01T00:00:00Z') }), // excluded
    ];
    const doc = await buildAgingReport({
      report,
      periodKey: '2026-W17',
      ctx: {
        models: { Invoice: makeModel(rows) },
        clock: { now: () => now },
      },
    });
    expect(doc.totals.unpaidInvoices).toBe(3);
    expect(doc.totals.unpaidAmount).toBe(800);
    expect(doc.buckets['91+']).toBe(1);
    expect(doc.amounts['91+']).toBe(500);
    expect(doc.agingRatio).toBeCloseTo(500 / 800);
    expect(doc.summary.headlineMetric.label).toBe('outstanding');
  });

  test('zero unpaid → null headline', async () => {
    const doc = await buildAgingReport({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Invoice: makeModel([]) } },
    });
    expect(doc.totals.unpaidInvoices).toBe(0);
    expect(doc.summary.headlineMetric).toBeNull();
  });
});
