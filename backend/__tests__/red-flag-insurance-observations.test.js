/**
 * red-flag-insurance-observations.test.js — Beneficiary-360 Commit 18.
 *
 * Integration: real InsurancePolicy model against mongodb-memory-
 * server. Pins min-across-active-policies semantics, null-on-no-
 * policy, unlimited plan handling, and the end-to-end flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createInsuranceObservations,
} = require('../services/redFlagObservations/insuranceObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let InsurancePolicy;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'insurance-obs-test' });
  InsurancePolicy = require('../models/InsurancePolicy');
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
  await InsurancePolicy.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

let policyCounter = 1;
async function seedPolicy({ bId, status = 'active', coverageLimit = 10000, usedCoverage = 0 }) {
  const seq = policyCounter++;
  await InsurancePolicy.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    policyNumber: `POL-${seq}`,
    policyUuid: `puuid-${seq}`,
    uuid: `uuid-${seq}`,
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    insuranceCompanyId: new mongoose.Types.ObjectId(),
    memberId: `MBR-${seq}`,
    startDate: new Date('2026-01-01T00:00:00.000Z'),
    endDate: new Date('2027-01-01T00:00:00.000Z'),
    status,
    coverageLimit,
    usedCoverage,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

// ─── coverageUsageForBeneficiary ────────────────────────────────

describe('coverageUsageForBeneficiary', () => {
  it('returns null when the beneficiary has no policies', async () => {
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(
      new mongoose.Types.ObjectId()
    );
    expect(remainingCoveragePct).toBeNull();
  });

  it('returns 100 for a brand-new active policy with no usage', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 0 });
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(bId);
    expect(remainingCoveragePct).toBe(100);
  });

  it('returns 0 when coverage is fully used', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 10000 });
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(bId);
    expect(remainingCoveragePct).toBe(0);
  });

  it('clamps negative remaining (over-used) to 0%', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 12000 });
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(bId);
    expect(remainingCoveragePct).toBe(0);
  });

  it('returns 100 for an unlimited plan (coverageLimit: null)', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedPolicy({ bId, coverageLimit: null, usedCoverage: 50000 });
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(bId);
    expect(remainingCoveragePct).toBe(100);
  });

  it('skips expired / cancelled policies entirely', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedPolicy({ bId, status: 'expired', coverageLimit: 10000, usedCoverage: 9500 });
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(bId);
    expect(remainingCoveragePct).toBeNull();
  });

  it('returns the MIN across multiple active policies (most urgent first)', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 1000 }); // 90%
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 9600 }); // 4%
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(bId);
    expect(remainingCoveragePct).toBe(4);
  });

  it('skips zero-limit corrupt rows', async () => {
    const bId = new mongoose.Types.ObjectId();
    await seedPolicy({ bId, coverageLimit: 0, usedCoverage: 0 });
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 2000 });
    const obs = createInsuranceObservations({ model: InsurancePolicy });
    const { remainingCoveragePct } = await obs.coverageUsageForBeneficiary(bId);
    expect(remainingCoveragePct).toBe(80);
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('financial.insurance.coverage.exhausted fires end-to-end', () => {
  it('raises when remainingCoveragePct ≤ 5', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 9800 }); // 2%
    const locator = createLocator();
    locator.register('insuranceService', createInsuranceObservations({ model: InsurancePolicy }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['financial.insurance.coverage.exhausted'],
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBeLessThanOrEqual(5);
  });

  it('does NOT raise at 6% remaining', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    await seedPolicy({ bId, coverageLimit: 10000, usedCoverage: 9400 }); // 6%
    const locator = createLocator();
    locator.register('insuranceService', createInsuranceObservations({ model: InsurancePolicy }));
    const engine = createEngine({ locator });
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['financial.insurance.coverage.exhausted'],
    });
    expect(result.raisedCount).toBe(0);
  });
});
