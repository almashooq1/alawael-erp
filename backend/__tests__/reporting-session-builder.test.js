/**
 * reporting-session-builder.test.js — Phase 10 Commit 7b.
 */

'use strict';

const {
  buildVolume,
  STATUS_KEYS,
  rollupSessions,
  computeRates,
  buildSummary,
} = require('../services/reporting/builders/sessionReportBuilder');

function row(overrides = {}) {
  return {
    _id: 's1',
    status: 'COMPLETED',
    sessionType: 'علاج طبيعي',
    date: new Date('2026-04-22T09:00:00Z'),
    branchId: 'br1',
    ...overrides,
  };
}

function makeModel(rows) {
  return {
    model: {
      find: jest.fn(async filter => {
        return rows.filter(r => {
          if (filter.date) {
            const d = new Date(r.date).getTime();
            if (filter.date.$gte && d < filter.date.$gte.getTime()) return false;
            if (filter.date.$lt && d >= filter.date.$lt.getTime()) return false;
          }
          if (filter.branchId && String(r.branchId) !== String(filter.branchId)) return false;
          if (filter.therapist && String(r.therapist) !== String(filter.therapist)) return false;
          if (filter.beneficiary && String(r.beneficiary) !== String(filter.beneficiary)) {
            return false;
          }
          return true;
        });
      }),
    },
  };
}

// ─── Pure helpers ──────────────────────────────────────────────

describe('STATUS_KEYS', () => {
  test('maps every TherapySession enum value to a totals key', () => {
    expect(STATUS_KEYS).toMatchObject({
      SCHEDULED: 'scheduled',
      CONFIRMED: 'confirmed',
      IN_PROGRESS: 'inProgress',
      COMPLETED: 'completed',
      CANCELLED_BY_PATIENT: 'cancelledByPatient',
      CANCELLED_BY_CENTER: 'cancelledByCenter',
      NO_SHOW: 'noShow',
      RESCHEDULED: 'rescheduled',
    });
  });
});

describe('rollupSessions', () => {
  test('counts total + per-status + per-type', () => {
    const { totals, byType } = rollupSessions([
      row({ status: 'COMPLETED', sessionType: 'علاج طبيعي' }),
      row({ status: 'COMPLETED', sessionType: 'علاج طبيعي' }),
      row({ status: 'NO_SHOW', sessionType: 'علاج وظيفي' }),
      row({ status: 'CANCELLED_BY_PATIENT', sessionType: 'أخرى' }),
      row({ status: 'CANCELLED_BY_CENTER', sessionType: 'أخرى' }),
    ]);
    expect(totals.total).toBe(5);
    expect(totals.completed).toBe(2);
    expect(totals.noShow).toBe(1);
    expect(totals.cancelledByPatient).toBe(1);
    expect(totals.cancelledByCenter).toBe(1);
    expect(byType.get('علاج طبيعي')).toBe(2);
    expect(byType.get('علاج وظيفي')).toBe(1);
    expect(byType.get('أخرى')).toBe(2);
  });

  test('unknown status goes to total only, not per-status buckets', () => {
    const { totals } = rollupSessions([row({ status: 'SPACE_CAMP' })]);
    expect(totals.total).toBe(1);
    expect(totals.completed).toBe(0);
    expect(totals.scheduled).toBe(0);
  });

  test('missing sessionType counted under "unknown"', () => {
    const { byType } = rollupSessions([{ status: 'COMPLETED' }]);
    expect(byType.get('unknown')).toBe(1);
  });
});

describe('computeRates', () => {
  test('completion = completed / (completed + cancelled + no_show); cancellation + noShow over total', () => {
    const totals = {
      total: 10,
      completed: 6,
      cancelledByPatient: 1,
      cancelledByCenter: 1,
      noShow: 2,
      scheduled: 0,
      confirmed: 0,
      inProgress: 0,
      rescheduled: 0,
    };
    const r = computeRates(totals);
    expect(r.completionRate).toBeCloseTo(6 / 10);
    expect(r.cancellationRate).toBeCloseTo(2 / 10);
    expect(r.noShowRate).toBeCloseTo(2 / 10);
  });

  test('zero totals → null rates (no divide-by-zero)', () => {
    const r = computeRates({ ...rollupSessions([]).totals });
    expect(r.completionRate).toBeNull();
    expect(r.cancellationRate).toBeNull();
    expect(r.noShowRate).toBeNull();
  });
});

