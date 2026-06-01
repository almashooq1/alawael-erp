/**
 * adjunct-therapy-api-wave699.test.js — HTTP route-level (supertest) tests
 * for the W693 adjunct-therapy surface. Second of the W699 route-level
 * suite; demonstrates the GATE pattern (a clinical safety gate enforced at
 * the route, returning 409 until satisfied) on the reusable harness proven
 * by prosthetic-orthotic-api-wave699.test.js.
 *
 * Focus: the medical-clearance gate — /complete must 409 until /clear.
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
    dbName: 'adjunct-api-test',
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
const BASE = '/api/v1/adjunct-therapy';
const oid = () => new mongoose.Types.ObjectId().toString();

describe('W699 adjunct-therapy API — mount + validation', () => {
  it('route mounted (responds, not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });

  it('200 list with admin token', async () => {
    const res = await request(app).get(BASE).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('400 without beneficiaryId', async () => {
    const res = await request(app).post(BASE).set(auth()).send({ modality: 'hydrotherapy' });
    expect(res.status).toBe(400);
  });

  it('400 with an unknown modality', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), modality: 'skydiving' });
    expect(res.status).toBe(400);
  });
});

describe('W699 adjunct-therapy API — medical-clearance GATE', () => {
  let id;

  it('201 create a scheduled hydrotherapy session', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), modality: 'hydrotherapy' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
    expect(res.body.data.medicalCleared).toBe(false);
    id = res.body.data._id;
  });

  it('409 complete BEFORE clearance (the safety gate)', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/complete`)
      .set(auth())
      .send({ activities: ['floating'], outcomeNotes: 'tolerated well' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('200 record medical clearance', async () => {
    const res = await request(app).post(`${BASE}/${id}/clear`).set(auth()).send({ cleared: true });
    expect(res.status).toBe(200);
    expect(res.body.data.medicalCleared).toBe(true);
  });

  it('200 complete AFTER clearance (with content)', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/complete`)
      .set(auth())
      .send({
        activities: ['floating', 'walking'],
        beneficiaryResponse: 'positive',
        outcomeNotes: 'good',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });
});

describe('W699 adjunct-therapy API — cancel + id validation', () => {
  it('200 cancel a fresh session with a reason', async () => {
    const created = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), modality: 'hippotherapy' });
    const res = await request(app)
      .post(`${BASE}/${created.body.data._id}/cancel`)
      .set(auth())
      .send({ cancelReason: 'beneficiary absent' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('400 cancel without a reason', async () => {
    const created = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), modality: 'hydrotherapy' });
    const res = await request(app)
      .post(`${BASE}/${created.body.data._id}/cancel`)
      .set(auth())
      .send({});
    expect(res.status).toBe(400);
  });

  it('400 on a malformed ObjectId', async () => {
    const res = await request(app).get(`${BASE}/not-an-id`).set(auth());
    expect(res.status).toBe(400);
  });
});
