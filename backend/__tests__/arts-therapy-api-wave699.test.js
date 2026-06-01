/**
 * arts-therapy-api-wave699.test.js — W699 route-level suite. Covers create
 * → complete (engagement + mood) + cancel-needs-reason.
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
    dbName: 'arts-api-test',
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
    { expiresIn: '1h' }
  );
}
const auth = (role = 'admin') => ({ Authorization: `Bearer ${token(role)}` });
const BASE = '/api/v1/arts-therapy';
const oid = () => new mongoose.Types.ObjectId().toString();

describe('W699 arts-therapy API', () => {
  it('route mounted (not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('400 unknown modality', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), modality: 'pottery' });
    expect(res.status).toBe(400);
  });

  let id;
  it('201 create a scheduled music session', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), modality: 'music', sessionDate: new Date().toISOString() });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
    id = res.body.data._id;
  });
  it('200 complete with engagement + mood shift', async () => {
    const res = await request(app).post(`${BASE}/${id}/complete`).set(auth()).send({
      engagementLevel: 'high',
      responseNotes: 'engaged with rhythm',
      moodBefore: 'sad',
      moodAfter: 'happy',
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });
  it('400 cancel a fresh session without a reason', async () => {
    const created = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), modality: 'art', sessionDate: new Date().toISOString() });
    const res = await request(app)
      .post(`${BASE}/${created.body.data._id}/cancel`)
      .set(auth())
      .send({});
    expect(res.status).toBe(400);
  });
});
