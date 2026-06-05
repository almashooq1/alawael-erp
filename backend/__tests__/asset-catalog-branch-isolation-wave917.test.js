'use strict';

/** asset-catalog-branch-isolation-wave917.test.js — W917 */

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
const USER_A = new mongoose.Types.ObjectId();

const managerA = {
  _id: USER_A,
  id: String(USER_A),
  role: 'manager',
  branchId: String(BRANCH_A),
};

let mongod;
let assetB;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w917-asset' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const Asset = require('../models/Asset');
  app = express();
  app.use(express.json());
  app.use('/api/v1/asset-management', require('../routes/asset-management.routes'));

  await Asset.collection.insertOne({
    name: 'أصل أ',
    category: 'equipment',
    status: 'inactive',
    branchId: BRANCH_A,
    createdBy: USER_A,
  });
  const ins = await Asset.collection.insertOne({
    name: 'أصل ب',
    category: 'office',
    status: 'inactive',
    branchId: BRANCH_B,
    createdBy: USER_A,
  });
  assetB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W917 — asset catalog isolation', () => {
  it('lists only in-scope assets', async () => {
    const res = await request(app).get('/api/v1/asset-management/assets');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch asset GET /assets/:id', async () => {
    const res = await request(app).get(`/api/v1/asset-management/assets/${assetB}`);
    expect(res.status).toBe(404);
  });
});
