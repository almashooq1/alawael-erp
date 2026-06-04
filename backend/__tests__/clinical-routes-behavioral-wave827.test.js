'use strict';

/**
 * clinical-routes-behavioral-wave827.test.js — W827.
 *
 * Behavioral (supertest + MongoMemoryServer) route-layer coverage for two more
 * clinical surfaces that previously had static-only guards: respite bookings
 * (W363) and beneficiary diet prescriptions (W368). Continuation of the
 * W825/W826 thread — same harness, same doctrine ("pair static guards with a
 * behavioral counterpart").
 *
 * Covers, per surface:
 *   - cross-branch isolation (own 200 / foreign 404, no leak)
 *   - invalid ObjectId → 400
 *   - status-transition discipline (409 on illegal transition) + required-field
 *     validation (400)
 */

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
  requireRole: () => (_req, _res, next) => next(),
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();

let RespiteBooking;
let DietRx;

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/respite', require('../routes/respite.routes'));
  a.use('/api/v1/diet-prescription', require('../routes/diet-prescription.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w827-clinical' } });
  await mongoose.connect(mongod.getUri());

  // Mongoose-9 legacy-hook compat shim — models use callback-style pre('save').
  require('../config/mongoose.plugins');

  require('../models/Beneficiary');
  RespiteBooking = require('../models/RespiteBooking');
  DietRx = require('../models/BeneficiaryDietPrescription');

  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'therapist', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

// ── respite ───────────────────────────────────────────────────────────────
describe('W827 — respite behavioral (tenant isolation + approval transition)', () => {
  function seed(branchId) {
    const start = new Date(Date.now() + 86400000);
    const end = new Date(Date.now() + 2 * 86400000);
    return RespiteBooking.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      bookingType: 'day', // 'day' needs no nightCount; keeps the seed invariant-clean
      startAt: start,
      endAt: end,
      nightCount: 0,
      emergencyContactName: 'ولي الأمر',
      emergencyContactPhone: '0500000000',
      status: 'requested',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/respite/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch booking (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/respite/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch booking (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/respite/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/approve on a foreign-branch booking is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).post(`/api/v1/respite/${foreign._id}/approve`).send({});
    expect(res.status).toBe(404);
  });

  it('approve transition: requested → approved (200), second approve 409', async () => {
    const own = await seed(BRANCH_A);
    const first = await request(app).post(`/api/v1/respite/${own._id}/approve`).send({});
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('approved');

    const second = await request(app).post(`/api/v1/respite/${own._id}/approve`).send({});
    expect(second.status).toBe(409);
  });

  it('reject requires a reason (400) on a fresh requested booking', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).post(`/api/v1/respite/${own._id}/reject`).send({});
    expect(res.status).toBe(400);
  });
});

// ── diet-prescription ─────────────────────────────────────────────────────────
describe('W827 — diet-prescription behavioral (tenant isolation + activate)', () => {
  function seed(branchId) {
    return DietRx.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      status: 'draft',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/diet-prescription/bad');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch prescription (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/diet-prescription/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch prescription (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/diet-prescription/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/activate on a foreign-branch prescription is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/diet-prescription/${foreign._id}/activate`)
      .send({ prescriberDiscipline: 'registered_dietitian' });
    expect(res.status).toBe(404);
  });

  it('activate requires a valid prescriberDiscipline (400)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/diet-prescription/${own._id}/activate`)
      .send({ prescriberDiscipline: 'astronaut' });
    expect(res.status).toBe(400);
  });

  it('activate transition: draft → active (200), second activate 409', async () => {
    const own = await seed(BRANCH_A);
    const first = await request(app)
      .post(`/api/v1/diet-prescription/${own._id}/activate`)
      .send({ prescriberDiscipline: 'registered_dietitian' });
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('active');

    const second = await request(app)
      .post(`/api/v1/diet-prescription/${own._id}/activate`)
      .send({ prescriberDiscipline: 'registered_dietitian' });
    expect(second.status).toBe(409);
  });
});
