/**
 * W974 — Session lifecycle (cancelled + no-show) on the unified CareTimeline.
 *
 * The live SessionService (domains/sessions/index.js) emitted ad-hoc camelCase
 * names (`sessionCancelled` / `sessionNoShow`) that were NEVER bridged, while
 * the bridge listened for the dotted `session.completed` only — so the
 * cancellation + missed-appointment links were absent from the timeline (and
 * the completed wire itself was dead because the producer emitted
 * `sessionCompleted`). W974 canonicalizes the three emits to the dotted
 * contract names, enriches the payloads with beneficiaryId + episodeId, adds
 * them to the bridge, and registers the two new timeline subscribers verified
 * here.
 *
 * Behavioral verification against a real MongoMemoryServer (jest.unmock).
 */
jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let mongod;
let CareTimeline;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'w974-session-lifecycle-timeline' });
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  if (CareTimeline) await CareTimeline.deleteMany({});
});

function getHandler(name, pattern) {
  const busStub = { subscribe: () => {} };
  const subscribers = initializeDDDSubscribers(busStub, console);
  const sub = subscribers.find(s => s.pattern === pattern && s.name === name);
  expect(sub).toBeDefined();
  return sub.handler;
}

describe('W974 session lifecycle timeline subscribers', () => {
  test('CareTimeline model is registered', () => {
    expect(mongoose.models.CareTimeline).toBeDefined();
  });

  test('session_cancelled + session_no_show are valid eventType enum values', () => {
    const enumVals = CareTimeline.schema.path('eventType').enumValues;
    expect(enumVals).toContain('session_cancelled');
    expect(enumVals).toContain('session_no_show');
  });

  test('cancellation persists a timeline entry linked to beneficiary + episode with reason', async () => {
    const handler = getHandler(
      'sessions:cancelled → timeline:record',
      'sessions.session.cancelled'
    );
    const beneficiaryId = new mongoose.Types.ObjectId();
    const episodeId = new mongoose.Types.ObjectId();
    await handler({
      payload: {
        sessionId: new mongoose.Types.ObjectId(),
        beneficiaryId,
        episodeId,
        reason: 'مرض المستفيد',
      },
    });

    const docs = await CareTimeline.find({ beneficiaryId }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].eventType).toBe('session_cancelled');
    expect(docs[0].category).toBe('clinical');
    expect(docs[0].severity).toBe('warning');
    expect(String(docs[0].episodeId)).toBe(String(episodeId));
    expect(docs[0].title_ar).toBe('إلغاء الجلسة (مرض المستفيد)');
  });

  test('cancellation without a reason omits the reason suffix', async () => {
    const handler = getHandler(
      'sessions:cancelled → timeline:record',
      'sessions.session.cancelled'
    );
    const beneficiaryId = new mongoose.Types.ObjectId();
    await handler({ payload: { sessionId: new mongoose.Types.ObjectId(), beneficiaryId } });

    const docs = await CareTimeline.find({ beneficiaryId }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].title_ar).toBe('إلغاء الجلسة');
  });

  test('no-show persists a warning timeline entry linked to beneficiary + episode', async () => {
    const handler = getHandler('sessions:no_show → timeline:record', 'sessions.session.no_show');
    const beneficiaryId = new mongoose.Types.ObjectId();
    const episodeId = new mongoose.Types.ObjectId();
    await handler({
      payload: { sessionId: new mongoose.Types.ObjectId(), beneficiaryId, episodeId },
    });

    const docs = await CareTimeline.find({ beneficiaryId }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].eventType).toBe('session_no_show');
    expect(docs[0].severity).toBe('warning');
    expect(docs[0].title_ar).toBe('تغيّب عن الجلسة');
    expect(String(docs[0].episodeId)).toBe(String(episodeId));
  });

  test('both handlers no-op (no throw, no doc) when beneficiaryId is missing', async () => {
    const cancel = getHandler(
      'sessions:cancelled → timeline:record',
      'sessions.session.cancelled'
    );
    const noShow = getHandler('sessions:no_show → timeline:record', 'sessions.session.no_show');
    await expect(
      cancel({ payload: { sessionId: new mongoose.Types.ObjectId() } })
    ).resolves.not.toThrow();
    await expect(
      noShow({ payload: { sessionId: new mongoose.Types.ObjectId() } })
    ).resolves.not.toThrow();
    expect(await CareTimeline.countDocuments({})).toBe(0);
  });
});
