'use strict';

/**
 * quality-enhanced-branch-isolation-wave923.test.js — W923.
 *
 * Pre-W923 quality-enhanced lists honoured ?branchId= spoofing and instance
 * routes used bare findById/findByIdAndUpdate. Real branchScope + MongoMemoryServer.
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
  authorize:
    (..._roles) =>
    (_req, _res, next) =>
      next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const qualityManagerA = {
  _id: USER_A,
  role: 'quality_manager',
  branchId: String(BRANCH_A),
};

let mongod;
let Incident;
let Complaint;
let incidentB;
let complaintB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w923-quality-enhanced' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/User');
  ({ Incident, Complaint } = require('../models/QualityModels'));

  const appExpress = express();
  appExpress.use(express.json());
  appExpress.use('/api/v1/quality-enhanced', require('../routes/quality-enhanced.routes'));
  app = appExpress;

  const now = new Date();
  await Incident.collection.insertOne({
    incidentNumber: 'INC-W923-A',
    branchId: BRANCH_A,
    reportedBy: USER_A,
    type: 'near_miss',
    severity: 'minor',
    category: 'operational',
    occurredAt: now,
    location: 'قاعة A',
    description: 'حادث فرع أ',
  });
  const insB = await Incident.collection.insertOne({
    incidentNumber: 'INC-W923-B',
    branchId: BRANCH_B,
    reportedBy: USER_A,
    type: 'fall',
    severity: 'major',
    category: 'patient_safety',
    occurredAt: now,
    location: 'قاعة B',
    description: 'حادث فرع ب',
  });
  incidentB = insB.insertedId;

  await Complaint.collection.insertOne({
    complaintNumber: 'CMP-W923-A',
    branchId: BRANCH_A,
    source: 'employee',
    category: 'service_quality',
    description: 'شكوى فرع أ',
  });
  const cmpB = await Complaint.collection.insertOne({
    complaintNumber: 'CMP-W923-B',
    branchId: BRANCH_B,
    source: 'beneficiary',
    category: 'waiting_time',
    description: 'شكوى فرع ب',
  });
  complaintB = cmpB.insertedId;
});

beforeEach(() => {
  mockAuthState.user = qualityManagerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W923 — quality-enhanced branch isolation', () => {
  it('lists only in-scope incidents', async () => {
    const res = await request(app).get('/api/v1/quality-enhanced/incidents');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('rejects foreign ?branchId= on incident list (requireBranchAccess)', async () => {
    const res = await request(app)
      .get('/api/v1/quality-enhanced/incidents')
      .query({ branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
  });

  it('returns 404 for foreign incident GET /incidents/:id', async () => {
    const res = await request(app).get(`/api/v1/quality-enhanced/incidents/${incidentB}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for foreign incident PUT /incidents/:id', async () => {
    const res = await request(app)
      .put(`/api/v1/quality-enhanced/incidents/${incidentB}`)
      .send({ description: 'محاولة تعديل' });
    expect(res.status).toBe(404);
  });

  it('lists only in-scope complaints', async () => {
    const res = await request(app).get('/api/v1/quality-enhanced/complaints');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign complaint GET /complaints/:id', async () => {
    const res = await request(app).get(`/api/v1/quality-enhanced/complaints/${complaintB}`);
    expect(res.status).toBe(404);
  });

  it('denies foreign branch dashboard GET /dashboard/:branchId', async () => {
    const res = await request(app).get(`/api/v1/quality-enhanced/dashboard/${BRANCH_B}`);
    expect(res.status).toBe(403);
  });

  it('denies foreign branch risk matrix GET /risks/matrix/:branchId', async () => {
    const res = await request(app).get(`/api/v1/quality-enhanced/risks/matrix/${BRANCH_B}`);
    expect(res.status).toBe(403);
  });
});
