'use strict';

/**
 * W1096 — PdplRequest → unified core timeline linkage.
 *
 * Receiving a PDPL data-subject request (access / correction / deletion /
 * portability / objection) publishes `pdpl-request.pdpl_request.received`,
 * which the DDD cross-module subscriber materialises into a per-beneficiary
 * CareTimeline row (category: administrative, severity: info) — giving the
 * 30-day SLA clock visibility on the beneficiary's longitudinal record.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { PdplRequest } = require('../models/PdplRequest');
const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');

const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({
    instance: { dbName: 'w1096-pdpl-request' },
  });
  await mongoose.connect(mongoServer.getUri());
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  await PdplRequest.deleteMany({});
  await CareTimeline.deleteMany({});
});

function request(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    requestType: 'access',
    ...overrides,
  };
}

describe('W1096 — PdplRequest → CareTimeline linkage', () => {
  it('records an administrative timeline row on a new PDPL request', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await PdplRequest.create(request({ beneficiaryId, requestType: 'deletion' }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.eventType).toBe('pdpl_request_received');
    expect(row.category).toBe('administrative');
    expect(row.severity).toBe('info');
    expect(String(row.metadata.requestId)).toBe(String(doc._id));
    expect(row.metadata.requestType).toBe('deletion');
    expect(row.title).toContain('deletion');
  });

  it('captures the request status in metadata', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await PdplRequest.create(request({ beneficiaryId, requestType: 'correction' }));

    const rowRows = await waitForRows({ beneficiaryId }, 1);
    const row = rowRows[0];
    expect(row).toBeTruthy();
    expect(row.metadata.status).toBe('received');
  });

  it('fires for each distinct request type', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await PdplRequest.create(request({ beneficiaryId, requestType: 'access' }));
    await PdplRequest.create(request({ beneficiaryId, requestType: 'portability' }));

    let count = 0;
    for (let i = 0; i < 40; i += 1) {
      count = await CareTimeline.countDocuments({ beneficiaryId });
      if (count >= 2) break;
      await new Promise(r => setTimeout(r, 50));
    }
    expect(count).toBe(2);
  });

  it('does not duplicate the timeline row when the request is completed', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await PdplRequest.create(request({ beneficiaryId }));

    await waitForRows({ beneficiaryId }, 1);

    doc.status = 'completed';
    doc.respondedAt = new Date();
    await doc.save();
    await waitForCount({ beneficiaryId }, 1);
  });
});
