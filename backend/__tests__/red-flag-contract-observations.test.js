/**
 * red-flag-contract-observations.test.js — Beneficiary-360 Commit 27.
 *
 * Integration: real BeneficiaryContract model against mongodb-
 * memory-server. Pins MIN-across-active semantics, null-on-no-
 * active, negative days on already-expired, and the end-to-end
 * operational.contract.expiring.30d flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createContractObservations,
} = require('../services/redFlagObservations/contractObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let BeneficiaryContract;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'contract-obs-test' });
  BeneficiaryContract = require('../models/BeneficiaryContract').BeneficiaryContract;
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
  await BeneficiaryContract.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

let contractCounter = 1;
async function seedContract({ bId, status = 'active', daysToEnd = 60, now = new Date() }) {
  const seq = contractCounter++;
  return BeneficiaryContract.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    contractNumber: `CT-TEST-${String(seq).padStart(4, '0')}`,
    status,
    startDate: new Date(now.getTime() - 30 * 24 * 3600 * 1000),
    endDate: new Date(now.getTime() + daysToEnd * 24 * 3600 * 1000),
  });
}

// ─── Unit: beneficiaryContracts ─────────────────────────────────

describe('beneficiaryContracts', () => {
  it('returns null when the beneficiary has no contracts', async () => {
    const obs = createContractObservations({ model: BeneficiaryContract });
    const { daysToExpiry } = await obs.beneficiaryContracts(new mongoose.Types.ObjectId());
    expect(daysToExpiry).toBeNull();
  });

  it('returns null when the beneficiary has only non-active contracts', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId, status: 'renewed', daysToEnd: 20, now });
    await seedContract({ bId, status: 'terminated', daysToEnd: 10, now });
    await seedContract({ bId, status: 'expired', daysToEnd: -30, now });
    const obs = createContractObservations({ model: BeneficiaryContract });
    const { daysToExpiry } = await obs.beneficiaryContracts(bId, { now });
    expect(daysToExpiry).toBeNull();
  });

  it('returns days-to-expiry for a single active contract', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId, daysToEnd: 45, now });
    const obs = createContractObservations({ model: BeneficiaryContract });
    const { daysToExpiry } = await obs.beneficiaryContracts(bId, { now });
    expect(daysToExpiry).toBe(45);
  });

  it('reports the MIN (most urgent) across multiple active contracts', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId, daysToEnd: 90, now });
    await seedContract({ bId, daysToEnd: 15, now });
    await seedContract({ bId, daysToEnd: 60, now });
    const obs = createContractObservations({ model: BeneficiaryContract });
    const { daysToExpiry } = await obs.beneficiaryContracts(bId, { now });
    expect(daysToExpiry).toBe(15);
  });

  it('returns negative days when the contract is already past its end date', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId, daysToEnd: -10, now });
    const obs = createContractObservations({ model: BeneficiaryContract });
    const { daysToExpiry } = await obs.beneficiaryContracts(bId, { now });
    expect(daysToExpiry).toBe(-10);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId: a, daysToEnd: 10, now });
    await seedContract({ bId: b, daysToEnd: 90, now });
    const obs = createContractObservations({ model: BeneficiaryContract });
    expect((await obs.beneficiaryContracts(a, { now })).daysToExpiry).toBe(10);
    expect((await obs.beneficiaryContracts(b, { now })).daysToExpiry).toBe(90);
  });
});

// ─── End-to-end via engine ─────────────────────────────────────

describe('operational.contract.expiring.30d fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register('contractService', createContractObservations({ model: BeneficiaryContract }));
    return createEngine({ locator });
  }

  it('raises when the most urgent active contract expires in ≤ 30 days', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId, daysToEnd: 20, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.contract.expiring.30d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(20);
  });

  it('raises when the contract is already expired (negative days still ≤ 30)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId, daysToEnd: -5, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.contract.expiring.30d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(-5);
  });

  it('does NOT raise when all active contracts expire > 30 days out', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedContract({ bId, daysToEnd: 60, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.contract.expiring.30d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear when no active contracts exist', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['operational.contract.expiring.30d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
