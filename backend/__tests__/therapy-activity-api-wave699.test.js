/**
 * therapy-activity-api-wave699.test.js — HTTP route-level (supertest) tests
 * for the W697 unified rollup. Part of the W699 route-level suite; covers
 * the cross-module READ-AGGREGATION pattern: seed a session in one module,
 * then assert the rollup reflects it.
 */

'use strict';

process.env.NODE_ENV = 'test';
process.env.USE_MOCK_DB = 'true';
process.env.CSRF_DISABLE = 'true';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-for-api-suite-longer-than-sixteen-chars';

{
  const fs = require('fs');
  const path = require('path');
  const flag = path.join(__dirname, '..', '..', 'maintenance.flag');
  try {
    if (fs.existsSync(flag)) fs.unlinkSync(flag);
  } catch {
    /* ignore */
  }
}

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
  const uri = ownServer.getUri();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(uri, {
    dbName: 'therapy-activity-api-test',
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 10000,
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
    { id: '000000000000000000000001', email: `${role}@test.local`, role, name: 'Tester' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}
const auth = (role = 'admin') => ({ Authorization: `Bearer ${token(role)}` });
const BASE = '/api/v1/therapy-activity';
const oid = () => new mongoose.Types.ObjectId().toString();

describe('W699 therapy-activity API — summary + aggregation', () => {
  it('route mounted (responds, not 404)', async () => {
    const res = await request(app).get(`${BASE}/summary`);
    expect(res.status).not.toBe(404);
  });

  it('200 branch summary shape', async () => {
    const res = await request(app).get(`${BASE}/summary`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('counts');
    expect(res.body).toHaveProperty('breaches');
  });

  it('400 by-beneficiary with a malformed id', async () => {
    const res = await request(app).get(`${BASE}/by-beneficiary/not-an-id`).set(auth());
    expect(res.status).toBe(400);
  });

  it('200 empty rollup for a beneficiary with no activity', async () => {
    const res = await request(app).get(`${BASE}/by-beneficiary/${oid()}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.summary.breaches).toBe(0);
    expect(res.body.summary.dtt.total).toBe(0);
  });

  it('200 rollup reflects a seeded DTT session (cross-module read)', async () => {
    const beneficiaryId = oid();
    // Seed one DTT session for this beneficiary via its own API.
    const seed = await request(app)
      .post('/api/v1/dtt-session')
      .set(auth())
      .send({ beneficiaryId, programArea: 'communication' });
    expect(seed.status).toBe(201);

    const res = await request(app).get(`${BASE}/by-beneficiary/${beneficiaryId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.summary.dtt.total).toBeGreaterThanOrEqual(1);
  });
});
