/**
 * reporting-hr-builder.test.js — Phase 10 Commit 7g.
 */

'use strict';

const {
  buildTurnover,
  buildAttendanceAdherence,
  buildCpeCompliance,
  rollupTurnover,
  rollupHrAttendance,
  rollupCpe,
  DEFAULT_CPE_TARGET_HOURS,
  ATTENDANCE_PRESENT,
  ATTENDANCE_ABSENT,
} = require('../services/reporting/builders/hrReportBuilder');

function emp(overrides = {}) {
  return {
    _id: 'e1',
    status: 'active',
    department: 'therapy',
    branch_id: 'br1',
    ...overrides,
  };
}

function att(overrides = {}) {
  return {
    _id: 'a1',
    employeeId: 'e1',
    status: 'present',
    date: new Date('2026-04-21T08:00:00Z'),
    branch_id: 'br1',
    ...overrides,
  };
}

function cpe(overrides = {}) {
  return {
    _id: 'c1',
    employeeId: 'e1',
    activityName: 'a',
    category: '1',
    creditHours: 5,
    activityDate: new Date('2026-04-01T00:00:00Z'),
    ...overrides,
  };
}

function makeRowModel(rows) {
  return {
    model: {
      find: jest.fn(async (filter = {}) => {
        return rows.filter(r => {
          if (filter.status) {
            if (typeof filter.status === 'string' && r.status !== filter.status) return false;
          }
          if (filter.$or) {
            const matches = filter.$or.some(cl => {
              if (cl.branch_id && String(r.branch_id) === String(cl.branch_id)) return true;
              if (cl.branchId && String(r.branchId) === String(cl.branchId)) return true;
              return false;
            });
            if (!matches) return false;
          }
          if (filter.branch_id && String(r.branch_id) !== String(filter.branch_id)) return false;
          if (filter.date) {
            const d = new Date(r.date).getTime();
            if (filter.date.$gte && d < filter.date.$gte.getTime()) return false;
            if (filter.date.$lt && d >= filter.date.$lt.getTime()) return false;
          }
          if (filter.activityDate) {
            const d = new Date(r.activityDate).getTime();
            if (filter.activityDate.$gte && d < filter.activityDate.$gte.getTime()) return false;
            if (filter.activityDate.$lt && d >= filter.activityDate.$lt.getTime()) return false;
          }
          return true;
        });
      }),
      countDocuments: jest.fn(async (filter = {}) => {
        const rowsOut = await this.find(filter);
        return Array.isArray(rowsOut) ? rowsOut.length : 0;
      }),
    },
  };
}

// Patch: fake countDocuments reads live rows via find.
function makeEmployeeModel(rows) {
  const model = {
    async find(filter = {}) {
      let out = rows.slice();
      if (filter.status && typeof filter.status === 'string') {
        out = out.filter(r => r.status === filter.status);
      }
      if (filter.$or) {
        out = out.filter(r =>
          filter.$or.some(cl => {
            if (cl.branch_id && String(r.branch_id) === String(cl.branch_id)) return true;
            if (cl.branchId && String(r.branchId) === String(cl.branchId)) return true;
            return false;
          })
        );
      }
      return out;
    },
  };
  model.countDocuments = async (filter = {}) => (await model.find(filter)).length;
  return { model };
}

// ─── Pure helpers ────────────────────────────────────────────────

describe('constants', () => {
  test('attendance PRESENT + ABSENT sets', () => {
    expect(ATTENDANCE_PRESENT).toEqual(['present', 'late', 'half_day', 'remote']);
    expect(ATTENDANCE_ABSENT).toEqual(['absent']);
  });
  test('default CPE target is SCFHS annual bar (25)', () => {
    expect(DEFAULT_CPE_TARGET_HOURS).toBe(25);
  });
});

describe('rollupTurnover', () => {
  test('counts only employees whose termination_date falls inside the range', () => {
    const start = new Date('2026-04-01T00:00:00Z');
    const end = new Date('2026-05-01T00:00:00Z');
    const rows = [
      emp({
        status: 'resigned',
        termination_date: new Date('2026-04-10T00:00:00Z'),
        termination_type: 'resignation',
      }),
      emp({
        status: 'terminated',
        termination_date: new Date('2026-04-20T00:00:00Z'),
        termination_type: 'termination',
        department: 'admin',
      }),
      emp({ status: 'resigned', termination_date: new Date('2026-03-15T00:00:00Z') }), // outside
      emp({ status: 'active' }), // no termination
    ];
    const out = rollupTurnover(rows, { rangeStart: start, rangeEnd: end });
    expect(out.total).toBe(2);
    expect(out.resigned).toBe(1);
    expect(out.terminated).toBe(1);
    expect(out.byReason.resignation).toBe(1);
    expect(out.byReason.termination).toBe(1);
    expect(out.byDepartment.therapy).toBe(1);
    expect(out.byDepartment.admin).toBe(1);
  });
});

