/**
 * complaints-analytics-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/complaintsAnalyticsService');

function c({
  status = 'new',
  priority = 'medium',
  category = 'service_quality',
  submitterType = 'parent',
  createdDaysAgo = 5,
  resolvedDaysAfterCreate = null,
}) {
  const createdAt = new Date(Date.now() - createdDaysAgo * 86400000);
  const resolvedAt =
    resolvedDaysAfterCreate != null
      ? new Date(createdAt.getTime() + resolvedDaysAfterCreate * 86400000)
      : null;
  return { status, priority, category, submitterType, createdAt, resolvedAt };
}

describe('complaintsAnalyticsService.summarize', () => {
  it('empty → zeros, null rate', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.resolutionRate).toBeNull();
  });

  it('classifies open vs resolved vs rejected', () => {
    const s = svc.summarize([
      c({ status: 'new' }),
      c({ status: 'in_progress' }),
      c({ status: 'resolved', resolvedDaysAfterCreate: 2 }),
      c({ status: 'rejected' }),
    ]);
    expect(s.open).toBe(2);
    expect(s.resolved).toBe(1);
    expect(s.rejected).toBe(1);
    // settled = resolved + rejected = 2/4 = 50%
    expect(s.resolutionRate).toBe(50);
  });

  it('computes avg resolution hours', () => {
    const s = svc.summarize([
      c({ status: 'resolved', resolvedDaysAfterCreate: 1 }), // 24h
      c({ status: 'resolved', resolvedDaysAfterCreate: 3 }), // 72h
    ]);
    expect(s.avgResolutionHours).toBe(48);
  });

  it('counts per-priority', () => {
    const s = svc.summarize([
      c({ priority: 'critical' }),
      c({ priority: 'critical' }),
      c({ priority: 'low' }),
    ]);
    expect(s.byPriority.critical).toBe(2);
    expect(s.byPriority.low).toBe(1);
  });
});

describe('complaintsAnalyticsService.byCategory', () => {
  it('groups by category with resolution rate', () => {
    const rows = svc.byCategory([
      c({ category: 'billing', status: 'resolved', resolvedDaysAfterCreate: 1 }),
      c({ category: 'billing', status: 'new' }),
      c({ category: 'service_quality', status: 'resolved', resolvedDaysAfterCreate: 2 }),
    ]);
    const billing = rows.find(r => r.category === 'billing');
    expect(billing.total).toBe(2);
    expect(billing.resolutionRate).toBe(50);
  });

  it('counts critical per-category', () => {
    const rows = svc.byCategory([
      c({ category: 'safety', priority: 'critical' }),
      c({ category: 'safety', priority: 'critical' }),
      c({ category: 'safety', priority: 'low' }),
    ]);
    expect(rows[0].critical).toBe(2);
  });
});

describe('complaintsAnalyticsService.bySubmitterType', () => {
  it('groups by submitter type', () => {
    const rows = svc.bySubmitterType([
      c({ submitterType: 'parent' }),
      c({ submitterType: 'parent' }),
      c({ submitterType: 'employee' }),
    ]);
    expect(rows[0].submitterType).toBe('parent');
    expect(rows[0].total).toBe(2);
  });
});

describe('complaintsAnalyticsService.monthlyTrend', () => {
  it('groups by month with resolution rate', () => {
    const rows = svc.monthlyTrend([
      c({ status: 'resolved', createdDaysAgo: 5, resolvedDaysAfterCreate: 1 }),
      c({ status: 'new', createdDaysAgo: 5 }),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].total).toBe(2);
    expect(rows[0].resolutionRate).toBe(50);
  });
});

describe('complaintsAnalyticsService.openBacklog', () => {
  it('lists open complaints past backlogDays', () => {
    const rows = svc.openBacklog([
      c({ status: 'new', createdDaysAgo: 20 }),
      c({ status: 'new', createdDaysAgo: 5 }), // too fresh
      c({ status: 'resolved', createdDaysAgo: 30 }), // resolved, excluded
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].daysOpen).toBeGreaterThanOrEqual(14);
  });

  it('sorts by days-open desc', () => {
    const rows = svc.openBacklog([
      c({ status: 'new', createdDaysAgo: 30 }),
      c({ status: 'new', createdDaysAgo: 60 }),
    ]);
    expect(rows[0].daysOpen).toBeGreaterThan(rows[1].daysOpen);
  });
});

describe('complaintsAnalyticsService.slaBreaches', () => {
  it('flags open complaint past SLA', () => {
    // critical SLA = 24h, create it 5 days ago still open
    const rows = svc.slaBreaches([
      c({ status: 'in_progress', priority: 'critical', createdDaysAgo: 5 }),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].breachedBy).toBeGreaterThan(24);
  });

  it('flags resolved-but-late', () => {
    // high SLA = 72h, resolved after 5 days
    const rows = svc.slaBreaches([
      c({
        status: 'resolved',
        priority: 'high',
        createdDaysAgo: 10,
        resolvedDaysAfterCreate: 5,
      }),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].resolvedInHours).toBe(120);
    expect(rows[0].breachedBy).toBe(48);
  });

  it('silent when within SLA', () => {
    // critical resolved in 12h → within 24h SLA
    const rows = svc.slaBreaches([
      c({
        status: 'resolved',
        priority: 'critical',
        createdDaysAgo: 2,
        resolvedDaysAfterCreate: 0.5,
      }),
    ]);
    expect(rows).toEqual([]);
  });
});

describe('complaintsAnalyticsService.detectSpike', () => {
  it('fires on month-over-month spike above threshold', () => {
    const items = [];
    // 5 last month
    for (let i = 0; i < 5; i++) items.push(c({ createdDaysAgo: 35 }));
    // 15 this month
    for (let i = 0; i < 15; i++) items.push(c({ createdDaysAgo: 2 }));
    const s = svc.detectSpike(items);
    expect(s.active).toBe(true);
    expect(s.jumpPct).toBeGreaterThan(40);
  });

  it('silent when prior volume below min', () => {
    const s = svc.detectSpike([c({ createdDaysAgo: 2 })]);
    expect(s.active).toBe(false);
    expect(s.reason).toBe('insufficient_prior_volume');
  });
});
