'use strict';

/**
 * appointments-branch-isolation-wave1583.test.js — W1583
 *
 * routes/appointments.routes.js passed only query/id/body into appointment.service and NO
 * branch scope, so every read/write ran unfiltered → any authenticated user in branch A
 * could list / read / edit / cancel / check-in / convert / delete branch B's appointments
 * (beneficiary PII + lifecycle), and could create an appointment stamped into a foreign
 * branch via req.body.branchId. `requireBranchAccess` does NOT auto-filter. W1583 threads
 * effectiveBranchScope(req) through the service (Appointment.branchId is camelCase ObjectId)
 * and stamps branchId server-side on create.
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
const mockScope = { s: undefined }; // branchId (restricted) or null (cross-branch)

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));
jest.mock('../middleware/assertBranchMatch', () => ({
  effectiveBranchScope: () => mockScope.s,
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let Appointment;
const ids = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1583-appts' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  // Route → service requires Appointment/TherapySession/TherapyRoom/TherapistAvailability.
  // getAppointment/list populate beneficiary(→Beneficiary) + therapist(→Employee); stub those.
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['Beneficiary', 'Employee']) if (!mongoose.models[n]) mongoose.model(n, stub);
  Appointment = require('../models/Appointment');
  app = express();
  app.use(express.json());
  app.use('/api/appointments', require('../routes/appointments.routes'));
  app.use((err, _req, res, _next) =>
    res.status(err.statusCode || err.status || 500).json({ error: err.message, code: err.code })
  );
});

beforeEach(async () => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'admin' };
  mockScope.s = BRANCH_A; // default: restricted to branch A
  await Appointment.deleteMany({});
  const seed = branchId =>
    Appointment.collection.insertOne({
      branchId,
      beneficiary: new mongoose.Types.ObjectId(),
      beneficiaryName: 'X',
      type: 'متابعة',
      status: 'PENDING',
      date: new Date('2027-01-01T00:00:00Z'),
      startTime: '10:00',
      duration: 30,
    });
  ids.a = (await seed(BRANCH_A)).insertedId;
  ids.b = (await seed(BRANCH_B)).insertedId;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/appointments';

describe('W1583 — appointments branch isolation', () => {
  it('GET / — restricted user lists only own-branch appointments', async () => {
    const r = await request(app).get(base);
    expect(r.status).toBe(200);
    const list = r.body.data.map(d => String(d._id));
    expect(list).toContain(String(ids.a));
    expect(list).not.toContain(String(ids.b));
  });

  it('GET / — cross-branch role sees all branches', async () => {
    mockScope.s = null;
    const r = await request(app).get(base);
    expect(r.status).toBe(200);
    expect(r.body.data.map(d => String(d._id))).toContain(String(ids.b));
  });

  it('GET /:id — restricted user 404s on a foreign-branch appointment', async () => {
    expect((await request(app).get(`${base}/${ids.b}`)).status).toBe(404);
    expect((await request(app).get(`${base}/${ids.a}`)).status).toBe(200);
  });

  it('PUT /:id — restricted user 404s editing a foreign-branch appointment', async () => {
    const r = await request(app).put(`${base}/${ids.b}`).send({ notes: 'hacked' });
    expect(r.status).toBe(404);
    const own = await request(app).put(`${base}/${ids.a}`).send({ notes: 'ok' });
    expect(own.status).toBe(200);
  });

  it('POST /:id/cancel — restricted user 404s cancelling a foreign-branch appointment', async () => {
    expect((await request(app).post(`${base}/${ids.b}/cancel`).send({})).status).toBe(404);
    expect((await request(app).post(`${base}/${ids.a}/cancel`).send({})).status).toBe(200);
  });

  it('POST /:id/check-in — restricted user 404s on foreign, 200s on own (M9 pipeline fix)', async () => {
    expect((await request(app).post(`${base}/${ids.b}/check-in`).send({})).status).toBe(404);
    expect((await request(app).post(`${base}/${ids.a}/check-in`).send({})).status).toBe(200);
  });

  it('DELETE /:id — restricted admin 404s deleting a foreign-branch appointment', async () => {
    expect((await request(app).delete(`${base}/${ids.b}`)).status).toBe(404);
    expect(await Appointment.findById(ids.b)).not.toBeNull(); // still there
    expect((await request(app).delete(`${base}/${ids.a}`)).status).toBe(200);
  });

  it('POST / — create stamps caller branch, ignoring a spoofed body.branchId', async () => {
    const r = await request(app)
      .post(base)
      .send({ beneficiaryName: 'Y', type: 'متابعة', date: '2027-02-02', startTime: '09:00', branchId: String(BRANCH_B) });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A));
  });

  it('GET /stats — restricted user aggregates only own branch', async () => {
    const r = await request(app).get(`${base}/stats`);
    expect(r.status).toBe(200);
    expect(r.body.data.total).toBe(1); // only branch A's appointment
  });

  it('static: service methods take a scope param + routes pass effectiveBranchScope + branchId not creatable', () => {
    const svc = fs.readFileSync(path.join(__dirname, '..', 'services', 'appointment.service.js'), 'utf8');
    expect(svc).toMatch(/const branchQ = scope =>/);
    expect(svc).toMatch(/async listAppointments\(query = \{\}, scope\)/);
    expect(svc).toMatch(/async getAppointment\(id, scope\)/);
    // branchId removed from the CREATABLE whitelist (stamped server-side instead)
    const creatable = svc.slice(svc.indexOf('APPOINTMENT_CREATABLE'), svc.indexOf('APPOINTMENT_UPDATABLE'));
    expect(creatable).not.toMatch(/'branchId'/);
    // M9: both atomic pipeline updates (cancel + check-in) carry updatePipeline:true.
    expect((svc.match(/updatePipeline: true }/g) || []).length).toBe(2);
    const routes = fs.readFileSync(path.join(__dirname, '..', 'routes', 'appointments.routes.js'), 'utf8');
    expect((routes.match(/effectiveBranchScope\(req\)/g) || []).length).toBeGreaterThanOrEqual(10);
  });
});
