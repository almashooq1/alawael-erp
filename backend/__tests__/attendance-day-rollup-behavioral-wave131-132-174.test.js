'use strict';

/**
 * Behavioral counterpart for the attendance day-rollup trio:
 *   • BeneficiaryDayAttendance      (Wave 174) — day-rehab rollcall
 *   • DailyAttendanceRecord         (Wave 131) — canonical day record
 *   • EmployeeAttendanceBaseline    (Wave 132) — statistical baseline
 *
 * Pairing doctrine: static drift guards catch source-text shape but
 * not runtime behavior. These exercise every Wave-18 `__invariants`
 * branch end-to-end against MongoMemoryServer.
 */

jest.unmock('mongoose');
jest.setTimeout(45000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DayAttendance;
let DailyRecord;
let Baseline;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({
      instance: { dbName: 'w131-132-174-day-rollup' },
    });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');
  DayAttendance = require('../models/BeneficiaryDayAttendance');
  DailyRecord = require('../models/DailyAttendanceRecord');
  Baseline = require('../models/EmployeeAttendanceBaseline');
  await DayAttendance.init().catch(() => null);
  await DailyRecord.init().catch(() => null);
  await Baseline.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await DayAttendance.deleteMany({});
  await DailyRecord.deleteMany({});
  await Baseline.deleteMany({});
});

const oid = () => new mongoose.Types.ObjectId();

// ════════════════════════════════════════════════════════════════════
//  BeneficiaryDayAttendance (W174)
// ════════════════════════════════════════════════════════════════════

