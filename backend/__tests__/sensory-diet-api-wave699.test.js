/**
 * sensory-diet-api-wave699.test.js — W699 route-level suite. Covers create
 * (with required activity) → snoezelen-session log → transition.
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
    dbName: 'sensory-api-test',
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
const BASE = '/api/v1/sensory-diet';
const oid = () => new mongoose.Types.ObjectId().toString();
const activity = () => ({
  name: 'Wall push-ups',
  sensorySystem: 'proprioceptive',
  purpose: 'calming',
  frequency: 'every 2h',
});

describe('W699 sensory-diet API', () => {
  it('route mounted (not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('200 review-due list', async () => {
    const res = await request(app).get(`${BASE}/review-due`).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  let id;
  it('201 create an active program with an activity', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), activities: [activity()] });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
    id = res.body.data._id;
  });
  it('400 snoezelen-session with an invalid outcome', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/snoezelen-session`)
      .set(auth())
      .send({ regulationOutcome: 'transcended' });
    expect(res.status).toBe(400);
  });
  it('201 log a snoezelen session', async () => {
    const res = await request(app).post(`${BASE}/${id}/snoezelen-session`).set(auth()).send({
      room: 'Room A',
      regulationOutcome: 'regulated',
      responseNotes: 'calmed within 5 min',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.snoezelenSessions.length).toBe(1);
  });
  it('200 transition active → discontinued (with reason)', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/transition`)
      .set(auth())
      .send({ toStatus: 'discontinued', discontinueReason: 'goals met' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('discontinued');
  });
});
