'use strict';

/** clinical-pathway-routes-wave896.test.js — W896 */

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
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

let mongod;
let ClinicalPathwayPlan;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();

const managerA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/clinical-pathway', require('../routes/clinical-pathway.routes'));
  return app;
}

function pathwayPayload(beneficiaryId) {
  return {
    beneficiaryId: String(beneficiaryId),
    pathwayType: 'AUTISM_EARLY_INTERVENTION',
    startDate: new Date().toISOString(),
    stages: [
      { code: 'ASSESSMENT', title: 'تقييم أولي', order: 1, targetDays: 7 },
      { code: 'INTERVENTION', title: 'تدخل مكثف', order: 2, targetDays: 30 },
    ],
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w896-clinical-pathway' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ClinicalPathwayPlan = require('../models/ClinicalPathwayPlan');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A, status: 'active' });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B, status: 'active' });
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterEach(async () => {
  await ClinicalPathwayPlan.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W896 — create clinical pathway', () => {
  it('stamps branchId from in-scope beneficiary', async () => {
    const res = await request(buildApp())
      .post('/api/v1/clinical-pathway')
      .send(pathwayPayload(BENE_A));
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
    expect(res.body.data.currentStageCode).toBe('ASSESSMENT');
  });

  it('returns 404 when beneficiary is outside caller branch', async () => {
    const res = await request(buildApp())
      .post('/api/v1/clinical-pathway')
      .send(pathwayPayload(BENE_B));
    expect(res.status).toBe(404);
  });
});

describe('W896 — instance isolation + progress', () => {
  it('returns 404 when completing a foreign-branch stage', async () => {
    const doc = await ClinicalPathwayPlan.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      pathwayType: 'GENERIC_REHAB',
      status: 'ACTIVE',
      startDate: new Date(),
      currentStageCode: 'S1',
      stages: [
        { code: 'S1', title: 'S1', order: 1, targetDays: 7 },
        { code: 'S2', title: 'S2', order: 2, targetDays: 7 },
      ],
    });
    const stageId = doc.stages[0]._id;
    const res = await request(buildApp()).patch(
      `/api/v1/clinical-pathway/${doc._id}/stages/${stageId}/complete`
    );
    expect(res.status).toBe(404);
  });

  it('computes progress after completing first stage', async () => {
    const createRes = await request(buildApp())
      .post('/api/v1/clinical-pathway')
      .send(pathwayPayload(BENE_A));
    expect(createRes.status).toBe(201);
    const pathwayId = createRes.body.data._id;
    const stageId = createRes.body.data.stages[0]._id;

    const completeRes = await request(buildApp()).patch(
      `/api/v1/clinical-pathway/${pathwayId}/stages/${stageId}/complete`
    );
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.progress.completionPercent).toBe(50);
    expect(completeRes.body.data.pathwayStatus).toBe('ACTIVE');

    const progressRes = await request(buildApp()).get(
      `/api/v1/clinical-pathway/${pathwayId}/progress`
    );
    expect(progressRes.status).toBe(200);
    expect(progressRes.body.data.totalStages).toBe(2);
    expect(progressRes.body.data.completedStages).toBe(1);
    expect(progressRes.body.data.completionPercent).toBe(50);
  });
});
