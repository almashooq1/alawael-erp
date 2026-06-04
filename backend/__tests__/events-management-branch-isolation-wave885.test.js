'use strict';

/** events-management-branch-isolation-wave885.test.js — W885 */

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
  authorize: () => (req, res, next) => {
    const role = req.user && req.user.role;
    if (['event_coordinator', 'manager', 'admin'].includes(role)) return next();
    return res.status(403).json({ success: false });
  },
}));

let mongod;
let Event;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const coordinatorA = {
  _id: new mongoose.Types.ObjectId(),
  role: 'event_coordinator',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/events-management', require('../routes/events-management.routes'));
  return app;
}

async function seedEvent(branchId) {
  return Event.create({
    eventCode: `EV-${Math.random().toString(36).slice(2, 8)}`,
    titleAr: 'فعالية',
    startDate: new Date(Date.now() + 86400000),
    endDate: new Date(Date.now() + 172800000),
    branchId,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w885-events' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ({ Event } = require('../_archived/dead-models/EventManagement'));
});

beforeEach(() => {
  mockAuthState.user = coordinatorA;
});

afterEach(async () => {
  await Event.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W885 — POST stamps caller branch', () => {
  it('creates event with branchId from caller scope (201)', async () => {
    const res = await request(buildApp())
      .post('/api/v1/events-management')
      .send({
        eventCode: 'EV-NEW',
        titleAr: 'جديد',
        startDate: new Date(Date.now() + 86400000),
        endDate: new Date(Date.now() + 172800000),
      });
    expect(res.status).toBe(201);
    expect(String(res.body.data.branchId)).toBe(String(BRANCH_A));
  });
});

describe('W885 — GET / list isolation', () => {
  it('returns only caller-branch events', async () => {
    await seedEvent(BRANCH_A);
    await seedEvent(BRANCH_B);
    const res = await request(buildApp()).get('/api/v1/events-management');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('W885 — PUT /:id isolation', () => {
  it('returns 404 for foreign-branch event (IDOR regression)', async () => {
    const row = await seedEvent(BRANCH_B);
    const res = await request(buildApp())
      .put(`/api/v1/events-management/${row._id}`)
      .send({ titleAr: 'x' });
    expect(res.status).toBe(404);
  });
});
