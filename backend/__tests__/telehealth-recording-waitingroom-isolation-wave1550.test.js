'use strict';

/**
 * telehealth-recording-waitingroom-isolation-wave1550.test.js — W1550
 *
 * Guards the fix for two cross-branch PHI leaks in routes/telehealth.routes.js:
 *  - GET /recordings/:consultationId returned the session recording
 *    (filePath/storageBucket/transcription) filtered ONLY by consultationId —
 *    any authenticated caller could pull another branch's clinical video.
 *  - GET /waiting-room/:consultationId returned the waiting-room (beneficiary
 *    name + device info) even when the branch-scoped consultation was null.
 * Both are fixed by resolving the branch-scoped parent Teleconsultation first
 * (scopedById → 404 for a foreign branch) before returning the child PHI.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const managerA = {
  _id: new mongoose.Types.ObjectId(),
  id: 'mA',
  role: 'manager',
  branchId: String(BRANCH_A),
};
const adminCross = { _id: new mongoose.Types.ObjectId(), id: 'ad', role: 'admin' };

let mongod;
let app;
let consultA;
let consultB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1550-tele' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const models = require('../models/Telehealth');
  // stub the populate targets (beneficiary/provider) the handlers reference
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Beneficiary', 'User', 'Provider', 'Employee']) {
    if (!mongoose.models[n]) mongoose.model(n, stub);
  }
  app = express();
  app.use(express.json());
  app.use('/api/telehealth', require('../routes/telehealth.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  // Every telehealth schema has a required-unique `uuid` — give each seed a
  // distinct one (+ consultationNumber) to avoid null-dup-key collisions.
  const { Teleconsultation, SessionRecording, TelehealthWaitingRoom } = models;
  consultA = (
    await Teleconsultation.collection.insertOne({
      uuid: 'w1550-tc-a', consultationNumber: 'W1550-TC-A', branch: BRANCH_A, status: 'scheduled', roomId: 'rA',
    })
  ).insertedId;
  consultB = (
    await Teleconsultation.collection.insertOne({
      uuid: 'w1550-tc-b', consultationNumber: 'W1550-TC-B', branch: BRANCH_B, status: 'scheduled', roomId: 'rB',
    })
  ).insertedId;
  await SessionRecording.collection.insertOne({ uuid: 'w1550-rec-a', teleconsultation: consultA, branch: BRANCH_A, filePath: '/recA.mp4' });
  await SessionRecording.collection.insertOne({ uuid: 'w1550-rec-b', teleconsultation: consultB, branch: BRANCH_B, filePath: '/recB.mp4' });
  await TelehealthWaitingRoom.collection.insertOne({ uuid: 'w1550-wr-a', teleconsultation: consultA, branch: BRANCH_A, status: 'waiting', beneficiary: new mongoose.Types.ObjectId() });
  await TelehealthWaitingRoom.collection.insertOne({ uuid: 'w1550-wr-b', teleconsultation: consultB, branch: BRANCH_B, status: 'waiting', beneficiary: new mongoose.Types.ObjectId() });
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1550 — telehealth recording/waiting-room branch isolation', () => {
  it('restricted user gets 404 on a FOREIGN-branch recording', async () => {
    const r = await request(app).get(`/api/telehealth/recordings/${consultB}`);
    expect(r.status).toBe(404);
  });

  it('restricted user CAN read its OWN-branch recording', async () => {
    const r = await request(app).get(`/api/telehealth/recordings/${consultA}`);
    expect(r.status).toBe(200);
    expect(r.body.data.filePath).toBe('/recA.mp4');
  });

  it('cross-branch role can read any recording', async () => {
    mockAuthState.user = adminCross;
    const r = await request(app).get(`/api/telehealth/recordings/${consultB}`);
    expect(r.status).toBe(200);
  });

  it('restricted user gets 404 with NO waiting-room leak on a foreign-branch room', async () => {
    const r = await request(app).get(`/api/telehealth/waiting-room/${consultB}`);
    expect(r.status).toBe(404);
    expect(r.body.data).toBeUndefined();
  });

  it('restricted user CAN read its own-branch waiting-room', async () => {
    const r = await request(app).get(`/api/telehealth/waiting-room/${consultA}`);
    expect(r.status).toBe(200);
    expect(r.body.data.waitingRoom).toBeTruthy();
  });

  it('static: both endpoints scope via the branch-scoped parent consultation', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'telehealth.routes.js'), 'utf8');
    const recStart = src.indexOf("'/recordings/:consultationId'");
    const rec = src.slice(recStart, recStart + 800);
    expect(rec).toMatch(/scopedById\(req/);
    const wrStart = src.indexOf("'/waiting-room/:consultationId'");
    const wr = src.slice(wrStart, wrStart + 900);
    expect(wr).toMatch(/if \(!consultation\)/);
  });
});
