/**
 * waiting-list-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/waitingListService');

function entry({
  status = 'waiting',
  daysAgo = 10,
  priority = 3,
  resolvedAfterDays = null,
  serviceType = 'علاج طبيعي',
}) {
  const requestedAt = new Date(Date.now() - daysAgo * 86400000);
  return {
    status,
    priority,
    requestedAt,
    serviceType,
    resolvedAt:
      resolvedAfterDays != null
        ? new Date(requestedAt.getTime() + resolvedAfterDays * 86400000)
        : null,
  };
}

describe('waitingListService.summarize', () => {
  it('empty → total 0, avg null', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.avgWaitDays).toBeNull();
  });

  it('counts each status bucket', () => {
    const s = svc.summarize([
      entry({ status: 'waiting', daysAgo: 10 }),
      entry({ status: 'waiting', daysAgo: 20 }),
      entry({ status: 'offered' }),
      entry({ status: 'enrolled' }),
      entry({ status: 'withdrawn' }),
      entry({ status: 'lapsed' }),
    ]);
    expect(s.total).toBe(6);
    expect(s.waiting).toBe(2);
    expect(s.offered).toBe(1);
    expect(s.enrolled).toBe(1);
    expect(s.withdrawn).toBe(1);
    expect(s.lapsed).toBe(1);
  });

  it('avgWaitDays and oldestWaiter computed only over waiting rows', () => {
    const s = svc.summarize([
      entry({ status: 'waiting', daysAgo: 10 }),
      entry({ status: 'waiting', daysAgo: 30 }),
      entry({ status: 'enrolled', daysAgo: 200 }), // doesn't affect avg
    ]);
    expect(s.avgWaitDays).toBe(20);
    expect(s.oldestWaiterDays).toBe(30);
  });
});

describe('waitingListService.prioritize', () => {
  it('lower priority number sorts first, then earlier requestedAt', () => {
    const arr = [
      { priority: 3, requestedAt: new Date('2026-01-10') },
      { priority: 1, requestedAt: new Date('2026-01-20') },
      { priority: 3, requestedAt: new Date('2026-01-05') },
      { priority: 2, requestedAt: new Date('2026-01-15') },
    ];
    const sorted = svc.prioritize(arr);
    expect(sorted.map(x => x.priority)).toEqual([1, 2, 3, 3]);
    expect(sorted[2].requestedAt.getDate()).toBe(5);
    expect(sorted[3].requestedAt.getDate()).toBe(10);
  });

  it('defaults missing priority to 3', () => {
    const sorted = svc.prioritize([
      { requestedAt: new Date() },
      { priority: 1, requestedAt: new Date() },
    ]);
    expect(sorted[0].priority).toBe(1);
  });

  it('does not mutate the input', () => {
    const arr = [{ priority: 2 }, { priority: 1 }];
    svc.prioritize(arr);
    expect(arr[0].priority).toBe(2);
  });
});

describe('waitingListService.estimateWaitDays', () => {
  it('null when no resolved samples', () => {
    expect(svc.estimateWaitDays([])).toBeNull();
    expect(svc.estimateWaitDays([entry({ status: 'waiting' })])).toBeNull();
  });

  it('returns median of enrolled wait durations', () => {
    const v = svc.estimateWaitDays([
      entry({ status: 'enrolled', daysAgo: 100, resolvedAfterDays: 10 }),
      entry({ status: 'enrolled', daysAgo: 100, resolvedAfterDays: 30 }),
      entry({ status: 'enrolled', daysAgo: 100, resolvedAfterDays: 50 }),
    ]);
    expect(v).toBe(30);
  });

  it('averages middle two when even sample', () => {
    const v = svc.estimateWaitDays([
      entry({ status: 'enrolled', resolvedAfterDays: 10 }),
      entry({ status: 'enrolled', resolvedAfterDays: 20 }),
      entry({ status: 'enrolled', resolvedAfterDays: 30 }),
      entry({ status: 'enrolled', resolvedAfterDays: 40 }),
    ]);
    expect(v).toBe(25);
  });

  it('ignores non-enrolled rows', () => {
    const v = svc.estimateWaitDays([
      entry({ status: 'withdrawn', resolvedAfterDays: 2 }), // excluded
      entry({ status: 'lapsed', resolvedAfterDays: 5 }), // excluded
      entry({ status: 'enrolled', resolvedAfterDays: 40 }),
    ]);
    expect(v).toBe(40);
  });
});

describe('waitingListService.detectStale', () => {
  it('returns waiters beyond stale threshold only', () => {
    const stale = svc.detectStale([
      entry({ status: 'waiting', daysAgo: 80 }),
      entry({ status: 'waiting', daysAgo: 30 }),
      entry({ status: 'offered', daysAgo: 100 }), // not waiting, skipped
    ]);
    expect(stale).toHaveLength(1);
    expect(stale[0].daysWaiting).toBeGreaterThanOrEqual(80);
  });

  it('sorts descending by daysWaiting', () => {
    const stale = svc.detectStale([
      entry({ status: 'waiting', daysAgo: 70 }),
      entry({ status: 'waiting', daysAgo: 120 }),
      entry({ status: 'waiting', daysAgo: 90 }),
    ]);
    expect(stale.map(s => s.daysWaiting).every((v, i, a) => i === 0 || a[i - 1] >= v)).toBe(true);
  });

  it('env override tunes staleDays', () => {
    process.env.WAITLIST_STALE_DAYS = '14';
    try {
      const stale = svc.detectStale([entry({ status: 'waiting', daysAgo: 20 })]);
      expect(stale).toHaveLength(1);
    } finally {
      delete process.env.WAITLIST_STALE_DAYS;
    }
  });
});

describe('waitingListService.groupByServiceType', () => {
  it('rolls up counts per service', () => {
    const g = svc.groupByServiceType([
      entry({ serviceType: 'علاج طبيعي', status: 'waiting' }),
      entry({ serviceType: 'علاج طبيعي', status: 'enrolled' }),
      entry({ serviceType: 'نطق وتخاطب', status: 'waiting' }),
    ]);
    expect(g['علاج طبيعي'].total).toBe(2);
    expect(g['علاج طبيعي'].waiting).toBe(1);
    expect(g['علاج طبيعي'].enrolled).toBe(1);
    expect(g['نطق وتخاطب'].waiting).toBe(1);
  });
});
