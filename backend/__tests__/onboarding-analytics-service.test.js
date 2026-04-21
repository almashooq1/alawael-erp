/**
 * onboarding-analytics-service.test.js — pure-math tests.
 */

'use strict';

const svc = require('../services/onboardingAnalyticsService');

function cl({
  status = 'in_progress',
  startedDaysAgo = 14,
  targetDaysAgo = null,
  completedDaysAgo = null,
  completionPct = 50,
  tasks = [
    { title: 'Issue laptop', status: 'pending', responsible: 'it' },
    { title: 'Orientation', status: 'completed', responsible: 'hr' },
  ],
}) {
  const startDate = new Date(Date.now() - startedDaysAgo * 86400000);
  const targetCompletionDate =
    targetDaysAgo != null ? new Date(Date.now() - targetDaysAgo * 86400000) : null;
  const actualCompletionDate =
    completedDaysAgo != null ? new Date(Date.now() - completedDaysAgo * 86400000) : null;
  return {
    status,
    startDate,
    targetCompletionDate,
    actualCompletionDate,
    completionPercentage: completionPct,
    tasks,
  };
}

describe('onboardingAnalyticsService.summarize', () => {
  it('empty → zeros', () => {
    const s = svc.summarize([]);
    expect(s.total).toBe(0);
    expect(s.avgCompletionDays).toBeNull();
  });

  it('splits by status + computes avg duration for completed', () => {
    const s = svc.summarize([
      cl({ status: 'pending', startedDaysAgo: 2 }),
      cl({ status: 'in_progress', startedDaysAgo: 10 }),
      cl({ status: 'completed', startedDaysAgo: 20, completedDaysAgo: 5 }), // 15 days
      cl({ status: 'completed', startedDaysAgo: 30, completedDaysAgo: 10 }), // 20 days
    ]);
    expect(s.byStatus.pending).toBe(1);
    expect(s.byStatus.in_progress).toBe(1);
    expect(s.byStatus.completed).toBe(2);
    expect(s.avgCompletionDays).toBe(17.5);
  });

  it('counts stalled (past target + grace)', () => {
    const s = svc.summarize([
      cl({ status: 'in_progress', targetDaysAgo: 10, startedDaysAgo: 30 }),
      cl({ status: 'in_progress', targetDaysAgo: 1, startedDaysAgo: 5 }), // within grace
      cl({ status: 'completed', targetDaysAgo: 20, completedDaysAgo: 5 }), // not stalled
    ]);
    expect(s.stalledCount).toBe(1);
  });
});

describe('onboardingAnalyticsService.byStatus', () => {
  it('returns ordered status breakdown with pct', () => {
    const rows = svc.byStatus([cl({ status: 'pending' }), cl({ status: 'completed' })]);
    expect(rows.length).toBe(3);
    expect(rows[0].status).toBe('pending');
    expect(rows[0].pct).toBe(50);
  });
});

describe('onboardingAnalyticsService.taskCompletion', () => {
  it('aggregates task titles + sorts worst-first', () => {
    const rows = svc.taskCompletion([
      cl({
        tasks: [
          { title: 'Issue laptop', status: 'pending', responsible: 'it' },
          { title: 'Orientation', status: 'completed', responsible: 'hr' },
        ],
      }),
      cl({
        tasks: [
          { title: 'Issue laptop', status: 'pending', responsible: 'it' },
          { title: 'Orientation', status: 'completed', responsible: 'hr' },
        ],
      }),
    ]);
    // Issue laptop: 0/2 = 0%, Orientation: 2/2 = 100%
    // Worst first
    expect(rows[0].title).toBe('Issue laptop');
    expect(rows[0].completionRate).toBe(0);
    expect(rows[1].completionRate).toBe(100);
  });
});

describe('onboardingAnalyticsService.byResponsible', () => {
  it('groups by responsible party + computes completion rate', () => {
    const rows = svc.byResponsible([
      cl({
        tasks: [
          { title: 'T1', status: 'completed', responsible: 'hr' },
          { title: 'T2', status: 'completed', responsible: 'hr' },
          { title: 'T3', status: 'pending', responsible: 'it' },
        ],
      }),
    ]);
    const hr = rows.find(r => r.responsible === 'hr');
    expect(hr.completionRate).toBe(100);
    const it = rows.find(r => r.responsible === 'it');
    expect(it.completionRate).toBe(0);
  });
});

describe('onboardingAnalyticsService.stalledChecklists', () => {
  it('lists overdue checklists sorted by days-late desc', () => {
    const rows = svc.stalledChecklists([
      cl({ status: 'in_progress', targetDaysAgo: 5, startedDaysAgo: 20 }),
      cl({ status: 'in_progress', targetDaysAgo: 20, startedDaysAgo: 40 }),
      cl({ status: 'completed', targetDaysAgo: 30, completedDaysAgo: 5 }),
    ]);
    expect(rows.length).toBe(2);
    expect(rows[0].daysLate).toBeGreaterThan(rows[1].daysLate);
  });

  it('respects grace period', () => {
    // targetDaysAgo=1 means 1 day past — within 3-day grace, so not stalled
    const rows = svc.stalledChecklists([
      cl({ status: 'in_progress', targetDaysAgo: 1, startedDaysAgo: 10 }),
    ]);
    expect(rows.length).toBe(0);
  });
});

describe('onboardingAnalyticsService.monthlyTrend', () => {
  it('counts started + completed per month', () => {
    const rows = svc.monthlyTrend([
      cl({ startedDaysAgo: 5, status: 'in_progress' }),
      cl({ startedDaysAgo: 5, status: 'completed', completedDaysAgo: 2 }),
    ]);
    expect(rows.length).toBeGreaterThanOrEqual(1);
    const latest = rows[rows.length - 1];
    expect(latest.started).toBe(2);
    expect(latest.completed).toBe(1);
  });
});

describe('onboardingAnalyticsService.detectOverdueAlarm', () => {
  it('fires when stalled count ≥ threshold', () => {
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push(cl({ status: 'in_progress', targetDaysAgo: 20, startedDaysAgo: 40 }));
    }
    const a = svc.detectOverdueAlarm(items);
    expect(a.active).toBe(true);
    expect(a.stalledCount).toBe(5);
  });

  it('silent when below threshold', () => {
    const a = svc.detectOverdueAlarm([
      cl({ status: 'in_progress', targetDaysAgo: 20, startedDaysAgo: 40 }),
    ]);
    expect(a.active).toBe(false);
    expect(a.stalledCount).toBe(1);
  });
});
