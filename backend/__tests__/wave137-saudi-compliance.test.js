/**
 * wave137-saudi-compliance.test.js — Wave 137.
 */

'use strict';

const lib = require('../intelligence/saudi-labor-compliance.lib');
const {
  createSaudiLaborComplianceService,
  DEFAULT_LIMITS,
  VIOLATION_KINDS,
} = require('../intelligence/saudi-labor-compliance.service');

const SILENT = { info: () => {}, warn: () => {}, error: () => {} };

// ─── pure helpers ──────────────────────────────────────────────

describe('saudi-labor-compliance — pure helpers', () => {
  test('isFriday correctly identifies UTC Friday (day=5)', () => {
    expect(lib.isFriday('2026-05-22T08:00:00Z')).toBe(true); // Friday
    expect(lib.isFriday('2026-05-19T08:00:00Z')).toBe(false); // Tuesday
  });

  test('isRamadanDay with single Ramadan range', () => {
    const ranges = [{ start: '2026-02-18', end: '2026-03-19' }];
    expect(lib.isRamadanDay('2026-03-01T12:00:00Z', ranges)).toBe(true);
    expect(lib.isRamadanDay('2026-04-01T12:00:00Z', ranges)).toBe(false);
  });

  test('checkDay flags daily-hours-exceeded for >8h regular day', () => {
    const r = lib.checkDay({
      workedMinutes: 540, // 9h
      date: '2026-05-19T00:00:00Z',
      isMuslim: false,
    });
    expect(r.violations).toContain(VIOLATION_KINDS.DAILY_HOURS_EXCEEDED);
  });

  test('checkDay flags ramadan-hours-exceeded for >6h Ramadan Muslim day', () => {
    const ranges = [{ start: '2026-02-18', end: '2026-03-19' }];
    const r = lib.checkDay({
      workedMinutes: 480, // 8h
      date: '2026-03-01T00:00:00Z',
      isMuslim: true,
      ramadanRanges: ranges,
    });
    expect(r.violations).toContain(VIOLATION_KINDS.RAMADAN_HOURS_EXCEEDED);
    expect(r.allowedMaxMinutes).toBe(360);
  });

  test('checkDay flags overtime-cap-exceeded when ≥ daily+4h', () => {
    const r = lib.checkDay({
      workedMinutes: 800, // 13h20m — exceeds 8h + 4h cap
      date: '2026-05-19T00:00:00Z',
      isMuslim: false,
    });
    expect(r.violations).toContain(VIOLATION_KINDS.OVERTIME_CAP_EXCEEDED);
  });

  test('checkDay no violations for exact 8h regular day', () => {
    const r = lib.checkDay({
      workedMinutes: 480,
      date: '2026-05-19T00:00:00Z',
      isMuslim: false,
    });
    expect(r.violations).toHaveLength(0);
  });

  test('checkWeek flags weekly-hours-exceeded for >48h', () => {
    const days = [];
    for (let i = 0; i < 6; i++) {
      days.push({
        date: new Date(2026, 4, 17 + i).toISOString(),
        workedMinutes: 540, // 9h × 6 = 54h
      });
    }
    days.push({ date: new Date(2026, 4, 23).toISOString(), workedMinutes: 0 });
    const r = lib.checkWeek({ days, isMuslim: false });
    expect(r.violations).toContain(VIOLATION_KINDS.WEEKLY_HOURS_EXCEEDED);
    expect(r.totalMinutes).toBe(54 * 60);
  });

  test('checkWeek flags missing-weekly-rest when no rest day', () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push({
        date: new Date(2026, 4, 17 + i).toISOString(),
        workedMinutes: 360, // 6h × 7 = 42h, under cap, but no rest
      });
    }
    const r = lib.checkWeek({ days, isMuslim: false });
    expect(r.violations).toContain(VIOLATION_KINDS.MISSING_WEEKLY_REST);
  });

  test('checkWeek flags friday-work-uncompensated', () => {
    const days = [
      { date: '2026-05-16T00:00:00Z', workedMinutes: 480 }, // Sat
      { date: '2026-05-17T00:00:00Z', workedMinutes: 480 }, // Sun
      { date: '2026-05-18T00:00:00Z', workedMinutes: 480 }, // Mon
      { date: '2026-05-19T00:00:00Z', workedMinutes: 480 }, // Tue
      { date: '2026-05-20T00:00:00Z', workedMinutes: 0 }, // Wed
      { date: '2026-05-21T00:00:00Z', workedMinutes: 0 }, // Thu
      {
        date: '2026-05-22T00:00:00Z',
        workedMinutes: 480,
        fridayCompensated: false, // worked Friday WITHOUT compensation flag
      },
    ];
    const r = lib.checkWeek({ days, isMuslim: false });
    expect(r.violations).toContain(VIOLATION_KINDS.FRIDAY_WORK_UNCOMPENSATED);
  });

  test('checkWeek: friday-compensated=true clears the friday violation', () => {
    const days = [
      { date: '2026-05-16T00:00:00Z', workedMinutes: 480 }, // Sat
      { date: '2026-05-17T00:00:00Z', workedMinutes: 480 },
      { date: '2026-05-18T00:00:00Z', workedMinutes: 480 },
      { date: '2026-05-19T00:00:00Z', workedMinutes: 480 },
      { date: '2026-05-20T00:00:00Z', workedMinutes: 0 },
      { date: '2026-05-21T00:00:00Z', workedMinutes: 0 },
      {
        date: '2026-05-22T00:00:00Z',
        workedMinutes: 480,
        fridayCompensated: true,
      },
    ];
    const r = lib.checkWeek({ days, isMuslim: false });
    expect(r.violations).not.toContain(VIOLATION_KINDS.FRIDAY_WORK_UNCOMPENSATED);
  });
});

