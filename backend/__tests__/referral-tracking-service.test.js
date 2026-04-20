/**
 * referral-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/referralTrackingService');

function rec({
  direction = 'incoming',
  status = 'pending',
  daysAgo = 10,
  referralSource = 'مستشفى الملك فهد',
  sourceOrgSlug = null,
  destinationOrg = null,
}) {
  return {
    direction,
    status,
    referralSource,
    sourceOrgSlug,
    destinationOrg,
    receivedAt: new Date(Date.now() - daysAgo * 86400000),
  };
}

describe('referralService.summarize', () => {
  it('empty → zeros, conversionRate null', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.conversionRate).toBeNull();
  });

  it('conversionRate = wins / settled over non-pending', () => {
    const s = svc.summarize([
      rec({ status: 'accepted' }),
      rec({ status: 'converted' }),
      rec({ status: 'declined' }),
      rec({ status: 'pending' }),
    ]);
    // wins=2, settled=3 (pending excluded) → 66.7%
    expect(s.conversionRate).toBe(66.7);
  });

  it('direction filter scopes to one direction', () => {
    const recs = [
      rec({ direction: 'incoming', status: 'accepted' }),
      rec({ direction: 'outgoing', status: 'pending' }),
    ];
    expect(svc.summarize(recs, 'incoming').total).toBe(1);
    expect(svc.summarize(recs, 'outgoing').total).toBe(1);
  });

  it('settled=0 → conversionRate null (no data to judge on)', () => {
    const s = svc.summarize([rec({ status: 'pending' }), rec({ status: 'pending' })]);
    expect(s.conversionRate).toBeNull();
  });
});

describe('referralService.topReferrers', () => {
  it('ignores outgoing direction entirely', () => {
    const r = svc.topReferrers([
      rec({ direction: 'outgoing', referralSource: 'X', destinationOrg: 'X' }),
      rec({ direction: 'outgoing', referralSource: 'Y' }),
    ]);
    expect(r).toEqual([]);
  });

  it('dedupes by sourceOrgSlug when present, else by lowercased referralSource', () => {
    const r = svc.topReferrers([
      rec({ referralSource: 'د. أحمد', sourceOrgSlug: 'ahmad', status: 'accepted' }),
      rec({ referralSource: 'د. أحمد', sourceOrgSlug: 'ahmad', status: 'accepted' }),
      rec({ referralSource: 'مستشفى الملك فهد', status: 'pending' }),
      rec({ referralSource: 'مستشفى الملك فهد', status: 'pending' }),
    ]);
    expect(r).toHaveLength(2);
    expect(r[0].sourceOrgSlug).toBe('ahmad'); // 2 wins, ranks first
  });

  it('respects minReferralsForRanking filter', () => {
    process.env.REFERRAL_RANK_MIN = '3';
    try {
      const r = svc.topReferrers([
        rec({ sourceOrgSlug: 's1', status: 'accepted' }),
        rec({ sourceOrgSlug: 's1', status: 'accepted' }),
        rec({ sourceOrgSlug: 's1', status: 'accepted' }),
        rec({ sourceOrgSlug: 's2', status: 'accepted' }),
        rec({ sourceOrgSlug: 's2', status: 'accepted' }),
      ]);
      expect(r.map(x => x.sourceOrgSlug)).toEqual(['s1']); // s2 below threshold of 3
    } finally {
      delete process.env.REFERRAL_RANK_MIN;
    }
  });

  it('ranks by wins desc, then total desc', () => {
    const r = svc.topReferrers([
      rec({ sourceOrgSlug: 'a', status: 'accepted' }),
      rec({ sourceOrgSlug: 'a', status: 'accepted' }),
      rec({ sourceOrgSlug: 'a', status: 'declined' }), // 2 wins, 3 total
      rec({ sourceOrgSlug: 'b', status: 'accepted' }),
      rec({ sourceOrgSlug: 'b', status: 'accepted' }),
      rec({ sourceOrgSlug: 'b', status: 'accepted' }), // 3 wins, 3 total
    ]);
    expect(r.map(x => x.sourceOrgSlug)).toEqual(['b', 'a']);
  });
});

describe('referralService.closeLoopGaps', () => {
  it('empty → empty list', () => {
    expect(svc.closeLoopGaps([])).toEqual([]);
  });

  it('returns outgoing+pending+past-cutoff only', () => {
    const gaps = svc.closeLoopGaps([
      rec({ direction: 'outgoing', status: 'pending', daysAgo: 45 }),
      rec({ direction: 'outgoing', status: 'pending', daysAgo: 10 }), // within 30d
      rec({ direction: 'outgoing', status: 'accepted', daysAgo: 60 }), // not pending
      rec({ direction: 'incoming', status: 'pending', daysAgo: 90 }), // not outgoing
    ]);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].daysOpen).toBeGreaterThanOrEqual(45);
  });

  it('sorts descending by daysOpen', () => {
    const gaps = svc.closeLoopGaps([
      rec({ direction: 'outgoing', status: 'pending', daysAgo: 40 }),
      rec({ direction: 'outgoing', status: 'pending', daysAgo: 80 }),
      rec({ direction: 'outgoing', status: 'pending', daysAgo: 55 }),
    ]);
    const days = gaps.map(g => g.daysOpen);
    expect(days.every((v, i, a) => i === 0 || a[i - 1] >= v)).toBe(true);
  });

  it('env override tunes closeLoopDays', () => {
    process.env.REFERRAL_CLOSE_LOOP_DAYS = '7';
    try {
      const gaps = svc.closeLoopGaps([
        rec({ direction: 'outgoing', status: 'pending', daysAgo: 10 }),
      ]);
      expect(gaps).toHaveLength(1);
    } finally {
      delete process.env.REFERRAL_CLOSE_LOOP_DAYS;
    }
  });
});

describe('referralService.trendByMonth', () => {
  it('groups by YYYY-MM and sorts ascending', () => {
    const series = svc.trendByMonth([
      { ...rec({}), receivedAt: new Date('2026-02-10') },
      { ...rec({}), receivedAt: new Date('2026-01-15') },
      { ...rec({}), receivedAt: new Date('2026-02-20') },
    ]);
    expect(series.map(s => s.month)).toEqual(['2026-01', '2026-02']);
    expect(series[1].total).toBe(2);
  });
});
