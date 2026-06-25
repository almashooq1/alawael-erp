'use strict';

/**
 * session-attendance-missed-core-linkage-wave1084.test.js — W1084.
 *
 * Links the operational milestone (the beneficiary missed a therapy
 * session) into the unified core. A new no_show / absent SessionAttendance
 * emits session-attendance.session_attendance.missed → CareTimeline
 * 'session_attendance_missed' (clinical; no_show→warning, absent→info).
 * Present/late/cancelled and edits don't fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SessionAttendance;
let CareTimeline;
let integrationBus;

function attendance(beneficiaryId, status, overrides = {}) {
  return {
    sessionId: new mongoose.Types.ObjectId(),
    beneficiaryId,
    branchId: new mongoose.Types.ObjectId(),
    scheduledDate: new Date(),
    status,
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1084-session-attendance' } });
  await mongoose.connect(mongod.getUri());

  SessionAttendance = require('../models/SessionAttendance');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([SessionAttendance.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1084 — missed therapy sessions reach the unified-core timeline', () => {
  it('a no_show lands a session_attendance_missed row (warning)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await SessionAttendance.create(
      attendance(beneficiaryId, 'no_show', { billable: true })
    );

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'session_attendance_missed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('warning');
    expect(String(tl.metadata.attendanceId)).toBe(String(a._id));
    expect(tl.metadata.status).toBe('no_show');
    expect(tl.metadata.billable).toBe(true);
    expect(tl.title).toContain('billable');
  });

  it('an absent is recorded with info severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SessionAttendance.create(attendance(beneficiaryId, 'absent'));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'session_attendance_missed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('info');
    expect(tl.metadata.status).toBe('absent');
  });

  it('a present attendance does not fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SessionAttendance.create(
      attendance(beneficiaryId, 'present', { checkInTime: new Date() })
    );

    await waitForCount({ beneficiaryId, eventType: 'session_attendance_missed' }, 0);
  });

  it('editing an existing missed row does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const a = await SessionAttendance.create(attendance(beneficiaryId, 'no_show'));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'session_attendance_missed' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await SessionAttendance.findById(a._id);
    again.reason = 'family travel';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'session_attendance_missed' }, 1);
  });
});
