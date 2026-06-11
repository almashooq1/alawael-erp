'use strict';

/**
 * cctv-reports-behavioral-wave1230.test.js — behavioral counterpart to the
 * static guard `cctv-reports-wave1230.test.js` (W356-W384 pairing doctrine).
 *
 * Seeds real CctvCamera / CctvEvent / CctvAnpr / TransportVehicle /
 * HikvisionProcessedEvent rows into MongoMemoryServer and asserts the actual
 * aggregation output of every report family:
 *   • employeesReport / employeeTimeline (decision filtering, day bucketing)
 *   • platesReport / plateHistory (registry + fleet join, normalisation)
 *   • visitorsReport (ownership partition: clients vs unknown vs denylist)
 *   • aiOverview (type×severity rollup, safety totals, fleet + capabilities)
 *   • window helpers (defaults, 92-day cap, invalid input → status 400)
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/cctv-reports-behavioral-wave1230.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let reports;
let CctvCamera, CctvEvent, CctvAnpr;
let HikvisionProcessedEvent;
let TransportVehicle;
let reg;

const NOW = new Date('2026-06-10T09:00:00.000Z');
const hoursAgo = h => new Date(NOW.getTime() - h * 3_600_000);
const daysAgo = d => new Date(NOW.getTime() - d * 86_400_000);

const BRANCH = 'RYD01';
const branchOid = new mongoose.Types.ObjectId();
const emp1 = new mongoose.Types.ObjectId();
const emp2 = new mongoose.Types.ObjectId();

let seq = 0;
const eid = () => `w1230-ev-${++seq}`;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1230-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);

  // Minimal Employee stand-in so the service's lazyModel('Employee') hit
  // avoids dragging the full HR model graph into this suite.
  mongoose.model(
    'Employee',
    new mongoose.Schema({
      employee_number: String,
      name_ar: String,
      name_en: String,
      department: String,
      branch_id: mongoose.Schema.Types.ObjectId,
    })
  );

  ({ CctvCamera, CctvEvent, CctvAnpr } = require('../models/cctv'));
  HikvisionProcessedEvent = require('../models/HikvisionProcessedEvent');
  TransportVehicle = require('../models/transport/Vehicle');
  reg = require('../intelligence/hikvision.registry');
  reports = require('../services/cctv/reports.service');

  await seed();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

async function seed() {
  const gate = await CctvCamera.create({
    code: 'CAM-GATE-01',
    branchCode: BRANCH,
    name_ar: 'بوابة رئيسية',
    ip: '10.0.0.11',
    status: 'online',
    capabilities: { anpr: true },
  });
  const hall = await CctvCamera.create({
    code: 'CAM-HALL-02',
    branchCode: BRANCH,
    name_ar: 'صالة الاستقبال',
    ip: '10.0.0.12',
    status: 'online',
    capabilities: { faceDetection: true },
  });

  const ev = (camera, type, startedAt, extra = {}) => ({
    eventId: eid(),
    cameraId: camera._id,
    cameraCode: camera.code,
    branchCode: BRANCH,
    type,
    startedAt,
    severity: 'info',
    ...extra,
  });

  await CctvEvent.create([
    // ABC123 — registered parent plate, 3 visits (one denied)
    ev(gate, 'anpr_plate', hoursAgo(2), { aiResult: { plate: 'ABC123', label: 'allowed' } }),
    ev(gate, 'anpr_plate', daysAgo(1), { aiResult: { plate: 'ABC123', label: 'allowed' } }),
    ev(gate, 'anpr_plate', daysAgo(2), {
      aiResult: { plate: 'ABC123', label: 'out_of_schedule' },
      payload: { plateMatch: 'denied' },
    }),
    // XYZ999 — unknown visitor, 2 visits
    ev(gate, 'anpr_plate', hoursAgo(5), { aiResult: { plate: 'XYZ999', label: 'unknown_visitor' } }),
    ev(gate, 'anpr_plate', daysAgo(3), { aiResult: { plate: 'XYZ999', label: 'unknown_visitor' } }),
    // DEN666 — denylist hit
    ev(gate, 'anpr_plate', hoursAgo(1), {
      aiResult: { plate: 'DEN666', label: 'denylist_hit' },
      severity: 'critical',
    }),
    // FLT001 — fleet vehicle, 2 visits
    ev(gate, 'anpr_plate', hoursAgo(8), { aiResult: { plate: 'FLT001', label: 'allowed' } }),
    ev(gate, 'anpr_plate', daysAgo(2), { aiResult: { plate: 'FLT001', label: 'allowed' } }),
    // Faces + safety + noise
    ev(hall, 'face_unknown', hoursAgo(3), { severity: 'medium' }),
    ev(hall, 'face_unknown', daysAgo(1), { severity: 'medium' }),
    ev(hall, 'intrusion', hoursAgo(4), { severity: 'high' }),
    ev(hall, 'fall_detected', hoursAgo(6), { severity: 'critical' }),
    ev(hall, 'motion', hoursAgo(7)),
    ev(hall, 'motion', daysAgo(1)),
    ev(hall, 'motion', daysAgo(2)),
    // OUTSIDE the default 7-day window — must never appear
    ev(gate, 'anpr_plate', daysAgo(10), { aiResult: { plate: 'OLD777', label: 'allowed' } }),
  ]);

  await CctvAnpr.create([
    { plate: 'ABC123', ownerKind: 'parent', label: 'ولي أمر — أحمد' },
    { plate: 'DEN666', ownerKind: 'denylist', label: 'محظورة' },
    { plate: 'FLT001', ownerKind: 'employee', employeeId: emp1 },
  ]);

  await TransportVehicle.create({
    vehicle_number: 'VH-901',
    license_plate: 'FLT001',
    branch_id: branchOid,
    vehicle_type: 'bus',
  });

  const Employee = mongoose.model('Employee');
  await Employee.create({
    _id: emp1,
    employee_number: 'EMP-0001',
    name_ar: 'موظف الاختبار',
    department: 'transport',
    branch_id: branchOid,
  });

  const device = new mongoose.Types.ObjectId();
  const raw = () => new mongoose.Types.ObjectId();
  const processed = (employeeId, capturedAt, decision, extra = {}) => ({
    rawEventId: raw(),
    deviceId: device,
    branchId: branchOid,
    eventKind: reg.RAW_EVENT_KIND.FACE_MATCH,
    source: reg.ATTENDANCE_SOURCE.FACE_TERMINAL,
    matchedEmployeeId: employeeId,
    confidence: 90,
    capturedAt,
    processedAt: capturedAt,
    decision,
    ...extra,
  });

  await HikvisionProcessedEvent.create([
    processed(emp1, hoursAgo(2), reg.GATE_DECISION.AUTO_ACCEPT),
    processed(emp1, hoursAgo(9), reg.GATE_DECISION.AUTO_ACCEPT),
    processed(emp1, daysAgo(1), reg.GATE_DECISION.AUTO_ACCEPT),
    processed(emp1, daysAgo(2), reg.GATE_DECISION.REVIEW, {
      reviewReason: reg.REVIEW_REASONS[0],
      reviewQueue: reg.REVIEW_QUEUES[0],
    }),
    // Suppressed duplicate — excluded from every report
    processed(emp1, hoursAgo(2), reg.GATE_DECISION.SUPPRESSED, {
      linkedSuppressedFromEventId: new mongoose.Types.ObjectId(),
    }),
    processed(emp2, daysAgo(1), reg.GATE_DECISION.AUTO_ACCEPT),
    // Unmatched capture — excluded from the employee report
    processed(null, hoursAgo(1), reg.GATE_DECISION.REJECT, {
      reviewReason: reg.REVIEW_REASONS[0],
    }),
  ]);
}

// ─── Window helpers ──────────────────────────────────────────────

describe('W1230 behavioral — window helpers', () => {
  test('defaults to a 7-day window ending now', () => {
    const win = reports.resolveWindow({});
    expect(win.to.getTime() - win.from.getTime()).toBeCloseTo(7 * 86_400_000, -4);
  });

  test('caps the window at 92 days', () => {
    const win = reports.resolveWindow({ from: '2020-01-01', to: NOW.toISOString() });
    expect(win.to.getTime() - win.from.getTime()).toBe(92 * 86_400_000);
  });

  test('rejects garbage dates with status 400', () => {
    expect(() => reports.resolveWindow({ from: 'not-a-date' })).toThrow();
    try {
      reports.resolveWindow({ from: 'not-a-date' });
    } catch (err) {
      expect(err.status).toBe(400);
    }
  });

  test('rejects inverted windows', () => {
    expect(() =>
      reports.resolveWindow({ from: '2026-06-10', to: '2026-06-01' })
    ).toThrow('INVALID_WINDOW');
  });

  test('riyadhDayKey shifts UTC into the +03:00 day', () => {
    expect(reports.riyadhDayKey(new Date('2026-01-01T22:30:00.000Z'))).toBe('2026-01-02');
    expect(reports.riyadhDayKey(new Date('2026-01-01T10:00:00.000Z'))).toBe('2026-01-01');
  });

  test('clampLimit floors garbage and enforces the max', () => {
    expect(reports.clampLimit('abc', 500)).toBe(100);
    expect(reports.clampLimit(9999, 500)).toBe(500);
    expect(reports.clampLimit(30, 500)).toBe(30);
  });
});

// ─── Employees ───────────────────────────────────────────────────

describe('W1230 behavioral — employeesReport', () => {
  test('groups by employee, counts decisions, excludes suppressed + unmatched', async () => {
    const out = await reports.employeesReport({ from: daysAgo(7), to: NOW });
    expect(out.count).toBe(2);

    const e1 = out.employees.find(e => String(e.employeeId) === String(emp1));
    expect(e1).toBeDefined();
    expect(e1.captures).toBe(4); // 3 auto-accept + 1 review; suppressed excluded
    expect(e1.autoAccepted).toBe(3);
    expect(e1.underReview).toBe(1);
    expect(e1.firstSeen.getTime()).toBeLessThan(e1.lastSeen.getTime());
    expect(e1.employee).not.toBeNull();
    expect(e1.employee.name_ar).toBe('موظف الاختبار');

    const e2 = out.employees.find(e => String(e.employeeId) === String(emp2));
    expect(e2.captures).toBe(1);
    expect(e2.employee).toBeNull(); // no identity row seeded for emp2
  });

  test('rejects malformed branchId with status 400', async () => {
    await expect(reports.employeesReport({ branchId: 'nope' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_BRANCH_ID',
    });
  });
});

describe('W1230 behavioral — employeeTimeline', () => {
  test('buckets by Riyadh day with first-in / last-out', async () => {
    const out = await reports.employeeTimeline({
      employeeId: String(emp1),
      from: daysAgo(7),
      to: NOW,
    });
    expect(out.events).toHaveLength(4); // suppressed excluded
    expect(out.employee.employee_number).toBe('EMP-0001');

    const twoCaptureDay = out.days.find(d => d.captures === 2);
    expect(twoCaptureDay).toBeDefined();
    expect(new Date(twoCaptureDay.firstIn).getTime()).toBeLessThan(
      new Date(twoCaptureDay.lastOut).getTime()
    );
    expect(out.days.reduce((s, d) => s + d.captures, 0)).toBe(4);
  });

  test('rejects malformed employeeId with status 400', async () => {
    await expect(reports.employeeTimeline({ employeeId: 'nope' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_EMPLOYEE_ID',
    });
  });
});

// ─── Plates ──────────────────────────────────────────────────────

describe('W1230 behavioral — platesReport', () => {
  let out;
  beforeAll(async () => {
    out = await reports.platesReport({ branchCode: BRANCH, from: daysAgo(7), to: NOW });
  });

  test('aggregates per plate inside the window only', () => {
    expect(out.count).toBe(4); // OLD777 (10 days ago) excluded
    expect(out.plates.map(p => p.plate)).not.toContain('OLD777');
    const abc = out.plates.find(p => p.plate === 'ABC123');
    expect(abc.visits).toBe(3);
    expect(abc.deniedVisits).toBe(1);
    expect(abc.cameras).toContain('CAM-GATE-01');
  });

  test('joins the ANPR registry for ownership', () => {
    const abc = out.plates.find(p => p.plate === 'ABC123');
    expect(abc.owner).toMatchObject({ ownerKind: 'parent' });
    const xyz = out.plates.find(p => p.plate === 'XYZ999');
    expect(xyz.owner).toBeNull();
    expect(xyz.unknownVisits).toBe(2);
  });

  test('joins the transport fleet by license_plate', () => {
    const flt = out.plates.find(p => p.plate === 'FLT001');
    expect(flt.fleetVehicle).toMatchObject({ vehicleNumber: 'VH-901', vehicleType: 'bus' });
  });

  test('summary partitions registered / unknown / denylist / fleet', () => {
    expect(out.summary).toEqual({ registered: 3, unknown: 1, denylist: 1, fleetMatches: 1 });
    const den = out.plates.find(p => p.plate === 'DEN666');
    expect(den.denylistHits).toBe(1);
  });

  test('branchCode filter isolates foreign branches', async () => {
    const other = await reports.platesReport({ branchCode: 'OTHER', from: daysAgo(7), to: NOW });
    expect(other.count).toBe(0);
  });
});

describe('W1230 behavioral — plateHistory', () => {
  test('normalises the plate, returns events + per-day counts + ownership', async () => {
    const out = await reports.plateHistory({
      plate: ' abc123 ',
      branchCode: BRANCH,
      from: daysAgo(7),
      to: NOW,
    });
    expect(out.plate).toBe('ABC123');
    expect(out.events).toHaveLength(3);
    expect(out.owner).toMatchObject({ ownerKind: 'parent' });
    expect(out.perDay.reduce((s, d) => s + d.visits, 0)).toBe(3);
  });

  test('rejects an empty plate with status 400', async () => {
    await expect(reports.plateHistory({ plate: '  ' })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_PLATE',
    });
  });
});

// ─── Visitors ────────────────────────────────────────────────────

describe('W1230 behavioral — visitorsReport', () => {
  let out;
  beforeAll(async () => {
    out = await reports.visitorsReport({ branchCode: BRANCH, from: daysAgo(7), to: NOW });
  });

  test('clients bucket holds parent/visitor/vendor plates only', () => {
    expect(out.clients.map(p => p.plate)).toEqual(['ABC123']);
    // employee-owned fleet plate is staff, not a client
    expect(out.clients.map(p => p.plate)).not.toContain('FLT001');
  });

  test('unknown + denylist buckets partition correctly', () => {
    expect(out.unknownPlates.map(p => p.plate)).toEqual(['XYZ999']);
    expect(out.denylist.map(p => p.plate)).toEqual(['DEN666']);
  });

  test('unknown-face rollup counts per camera', () => {
    expect(out.summary.unknownFaceDetections).toBe(2);
    expect(out.unknownFaces).toEqual([{ cameraCode: 'CAM-HALL-02', detections: 2 }]);
  });
});

// ─── AI overview ─────────────────────────────────────────────────

describe('W1230 behavioral — aiOverview', () => {
  let out;
  beforeAll(async () => {
    out = await reports.aiOverview({ branchCode: BRANCH, from: daysAgo(7), to: NOW });
  });

  test('totals cover every in-window event', () => {
    expect(out.totals.events).toBe(15); // 16 seeded minus OLD777 outside the window
    expect(out.totals.safetyEvents).toBe(2); // intrusion + fall_detected
    expect(out.totals.unacknowledgedHighCritical).toBe(3); // intrusion + fall + denylist anpr
  });

  test('byType rollup carries severity breakdown', () => {
    expect(out.byType.anpr_plate.total).toBe(8);
    expect(out.byType.fall_detected.bySeverity.critical).toBe(1);
    expect(out.byType.motion.total).toBe(3);
  });

  test('daily series is chronological with face/plate/safety lanes', () => {
    expect(out.daily.length).toBeGreaterThanOrEqual(3);
    const dates = out.daily.map(d => d.date);
    expect([...dates].sort()).toEqual(dates);
    expect(out.daily.reduce((s, d) => s + d.plates, 0)).toBe(8);
    expect(out.daily.reduce((s, d) => s + d.safety, 0)).toBe(2);
  });

  test('topCameras joins camera metadata', () => {
    const gate = out.topCameras.find(c => c.cameraCode === 'CAM-GATE-01');
    expect(gate.events).toBe(8);
    expect(gate.camera.name_ar).toBe('بوابة رئيسية');
  });

  test('camera fleet status + AI capability coverage', () => {
    expect(out.cameraFleet.byStatus.online).toBe(2);
    expect(out.cameraFleet.capabilities).toMatchObject({
      total: 2,
      anpr: 1,
      faceDetection: 1,
    });
  });
});
