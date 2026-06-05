'use strict';

/** strategic-planning-branch-isolation-wave915.test.js — W915 */

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

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const managerA = {
  _id: new mongoose.Types.ObjectId(),
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let goalB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w915-strategic' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const StrategicGoal = require('../models/StrategicGoal');
  app = express();
  app.use(express.json());
  app.use('/api/v1/strategic-planning', require('../routes/strategicPlanning.routes'));

  await StrategicGoal.collection.insertOne({
    title: 'هدف أ',
    perspective: 'financial',
    status: 'active',
    branchId: BRANCH_A,
  });
  const ins = await StrategicGoal.collection.insertOne({
    title: 'هدف ب',
    perspective: 'customer',
    status: 'active',
    branchId: BRANCH_B,
  });
  goalB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W915 — strategic planning isolation', () => {
  it('lists only in-scope goals', async () => {
    const res = await request(app).get('/api/v1/strategic-planning/goals');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch goal GET /goals/:id', async () => {
    const res = await request(app).get(`/api/v1/strategic-planning/goals/${goalB}`);
    expect(res.status).toBe(404);
  });
});
