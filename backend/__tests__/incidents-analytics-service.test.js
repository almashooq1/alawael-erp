/**
 * incidents-analytics-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/incidentsAnalyticsService');

function inc({
  status = 'REPORTED',
  severity = 'MEDIUM',
  category = 'HUMAN_ERROR',
  reportedDaysAgo = 2,
  resolvedHoursAfterReport = null,
  rootCause = null,
  permanentFix = false,
  regulatory = false,
  escalated = false,
}) {
  const reported = new Date(Date.now() - reportedDaysAgo * 86400000);
  const resolved =
    resolvedHoursAfterReport != null
      ? new Date(reported.getTime() + resolvedHoursAfterReport * 3600000)
      : null;
  return {
    status,
    severity,
    category,
    isEscalated: escalated,
    discoveryInfo: { reportedAt: reported, discoveredAt: reported },
    resolution: { rootCause, permanentFix, resolvedAt: resolved },
    impactAssessment: { regulatoryImpact: regulatory },
  };
}

describe('incidentsAnalyticsService.summarize', () => {
  it('empty → zeros', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.avgTtrHours).toBeNull();
  });

  it('classifies open/resolved + counts severity + regulatory', () => {
    const s = svc.summarize([
      inc({ status: 'REPORTED' }),
      inc({ status: 'INVESTIGATING' }),
      inc({ status: 'RESOLVED', resolvedHoursAfterReport: 6 }),
      inc({ status: 'CLOSED', resolvedHoursAfterReport: 2, regulatory: true }),
      inc({
        status: 'RESOLVED',
        severity: 'CRITICAL',
        resolvedHoursAfterReport: 3,
        escalated: true,
      }),
    ]);
    expect(s.open).toBe(2);
    expect(s.resolved).toBe(3);
    expect(s.regulatoryCount).toBe(1);
    expect(s.escalatedCount).toBe(1);
    expect(s.bySeverity.CRITICAL).toBe(1);
    expect(s.resolutionRate).toBe(60);
    // avg (6 + 2 + 3) / 3 ≈ 3.7
    expect(s.avgTtrHours).toBeCloseTo(3.7, 1);
  });
});

describe('incidentsAnalyticsService.bySeverity', () => {
  it('reports MTTR per severity + SLA check', () => {
    const rows = svc.bySeverity([
      inc({ severity: 'CRITICAL', status: 'RESOLVED', resolvedHoursAfterReport: 2 }),
      inc({ severity: 'CRITICAL', status: 'RESOLVED', resolvedHoursAfterReport: 6 }),
      // HIGH: 36h avg — exceeds 24h SLA
      inc({ severity: 'HIGH', status: 'RESOLVED', resolvedHoursAfterReport: 36 }),
    ]);
    const crit = rows.find(r => r.severity === 'CRITICAL');
    expect(crit.avgTtrHours).toBe(4);
    expect(crit.slaMet).toBe(true); // 4h ≤ 4h SLA
    const high = rows.find(r => r.severity === 'HIGH');
    expect(high.avgTtrHours).toBe(36);
    expect(high.slaMet).toBe(false);
  });

  it('always returns all 4 severities ordered', () => {
    const rows = svc.bySeverity([]);
    expect(rows.map(r => r.severity)).toEqual(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
  });
});

describe('incidentsAnalyticsService.byCategory', () => {
  it('groups by category + counts critical + open', () => {
    const rows = svc.byCategory([
      inc({ category: 'HUMAN_ERROR', severity: 'CRITICAL', status: 'REPORTED' }),
      inc({ category: 'HUMAN_ERROR', severity: 'LOW', status: 'RESOLVED' }),
      inc({ category: 'HARDWARE_FAILURE', severity: 'HIGH', status: 'INVESTIGATING' }),
    ]);
    const he = rows.find(r => r.category === 'HUMAN_ERROR');
    expect(he.total).toBe(2);
    expect(he.critical).toBe(1);
    expect(he.open).toBe(1);
    expect(rows[0].total).toBeGreaterThanOrEqual(rows[rows.length - 1].total);
  });
});

describe('incidentsAnalyticsService.rootCauseTopN', () => {
  it('aggregates root causes + counts permanent fixes', () => {
    const rows = svc.rootCauseTopN([
      inc({ rootCause: 'configuration drift', permanentFix: true }),
      inc({ rootCause: 'configuration drift', permanentFix: false }),
      inc({ rootCause: 'missing training', permanentFix: true }),
    ]);
    const drift = rows.find(r => r.rootCause === 'configuration drift');
    expect(drift.count).toBe(2);
    expect(drift.permanentFixRate).toBe(50);
  });

  it('honours limit', () => {
    const items = ['A', 'B', 'C', 'D'].map(rc => inc({ rootCause: rc }));
    expect(svc.rootCauseTopN(items, 2).length).toBe(2);
  });
});

describe('incidentsAnalyticsService.openBacklog', () => {
  it('flags open incidents past severity SLA', () => {
    // CRITICAL open for 10h — well past 4h SLA
    const rows = svc.openBacklog([
      inc({ status: 'INVESTIGATING', severity: 'CRITICAL', reportedDaysAgo: 0.5 }),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].overSla).toBe(true);
    expect(rows[0].breachedBy).toBeGreaterThan(0);
  });

  it('sorts by most-breached first', () => {
    const rows = svc.openBacklog([
      inc({ status: 'REPORTED', severity: 'HIGH', reportedDaysAgo: 2 }),
      inc({ status: 'REPORTED', severity: 'CRITICAL', reportedDaysAgo: 2 }),
    ]);
    // CRITICAL (4h SLA, 48h age) breaches more than HIGH (24h, 48h)
    expect(rows[0].severity).toBe('CRITICAL');
  });

  it('ignores resolved incidents', () => {
    const rows = svc.openBacklog([
      inc({ status: 'CLOSED', severity: 'CRITICAL', reportedDaysAgo: 30 }),
    ]);
    expect(rows.length).toBe(0);
  });
});

describe('incidentsAnalyticsService.monthlyTrend', () => {
  it('groups by month + computes resolution rate + MTTR', () => {
    const rows = svc.monthlyTrend([
      inc({ status: 'RESOLVED', reportedDaysAgo: 2, resolvedHoursAfterReport: 4 }),
      inc({ status: 'REPORTED', reportedDaysAgo: 2 }),
    ]);
    expect(rows.length).toBe(1);
    expect(rows[0].reported).toBe(2);
    expect(rows[0].resolutionRate).toBe(50);
    expect(rows[0].avgTtrHours).toBe(4);
  });
});

describe('incidentsAnalyticsService.detectSurge', () => {
  it('fires on month-over-month spike', () => {
    const items = [];
    // 3 last month
    for (let i = 0; i < 3; i++) items.push(inc({ reportedDaysAgo: 40 }));
    // 10 this month
    for (let i = 0; i < 10; i++) items.push(inc({ reportedDaysAgo: 2 }));
    const s = svc.detectSurge(items);
    expect(s.active).toBe(true);
    expect(s.jumpPct).toBeGreaterThan(50);
  });

  it('silent when prior volume below min', () => {
    const s = svc.detectSurge([inc({ reportedDaysAgo: 2 })]);
    expect(s.active).toBe(false);
    expect(s.reason).toBe('insufficient_prior_volume');
  });
});
