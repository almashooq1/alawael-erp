/**
 * reporting-branch-builder.test.js — Phase 10 Commit 7d.
 */

'use strict';

const {
  buildOccupancy,
  summariseSessions,
  capacityBlock,
  daysBetween,
} = require('../services/reporting/builders/branchReportBuilder');

function sess(overrides = {}) {
  return {
    _id: 's1',
    status: 'COMPLETED',
    therapist: 't1',
    beneficiary: 'b1',
    date: new Date('2026-04-21T09:00:00Z'),
    branchId: 'br1',
    ...overrides,
  };
}

function makeSessionModel(rows) {
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

function makeBranchModel(branches) {
  return {
    model: {
      findById: jest.fn(async id => branches.find(b => String(b._id) === String(id)) || null),
    },
  };
}

describe('daysBetween', () => {
  test('computes integer days across a range', () => {
    expect(daysBetween(new Date('2026-04-20T00:00:00Z'), new Date('2026-04-27T00:00:00Z'))).toBe(7);
    expect(daysBetween(new Date('2026-04-22T00:00:00Z'), new Date('2026-04-23T00:00:00Z'))).toBe(1);
  });
  test('returns 0 for invalid inputs', () => {
    expect(daysBetween(null, new Date())).toBe(0);
    expect(daysBetween(new Date(), 'nope')).toBe(0);
  });
});

describe('summariseSessions', () => {
  test('counts total + completed + unique beneficiaries + unique therapists', () => {
    const out = summariseSessions([
      sess({ therapist: 't1', beneficiary: 'b1', status: 'COMPLETED' }),
      sess({ therapist: 't1', beneficiary: 'b2', status: 'COMPLETED' }),
      sess({ therapist: 't2', beneficiary: 'b1', status: 'NO_SHOW' }),
    ]);
    expect(out).toEqual({
      totalSessions: 3,
      completedSessions: 2,
      activePatients: 2,
      therapistsActive: 2,
    });
  });
});

describe('capacityBlock', () => {
  test('multiplies max_daily_sessions by days', () => {
    const out = capacityBlock(
      { capacity: { max_daily_sessions: 40, max_patients: 120, therapy_rooms: 8 } },
      7
    );
    expect(out).toEqual({
      maxDailySessions: 40,
      maxPatients: 120,
      therapyRooms: 8,
      capacityForPeriod: 280,
    });
  });
  test('null branch or missing capacity → null', () => {
    expect(capacityBlock(null, 7)).toBeNull();
    expect(capacityBlock({}, 7)).toBeNull();
  });
});

describe('buildOccupancy', () => {
  const report = { id: 'branch.occupancy.weekly' };

  test('computes occupancyRate when capacity present', async () => {
    // 1 week = 7 days × 10/day = 70 capacity. 14 sessions → 20%.
    const rows = [];
    for (let i = 0; i < 14; i++) {
      rows.push(
        sess({
          _id: `s${i}`,
          branchId: 'br1',
          therapist: `t${i % 3}`,
          beneficiary: `b${i % 5}`,
          date: new Date('2026-04-21T09:00:00Z'),
        })
      );
    }
    const doc = await buildOccupancy({
      report,
      periodKey: '2026-W17',
      scopeKey: 'branch:br1',
      ctx: {
        models: {
          TherapySession: makeSessionModel(rows),
          Branch: makeBranchModel([
            { _id: 'br1', name: 'Riyadh Main', capacity: { max_daily_sessions: 10 } },
          ]),
        },
      },
    });
    expect(doc.days).toBe(7);
    expect(doc.capacity.capacityForPeriod).toBe(70);
    expect(doc.actual.totalSessions).toBe(14);
    expect(doc.occupancyRate).toBeCloseTo(0.2);
    expect(doc.branch.name).toBe('Riyadh Main');
    expect(doc.summary.headlineMetric.label).toBe('occupancy rate');
  });

  test('occupancyRate is null when no branch capacity (tenant-wide run)', async () => {
    const doc = await buildOccupancy({
      report,
      periodKey: '2026-W17',
      ctx: { models: { TherapySession: makeSessionModel([sess({ branchId: 'br1' })]) } },
    });
    expect(doc.branch).toBeNull();
    expect(doc.capacity).toBeNull();
    expect(doc.occupancyRate).toBeNull();
    expect(doc.actual.totalSessions).toBe(1);
  });

  test('branch lookup returns {id} stub when Branch.findById misses', async () => {
    const doc = await buildOccupancy({
      report,
      periodKey: '2026-W17',
      scopeKey: 'branch:missing',
      ctx: { models: { TherapySession: makeSessionModel([]), Branch: makeBranchModel([]) } },
    });
    expect(doc.branch).toEqual({ id: 'missing' });
  });

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildOccupancy({ report, periodKey: 'nope' });
    expect(doc.days).toBe(0);
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });
});
