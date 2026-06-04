'use strict';

/**
 * transition-plan-routes-behavioral-wave862b.test.js — W862 (transition-plan).
 *
 * ROUTE behavioral coverage for the W361 transition-plan surface (distinct from
 * model-level transition-plan tests). Real Express + real branchScope (W445) +
 * bodyScopedBeneficiaryGuard + MongoMemoryServer; only auth mocked. Exercises
 * the draft→readiness_assessed→in_progress→completed lifecycle, readiness
 * scoring (domain → composite), milestone subdocs, and cross-branch isolation.
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
let Plan;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const SOCIAL_A = new mongoose.Types.ObjectId();
const PARENT_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const socialA = {
  id: String(SOCIAL_A),
  _id: SOCIAL_A,
  role: 'social_worker',
  name: 'الأخصائي',
  branchId: String(BRANCH_A),
};
const parentA = { id: String(PARENT_A), _id: PARENT_A, role: 'parent', branchId: String(BRANCH_A) };
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/transition-plan', require('../routes/transition-plan.routes'));
  return app;
}

let app;

function planPayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    transitionType: 'school_to_work',
    ...overrides,
  };
}

async function createPlan(overrides = {}) {
  return request(app).post('/api/v1/transition-plan').send(planPayload(overrides));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w862b-transition-plan' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Plan = require('../models/TransitionPlan');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = socialA;
});

afterEach(async () => {
  await Plan.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W862b — create + validation', () => {
  it('creates a draft plan (201)', async () => {
    const res = await createPlan();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
  });

  it('rejects an invalid transitionType (400)', async () => {
    const res = await createPlan({ transitionType: 'to_mars' });
    expect(res.status).toBe(400);
  });

  it('forbids a parent (read-only) from creating (403)', async () => {
    mockAuthState.user = parentA;
    const res = await createPlan();
    expect(res.status).toBe(403);
  });

  it('blocks creating a plan for a foreign-branch beneficiary (403)', async () => {
    const res = await createPlan({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await Plan.countDocuments({})).toBe(0);
  });
});

describe('W862b — readiness → start → complete lifecycle', () => {
  it('assess-readiness computes composite + advances status', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/transition-plan/${id}/assess-readiness`)
      .send({
        domainScores: [
          { domain: 'self_care', score: 4 },
          { domain: 'vocational', score: 2 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.compositeReadinessScore).toBe(3); // (4+2)/2
    expect(res.body.data.status).toBe('readiness_assessed');
  });

  it('rejects assess-readiness with no valid domain scores (400)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/transition-plan/${id}/assess-readiness`)
      .send({ domainScores: [{ domain: 'not_a_domain', score: 3 }] });
    expect(res.status).toBe(400);
  });

  it('start requires a planned date; complete requires in_progress', async () => {
    const id = (await createPlan()).body.data._id;
    const noDate = await request(app).post(`/api/v1/transition-plan/${id}/start`).send({});
    expect(noDate.status).toBe(400);

    const started = await request(app)
      .post(`/api/v1/transition-plan/${id}/start`)
      .send({ plannedTransitionDate: new Date(Date.now() + 30 * 86400000).toISOString() });
    expect(started.status).toBe(200);
    expect(started.body.data.status).toBe('in_progress');

    const completed = await request(app).post(`/api/v1/transition-plan/${id}/complete`).send({});
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('completed');
  });

  it('blocks completing a plan that is not in_progress (409)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app).post(`/api/v1/transition-plan/${id}/complete`).send({});
    expect(res.status).toBe(409);
  });

  it('blocks editing a completed plan (409)', async () => {
    const id = (await createPlan()).body.data._id;
    await request(app)
      .post(`/api/v1/transition-plan/${id}/start`)
      .send({ plannedTransitionDate: new Date(Date.now() + 30 * 86400000).toISOString() });
    await request(app).post(`/api/v1/transition-plan/${id}/complete`).send({});
    const res = await request(app)
      .patch(`/api/v1/transition-plan/${id}`)
      .send({ notes: 'late edit' });
    expect(res.status).toBe(409);
  });
});

describe('W862b — milestones subdocuments', () => {
  it('adds a milestone (201), updates its status to achieved, then deletes it', async () => {
    const id = (await createPlan()).body.data._id;
    const add = await request(app)
      .post(`/api/v1/transition-plan/${id}/milestones`)
      .send({ title: 'CV workshop', dueDate: new Date(Date.now() + 14 * 86400000).toISOString() });
    expect(add.status).toBe(201);
    const msId = add.body.data._id;

    const upd = await request(app)
      .patch(`/api/v1/transition-plan/${id}/milestones/${msId}`)
      .send({ status: 'achieved' });
    expect(upd.status).toBe(200);
    expect(upd.body.data.status).toBe('achieved');
    expect(upd.body.data.achievedAt).toBeTruthy();

    const del = await request(app).delete(`/api/v1/transition-plan/${id}/milestones/${msId}`);
    expect(del.status).toBe(200);
    expect(del.body.data.milestones).toHaveLength(0);
  });

  it('rejects a milestone with no title (400)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/transition-plan/${id}/milestones`)
      .send({ dueDate: new Date().toISOString() });
    expect(res.status).toBe(400);
  });
});

describe('W862b — cross-branch isolation (W445)', () => {
  it('hides a foreign-branch plan from GET /:id (404)', async () => {
    const other = await Plan.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      transitionType: 'school_to_work',
      status: 'draft',
    });
    const res = await request(app).get(`/api/v1/transition-plan/${other._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W862b — DELETE role gating', () => {
  it('forbids a social worker from deleting (403)', async () => {
    const id = (await createPlan()).body.data._id;
    const res = await request(app).delete(`/api/v1/transition-plan/${id}`);
    expect(res.status).toBe(403);
    expect(await Plan.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createPlan()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/transition-plan/${id}`);
    expect(res.status).toBe(200);
    expect(await Plan.countDocuments({})).toBe(0);
  });
});
