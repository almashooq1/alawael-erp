'use strict';

/** waitlist-offer-batch-wave893.test.js — W893 */

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
let WaitingListEntry;
let Appointment;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const receptionistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'receptionist',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/admin/waitlist', require('../routes/waitlist-admin.routes'));
  return app;
}

async function seedWaiter(branchId, overrides = {}) {
  return WaitingListEntry.create({
    serviceType: 'علاج طبيعي',
    prospectName: 'waiting',
    prospectPhone: '0500000000',
    branchId,
    status: 'waiting',
    priority: 2,
    requestedAt: new Date(Date.now() - 14 * 86400000),
    ...overrides,
  });
}

async function seedCompleted(branchId, daysAgo) {
  await Appointment.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    type: 'علاج طبيعي',
    date: new Date(Date.now() - daysAgo * 86400000),
    startTime: '10:00',
    status: 'COMPLETED',
    branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w893-offer-batch' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  WaitingListEntry = require('../models/WaitingListEntry');
  Appointment = require('../models/Appointment');
});

beforeEach(async () => {
  mockAuthState.user = receptionistA;
  await WaitingListEntry.deleteMany({});
  await Appointment.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W893 — optimizer offer batch', () => {
  it('dryRun previews scoped rows without status mutation', async () => {
    const a = await seedWaiter(BRANCH_A, { priority: 1 });
    await seedWaiter(BRANCH_B, { priority: 1 });
    await seedCompleted(BRANCH_A, 14);
    await seedCompleted(BRANCH_A, 7);
    await seedCompleted(BRANCH_A, 2);

    const res = await request(buildApp()).post('/api/admin/waitlist/optimizer/offer-batch').send({
      limit: 5,
    });

    expect(res.status).toBe(200);
    expect(res.body.dryRun).toBe(true);
    expect(res.body.selectedCount).toBeGreaterThan(0);
    expect(String(res.body.selected[0].entryId)).toBe(String(a._id));

    const row = await WaitingListEntry.findById(a._id).lean();
    expect(row.status).toBe('waiting');
  });

  it('apply=true offers only scoped waiting rows', async () => {
    const a = await seedWaiter(BRANCH_A, { priority: 1 });
    const b = await seedWaiter(BRANCH_B, { priority: 1 });
    await seedCompleted(BRANCH_A, 14);
    await seedCompleted(BRANCH_A, 10);
    await seedCompleted(BRANCH_A, 6);
    await seedCompleted(BRANCH_A, 2);

    const res = await request(buildApp()).post('/api/admin/waitlist/optimizer/offer-batch').send({
      apply: true,
      limit: 3,
    });

    expect(res.status).toBe(200);
    expect(res.body.dryRun).toBe(false);
    expect(res.body.offeredCount).toBe(1);

    const updatedA = await WaitingListEntry.findById(a._id).lean();
    const updatedB = await WaitingListEntry.findById(b._id).lean();
    expect(updatedA.status).toBe('offered');
    expect(updatedB.status).toBe('waiting');
  });
});
