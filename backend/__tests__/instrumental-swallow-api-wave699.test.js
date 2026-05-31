/**
 * instrumental-swallow-api-wave699.test.js — W699 route-level suite. Covers
 * the order → schedule → record-result lifecycle + pending-results.
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
    dbName: 'vfss-api-test',
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
const BASE = '/api/v1/instrumental-swallow';
const oid = () => new mongoose.Types.ObjectId().toString();

describe('W699 instrumental-swallow API', () => {
  it('route mounted (not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('400 unknown studyType', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), studyType: 'xray' });
    expect(res.status).toBe(400);
  });

  let id;
  it('201 order a VFSS study', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), studyType: 'vfss' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('ordered');
    id = res.body.data._id;
  });
  it('200 schedule', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/schedule`)
      .set(auth())
      .send({ scheduledDate: new Date().toISOString() });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('scheduled');
  });
  it('200 record-result → completed (PAS 7 + aspiration)', async () => {
    const res = await request(app).post(`${BASE}/${id}/record-result`).set(auth()).send({
      performedByName: 'SLP',
      overallFinding: 'aspiration on thin liquids',
      penetrationAspirationScale: 7,
      aspirationDetected: true,
      silentAspiration: true,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.indicatesAspiration).toBe(true);
  });
  it('200 pending-results list', async () => {
    const res = await request(app).get(`${BASE}/pending-results`).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
