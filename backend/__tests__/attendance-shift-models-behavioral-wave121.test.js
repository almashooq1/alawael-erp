'use strict';

/**
 * attendance-shift-models-behavioral-wave121.test.js — behavioral coverage
 * for the W121 Attendance shift pair:
 *   • AttendanceShift           — branch-scoped recurring work pattern
 *   • AttendanceShiftAssignment — effective-dated employee↔shift link
 *
 * First entry from the BEHAVIORAL_TEST_COVERAGE_BACKLOG.md Attendance suite
 * (24 models).
 *
 * Per CLAUDE.md doctrine — 39× application.
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/attendance.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Shift;
let Assignment;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w121-shift-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  Shift = require('../models/AttendanceShift');
  Assignment = require('../models/AttendanceShiftAssignment');
  await Shift.init().catch(() => null);
  await Assignment.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Shift.deleteMany({});
  await Assignment.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

let codeCounter = 0;
function uniqueCode() {
  codeCounter += 1;
  return `SHIFT-${String(codeCounter).padStart(3, '0')}`;
}

// ═════════════════════════════════════════════════════════════════════
// PART 1 — AttendanceShift
// ═════════════════════════════════════════════════════════════════════

function baseShift(overrides = {}) {
  return {
    branchId: oid(),
    code: uniqueCode(),
    nameAr: 'الدوام الصباحي',
    start: '08:00',
    end: '17:00',
    ...overrides,
  };
}

describe('W121 behavioral — AttendanceShift required + defaults', () => {
  it('REJECTS without branchId', async () => {
    const p = new Shift({ ...baseShift(), branchId: undefined });
    await expect(p.save()).rejects.toThrow(/branchId/);
  });

  it('REJECTS without code', async () => {
    const p = new Shift({ ...baseShift(), code: undefined });
    await expect(p.save()).rejects.toThrow(/code/);
  });

  it('REJECTS without nameAr', async () => {
    const p = new Shift({ ...baseShift(), nameAr: undefined });
    await expect(p.save()).rejects.toThrow(/nameAr/);
  });

  it('SAVES baseline morning shift + defaults', async () => {
    const doc = await Shift.create(baseShift());
    expect(doc.pattern).toBe('fixed');
    expect(doc.graceMinutes).toBe(10);
    expect(doc.halfDayThreshold).toBe(240);
    expect(doc.overtimeThreshold).toBe(480);
    expect(doc.workdays).toEqual([0, 1, 2, 3, 4]);
    expect(doc.active).toBe(true);
  });
});

describe('W121 behavioral — AttendanceShift pattern enum', () => {
  for (const valid of ['fixed', 'rotating', 'flexible', 'on-call']) {
    it(`SAVES pattern='${valid}'`, async () => {
      const doc = await Shift.create(baseShift({ pattern: valid }));
      expect(doc.pattern).toBe(valid);
    });
  }

  it('REJECTS invalid pattern', async () => {
    const p = new Shift(baseShift({ pattern: 'random' }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W121 behavioral — HH:MM 24h time format', () => {
  it('REJECTS start in non-HH:MM format', async () => {
    const p = new Shift(baseShift({ start: '8am' }));
    await expect(p.save()).rejects.toThrow(/start.*must be HH:MM 24h/);
  });

  it('REJECTS end with hour > 23', async () => {
    const p = new Shift(baseShift({ end: '25:00' }));
    await expect(p.save()).rejects.toThrow(/end.*must be HH:MM 24h/);
  });

  it('REJECTS end with minutes > 59', async () => {
    const p = new Shift(baseShift({ end: '17:60' }));
    await expect(p.save()).rejects.toThrow(/end.*must be HH:MM 24h/);
  });

  it('SAVES boundary 00:00 + 23:59', async () => {
    const doc = await Shift.create(baseShift({ start: '00:00', end: '23:59' }));
    expect(doc.start).toBe('00:00');
    expect(doc.end).toBe('23:59');
  });

  it('SAVES with single-digit-padded minutes', async () => {
    const doc = await Shift.create(baseShift({ start: '08:05', end: '17:30' }));
    expect(doc.start).toBe('08:05');
  });
});

describe('W121 behavioral — overtimeThreshold ≥ halfDayThreshold invariant', () => {
  it('REJECTS overtimeThreshold < halfDayThreshold', async () => {
    const p = new Shift(baseShift({ halfDayThreshold: 300, overtimeThreshold: 240 }));
    await expect(p.save()).rejects.toThrow(/overtimeThreshold must be ≥ halfDayThreshold/);
  });

  it('SAVES with overtimeThreshold === halfDayThreshold (boundary)', async () => {
    const doc = await Shift.create(baseShift({ halfDayThreshold: 240, overtimeThreshold: 240 }));
    expect(doc.overtimeThreshold).toBe(240);
  });

  it('SAVES typical thresholds (240 half / 480 OT)', async () => {
    const doc = await Shift.create(baseShift());
    expect(doc.overtimeThreshold).toBeGreaterThanOrEqual(doc.halfDayThreshold);
  });

  it('REJECTS halfDayThreshold < 60', async () => {
    const p = new Shift(baseShift({ halfDayThreshold: 30 }));
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS graceMinutes > 120', async () => {
    const p = new Shift(baseShift({ graceMinutes: 200 }));
    await expect(p.save()).rejects.toThrow();
  });
});

describe('W121 behavioral — workdays 0..6 invariant', () => {
  it('REJECTS workday > 6', async () => {
    const p = new Shift(baseShift({ workdays: [0, 1, 2, 3, 7] }));
    await expect(p.save()).rejects.toThrow(/workdays must be integers in 0..6/);
  });

  it('REJECTS workday < 0', async () => {
    const p = new Shift(baseShift({ workdays: [-1, 0, 1] }));
    await expect(p.save()).rejects.toThrow(/workdays must be integers in 0..6/);
  });

  it('REJECTS non-integer workday', async () => {
    const p = new Shift(baseShift({ workdays: [0, 1.5, 2] }));
    await expect(p.save()).rejects.toThrow(/workdays must be integers/);
  });

  it('SAVES KSA workweek (Sun-Thu = 0,1,2,3,4)', async () => {
    const doc = await Shift.create(baseShift({ workdays: [0, 1, 2, 3, 4] }));
    expect(doc.workdays).toEqual([0, 1, 2, 3, 4]);
  });

  it('SAVES 6-day workweek including Sat', async () => {
    const doc = await Shift.create(baseShift({ workdays: [0, 1, 2, 3, 4, 6] }));
    expect(doc.workdays).toHaveLength(6);
  });
});

describe('W121 behavioral — allowedSources path-validator', () => {
  it('REJECTS unknown source kind', async () => {
    const p = new Shift(baseShift({ allowedSources: ['telepathy'] }));
    await expect(p.save()).rejects.toThrow(/allowedSources must reference/);
  });

  it('SAVES with empty allowedSources (all-allowed default)', async () => {
    const doc = await Shift.create(baseShift());
    expect(doc.allowedSources).toEqual([]);
  });

  it('SAVES with face-terminal + nfc combo', async () => {
    const doc = await Shift.create(baseShift({ allowedSources: ['face-terminal', 'nfc'] }));
    expect(doc.allowedSources).toContain('face-terminal');
  });
});

describe('W121 behavioral — (branchId, code) UNIQUE', () => {
  it('REJECTS duplicate (branchId, code)', async () => {
    const branchId = oid();
    const code = uniqueCode();
    await Shift.create(baseShift({ branchId, code }));
    await expect(Shift.create(baseShift({ branchId, code }))).rejects.toThrow(/E11000|duplicate/i);
  });

  it('ALLOWS same code across different branches', async () => {
    const code = uniqueCode();
    const a = await Shift.create(baseShift({ branchId: oid(), code }));
    const b = await Shift.create(baseShift({ branchId: oid(), code }));
    expect(a._id).not.toEqual(b._id);
  });
});

// ═════════════════════════════════════════════════════════════════════
// PART 2 — AttendanceShiftAssignment
// ═════════════════════════════════════════════════════════════════════

function baseAssign(overrides = {}) {
  return {
    employeeId: oid(),
    shiftId: oid(),
    effectiveFrom: new Date('2026-01-01'),
    ...overrides,
  };
}

describe('W121 behavioral — ShiftAssignment required fields', () => {
  it('REJECTS without employeeId', async () => {
    const p = new Assignment({ ...baseAssign(), employeeId: undefined });
    await expect(p.save()).rejects.toThrow(/employeeId/);
  });

  it('REJECTS without shiftId', async () => {
    const p = new Assignment({ ...baseAssign(), shiftId: undefined });
    await expect(p.save()).rejects.toThrow(/shiftId/);
  });

  it('REJECTS without effectiveFrom', async () => {
    const p = new Assignment({ ...baseAssign(), effectiveFrom: undefined });
    await expect(p.save()).rejects.toThrow(/effectiveFrom/);
  });

  it('SAVES open-ended assignment (effectiveTo=null)', async () => {
    const doc = await Assignment.create(baseAssign());
    expect(doc.effectiveTo).toBeNull();
  });
});

describe('W121 behavioral — ShiftAssignment effective-date range invariant', () => {
  it('REJECTS effectiveTo === effectiveFrom', async () => {
    const same = new Date('2026-01-15');
    const p = new Assignment(baseAssign({ effectiveFrom: same, effectiveTo: same }));
    await expect(p.save()).rejects.toThrow(/effectiveTo.*must be > effectiveFrom/);
  });

  it('REJECTS effectiveTo < effectiveFrom', async () => {
    const p = new Assignment(
      baseAssign({
        effectiveFrom: new Date('2026-02-01'),
        effectiveTo: new Date('2026-01-01'),
      })
    );
    await expect(p.save()).rejects.toThrow(/effectiveTo.*must be > effectiveFrom/);
  });

  it('SAVES valid effective range', async () => {
    const doc = await Assignment.create(
      baseAssign({
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: new Date('2026-06-30'),
      })
    );
    expect(doc.effectiveFrom).toBeInstanceOf(Date);
  });

  it('SAVES 1ms difference (smallest valid range)', async () => {
    const from = new Date('2026-01-01T00:00:00.000Z');
    const to = new Date('2026-01-01T00:00:00.001Z');
    const doc = await Assignment.create(baseAssign({ effectiveFrom: from, effectiveTo: to }));
    expect(doc.effectiveTo.getTime()).toBeGreaterThan(doc.effectiveFrom.getTime());
  });
});

describe('W121 behavioral — canonical collection names', () => {
  it('Shift uses attendance_shifts', () => {
    expect(Shift.collection.collectionName).toBe('attendance_shifts');
  });

  it('Assignment uses attendance_shift_assignments', () => {
    expect(Assignment.collection.collectionName).toBe('attendance_shift_assignments');
  });
});

describe('W121 behavioral — employee → shift assignment chain', () => {
  it('records 2-shift employee history with closed v1 + open v2', async () => {
    const branchId = oid();
    const employeeId = oid();

    const morning = await Shift.create({
      branchId,
      code: 'AM-08-17',
      nameAr: 'صباحي 8-17',
      pattern: 'fixed',
      start: '08:00',
      end: '17:00',
      allowedSources: ['face-terminal', 'nfc'],
    });
    const evening = await Shift.create({
      branchId,
      code: 'PM-14-23',
      nameAr: 'مسائي 14-23',
      pattern: 'fixed',
      start: '14:00',
      end: '23:00',
    });

    const v1 = await Assignment.create({
      employeeId,
      shiftId: morning._id,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: new Date('2026-03-31T23:59:59'),
    });

    const v2 = await Assignment.create({
      employeeId,
      shiftId: evening._id,
      effectiveFrom: new Date('2026-04-01'),
    });

    expect(v1.effectiveTo).toBeInstanceOf(Date);
    expect(v2.effectiveTo).toBeNull();

    const apr15 = new Date('2026-04-15');
    const active = await Assignment.findOne({
      employeeId,
      effectiveFrom: { $lte: apr15 },
      $or: [{ effectiveTo: null }, { effectiveTo: { $gt: apr15 } }],
    });
    expect(active._id.toString()).toBe(v2._id.toString());
  });
});
