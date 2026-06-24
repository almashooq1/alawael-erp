'use strict';

/**
 * potty-request-milestone-core-linkage-wave1076.test.js — W1076.
 *
 * Links the positive toilet-training milestone (child independently
 * requests the potty) into the unified core (per-beneficiary CareTimeline).
 * A toileting event of type 'requested_potty' emits
 * toileting-event.toileting_event.potty_requested → CareTimeline
 * 'potty_request_milestone' (clinical; success). Routine wet / bowel /
 * diaper-change / accident rows are deliberately NOT surfaced (high
 * frequency, not milestones).
 *
 * RUNTIME end-to-end test (real in-memory Mongo + real bus + real subscribers).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let ToiletingEvent;
let CareTimeline;
let integrationBus;

function baseEvent(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date(),
    eventTime: new Date(),
    type: 'requested_potty',
    successful: true,
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1076-toileting-event' } });
  await mongoose.connect(mongod.getUri());

  ToiletingEvent = require('../models/ToiletingEvent');
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
  await Promise.all([ToiletingEvent.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1076 — potty-request milestones reach the unified-core timeline', () => {
  it('a requested_potty event lands a potty_request_milestone row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await ToiletingEvent.create(baseEvent({ beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'potty_request_milestone' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.eventId)).toBe(String(e._id));
    expect(tl.metadata.type).toBe('requested_potty');
  });

  it('a routine wet event does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ToiletingEvent.create(baseEvent({ beneficiaryId, type: 'wet' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'potty_request_milestone',
      },
      0
    );
  });

  it('a diaper_change event does NOT create a timeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await ToiletingEvent.create(baseEvent({ beneficiaryId, type: 'diaper_change' }));

    await waitForCount(
      {
        beneficiaryId,
        eventType: 'potty_request_milestone',
      },
      0
    );
  });

  it('re-saving a requested_potty event does not re-fire the event', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const e = await ToiletingEvent.create(baseEvent({ beneficiaryId }));

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'potty_request_milestone' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await ToiletingEvent.findById(e._id);
    again.notes = 'staff confirmed';
    await again.save();
    await waitForCount(
      {
        beneficiaryId,
        eventType: 'potty_request_milestone',
      },
      1
    );
  });
});