describe('buildSummary', () => {
  test('emits headline metric = completion rate when total > 0', () => {
    const totals = {
      total: 5,
      completed: 4,
      noShow: 1,
      cancelledByPatient: 0,
      cancelledByCenter: 0,
      scheduled: 0,
      confirmed: 0,
      inProgress: 0,
      rescheduled: 0,
    };
    const rates = computeRates(totals);
    const byType = new Map([
      ['علاج طبيعي', 4],
      ['أخرى', 1],
    ]);
    const s = buildSummary(totals, rates, byType);
    expect(s.headlineMetric).not.toBeNull();
    expect(s.headlineMetric.label).toBe('completion rate');
    expect(s.headlineMetric.value).toMatch(/%$/);
    expect(s.items.some(i => i.includes('Top session types'))).toBe(true);
  });

  test('empty totals → null headline', () => {
    const totals = rollupSessions([]).totals;
    const s = buildSummary(totals, computeRates(totals), new Map());
    expect(s.headlineMetric).toBeNull();
  });
});

// ─── buildVolume end-to-end ────────────────────────────────────

describe('buildVolume', () => {
  const report = { id: 'session.volume.daily' };

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildVolume({ report, periodKey: 'not-a-key' });
    expect(doc.totals.total).toBe(0);
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });

  test('tenant-wide when no scope — all sessions in range', async () => {
    const rows = [
      row({ status: 'COMPLETED', date: new Date('2026-04-22T08:00:00Z'), branchId: 'br1' }),
      row({ status: 'COMPLETED', date: new Date('2026-04-22T09:00:00Z'), branchId: 'br2' }),
      row({ status: 'NO_SHOW', date: new Date('2026-04-22T10:00:00Z'), branchId: 'br1' }),
      row({ status: 'COMPLETED', date: new Date('2026-04-21T09:00:00Z'), branchId: 'br1' }), // out of range
    ];
    const TherapySession = makeModel(rows);
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      ctx: { models: { TherapySession } },
    });
    expect(doc.totals.total).toBe(3);
    expect(doc.totals.completed).toBe(2);
    expect(doc.totals.noShow).toBe(1);
    expect(doc.branch).toBeNull();
  });

  test('branch scope narrows the filter', async () => {
    const rows = [row({ branchId: 'br1' }), row({ branchId: 'br2' }), row({ branchId: 'br1' })];
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      scopeKey: 'branch:br1',
      ctx: { models: { TherapySession: makeModel(rows) } },
    });
    expect(doc.totals.total).toBe(2);
    expect(doc.branch).toEqual({ id: 'br1' });
  });

  test('therapist scope filters by therapist ref', async () => {
    const rows = [row({ therapist: 't1' }), row({ therapist: 't2' }), row({ therapist: 't1' })];
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      scopeKey: 'therapist:t1',
      ctx: { models: { TherapySession: makeModel(rows) } },
    });
    expect(doc.totals.total).toBe(2);
  });

  test('loadBranch hook wins over model lookup', async () => {
    const loadBranch = jest.fn(async () => ({ id: 'br1', name: 'Riyadh Main' }));
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      scopeKey: 'branch:br1',
      ctx: { models: { TherapySession: makeModel([]) }, loadBranch },
    });
    expect(doc.branch).toEqual({ id: 'br1', name: 'Riyadh Main' });
    expect(loadBranch).toHaveBeenCalledWith('br1');
  });

  test('falls back to ctx.models.Branch.findById for branch hydration', async () => {
    const Branch = {
      model: {
        async findById(id) {
          return { _id: id, name: 'Jeddah West' };
        },
      },
    };
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      scopeKey: 'branch:br2',
      ctx: { models: { TherapySession: makeModel([]), Branch } },
    });
    expect(doc.branch).toEqual({ id: 'br2', name: 'Jeddah West' });
  });

  test('model error swallowed — empty doc', async () => {
    const TherapySession = {
      model: {
        find: async () => {
          throw new Error('mongo down');
        },
      },
    };
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      ctx: { models: { TherapySession } },
    });
    expect(doc.totals.total).toBe(0);
  });

  test('accepts legacy `Session` model key as fallback', async () => {
    // Some deployments name the model "Session" rather than
    // "TherapySession"; builder accepts either.
    const rows = [row({ status: 'COMPLETED' })];
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      ctx: { models: { Session: makeModel(rows) } },
    });
    expect(doc.totals.total).toBe(1);
  });

  test('byType[] is sorted by count desc in the summary', async () => {
    const rows = [
      row({ sessionType: 'علاج طبيعي' }),
      row({ sessionType: 'علاج طبيعي' }),
      row({ sessionType: 'علاج طبيعي' }),
      row({ sessionType: 'علاج وظيفي' }),
      row({ sessionType: 'أخرى' }),
    ];
    const doc = await buildVolume({
      report,
      periodKey: '2026-04-22',
      ctx: { models: { TherapySession: makeModel(rows) } },
    });
    // Summary "Top session types" should list the most-common first.
    const topLine = doc.summary.items.find(i => i.includes('Top session types'));
    expect(topLine).toBeTruthy();
    expect(topLine.indexOf('علاج طبيعي=3')).toBeLessThan(topLine.indexOf('علاج وظيفي=1'));
  });
});
