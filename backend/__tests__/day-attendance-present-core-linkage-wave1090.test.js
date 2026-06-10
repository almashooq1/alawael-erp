'use strict';

/**
 * W1090 — BeneficiaryDayAttendance → unified core timeline linkage.
 *
 * Marking a beneficiary present (or late) for the day at the day-rehab
 * center publishes `day-attendance.day_attendance.present`, which the DDD
 * cross-module subscriber materialises into a per-beneficiary CareTimeline
 * row (category: administrative). Proves the daily rollcall is bound to the
 * beneficiary and the timeline.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const BeneficiaryDayAttendance = require('../models/BeneficiaryDayAttendance');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1090-day-attendance' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await BeneficiaryDayAttendance.deleteMany({});
  await CareTimeline.deleteMany({});
});

async function waitForTimeline(filter, { tries = 40, gap = 50 } = {}) {
  for (let i = 0; i < tries; i += 1) {
    const row = await CareTimeline.findOne(filter).lean();
    if (row) return row;
    await new Promise(r => setTimeout(r, gap));
  }
  return null;
}

function rollcall(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-05-12T00:00:00.000Z'),
    status: 'present',
    checkInTime: new Date('2026-05-12T07:30:00.000Z'),
    arrivedByBus: true,
    ...overrides,
  };
}

describe('W1090 — BeneficiaryDayAttendance → CareTimeline linkage', () => {
  it('records an administrative timeline row when marked present', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await BeneficiaryDayAttendance.create(rollcall({ beneficiaryId, branchId }));

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('day_attendance_present');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.attendanceId)).toBe(String(doc._id));
    expect(row.metadata.status).toBe('present');
    expect(row.title).toContain('present');
  });

  it('marks a late arrival as warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryDayAttendance.create(rollcall({ beneficiaryId, status: 'late' }));

    const row = await waitForTimeline({ beneficiaryId });
    expect(row).toBeTruthy();
    expect(row.severity).toBe('warning');
  });

  it('does NOT fire for an absent rollcall', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await BeneficiaryDayAttendance.create(
      rollcall({ beneficiaryId, status: 'absent', checkInTime: null })
    );

    await new Promise(r => setTimeout(r, 300));
    const count = await CareTimeline.countDocuments({ beneficiaryId });
    expect(count).toBe(0);
  });

  it('does not duplicate the timeline row when the rollcall is updated', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await BeneficiaryDayAttendance.create(rollcall({ beneficiaryId }));

    await waitForTimeline({ beneficiaryId });

    doc.checkOutTime = new Date('2026-05-12T14:00:00.000Z');
    await doc.save();
    await new Promise(r => setTimeout(r, 300));

    const count = await CareTimeline.countDocuments({ beneficiaryId });
    expect(count).toBe(1);
  });
});
