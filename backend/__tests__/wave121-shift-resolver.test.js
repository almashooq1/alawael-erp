/**
 * wave121-shift-resolver.test.js — Wave 121.
 *
 * Tests the shift resolver service. Pure helpers (computeExpectedWindow,
 * classifyEventTime, computeWorkedMinutes, isWorkday) are tested
 * directly; the I/O entry uses in-memory mocks of the two Mongoose
 * models.
 */

'use strict';

const reg = require('../intelligence/attendance.registry');
const { createShiftResolverService } = require('../intelligence/shift-resolver.service');

// ─── Mock models ───────────────────────────────────────────────

function buildShiftModel(shifts) {
  const M = {};
  M.findById = id => {
    const match = shifts.find(s => String(s._id) === String(id));
    return { lean: async () => (match ? { ...match } : null), then: r => r(match || null) };
  };
  M._store = shifts;
  return M;
}

function buildAssignmentModel(rows) {
  const M = {};
  M.find = function (q = {}) {
    let filtered = rows.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.effectiveFrom && q.effectiveFrom.$lte) {
        if (new Date(r.effectiveFrom).getTime() > new Date(q.effectiveFrom.$lte).getTime())
          return false;
      }
      if (q.$or) {
        const at = q.effectiveFrom?.$lte || new Date();
        const okBranch = q.$or.some(clause => {
          if ('effectiveTo' in clause && clause.effectiveTo === null) {
            return r.effectiveTo == null;
          }
          if (clause.effectiveTo && clause.effectiveTo.$gt) {
            return (
              r.effectiveTo &&
              new Date(r.effectiveTo).getTime() > new Date(clause.effectiveTo.$gt).getTime()
            );
          }
          return false;
        });
        if (!okBranch) return false;
      }
      return true;
    });
    const chain = {
      sort(spec) {
        const k = Object.keys(spec)[0];
        const dir = spec[k];
        filtered = filtered.slice().sort((a, b) => {
          const av = new Date(a[k]).getTime();
          const bv = new Date(b[k]).getTime();
          return (av - bv) * dir;
        });
        return chain;
      },
      limit(n) {
        filtered = filtered.slice(0, n);
        return chain;
      },
      lean: async () => filtered.map(r => ({ ...r })),
      then: r => r(filtered.map(r2 => ({ ...r2 }))),
    };
    return chain;
  };
  return M;
}

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// Build a standard 09:00-17:00 Sun-Thu shift.
const STANDARD_SHIFT = {
  _id: 'shift-1',
  branchId: 'br-1',
  code: 'STD',
  nameAr: 'صباحي',
  pattern: 'fixed',
  start: '09:00',
  end: '17:00',
  graceMinutes: 10,
  halfDayThreshold: 240,
  overtimeThreshold: 480,
  workdays: [0, 1, 2, 3, 4],
  active: true,
};

// ─── 1. resolveShiftForEmployee ────────────────────────────────

describe('shift-resolver — resolveShiftForEmployee', () => {
  test('returns the active assignment + shift for an employee', async () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([STANDARD_SHIFT]),
      assignmentModel: buildAssignmentModel([
        {
          _id: 'a-1',
          employeeId: 'emp-1',
          shiftId: 'shift-1',
          effectiveFrom: new Date('2026-01-01T00:00:00Z'),
          effectiveTo: null,
        },
      ]),
      logger: SILENT,
    });
    const r = await s.resolveShiftForEmployee({
      employeeId: 'emp-1',
      at: new Date('2026-05-19T10:00:00Z'),
    });
    expect(r.ok).toBe(true);
    expect(r.shift._id).toBe('shift-1');
    expect(r.assignment._id).toBe('a-1');
  });

  test('returns null shift when no assignment exists', async () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([STANDARD_SHIFT]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = await s.resolveShiftForEmployee({ employeeId: 'emp-X', at: new Date() });
    expect(r.ok).toBe(true);
    expect(r.shift).toBeNull();
    expect(r.assignment).toBeNull();
  });

  test('returns EMPLOYEE_REQUIRED on missing employeeId', async () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = await s.resolveShiftForEmployee({});
    expect(r.ok).toBe(false);
    expect(r.reason).toBe(reg.REASON.EMPLOYEE_REQUIRED);
  });
});

// ─── 2. isWorkday ─────────────────────────────────────────────

describe('shift-resolver — isWorkday', () => {
  test('Sun-Thu workdays match Sun..Thu dates', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    // 2026-05-17 is a Sunday (UTC).
    expect(s.isWorkday({ shift: STANDARD_SHIFT, date: new Date('2026-05-17T10:00:00Z') })).toBe(
      true
    );
    // 2026-05-22 is a Friday.
    expect(s.isWorkday({ shift: STANDARD_SHIFT, date: new Date('2026-05-22T10:00:00Z') })).toBe(
      false
    );
  });

  test('returns false on bad input', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    expect(s.isWorkday({ shift: null, date: new Date() })).toBe(false);
    expect(s.isWorkday({ shift: STANDARD_SHIFT, date: 'bogus' })).toBe(false);
  });
});

// ─── 3. computeExpectedWindow ─────────────────────────────────

