'use strict';

/**
 * complaint-core-linkage-wave984.test.js — W984 (renumbered at push if taken).
 *
 * Wires a complaint/grievance ABOUT a beneficiary onto the unified-core timeline
 * at filing. Only beneficiary-linked complaints fire (org/staff complaints have
 * no beneficiary timeline). Producer: native Complaint post-save hook
 * (create-only). RUNTIME end-to-end against a real in-memory Mongo + the real
 * integration bus + real subscribers.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Complaint, CareTimeline;

async function waitForTimeline(query, { timeout = 4000, interval = 25 } = {}) {
  const start = Date.now();

  while (true) {
    const row = await CareTimeline.findOne(query);
    if (row) return row;
    if (Date.now() - start > timeout) return null;
    await new Promise(r => setTimeout(r, interval));
  }
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w983-complaint' } });
  await mongoose.connect(mongod.getUri());
  Complaint = require('../models/Complaint');
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
  await Promise.all([Complaint.deleteMany({}), CareTimeline.deleteMany({})]);
});

function newComplaint(extra = {}) {
  return Complaint.create({
    type: 'complaint',
    source: 'parent',
    category: 'service',
    subject: 'تأخر في الرد',
    description: 'تفاصيل الشكوى',
    submittedBy: new mongoose.Types.ObjectId(),
    ...extra,
  });
}

describe('W984 — beneficiary complaints reach the unified-core timeline', () => {
  it('a complaint linked to a beneficiary lands a complaint_filed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await newComplaint({ beneficiaryId });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'complaint_filed' });
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('communication');
    expect(tl.severity).toBe('info');
  });

  it('a grievance lands a WARNING complaint_filed row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await newComplaint({ beneficiaryId, type: 'grievance' });
    const tl = await waitForTimeline({ beneficiaryId, eventType: 'complaint_filed' });
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
  });

  it('a complaint with NO beneficiary produces no timeline row', async () => {
    await newComplaint(); // no beneficiaryId
    await new Promise(r => setTimeout(r, 200));
    expect(await CareTimeline.countDocuments({ eventType: 'complaint_filed' })).toBe(0);
  });
});
