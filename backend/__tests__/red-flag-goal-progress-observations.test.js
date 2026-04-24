/**
 * red-flag-goal-progress-observations.test.js — Beneficiary-360 Commit 28.
 *
 * Integration: real GoalProgressSnapshot model against mongodb-
 * memory-server. Pins baseline/current selection per goal, MIN-
 * across-goals semantics, and the end-to-end
 * clinical.progress.regression.significant flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createGoalProgressObservations,
} = require('../services/redFlagObservations/goalProgressObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let GoalProgressSnapshot;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'goal-progress-test' });
  GoalProgressSnapshot = require('../models/GoalProgressSnapshot').GoalProgressSnapshot;
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
  await GoalProgressSnapshot.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedSnapshot({
  bId,
  goalName = 'Speech articulation',
  progressPct,
  daysAgo,
  now = new Date(),
  goalId = null,
}) {
  return GoalProgressSnapshot.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    goalId,
    goalName,
    progressPct,
    measuredAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
  });
}

// ─── Unit: deltaVsBaseline ──────────────────────────────────────

describe('deltaVsBaseline', () => {
  it('returns null when the beneficiary has no snapshots', async () => {
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    const { deltaPct } = await obs.deltaVsBaseline(new mongoose.Types.ObjectId());
    expect(deltaPct).toBeNull();
  });

  it('returns null when only one snapshot exists for a goal', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId, progressPct: 50, daysAgo: 15, now });
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    const { deltaPct } = await obs.deltaVsBaseline(bId, { now });
    expect(deltaPct).toBeNull();
  });

  it('computes a simple regression delta (80 → 60 = -20)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId, progressPct: 80, daysAgo: 45, now }); // pre-window baseline
    await seedSnapshot({ bId, progressPct: 60, daysAgo: 2, now }); // current
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    const { deltaPct } = await obs.deltaVsBaseline(bId, { now });
    expect(deltaPct).toBe(-20);
  });

  it('positive delta (improvement) is reported as a positive number', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId, progressPct: 40, daysAgo: 45, now });
    await seedSnapshot({ bId, progressPct: 65, daysAgo: 3, now });
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    const { deltaPct } = await obs.deltaVsBaseline(bId, { now });
    expect(deltaPct).toBe(25);
  });

  it('falls back to earliest in-window snapshot when no pre-window baseline exists', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId, progressPct: 70, daysAgo: 25, now }); // earliest in-window
    await seedSnapshot({ bId, progressPct: 50, daysAgo: 5, now }); // current
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    const { deltaPct } = await obs.deltaVsBaseline(bId, { now });
    expect(deltaPct).toBe(-20);
  });

  it('reports MIN across multiple goals (worst regression wins)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    // Speech goal improved
    await seedSnapshot({ bId, goalName: 'speech', progressPct: 50, daysAgo: 45, now });
    await seedSnapshot({ bId, goalName: 'speech', progressPct: 60, daysAgo: 2, now });
    // Motor goal regressed heavily
    await seedSnapshot({ bId, goalName: 'motor', progressPct: 75, daysAgo: 45, now });
    await seedSnapshot({ bId, goalName: 'motor', progressPct: 50, daysAgo: 2, now });
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    const { deltaPct } = await obs.deltaVsBaseline(bId, { now });
    expect(deltaPct).toBe(-25);
  });

  it('distinguishes goals by goalId when present (same name, different goals)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    const gA = new mongoose.Types.ObjectId();
    const gB = new mongoose.Types.ObjectId();
    // Same goalName, different goalIds — must NOT be merged
    await seedSnapshot({
      bId,
      goalId: gA,
      goalName: 'progress',
      progressPct: 80,
      daysAgo: 45,
      now,
    });
    await seedSnapshot({
      bId,
      goalId: gA,
      goalName: 'progress',
      progressPct: 60,
      daysAgo: 2,
      now,
    });
    await seedSnapshot({
      bId,
      goalId: gB,
      goalName: 'progress',
      progressPct: 40,
      daysAgo: 45,
      now,
    });
    await seedSnapshot({
      bId,
      goalId: gB,
      goalName: 'progress',
      progressPct: 45,
      daysAgo: 2,
      now,
    });
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    const { deltaPct } = await obs.deltaVsBaseline(bId, { now });
    // gA: -20, gB: +5 → MIN = -20
    expect(deltaPct).toBe(-20);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId: a, progressPct: 80, daysAgo: 45, now });
    await seedSnapshot({ bId: a, progressPct: 55, daysAgo: 2, now });
    await seedSnapshot({ bId: b, progressPct: 60, daysAgo: 45, now });
    await seedSnapshot({ bId: b, progressPct: 70, daysAgo: 2, now });
    const obs = createGoalProgressObservations({ model: GoalProgressSnapshot });
    expect((await obs.deltaVsBaseline(a, { now })).deltaPct).toBe(-25);
    expect((await obs.deltaVsBaseline(b, { now })).deltaPct).toBe(10);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('clinical.progress.regression.significant fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register(
      'goalProgressService',
      createGoalProgressObservations({ model: GoalProgressSnapshot })
    );
    return createEngine({ locator });
  }

  it('raises at -20pp exactly (operator is <=)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId, progressPct: 80, daysAgo: 45, now });
    await seedSnapshot({ bId, progressPct: 60, daysAgo: 2, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.progress.regression.significant'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(-20);
  });

  it('does NOT raise at -10pp (within threshold)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId, progressPct: 80, daysAgo: 45, now });
    await seedSnapshot({ bId, progressPct: 70, daysAgo: 2, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.progress.regression.significant'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear when no goal has two snapshots', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedSnapshot({ bId, progressPct: 80, daysAgo: 15, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.progress.regression.significant'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