// ─── computeOvertimePay ────────────────────────────────────────

describe('saudi-labor-compliance — computeOvertimePay', () => {
  test('overtime at 1.5× regular rate', () => {
    const r = lib.computeOvertimePay({
      regularHourlyRate: 50,
      dailyOvertimeMinutes: 120, // 2h overtime
    });
    expect(r.ok).toBe(true);
    expect(r.overtimePay).toBe(150); // 2 * 50 * 1.5
  });

  test('friday work at 1.5× regular rate', () => {
    const r = lib.computeOvertimePay({
      regularHourlyRate: 60,
      fridayWorkedMinutes: 240, // 4h Friday
    });
    expect(r.fridayPay).toBe(360); // 4 * 60 * 1.5
  });
});

// ─── classifyNitaqat ───────────────────────────────────────────

describe('saudi-labor-compliance — classifyNitaqat', () => {
  test('healthcare small with 35% Saudis → platinum', () => {
    const r = lib.classifyNitaqat({
      saudiCount: 35,
      totalCount: 100,
      sizeBand: 'small',
    });
    expect(r.band).toBe('platinum');
  });

  test('healthcare small with 17% → yellow with gap to green', () => {
    const r = lib.classifyNitaqat({
      saudiCount: 17,
      totalCount: 100,
      sizeBand: 'small',
    });
    expect(r.band).toBe('yellow');
    expect(r.gapToNextBetter).toBe(8); // 25 - 17
  });

  test('healthcare small with 5% → red with gap to yellow', () => {
    const r = lib.classifyNitaqat({
      saudiCount: 5,
      totalCount: 100,
      sizeBand: 'small',
    });
    expect(r.band).toBe('red');
    expect(r.gapToNextBetter).toBe(10); // 15 - 5
  });

  test('empty roster → red with NO_EMPLOYEES reason', () => {
    const r = lib.classifyNitaqat({ saudiCount: 0, totalCount: 0 });
    expect(r.band).toBe('red');
    expect(r.reason).toBe('NO_EMPLOYEES');
  });

  test('unknown size band → red with reason', () => {
    const r = lib.classifyNitaqat({
      saudiCount: 50,
      totalCount: 100,
      sizeBand: 'unknown-size',
    });
    expect(r.band).toBe('red');
    expect(r.reason).toBe('UNKNOWN_INDUSTRY_SIZE');
  });
});

// ─── scanEmployeeWeek service ─────────────────────────────────

