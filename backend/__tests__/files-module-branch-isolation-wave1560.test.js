'use strict';

/**
 * files-module-branch-isolation-wave1560.test.js — W1560
 *
 * routes/files-module.routes.js serves FileRecord/FileFolder (medical reports,
 * assessment reports, beneficiary files — PHI). Both models carry snake_case
 * branch_id (stamped on create via effectiveBranchScope), but every read/download/
 * update/delete query omitted the branch filter — any authenticated user could
 * download/list/edit/delete another branch's files by id. (branchFilter() emits
 * camelCase branchId → phantom no-op on these snake_case models, so the fix scopes
 * with snake branch_id via a local scopeF() helper.) PUT also mass-assigned req.body.
 *
 * Behavioral (mocked auth + scope): foreign-branch download/get/update/delete → 404;
 * own → 200; list scoped; PUT cannot reassign branch_id. + static guard.
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
}));
// effectiveBranchScope reads req.branchScope; requireBranchAccess sets it. Mock both to
// drive a deterministic restricted/cross scope. effectiveBranchScope returns the branch
// id when restricted, null when cross-branch (matches the real helper's contract).
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
  branchFilter: () => ({}),
}));
jest.mock('../middleware/assertBranchMatch', () => ({
  effectiveBranchScope: req => (req.branchScope && req.branchScope.branchId ? req.branchScope.branchId : null),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const benB = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let FileRecord;
let fileA;
let fileB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1560-files' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  FileRecord = require('../models/documents/FileRecord');
  require('../models/documents/FileFolder');
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  if (!mongoose.models.User) mongoose.model('User', stub);
  app = express();
  app.use(express.json());
  app.use('/api/files-module', require('../routes/files-module.routes'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));

  const seed = async (branch_id, extra = {}) =>
    (
      await FileRecord.collection.insertOne({
        title_ar: 'ملف',
        category: 'medical_report',
        file_path: 'x/y-' + Math.random().toString(36).slice(2),
        branch_id,
        deleted_at: null,
        reference_type: 'Beneficiary',
        reference_id: branch_id === BRANCH_B ? benB : new mongoose.Types.ObjectId(),
        ...extra,
      })
    ).insertedId;
  fileA = await seed(BRANCH_A);
  fileB = await seed(BRANCH_B);
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), role: 'manager' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1560 — files-module branch isolation', () => {
  it('GET /files/:id/download — restricted user 404s on a foreign-branch file', async () => {
    const r = await request(app).get(`/api/files-module/files/${fileB}/download`);
    expect(r.status).toBe(404);
  });

  it('GET /files/:id — restricted user 404s on a foreign-branch file', async () => {
    const r = await request(app).get(`/api/files-module/files/${fileB}`);
    expect(r.status).toBe(404);
  });

  it('GET /files/:id — restricted user reads its own-branch file', async () => {
    const r = await request(app).get(`/api/files-module/files/${fileA}`);
    expect(r.status).toBe(200);
    expect(String(r.body.data._id)).toBe(String(fileA));
  });

  it('GET /files — list returns only own-branch files', async () => {
    const r = await request(app).get('/api/files-module/files');
    expect(r.status).toBe(200);
    const ids = r.body.data.map(f => String(f._id));
    expect(ids).toContain(String(fileA));
    expect(ids).not.toContain(String(fileB));
  });

  it('PUT /files/:id — restricted user 404s on a foreign-branch file', async () => {
    const r = await request(app).put(`/api/files-module/files/${fileB}`).send({ title_ar: 'hacked' });
    expect(r.status).toBe(404);
  });

  it('PUT /files/:id — cannot reassign branch_id via body (mass-assign blocked)', async () => {
    const r = await request(app)
      .put(`/api/files-module/files/${fileA}`)
      .send({ title_ar: 'updated', branch_id: String(BRANCH_B) });
    expect(r.status).toBe(200);
    expect(String(r.body.data.branch_id)).toBe(String(BRANCH_A));
  });

  it('DELETE /files/:id — restricted user 404s on a foreign-branch file', async () => {
    const r = await request(app).delete(`/api/files-module/files/${fileB}`);
    expect(r.status).toBe(404);
  });

  it('GET /files — cross-branch role sees all branches', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get('/api/files-module/files');
    expect(r.status).toBe(200);
    const ids = r.body.data.map(f => String(f._id));
    expect(ids).toContain(String(fileA));
    expect(ids).toContain(String(fileB));
  });

  it('static: every FileRecord/FileFolder query scopes by branch', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'files-module.routes.js'), 'utf8');
    expect((src.match(/scopeF\(req\)/g) || []).length).toBeGreaterThanOrEqual(12);
  });
});
