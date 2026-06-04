'use strict';

/**
 * adaptive-sports-routes-behavioral-wave863.test.js — W863 (adaptive-sports).
 *
 * ROUTE behavioral coverage for the W362 adaptive-sports surface (distinct from
 * model-level adaptive-sports-behavioral-wave362). Real Express + real
 * branchScope (W445) + bodyScopedBeneficiaryGuard + MongoMemoryServer; only
 * auth mocked. Exercises the medical-clearance activation gate for high-demand
 * sports, the draft→active→completed/discontinued lifecycle, session +
 * achievement subdocs, and cross-branch isolation.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'الدور غير مصرّح' });
  },
}));

let mongod;
let Program;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const COACH_A = new mongoose.Types.ObjectId();
const PARENT_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const coachA = {
  id: String(COACH_A),
  _id: COACH_A,
  role: 'coach',
  name: 'المدرب',
  branchId: String(BRANCH_A),
};
const parentA = { id: String(PARENT_A), _id: PARENT_A, role: 'parent', branchId: String(BRANCH_A) };
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/adaptive-sports', require('../routes/adaptive-sports.routes'));
  return app;
}

let app;

function programPayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    sport: 'wheelchair_basketball',
    physicalDemand: 'moderate',
    ...overrides,
  };
}

async function createProgram(overrides = {}) {
  return request(app).post('/api/v1/adaptive-sports').send(programPayload(overrides));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w863-adaptive-sports' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Program = require('../models/AdaptiveSportsProgram');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = coachA;
});

afterEach(async () => {
  await Program.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W863 — create + validation', () => {
  it('creates a draft program (201)', async () => {
    const res = await createProgram();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
  });

  it('rejects an invalid sport (400)', async () => {
    const res = await createProgram({ sport: 'quidditch' });
    expect(res.status).toBe(400);
  });

  it('forbids a parent (read-only) from creating (403)', async () => {
    mockAuthState.user = parentA;
    const res = await createProgram();
    expect(res.status).toBe(403);
  });

  it('blocks creating a program for a foreign-branch beneficiary (403)', async () => {
    const res = await createProgram({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await Program.countDocuments({})).toBe(0);
  });
});

describe('W863 — medical-clearance activation gate', () => {
  it('activates a moderate-demand program without medical clearance (200)', async () => {
    const id = (await createProgram({ physicalDemand: 'moderate' })).body.data._id;
    const res = await request(app).post(`/api/v1/adaptive-sports/${id}/activate`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('blocks activating a high-demand program without medical clearance (400)', async () => {
    const id = (await createProgram({ physicalDemand: 'high' })).body.data._id;
    const res = await request(app).post(`/api/v1/adaptive-sports/${id}/activate`).send({});
    expect(res.status).toBe(400);
    expect((await Program.findById(id).lean()).status).toBe('draft');
  });

  it('activates a high-demand program after medical clearance is recorded (200)', async () => {
    const id = (await createProgram({ physicalDemand: 'high' })).body.data._id;
    const clear = await request(app)
      .post(`/api/v1/adaptive-sports/${id}/medical-clearance`)
      .send({ by: 'د. الطبيب' });
    expect(clear.status).toBe(200);
    expect(clear.body.data.medicalClearance).toBe(true);
    const res = await request(app).post(`/api/v1/adaptive-sports/${id}/activate`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });
});

describe('W863 — lifecycle + subdocs', () => {
  async function activeProgram() {
    const id = (await createProgram()).body.data._id;
    await request(app).post(`/api/v1/adaptive-sports/${id}/activate`).send({});
    return id;
  }

  it('completes an active program', async () => {
    const id = await activeProgram();
    const res = await request(app).post(`/api/v1/adaptive-sports/${id}/complete`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('blocks completing a non-active program (409)', async () => {
    const id = (await createProgram()).body.data._id;
    const res = await request(app).post(`/api/v1/adaptive-sports/${id}/complete`).send({});
    expect(res.status).toBe(409);
  });

  it('discontinue requires a reason', async () => {
    const id = await activeProgram();
    expect(
      (await request(app).post(`/api/v1/adaptive-sports/${id}/discontinue`).send({})).status
    ).toBe(400);
    const res = await request(app)
      .post(`/api/v1/adaptive-sports/${id}/discontinue`)
      .send({ reason: 'medical advice' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('discontinued');
  });

  it('logs a session (201) and an achievement (201)', async () => {
    const id = await activeProgram();
    const session = await request(app)
      .post(`/api/v1/adaptive-sports/${id}/sessions`)
      .send({ date: new Date().toISOString(), durationMinutes: 60, type: 'training' });
    expect(session.status).toBe(201);
    expect(session.body.data.durationMinutes).toBe(60);

    const ach = await request(app)
      .post(`/api/v1/adaptive-sports/${id}/achievements`)
      .send({ title: 'First tournament', placement: '2nd' });
    expect(ach.status).toBe(201);
    expect(ach.body.data.title).toBe('First tournament');
  });

  it('rejects a session without duration (400)', async () => {
    const id = await activeProgram();
    const res = await request(app)
      .post(`/api/v1/adaptive-sports/${id}/sessions`)
      .send({ date: new Date().toISOString() });
    expect(res.status).toBe(400);
  });
});

describe('W863 — cross-branch isolation (W445)', () => {
  it('hides a foreign-branch program from GET /:id (404)', async () => {
    const other = await Program.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      sport: 'wheelchair_basketball',
      physicalDemand: 'moderate',
      status: 'draft',
    });
    const res = await request(app).get(`/api/v1/adaptive-sports/${other._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W863 — DELETE role gating', () => {
  it('forbids a coach from deleting (403)', async () => {
    const id = (await createProgram()).body.data._id;
    const res = await request(app).delete(`/api/v1/adaptive-sports/${id}`);
    expect(res.status).toBe(403);
    expect(await Program.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createProgram()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/adaptive-sports/${id}`);
    expect(res.status).toBe(200);
    expect(await Program.countDocuments({})).toBe(0);
  });
});