describe('shift-resolver — computeExpectedWindow', () => {
  test('produces 4-corner window with grace + overtime tolerance', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const w = s.computeExpectedWindow({
      shift: STANDARD_SHIFT,
      shiftDate: new Date('2026-05-19T00:00:00Z'),
    });
    expect(w).not.toBeNull();
    // shift starts 09:00 UTC
    expect(w.shiftStart.toISOString()).toBe('2026-05-19T09:00:00.000Z');
    // shift ends 17:00 UTC
    expect(w.shiftEnd.toISOString()).toBe('2026-05-19T17:00:00.000Z');
    // earliest check-in = shiftStart - 2h
    expect(w.earliestCheckIn.toISOString()).toBe('2026-05-19T07:00:00.000Z');
    // latest check-in = shiftStart + 10min grace
    expect(w.latestCheckIn.toISOString()).toBe('2026-05-19T09:10:00.000Z');
    // earliest check-out = shiftEnd - 10min grace
    expect(w.earliestCheckOut.toISOString()).toBe('2026-05-19T16:50:00.000Z');
    // latest check-out = shiftEnd + 4h
    expect(w.latestCheckOut.toISOString()).toBe('2026-05-19T21:00:00.000Z');
  });

  test('overnight shift (end ≤ start) rolls to next day', () => {
    const overnight = { ...STANDARD_SHIFT, start: '22:00', end: '06:00' };
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const w = s.computeExpectedWindow({
      shift: overnight,
      shiftDate: new Date('2026-05-19T00:00:00Z'),
    });
    expect(w.shiftStart.toISOString()).toBe('2026-05-19T22:00:00.000Z');
    expect(w.shiftEnd.toISOString()).toBe('2026-05-20T06:00:00.000Z');
  });

  test('returns null on malformed shift', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    expect(
      s.computeExpectedWindow({ shift: { start: 'bad', end: '17:00' }, shiftDate: new Date() })
    ).toBeNull();
  });
});

// ─── 4. classifyEventTime ─────────────────────────────────────

describe('shift-resolver — classifyEventTime', () => {
  test('on-time check-in: lateMinutes = 0', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.classifyEventTime({
      shift: STANDARD_SHIFT,
      eventTime: new Date('2026-05-19T09:05:00Z'),
      eventKind: 'check-in',
    });
    expect(r.onTime).toBe(true);
    expect(r.late).toBe(false);
    expect(r.lateMinutes).toBe(0);
  });

  test('late check-in: lateMinutes computed correctly', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.classifyEventTime({
      shift: STANDARD_SHIFT,
      eventTime: new Date('2026-05-19T09:30:00Z'),
      eventKind: 'check-in',
    });
    expect(r.late).toBe(true);
    expect(r.lateMinutes).toBe(20); // 30 min in - 10 min grace = 20
  });

  test('overtime check-out: overtimeMinutes computed', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.classifyEventTime({
      shift: STANDARD_SHIFT,
      eventTime: new Date('2026-05-19T22:00:00Z'),
      eventKind: 'check-out',
    });
    expect(r.afterHours).toBe(true);
    expect(r.overtimeMinutes).toBe(60); // 22:00 - 21:00 (latestCheckOut) = 60
  });

  test('early check-out flagged with earlyMinutes', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.classifyEventTime({
      shift: STANDARD_SHIFT,
      eventTime: new Date('2026-05-19T15:00:00Z'),
      eventKind: 'check-out',
    });
    expect(r.early).toBe(true);
    expect(r.earlyMinutes).toBe(110); // 16:50 - 15:00 = 110
  });

  test('unknown kind returns null-ish result without throwing', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.classifyEventTime({
      shift: STANDARD_SHIFT,
      eventTime: new Date('2026-05-19T10:00:00Z'),
      eventKind: 'whatever',
    });
    expect(r.onTime).toBe(false);
  });
});

// ─── 5. computeWorkedMinutes ──────────────────────────────────

describe('shift-resolver — computeWorkedMinutes', () => {
  test('standard 8-hour day', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.computeWorkedMinutes({
      checkInAt: new Date('2026-05-19T09:00:00Z'),
      checkOutAt: new Date('2026-05-19T17:00:00Z'),
      shift: STANDARD_SHIFT,
    });
    expect(r.totalMinutes).toBe(480);
    expect(r.overtimeMinutes).toBe(0);
    expect(r.halfDay).toBe(false);
  });

  test('half-day status when ≤ halfDayThreshold', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.computeWorkedMinutes({
      checkInAt: new Date('2026-05-19T09:00:00Z'),
      checkOutAt: new Date('2026-05-19T12:00:00Z'),
      shift: STANDARD_SHIFT,
    });
    expect(r.totalMinutes).toBe(180);
    expect(r.halfDay).toBe(true);
  });

  test('overtime when totalMinutes > overtimeThreshold', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.computeWorkedMinutes({
      checkInAt: new Date('2026-05-19T09:00:00Z'),
      checkOutAt: new Date('2026-05-19T19:00:00Z'),
      shift: STANDARD_SHIFT,
    });
    expect(r.totalMinutes).toBe(600);
    expect(r.overtimeMinutes).toBe(120); // 600 - 480
  });

  test('zero on invalid input (checkOut <= checkIn)', () => {
    const s = createShiftResolverService({
      shiftModel: buildShiftModel([]),
      assignmentModel: buildAssignmentModel([]),
      logger: SILENT,
    });
    const r = s.computeWorkedMinutes({
      checkInAt: new Date('2026-05-19T10:00:00Z'),
      checkOutAt: new Date('2026-05-19T09:00:00Z'),
      shift: STANDARD_SHIFT,
    });
    expect(r.totalMinutes).toBe(0);
  });
});
