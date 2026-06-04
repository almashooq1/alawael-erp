'use strict';

/**
 * kitchen-routes-branch-isolation-wave876.test.js — W876.
 * DailyMenu / MealService / KitchenInventory use legacy `center` (ref Branch).
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
}));

let mongod;
let DailyMenu;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const dietitianA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'dietitian',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/kitchen', require('../routes/kitchen.routes'));
  return app;
}

async function seedMenu(center) {
  return DailyMenu.create({ date: new Date('2026-06-04'), center, status: 'draft' });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w876-kitchen' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ DailyMenu } = require('../models/kitchen.model'));
});

beforeEach(() => {
  mockAuthState.user = dietitianA;
});

afterEach(async () => {
  await DailyMenu.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W876 — daily menu center isolation', () => {
  it('POST /daily-menus stamps center from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/kitchen/daily-menus')
      .send({ date: '2026-06-05' });
    expect(res.status).toBe(201);
    expect(String(res.body.data.center)).toBe(String(BRANCH_A));
  });

  it('PUT /daily-menus/:id → 404 on foreign center', async () => {
    const row = await seedMenu(BRANCH_B);
    const res = await request(buildApp())
      .put(`/api/v1/kitchen/daily-menus/${row._id}`)
      .send({ notes: 'x' });
    expect(res.status).toBe(404);
  });

  it('GET /daily-menus list is center-scoped', async () => {
    await seedMenu(BRANCH_A);
    await seedMenu(BRANCH_B);
    const res = await request(buildApp()).get('/api/v1/kitchen/daily-menus');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
