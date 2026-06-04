'use strict';

/** waitlist-schedule-suggestions-wave894.test.js — W894 */

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

function dateKey(d) {
  return new Date(d).toISOString().slice(0, 10);
}

async function seedWaiter(branchId, overrides = {}) {
  return WaitingListEntry.create({
    serviceType: 'علاج طبيعي',
    prospectName: 'waiting',
    prospectPhone: '0500000000',
    branchId,
    status: 'waiting',
    priority: 2,
    requestedAt: new Date(Date.now() - 10 * 86400000),
    ...overrides,
  });
}

async function seedAppointment(
  branchId,
  status,
  dateOffsetDays,
  type = 'علاج طبيعي',
  startTime = '09:00'
) {
  await Appointment.collection.insertOne({
    _id: new mongoose.Types.ObjectId(),
    type,
    date: new Date(Date.now() + dateOffsetDays * 86400000),
    startTime,
    status,
    branchId,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w894-schedule-suggestions' } });
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

describe('W894 — schedule suggestions optimizer', () => {
  it('scopes suggestions to caller branch and avoids occupied slots', async () => {
    const a1 = await seedWaiter(BRANCH_A, { priority: 1 });
    const b1 = await seedWaiter(BRANCH_B, { priority: 1 });

    await seedAppointment(BRANCH_A, 'COMPLETED', -20);
    await seedAppointment(BRANCH_A, 'COMPLETED', -14);
    await seedAppointment(BRANCH_A, 'COMPLETED', -7);
    await seedAppointment(BRANCH_A, 'COMPLETED', -3);
    await seedAppointment(BRANCH_A, 'PENDING', 1, 'علاج طبيعي', '09:00');

    await seedAppointment(BRANCH_B, 'COMPLETED', -20);
    await seedAppointment(BRANCH_B, 'COMPLETED', -8);

    const blockedDate = dateKey(new Date(Date.now() + 1 * 86400000));
    const res = await request(buildApp())
      .get('/api/admin/waitlist/optimizer/schedule-suggestions')
      .query({ windowsPerEntry: 4, limit: 10 });

    expect(res.status).toBe(200);
    const ids = res.body.data.map(r => String(r.entryId));
    expect(ids).toContain(String(a1._id));
    expect(ids).not.toContain(String(b1._id));

    const first = res.body.data.find(r => String(r.entryId) === String(a1._id));
    expect(first.suggestedWindows.length).toBeGreaterThan(0);
    const blockedWindowHit = first.suggestedWindows.some(
      w => w.date === blockedDate && w.startTime === '09:00'
    );
    expect(blockedWindowHit).toBe(false);
  });

  it('allows cross-branch admin to receive suggestions for all branches', async () => {
    mockAuthState.user = adminCross;
    const a1 = await seedWaiter(BRANCH_A, { priority: 1 });
    const b1 = await seedWaiter(BRANCH_B, { priority: 1 });

    await seedAppointment(BRANCH_A, 'COMPLETED', -14);
    await seedAppointment(BRANCH_A, 'COMPLETED', -9);
    await seedAppointment(BRANCH_A, 'COMPLETED', -6);
    await seedAppointment(BRANCH_A, 'COMPLETED', -2);

    await seedAppointment(BRANCH_B, 'COMPLETED', -14);
    await seedAppointment(BRANCH_B, 'COMPLETED', -10);
    await seedAppointment(BRANCH_B, 'COMPLETED', -6);
    await seedAppointment(BRANCH_B, 'COMPLETED', -2);

    const res = await request(buildApp())
      .get('/api/admin/waitlist/optimizer/schedule-suggestions')
      .query({ windowsPerEntry: 2, limit: 10 });

    expect(res.status).toBe(200);
    const ids = res.body.data.map(r => String(r.entryId));
    expect(ids).toContain(String(a1._id));
    expect(ids).toContain(String(b1._id));
  });
});
