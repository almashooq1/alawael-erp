'use strict';

/** waitlist-capacity-optimizer-wave892.test.js — W892 */

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
const adminCross = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'admin',
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
    priority: 3,
    requestedAt: new Date(Date.now() - 7 * 86400000),
    ...overrides,
  });
}

async function seedAppointment(branchId, status, dateOffsetDays, type = 'علاج طبيعي') {
  await Appointment.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    type,
    date: new Date(Date.now() + dateOffsetDays * 86400000),
    startTime: '09:00',
    status,
    branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w892-optimizer' } });
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

describe('W892 — waitlist capacity optimizer', () => {
  it('scopes recommendations to caller branch', async () => {
    const a1 = await seedWaiter(BRANCH_A, {
      priority: 1,
      requestedAt: new Date(Date.now() - 20 * 86400000),
    });
    await seedWaiter(BRANCH_A, { priority: 3 });
    const b1 = await seedWaiter(BRANCH_B, {
      priority: 1,
      requestedAt: new Date(Date.now() - 30 * 86400000),
    });

    await seedAppointment(BRANCH_A, 'COMPLETED', -21);
    await seedAppointment(BRANCH_A, 'COMPLETED', -18);
    await seedAppointment(BRANCH_A, 'COMPLETED', -14);
    await seedAppointment(BRANCH_A, 'COMPLETED', -7);
    await seedAppointment(BRANCH_A, 'NO_SHOW', -5);
    await seedAppointment(BRANCH_A, 'PENDING', 3);

    await seedAppointment(BRANCH_B, 'COMPLETED', -8);
    await seedAppointment(BRANCH_B, 'COMPLETED', -6);
    await seedAppointment(BRANCH_B, 'COMPLETED', -4);
    await seedAppointment(BRANCH_B, 'PENDING', 2);

    const res = await request(buildApp()).get('/api/admin/waitlist/optimizer/recommendations');
    expect(res.status).toBe(200);
    expect(res.body.summary.waitingCount).toBe(2);
    expect(res.body.recommendations.length).toBeGreaterThan(0);
    const recommendedIds = res.body.recommendations.map(r => String(r.entryId));
    expect(recommendedIds).toContain(String(a1._id));
    expect(recommendedIds).not.toContain(String(b1._id));
  });

  it('allows cross-branch admin to see recommendations from all branches', async () => {
    mockAuthState.user = adminCross;
    const a1 = await seedWaiter(BRANCH_A, {
      priority: 1,
      requestedAt: new Date(Date.now() - 20 * 86400000),
    });
    const b1 = await seedWaiter(BRANCH_B, {
      priority: 1,
      requestedAt: new Date(Date.now() - 18 * 86400000),
    });

    await seedAppointment(BRANCH_A, 'COMPLETED', -14);
    await seedAppointment(BRANCH_A, 'COMPLETED', -9);
    await seedAppointment(BRANCH_A, 'COMPLETED', -6);
    await seedAppointment(BRANCH_A, 'COMPLETED', -3);

    await seedAppointment(BRANCH_B, 'COMPLETED', -14);
    await seedAppointment(BRANCH_B, 'COMPLETED', -10);
    await seedAppointment(BRANCH_B, 'COMPLETED', -6);
    await seedAppointment(BRANCH_B, 'COMPLETED', -2);

    const res = await request(buildApp())
      .get('/api/admin/waitlist/optimizer/recommendations')
      .query({ historyDays: 28, days: 14 });

    expect(res.status).toBe(200);
    const ids = res.body.recommendations.map(r => String(r.entryId));
    expect(ids).toContain(String(a1._id));
    expect(ids).toContain(String(b1._id));
  });
});
