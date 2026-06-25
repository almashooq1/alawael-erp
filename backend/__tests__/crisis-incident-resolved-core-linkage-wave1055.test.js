'use strict';

/**
 * crisis-incident-resolved-core-linkage-wave1055.test.js — W1055.
 *
 * Links crisis-incident RESOLUTION into the unified core (per-beneficiary
 * CareTimeline). When a CrisisIncident reaches status 'resolved'/'closed' the
 * model emits crisis-incident.crisis_incident.resolved → CareTimeline
 * 'crisis_incident_resolved' (clinical, warning when critical/urgent).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let CrisisIncident;
let CareTimeline;
let integrationBus;

function baseIncident(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    crisisType: 'behavioral',
    severity: 'concerning',
    occurredAt: new Date(),
    reportedBy: new mongoose.Types.ObjectId(),
    status: 'active',
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1055-crisis-incident-core' } });
  await mongoose.connect(mongod.getUri());

  CrisisIncident = require('../models/CrisisIncident');
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
  await Promise.all([CrisisIncident.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1055 — crisis incident resolution reaches the unified-core timeline', () => {
  it('resolving an incident lands a crisis_incident_resolved row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const inc = await CrisisIncident.create(baseIncident({ beneficiaryId }));

    inc.status = 'resolved';
    await inc.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId,
        eventType: 'crisis_incident_resolved',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.incidentId)).toBe(String(inc._id));
  });

  it('a critical resolved incident is recorded with warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const inc = await CrisisIncident.create(baseIncident({ beneficiaryId, severity: 'critical' }));
    inc.status = 'resolved';
    await inc.save();

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'crisis_incident_resolved' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('an active (unresolved) incident produces NO timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await CrisisIncident.create(baseIncident({ beneficiaryId, status: 'active' }));

    await waitForCount({ eventType: 'crisis_incident_resolved' }, 0);
  });
});
