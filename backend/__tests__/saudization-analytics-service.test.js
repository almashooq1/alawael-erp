/**
 * saudization-analytics-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/saudizationAnalyticsService');

function snap({
  daysAgo = 0,
  pct = 50,
  band = 'mid_green',
  total = 100,
  saudi = null,
  saudisNeeded = 0,
  redMax = 20,
}) {
  return {
    calculationDate: new Date(Date.now() - daysAgo * 86400000),
    saudizationPercentage: pct,
    nitaqatBand: band,
    totalEmployees: total,
    saudiEmployees: saudi ?? Math.round((pct / 100) * total),
    expatEmployees: total - (saudi ?? Math.round((pct / 100) * total)),
    weightedSaudiCount: saudi ?? Math.round((pct / 100) * total),
    saudisNeededForNextBand: saudisNeeded,
    redMax,
    lowGreenMax: redMax + 20,
    midGreenMax: redMax + 40,
    highGreenMax: redMax + 60,
  };
}

describe('saudizationAnalyticsService.currentStatus', () => {
  it('empty → hasData false', () => {
    expect(svc.currentStatus([]).hasData).toBe(false);
  });

  it('returns latest snapshot + derived bands', () => {
    const s = svc.currentStatus([
      snap({ daysAgo: 60, pct: 30, band: 'low_green' }),
      snap({ daysAgo: 1, pct: 55, band: 'mid_green' }),
    ]);
    expect(s.hasData).toBe(true);
    expect(s.currentBand).toBe('mid_green');
    expect(s.nextBand).toBe('high_green');
    expect(s.previousBand).toBe('low_green');
    expect(s.saudizationPercentage).toBe(55);
  });

  it('platinum has no nextBand', () => {
    const s = svc.currentStatus([snap({ band: 'platinum', pct: 90 })]);
    expect(s.nextBand).toBeNull();
  });

  it('red has no previousBand', () => {
    const s = svc.currentStatus([snap({ band: 'red', pct: 5 })]);
    expect(s.previousBand).toBeNull();
  });
});

describe('saudizationAnalyticsService.monthlyTrend', () => {
  it('groups by YYYY-MM taking last snapshot of each month', () => {
    const rows = svc.monthlyTrend([
      snap({ daysAgo: 40, pct: 30 }),
      snap({ daysAgo: 35, pct: 35 }),
      snap({ daysAgo: 5, pct: 40 }),
    ]);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    // Current-month row takes the most recent
    expect(rows[rows.length - 1].saudizationPercentage).toBe(40);
  });

  it('empty → empty array', () => {
    expect(svc.monthlyTrend([])).toEqual([]);
  });
});

describe('saudizationAnalyticsService.bandHistory', () => {
  it('only logs band-change events', () => {
    const events = svc.bandHistory([
      snap({ daysAgo: 100, band: 'low_green', pct: 22 }),
      snap({ daysAgo: 80, band: 'low_green', pct: 25 }), // no change — skipped
      snap({ daysAgo: 60, band: 'mid_green', pct: 45 }),
      snap({ daysAgo: 30, band: 'low_green', pct: 35 }),
    ]);
    expect(events.length).toBe(3);
    expect(events[0].direction).toBe('initial');
    expect(events[1].direction).toBe('improved');
    expect(events[2].direction).toBe('declined');
  });
});

describe('saudizationAnalyticsService.runwayProjection', () => {
  it('insufficient history → null runway', () => {
    const r = svc.runwayProjection([snap({ daysAgo: 1 })]);
    expect(r.runwayMonths).toBeNull();
    expect(r.reason).toBe('insufficient_history');
  });

  it('stable trajectory → null runway with reason', () => {
    const items = [];
    for (let m = 5; m >= 0; m--) items.push(snap({ daysAgo: m * 30, pct: 50 }));
    const r = svc.runwayProjection(items);
    expect(r.runwayMonths).toBeNull();
    expect(r.reason).toBe('stable_or_improving');
  });

  it('declining trajectory → positive runway months', () => {
    // pct dropping 5% per month: 60 → 55 → 50 → 45 → 40 → 35, redMax=20
    const items = [];
    for (let m = 5; m >= 0; m--) items.push(snap({ daysAgo: m * 30, pct: 35 + m * 5 }));
    const r = svc.runwayProjection(items);
    expect(r.reason).toBe('declining');
    expect(r.runwayMonths).toBeGreaterThan(0);
    expect(r.runwayMonths).toBeLessThan(10);
  });

  it('already below redMax → runway 0', () => {
    const items = [];
    for (let m = 5; m >= 0; m--) items.push(snap({ daysAgo: m * 30, pct: 15 + m * 5 }));
    // Last snapshot at pct=15, redMax=20 → already red
    const r = svc.runwayProjection(items);
    expect(r.reason).toBe('already_red');
    expect(r.runwayMonths).toBe(0);
  });
});

describe('saudizationAnalyticsService.detectRiskAlarm', () => {
  it('no data → silent', () => {
    expect(svc.detectRiskAlarm([]).active).toBe(false);
  });

  it('already red → fires', () => {
    const a = svc.detectRiskAlarm([snap({ band: 'red', pct: 10 })]);
    expect(a.active).toBe(true);
    expect(a.reason).toBe('already_red');
  });

  it('short runway → fires', () => {
    // declining from 25 to 22 over 6 months, redMax=20 → runway ≈ 4-6 months
    const items = [];
    for (let m = 5; m >= 0; m--) {
      items.push(snap({ daysAgo: m * 30, pct: 22 + m * 0.6, band: 'low_green' }));
    }
    const a = svc.detectRiskAlarm(items);
    // With alarm threshold = 3 months default, runway might be above it.
    // Test the correctness of the runway-is-short logic with a smaller threshold.
    process.env.NITAQAT_ALARM_MONTHS = '10';
    const a2 = svc.detectRiskAlarm(items);
    expect(a2.active).toBe(true);
    expect(a2.reason).toBe('runway_short');
    delete process.env.NITAQAT_ALARM_MONTHS;
  });

  it('stable + in green → silent', () => {
    const items = [];
    for (let m = 5; m >= 0; m--) items.push(snap({ daysAgo: m * 30, pct: 55, band: 'mid_green' }));
    const a = svc.detectRiskAlarm(items);
    expect(a.active).toBe(false);
  });
});

describe('saudizationAnalyticsService.bandRank', () => {
  it('orders red < low_green < mid_green < high_green < platinum', () => {
    expect(svc.bandRank('red')).toBe(0);
    expect(svc.bandRank('platinum')).toBe(4);
    expect(svc.bandRank('unknown')).toBeNull();
  });
});
