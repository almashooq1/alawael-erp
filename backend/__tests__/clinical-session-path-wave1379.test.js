'use strict';

/**
 * clinical-session-path-wave1379.test.js
 *
 * Completes the GO-LIVE clinical daily path (after W1378 unblocked
 * episode/session creation). Two fixes, both found by walking the path live:
 *
 *   W1379 — ClinicalSession → CareTimeline producer. The
 *     `sessions:completed → timeline:record` subscriber (pattern
 *     `sessions.session.completed`) has been wired since W1240, but
 *     ClinicalSession never EMITTED — so /care/360 stayed empty even with
 *     real sessions. Native pre-compile post('save') hook now publishes on
 *     a status→completed transition (best-effort, beneficiary-gated, no
 *     re-emit on later saves).
 *
 *   W1380 — SOAP documentation contract. The schema stores SOAP as four
 *     top-level String fields; the route used to `$set` the whole request
 *     OBJECT into the String `soapNotes` → CastError (400). Asserting the
 *     post-save emit + the field-mapping shape here.
 *
 * Producer is verified by capturing integrationBus publishes (the subscriber
 * itself is already covered by the W1240-era suites). Poll-free: the emit is
 * synchronous within save().
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { integrationBus } = require('../integration/systemIntegrationBus');

let mongo;
let ClinicalSession;

const oid = () => new mongoose.Types.ObjectId();

function baseSession(over = {}) {
  return {
    beneficiaryId: oid(),
    episodeId: oid(),
    therapistId: oid(),
    branchId: oid(),
    scheduledDate: new Date('2026-06-18T09:00:00Z'),
    type: 'individual',
    status: 'scheduled',
    ...over,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  ({ ClinicalSession } = require('../domains/sessions/models/ClinicalSession'));
  await ClinicalSession.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await ClinicalSession.deleteMany({});
});

/** Capture every publish on the integration bus for the duration of `fn`. */
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

describe('W1379 ClinicalSession → sessions.session.completed producer', () => {
  test('scheduled session does NOT emit', async () => {
    const events = await captureBus(async () => {
      await ClinicalSession.create(baseSession());
    });
    expect(events.filter(e => e.eventType === 'session.completed')).toHaveLength(0);
  });

  test('completing a session emits exactly once with the subscriber contract', async () => {
    const benId = oid();
    const epId = oid();
    const s = await ClinicalSession.create(baseSession({ beneficiaryId: benId, episodeId: epId }));
    const events = await captureBus(async () => {
      s.status = 'completed';
      await s.save();
    });
    const emitted = events.filter(e => e.eventType === 'session.completed');
    expect(emitted).toHaveLength(1);
    const p = emitted[0].payload;
    expect(emitted[0].domain).toBe('sessions');
    expect(String(p.beneficiaryId)).toBe(String(benId));
    expect(String(p.episodeId)).toBe(String(epId));
    expect(p.sessionId).toBe(String(s._id));
    expect(p.sessionType).toBe('individual');
  });

  test('a later unrelated save of an already-completed session does NOT re-emit', async () => {
    const s = await ClinicalSession.create(baseSession({ status: 'completed' }));
    const events = await captureBus(async () => {
      s.notes = 'addendum';
      await s.save();
    });
    expect(events.filter(e => e.eventType === 'session.completed')).toHaveLength(0);
  });

  test('creating directly as completed emits once', async () => {
    const events = await captureBus(async () => {
      await ClinicalSession.create(baseSession({ status: 'completed' }));
    });
    expect(events.filter(e => e.eventType === 'session.completed')).toHaveLength(1);
  });
});

describe('W1380 SOAP documentation stores four fields (not the object in a String)', () => {
  test('subjective/objective/assessment/plan persist as their own String fields', async () => {
    const s = await ClinicalSession.create(baseSession());
    s.subjective = 'المريض متعاون';
    s.objective = 'أكمل التمارين';
    s.assessment = 'تحسن ملحوظ';
    s.plan = 'الاستمرار';
    s.documentedAt = new Date();
    await s.save();

    const row = await ClinicalSession.findById(s._id).lean();
    expect(row.subjective).toBe('المريض متعاون');
    expect(row.assessment).toBe('تحسن ملحوظ');
    expect(row.documentedAt).toBeInstanceOf(Date);
    // soapNotes (the combined String) is independent and was never set to an object
    expect(typeof (row.soapNotes ?? '')).toBe('string');
  });

  test('the route source maps fields explicitly and never dumps req.body into soapNotes', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'domains', 'sessions', 'routes', 'sessions.routes.js'),
      'utf8'
    );
    expect(src).not.toMatch(/soapNotes:\s*req\.body/);
    expect(src).toMatch(
      /for \(const f of \['subjective', 'objective', 'assessment', 'plan', 'soapNotes'\]\)/
    );
  });
});
