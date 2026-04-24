/**
 * red-flag-careplan-observations.test.js — Beneficiary-360 Commit 15.
 *
 * Integration: real CarePlan model against mongodb-memory-server.
 * Pins the opt-in semantics (legacy plans without
 * `requiresSignature: true` are invisible to the flag) and proves
 * `operational.care_plan.unsigned.14d` fires correctly end-to-end.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createCarePlanObservations,
} = require('../services/redFlagObservations/carePlanObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let CarePlan;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'careplan-obs-test' });
  CarePlan = require('../models/CarePlan');
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
  await CarePlan.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedPlan({
  bId,
  status = 'ACTIVE',
  requiresSignature = true,
  signedAt = null,
  daysAgo = 30,
  now = new Date(),
}) {
  // Use native driver insert so we control `createdAt` precisely —
  // Mongoose's `timestamps: true` would stamp the current time and
  // we'd never be able to simulate "30 days old".
  // Raw inserts skip Mongoose's auto-cast; ensure beneficiary is
  // stored as a real ObjectId so `countDocuments({ beneficiary: ... })`
  // matches regardless of whether the caller passed a string or an
  // ObjectId. The engine always passes a string (from the URL).
  const bObjectId = bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId);
  const doc = {
    _id: new mongoose.Types.ObjectId(),
    beneficiary: bObjectId,
    startDate: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    status,
    requiresSignature,
    signedAt,
    createdAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    updatedAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    __v: 0,
  };
  await CarePlan.collection.insertOne(doc);
  return doc;
}

// ─── Unit: unsignedOlderThan ────────────────────────────────────

describe('unsignedOlderThan', () => {
  it('returns 0 when the beneficiary has no care plans', async () => {
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(new mongoose.Types.ObjectId());
    expect(count).toBe(0);
  });

  it('counts ACTIVE + requiresSignature + unsigned + >14 days old', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({ bId, daysAgo: 20, now });
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(bId, { now });
    expect(count).toBe(1);
  });

  it('does NOT count a plan signed — even if old and active', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({
      bId,
      daysAgo: 30,
      signedAt: new Date('2026-04-10T00:00:00.000Z'),
      now,
    });
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(bId, { now });
    expect(count).toBe(0);
  });

  it('does NOT count a plan with requiresSignature: false (legacy opt-out)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({ bId, daysAgo: 90, requiresSignature: false, now });
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(bId, { now });
    expect(count).toBe(0);
  });

  it('does NOT count DRAFT plans (not yet live)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({ bId, daysAgo: 30, status: 'DRAFT', now });
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(bId, { now });
    expect(count).toBe(0);
  });

  it('does NOT count ARCHIVED plans', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({ bId, daysAgo: 30, status: 'ARCHIVED', now });
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(bId, { now });
    expect(count).toBe(0);
  });

  it('does NOT count a plan less than 14 days old', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({ bId, daysAgo: 10, now });
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(bId, { now });
    expect(count).toBe(0);
  });

  it('counts multiple qualifying plans for the same beneficiary', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({ bId, daysAgo: 20, now });
    await seedPlan({ bId, daysAgo: 60, now });
    await seedPlan({ bId, daysAgo: 5, now }); // too new
    const obs = createCarePlanObservations({ model: CarePlan });
    const { count } = await obs.unsignedOlderThan(bId, { now });
    expect(count).toBe(2);
  });

  it('does not leak across beneficiaries', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await seedPlan({ bId: a, daysAgo: 20, now });
    await seedPlan({ bId: b, daysAgo: 20, now });
    const obs = createCarePlanObservations({ model: CarePlan });
    expect((await obs.unsignedOlderThan(a, { now })).count).toBe(1);
    expect((await obs.unsignedOlderThan(b, { now })).count).toBe(1);
  });

  it('injectable daysThreshold overrides the 14-day default', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId();
    await seedPlan({ bId, daysAgo: 20, now });
    const obs = createCarePlanObservations({ model: CarePlan });
    expect((await obs.unsignedOlderThan(bId, { now, daysThreshold: 30 })).count).toBe(0);
    expect((await obs.unsignedOlderThan(bId, { now, daysThreshold: 7 })).count).toBe(1);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('operational.care_plan.unsigned.14d fires end-to-end', () => {
  it('raises when an active, signature-required plan is >14 days unsigned', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    await seedPlan({ bId, daysAgo: 20, now });

    const locator = createLocator();
    locator.register('carePlanService', createCarePlanObservations({ model: CarePlan }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.care_plan.unsigned.14d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(1);
  });

  it('does NOT raise on a legacy plan (requiresSignature: false)', async () => {
    const now = new Date('2026-04-22T12:00:00.000Z');
    const bId = new mongoose.Types.ObjectId().toString();
    await seedPlan({ bId, daysAgo: 90, requiresSignature: false, now });

    const locator = createLocator();
    locator.register('carePlanService', createCarePlanObservations({ model: CarePlan }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.care_plan.unsigned.14d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
