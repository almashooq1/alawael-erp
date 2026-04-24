/**
 * red-flag-portal-activity-observations.test.js — Beneficiary-360
 * Commit 18.
 *
 * Integration: real Guardian model against mongodb-memory-server.
 * Pins min-across-guardians semantics, never-logged-in sentinel,
 * and the family.portal.inactive.90d flag end-to-end.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createPortalActivityObservations,
  NEVER_LOGGED_IN_SENTINEL,
} = require('../services/redFlagObservations/portalActivityObservations');
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'portal-obs-test' });
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
  lastLoginAt = null,
  accountStatus = 'verified',
}) {
  const seq = guardianCounter++;
  await Guardian.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    // Minimum believable fields — raw driver so we don't fight the
    // Guardian model's full required-field set. Guardian has three
    // unique-indexed fields (email, idNumber, userId) — each needs
    // a distinct value.
    idNumber: `ID${String(seq).padStart(7, '0')}`,
    phone: `+9665${String(seq).padStart(8, '0')}`,
    email: `guardian-${seq}@test.local`,
    userId: new mongoose.Types.ObjectId(),
    lastLoginAt,
    accountStatus,
    beneficiaries: beneficiaryIds.map(b =>
      b instanceof mongoose.Types.ObjectId ? b : new mongoose.Types.ObjectId(b)
    ),
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ─── guardianLastLogin ──────────────────────────────────────────

describe('guardianLastLogin', () => {
  it('returns null when the beneficiary has no guardians', async () => {
    const obs = createPortalActivityObservations({ model: Guardian });
    const { daysSinceLogin } = await obs.guardianLastLogin(new mongoose.Types.ObjectId());
    expect(daysSinceLogin).toBeNull();
  });

  it('computes days-since-login for a single guardian', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedGuardian({
      beneficiaryIds: [bId],
      lastLoginAt: new Date('2026-04-15T00:00:00.000Z'),
    });
    const obs = createPortalActivityObservations({ model: Guardian });
    const { daysSinceLogin } = await obs.guardianLastLogin(bId, {
      now: new Date('2026-04-22T12:00:00.000Z'),
    });
    expect(daysSinceLogin).toBe(7);
  });

  it('returns the NEVER_LOGGED_IN sentinel when lastLoginAt is null', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedGuardian({ beneficiaryIds: [bId], lastLoginAt: null });
    const obs = createPortalActivityObservations({ model: Guardian });
    const { daysSinceLogin } = await obs.guardianLastLogin(bId);
    expect(daysSinceLogin).toBe(NEVER_LOGGED_IN_SENTINEL);
  });

  it('takes the MIN across multiple guardians (most-active wins)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      lastLoginAt: new Date('2026-01-01T00:00:00.000Z'), // 112 days ago
    });
    await seedGuardian({
      beneficiaryIds: [bId],
      lastLoginAt: new Date('2026-04-20T00:00:00.000Z'), // 2 days ago
    });
    const obs = createPortalActivityObservations({ model: Guardian });
    const { daysSinceLogin } = await obs.guardianLastLogin(bId, { now });
    expect(daysSinceLogin).toBe(2);
  });

  it('ignores blocked / unverified guardians', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      lastLoginAt: new Date('2026-04-21T00:00:00.000Z'),
      accountStatus: 'blocked',
    });
    const obs = createPortalActivityObservations({ model: Guardian });
    const { daysSinceLogin } = await obs.guardianLastLogin(bId, { now });
    expect(daysSinceLogin).toBeNull();
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [a],
      lastLoginAt: new Date('2026-04-20T00:00:00.000Z'),
    });
    await seedGuardian({ beneficiaryIds: [b], lastLoginAt: null });
    const obs = createPortalActivityObservations({ model: Guardian });
    expect((await obs.guardianLastLogin(a, { now })).daysSinceLogin).toBe(2);
    expect((await obs.guardianLastLogin(b, { now })).daysSinceLogin).toBe(NEVER_LOGGED_IN_SENTINEL);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('family.portal.inactive.90d fires end-to-end', () => {
  it('raises when all guardians have been inactive for ≥ 90 days', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      lastLoginAt: new Date('2025-12-01T00:00:00.000Z'), // ≈ 142 days
    });
    const locator = createLocator();
    locator.register(
      'portalActivityService',
      createPortalActivityObservations({ model: Guardian })
    );
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.portal.inactive.90d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBeGreaterThanOrEqual(90);
  });

  it('does NOT raise when a single guardian logged in recently', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedGuardian({
      beneficiaryIds: [bId],
      lastLoginAt: new Date('2025-12-01T00:00:00.000Z'), // old
    });
    await seedGuardian({
      beneficiaryIds: [bId],
      lastLoginAt: new Date('2026-04-20T00:00:00.000Z'), // 2 days ago
    });
    const locator = createLocator();
    locator.register(
      'portalActivityService',
      createPortalActivityObservations({ model: Guardian })
    );
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.portal.inactive.90d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear when no guardians are linked', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    const locator = createLocator();
    locator.register(
      'portalActivityService',
      createPortalActivityObservations({ model: Guardian })
    );
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['family.portal.inactive.90d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
