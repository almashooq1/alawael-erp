/**
 * red-flag-caseload-observations.test.js — Beneficiary-360 Commit 16.
 *
 * Integration: real SessionAttendance model against mongodb-memory-
 * server. Pins the "max across therapists" semantics, caseload and
 * assignment windows, and the end-to-end raise/clear behavior.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createCaseloadObservations,
} = require('../services/redFlagObservations/caseloadObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let SessionAttendance;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'caseload-obs-test' });
  SessionAttendance = require('../models/SessionAttendance');
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
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedSession({ bId, therapistId, daysAgo, now, status = 'present' }) {
  return SessionAttendance.create({
    beneficiaryId: bId,
    therapistId,
    sessionId: new mongoose.Types.ObjectId(),
    scheduledDate: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    status,
  });
}

/**
 * Seed a therapist with `count` distinct beneficiaries all seen
 * within the caseload window. Returns the therapist id.
 */
async function seedTherapistWithCaseload({ count, daysAgo = 5, now }) {
  const therapistId = new mongoose.Types.ObjectId();
  const bens = Array.from({ length: count }, () => new mongoose.Types.ObjectId());
  await SessionAttendance.insertMany(
    bens.map(bId => ({
      beneficiaryId: bId,
      therapistId,
      sessionId: new mongoose.Types.ObjectId(),
      scheduledDate: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
      status: 'present',
    }))
  );
  return { therapistId, beneficiaryIds: bens };
}

// ─── Unit: activeCountForTherapist ──────────────────────────────

