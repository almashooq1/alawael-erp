'use strict';

/**
 * nps-response-recorded-core-linkage-wave1085.test.js — W1085.
 *
 * Links the quality milestone (a family submitted an NPS satisfaction
 * response for a beneficiary) into the unified core. A new beneficiary-tied
 * NpsResponse emits nps-response.nps_response.recorded → CareTimeline
 * 'nps_response_recorded' (quality; promoter→success, passive→info,
 * detractor→warning). Branch-only responses and edits don't fire.
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let NpsResponse;
let CareTimeline;
let integrationBus;

function nps(score, bucket, overrides = {}) {
  return {
    surveyKey: `2026-Q2-${new mongoose.Types.ObjectId()}`,
    guardianId: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    score,
    bucket,
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1085-nps-response' } });
  await mongoose.connect(mongod.getUri());

  NpsResponse = require('../models/NpsResponse');
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
  await Promise.all([NpsResponse.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1085 — family NPS responses reach the unified-core timeline', () => {
  it('a promoter response lands a quality row (success)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const r = await NpsResponse.create(nps(10, 'promoter', { beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'nps_response_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('quality');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.responseId)).toBe(String(r._id));
    expect(tl.metadata.score).toBe(10);
    expect(tl.metadata.bucket).toBe('promoter');
  });

  it('a detractor response is flagged with warning severity', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await NpsResponse.create(nps(3, 'detractor', { beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'nps_response_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('warning');
    expect(tl.metadata.bucket).toBe('detractor');
  });

  it('a branch-only response (no beneficiary) does not fire', async () => {
    const branchId = new mongoose.Types.ObjectId();
    const payload = nps(8, 'passive', { branchId });
    delete payload.beneficiaryId;
    await NpsResponse.create(payload);

    await waitForCount({ eventType: 'nps_response_recorded' }, 0);
  });

  it('editing an existing response does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const r = await NpsResponse.create(nps(9, 'promoter', { beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'nps_response_recorded' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await NpsResponse.findById(r._id);
    again.comment = 'great staff';
    await again.save();
    await waitForCount({ beneficiaryId, eventType: 'nps_response_recorded' }, 1);
  });
});