describe('rollupHrAttendance', () => {
  test('tallies byStatus + workedDays/absentDays + per-employee breakdown', () => {
    const rows = [
      att({ employeeId: 'e1', status: 'present' }),
      att({ employeeId: 'e1', status: 'late' }),
      att({ employeeId: 'e1', status: 'absent' }),
      att({ employeeId: 'e2', status: 'remote' }),
      att({ employeeId: 'e2', status: 'half_day' }),
      att({ employeeId: 'e3', status: 'leave' }), // not present, not absent
    ];
    const out = rollupHrAttendance(rows);
    expect(out.total).toBe(6);
    // ATTENDANCE_PRESENT = [present, late, half_day, remote] → 4 rows
    // worked across e1's present+late + e2's remote+half_day.
    expect(out.workedDays).toBe(4);
    expect(out.absentDays).toBe(1);
    // byEmployee.present bucket counts (present | remote | half_day) —
    // 'late' has its own bucket; 'leave' is ignored entirely.
    expect(out.byEmployee.find(e => e.employeeId === 'e1')).toMatchObject({
      present: 1,
      late: 1,
      absent: 1,
      total: 3,
    });
    expect(out.byEmployee.find(e => e.employeeId === 'e2')).toMatchObject({
      present: 2,
      total: 2,
    });
  });
});

describe('rollupCpe', () => {
  test('aggregates hours per employee + per category', () => {
    const rows = [
      cpe({ employeeId: 'e1', category: '1', creditHours: 10 }),
      cpe({ employeeId: 'e1', category: '2', creditHours: 5 }),
      cpe({ employeeId: 'e2', category: '1', creditHours: 30 }),
    ];
    const out = rollupCpe(rows);
    expect(out.totalHours).toBe(45);
    const e1 = out.byEmployee.find(e => e.employeeId === 'e1');
    expect(e1.hours).toBe(15);
    expect(e1.byCategory['1']).toBe(10);
    expect(e1.byCategory['2']).toBe(5);
    expect(e1.activities).toBe(2);
  });

  test('applies windowStart filter', () => {
    const rows = [
      cpe({ creditHours: 10, activityDate: new Date('2025-01-01T00:00:00Z') }), // before window
      cpe({ creditHours: 5, activityDate: new Date('2026-04-01T00:00:00Z') }),
    ];
    const out = rollupCpe(rows, { windowStart: new Date('2026-01-01T00:00:00Z') });
    expect(out.totalHours).toBe(5);
  });
});

// ─── buildTurnover ───────────────────────────────────────────────

describe('buildTurnover (monthly, confidential)', () => {
  const report = { id: 'hr.turnover.monthly' };

  test('computes voluntaryRate + involuntaryRate from active headcount', async () => {
    const employees = [
      emp({ status: 'active' }),
      emp({ status: 'active' }),
      emp({ status: 'active' }),
      emp({ status: 'resigned', termination_date: new Date('2026-04-15T00:00:00Z') }),
      emp({
        status: 'terminated',
        termination_date: new Date('2026-04-20T00:00:00Z'),
        termination_type: 'termination',
      }),
    ];
    const doc = await buildTurnover({
      report,
      periodKey: '2026-04',
      ctx: { models: { Employee: makeEmployeeModel(employees) } },
    });
    expect(doc.totals.endOfPeriodActive).toBe(3);
    expect(doc.totals.resigned).toBe(1);
    expect(doc.totals.terminated).toBe(1);
    // avg headcount = 3 + 2/2 = 4; voluntary = 1/4 = 0.25
    expect(doc.voluntaryRate).toBeCloseTo(0.25);
    expect(doc.involuntaryRate).toBeCloseTo(0.25);
    expect(doc.summary.headlineMetric.label).toBe('voluntary turnover');
  });

  test('branch scope narrows the employee set', async () => {
    const employees = [
      emp({ status: 'active', branch_id: 'br1' }),
      emp({ status: 'active', branch_id: 'br2' }),
      emp({
        status: 'resigned',
        branch_id: 'br1',
        termination_date: new Date('2026-04-10T00:00:00Z'),
      }),
    ];
    const doc = await buildTurnover({
      report,
      periodKey: '2026-04',
      scopeKey: 'branch:br1',
      ctx: { models: { Employee: makeEmployeeModel(employees) } },
    });
    expect(doc.totals.endOfPeriodActive).toBe(1);
    expect(doc.totals.resigned).toBe(1);
  });

  test('degrades on bad periodKey', async () => {
    const doc = await buildTurnover({ report, periodKey: 'nope' });
    expect(doc.totals.endOfPeriodActive).toBe(0);
  });
});