describe('activeCountForTherapist', () => {
  it('returns 0 when the beneficiary has no recent sessions', async () => {
    const obs = createCaseloadObservations({ sessionAttendanceModel: SessionAttendance });
    const { activeCases } = await obs.activeCountForTherapist(new mongoose.Types.ObjectId());
    expect(activeCases).toBe(0);
  });

  it('returns the therapist’s distinct beneficiary count within the caseload window', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const { therapistId, beneficiaryIds } = await seedTherapistWithCaseload({
      count: 12,
      daysAgo: 5,
      now,
    });
    const obs = createCaseloadObservations({ sessionAttendanceModel: SessionAttendance });
    // The adapter is called with ONE of those beneficiaries
    const { activeCases } = await obs.activeCountForTherapist(beneficiaryIds[0], { now });
    expect(activeCases).toBe(12);
  });

  it('returns MAX across therapists when the beneficiary sees multiple', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const busyTherapist = new mongoose.Types.ObjectId();
    const lightTherapist = new mongoose.Types.ObjectId();

    // Busy therapist has 40 other beneficiaries in the caseload window.
    await SessionAttendance.insertMany(
      Array.from({ length: 40 }, () => ({
        beneficiaryId: new mongoose.Types.ObjectId(),
        therapistId: busyTherapist,
        sessionId: new mongoose.Types.ObjectId(),
        scheduledDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
        status: 'present',
      }))
    );
    // Light therapist has 5.
    await SessionAttendance.insertMany(
      Array.from({ length: 5 }, () => ({
        beneficiaryId: new mongoose.Types.ObjectId(),
        therapistId: lightTherapist,
        sessionId: new mongoose.Types.ObjectId(),
        scheduledDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
        status: 'present',
      }))
    );
    // Our beneficiary sees both of them.
    await seedSession({ bId, therapistId: busyTherapist, daysAgo: 3, now });
    await seedSession({ bId, therapistId: lightTherapist, daysAgo: 5, now });

    const obs = createCaseloadObservations({ sessionAttendanceModel: SessionAttendance });
    const { activeCases } = await obs.activeCountForTherapist(bId, { now });
    // Busy therapist now has 41 distinct beneficiaries (40 + the one
    // above); light therapist has 6. Max → 41.
    expect(activeCases).toBe(41);
  });

  it('de-duplicates beneficiaries across multiple sessions with the same therapist', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const therapist = new mongoose.Types.ObjectId();
    // One beneficiary, many sessions.
    await seedSession({ bId, therapistId: therapist, daysAgo: 1, now });
    await seedSession({ bId, therapistId: therapist, daysAgo: 5, now });
    await seedSession({ bId, therapistId: therapist, daysAgo: 10, now });

    const obs = createCaseloadObservations({ sessionAttendanceModel: SessionAttendance });
    const { activeCases } = await obs.activeCountForTherapist(bId, { now });
    expect(activeCases).toBe(1);
  });

  it('ignores sessions outside the caseload window (default 30 days)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const therapist = new mongoose.Types.ObjectId();
    // Beneficiary inside the assignment window (60d) but caseload
    // calculation looks back 30d. Old "other" beneficiaries should
    // not inflate.
    await seedSession({ bId, therapistId: therapist, daysAgo: 5, now });
    for (let i = 0; i < 5; i++) {
      await seedSession({
        bId: new mongoose.Types.ObjectId(),
        therapistId: therapist,
        daysAgo: 60, // outside 30d caseload window
        now,
      });
    }
    const obs = createCaseloadObservations({ sessionAttendanceModel: SessionAttendance });
    const { activeCases } = await obs.activeCountForTherapist(bId, { now });
    // Only our beneficiary counts → 1
    expect(activeCases).toBe(1);
  });

  it('ignores therapists outside the assignment window (default 60 days)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const formerTherapist = new mongoose.Types.ObjectId();
    // Our beneficiary saw this therapist 90 days ago — outside the
    // 60-day assignment window. They are not "our" therapist any more.
    await seedSession({ bId, therapistId: formerTherapist, daysAgo: 90, now });
    // The therapist has a huge current caseload but shouldn't count.
    await SessionAttendance.insertMany(
      Array.from({ length: 50 }, () => ({
        beneficiaryId: new mongoose.Types.ObjectId(),
        therapistId: formerTherapist,
        sessionId: new mongoose.Types.ObjectId(),
        scheduledDate: new Date(now.getTime() - 5 * 24 * 3600 * 1000),
        status: 'present',
      }))
    );
    const obs = createCaseloadObservations({ sessionAttendanceModel: SessionAttendance });
    const { activeCases } = await obs.activeCountForTherapist(bId, { now });
    expect(activeCases).toBe(0);
  });

  it('honors injected window options', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    const therapist = new mongoose.Types.ObjectId();
    await seedSession({ bId, therapistId: therapist, daysAgo: 45, now });
    for (let i = 0; i < 3; i++) {
      await seedSession({
        bId: new mongoose.Types.ObjectId(),
        therapistId: therapist,
        daysAgo: 45,
        now,
      });
    }
    const obs = createCaseloadObservations({ sessionAttendanceModel: SessionAttendance });
    // Default 30d window excludes our 45d-old sessions → 0
    expect((await obs.activeCountForTherapist(bId, { now })).activeCases).toBe(0);
    // Widened caseload AND assignment windows include it → 4 (3 others + self)
    expect(
      (
        await obs.activeCountForTherapist(bId, {
          now,
          caseloadWindowDays: 90,
          assignmentWindowDays: 90,
        })
      ).activeCases
    ).toBe(4);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('operational.therapist.caseload.exceeded fires end-to-end', () => {
  it('raises when a treating therapist has ≥ 30 active beneficiaries', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const therapist = new mongoose.Types.ObjectId();

    // 35 distinct beneficiaries in the caseload window for this therapist
    await SessionAttendance.insertMany(
      Array.from({ length: 34 }, () => ({
        beneficiaryId: new mongoose.Types.ObjectId(),
        therapistId: therapist,
        sessionId: new mongoose.Types.ObjectId(),
        scheduledDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
        status: 'present',
      }))
    );
    // And our beneficiary makes 35
    await seedSession({
      bId: new mongoose.Types.ObjectId(bId),
      therapistId: therapist,
      daysAgo: 3,
      now,
    });

    const locator = createLocator();
    locator.register(
      'caseloadService',
      createCaseloadObservations({ sessionAttendanceModel: SessionAttendance })
    );
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.caseload.exceeded'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(35);
  });

  it('does NOT raise at exactly 29 (threshold is ≥ 30 via "crossed")', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    const therapist = new mongoose.Types.ObjectId();

    await SessionAttendance.insertMany(
      Array.from({ length: 28 }, () => ({
        beneficiaryId: new mongoose.Types.ObjectId(),
        therapistId: therapist,
        sessionId: new mongoose.Types.ObjectId(),
        scheduledDate: new Date(now.getTime() - 10 * 24 * 3600 * 1000),
        status: 'present',
      }))
    );
    await seedSession({
      bId: new mongoose.Types.ObjectId(bId),
      therapistId: therapist,
      daysAgo: 3,
      now,
    });
    // Total distinct for this therapist: 29

    const locator = createLocator();
    locator.register(
      'caseloadService',
      createCaseloadObservations({ sessionAttendanceModel: SessionAttendance })
    );
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.therapist.caseload.exceeded'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
