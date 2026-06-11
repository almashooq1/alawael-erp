'use strict';

/**
 * pathway-bundles-routes-behavioral-wave1219.test.js — ROUTE-layer behavioral
 * coverage for the W1205 surface (service layer covered by wave1212). Real
 * Express + real branchScope/assertBranchMatch middlewares + MMS; only the
 * auth module is mocked (adaptive-sports wave863 template).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/pathway-bundles-routes-behavioral-wave1219.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
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
let app;
let ClinicalPathwayPlan;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BEN_A = new mongoose.Types.ObjectId();
const BEN_B = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};
const adminUser = { id: String(new mongoose.Types.ObjectId()), role: 'admin' };
const parentA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'parent',
  branchId: String(BRANCH_A),
};

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1215-bundles-routes' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');

  // Slim Beneficiary stand-in (service reads disability/category/dob/branchId;
  // branch middlewares read _id + branchId).
  const Beneficiary = mongoose.model(
    'Beneficiary',
    new mongoose.Schema(
      {
        disability: { type: { type: String } },
        category: String,
        dateOfBirth: Date,
        branchId: mongoose.Schema.Types.ObjectId,
      },
      { collection: 'beneficiaries_w1215_bundles' }
    )
  );
  await Beneficiary.collection.insertOne({
    _id: BEN_A,
    branchId: BRANCH_A,
    disability: { type: 'speech' },
  });
  await Beneficiary.collection.insertOne({
    _id: BEN_B,
    branchId: BRANCH_B,
    disability: { type: 'mental' },
  });

  ClinicalPathwayPlan = require('../models/ClinicalPathwayPlan');
  require('../domains/episodes/models/EpisodeOfCare'); // service episode lookup

  app = express();
  app.use(express.json());
  app.use('/api/v1/pathway-bundles', require('../routes/pathway-bundles.routes'));
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await ClinicalPathwayPlan.deleteMany({});
});

describe('W1219 GET /pathway-bundles (catalogue)', () => {
  test('200 — seven bundles, no PHI', async () => {
    const res = await request(app).get('/api/v1/pathway-bundles');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data[0]).toHaveProperty('titleAr');
    expect(res.body.data[0]).not.toHaveProperty('beneficiaryId');
  });

  test('403 — parent role is not in READ_ROLES', async () => {
    mockAuthState.user = parentA;
    const res = await request(app).get('/api/v1/pathway-bundles');
    expect(res.status).toBe(403);
  });
});

describe('W1219 GET /pathway-bundles/suggest/:beneficiaryId', () => {
  test('400 — malformed id', async () => {
    const res = await request(app).get('/api/v1/pathway-bundles/suggest/not-an-id');
    expect(res.status).toBe(400);
  });

  test('403 — restricted therapist cannot read a foreign-branch beneficiary (W269)', async () => {
    const res = await request(app).get(`/api/v1/pathway-bundles/suggest/${BEN_B}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('404 — unknown beneficiary (cross-branch admin)', async () => {
    mockAuthState.user = adminUser;
    const res = await request(app).get(
      `/api/v1/pathway-bundles/suggest/${new mongoose.Types.ObjectId()}`
    );
    expect(res.status).toBe(404);
  });

  test('200 — same-branch suggest resolves the speech bundle', async () => {
    const res = await request(app).get(`/api/v1/pathway-bundles/suggest/${BEN_A}`);
    expect(res.status).toBe(200);
    expect(res.body.data.bundle.key).toBe('speech');
    expect(res.body.data.bundle.pathwayType).toBe('SPEECH_LANGUAGE');
    expect(res.body.data.beneficiary.branchId).toBe(String(BRANCH_A));
  });
});

describe('W1219 POST /pathway-bundles/apply/:beneficiaryId', () => {
  test('403 — parent role is not in WRITE_ROLES', async () => {
    mockAuthState.user = parentA;
    const res = await request(app)
      .post(`/api/v1/pathway-bundles/apply/${BEN_A}`)
      .send({ createPathway: true });
    expect(res.status).toBe(403);
  });

  test('403 — cross-branch apply denied (W269)', async () => {
    const res = await request(app)
      .post(`/api/v1/pathway-bundles/apply/${BEN_B}`)
      .send({ createPathway: true });
    expect(res.status).toBe(403);
    expect(await ClinicalPathwayPlan.countDocuments({})).toBe(0);
  });

  test('201 — same-branch apply creates the pathway pinned to the CALLER branch', async () => {
    const res = await request(app)
      .post(`/api/v1/pathway-bundles/apply/${BEN_A}`)
      .send({ createPathway: true, goalTemplateIds: [] });
    expect(res.status).toBe(201);
    expect(res.body.data.created.pathwayPlanId).toBeTruthy();
    const plan = await ClinicalPathwayPlan.findById(res.body.data.created.pathwayPlanId).lean();
    expect(String(plan.branchId)).toBe(String(BRANCH_A)); // effectiveBranchScope pin
    expect(plan.pathwayType).toBe('SPEECH_LANGUAGE');
  });

  test('spoofed body.branchId is DENIED 403 at the branch middleware (stronger than pinning)', async () => {
    const res = await request(app)
      .post(`/api/v1/pathway-bundles/apply/${BEN_A}`)
      .send({
        createPathway: true,
        goalTemplateIds: [],
        branchId: String(BRANCH_B), // foreign-branch request → requireBranchAccess denies
      });
    expect(res.status).toBe(403);
    expect(await ClinicalPathwayPlan.countDocuments({})).toBe(0);
  });
});
