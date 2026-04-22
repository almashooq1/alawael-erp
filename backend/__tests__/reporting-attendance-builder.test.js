/**
 * reporting-attendance-builder.test.js — Phase 10 Commit 7a.
 */

'use strict';

const {
  buildAdherence,
  computeRate,
  rollupTotals,
  highlightsAndConcerns,
  TRACKED_STATUSES,
} = require('../services/reporting/builders/attendanceReportBuilder');

function row(overrides = {}) {
  return {
    sessionId: 'sess1',
    beneficiaryId: 'b1',
    status: 'present',
    scheduledDate: new Date('2026-04-21T09:00:00Z'),
    ...overrides,
  };
}

function makeModel(rows) {
  return {
    model: {
      find: jest.fn(async filter => {
        return rows.filter(r => {
          if (filter.beneficiaryId && String(r.beneficiaryId) !== String(filter.beneficiaryId)) {
            return false;
          }
          if (filter.scheduledDate) {
            const d = new Date(r.scheduledDate).getTime();
            if (filter.scheduledDate.$gte && d < filter.scheduledDate.$gte.getTime()) return false;
            if (filter.scheduledDate.$lt && d >= filter.scheduledDate.$lt.getTime()) return false;
          }
          return true;
        });
      }),
    },
  };
}

// ─── Pure helpers ────────────────────────────────────────────────

describe('TRACKED_STATUSES', () => {
  test('includes the 5 clinical attendance statuses', () => {
    expect(TRACKED_STATUSES).toEqual(['present', 'late', 'absent', 'no_show', 'cancelled']);
  });
});

describe('rollupTotals', () => {
  test('counts each status and bumps scheduled per row', () => {
    const totals = rollupTotals([
      row({ status: 'present' }),
      row({ status: 'present' }),
      row({ status: 'late' }),
      row({ status: 'absent' }),
      row({ status: 'no_show' }),
      row({ status: 'cancelled' }),
    ]);
    expect(totals.scheduled).toBe(6);
    expect(totals.present).toBe(2);
    expect(totals.late).toBe(1);
    expect(totals.absent).toBe(1);
    expect(totals.no_show).toBe(1);
    expect(totals.cancelled).toBe(1);
  });

  test('ignores unknown statuses (shape-defensive)', () => {
    const totals = rollupTotals([row({ status: 'martian' })]);
    expect(totals.scheduled).toBe(1);
    expect(totals.present).toBe(0);
    expect(totals.late).toBe(0);
  });
});

describe('computeRate', () => {
  test('(present + late) / (present + late + absent + no_show); cancelled ignored', () => {
    expect(computeRate({ present: 4, late: 1, absent: 0, no_show: 0, cancelled: 2 })).toBe(1);
    expect(computeRate({ present: 4, late: 1, absent: 1, no_show: 0, cancelled: 0 })).toBeCloseTo(
      5 / 6
    );
    expect(computeRate({ present: 0, late: 0, absent: 0, no_show: 0, cancelled: 0 })).toBeNull();
  });
});

describe('highlightsAndConcerns', () => {
  test('excellent adherence produces a highlight', () => {
    const { highlights, concerns } = highlightsAndConcerns(
      { present: 4, late: 0, absent: 0, no_show: 0, scheduled: 4 },
      1
    );
    expect(highlights.some(s => s.includes('Excellent'))).toBe(true);
    expect(concerns).toEqual([]);
  });

  test('two+ lates adds a concern', () => {
    const { concerns } = highlightsAndConcerns(
      { present: 2, late: 3, absent: 0, no_show: 0, scheduled: 5 },
      1
    );
    expect(concerns.some(s => s.includes('Late'))).toBe(true);
  });

  test('low adherence triggers the escalation-hint concern', () => {
    const { concerns } = highlightsAndConcerns(
      { present: 1, late: 0, absent: 2, no_show: 1, scheduled: 4 },
      0.25
    );
    expect(concerns.some(s => s.includes('below 70%'))).toBe(true);
  });
});

// ─── buildAdherence end-to-end with fakes ───────────────────────

