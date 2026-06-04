'use strict';

/**
 * respite-routes-behavioral-wave859.test.js — W859.
 *
 * ROUTE behavioral coverage for the W363 respite-booking surface (distinct from
 * the model-level respite-behavioral-wave363). Real Express + real branchScope
 * (W445) + bodyScopedBeneficiaryGuard + MongoMemoryServer; only auth mocked.
 * Exercises the 8-state booking lifecycle (requested→approved→confirmed→
 * checked_in→completed plus rejected / cancelled / no_show), the approve-vs-ops
 * role split, mandatory emergency-contact intake, and cross-branch isolation.
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
  requireRole: roles => (req, res, next) => {
    const role = req.user && req.user.role;
    if (!Array.isArray(roles) || roles.includes(role)) return next();
    return res.status(403).json({ success: false, message: 'الدور غير مصرّح' });
  },
}));

let mongod;
let Booking;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const SOCIAL_A = new mongoose.Types.ObjectId();
const SUPERVISOR_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const socialA = {
  id: String(SOCIAL_A),
  _id: SOCIAL_A,
  role: 'social_worker',
  name: 'الأخصائي الاجتماعي',
  branchId: String(BRANCH_A),
};
const supervisorA = {
  id: String(SUPERVISOR_A),
  _id: SUPERVISOR_A,
  role: 'clinical_supervisor',
  name: 'المشرف',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/respite', require('../routes/respite.routes'));
  return app;
}

let app;

const DAY = 24 * 60 * 60 * 1000;
function bookingPayload(overrides = {}) {
  const start = new Date(Date.now() + 7 * DAY);
  const end = new Date(Date.now() + 9 * DAY);
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    bookingType: 'overnight',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    nightCount: 2,
    emergencyContactName: 'والدة المستفيد',
    emergencyContactPhone: '0555000111',
    ...overrides,
  };
}

async function requestBooking(overrides = {}) {
  return request(app).post('/api/v1/respite').send(bookingPayload(overrides));
}

// Drive a booking to a target status using the appropriate actors.
async function approve(id) {
  mockAuthState.user = supervisorA;
  const r = await request(app).post(`/api/v1/respite/${id}/approve`).send({});
  mockAuthState.user = socialA;
  return r;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w859-respite' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Booking = require('../models/RespiteBooking');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = socialA;
});

afterEach(async () => {
  await Booking.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W859 — request + validation', () => {
  it('requests a booking (201, status=requested)', async () => {
    const res = await requestBooking();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('requested');
  });

  it('rejects an invalid bookingType (400)', async () => {
    const res = await requestBooking({ bookingType: 'forever' });
    expect(res.status).toBe(400);
  });

  it('rejects endAt <= startAt (400)', async () => {
    const t = new Date(Date.now() + 7 * DAY).toISOString();
    const res = await requestBooking({ startAt: t, endAt: t });
    expect(res.status).toBe(400);
  });

  it('requires an emergency contact name + phone (400)', async () => {
    expect((await requestBooking({ emergencyContactName: '' })).status).toBe(400);
    expect((await requestBooking({ emergencyContactPhone: '' })).status).toBe(400);
  });

  it('blocks requesting for a foreign-branch beneficiary (403)', async () => {
    const res = await requestBooking({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await Booking.countDocuments({})).toBe(0);
  });
});

describe('W859 — approve/reject role split', () => {
  it('forbids a social worker from approving (403)', async () => {
    const id = (await requestBooking()).body.data._id;
    const res = await request(app).post(`/api/v1/respite/${id}/approve`).send({});
    expect(res.status).toBe(403);
  });

  it('a supervisor approves a requested booking (200)', async () => {
    const id = (await requestBooking()).body.data._id;
    const res = await approve(id);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('rejects without a reason (400) and with a reason transitions to rejected', async () => {
    const id = (await requestBooking()).body.data._id;
    mockAuthState.user = supervisorA;
    const noReason = await request(app).post(`/api/v1/respite/${id}/reject`).send({});
    expect(noReason.status).toBe(400);
    const withReason = await request(app)
      .post(`/api/v1/respite/${id}/reject`)
      .send({ reason: 'لا تتوفر أسرّة في التواريخ المطلوبة' });
    expect(withReason.status).toBe(200);
    expect(withReason.body.data.status).toBe('rejected');
  });

  it('blocks approving a booking that is not in requested state (409)', async () => {
    const id = (await requestBooking()).body.data._id;
    await approve(id);
    const again = await approve(id);
    expect(again.status).toBe(409);
  });
});

describe('W859 — full lifecycle to completed', () => {
  it('request → approve → confirm → check-in → check-out (completed)', async () => {
    const id = (await requestBooking()).body.data._id;
    expect((await approve(id)).status).toBe(200);

    const confirmed = await request(app).post(`/api/v1/respite/${id}/confirm`).send({});
    expect(confirmed.status).toBe(200);
    expect(confirmed.body.data.status).toBe('confirmed');

    const checkedIn = await request(app).post(`/api/v1/respite/${id}/check-in`).send({});
    expect(checkedIn.status).toBe(200);
    expect(checkedIn.body.data.status).toBe('checked_in');

    const checkedOut = await request(app)
      .post(`/api/v1/respite/${id}/check-out`)
      .send({ actualCost: 1200, handoffNotes: 'تسليم سلس' });
    expect(checkedOut.status).toBe(200);
    expect(checkedOut.body.data.status).toBe('completed');
    expect(checkedOut.body.data.actualCost).toBe(1200);
  });

  it('blocks confirm before approve (409)', async () => {
    const id = (await requestBooking()).body.data._id;
    const res = await request(app).post(`/api/v1/respite/${id}/confirm`).send({});
    expect(res.status).toBe(409);
  });

  it('blocks check-in from requested (409)', async () => {
    const id = (await requestBooking()).body.data._id;
    const res = await request(app).post(`/api/v1/respite/${id}/check-in`).send({});
    expect(res.status).toBe(409);
  });
});

describe('W859 — cancel / no-show terminals', () => {
  it('cancel requires a reason and transitions a requested booking', async () => {
    const id = (await requestBooking()).body.data._id;
    expect((await request(app).post(`/api/v1/respite/${id}/cancel`).send({})).status).toBe(400);
    const res = await request(app)
      .post(`/api/v1/respite/${id}/cancel`)
      .send({ reason: 'ألغت الأسرة الحجز' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });

  it('no-show transitions an approved booking, and is blocked from requested', async () => {
    const reqId = (await requestBooking()).body.data._id;
    expect((await request(app).post(`/api/v1/respite/${reqId}/no-show`).send({})).status).toBe(409);

    const id = (await requestBooking()).body.data._id;
    await approve(id);
    const res = await request(app).post(`/api/v1/respite/${id}/no-show`).send({});
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('no_show');
  });

  it('blocks PATCH on a completed booking (409)', async () => {
    const id = (await requestBooking()).body.data._id;
    await approve(id);
    await request(app).post(`/api/v1/respite/${id}/confirm`).send({});
    await request(app).post(`/api/v1/respite/${id}/check-in`).send({});
    await request(app).post(`/api/v1/respite/${id}/check-out`).send({});
    const res = await request(app).patch(`/api/v1/respite/${id}`).send({ notes: 'تعديل' });
    expect(res.status).toBe(409);
  });
});

describe('W859 — cross-branch isolation (W445)', () => {
  it('hides a foreign-branch booking from GET /:id (404)', async () => {
    const other = await Booking.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      bookingType: 'day',
      startAt: new Date(Date.now() + DAY),
      endAt: new Date(Date.now() + 2 * DAY),
      nightCount: 0,
      requestedBy: SOCIAL_A,
      emergencyContactName: 'x',
      emergencyContactPhone: '0500000000',
      status: 'requested',
    });
    const res = await request(app).get(`/api/v1/respite/${other._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W859 — DELETE role gating', () => {
  it('forbids a social worker from deleting (403)', async () => {
    const id = (await requestBooking()).body.data._id;
    const res = await request(app).delete(`/api/v1/respite/${id}`);
    expect(res.status).toBe(403);
    expect(await Booking.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await requestBooking()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/respite/${id}`);
    expect(res.status).toBe(200);
    expect(await Booking.countDocuments({})).toBe(0);
  });
});
