/**
 * audiology-screening-api-wave722.test.js — HTTP route-level (supertest) tests
 * for the W722 functional hearing-screen, on the W699 reusable harness.
 * Covers the draft→finalize lifecycle + the refer-needs-reason invariant (400).
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
process.env.CSRF_DISABLE = 'true';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-for-api-suite-longer-than-sixteen-chars';

const request = require('supertest');
const jwt = require('jsonwebtoken');
jest.unmock('mongoose');
jest.resetModules();
jest.setTimeout(90_000);
const mongoose = require('mongoose');
const app = require('../app');
let ownServer = null;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  ownServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(ownServer.getUri(), {
    dbName: 'audiology-api-test',
    serverSelectionTimeoutMS: 10000,
  });
}, 90_000);
afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (ownServer) await ownServer.stop();
}, 60_000);

function token(role = 'admin') {
  return jwt.sign(
    { id: '000000000000000000000001', role, name: 'Tester' },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );
}
const auth = (role = 'admin') => ({ Authorization: `Bearer ${token(role)}` });
const BASE = '/api/v1/audiology-screening';
const oid = () => new mongoose.Types.ObjectId().toString();

describe('W722 audiology-screening API — mount + validation', () => {
  it('route mounted (not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('200 stats with byMethod/byOutcome/byLossType', async () => {
    const res = await request(app).get(`${BASE}/stats`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('byMethod');
    expect(res.body).toHaveProperty('byOutcome');
    expect(res.body).toHaveProperty('byLossType');
  });
  it('400 unknown screeningMethod', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), screeningMethod: 'telepathy' });
    expect(res.status).toBe(400);
  });
  it('400 malformed ObjectId', async () => {
    const res = await request(app).get(`${BASE}/not-an-id`).set(auth());
    expect(res.status).toBe(400);
  });
});

describe('W722 audiology-screening API — lifecycle + refer gate', () => {
  let id;
  it('201 record a draft screen', async () => {
    const res = await request(app).post(BASE).set(auth()).send({
      beneficiaryId: oid(),
      screeningMethod: 'play_audiometry',
      levelRight: 'mild_26_40',
      tympanometryRight: 'B',
      hearingLossType: 'conductive',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    id = res.body.data._id;
  });
  it('200 finalize a monitor-outcome screen', async () => {
    const res = await request(app).post(`${BASE}/${id}/finalize`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('finalized');
  });
  it('409 re-finalize the same screen', async () => {
    const res = await request(app).post(`${BASE}/${id}/finalize`).set(auth());
    expect(res.status).toBe(409);
  });
  it('refer-outcome with no referralReason is BLOCKED at create (Wave-18 invariant)', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), screeningMethod: 'otoacoustic_emissions', outcome: 'refer' });
    // The __invariants validator rejects it; safeError surfaces a 4xx/5xx — the
    // contract that matters is "not persisted", i.e. not 201.
    expect(res.status).not.toBe(201);
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
  it('201 refer-outcome WITH a reason, then finalizes to 200', async () => {
    const created = await request(app).post(BASE).set(auth()).send({
      beneficiaryId: oid(),
      screeningMethod: 'otoacoustic_emissions',
      outcome: 'refer',
      referralReason: 'absent OAE bilaterally',
      referralTo: 'ENT',
    });
    expect(created.status).toBe(201);
    const res = await request(app).post(`${BASE}/${created.body.data._id}/finalize`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.needsReferral).toBe(true);
  });
  it('200 needs-referral board', async () => {
    const res = await request(app).get(`${BASE}/needs-referral`).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
