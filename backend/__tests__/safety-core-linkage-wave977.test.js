'use strict';

/**
 * safety-core-linkage-wave977.test.js — W977.
 *
 * Wires the three clinical SAFETY surfaces into the unified-core timeline:
 *   - SeizureEvent        → safety.seizure.recorded     (status epilepticus ≥300s = CRITICAL)
 *   - SafeguardingConcern → safety.safeguarding.raised  (only when about a beneficiary)
 *   - RestraintSeclusionEvent → safety.restraint.applied
 *
 * Producers are native pre-compile post-save hooks in the models; consumers are
 * HIGH/CRITICAL-importance CareTimeline subscribers. RUNTIME end-to-end against a
 * real in-memory Mongo + the real integration bus + real subscribers — the W349
 * lesson: assert the row actually persists.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SeizureEvent, SafeguardingConcern, RestraintSeclusionEvent, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w976-safety' } });
  await mongoose.connect(mongod.getUri());

  SeizureEvent = require('../models/SeizureEvent');
  SafeguardingConcern = require('../models/SafeguardingConcern');
  RestraintSeclusionEvent = require('../models/RestraintSeclusionEvent');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  const { integrationBus } = require('../integration/systemIntegrationBus');
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([
    SeizureEvent.deleteMany({}),
    SafeguardingConcern.deleteMany({}),
    RestraintSeclusionEvent.deleteMany({}),
    CareTimeline.deleteMany({}),
  ]);
});

const reporter = () => new mongoose.Types.ObjectId();

describe('W977 — safety events reach the unified-core timeline', () => {
  it('status-epilepticus seizure lands a CRITICAL seizure_event row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SeizureEvent.create({
      beneficiaryId,
      date: new Date(),
      startTime: new Date(),
      type: 'tonic_clonic',
      severity: 'severe',
      durationSeconds: 420, // ≥300 → status epilepticus
      recordedBy: reporter(),
    });

    const tl = await waitForTimeline({ beneficiaryId, eventType: 'seizure_event' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('critical');
    expect(tl.metadata.statusEpilepticus).toBe(true);
    expect(tl.category).toBe('clinical');
  });

  it('a short seizure lands a (non-critical) seizure_event row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SeizureEvent.create({
      beneficiaryId,
      date: new Date(),
      startTime: new Date(),
      type: 'absence',
      severity: 'mild',
      durationSeconds: 20,
      recordedBy: reporter(),
    });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'seizure_event' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('safeguarding concern about a BENEFICIARY lands a safeguarding_concern row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SafeguardingConcern.create({
      subjectKind: 'beneficiary',
      subjectBeneficiaryId: beneficiaryId,
      category: 'neglect',
      severity: 'high',
      description: 'تفاصيل البلاغ',
      reportedBy: reporter(),
    });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'safeguarding_concern' });
    expect(tl).toBeTruthy();
    expect(tl.metadata.category).toBe('neglect');
  });

  it('safeguarding concern about STAFF produces no timeline row', async () => {
    await SafeguardingConcern.create({
      subjectKind: 'staff',
      subjectId: new mongoose.Types.ObjectId(),
      category: 'other',
      severity: 'low',
      description: 'concern about a staff member',
      reportedBy: reporter(),
    });
    await new Promise(r => setTimeout(r, 200));
    const count = await CareTimeline.countDocuments({ eventType: 'safeguarding_concern' });
    expect(count).toBe(0);
  });

  it('restraint/seclusion episode lands a restraint_applied row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await RestraintSeclusionEvent.create({
      beneficiaryId,
      date: new Date(),
      startTime: new Date(),
      type: 'physical',
      techniqueUsed: 'two-person hold',
      triggerBehavior: 'aggression toward staff',
      authorizedBy: reporter(),
    });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'restraint_applied' });
    expect(tl).toBeTruthy();
    expect(tl.metadata.restraintType).toBe('physical');
  });
});
