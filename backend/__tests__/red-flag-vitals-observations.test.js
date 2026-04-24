/**
 * red-flag-vitals-observations.test.js — Beneficiary-360 Commit 24.
 *
 * Integration: real VitalSign model against mongodb-memory-server.
 * Pins baseline/current selection rules for weight-change detection
 * and the end-to-end clinical.pediatric.weight.drop_5pct flag.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createVitalsObservations } = require('../services/redFlagObservations/vitalsObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let VitalSign;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'vitals-obs-test' });
  VitalSign = require('../models/VitalSign').VitalSign;
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
  await VitalSign.deleteMany({});
});

// ─── Fixture ────────────────────────────────────────────────────

async function seedWeight({ bId, daysAgo, kg, now = new Date() }) {
  return VitalSign.create({
    beneficiaryId: bId instanceof mongoose.Types.ObjectId ? bId : new mongoose.Types.ObjectId(bId),
    measurementType: 'weight',
    value: kg,
    unit: 'kg',
    recordedAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
  });
}

// ─── Unit: beneficiaryTrend ─────────────────────────────────────

describe('beneficiaryTrend — weight.deltaPct90d', () => {
  it('returns null when no weight measurements exist', async () => {
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(new mongoose.Types.ObjectId());
    expect(weight.deltaPct90d).toBeNull();
  });

  it('returns null when only one measurement on file', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 5, kg: 25, now });
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(bId, { now });
    expect(weight.deltaPct90d).toBeNull();
  });

  it('prefers pre-window baseline when available', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 100, kg: 30, now }); // pre-window baseline
    await seedWeight({ bId, daysAgo: 60, kg: 29, now }); // in-window earlier
    await seedWeight({ bId, daysAgo: 3, kg: 27, now }); // current (recent)
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(bId, { now });
    // Delta vs 30kg baseline: ((27-30)/30)*100 = -10
    expect(weight.deltaPct90d).toBe(-10);
  });

  it('falls back to earliest in-window baseline when no pre-window exists', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 80, kg: 20, now }); // earliest in-window
    await seedWeight({ bId, daysAgo: 5, kg: 19, now }); // current
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(bId, { now });
    expect(weight.deltaPct90d).toBe(-5); // ((19-20)/20)*100 = -5
  });

  it('current reading must be within last 14 days', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 100, kg: 30, now }); // baseline
    await seedWeight({ bId, daysAgo: 30, kg: 20, now }); // stale current
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(bId, { now });
    expect(weight.deltaPct90d).toBeNull(); // no recent enough reading
  });

  it('zero baseline is rejected (no divide-by-zero)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 100, kg: 0, now });
    await seedWeight({ bId, daysAgo: 3, kg: 25, now });
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(bId, { now });
    expect(weight.deltaPct90d).toBeNull();
  });

  it('positive delta (weight gain) is reported as a positive number', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 95, kg: 20, now });
    await seedWeight({ bId, daysAgo: 2, kg: 22, now });
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(bId, { now });
    expect(weight.deltaPct90d).toBe(10);
  });

  it('rounds to 2 decimal places', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 95, kg: 30, now });
    await seedWeight({ bId, daysAgo: 2, kg: 28.33, now });
    const obs = createVitalsObservations({ model: VitalSign });
    const { weight } = await obs.beneficiaryTrend(bId, { now });
    // ((28.33-30)/30)*100 = -5.566… → -5.57
    expect(weight.deltaPct90d).toBe(-5.57);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId: a, daysAgo: 95, kg: 25, now });
    await seedWeight({ bId: a, daysAgo: 2, kg: 22, now });
    await seedWeight({ bId: b, daysAgo: 5, kg: 30, now });
    const obs = createVitalsObservations({ model: VitalSign });
    const aTrend = (await obs.beneficiaryTrend(a, { now })).weight.deltaPct90d;
    const bTrend = (await obs.beneficiaryTrend(b, { now })).weight.deltaPct90d;
    expect(aTrend).toBe(-12);
    expect(bTrend).toBeNull(); // only one measurement
  });
});

// ─── End-to-end via engine ──────────────────────────────────────

describe('clinical.pediatric.weight.drop_5pct fires end-to-end', () => {
  function wire() {
    const locator = createLocator();
    locator.register('vitalsService', createVitalsObservations({ model: VitalSign }));
    return createEngine({ locator });
  }

  it('raises when weight dropped 8% vs pre-window baseline', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 100, kg: 25, now });
    await seedWeight({ bId, daysAgo: 3, kg: 23, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.pediatric.weight.drop_5pct'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    expect(result.verdicts[0].observedValue).toBe(-8);
  });

  it('does NOT raise at -4% (above threshold)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 100, kg: 25, now });
    await seedWeight({ bId, daysAgo: 3, kg: 24, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.pediatric.weight.drop_5pct'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });

  it('stays clear when only one measurement on file', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await seedWeight({ bId, daysAgo: 3, kg: 20, now });
    const engine = wire();
    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['clinical.pediatric.weight.drop_5pct'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
