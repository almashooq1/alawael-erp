'use strict';

/**
 * safeguarding-closure-core-linkage-wave1027.test.js — W1027.
 *
 * Links safeguarding-concern CLOSURE into the unified core (per-beneficiary
 * CareTimeline). SafeguardingConcern (W357) already surfaces the RAISED event
 * (W992 → eventType 'safeguarding_concern'). W1027 adds the terminal milestone:
 *   - SafeguardingConcern.status === 'closed'
 *       → safety.safeguarding.concern_closed
 *       → CareTimeline 'safeguarding_concern_closed' (clinical/success)
 *
 * Only concerns ABOUT a beneficiary (subjectKind='beneficiary') reach a
 * timeline. RUNTIME end-to-end test (real in-memory Mongo + real bus + real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SafeguardingConcern;
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

function baseConcern(overrides = {}) {
  return {
    subjectKind: 'beneficiary',
    subjectBeneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    reportedBy: new mongoose.Types.ObjectId(),
    reportedByName: 'Reporter',
    category: 'neglect',
    severity: 'medium',
    description: 'Concern description for the W1027 closure test.',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({
    instance: { dbName: 'w1027-safeguarding-closure-core' },
  });
  await mongoose.connect(mongod.getUri());

  SafeguardingConcern = require('../models/SafeguardingConcern');
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
  await Promise.all([SafeguardingConcern.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1027 — Safeguarding concern closure reaches the unified-core timeline', () => {
  it('closing a concern lands a safeguarding_concern_closed row (clinical/success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const concern = await SafeguardingConcern.create(
      baseConcern({ subjectBeneficiaryId: beneficiaryId, status: 'investigating' })
    );

    concern.status = 'closed';
    concern.outcome = 'unsubstantiated';
    concern.outcomeSummary = 'Investigated; no further action required.';
    concern.closedByName = 'Safeguarding Lead';
    concern.closedAt = new Date();
    await concern.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'safeguarding_concern_closed',
    });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.concernId)).toBe(String(concern._id));
    expect(tl.metadata.outcome).toBe('unsubstantiated');
    expect(tl.metadata.category).toBe('neglect');
  });

  it('an open (not closed) concern produces NO closure timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SafeguardingConcern.create(
      baseConcern({ subjectBeneficiaryId: beneficiaryId, status: 'triaged' })
    );

    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'safeguarding_concern_closed' })).toBe(0);
  });

  it('re-saving an already-closed concern does not re-fire the closure event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const concern = await SafeguardingConcern.create(
      baseConcern({ subjectBeneficiaryId: beneficiaryId, status: 'investigating' })
    );
    concern.status = 'closed';
    concern.outcome = 'inconclusive';
    concern.outcomeSummary = 'Closed after review.';
    concern.closedByName = 'Safeguarding Lead';
    concern.closedAt = new Date();
    await concern.save();

    const tl = await waitForTimeline({
      beneficiaryId,
      eventType: 'safeguarding_concern_closed',
    });
    expect(tl).toBeTruthy();

    const again = await SafeguardingConcern.findById(concern._id);
    again.notes = 'Supervisory note appended after closure.';
    await again.save();
    await new Promise(r => setTimeout(r, 200));
    expect(
      await CareTimeline.countDocuments({
        beneficiaryId,
        eventType: 'safeguarding_concern_closed',
      })
    ).toBe(1);
  });
});
