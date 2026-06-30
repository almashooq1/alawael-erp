'use strict';

/**
 * medical-files-download-branch-isolation-wave1561.test.js — W1561
 *
 * routes/medicalFiles.js `GET /download/:documentId` streamed Document.findById(id)
 * with NO ownership/branch check — any authenticated user could download any
 * beneficiary's medical file (report/lab/radiology) by enumerating ObjectIds. The
 * canonical Document model has no branchId, but these files are entityType:'Beneficiary'
 * (upload is already bodyScopedBeneficiaryGuard'd), so the fix enforces branch via the
 * linked beneficiary (enforceBeneficiaryBranch), mapping its thrown status explicitly.
 *
 * Behavioral (mocked auth + scope + storage; REAL enforceBeneficiaryBranch against
 * seeded beneficiaries): foreign-branch download → 403; own → 200; cross-branch → 200.
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
jest.mock('../services/storage/storage.service', () => ({
  exists: async () => true,
  download: async () => Buffer.from('PHI-BYTES'),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const benA = new mongoose.Types.ObjectId();
const benB = new mongoose.Types.ObjectId();
const scopeA = { restricted: true, branchId: BRANCH_A, allBranches: false };
const scopeCross = { restricted: false, branchId: null, allBranches: true };

let mongod;
let app;
let docA;
let docB;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1561-medfiles' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const Document = require('../models/Document');
  // Beneficiary model is loaded by enforceBeneficiaryBranch via mongoose.model('Beneficiary')
  const benSchema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId }, { strict: false });
  if (!mongoose.models.Beneficiary) mongoose.model('Beneficiary', benSchema);
  const Beneficiary = mongoose.model('Beneficiary');
  await Beneficiary.collection.insertOne({ _id: benA, branchId: BRANCH_A, name: 'A' });
  await Beneficiary.collection.insertOne({ _id: benB, branchId: BRANCH_B, name: 'B' });

  const seedDoc = async beneficiaryId =>
    (
      await Document.collection.insertOne({
        entityType: 'Beneficiary',
        entityId: beneficiaryId,
        filePath: 'med/' + Math.random().toString(36).slice(2),
        originalFileName: 'report.pdf',
        mimeType: 'application/pdf',
        storageProvider: 'local',
      })
    ).insertedId;
  docA = await seedDoc(benA);
  docB = await seedDoc(benB);

  app = express();
  app.use(express.json());
  app.use('/api/medical-files', require('../routes/medicalFiles'));
  app.use((err, req, res, _next) => res.status(err.status || 500).json({ error: err.message }));
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: String(new mongoose.Types.ObjectId()), role: 'manager' };
  mockScope.s = scopeA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1561 — medical-files download branch isolation', () => {
  it('GET /download/:id — restricted user 403s on a foreign-branch beneficiary file', async () => {
    const r = await request(app).get(`/api/medical-files/download/${docB}`);
    expect(r.status).toBe(403);
  });

  it('GET /download/:id — restricted user downloads its own-branch file', async () => {
    const r = await request(app).get(`/api/medical-files/download/${docA}`);
    expect(r.status).toBe(200);
  });

  it('GET /download/:id — cross-branch role downloads any beneficiary file', async () => {
    mockScope.s = scopeCross;
    const r = await request(app).get(`/api/medical-files/download/${docB}`);
    expect(r.status).toBe(200);
  });

  it('static: download enforces beneficiary branch', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'medicalFiles.js'), 'utf8');
    expect(src).toMatch(/enforceBeneficiaryBranch\(req, doc\.entityId\)/);
  });
});
