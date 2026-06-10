'use strict';

/**
 * risk-snapshot-escalated-core-linkage-wave1088.test.js — W1088.
 *
 * Links the clinical-risk milestone (a beneficiary's risk tier escalated)
 * into the unified core. A new RiskSnapshot with tierDelta 'escalated' (or a
 * 'first' reading at high/critical) emits risk-snapshot.risk_snapshot.escalated
 * → CareTimeline 'risk_snapshot_escalated' (clinical; critical→critical,
 * high→error, else warning). deescalated/unchanged/first-low snapshots and
 * edits don't fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let RiskSnapshot;
let CareTimeline;
let integrationBus;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

function snapshot(beneficiaryId, overrides = {}) {
  return {
    beneficiaryId,
    branchId: new mongoose.Types.ObjectId(),
    sweepRunId: `sweep-${new mongoose.Types.ObjectId()}`,
    overallScore: 70,
    overallTier: 'high',
    previousTier: 'moderate',
    tierDelta: 'escalated',
    reason: 'composite risk crossed threshold',
    computedAt: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1088-risk-snapshot' } });
  await mongoose.connect(mongod.getUri());

  RiskSnapshot = require('../models/RiskSnapshot');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([RiskSnapshot.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1088 — risk escalations reach the unified-core timeline', () => {
  it('an escalation to high lands a clinical row (error)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const s = await RiskSnapshot.create(snapshot(beneficiaryId));

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'risk_snapshot_escalated' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('error');
    expect(String(tl.metadata.snapshotId)).toBe(String(s._id));
    expect(tl.metadata.overallTier).toBe('high');
    expect(tl.title).toContain('moderate → high');
  });

  it('an escalation to critical is recorded with critical severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await RiskSnapshot.create(
      snapshot(beneficiaryId, { overallTier: 'critical', previousTier: 'high', overallScore: 92 })
    );

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'risk_snapshot_escalated' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('critical');
  });

  it('a first high reading fires; a first low reading does not', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    await RiskSnapshot.create(
      snapshot(a, { tierDelta: 'first', previousTier: null, overallTier: 'high' })
    );
    await RiskSnapshot.create(
      snapshot(b, {
        tierDelta: 'first',
        previousTier: null,
        overallTier: 'low',
        overallScore: 10,
      })
    );

    const tlA = await waitForTimeline({ beneficiaryId: a, eventType: 'risk_snapshot_escalated' });
    expect(tlA).toBeTruthy();
    expect(tlA.severity).toBe('error');

    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId: b, eventType: 'risk_snapshot_escalated' })
    ).toBe(0);
  });

  it('a deescalation / unchanged snapshot does not fire', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await RiskSnapshot.create(
      snapshot(beneficiaryId, {
        tierDelta: 'deescalated',
        overallTier: 'moderate',
        previousTier: 'high',
      })
    );

    await new Promise(r => setTimeout(r, 250));
    expect(
      await CareTimeline.countDocuments({ beneficiaryId, eventType: 'risk_snapshot_escalated' })
    ).toBe(0);
  });
});
