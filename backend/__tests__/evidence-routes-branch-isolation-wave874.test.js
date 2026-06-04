'use strict';

/**
 * evidence-routes-branch-isolation-wave874.test.js — W874.
 *
 * EvidenceItem carries branchId. Pre-W874 GET /:id had requireBranchAccess
 * but findById/_load ignored branchFilter — verify/revoke/sign paths shared
 * the same leak. Any authenticated user could read or mutate foreign-branch
 * compliance evidence by ObjectId guess. W874 threads scopeFilter through
 * the vault service + listScope on queries.
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

let mongod;
let EvidenceItem;
let createEvidenceVaultService;

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
  app.use('/api/v1/evidence', require('../routes/evidence.routes'));
  return app;
}

let app;

async function seedEvidence(branchId) {
  const svc = createEvidenceVaultService({ model: EvidenceItem });
  return svc.ingest(
    {
      title: 'تقرير',
      type: 'audit_finding',
      sourceModule: 'quality',
      branchId,
      buffer: Buffer.from('evidence-body'),
      file: { storageClass: 'inline', mimeType: 'text/plain' },
    },
    USER_A
  );
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w874-evidence' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  EvidenceItem = require('../models/quality/EvidenceItem.model');
  ({ createEvidenceVaultService } = require('../services/quality/evidenceVault.service'));
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = qualityManagerA;
});

afterEach(async () => {
  await EvidenceItem.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W874 — ingest stamps caller branch', () => {
  it('POST / stamps branchId from caller scope (201)', async () => {
    const res = await request(app)
      .post('/api/v1/evidence')
      .send({
        title: 'دليل امتثال',
        type: 'audit_finding',
        sourceModule: 'quality',
        buffer: Buffer.from('x').toString('base64'),
      });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W874 — list is branch-scoped', () => {
  it('GET / only returns caller-branch items', async () => {
    await seedEvidence(BRANCH_A);
    await seedEvidence(BRANCH_B);
    const res = await request(app).get('/api/v1/evidence');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('W874 — GET /:id branch isolation', () => {
  it('returns 404 for foreign-branch evidence (IDOR regression)', async () => {
    const row = await seedEvidence(BRANCH_B);
    const res = await request(app).get(`/api/v1/evidence/${row._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W874 — verify 404 across branches', () => {
  it('POST /:id/verify → 404 on foreign branch', async () => {
    const row = await seedEvidence(BRANCH_B);
    const res = await request(app).post(`/api/v1/evidence/${row._id}/verify`).send({});
    expect(res.status).toBe(404);
  });
});
