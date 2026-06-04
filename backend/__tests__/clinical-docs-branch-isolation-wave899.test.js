'use strict';

/** clinical-docs-branch-isolation-wave899.test.js — W899 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const DOC_A = new mongoose.Types.ObjectId();
const DOC_B = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/clinical-docs', require('../routes/clinical-docs.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w899-clinical-docs' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  await mongoose.connection.collection('beneficiaries').insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
  await mongoose.connection.collection('documents').insertMany([
    {
      _id: DOC_A,
      fileName: 'a.pdf',
      originalFileName: 'a.pdf',
      fileType: 'pdf',
      fileSize: 100,
      filePath: '/uploads/clinical-docs/a.pdf',
      title: 'تقرير أ',
      metadata: { beneficiary: BENE_A },
      uploadedBy: therapistA.id,
      isLatestVersion: true,
    },
    {
      _id: DOC_B,
      fileName: 'b.pdf',
      originalFileName: 'b.pdf',
      fileType: 'pdf',
      fileSize: 100,
      filePath: '/uploads/clinical-docs/b.pdf',
      title: 'تقرير ب',
      metadata: { beneficiary: BENE_B },
      uploadedBy: therapistA.id,
      isLatestVersion: true,
    },
  ]);
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W899 — GET /:id isolation', () => {
  it('allows in-scope beneficiary-linked document', async () => {
    const res = await request(buildApp()).get(`/api/admin/clinical-docs/${DOC_A}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(DOC_A));
  });

  it('returns 404 for foreign-branch beneficiary document', async () => {
    const res = await request(buildApp()).get(`/api/admin/clinical-docs/${DOC_B}`);
    expect(res.status).toBe(404);
  });
});
