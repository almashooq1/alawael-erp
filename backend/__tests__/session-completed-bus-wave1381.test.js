'use strict';

/**
 * session-completed-bus-wave1381.test.js
 *
 * W1381 — SessionsService.completeSession must publish
 * `sessions.session.completed` on the INTEGRATION BUS, not only via the
 * local BaseService EventEmitter. The CareTimeline subscriber
 * (`sessions:completed → timeline:record`, wired since W1240) listens on
 * the integrationBus, and the two were never bridged for SessionsService —
 * so completing a session left /care/360 empty (verified live on prod:
 * PATCH /:id/status → completed produced 0 timeline rows).
 *
 * Verifies the bus publish fires with the subscriber's payload contract,
 * by capturing integrationBus.publish around a real completeSession call.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { integrationBus } = require('../integration/systemIntegrationBus');

let mongo;
let ClinicalSession;
let sessionsService;

const oid = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  ({ ClinicalSession } = require('../domains/sessions/models/ClinicalSession'));
  await ClinicalSession.init();
  ({ sessionsService } = require('../domains/sessions/services/SessionsService'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await ClinicalSession.deleteMany({});
});

async function captureBus(fn) {
  const events = [];
  const orig = integrationBus.publish.bind(integrationBus);
  integrationBus.publish = (domain, eventType, payload) => {
    events.push({ domain, eventType, payload });
    return orig(domain, eventType, payload);
  };
  try {
    await fn();
  } finally {
    integrationBus.publish = orig;
  }
  return events;
}

describe('W1381 completeSession → integrationBus', () => {
  test('publishes sessions.session.completed with the subscriber contract', async () => {
    const benId = oid();
    const epId = oid();
    const session = await ClinicalSession.create({
      beneficiaryId: benId,
      episodeId: epId,
      therapistId: oid(),
      branchId: oid(),
      scheduledDate: new Date(),
      type: 'individual',
      status: 'scheduled',
    });

    const events = await captureBus(async () => {
      await sessionsService.completeSession(String(session._id), { duration: 45 });
    });

    const emitted = events.filter((e) => e.eventType === 'sessions.session.completed');
    expect(emitted).toHaveLength(1);
    expect(emitted[0].domain).toBe('sessions');
    const p = emitted[0].payload;
    expect(String(p.beneficiaryId)).toBe(String(benId));
    expect(String(p.episodeId)).toBe(String(epId));
    expect(p.sessionId).toBe(String(session._id));
    expect(p.sessionType).toBe('individual');
    expect(p.duration).toBe(45);
  });

  test('the persisted session reaches status completed', async () => {
    const session = await ClinicalSession.create({
      beneficiaryId: oid(),
      episodeId: oid(),
      therapistId: oid(),
      scheduledDate: new Date(),
      type: 'individual',
      status: 'scheduled',
    });
    await sessionsService.completeSession(String(session._id), { duration: 30 });
    const row = await ClinicalSession.findById(session._id).lean();
    expect(row.status).toBe('completed');
  });
});
