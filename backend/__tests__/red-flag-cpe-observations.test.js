/**
 * red-flag-cpe-observations.test.js — Beneficiary-360 Commit 13.
 *
 * Integration: real SessionAttendance + HR/Employee models against
 * mongodb-memory-server. Proves that the CPE adapter resolves the
 * beneficiary→therapist→license chain correctly and the
 * operational.therapist.license.expiring_60d flag fires end-to-end.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createCpeObservations } = require('../services/redFlagObservations/cpeObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let SessionAttendance;
let Employee;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'cpe-obs-test' });
  SessionAttendance = require('../models/SessionAttendance');
  Employee = require('../models/HR/Employee');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await SessionAttendance.deleteMany({});
  await Employee.deleteMany({});
});

// ─── Fixture builders ───────────────────────────────────────────

let therapistCounter = 1;
async function seedTherapist({ scfhsExpiryDaysFromNow = 365, now = new Date() } = {}) {
  // Bypass the Employee schema's full required-field set by writing
  // straight through the driver. The adapter only reads `_id` and
  // `scfhs_expiry`; any other field enforced by the Mongoose layer
  // is irrelevant to this test's contract. `employee_number` is
  // unique-indexed so we stamp a deterministic counter to avoid
  // E11000 collisions on null values.
  const seq = therapistCounter++;
  const _id = new mongoose.Types.ObjectId();
  await Employee.collection.insertOne({
    _id,
    // HR/Employee has THREE unique-indexed fields (employee_number,
    // national_id, email) — each needs a distinct value so multiple
    // fixtures in the same test don't collide on E11000.
    employee_number: `TEST-${seq}`,
    national_id: `TEST${String(seq).padStart(6, '0')}`,
    email: `therapist-${seq}-${Date.now()}@test.local`,
    scfhs_expiry: new Date(now.getTime() + scfhsExpiryDaysFromNow * 24 * 3600 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { _id };
}

async function seedSession({ bId, therapistId, daysAgo, status = 'present', now = new Date() }) {
  return SessionAttendance.create({
    beneficiaryId: bId,
    therapistId,
    sessionId: new mongoose.Types.ObjectId(),
    scheduledDate: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    status,
  });
}

// ─── licensesExpiringInDays — unit-style ────────────────────────

describe('licensesExpiringInDays', () => {
  it('returns 0 for a beneficiary with no recent sessions', async () => {
    const obs = createCpeObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
    });
    const { count } = await obs.licensesExpiringInDays(new mongoose.Types.ObjectId());
    expect(count).toBe(0);
  });

  it('counts therapists whose license expires within 60 days', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const tExpiringSoon = await seedTherapist({ scfhsExpiryDaysFromNow: 30, now });
    const tExpiringLater = await seedTherapist({ scfhsExpiryDaysFromNow: 180, now });
    await seedSession({ bId, therapistId: tExpiringSoon._id, daysAgo: 5, now });
    await seedSession({ bId, therapistId: tExpiringLater._id, daysAgo: 10, now });

    const obs = createCpeObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
    });
    const { count } = await obs.licensesExpiringInDays(bId, { now });
    expect(count).toBe(1);
  });

  it('de-duplicates when the same therapist has multiple sessions', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const therapist = await seedTherapist({ scfhsExpiryDaysFromNow: 45, now });
    await seedSession({ bId, therapistId: therapist._id, daysAgo: 1, now });
    await seedSession({ bId, therapistId: therapist._id, daysAgo: 8, now });
    await seedSession({ bId, therapistId: therapist._id, daysAgo: 15, now });

    const obs = createCpeObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
    });
    const { count } = await obs.licensesExpiringInDays(bId, { now });
    expect(count).toBe(1);
  });

  it('counts already-expired licenses (≤ now)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const therapist = await seedTherapist({ scfhsExpiryDaysFromNow: -7, now }); // expired last week
    await seedSession({ bId, therapistId: therapist._id, daysAgo: 2, now });

    const obs = createCpeObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
    });
    const { count } = await obs.licensesExpiringInDays(bId, { now });
    expect(count).toBe(1);
  });

  it('does not count therapists who have not treated this beneficiary', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const otherBeneficiary = new mongoose.Types.ObjectId();
    const therapist = await seedTherapist({ scfhsExpiryDaysFromNow: 30, now });
    await seedSession({
      bId: otherBeneficiary,
      therapistId: therapist._id,
      daysAgo: 5,
      now,
    });

    const obs = createCpeObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
    });
    const { count } = await obs.licensesExpiringInDays(bId, { now });
    expect(count).toBe(0);
  });

  it('excludes sessions older than the window', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const therapist = await seedTherapist({ scfhsExpiryDaysFromNow: 30, now });
    await seedSession({ bId, therapistId: therapist._id, daysAgo: 200, now });

    const obs = createCpeObservations({
      sessionAttendanceModel: SessionAttendance,
      employeeModel: Employee,
    });
    const { count } = await obs.licensesExpiringInDays(bId, { now });
    expect(count).toBe(0);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('operational.therapist.license.expiring_60d fires end-to-end', () => {
  it('raises when a recent therapist has a license expiring within 60 days', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const therapist = await seedTherapist({ scfhsExpiryDaysFromNow: 25, now });
    await seedSession({ bId, therapistId: therapist._id, daysAgo: 3, now });

    const locator = createLocator();
    locator.register(
      'cpeService',
      createCpeObservations({
        sessionAttendanceModel: SessionAttendance,
        employeeModel: Employee,
      })
    );
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.license.expiring_60d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(1);
  });

  it('does NOT raise when all therapists have licenses valid > 60 days', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const therapist = await seedTherapist({ scfhsExpiryDaysFromNow: 180, now });
    await seedSession({ bId, therapistId: therapist._id, daysAgo: 3, now });

    const locator = createLocator();
    locator.register(
      'cpeService',
      createCpeObservations({
        sessionAttendanceModel: SessionAttendance,
        employeeModel: Employee,
      })
    );
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.license.expiring_60d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
