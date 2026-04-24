/**
 * red-flag-behavior-tracking-observations.test.js — Commit 29.
 *
 * Integration: real BehaviorIncident model against mongodb-memory-
 * server. Pins the two-window frequency comparison, zero-baseline
 * sentinel, aggression-type isolation, and the end-to-end
 * behavioral.aggression.frequency.spike_200 flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createBehaviorTrackingObservations,
  ZERO_TO_NONZERO_SENTINEL,
} = require('../services/redFlagObservations/behaviorTrackingObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let BehaviorIncident;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'behavior-obs-test' });
  BehaviorIncident = require('../models/BehaviorIncident').BehaviorIncident;
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
  await BehaviorIncident.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedIncident({
  bId,
  behaviorType = 'aggression',
  daysAgo,
  severity = 'minor',
  now = new Date(),
}) {
  return BehaviorIncident.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    behaviorType,
    severity,
    observedAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
  });
}

/** Seed `count` incidents all dated `daysAgo` days back. */
async function seedCount({ bId, behaviorType, count, daysAgo, now }) {
  for (let i = 0; i < count; i++) {
    await seedIncident({ bId, behaviorType, daysAgo, now });
  }
}

// ─── Unit: frequencyDelta ───────────────────────────────────────

describe('frequencyDelta', () => {
  it('returns 0 when no incidents exist at all', async () => {
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    const { aggressionDeltaPct } = await obs.frequencyDelta(new mongoose.Types.ObjectId());
    expect(aggressionDeltaPct).toBe(0);
  });

  it('returns ZERO_TO_NONZERO sentinel when baseline is 0 but current > 0', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    // No incidents in the prior 30-day window
    await seedCount({ bId, behaviorType: 'aggression', count: 3, daysAgo: 5, now });
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    const { aggressionDeltaPct } = await obs.frequencyDelta(bId, { now });
    expect(aggressionDeltaPct).toBe(ZERO_TO_NONZERO_SENTINEL);
  });

  it('computes +100% when current doubles the baseline', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedCount({ bId, behaviorType: 'aggression', count: 5, daysAgo: 45, now });
    await seedCount({ bId, behaviorType: 'aggression', count: 10, daysAgo: 5, now });
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    const { aggressionDeltaPct } = await obs.frequencyDelta(bId, { now });
    expect(aggressionDeltaPct).toBe(100);
  });

  it('computes +200% when current triples the baseline (the flag threshold)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedCount({ bId, behaviorType: 'aggression', count: 4, daysAgo: 45, now });
    await seedCount({ bId, behaviorType: 'aggression', count: 12, daysAgo: 5, now });
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    const { aggressionDeltaPct } = await obs.frequencyDelta(bId, { now });
    expect(aggressionDeltaPct).toBe(200);
  });

  it('returns a negative number when current is LESS than baseline (improvement)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedCount({ bId, behaviorType: 'aggression', count: 10, daysAgo: 45, now });
    await seedCount({ bId, behaviorType: 'aggression', count: 4, daysAgo: 5, now });
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    const { aggressionDeltaPct } = await obs.frequencyDelta(bId, { now });
    expect(aggressionDeltaPct).toBe(-60);
  });

  it('ignores other behavior types (self-injury, elopement, etc.)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    // Self-injury: went from 0 → 10. Should NOT affect aggression delta.
    await seedCount({ bId, behaviorType: 'self_injury', count: 10, daysAgo: 5, now });
    // Aggression: 2 baseline → 2 current → 0% change
    await seedCount({ bId, behaviorType: 'aggression', count: 2, daysAgo: 45, now });
    await seedCount({ bId, behaviorType: 'aggression', count: 2, daysAgo: 5, now });
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    const { aggressionDeltaPct } = await obs.frequencyDelta(bId, { now });
    expect(aggressionDeltaPct).toBe(0);
  });

  it('ignores incidents older than baseline window', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    // Stuff outside both windows
    await seedCount({ bId, behaviorType: 'aggression', count: 100, daysAgo: 200, now });
    // Actual baseline + current
    await seedCount({ bId, behaviorType: 'aggression', count: 2, daysAgo: 45, now });
    await seedCount({ bId, behaviorType: 'aggression', count: 2, daysAgo: 5, now });
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    const { aggressionDeltaPct } = await obs.frequencyDelta(bId, { now });
    expect(aggressionDeltaPct).toBe(0);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedCount({ bId: a, behaviorType: 'aggression', count: 3, daysAgo: 45, now });
    await seedCount({ bId: a, behaviorType: 'aggression', count: 9, daysAgo: 5, now });
    await seedCount({ bId: b, behaviorType: 'aggression', count: 5, daysAgo: 5, now });
    const obs = createBehaviorTrackingObservations({
      model: BehaviorIncident,
    });
    expect((await obs.frequencyDelta(a, { now })).aggressionDeltaPct).toBe(200);
    expect((await obs.frequencyDelta(b, { now })).aggressionDeltaPct).toBe(
      ZERO_TO_NONZERO_SENTINEL
    );
  });
});

// ─── End-to-end via engine ─────────────────────────────────────

describe('behavioral.aggression.frequency.spike_200 fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register(
      'behaviorTrackingService',
      createBehaviorTrackingObservations({ model: BehaviorIncident })
    );
    return createEngine({ locator });
  }

  it('raises at exactly +200% (operator is >=)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedCount({ bId, behaviorType: 'aggression', count: 3, daysAgo: 45, now });
    await seedCount({ bId, behaviorType: 'aggression', count: 9, daysAgo: 5, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['behavioral.aggression.frequency.spike_200'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(200);
  });

  it('raises when going from zero baseline to current (sentinel >> 200)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedCount({ bId, behaviorType: 'aggression', count: 3, daysAgo: 5, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['behavioral.aggression.frequency.spike_200'],
      now,
    });
    expect(result.raisedCount).toBe(1);
  });

  it('does NOT raise at +150%', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedCount({ bId, behaviorType: 'aggression', count: 4, daysAgo: 45, now });
    await seedCount({ bId, behaviorType: 'aggression', count: 10, daysAgo: 5, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['behavioral.aggression.frequency.spike_200'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear with zero incidents on either side', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['behavioral.aggression.frequency.spike_200'],
    });
    expect(result.raisedCount).toBe(0);
  });
});
