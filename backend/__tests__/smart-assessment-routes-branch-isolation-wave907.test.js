'use strict';

/** smart-assessment-routes-branch-isolation-wave907.test.js — W907 */

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
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

let mongod;
let assessmentB;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/smart-assessment', require('../routes/smart-assessment-engine.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w907-smart-assessment' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const { MChatAssessment } = require('../models/clinical-assessment-battery.model');
  await mongoose.connection.collection('beneficiaries').insertMany([
    { _id: BENE_A, branchId: BRANCH_A, status: 'active' },
    { _id: BENE_B, branchId: BRANCH_B, status: 'active' },
  ]);
  await MChatAssessment.collection.insertOne({
    beneficiary: BENE_A,
    status: 'completed',
    items: [],
  });
  const ins = await MChatAssessment.collection.insertOne({
    beneficiary: BENE_B,
    status: 'completed',
    items: [],
  });
  assessmentB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W907 — smart assessment isolation', () => {
  it('lists only in-scope mchat assessments', async () => {
    const res = await request(buildApp()).get('/api/smart-assessment/list/mchat');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('returns 404 for foreign-branch GET /detail/mchat/:id', async () => {
    const res = await request(buildApp()).get(`/api/smart-assessment/detail/mchat/${assessmentB}`);
    expect(res.status).toBe(404);
  });
});
