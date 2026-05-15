'use strict';

jest.unmock('mongoose');
jest.resetModules();
process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const registry = require('../config/calibration.registry');
const { createCalibrationService } = require('../services/quality/calibration.service');

let ownServer = null;
let CalibrationAsset;
const creator = new mongoose.Types.ObjectId();

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, { dbName: 'cal-test', serverSelectionTimeoutMS: 10000 });
  CalibrationAsset = require('../models/quality/CalibrationAsset.model');
}, 60_000);

afterAll(async () => {
  await mongoose.disconnect();
  if (ownServer) await ownServer.stop();
});

afterEach(async () => {
  await CalibrationAsset.deleteMany({});
});

describe('calibration registry', () => {
  test('computeNextDueDate handles months / years / weeks / days', () => {
    const base = new Date('2026-01-15T00:00:00Z');
    expect(registry.computeNextDueDate(base, 12, 'months').getUTCFullYear()).toBe(2027);
    expect(registry.computeNextDueDate(base, 1, 'years').getUTCFullYear()).toBe(2027);
    expect(registry.computeNextDueDate(base, 7, 'days').getUTCDate()).toBe(22);
    expect(registry.computeNextDueDate(base, 2, 'weeks').getUTCDate()).toBe(29);
  });

  test('daysUntilDue returns positive for future, negative for past', () => {
    const now = new Date('2026-05-15');
    const future = new Date('2026-05-25');
    const past = new Date('2026-05-10');
    expect(registry.daysUntilDue(future, now)).toBe(10);
    expect(registry.daysUntilDue(past, now)).toBe(-5);
  });
});

describe('CalibrationService.registerAsset + recordCalibration', () => {
  test('registers asset with auto code', async () => {
    const svc = createCalibrationService({ model: CalibrationAsset });
    const doc = await svc.registerAsset(
      {
        name: 'ميزان مختبر A',
        type: 'scale',
        calibrationFrequency: 12,
        calibrationFrequencyUnit: 'months',
      },
      creator
    );
    expect(doc.assetCode).toMatch(/^CAL-\d{4}-\d{4}$/);
    expect(doc.status).toBe('active');
  });

  test('records a passing calibration + computes nextDueDate', async () => {
    const svc = createCalibrationService({ model: CalibrationAsset });
    let doc = await svc.registerAsset(
      {
        name: 'thermometer #2',
        type: 'thermometer',
        calibrationFrequency: 6,
        calibrationFrequencyUnit: 'months',
      },
      creator
    );
    doc = await svc.recordCalibration(
      doc._id,
      { outcome: 'pass', calibratedAt: '2026-05-01', certificateNumber: 'CERT-001' },
      creator
    );
    expect(doc.status).toBe('active');
    expect(doc.calibrationRecords).toHaveLength(1);
    expect(doc.lastCalibratedAt).toBeTruthy();
    expect(doc.nextDueDate).toBeTruthy();
  });

  test('a failing calibration flips status to failed', async () => {
    const events = [];
    const dispatcher = {
      async emit(name, payload) {
        events.push({ name, payload });
      },
    };
    const svc = createCalibrationService({ model: CalibrationAsset, dispatcher });
    let doc = await svc.registerAsset(
      {
        name: 'glucometer',
        type: 'glucometer',
        calibrationFrequency: 3,
        calibrationFrequencyUnit: 'months',
      },
      creator
    );
    doc = await svc.recordCalibration(doc._id, { outcome: 'fail' }, creator);
    expect(doc.status).toBe('failed');
    expect(events.find(e => e.name === 'quality.calibration.failed')).toBeTruthy();
  });

  test('rejects invalid outcome', async () => {
    const svc = createCalibrationService({ model: CalibrationAsset });
    const doc = await svc.registerAsset({ name: 'x', type: 'scale' }, creator);
    await expect(
      svc.recordCalibration(doc._id, { outcome: 'bogus' }, creator)
    ).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});

describe('CalibrationService.sweepOverdue', () => {
  test('flips overdue active assets to awaiting_calibration', async () => {
    const svc = createCalibrationService({ model: CalibrationAsset });
    let doc = await svc.registerAsset(
      {
        name: 'pipette',
        type: 'pipette',
        calibrationFrequency: 1,
        calibrationFrequencyUnit: 'months',
        lastCalibratedAt: new Date('2025-01-01'), // ancient
      },
      creator
    );
    expect(doc.status).toBe('active');
    expect(doc.nextDueDate).toBeTruthy();
    const swept = await svc.sweepOverdue();
    expect(swept).toBeGreaterThanOrEqual(1);
    doc = await svc.findById(doc._id);
    expect(doc.status).toBe('awaiting_calibration');
  });
});

describe('CalibrationService.getDashboard + list', () => {
  test('aggregates by status with due-soon + overdue counts', async () => {
    const svc = createCalibrationService({ model: CalibrationAsset });
    await svc.registerAsset({ name: 'a', type: 'scale' }, creator);
    const inFifteenDays = new Date(Date.now() + 15 * 86400000);
    const due = await svc.registerAsset(
      { name: 'b', type: 'thermometer', calibrationFrequency: 1, calibrationFrequencyUnit: 'days' },
      creator
    );
    due.nextDueDate = inFifteenDays;
    await due.save();
    const dash = await svc.getDashboard({});
    expect(dash.total).toBe(2);
    expect(dash.dueSoon).toBeGreaterThanOrEqual(1);
  });

  test('list filters by status and dueWithinDays', async () => {
    const svc = createCalibrationService({ model: CalibrationAsset });
    await svc.registerAsset({ name: 'a', type: 'scale' }, creator);
    const r = await svc.list({ status: 'active' });
    expect(r.length).toBe(1);
  });
});

describe('CalibrationService.setStatus', () => {
  test('marks asset retired with reason', async () => {
    const svc = createCalibrationService({ model: CalibrationAsset });
    let doc = await svc.registerAsset({ name: 'x', type: 'scale' }, creator);
    doc = await svc.setStatus(doc._id, 'retired', 'broken beyond repair', creator);
    expect(doc.status).toBe('retired');
    expect(doc.outOfServiceReason).toContain('broken');
  });
});
