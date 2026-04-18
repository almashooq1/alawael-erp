/**
 * cpe-service.test.js — unit tests for SCFHS CPE credit math.
 *
 * The summary function is pure, so these tests run without any DB
 * or network. They cover:
 *   • 5-year window filtering (records outside are ignored)
 *   • per-category rollup
 *   • verified-vs-unverified split (only verified counts toward renewal)
 *   • compliance verdict (all categories + total must meet minimum)
 *   • needs-attention threshold (6 months out + non-compliant)
 */

'use strict';

const cpe = require('../services/cpeService');

function record({ cat, hours, daysAgo, verified = true }) {
  return {
    category: String(cat),
    creditHours: hours,
    activityDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    verified,
  };
}

describe('cpeService.summarize', () => {
  it('returns empty summary shape when no records', () => {
    const s = cpe.summarize([], new Date());
    expect(s.recordCount).toBe(0);
    expect(s.verifiedTotal).toBe(0);
    expect(s.compliant).toBe(false);
    expect(s.categoryStatus['1'].met).toBe(false);
  });

  it('sums credits per category for records inside the 5-year window', () => {
    const s = cpe.summarize(
      [
        record({ cat: 1, hours: 20, daysAgo: 10 }),
        record({ cat: 1, hours: 30, daysAgo: 100 }),
        record({ cat: 2, hours: 30, daysAgo: 50 }),
        record({ cat: 3, hours: 20, daysAgo: 30 }),
      ],
      new Date()
    );
    expect(s.verifiedByCategory[1]).toBe(50);
    expect(s.verifiedByCategory[2]).toBe(30);
    expect(s.verifiedByCategory[3]).toBe(20);
    expect(s.verifiedTotal).toBe(100);
    expect(s.compliant).toBe(true);
  });

  it('ignores records outside the 5-year window', () => {
    const s = cpe.summarize(
      [
        record({ cat: 1, hours: 1000, daysAgo: 365 * 6 }), // way too old
        record({ cat: 1, hours: 5, daysAgo: 365 * 2 }), // inside
      ],
      new Date()
    );
    expect(s.verifiedByCategory[1]).toBe(5);
    expect(s.recordCount).toBe(1);
  });

  it('unverified credits are tracked separately and do NOT count toward renewal', () => {
    const s = cpe.summarize(
      [
        record({ cat: 1, hours: 50, daysAgo: 30, verified: false }),
        record({ cat: 2, hours: 30, daysAgo: 30, verified: true }),
        record({ cat: 3, hours: 20, daysAgo: 30, verified: true }),
      ],
      new Date()
    );
    // Unverified cat-1 credits → raw byCategory has them but
    // verifiedByCategory doesn't → compliance still fails
    expect(s.byCategory[1]).toBe(50);
    expect(s.verifiedByCategory[1]).toBe(0);
    expect(s.compliant).toBe(false);
    expect(s.categoryStatus['1'].met).toBe(false);
    expect(s.categoryStatus['1'].deficit).toBe(50);
  });

  it('compliant=false when one category is below minimum even if total meets', () => {
    // 100 total verified, but all in cat 1 — cats 2 and 3 are deficit
    const s = cpe.summarize([record({ cat: 1, hours: 100, daysAgo: 30 })], new Date());
    expect(s.verifiedTotal).toBe(100);
    expect(s.totalStatus.met).toBe(true);
    expect(s.categoryStatus['2'].met).toBe(false);
    expect(s.compliant).toBe(false);
  });

  it('per-category deficit is reported accurately', () => {
    const s = cpe.summarize(
      [
        record({ cat: 1, hours: 30, daysAgo: 30 }), // need 50, have 30
        record({ cat: 2, hours: 30, daysAgo: 30 }), // meets
        record({ cat: 3, hours: 5, daysAgo: 30 }), // need 20, have 5
      ],
      new Date()
    );
    expect(s.categoryStatus['1'].deficit).toBe(20);
    expect(s.categoryStatus['2'].deficit).toBe(0);
    expect(s.categoryStatus['3'].deficit).toBe(15);
  });

  it('cycle window is 5 years × 365 days ending at cycleEndDate', () => {
    const end = new Date('2028-06-15');
    const s = cpe.summarize([], end);
    expect(s.cycle.end).toEqual(end);
    const expectedStart = new Date(end.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
    expect(s.cycle.start).toEqual(expectedStart);
  });

  it('env override tunes per-category minimums', () => {
    process.env.SCFHS_CPE_MIN_CAT1 = '10';
    try {
      const s = cpe.summarize([record({ cat: 1, hours: 10, daysAgo: 30 })], new Date());
      expect(s.categoryStatus['1'].required).toBe(10);
      expect(s.categoryStatus['1'].met).toBe(true);
    } finally {
      delete process.env.SCFHS_CPE_MIN_CAT1;
    }
  });
});

describe('cpeService.daysUntilDeadline', () => {
  it('positive for future dates, negative for past', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(cpe.daysUntilDeadline(future)).toBeGreaterThan(29);
    expect(cpe.daysUntilDeadline(future)).toBeLessThan(32);
    expect(cpe.daysUntilDeadline(past)).toBeLessThan(0);
  });
});

describe('cpeService.needsAttention', () => {
  const compliantSummary = { compliant: true };
  const failingSummary = { compliant: false };

  it('false when therapist is already compliant, regardless of date', () => {
    const oneWeekFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    expect(cpe.needsAttention(compliantSummary, oneWeekFuture)).toBe(false);
  });

  it('true when non-compliant AND within 6 months of deadline', () => {
    const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    expect(cpe.needsAttention(failingSummary, threeMonths)).toBe(true);
  });

  it('false when non-compliant but more than 6 months out', () => {
    const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    expect(cpe.needsAttention(failingSummary, oneYear)).toBe(false);
  });

  it('true when non-compliant AND deadline is in the past (overdue)', () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    expect(cpe.needsAttention(failingSummary, past)).toBe(true);
  });
});