describe('BeneficiaryDayAttendance — Wave-18 invariants', () => {
  const baseDay = (overrides = {}) => ({
    beneficiaryId: oid(),
    date: new Date('2026-05-27T00:00:00.000Z'),
    status: 'absent',
    ...overrides,
  });

  it('rejects rows without beneficiaryId', async () => {
    const d = new DayAttendance(baseDay({ beneficiaryId: undefined }));
    await expect(d.save()).rejects.toThrow(/beneficiaryId/);
  });

  it('rejects rows without date', async () => {
    const d = new DayAttendance(baseDay({ date: undefined }));
    await expect(d.save()).rejects.toThrow(/date/);
  });

  it('rejects status enum drift', async () => {
    const d = new DayAttendance(baseDay({ status: 'maybe' }));
    await expect(d.save()).rejects.toThrow(/status/);
  });

  it('rejects status=present without checkInTime', async () => {
    const d = new DayAttendance(baseDay({ status: 'present' }));
    await expect(d.save()).rejects.toThrow(/checkInTime/);
  });

  it('accepts status=present with checkInTime', async () => {
    const d = new DayAttendance(
      baseDay({
        status: 'present',
        checkInTime: new Date('2026-05-27T07:30:00Z'),
      })
    );
    await expect(d.save()).resolves.toBeDefined();
  });

  it('rejects checkOutTime < checkInTime', async () => {
    const d = new DayAttendance(
      baseDay({
        status: 'present',
        checkInTime: new Date('2026-05-27T15:00:00Z'),
        checkOutTime: new Date('2026-05-27T08:00:00Z'),
      })
    );
    await expect(d.save()).rejects.toThrow(/checkOutTime/);
  });

  it('accepts a full day rollcall with bus markers', async () => {
    const d = new DayAttendance(
      baseDay({
        status: 'present',
        branchId: oid(),
        classroomId: oid(),
        checkInTime: new Date('2026-05-27T07:30:00Z'),
        checkOutTime: new Date('2026-05-27T14:00:00Z'),
        arrivedByBus: true,
        departedByBus: true,
        busRouteId: oid(),
        markedBy: oid(),
      })
    );
    await expect(d.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (beneficiaryId, date)', async () => {
    const ben = oid();
    const date = new Date('2026-05-27T00:00:00.000Z');
    await new DayAttendance(baseDay({ beneficiaryId: ben, date })).save();
    const dup = new DayAttendance(baseDay({ beneficiaryId: ben, date }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('persists default status = absent when omitted', async () => {
    const d = await new DayAttendance(baseDay({ status: undefined })).save();
    expect(d.status).toBe('absent');
  });

  it('accepts excused / sent_home / late variants', async () => {
    for (const s of ['excused', 'sent_home', 'late']) {
      const overrides = { beneficiaryId: oid(), status: s };
      if (s === 'late') overrides.checkInTime = new Date('2026-05-27T09:30:00Z');
      const d = new DayAttendance(baseDay(overrides));
      await expect(d.save()).resolves.toBeDefined();
    }
  });

  it('exposes STATUSES module constant', () => {
    expect(DayAttendance.STATUSES).toEqual(['present', 'absent', 'late', 'excused', 'sent_home']);
  });
});

// ════════════════════════════════════════════════════════════════════
//  DailyAttendanceRecord (W131)
// ════════════════════════════════════════════════════════════════════

describe('DailyAttendanceRecord — Wave-18 invariants', () => {
  const baseRecord = (overrides = {}) => ({
    employeeId: oid(),
    shiftDate: new Date('2026-05-27T00:00:00.000Z'),
    status: 'open',
    attendanceType: 'on-site',
    ...overrides,
  });

  it('rejects rows without employeeId', async () => {
    const r = new DailyRecord(baseRecord({ employeeId: undefined }));
    await expect(r.save()).rejects.toThrow(/employeeId/);
  });

  it('rejects rows without shiftDate', async () => {
    const r = new DailyRecord(baseRecord({ shiftDate: undefined }));
    await expect(r.save()).rejects.toThrow(/shiftDate/);
  });

  it('rejects status enum drift', async () => {
    const r = new DailyRecord(baseRecord({ status: 'half-closed' }));
    await expect(r.save()).rejects.toThrow(/status/);
  });

  it('rejects attendanceType enum drift', async () => {
    const r = new DailyRecord(baseRecord({ attendanceType: 'astral-projection' }));
    await expect(r.save()).rejects.toThrow(/attendanceType/);
  });

  it('rejects status=closed on-site without checkIn/checkOut', async () => {
    const r = new DailyRecord(
      baseRecord({
        status: 'closed',
        attendanceType: 'on-site',
        workedMinutes: 480,
      })
    );
    await expect(r.save()).rejects.toThrow(/checkIn/);
  });

  it('rejects status=closed without workedMinutes', async () => {
    const r = new DailyRecord(
      baseRecord({
        status: 'closed',
        attendanceType: 'on-site',
        checkIn: { source: 'face-terminal', eventTime: new Date('2026-05-27T08:00:00Z') },
        checkOut: { source: 'face-terminal', eventTime: new Date('2026-05-27T16:00:00Z') },
      })
    );
    await expect(r.save()).rejects.toThrow(/workedMinutes/);
  });

  it('accepts status=closed remote-day without checkIn/checkOut', async () => {
    const r = new DailyRecord(
      baseRecord({
        status: 'closed',
        attendanceType: 'remote-day',
        workedMinutes: 480,
      })
    );
    await expect(r.save()).resolves.toBeDefined();
  });

  it('accepts status=closed leave without checkIn/checkOut', async () => {
    const r = new DailyRecord(
      baseRecord({
        status: 'closed',
        attendanceType: 'leave',
        workedMinutes: 0,
      })
    );
    await expect(r.save()).resolves.toBeDefined();
  });

  it('accepts a fully-formed closed on-site record', async () => {
    const r = new DailyRecord(
      baseRecord({
        status: 'closed',
        attendanceType: 'on-site',
        branchId: oid(),
        checkIn: {
          source: 'face-terminal',
          eventTime: new Date('2026-05-27T08:00:00Z'),
          tierLabel: 'T1',
          confidence: 96,
        },
        checkOut: {
          source: 'face-terminal',
          eventTime: new Date('2026-05-27T16:30:00Z'),
          tierLabel: 'T1',
          confidence: 95,
        },
        workedMinutes: 510,
        overtimeMinutes: 30,
        contributingSources: ['face-terminal', 'camera-passive'],
        bestTierLabel: 'T1',
      })
    );
    await expect(r.save()).resolves.toBeDefined();
  });

  it('enforces compound unique on (employeeId, shiftDate)', async () => {
    const emp = oid();
    const sd = new Date('2026-05-27T00:00:00.000Z');
    await new DailyRecord(baseRecord({ employeeId: emp, shiftDate: sd })).save();
    const dup = new DailyRecord(baseRecord({ employeeId: emp, shiftDate: sd }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('rejects workedMinutes < 0', async () => {
    const r = new DailyRecord(baseRecord({ workedMinutes: -1 }));
    await expect(r.save()).rejects.toThrow(/workedMinutes/);
  });

  it('rejects overtimeMinutes < 0', async () => {
    const r = new DailyRecord(baseRecord({ overtimeMinutes: -5 }));
    await expect(r.save()).rejects.toThrow(/overtimeMinutes/);
  });

  it('persists defaults: status=open, attendanceType=on-site, halfDay=false', async () => {
    const r = await new DailyRecord({
      employeeId: oid(),
      shiftDate: new Date('2026-05-27'),
    }).save();
    expect(r.status).toBe('open');
    expect(r.attendanceType).toBe('on-site');
    expect(r.halfDay).toBe(false);
    expect(r.overtimeMinutes).toBe(0);
    expect(r.reconcilerVersion).toBe('v131');
  });

  it('exposes STATUSES + ATTENDANCE_TYPES module constants', () => {
    expect(DailyRecord.STATUSES).toContain('closed');
    expect(DailyRecord.STATUSES).toContain('locked');
    expect(DailyRecord.ATTENDANCE_TYPES).toContain('on-site');
    expect(DailyRecord.ATTENDANCE_TYPES).toContain('remote-day');
  });
});

// ════════════════════════════════════════════════════════════════════
//  EmployeeAttendanceBaseline (W132)
// ════════════════════════════════════════════════════════════════════

describe('EmployeeAttendanceBaseline — Wave-18 invariants', () => {
  const baseBaseline = (overrides = {}) => ({
    employeeId: oid(),
    sampleSize: 0,
    ...overrides,
  });

  it('rejects rows without employeeId', async () => {
    const b = new Baseline(baseBaseline({ employeeId: undefined }));
    await expect(b.save()).rejects.toThrow(/employeeId/);
  });

  it('rejects sampleSize < 0', async () => {
    const b = new Baseline(baseBaseline({ sampleSize: -1 }));
    await expect(b.save()).rejects.toThrow(/sampleSize/);
  });

  it('enforces unique employeeId (one baseline per employee)', async () => {
    const emp = oid();
    await new Baseline(baseBaseline({ employeeId: emp })).save();
    const dup = new Baseline(baseBaseline({ employeeId: emp }));
    await expect(dup.save()).rejects.toThrow();
  });

  it('accepts a fully-formed mature baseline', async () => {
    const b = new Baseline(
      baseBaseline({
        sampleSize: 60,
        windowDays: 90,
        checkInTime: { meanMinutes: 480, stddevMinutes: 12, minMinutes: 450, maxMinutes: 510 },
        checkOutTime: { meanMinutes: 1020, stddevMinutes: 18, minMinutes: 990, maxMinutes: 1050 },
        workedMinutes: { meanMinutes: 480, stddevMinutes: 30, minMinutes: 420, maxMinutes: 540 },
        workdayPattern: [0, 1, 1, 1, 1, 1, 0],
        lastRefreshedAt: new Date(),
        sampledDateRange: {
          start: new Date('2026-02-27'),
          end: new Date('2026-05-27'),
        },
      })
    );
    await expect(b.save()).resolves.toBeDefined();
  });

  it('rejects workdayPattern entries outside [0,1]', async () => {
    const b = new Baseline(baseBaseline({ workdayPattern: [0, 1, 1, 1.5, 1, 1, 0] }));
    await expect(b.save()).rejects.toThrow(/workdayPattern/);
  });

  it('persists default workdayPattern = 7 zeros', async () => {
    const b = await new Baseline(baseBaseline()).save();
    expect(b.workdayPattern).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('persists default sampleSize = 0 and windowDays = 90', async () => {
    const b = await new Baseline({ employeeId: oid() }).save();
    expect(b.sampleSize).toBe(0);
    expect(b.windowDays).toBe(90);
  });

  it('exposes MIN_SAMPLE_SIZE + DEFAULT_WINDOW_DAYS module constants', () => {
    expect(Baseline.MIN_SAMPLE_SIZE).toBe(10);
    expect(Baseline.DEFAULT_WINDOW_DAYS).toBe(90);
  });
});
