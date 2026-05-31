/**
 * sponsorship-api-wave699.test.js — HTTP route-level (supertest) tests for
 * the W682 Kafala surface. Part of the W699 route-level suite; covers the
 * STATE-MACHINE + payment-LEDGER pattern on the proven harness.
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
    dbName: 'sponsorship-api-test',
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
const BASE = '/api/v1/sponsorship';
const oid = () => new mongoose.Types.ObjectId().toString();

describe('W699 sponsorship API — mount + validation', () => {
  it('route mounted (responds, not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('200 stats', async () => {
    const res = await request(app).get(`${BASE}/stats`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('byStatus');
  });
  it('400 without donorId', async () => {
    const res = await request(app).post(BASE).set(auth()).send({ beneficiaryId: oid() });
    expect(res.status).toBe(400);
  });
});

describe('W699 sponsorship API — state machine + payment ledger', () => {
  let id;

  it('201 create a pending full kafala', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ donorId: oid(), beneficiaryId: oid(), sponsorshipType: 'full', monthlyAmount: 500 });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
    id = res.body.data._id;
  });

  it('200 legal transition pending → active', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/transition`)
      .set(auth())
      .send({ toStatus: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('409 illegal transition active → pending', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/transition`)
      .set(auth())
      .send({ toStatus: 'pending' });
    expect(res.status).toBe(409);
    expect(Array.isArray(res.body.allowed)).toBe(true);
  });

  it('201 record a payment into the ledger', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/payment`)
      .set(auth())
      .send({ amount: 500, method: 'bank_transfer', reference: 'TRX-1' });
    expect(res.status).toBe(201);
    expect(res.body.data.payments.length).toBe(1);
    expect(res.body.data.totalPaid).toBe(500);
  });

  it('400 payment with a negative amount', async () => {
    const res = await request(app).post(`${BASE}/${id}/payment`).set(auth()).send({ amount: -10 });
    expect(res.status).toBe(400);
  });
});
