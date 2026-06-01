/**
 * spasticity-injection-api-wave715.test.js — HTTP route-level (supertest)
 * tests for the W715 spasticity/botox clinic, on the W699 reusable harness.
 * Covers the consent GATE (complete 409 until consent) + procedure lifecycle.
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
    dbName: 'spasticity-api-test',
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
const BASE = '/api/v1/spasticity-injection';
const oid = () => new mongoose.Types.ObjectId().toString();
const muscle = () => ({
  muscle: 'gastrocnemius',
  side: 'left',
  doseUnits: 100,
  ashworthBefore: '3',
});

describe('W715 spasticity-injection API — mount + validation', () => {
  it('route mounted (not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('200 stats', async () => {
    const res = await request(app).get(`${BASE}/stats`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('byAgent');
  });
  it('400 unknown agent', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), agent: 'magic' });
    expect(res.status).toBe(400);
  });
});

describe('W715 spasticity-injection API — consent GATE + lifecycle', () => {
  let id;
  it('201 plan a botulinum procedure', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), agent: 'botulinum_toxin_a', targetedMuscles: [muscle()] });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('planned');
    id = res.body.data._id;
  });
  it('409 complete WITHOUT consent', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/complete`)
      .set(auth())
      .send({ targetedMuscles: [muscle()] });
    expect(res.status).toBe(409);
  });
  it('200 complete WITH consent + muscle', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/complete`)
      .set(auth())
      .send({
        consentObtained: true,
        targetedMuscles: [muscle()],
        totalDoseUnits: 200,
        followUpDueDate: new Date(Date.now() + 90 * 86400000).toISOString(),
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.muscleCount).toBe(1);
  });
  it('200 follow-up-due list', async () => {
    const res = await request(app).get(`${BASE}/follow-up-due`).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
  it('400 cancel a fresh procedure without a reason', async () => {
    const created = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), agent: 'phenol' });
    const res = await request(app)
      .post(`${BASE}/${created.body.data._id}/cancel`)
      .set(auth())
      .send({});
    expect(res.status).toBe(400);
  });
  it('400 malformed ObjectId', async () => {
    const res = await request(app).get(`${BASE}/not-an-id`).set(auth());
    expect(res.status).toBe(400);
  });
});
