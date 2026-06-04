'use strict';

/**
 * controlled-document-branch-isolation-wave872.test.js — W872.
 *
 * Controlled QMS documents carry branchId. Pre-W872 GET /:id and every
 * mutation path used bare findById/_load with NO branch filter despite list/
 * dashboard already having requireBranchAccess — any authenticated user could
 * read/draft/sign foreign-branch controlled documents (policy/SOP content +
 * Part 11 signature chain) by ObjectId guess. W872 threads branchFilter(req)
 * through the service layer and mounts requireBranchAccess on every instance
 * route. Real Express + real branchScope + MongoMemoryServer; only auth mocked.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

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

jest.mock('../middleware/requireMfaTier', () => ({
  attachMfaActor: (_req, _res, next) => next(),
  requireMfaTier: () => (_req, _res, next) => next(),
}));

let mongod;
let ControlledDocument;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const qualityManagerA = {
  _id: USER_A,
  id: String(USER_A),
  role: 'quality_manager',
  name: 'مسؤول الجودة',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/controlled-documents', require('../routes/controlledDocument.routes'));
  return app;
}

let app;

async function seedDoc(branchId, overrides = {}) {
  return ControlledDocument.create({
    title: 'سياسة',
    type: 'policy',
    branchId,
    ownerUserId: USER_A,
    createdBy: USER_A,
    versions: [],
    auditTrail: [],
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w872-controlled-doc' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ControlledDocument = require('../models/quality/ControlledDocument.model');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = qualityManagerA;
});

afterEach(async () => {
  await ControlledDocument.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W872 — create stamps caller branch', () => {
  it('POST / stamps branchId from caller scope (201)', async () => {
    const res = await request(app)
      .post('/api/v1/controlled-documents')
      .send({ title: 'إجراء تشغيلي', type: 'sop' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W872 — list is branch-scoped', () => {
  it('GET / only returns caller-branch documents', async () => {
    await seedDoc(BRANCH_A, { title: 'A-doc' });
    await seedDoc(BRANCH_B, { title: 'B-doc' });
    const res = await request(app).get('/api/v1/controlled-documents');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('A-doc');
  });
});

describe('W872 — instance GET /:id is branch-scoped', () => {
  it('returns 200 for same-branch document', async () => {
    const doc = await seedDoc(BRANCH_A);
    const res = await request(app).get(`/api/v1/controlled-documents/${doc._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for foreign-branch document (IDOR regression)', async () => {
    const doc = await seedDoc(BRANCH_B);
    const res = await request(app).get(`/api/v1/controlled-documents/${doc._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W872 — draft version 404 across branches', () => {
  it('POST /:id/versions → 404 on foreign branch', async () => {
    const doc = await seedDoc(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/controlled-documents/${doc._id}/versions`)
      .send({ bodyHtml: '<p>leak</p>' });
    expect(res.status).toBe(404);
  });
});
