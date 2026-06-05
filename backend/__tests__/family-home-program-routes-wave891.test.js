'use strict';

/** family-home-program-routes-wave891.test.js — W891 */

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
    if (!Array.isArray(roles) || roles.includes(req.user?.role)) return next();
    return res.status(403).json({ success: false, message: 'forbidden' });
  },
}));

let mongod;
let FamilyHomeProgram;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const MANAGER_A = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'manager',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/family-home-program', require('../routes/family-home-program.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w891-family-home-program' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  FamilyHomeProgram = require('../models/FamilyHomeProgram');
  Beneficiary = require('../models/Beneficiary');

  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A, status: 'active' });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B, status: 'active' });
});

beforeEach(() => {
  mockAuthState.user = MANAGER_A;
});

afterEach(async () => {
  await FamilyHomeProgram.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W891 — create family home program', () => {
  it('stamps branchId from in-scope beneficiary', async () => {
    const res = await request(buildApp())
      .post('/api/v1/family-home-program')
      .send({
        beneficiaryId: String(BENE_A),
        title: 'برنامج منزلي للنطق',
        startDate: new Date().toISOString(),
        tasks: [{ title: 'تمرين نطق يومي', targetPerWeek: 5 }],
      });

    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
    expect(res.body.data.tasks).toHaveLength(1);
  });

  it('returns 404 when beneficiary is outside caller branch', async () => {
    const res = await request(buildApp())
      .post('/api/v1/family-home-program')
      .send({
        beneficiaryId: String(BENE_B),
        title: 'برنامج منزلي',
        startDate: new Date().toISOString(),
      });

    expect(res.status).toBe(404);
  });
});

describe('W891 — instance scope', () => {
  it('returns 404 when logging task completion for foreign-branch program', async () => {
    const program = await FamilyHomeProgram.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      title: 'برنامج خارجي',
      startDate: new Date(),
      tasks: [{ title: 'مهمة خارجية', targetPerWeek: 3 }],
    });

    const taskId = program.tasks[0]._id;
    const res = await request(buildApp()).post(
      `/api/v1/family-home-program/${program._id}/tasks/${taskId}/log`
    );

    expect(res.status).toBe(404);
  });

  it('returns only in-scope beneficiary programs', async () => {
    await FamilyHomeProgram.create({
      beneficiaryId: BENE_A,
      branchId: BRANCH_A,
      title: 'برنامج أ',
      startDate: new Date(),
      tasks: [{ title: 'مهمة أ', targetPerWeek: 3 }],
    });
    await FamilyHomeProgram.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      title: 'برنامج ب',
      startDate: new Date(),
      tasks: [{ title: 'مهمة ب', targetPerWeek: 3 }],
    });

    const res = await request(buildApp()).get(`/api/v1/family-home-program/beneficiary/${BENE_A}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(String(res.body.data[0].beneficiaryId)).toBe(String(BENE_A));
  });
});