function buildDailyRecordModel(seed = []) {
  const M = {};
  M.find = function (q = {}) {
    const matches = seed.filter(r => {
      if (q.employeeId && String(r.employeeId) !== String(q.employeeId)) return false;
      if (q.branchId && String(r.branchId) !== String(q.branchId)) return false;
      if (q.shiftDate) {
        if (
          q.shiftDate.$gte &&
          new Date(r.shiftDate).getTime() < new Date(q.shiftDate.$gte).getTime()
        ) {
          return false;
        }
        if (
          q.shiftDate.$lte &&
          new Date(r.shiftDate).getTime() > new Date(q.shiftDate.$lte).getTime()
        ) {
          return false;
        }
      }
      return true;
    });
    return {
      lean: async () => matches.map(r => ({ ...r })),
      then: r => r(matches.map(x => ({ ...x }))),
    };
  };
  return M;
}

function buildEmployeeModel(seed = []) {
  const M = {};
  M.findOne = function (q = {}) {
    const m = seed.find(e => String(e._id) === String(q._id));
    return {
      lean: async () => (m ? { ...m } : null),
      then: r => r(m ? { ...m } : null),
    };
  };
  return M;
}

describe('saudi-labor-compliance — scanEmployeeWeek', () => {
  test('flags daily + weekly violations for over-worked employee', async () => {
    const records = [];
    // Mon-Sat all 10h, Sun rest
    const weekStart = new Date('2026-05-16T00:00:00Z'); // Sat
    for (let i = 0; i < 6; i++) {
      const d = new Date(weekStart.getTime() + i * 86400_000);
      records.push({
        employeeId: 'emp-1',
        branchId: 'br-1',
        shiftDate: d,
        workedMinutes: 600, // 10h
        overtimeMinutes: 120,
        status: 'closed',
      });
    }
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(records),
      employeeModel: buildEmployeeModel([{ _id: 'emp-1', isMuslim: false }]),
      logger: SILENT,
    });
    const r = await svc.scanEmployeeWeek({
      employeeId: 'emp-1',
      weekStart: weekStart,
    });
    expect(r.ok).toBe(true);
    expect(r.dailyViolations.length).toBeGreaterThan(0);
    expect(r.weeklyViolations).toContain(VIOLATION_KINDS.WEEKLY_HOURS_EXCEEDED);
    expect(r.totalWeekMinutes).toBe(6 * 600);
    expect(r.hasViolations).toBe(true);
  });

  test('compliant week → no violations', async () => {
    const records = [];
    const weekStart = new Date('2026-05-16T00:00:00Z');
    for (let i = 0; i < 6; i++) {
      const d = new Date(weekStart.getTime() + i * 86400_000);
      records.push({
        employeeId: 'emp-2',
        branchId: 'br-1',
        shiftDate: d,
        workedMinutes: 480, // exact 8h
        status: 'closed',
      });
    }
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(records),
      employeeModel: buildEmployeeModel([{ _id: 'emp-2', isMuslim: true }]),
      logger: SILENT,
    });
    const r = await svc.scanEmployeeWeek({
      employeeId: 'emp-2',
      weekStart: weekStart,
    });
    expect(r.ok).toBe(true);
    expect(r.dailyViolations).toHaveLength(0);
    expect(r.weeklyViolations).toHaveLength(0);
    expect(r.hasViolations).toBe(false);
  });

  test('Ramadan Muslim 8h day → ramadan-hours-exceeded', async () => {
    const ramadanRanges = [{ start: '2026-02-18', end: '2026-03-19' }];
    const records = [
      {
        employeeId: 'emp-3',
        shiftDate: new Date('2026-03-01T00:00:00Z'),
        workedMinutes: 480, // 8h — over 6h Ramadan cap
        status: 'closed',
      },
    ];
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(records),
      employeeModel: buildEmployeeModel([{ _id: 'emp-3', isMuslim: true }]),
      ramadanRanges,
      logger: SILENT,
    });
    const r = await svc.scanEmployeeWeek({
      employeeId: 'emp-3',
      weekStart: new Date('2026-02-28T00:00:00Z'), // Sat preceding
    });
    expect(r.ok).toBe(true);
    const ramadanV = r.dailyViolations.find(d =>
      d.violations.includes(VIOLATION_KINDS.RAMADAN_HOURS_EXCEEDED)
    );
    expect(ramadanV).toBeTruthy();
  });
});

