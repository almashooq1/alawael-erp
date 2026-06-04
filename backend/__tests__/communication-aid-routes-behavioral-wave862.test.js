'use strict';

/**
 * communication-aid-routes-behavioral-wave862.test.js — W862.
 *
 * ROUTE behavioral coverage for the W358 communication-aid (AAC) surface
 * (distinct from model-level communication-aid-behavioral-wave358). Real
 * Express + real branchScope (W445) + bodyScopedBeneficiaryGuard +
 * MongoMemoryServer; only auth mocked. Exercises the singleton-per-beneficiary
 * guard, draft→active activation gate (primaryModality + ≥1 activeModalities),
 * activeTools[] add/remove subdocs, role gating, and cross-branch isolation.
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
let Profile;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_A2 = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const THERAPIST_A = new mongoose.Types.ObjectId();
const NURSE_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(THERAPIST_A),
  _id: THERAPIST_A,
  role: 'therapist',
  name: 'أخصائي النطق',
  branchId: String(BRANCH_A),
};
const nurseA = { id: String(NURSE_A), _id: NURSE_A, role: 'nurse', branchId: String(BRANCH_A) };
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/communication-aid', require('../routes/communication-aid.routes'));
  return app;
}

let app;

function profilePayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    primaryModality: 'speech',
    activeModalities: ['speech'],
    vocabularyLevel: 'single_word',
    ...overrides,
  };
}

async function createProfile(overrides = {}) {
  return request(app).post('/api/v1/communication-aid').send(profilePayload(overrides));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w862-communication-aid' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Profile = require('../models/CommunicationAidProfile');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_A2, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await Profile.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W862 — create + singleton guard', () => {
  it('creates a draft AAC profile (201)', async () => {
    const res = await createProfile();
    expect(res.status).toBe(201);
    expect(res.body.data.lifecycleStatus).toBe('draft');
  });

  it('refuses a second profile for the same beneficiary (409)', async () => {
    await createProfile();
    const res = await createProfile();
    expect(res.status).toBe(409);
    expect(res.body.existingProfileId).toBeDefined();
  });

  it('forbids a nurse (read-only) from creating (403)', async () => {
    mockAuthState.user = nurseA;
    const res = await createProfile({ beneficiaryId: String(BENE_A2) });
    expect(res.status).toBe(403);
  });

  it('blocks creating a profile for a foreign-branch beneficiary (403)', async () => {
    const res = await createProfile({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await Profile.countDocuments({})).toBe(0);
  });
});

describe('W862 — activation gate', () => {
  it('blocks activation when primaryModality is missing (400)', async () => {
    const id = (await createProfile({ primaryModality: undefined, activeModalities: [] })).body.data
      ._id;
    const res = await request(app).post(`/api/v1/communication-aid/${id}/activate`).send({});
    expect(res.status).toBe(400);
    expect((await Profile.findById(id).lean()).lifecycleStatus).toBe('draft');
  });

  it('activates a complete profile (200)', async () => {
    const id = (await createProfile()).body.data._id;
    const res = await request(app).post(`/api/v1/communication-aid/${id}/activate`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.lifecycleStatus).toBe('active');
  });
});

describe('W862 — activeTools[] subdocuments', () => {
  it('adds a tool (201) then removes it (200)', async () => {
    const id = (await createProfile()).body.data._id;
    const add = await request(app)
      .post(`/api/v1/communication-aid/${id}/tools`)
      .send({ name: 'Proloquo2Go', tier: 'high_tech_aided', modalityKey: 'speech' });
    expect(add.status).toBe(201);
    const toolId = add.body.data.activeTools[0]._id;
    const del = await request(app).delete(`/api/v1/communication-aid/${id}/tools/${toolId}`);
    expect(del.status).toBe(200);
    expect(del.body.data.activeTools).toHaveLength(0);
  });

  it('rejects a tool with an invalid tier (400)', async () => {
    const id = (await createProfile()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/communication-aid/${id}/tools`)
      .send({ name: 'X', tier: 'magic', modalityKey: 'speech' });
    expect(res.status).toBe(400);
  });

  it('404 when deleting an unknown tool', async () => {
    const id = (await createProfile()).body.data._id;
    const res = await request(app).delete(
      `/api/v1/communication-aid/${id}/tools/${new mongoose.Types.ObjectId()}`
    );
    expect(res.status).toBe(404);
  });

  it('appends a history snapshot', async () => {
    const id = (await createProfile()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/communication-aid/${id}/snapshot`)
      .send({ summary: 'progress review' });
    expect(res.status).toBe(200);
    expect(res.body.data.history).toHaveLength(1);
  });
});

describe('W862 — cross-branch isolation (W445)', () => {
  it('hides a foreign-branch profile from GET /:id (404)', async () => {
    const other = await Profile.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      vocabularyLevel: 'single_word',
      lifecycleStatus: 'draft',
    });
    const res = await request(app).get(`/api/v1/communication-aid/${other._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W862 — DELETE role gating', () => {
  it('forbids a therapist from deleting (403)', async () => {
    const id = (await createProfile()).body.data._id;
    const res = await request(app).delete(`/api/v1/communication-aid/${id}`);
    expect(res.status).toBe(403);
    expect(await Profile.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createProfile()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/communication-aid/${id}`);
    expect(res.status).toBe(200);
    expect(await Profile.countDocuments({})).toBe(0);
  });
});
