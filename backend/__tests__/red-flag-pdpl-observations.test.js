/**
 * red-flag-pdpl-observations.test.js — Beneficiary-360 Commit 26.
 *
 * Integration: real PdplRequest model against mongodb-memory-server.
 * Pins the "open status set + MAX across open requests" semantics
 * and the end-to-end compliance.pdpl.dsar.sla_breach flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createPdplObservations } = require('../services/redFlagObservations/pdplObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let PdplRequest;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'pdpl-obs-test' });
  PdplRequest = require('../models/PdplRequest').PdplRequest;
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
  await PdplRequest.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedRequest({
  bId,
  requestType = 'access',
  status = 'received',
  daysAgo = 5,
  now = new Date(),
}) {
  return PdplRequest.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    requestType,
    status,
    requestedAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
  });
}

// ─── Unit: openDsarForBeneficiary ───────────────────────────────

describe('openDsarForBeneficiary', () => {
  it('returns 0 when no DSAR requests exist', async () => {
    const obs = createPdplObservations({ model: PdplRequest });
    const { daysOpen } = await obs.openDsarForBeneficiary(new mongoose.Types.ObjectId());
    expect(daysOpen).toBe(0);
  });

  it('returns days-open for a single received request', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, daysAgo: 10, now });
    const obs = createPdplObservations({ model: PdplRequest });
    const { daysOpen } = await obs.openDsarForBeneficiary(bId, { now });
    expect(daysOpen).toBe(10);
  });

  it('returns 0 when all requests are completed', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, status: 'completed', daysAgo: 45, now });
    const obs = createPdplObservations({ model: PdplRequest });
    const { daysOpen } = await obs.openDsarForBeneficiary(bId, { now });
    expect(daysOpen).toBe(0);
  });

  it('returns 0 when all requests are rejected', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, status: 'rejected', daysAgo: 45, now });
    const obs = createPdplObservations({ model: PdplRequest });
    const { daysOpen } = await obs.openDsarForBeneficiary(bId, { now });
    expect(daysOpen).toBe(0);
  });

  it('in_progress and extended statuses count as open', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, status: 'in_progress', daysAgo: 20, now });
    await seedRequest({ bId, status: 'extended', daysAgo: 40, now });
    const obs = createPdplObservations({ model: PdplRequest });
    const { daysOpen } = await obs.openDsarForBeneficiary(bId, { now });
    expect(daysOpen).toBe(40);
  });

  it('reports the MAX across multiple open requests', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, daysAgo: 5, now });
    await seedRequest({ bId, daysAgo: 55, now });
    await seedRequest({ bId, daysAgo: 12, now });
    const obs = createPdplObservations({ model: PdplRequest });
    const { daysOpen } = await obs.openDsarForBeneficiary(bId, { now });
    expect(daysOpen).toBe(55);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId: a, daysAgo: 45, now });
    await seedRequest({ bId: b, daysAgo: 5, now });
    const obs = createPdplObservations({ model: PdplRequest });
    expect((await obs.openDsarForBeneficiary(a, { now })).daysOpen).toBe(45);
    expect((await obs.openDsarForBeneficiary(b, { now })).daysOpen).toBe(5);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('compliance.pdpl.dsar.sla_breach fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register('pdplService', createPdplObservations({ model: PdplRequest }));
    return createEngine({ locator });
  }

  it('raises when an open DSAR is past 30 days', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, daysAgo: 45, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['compliance.pdpl.dsar.sla_breach'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(45);
  });

  it('does NOT raise at exactly 30 days (operator is strict >)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, daysAgo: 30, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['compliance.pdpl.dsar.sla_breach'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear when the request has been completed', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedRequest({ bId, status: 'completed', daysAgo: 100, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['compliance.pdpl.dsar.sla_breach'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
