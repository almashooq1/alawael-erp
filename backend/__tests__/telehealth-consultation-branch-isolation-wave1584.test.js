'use strict';

/**
 * telehealth-consultation-branch-isolation-wave1584.test.js — W1584
 *
 * routes/telehealth.routes.js retrofitted its DIRECT-model handlers with scopedById (W1550)
 * but every handler that DELEGATES to telehealthService did a bare findById(id) with no
 * branch check, then minted WebRTC/Agora room + join tokens (start, participants) or wrote
 * clinical notes / prescriptions / waiting-room state for ANY branch's consultation. That
 * is cross-branch live-video join-credential disclosure + PHI write. Telehealth models key
 * on `branch` (not branchId). W1584 adds assertInBranch(req,res,Model,id,msg) — a scoped
 * ownership pre-check (matching the W1550 pattern) on start/end/participants/adjust-quality/
 * waiting-room-join/device-test/prescriptions. Restricted foreign id → 404 before the
 * service runs; cross-branch/HQ role passes.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
const mockScope = { s: undefined }; // branchId (restricted) or null (cross-branch/HQ)

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s ? { restricted: true, branchId: mockScope.s } : { restricted: false };
    next();
  },
  branchFilter: () => (mockScope.s ? { branchId: mockScope.s } : {}),
}));
// Isolate the ROUTE guard: stub the delegated services so a passed guard returns benign data
// (never a real Agora token). A blocked guard 404s BEFORE these are ever called.
const mockSvcProxy = new Proxy(
  {},
  {
    get: (_t, p) =>
      p === '__esModule' || typeof p === 'symbol'
        ? undefined
        : async () => ({ ok: true, roomId: 'r', token: 't', queuePosition: 1 }),
  }
);
jest.mock('../services/telehealthService', () => mockSvcProxy);
jest.mock('../services/telehealth.service', () => mockSvcProxy);

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let Teleconsultation;
let TelehealthWaitingRoom;
const c = { a: null, b: null };
const w = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1584-telehealth' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ Teleconsultation, TelehealthWaitingRoom } = require('../models/Telehealth'));
  app = express();
  app.use(express.json());
  app.use('/api/v1/telehealth', require('../routes/telehealth.routes'));

  const seedC = (branch, uuid) =>
    Teleconsultation.collection.insertOne({
      branch,
      uuid,
      consultationNumber: 'TC-' + uuid, // unique (unique index, not sparse)
      status: 'scheduled',
      beneficiary: new mongoose.Types.ObjectId(),
      provider: new mongoose.Types.ObjectId(),
    });
  c.a = (await seedC(BRANCH_A, 'tc-a')).insertedId;
  c.b = (await seedC(BRANCH_B, 'tc-b')).insertedId;
  const seedW = (branch, consultation, uuid) =>
    TelehealthWaitingRoom.collection.insertOne({ branch, consultation, uuid, status: 'waiting' });
  w.a = (await seedW(BRANCH_A, c.a, 'wr-a')).insertedId;
  w.b = (await seedW(BRANCH_B, c.b, 'wr-b')).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'doctor' };
  mockScope.s = BRANCH_A; // restricted to branch A
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/v1/telehealth';

describe('W1584 — telehealth consultation branch isolation (delegating handlers)', () => {
  it('POST /consultations/:id/start — 404 on foreign branch (no token leak), passes on own', async () => {
    expect((await request(app).post(`${base}/consultations/${c.b}/start`).send({})).status).toBe(404);
    expect((await request(app).post(`${base}/consultations/${c.a}/start`).send({})).status).toBe(200);
  });

  it('POST /consultations/:id/participants — 404 on foreign (no join-token mint), passes on own', async () => {
    expect((await request(app).post(`${base}/consultations/${c.b}/participants`).send({})).status).toBe(404);
    expect((await request(app).post(`${base}/consultations/${c.a}/participants`).send({})).status).toBe(200);
  });

  it('POST /consultations/:id/end — 404 on foreign branch', async () => {
    expect((await request(app).post(`${base}/consultations/${c.b}/end`).send({})).status).toBe(404);
  });

  it('POST /consultations/:id/adjust-quality — 404 on foreign branch', async () => {
    const r = await request(app).post(`${base}/consultations/${c.b}/adjust-quality`).send({ bandwidthKbps: 500 });
    expect(r.status).toBe(404);
  });

  it('POST /waiting-room/:consultationId/join — 404 on foreign branch', async () => {
    expect((await request(app).post(`${base}/waiting-room/${c.b}/join`).send({})).status).toBe(404);
    expect((await request(app).post(`${base}/waiting-room/${c.a}/join`).send({})).status).toBe(200);
  });

  it('PATCH /waiting-room/:id/device-test — 404 on foreign-branch waiting room', async () => {
    expect((await request(app).patch(`${base}/waiting-room/${w.b}/device-test`).send({})).status).toBe(404);
    expect((await request(app).patch(`${base}/waiting-room/${w.a}/device-test`).send({})).status).toBe(200);
  });

  it('POST /consultations/:id/prescriptions — 404 on foreign branch (no cross-branch e-Rx)', async () => {
    expect((await request(app).post(`${base}/consultations/${c.b}/prescriptions`).send({})).status).toBe(404);
  });

  it('cross-branch/HQ role (no scope) passes on any branch', async () => {
    mockScope.s = null;
    expect((await request(app).post(`${base}/consultations/${c.b}/start`).send({})).status).toBe(200);
  });

  it('static: assertInBranch defined + guarding the delegating handlers', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'telehealth.routes.js'), 'utf8');
    expect(src).toMatch(/async function assertInBranch\(req, res, Model, id, notFoundMsg\)/);
    expect((src.match(/assertInBranch\(\s*\n?\s*req/g) || src.match(/assertInBranch\(req/g) || []).length).toBeGreaterThanOrEqual(1);
    // 1 definition + 7 call-sites = 8 references
    expect((src.match(/assertInBranch/g) || []).length).toBeGreaterThanOrEqual(8);
  });
});