// ─── organizationNitaqat ──────────────────────────────────────

describe('saudi-labor-compliance — organizationNitaqat', () => {
  test('40% Saudi small org → platinum + risk=low', () => {
    const roster = [];
    for (let i = 0; i < 40; i++) roster.push({ nationality: 'SA', status: 'active' });
    for (let i = 0; i < 60; i++) roster.push({ nationality: 'EG', status: 'active' });
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = svc.organizationNitaqat({ employeeRoster: roster });
    expect(r.ok).toBe(true);
    expect(r.band).toBe('platinum');
    expect(r.riskLevel).toBe('low');
  });

  test('10% Saudi → red + risk=critical', () => {
    const roster = [];
    for (let i = 0; i < 10; i++) roster.push({ nationality: 'SA', status: 'active' });
    for (let i = 0; i < 90; i++) roster.push({ nationality: 'EG', status: 'active' });
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = svc.organizationNitaqat({ employeeRoster: roster });
    expect(r.band).toBe('red');
    expect(r.riskLevel).toBe('critical');
  });

  test('terminated employees excluded from count', () => {
    const roster = [
      { nationality: 'SA', status: 'active' },
      { nationality: 'SA', status: 'terminated' }, // excluded
      { nationality: 'EG', status: 'active' },
    ];
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = svc.organizationNitaqat({ employeeRoster: roster });
    expect(r.saudiCount).toBe(1);
    expect(r.totalCount).toBe(2);
  });

  test('auto-detects size band by headcount', () => {
    const roster = new Array(300).fill({ nationality: 'SA', status: 'active' });
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(),
      logger: SILENT,
    });
    const r = svc.organizationNitaqat({ employeeRoster: roster });
    expect(r.sizeBand).toBe('large');
  });
});

// ─── complianceReport (integration) ──────────────────────────

describe('saudi-labor-compliance — complianceReport', () => {
  test('full report aggregates labour + Nitaqat + risk level', async () => {
    const records = [];
    for (let i = 0; i < 5; i++) {
      records.push({
        employeeId: 'emp-1',
        branchId: 'br-1',
        shiftDate: new Date(`2026-05-${17 + i}T00:00:00Z`),
        workedMinutes: 600, // overtime
        overtimeMinutes: 120,
        status: 'closed',
      });
    }
    const roster = [];
    for (let i = 0; i < 30; i++) roster.push({ nationality: 'SA', status: 'active' });
    for (let i = 0; i < 70; i++) roster.push({ nationality: 'EG', status: 'active' });
    const svc = createSaudiLaborComplianceService({
      dailyRecordModel: buildDailyRecordModel(records),
      employeeModel: buildEmployeeModel([{ _id: 'emp-1', isMuslim: false }]),
      logger: SILENT,
    });
    const r = await svc.complianceReport({
      branchId: 'br-1',
      month: 5,
      year: 2026,
      employeeRoster: roster,
    });
    expect(r.ok).toBe(true);
    expect(r.labour).toBeDefined();
    expect(r.nitaqat).toBeDefined();
    expect(r.nitaqat.band).toBe('green');
    expect(['low', 'medium', 'high', 'critical']).toContain(r.overallRisk);
  });
});

// ─── DEFAULT_LIMITS exposed ───────────────────────────────────

describe('saudi-labor-compliance — constants', () => {
  test('DEFAULT_LIMITS matches Saudi MOL thresholds', () => {
    expect(DEFAULT_LIMITS.DAILY_MAX_MINUTES).toBe(480);
    expect(DEFAULT_LIMITS.DAILY_MAX_RAMADAN).toBe(360);
    expect(DEFAULT_LIMITS.WEEKLY_MAX_MINUTES).toBe(2880);
    expect(DEFAULT_LIMITS.OVERTIME_MULTIPLIER).toBe(1.5);
  });
});
