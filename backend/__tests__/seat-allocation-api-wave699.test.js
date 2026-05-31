/**
 * seat-allocation-api-wave699.test.js — W699 route-level suite. Covers the
 * one-active-seat-per-beneficiary guard (409) + release-suggests-waitlist.
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
    dbName: 'seat-api-test',
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
const BASE = '/api/v1/seat-allocation';
const oid = () => new mongoose.Types.ObjectId().toString();

describe('W699 seat-allocation API', () => {
  it('route mounted (not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('200 occupancy board', async () => {
    const res = await request(app).get(`${BASE}/occupancy`).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.branches)).toBe(true);
  });
  it('400 create without branchId', async () => {
    const res = await request(app).post(BASE).set(auth()).send({ beneficiaryId: oid() });
    expect(res.status).toBe(400);
  });

  const beneficiaryId = oid();
  const branchId = oid();
  let id;
  it('201 allocate a seat', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId, branchId, seatLabel: 'B3' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
    id = res.body.data._id;
  });
  it('409 second active seat for same beneficiary+branch', async () => {
    const res = await request(app).post(BASE).set(auth()).send({ beneficiaryId, branchId });
    expect(res.status).toBe(409);
  });
  it('400 release without a reason', async () => {
    const res = await request(app).post(`${BASE}/${id}/release`).set(auth()).send({});
    expect(res.status).toBe(400);
  });
  it('200 release with a reason + suggestedFromWaitlist array', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/release`)
      .set(auth())
      .send({ releaseReason: 'transferred' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('released');
    expect(Array.isArray(res.body.suggestedFromWaitlist)).toBe(true);
  });
});
