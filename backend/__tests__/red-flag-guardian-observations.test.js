/**
 * red-flag-guardian-observations.test.js — Beneficiary-360 Commit 21.
 *
 * Integration: real Guardian model against mongodb-memory-server.
 * Pins MAX-across-guardians semantics, never-refreshed sentinel,
 * and the end-to-end compliance.custody.order.stale flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createGuardianObservations,
  NEVER_REFRESHED_SENTINEL,
} = require('../services/redFlagObservations/guardianObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let Guardian;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'guardian-obs-test' });
  Guardian = require('../models/Guardian');
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
  await Guardian.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

let guardianCounter = 1;
async function seedGuardian({
  beneficiaryIds = [],
  custodyOrderRefreshedAt = null,
  accountStatus = 'verified',
}) {
  const seq = guardianCounter++;
  await Guardian.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    // Guardian has three unique-indexed fields — each distinct.
    idNumber: `ID${String(seq).padStart(7, '0')}`,
    phone: `+9665${String(seq).padStart(8, '0')}`,
    email: `guardian-${seq}@test.local`,
    userId: new mongoose.Types.ObjectId(),
    accountStatus,
    custodyOrderRefreshedAt,
    beneficiaries: beneficiaryIds.map(b =>
      b instanceof mongoose.Types.ObjectId ? b : new mongoose.Types.ObjectId(b)
    ),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ─── custodyOrderStatus ────────────────────────────────────────

describe('custodyOrderStatus', () => {
  it('returns null when no guardians are linked', async () => {
    const obs = createGuardianObservations({ model: Guardian });
    const { daysSinceRefresh } = await obs.custodyOrderStatus(new mongoose.Types.ObjectId());
    expect(daysSinceRefresh).toBeNull();
  });

  it('returns days-since-refresh for a single guardian', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedGuardian({
      beneficiaryIds: [bId],
      custodyOrderRefreshedAt: new Date('2026-01-22T00:00:00.000Z'),
    });
    const obs = createGuardianObservations({ model: Guardian });
    const { daysSinceRefresh } = await obs.custodyOrderStatus(bId, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(daysSinceRefresh).toBe(90);
  });

  it('treats a null custodyOrderRefreshedAt as "never refreshed" (sentinel)', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedGuardian({ beneficiaryIds: [bId], custodyOrderRefreshedAt: null });
    const obs = createGuardianObservations({ model: Guardian });
    const { daysSinceRefresh } = await obs.custodyOrderStatus(bId);
    expect(daysSinceRefresh).toBe(NEVER_REFRESHED_SENTINEL);
  });

  it('takes the MAX across guardians (oldest stalest wins)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      custodyOrderRefreshedAt: new Date('2026-04-10T00:00:00.000Z'), // 12 days
    });
    await seedGuardian({
      beneficiaryIds: [bId],
      custodyOrderRefreshedAt: new Date('2025-04-22T00:00:00.000Z'), // 365 days
    });
    const obs = createGuardianObservations({ model: Guardian });
    const { daysSinceRefresh } = await obs.custodyOrderStatus(bId, { now });
    expect(daysSinceRefresh).toBe(365);
  });

  it('ignores blocked / unverified guardians', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      custodyOrderRefreshedAt: null, // stale, but
      accountStatus: 'blocked', // excluded
    });
    const obs = createGuardianObservations({ model: Guardian });
    const { daysSinceRefresh } = await obs.custodyOrderStatus(bId, { now });
    expect(daysSinceRefresh).toBeNull();
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [a],
      custodyOrderRefreshedAt: new Date('2026-04-10T00:00:00.000Z'),
    });
    await seedGuardian({ beneficiaryIds: [b], custodyOrderRefreshedAt: null });
    const obs = createGuardianObservations({ model: Guardian });
    expect((await obs.custodyOrderStatus(a, { now })).daysSinceRefresh).toBe(12);
    expect((await obs.custodyOrderStatus(b, { now })).daysSinceRefresh).toBe(
      NEVER_REFRESHED_SENTINEL
    );
  });
});

// ─── End-to-end via engine ─────────────────────────────────────

describe('compliance.custody.order.stale fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register('guardianService', createGuardianObservations({ model: Guardian }));
    return createEngine({ locator });
  }

  it('raises when the custody order is stale ≥ 365 days', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      custodyOrderRefreshedAt: new Date('2025-01-01T00:00:00.000Z'), // > 365 days
    });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['compliance.custody.order.stale'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBeGreaterThanOrEqual(365);
  });

  it('does NOT raise when a refresh happened within the last 365 days', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      custodyOrderRefreshedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['compliance.custody.order.stale'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('raises when any guardian has never had a refresh recorded', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      custodyOrderRefreshedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    await seedGuardian({ beneficiaryIds: [bId], custodyOrderRefreshedAt: null });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['compliance.custody.order.stale'],
      now,
    });
    expect(result.raisedCount).toBe(1);
  });
});
