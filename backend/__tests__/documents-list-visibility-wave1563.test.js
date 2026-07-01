'use strict';

/**
 * documents-list-visibility-wave1563.test.js — W1563
 *
 * routes/documents.routes.js bulk list/search returned EVERY document's metadata
 * (title/filename/beneficiary-linkage/uploader) to any authenticated user, regardless
 * of branch — Document has no branchId, and only the per-:id routes were guarded by
 * requireDocumentAccess. W1563 scopes the bulk reads for branch-restricted callers to
 * documents they own / are shared on / public (the doc's own access model), and scopes
 * GET /entity/Beneficiary/:id via the linked beneficiary's branch. Cross-branch/HQ
 * callers stay unscoped.
 *
 * (Shipped LEAVE-IN-REVIEW: it changes what a restricted user sees in the list → owner
 * verifies the role classification, per the #769/#828 doctrine.)
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
const mockScope = { s: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
  branchFilter: () => ({}),
}));

const USER_A = new mongoose.Types.ObjectId();
const USER_X = new mongoose.Types.ObjectId();
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const benB = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let docOwn;
let docOther;
let docShared;
let docPublic;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1563-docs' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const Document = require('../models/Document');
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  if (!mongoose.models.User) mongoose.model('User', stub);
  const benSchema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }, { strict: false });
  if (!mongoose.models.Beneficiary) mongoose.model('Beneficiary', benSchema);
  await mongoose.model('Beneficiary').collection.insertOne({ _id: benB, branchId: BRANCH_B });

  const seed = async (over) =>
    (
      await Document.collection.insertOne({
        title: 'doc-' + Math.random().toString(36).slice(2),
        originalFileName: 'f.pdf',
        fileType: 'pdf',
        category: 'medical',
        status: 'مسودة',
        uploadedBy: USER_X,
        sharedWith: [],
        isPublic: false,
        ...over,
      })
    ).insertedId;
  docOwn = await seed({ uploadedBy: USER_A });
  docOther = await seed({ uploadedBy: USER_X });
  docShared = await seed({ uploadedBy: USER_X, sharedWith: [{ userId: USER_A }] });
  docPublic = await seed({ uploadedBy: USER_X, isPublic: true });

  app = express();
  app.use(express.json());
  app.use('/api/documents', require('../routes/documents.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
});

beforeEach(() => {
  mockUser.u = { _id: USER_A, id: String(USER_A), role: 'therapist' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const ids = body => (body.documents || []).map(d => String(d._id));

describe('W1563 — documents bulk-list visibility scoping', () => {
  it('GET / — restricted user sees own + shared + public, NOT others', async () => {
    const r = await request(app).get('/api/documents?limit=100');
    expect(r.status).toBe(200);
    const got = ids(r.body);
    expect(got).toEqual(expect.arrayContaining([String(docOwn), String(docShared), String(docPublic)]));
    expect(got).not.toContain(String(docOther));
  });

  it('GET / — cross-branch role sees all documents', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get('/api/documents?limit=100');
    expect(r.status).toBe(200);
    expect(ids(r.body)).toContain(String(docOther));
  });

  it('GET /search — restricted user search excludes others-only docs', async () => {
    const r = await request(app).get('/api/documents/search?q=doc&limit=100');
    expect(r.status).toBe(200);
    const got = ids(r.body);
    expect(got).toContain(String(docOwn));
    expect(got).not.toContain(String(docOther));
  });

  it('GET /entity/Beneficiary/:id — restricted user 403s on a foreign-branch beneficiary', async () => {
    const r = await request(app).get(`/api/documents/entity/Beneficiary/${benB}`);
    expect(r.status).toBe(403);
  });

  it('static: bulk reads apply visibility + entity enforces beneficiary branch', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'documents.routes.js'), 'utf8');
    expect((src.match(/applyVisibility\(filter, req\)/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/enforceBeneficiaryBranch\(req, req\.params\.id\)/);
  });
});
