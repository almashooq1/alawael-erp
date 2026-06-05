'use strict';

/** icf-assessments-branch-isolation-wave906.test.js — W906 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth.middleware', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const clinicianA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

let mongod;
let assessmentB;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/icf-assessments', require('../routes/icf-assessments.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w906-icf' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const M = require('../models/icf/ICFAssessment.model');
  await mongoose.connection.collection('beneficiaries').insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
  await M.collection.insertOne({
    assessmentNumber: 'ICF-A-906',
    beneficiaryId: BENE_A,
    status: 'draft',
    assessmentDate: new Date(),
    isDeleted: false,
  });
  const ins = await M.collection.insertOne({
    assessmentNumber: 'ICF-B-906',
    beneficiaryId: BENE_B,
    status: 'draft',
    assessmentDate: new Date(),
    isDeleted: false,
  });
  assessmentB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = clinicianA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W906 — icf-assessments isolation', () => {
  it('lists only in-scope assessments', async () => {
    const res = await request(buildApp()).get('/api/icf-assessments');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].beneficiaryId)).toBe(String(BENE_A));
  });

  it('returns 404 for foreign-branch GET /:id', async () => {
    const res = await request(buildApp()).get(`/api/icf-assessments/${assessmentB}`);
    expect(res.status).toBe(404);
  });
});