// ─── buildAttendanceAdherence ────────────────────────────────────

describe('buildAttendanceAdherence (weekly)', () => {
  const report = { id: 'hr.attendance.weekly' };

  test('filters by week, computes adherence, lists worstPerformers', async () => {
    const rows = [
      att({ employeeId: 'e1', status: 'present', date: new Date('2026-04-21T08:00:00Z') }),
      att({ employeeId: 'e1', status: 'absent', date: new Date('2026-04-22T08:00:00Z') }),
      att({ employeeId: 'e2', status: 'present', date: new Date('2026-04-23T08:00:00Z') }),
      att({ employeeId: 'e2', status: 'remote', date: new Date('2026-04-24T08:00:00Z') }),
      // outside range
      att({ employeeId: 'e1', status: 'absent', date: new Date('2026-04-12T08:00:00Z') }),
    ];
    const Attendance = {
      model: {
        async find(filter) {
          return rows.filter(r => {
            if (filter.branch_id && String(r.branch_id) !== String(filter.branch_id)) return false;
            const d = new Date(r.date).getTime();
            if (filter.date.$gte && d < filter.date.$gte.getTime()) return false;
            if (filter.date.$lt && d >= filter.date.$lt.getTime()) return false;
            return true;
          });
        },
      },
    };
    const doc = await buildAttendanceAdherence({
      report,
      periodKey: '2026-W17',
      ctx: { models: { Attendance } },
    });
    expect(doc.totals.records).toBe(4);
    expect(doc.totals.workedDays).toBe(3);
    expect(doc.totals.absentDays).toBe(1);
    expect(doc.adherenceRate).toBeCloseTo(3 / 4);
    expect(doc.worstPerformers[0].employeeId).toBe('e1');
    expect(doc.summary.headlineMetric.label).toBe('attendance adherence');
  });
});

// ─── buildCpeCompliance ──────────────────────────────────────────

describe('buildCpeCompliance (monthly)', () => {
  const report = { id: 'hr.cpe.compliance.monthly' };

  test('compliance rate = compliant / licensed; atRisk list shows shortfalls', async () => {
    // 12-month window from 2026-05-01 back = 2025-05-01
    const cpeRows = [
      cpe({ employeeId: 'e1', creditHours: 30, activityDate: new Date('2025-12-01T00:00:00Z') }), // compliant
      cpe({ employeeId: 'e2', creditHours: 10, activityDate: new Date('2026-03-01T00:00:00Z') }), // at risk
      // out-of-window entry — should be excluded by the query filter
      cpe({ employeeId: 'e3', creditHours: 5, activityDate: new Date('2024-01-01T00:00:00Z') }),
    ];
    const Employee = makeEmployeeModel([
      emp({ _id: 'e1', status: 'active' }),
      emp({ _id: 'e2', status: 'active' }),
      emp({ _id: 'e3', status: 'active' }),
    ]);
    const CpeRecord = {
      model: {
        async find(filter) {
          return cpeRows.filter(r => {
            if (filter.activityDate) {
              const d = new Date(r.activityDate).getTime();
              if (filter.activityDate.$gte && d < filter.activityDate.$gte.getTime()) return false;
              if (filter.activityDate.$lt && d >= filter.activityDate.$lt.getTime()) return false;
            }
            return true;
          });
        },
      },
    };
    const doc = await buildCpeCompliance({
      report,
      periodKey: '2026-04',
      ctx: { models: { CpeRecord, Employee } },
    });
    expect(doc.totals.licensedEmployees).toBe(3);
    expect(doc.totals.compliantEmployees).toBe(1);
    expect(doc.complianceRate).toBeCloseTo(1 / 3);
    expect(doc.atRisk[0].employeeId).toBe('e2');
    expect(doc.atRisk[0].shortfall).toBe(15); // 25 - 10
    expect(doc.summary.headlineMetric.label).toBe('CPE compliance');
  });

  test('ctx.cpeTargetHours overrides the default', async () => {
    const cpeRows = [
      cpe({ employeeId: 'e1', creditHours: 12, activityDate: new Date('2026-04-01T00:00:00Z') }),
    ];
    const Employee = makeEmployeeModel([emp({ _id: 'e1', status: 'active' })]);
    const CpeRecord = {
      model: {
        async find() {
          return cpeRows;
        },
      },
    };
    const doc = await buildCpeCompliance({
      report,
      periodKey: '2026-04',
      ctx: { models: { CpeRecord, Employee }, cpeTargetHours: 10 },
    });
    expect(doc.targetHours).toBe(10);
    expect(doc.totals.compliantEmployees).toBe(1);
  });
});
