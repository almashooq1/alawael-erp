'use strict';

/**
 * telehealth-rehab-session-branch-isolation-wave1586.test.js — W1586
 *
 * models/Telehealth.js `RehabTelehealthSession` had NO `branch` field (every sibling schema
 * has one), so routes/telehealth.routes.js remote-rehab-session handlers (GET /sessions,
 * GET /sessions/:id, start/complete/materials/technical-issues) returned the Zoom/Meet
 * meetingLink+roomId + beneficiary PHI (name/nationalId/phone/DOB) to ANY authenticated user
 * across all branches. W1586 adds `branch` (additive, pre-adoption), stamps it server-side on
 * create (scheduleTelehealthSession), branch-filters the list, and applies scopedById /
 * assertInBranch to the :id + lifecycle handlers. Uses the REAL delegated service so the
 * guard is exercised end-to-end (a foreign id 404s before the service ever runs).
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

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let RehabTelehealthSession;
const s = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1586-rehab-th' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ RehabTelehealthSession } = require('../models/Telehealth'));
  // GET /sessions + /sessions/:id populate beneficiaryId(→Beneficiary) + therapistId(→User)
  // + sessionId(→ClinicalSession); stub any not already registered to avoid MissingSchema.
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Beneficiary', 'User', 'ClinicalSession'])
    if (!mongoose.models[n]) mongoose.model(n, stub);
  app = express();
  app.use(express.json());
  app.use('/api/v1/telehealth', require('../routes/telehealth.routes'));

  const seed = (branch, roomId) =>
    RehabTelehealthSession.collection.insertOne({
      branch,
      roomId,
      uuid: roomId,
      beneficiaryId: new mongoose.Types.ObjectId(),
      therapistId: new mongoose.Types.ObjectId(),
      scheduledAt: new Date('2027-03-03T10:00:00Z'),
      status: 'scheduled',
      meetingLink: 'https://zoom.us/j/' + roomId,
    });
  s.a = (await seed(BRANCH_A, 'room-a')).insertedId;
  s.b = (await seed(BRANCH_B, 'room-b')).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'therapist' };
  mockScope.s = BRANCH_A; // restricted to branch A
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/v1/telehealth';

describe('W1586 — RehabTelehealthSession branch isolation', () => {
  it('GET /sessions — restricted user lists only own-branch sessions', async () => {
    const r = await request(app).get(`${base}/sessions?limit=100`);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(s.a));
    expect(ids).not.toContain(String(s.b)); // was: leaked meetingLink+PHI for every branch
  });

  it('GET /sessions — cross-branch role sees all branches', async () => {
    mockScope.s = null;
    const r = await request(app).get(`${base}/sessions?limit=100`);
    expect(r.status).toBe(200);
    expect(r.body.data.map(d => String(d._id))).toContain(String(s.b));
  });

  it('GET /sessions/:id — restricted user 404s on a foreign-branch session (no meetingLink leak)', async () => {
    expect((await request(app).get(`${base}/sessions/${s.b}`)).status).toBe(404);
    expect((await request(app).get(`${base}/sessions/${s.a}`)).status).toBe(200);
  });

  it('PATCH /sessions/:id/start — restricted user 404s on foreign branch', async () => {
    expect((await request(app).patch(`${base}/sessions/${s.b}/start`).send({})).status).toBe(404);
    expect((await request(app).patch(`${base}/sessions/${s.a}/start`).send({})).status).not.toBe(404);
  });

  it('GET /sessions/:id/materials — restricted user 404s on foreign branch', async () => {
    expect((await request(app).get(`${base}/sessions/${s.b}/materials`)).status).toBe(404);
  });

  it('POST /sessions/:id/technical-issues — restricted user 404s on foreign branch', async () => {
    expect((await request(app).post(`${base}/sessions/${s.b}/technical-issues`).send({ description: 'x' })).status).toBe(404);
  });

  it('POST /sessions — create stamps the caller branch', async () => {
    const r = await request(app)
      .post(`${base}/sessions`)
      .send({
        beneficiaryId: String(new mongoose.Types.ObjectId()),
        therapistId: String(new mongoose.Types.ObjectId()),
        scheduledAt: '2027-04-04T09:00:00Z',
      });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branch)).toBe(String(BRANCH_A));
  });

  it('static: model has branch field + routes scope the rehab-session handlers', () => {
    const model = fs.readFileSync(path.join(__dirname, '..', 'models', 'Telehealth.js'), 'utf8');
    const rehab = model.slice(model.indexOf('rehabTelehealthSessionSchema'));
    expect(rehab).toMatch(/branch: \{ type: Schema\.Types\.ObjectId, ref: 'Branch', index: true \}/);
    const svc = fs.readFileSync(path.join(__dirname, '..', 'services', 'telehealth.service.js'), 'utf8');
    expect(svc).toMatch(/async function scheduleTelehealthSession\(data, scope\)/);
    expect(svc).toMatch(/branch: scope \|\| data\.branch/);
  });
});
