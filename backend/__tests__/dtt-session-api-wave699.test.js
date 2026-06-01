/**
 * dtt-session-api-wave699.test.js — HTTP route-level (supertest) tests for
 * the W689 ABA/DTT surface. Part of the W699 route-level suite; covers the
 * NESTED-DATA pattern (targets[] with trials[]) + the completed⇒trials gate.
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
    dbName: 'dtt-api-test',
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
const BASE = '/api/v1/dtt-session';
const oid = () => new mongoose.Types.ObjectId().toString();

const targets = () => [
  {
    targetName: 'Mand for "more"',
    curriculumRef: 'VB-MAPP Mand-5',
    trials: [
      { promptLevel: 'independent', response: 'correct' },
      { promptLevel: 'independent', response: 'correct' },
      { promptLevel: 'gestural', response: 'correct' },
      { promptLevel: 'full_physical', response: 'incorrect' },
    ],
  },
];

describe('W699 DTT API — mount + validation', () => {
  it('route mounted (responds, not 404)', async () => {
    const res = await request(app).get(BASE);
    expect(res.status).not.toBe(404);
  });
  it('400 with an unknown programArea', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId: oid(), programArea: 'telepathy' });
    expect(res.status).toBe(400);
  });
});

describe('W699 DTT API — nested trial data + completion gate', () => {
  let id;
  const beneficiaryId = oid();

  it('201 create a scheduled session', async () => {
    const res = await request(app)
      .post(BASE)
      .set(auth())
      .send({ beneficiaryId, programArea: 'communication' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('scheduled');
    id = res.body.data._id;
  });

  it('200 record-data sets targets + trials', async () => {
    const res = await request(app)
      .post(`${BASE}/${id}/record-data`)
      .set(auth())
      .send({ targets: targets() });
    expect(res.status).toBe(200);
    expect(res.body.data.targets.length).toBe(1);
    expect(res.body.data.targets[0].trials.length).toBe(4);
  });

  it('200 complete (now that trials exist) + independent-correct rate computed', async () => {
    const res = await request(app).post(`${BASE}/${id}/complete`).set(auth()).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    // 2 independent-correct of 4 trials = 50%
    expect(res.body.data.independentCorrectRate).toBe(50);
  });

  it('200 by-beneficiary returns an independent-correct trend', async () => {
    const res = await request(app).get(`${BASE}/by-beneficiary/${beneficiaryId}`).set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.trend)).toBe(true);
    expect(res.body.trend.length).toBeGreaterThanOrEqual(1);
  });
});
