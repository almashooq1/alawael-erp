/**
 * reporting-therapist-builder.test.js — Phase 10 Commit 7c.
 */

'use strict';

const {
  buildProductivity,
  buildCaseload,
  groupProductivity,
  decorateProductivity,
  groupCaseload,
  decorateCaseload,
} = require('../services/reporting/builders/therapistReportBuilder');

function row(overrides = {}) {
  return {
    _id: 's1',
    status: 'COMPLETED',
    therapist: 't1',
    beneficiary: 'b1',
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
          return true;
        });
      }),
    },
  };
}

// ─── Productivity — pure helpers ─────────────────────────────────

describe('groupProductivity + decorateProductivity', () => {
  test('accumulates per-therapist counts and computes rates', () => {
    const rows = [
      row({ therapist: 't1', status: 'COMPLETED' }),
      row({ therapist: 't1', status: 'COMPLETED' }),
      row({ therapist: 't1', status: 'NO_SHOW' }),
      row({ therapist: 't2', status: 'COMPLETED' }),
      row({ therapist: 't2', status: 'CANCELLED_BY_CENTER' }),
    ];
    const decorated = decorateProductivity(groupProductivity(rows));
    // Sorted by completed desc
    expect(decorated.map(d => d.therapistId)).toEqual(['t1', 't2']);
    expect(decorated[0]).toMatchObject({
      therapistId: 't1',
      total: 3,
      completed: 2,
      noShow: 1,
    });
    expect(decorated[0].completionRate).toBeCloseTo(2 / 3);
    expect(decorated[0].noShowRate).toBeCloseTo(1 / 3);
  });

  test('accepts `therapistId` as ref alias', () => {
    const rows = [row({ therapist: undefined, therapistId: 'tX' })];
    const out = decorateProductivity(groupProductivity(rows));
    expect(out[0].therapistId).toBe('tX');
  });

  test('sessions without a therapist are skipped', () => {
    const rows = [row({ therapist: null })];
    const out = decorateProductivity(groupProductivity(rows));
    expect(out).toEqual([]);
  });
});

// ─── Caseload — pure helpers ─────────────────────────────────────

describe('groupCaseload + decorateCaseload', () => {
  test('dedupes beneficiaries per therapist; computes avgSessionsPerBeneficiary', () => {
    const rows = [
      row({ therapist: 't1', beneficiary: 'b1' }),
      row({ therapist: 't1', beneficiary: 'b1' }), // same beneficiary twice
      row({ therapist: 't1', beneficiary: 'b2' }),
      row({ therapist: 't2', beneficiary: 'b3' }),
    ];
    const out = decorateCaseload(groupCaseload(rows));
    expect(out.map(d => d.therapistId)).toEqual(['t1', 't2']);
    expect(out[0]).toMatchObject({
      therapistId: 't1',
      beneficiaries: 2,
      sessions: 3,
      avgSessionsPerBeneficiary: 1.5,
    });
    expect(out[1]).toMatchObject({
      therapistId: 't2',
      beneficiaries: 1,
      sessions: 1,
      avgSessionsPerBeneficiary: 1,
    });
  });

  test('therapist row without beneficiary still counts the session', () => {
    const rows = [
      row({ therapist: 't1', beneficiary: null }),
      row({ therapist: 't1', beneficiary: 'b1' }),
    ];
    const out = decorateCaseload(groupCaseload(rows));
    expect(out[0].sessions).toBe(2);
    expect(out[0].beneficiaries).toBe(1);
  });
});

// ─── buildProductivity end-to-end ────────────────────────────────

