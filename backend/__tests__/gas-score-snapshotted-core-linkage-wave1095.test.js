'use strict';

/**
 * W1095 — GasScoreSnapshot → unified core timeline linkage.
 *
 * Recording a GAS composite T-score snapshot publishes
 * `gas-snapshot.gas_snapshot.recorded`, which the DDD cross-module
 * subscriber materialises into a per-beneficiary CareTimeline row
 * (category: clinical). Severity reflects the T-score band
 * (>=50 success, <40 warning, else info).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const GasScoreSnapshot = require('../models/GasScoreSnapshot');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1095-gas-snapshot' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await GasScoreSnapshot.deleteMany({});
  await CareTimeline.deleteMany({});
});

function snapshot(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    snapshotDate: new Date('2026-05-08T00:00:00.000Z'),
    snapshotType: 'weekly',
    tScore: 52.5,
    goalCount: 4,
    totalWeight: 6,
    ...overrides,
  };
}

describe('W1095 — GasScoreSnapshot → CareTimeline linkage', () => {
  it('records a clinical timeline row with success severity for T>=50', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const doc = await GasScoreSnapshot.create(snapshot({ beneficiaryId, branchId, tScore: 55 }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('gas_score_snapshotted');
    expect(row.category).toBe('clinical');
    expect(row.severity).toBe('success');
    expect(String(row.branchId)).toBe(String(branchId));
    expect(String(row.metadata.snapshotId)).toBe(String(doc._id));
    expect(row.metadata.snapshotType).toBe('weekly');
    expect(row.title).toContain('55');
  });

  it('uses warning severity for a low T-score (<40)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GasScoreSnapshot.create(snapshot({ beneficiaryId, tScore: 35 }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.severity).toBe('warning');
  });

  it('captures goalCount in metadata', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await GasScoreSnapshot.create(snapshot({ beneficiaryId, goalCount: 7 }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.metadata.goalCount).toBe(7);
  });

  it('does not duplicate the timeline row when the snapshot is updated', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await GasScoreSnapshot.create(snapshot({ beneficiaryId }));

    await waitForRows({ beneficiaryId }, 1);

    doc.notes = 'مراجعة الفريق العلاجي';
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});
