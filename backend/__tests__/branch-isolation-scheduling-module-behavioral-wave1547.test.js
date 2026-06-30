'use strict';

/**
 * branch-isolation-scheduling-module-behavioral-wave1547.test.js — W1547
 *
 * Behavioral counterpart to the static guard: boots the real router against an
 * in-memory Mongo with the real requireBranchAccess + branchFilter chain, and
 * proves the cross-branch IDOR + PUT mass-assignment are actually closed at
 * runtime (a static guard can't catch a branchFilter edge case).
 *   - restricted user (role 'manager', branchId A) sees ONLY branch A
 *   - restricted user gets 404 on a branch-B appointment by id (read + write)
 *   - PUT cannot mass-assign branch_id / status
 *   - cross-branch role ('admin') sees all branches
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
  authorize: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const USER_A = new mongoose.Types.ObjectId();

const managerA = { _id: USER_A, id: String(USER_A), role: 'manager', branchId: String(BRANCH_A) };
const adminCross = { _id: new mongoose.Types.ObjectId(), id: 'admin-1', role: 'admin' };

let mongod;
let app;
let apptA;
let apptB;

const seed = (branch, suffix) => ({
  appointment_number: `APPT-TEST-${suffix}`,
  beneficiary_id: new mongoose.Types.ObjectId(),
  therapist_id: new mongoose.Types.ObjectId(),
  branch_id: branch,
  service_type: 'speech',
  appointment_date: new Date('2026-07-01T09:00:00Z'),
  start_time: '09:00',
  end_time: '10:00',
  duration_minutes: 60,
  status: 'confirmed',
  deleted_at: null,
});

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1547-sched' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  const Appointment = require('../models/scheduling/Appointment');
  // Register stub schemas for the populate targets the handlers reference, so
  // .populate() resolves (the seeded refs are random ids with no matching docs).
  const stub = new mongoose.Schema({}, { strict: false });
  for (const name of ['Beneficiary', 'Employee', 'Room', 'Branch', 'User']) {
    if (!mongoose.models[name]) mongoose.model(name, stub);
  }
  app = express();
  app.use(express.json());
  app.use('/api/scheduling-module', require('../routes/scheduling-module.routes'));
  app.use((err, req, res, _next) => res.status(500).json({ error: err.message }));

  const a = await Appointment.collection.insertOne(seed(BRANCH_A, 'A'));
  const b = await Appointment.collection.insertOne(seed(BRANCH_B, 'B'));
  apptA = a.insertedId;
  apptB = b.insertedId;
});

beforeEach(() => {
  mockAuthState.user = managerA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1547 — scheduling-module branch isolation (behavioral)', () => {
  it('restricted user lists only their own branch appointments', async () => {
    const res = await request(app).get('/api/scheduling-module/appointments');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branch_id)).toBe(String(BRANCH_A));
  });

  it('restricted user gets 404 on a foreign-branch appointment by id', async () => {
    const res = await request(app).get(`/api/scheduling-module/appointments/${apptB}`);
    expect(res.status).toBe(404);
  });

  it('restricted user CAN read its own-branch appointment by id', async () => {
    const res = await request(app).get(`/api/scheduling-module/appointments/${apptA}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data.branch_id)).toBe(String(BRANCH_A));
  });

  it('PUT cannot mass-assign branch_id or status (notes still applied)', async () => {
    const res = await request(app)
      .put(`/api/scheduling-module/appointments/${apptA}`)
      .send({ branch_id: String(BRANCH_B), status: 'completed', notes: 'edited' });
    expect(res.status).toBe(200);
    expect(String(res.body.data.branch_id)).toBe(String(BRANCH_A));
    expect(res.body.data.status).toBe('confirmed');
    expect(res.body.data.notes).toBe('edited');
  });

  it('PUT cannot reach a foreign-branch appointment (404)', async () => {
    const res = await request(app)
      .put(`/api/scheduling-module/appointments/${apptB}`)
      .send({ notes: 'hacked' });
    expect(res.status).toBe(404);
  });

  it('cross-branch role sees appointments from all branches', async () => {
    mockAuthState.user = adminCross;
    const res = await request(app).get('/api/scheduling-module/appointments');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});