describe('buildAdherence', () => {
  const report = { id: 'ben.attendance.weekly' };

  test('degrades gracefully when periodKey is unrecognised', async () => {
    const doc = await buildAdherence({
      report,
      periodKey: 'not-a-key',
      scopeKey: 'beneficiary:b1',
    });
    expect(doc.totals.scheduled).toBe(0);
    expect(doc.concerns.some(s => s.includes('Unrecognised periodKey'))).toBe(true);
  });

  test('degrades when scopeKey is missing or wrong type', async () => {
    const doc = await buildAdherence({ report, periodKey: '2026-W17' });
    expect(doc.concerns.some(s => s.includes('beneficiary:'))).toBe(true);
  });

  test('queries SessionAttendance with a beneficiary+date-range filter', async () => {
    const rows = [
      row({ status: 'present', scheduledDate: new Date('2026-04-21T10:00:00Z') }),
      row({ status: 'late', scheduledDate: new Date('2026-04-22T10:00:00Z') }),
      row({ status: 'absent', scheduledDate: new Date('2026-04-23T10:00:00Z') }),
      // outside the window — should be ignored
      row({ status: 'present', scheduledDate: new Date('2026-04-10T10:00:00Z') }),
    ];
    const SessionAttendance = makeModel(rows);
    const doc = await buildAdherence({
      report,
      periodKey: '2026-W17', // Mon 2026-04-20 → Sun 2026-04-26
      scopeKey: 'beneficiary:b1',
      ctx: { models: { SessionAttendance } },
    });
    expect(doc.totals.scheduled).toBe(3);
    expect(doc.totals.present).toBe(1);
    expect(doc.totals.late).toBe(1);
    expect(doc.totals.absent).toBe(1);
    expect(doc.rate).toBeCloseTo(2 / 3);
    // Two queries: current period + prior period (for trend).
    expect(SessionAttendance.model.find).toHaveBeenCalledTimes(2);
  });

  test('fills beneficiary block via ctx.models.Beneficiary.findById', async () => {
    const SessionAttendance = makeModel([]);
    const Beneficiary = {
      model: {
        async findById(id) {
          return { _id: id, fullName: 'Ahmad Ali', branchId: 'br1' };
        },
      },
    };
    const doc = await buildAdherence({
      report,
      periodKey: '2026-W17',
      scopeKey: 'beneficiary:b1',
      ctx: { models: { SessionAttendance, Beneficiary } },
    });
    expect(doc.beneficiary).toEqual({
      id: 'b1',
      fullName: 'Ahmad Ali',
      branchId: 'br1',
    });
  });

  test('ctx.loadBeneficiary hook wins over model lookup', async () => {
    const SessionAttendance = makeModel([]);
    const Beneficiary = { model: { findById: jest.fn() } };
    const loadBeneficiary = jest.fn(async () => ({ id: 'b1', fullName: 'Custom Hook' }));
    const doc = await buildAdherence({
      report,
      periodKey: '2026-W17',
      scopeKey: 'beneficiary:b1',
      ctx: { models: { SessionAttendance, Beneficiary }, loadBeneficiary },
    });
    expect(loadBeneficiary).toHaveBeenCalledWith('b1');
    expect(doc.beneficiary.fullName).toBe('Custom Hook');
    expect(Beneficiary.model.findById).not.toHaveBeenCalled();
  });

  test('trend = improving when current rate exceeds prior by 5+ points', async () => {
    // current week: 4 present / 4 sessions = 100%
    // prior week:   2 present, 2 absent = 50%
    const rows = [
      row({ status: 'present', scheduledDate: new Date('2026-04-21T10:00:00Z') }),
      row({ status: 'present', scheduledDate: new Date('2026-04-22T10:00:00Z') }),
      row({ status: 'present', scheduledDate: new Date('2026-04-23T10:00:00Z') }),
      row({ status: 'present', scheduledDate: new Date('2026-04-24T10:00:00Z') }),
      row({ status: 'present', scheduledDate: new Date('2026-04-14T10:00:00Z') }),
      row({ status: 'present', scheduledDate: new Date('2026-04-15T10:00:00Z') }),
      row({ status: 'absent', scheduledDate: new Date('2026-04-16T10:00:00Z') }),
      row({ status: 'absent', scheduledDate: new Date('2026-04-17T10:00:00Z') }),
    ];
    const doc = await buildAdherence({
      report,
      periodKey: '2026-W17',
      scopeKey: 'beneficiary:b1',
      ctx: { models: { SessionAttendance: makeModel(rows) } },
    });
    expect(doc.overallTrend).toBe('improving');
  });

  test('model error swallowed → empty totals + no throw', async () => {
    const SessionAttendance = {
      model: {
        find: jest.fn(async () => {
          throw new Error('mongo down');
        }),
      },
    };
    const doc = await buildAdherence({
      report,
      periodKey: '2026-W17',
      scopeKey: 'beneficiary:b1',
      ctx: { models: { SessionAttendance } },
    });
    expect(doc.totals.scheduled).toBe(0);
  });
});
