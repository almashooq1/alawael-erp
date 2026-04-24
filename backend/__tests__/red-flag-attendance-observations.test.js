/**
 * red-flag-attendance-observations.test.js — Beneficiary-360 Commit 11a.
 *
 * Integration test: real SessionAttendance Mongoose model against
 * mongodb-memory-server, exercising both adapter methods across a
 * few canonical fixtures. Also exercises the full pipeline
 * end-to-end: adapter → engine → evaluator → verdict, confirming
 * the registry flag actually fires on real data.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createSessionAttendanceObservations,
} = require('../services/redFlagObservations/sessionAttendanceObservations');
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'attendance-obs-test' });
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

// ─── Helpers ────────────────────────────────────────────────────

function seedRow({ bId, status, daysAgo, now = new Date() }) {
  return {
    beneficiaryId: bId,
    sessionId: new mongoose.Types.ObjectId(),
    scheduledDate: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    status,
  };
}

// ─── beneficiaryMonthlyRate ─────────────────────────────────────

describe('beneficiaryMonthlyRate', () => {
  it('returns 100 for a beneficiary with no attendance history', async () => {
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    const bId = new mongoose.Types.ObjectId();
    const { attendanceRate } = await obs.beneficiaryMonthlyRate(bId);
    expect(attendanceRate).toBe(100);
  });

  it('computes present/total ratio across the last 30 days, excludes cancelled', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'present', daysAgo: 2, now }),
      seedRow({ bId, status: 'present', daysAgo: 5, now }),
      seedRow({ bId, status: 'late', daysAgo: 8, now }),
      seedRow({ bId, status: 'absent', daysAgo: 10, now }),
      seedRow({ bId, status: 'no_show', daysAgo: 12, now }),
      seedRow({ bId, status: 'cancelled', daysAgo: 15, now }), // excluded
    ]);
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    const { attendanceRate } = await obs.beneficiaryMonthlyRate(bId, { now });
    // present+late = 3, missed = 2, total = 5; 3/5 = 60%
    expect(attendanceRate).toBe(60);
  });

  it('ignores rows older than 30 days', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'absent', daysAgo: 35, now }),
      seedRow({ bId, status: 'absent', daysAgo: 60, now }),
      seedRow({ bId, status: 'present', daysAgo: 1, now }),
    ]);
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    const { attendanceRate } = await obs.beneficiaryMonthlyRate(bId, { now });
    expect(attendanceRate).toBe(100);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId: a, status: 'absent', daysAgo: 1, now }),
      seedRow({ bId: a, status: 'absent', daysAgo: 2, now }),
      seedRow({ bId: b, status: 'present', daysAgo: 1, now }),
    ]);
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    expect((await obs.beneficiaryMonthlyRate(a, { now })).attendanceRate).toBe(0);
    expect((await obs.beneficiaryMonthlyRate(b, { now })).attendanceRate).toBe(100);
  });
});

// ─── consecutiveMissedForBeneficiary ───────────────────────────

describe('consecutiveMissedForBeneficiary', () => {
  it('returns 0 for no history', async () => {
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    const bId = new mongoose.Types.ObjectId();
    expect((await obs.consecutiveMissedForBeneficiary(bId)).streakCount).toBe(0);
  });

  it('counts the most recent consecutive misses', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    // most recent → oldest:  absent, no_show, absent, present, absent, ...
    // streak should be 3 (up to the first present)
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'absent', daysAgo: 1, now }),
      seedRow({ bId, status: 'no_show', daysAgo: 3, now }),
      seedRow({ bId, status: 'absent', daysAgo: 5, now }),
      seedRow({ bId, status: 'present', daysAgo: 7, now }),
      seedRow({ bId, status: 'absent', daysAgo: 9, now }),
    ]);
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    expect((await obs.consecutiveMissedForBeneficiary(bId)).streakCount).toBe(3);
  });

  it('a single present row breaks the streak immediately', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'present', daysAgo: 1, now }),
      seedRow({ bId, status: 'absent', daysAgo: 3, now }),
    ]);
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    expect((await obs.consecutiveMissedForBeneficiary(bId)).streakCount).toBe(0);
  });

  it('cancelled rows do NOT break the streak', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'absent', daysAgo: 1, now }),
      seedRow({ bId, status: 'cancelled', daysAgo: 2, now }),
      seedRow({ bId, status: 'absent', daysAgo: 3, now }),
      seedRow({ bId, status: 'absent', daysAgo: 4, now }),
    ]);
    const obs = createSessionAttendanceObservations({ model: SessionAttendance });
    expect((await obs.consecutiveMissedForBeneficiary(bId)).streakCount).toBe(3);
  });
});

// ─── End-to-end via engine + registry ──────────────────────────

describe('attendance flags fire end-to-end via engine', () => {
  it('raises attendance.monthly.rate.low_70 when attendance drops below 70%', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'present', daysAgo: 1, now }),
      seedRow({ bId, status: 'absent', daysAgo: 3, now }),
      seedRow({ bId, status: 'absent', daysAgo: 5, now }),
      seedRow({ bId, status: 'absent', daysAgo: 7, now }),
      seedRow({ bId, status: 'absent', daysAgo: 9, now }),
    ]);

    const locator = createLocator();
    locator.register(
      'attendanceService',
      createSessionAttendanceObservations({ model: SessionAttendance })
    );
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['attendance.monthly.rate.low_70'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    const v = result.verdicts[0];
    expect(v.flagId).toBe('attendance.monthly.rate.low_70');
    expect(v.kind).toBe('raised');
    expect(v.observedValue).toBe(20); // 1 present / 5 total = 20%
  });

  it('raises attendance.missed.streak_3_consecutive on a 3-miss streak', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'absent', daysAgo: 1, now }),
      seedRow({ bId, status: 'absent', daysAgo: 3, now }),
      seedRow({ bId, status: 'no_show', daysAgo: 5, now }),
      seedRow({ bId, status: 'present', daysAgo: 7, now }),
    ]);
    const locator = createLocator();
    locator.register(
      'attendanceService',
      createSessionAttendanceObservations({ model: SessionAttendance })
    );
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['attendance.missed.streak_3_consecutive'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(3);
  });

  it('does NOT raise the streak flag when the most recent session was present', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await SessionAttendance.insertMany([
      seedRow({ bId, status: 'present', daysAgo: 1, now }),
      seedRow({ bId, status: 'absent', daysAgo: 3, now }),
      seedRow({ bId, status: 'absent', daysAgo: 5, now }),
      seedRow({ bId, status: 'absent', daysAgo: 7, now }),
    ]);
    const locator = createLocator();
    locator.register(
      'attendanceService',
      createSessionAttendanceObservations({ model: SessionAttendance })
    );
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['attendance.missed.streak_3_consecutive'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