describe('buildProductivity', () => {
  const report = { id: 'therapist.productivity.weekly' };

  test('tenant-wide: rolls up across all branches in range', async () => {
    const rows = [
      row({ therapist: 't1', status: 'COMPLETED' }),
      row({ therapist: 't1', status: 'COMPLETED' }),
      row({ therapist: 't2', status: 'NO_SHOW' }),
      row({ therapist: 't2', status: 'COMPLETED' }),
    ];
    const doc = await buildProductivity({
      report,
      periodKey: '2026-W17',
      ctx: { models: { TherapySession: makeModel(rows) } },
    });
    expect(doc.totals).toEqual({ therapists: 2, sessions: 4, completed: 3 });
    expect(doc.byTherapist[0].therapistId).toBe('t1');
    expect(doc.summary.headlineMetric.label).toBe('avg completion rate');
  });

  test('branch scope narrows the filter', async () => {
    const rows = [
      row({ therapist: 't1', branchId: 'br1' }),
      row({ therapist: 't2', branchId: 'br2' }),
    ];
    const doc = await buildProductivity({
      report,
      periodKey: '2026-W17',
      scopeKey: 'branch:br1',
      ctx: { models: { TherapySession: makeModel(rows) } },
    });
    expect(doc.totals.therapists).toBe(1);
    expect(doc.branch).toEqual({ id: 'br1' });
  });

  test('names hydrated via Employee.find ({_id: {$in:[...]}})', async () => {
    const rows = [row({ therapist: 't1' }), row({ therapist: 't2' })];
    const Employee = {
      model: {
        find: jest.fn(async filter => {
          expect(filter._id.$in.sort()).toEqual(['t1', 't2']);
          return [
            { _id: 't1', fullName: 'Dr. Ahmad' },
            { _id: 't2', fullName: 'Ms. Fatima' },
          ];
        }),
      },
    };
    const doc = await buildProductivity({
      report,
      periodKey: '2026-W17',
      ctx: { models: { TherapySession: makeModel(rows), Employee } },
    });
    const names = doc.byTherapist.map(t => t.name).sort();
    expect(names).toEqual(['Dr. Ahmad', 'Ms. Fatima']);
  });

  test('ctx.loadTherapists hook wins over Employee model', async () => {
    const loadTherapists = jest.fn(async () => [{ _id: 't1', name: 'Custom Name' }]);
    const doc = await buildProductivity({
      report,
      periodKey: '2026-W17',
      ctx: {
        models: { TherapySession: makeModel([row({ therapist: 't1' })]) },
        loadTherapists,
      },
    });
    expect(loadTherapists).toHaveBeenCalled();
    expect(doc.byTherapist[0].name).toBe('Custom Name');
  });

  test('degrades cleanly on unrecognised periodKey', async () => {
    const doc = await buildProductivity({ report, periodKey: 'nope' });
    expect(doc.totals.therapists).toBe(0);
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });
});

// ─── buildCaseload end-to-end ────────────────────────────────────

describe('buildCaseload', () => {
  const report = { id: 'therapist.caseload.monthly' };

  test('computes unique beneficiaries + per-therapist distribution', async () => {
    const rows = [
      row({ therapist: 't1', beneficiary: 'b1' }),
      row({ therapist: 't1', beneficiary: 'b2' }),
      row({ therapist: 't1', beneficiary: 'b2' }),
      row({ therapist: 't2', beneficiary: 'b1' }), // also seen by t2
      row({ therapist: 't2', beneficiary: 'b3' }),
    ];
    const doc = await buildCaseload({
      report,
      periodKey: '2026-04',
      ctx: { models: { TherapySession: makeModel(rows) } },
    });
    // unique beneficiaries across all therapists = {b1, b2, b3} = 3
    expect(doc.totals).toEqual({ therapists: 2, beneficiaries: 3, sessions: 5 });
    expect(doc.byTherapist[0]).toMatchObject({ therapistId: 't1', beneficiaries: 2, sessions: 3 });
    expect(doc.byTherapist[1]).toMatchObject({ therapistId: 't2', beneficiaries: 2, sessions: 2 });
    expect(doc.summary.headlineMetric.label).toBe('avg beneficiaries per therapist');
  });

  test('empty period → empty doc with null headline', async () => {
    const doc = await buildCaseload({
      report,
      periodKey: '2026-04',
      ctx: { models: { TherapySession: makeModel([]) } },
    });
    expect(doc.totals.therapists).toBe(0);
    expect(doc.summary.headlineMetric).toBeNull();
  });
});
