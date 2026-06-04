'use strict';

/**
 * restraint-seclusion-routes-behavioral-wave865.test.js — W865.
 *
 * ROUTE behavioral coverage for the W193b restraint & seclusion ledger
 * (distinct from the model-level restraint-seclusion-event-behavioral-wave193b).
 * Real Express + real branchScope (W447) + bodyScopedBeneficiaryGuard +
 * MongoMemoryServer; only auth mocked. This is the highest-stakes physical-
 * intervention surface — every restraint/seclusion on a disabled beneficiary
 * is a regulated event. Exercises the start→end→notify-parent→complete→review
 * state machine (with completion gates: endTime + parent notification + debrief
 * notes all required), type-specific intake validation (chemical needs a
 * medication, seclusion needs a location), review immutability, role gating,
 * and cross-branch isolation.
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
let RSEvent;
let Beneficiary;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();
const BENE_B = new mongoose.Types.ObjectId();
const THERAPIST_A = new mongoose.Types.ObjectId();
const SUPERVISOR_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const therapistA = {
  id: String(THERAPIST_A),
  _id: THERAPIST_A,
  role: 'therapist',
  name: 'المعالج',
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
  app.use('/api/v1/restraint-seclusion', require('../routes/restraint-seclusion.routes'));
  return app;
}

let app;

function startPayload(overrides = {}) {
  return {
    beneficiaryId: String(BENE_A),
    branchId: String(BRANCH_A),
    type: 'physical',
    techniqueUsed: 'two-person escort',
    triggerBehavior: 'aggression toward peer',
    ...overrides,
  };
}

async function startEvent(overrides = {}) {
  return request(app).post('/api/v1/restraint-seclusion').send(startPayload(overrides));
}

// Drive an event all the way to completed.
async function completeEvent() {
  const id = (await startEvent()).body.data._id;
  await request(app).post(`/api/v1/restraint-seclusion/${id}/end`).send({});
  await request(app)
    .post(`/api/v1/restraint-seclusion/${id}/notify-parent`)
    .send({ method: 'phone' });
  await request(app)
    .post(`/api/v1/restraint-seclusion/${id}/complete`)
    .send({ debriefNotes: 'فريق راجع الحدث ووضع خطة وقائية' });
  return id;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w865-restraint-seclusion' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  RSEvent = require('../models/RestraintSeclusionEvent');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await RSEvent.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W865 — start event + type-specific validation', () => {
  it('starts a physical restraint event (201, status=in_progress)', async () => {
    const res = await startEvent();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.type).toBe('physical');
  });

  it('rejects an invalid type / missing technique / missing trigger (400)', async () => {
    expect((await startEvent({ type: 'magic' })).status).toBe(400);
    expect((await startEvent({ techniqueUsed: '' })).status).toBe(400);
    expect((await startEvent({ triggerBehavior: '' })).status).toBe(400);
  });

  it('requires a medication for chemical restraint (400)', async () => {
    const res = await startEvent({ type: 'chemical', medicationName: '' });
    expect(res.status).toBe(400);
  });

  it('requires a location for seclusion (400)', async () => {
    const res = await startEvent({ type: 'seclusion', seclusionLocation: '' });
    expect(res.status).toBe(400);
  });

  it('accepts a seclusion event with a location (201)', async () => {
    const res = await startEvent({ type: 'seclusion', seclusionLocation: 'غرفة الهدوء 2' });
    expect(res.status).toBe(201);
  });
});

describe('W865 — cross-branch isolation (W447)', () => {
  it('blocks starting an event for a foreign-branch beneficiary (403)', async () => {
    const res = await startEvent({ beneficiaryId: String(BENE_B), branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
    expect(await RSEvent.countDocuments({})).toBe(0);
  });

  it('hides a foreign-branch event from GET /:id (404)', async () => {
    const other = await RSEvent.create({
      beneficiaryId: BENE_B,
      branchId: BRANCH_B,
      date: new Date(),
      startTime: new Date(),
      type: 'physical',
      techniqueUsed: 'escort',
      triggerBehavior: 'x',
      staffPrimary: THERAPIST_A,
      status: 'in_progress',
    });
    const res = await request(app).get(`/api/v1/restraint-seclusion/${other._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W865 — start→end→notify→complete→review state machine', () => {
  it('walks the full lifecycle to reviewed', async () => {
    const id = (await startEvent()).body.data._id;

    const ended = await request(app)
      .post(`/api/v1/restraint-seclusion/${id}/end`)
      .send({ injury: false });
    expect(ended.status).toBe(200);
    expect(ended.body.data.endTime).toBeTruthy();
    expect(typeof ended.body.data.durationMinutes).toBe('number');

    const notified = await request(app)
      .post(`/api/v1/restraint-seclusion/${id}/notify-parent`)
      .send({ method: 'phone' });
    expect(notified.status).toBe(200);

    const completed = await request(app)
      .post(`/api/v1/restraint-seclusion/${id}/complete`)
      .send({ debriefNotes: 'مراجعة الحدث مع الفريق' });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe('completed');

    mockAuthState.user = supervisorA;
    const reviewed = await request(app).post(`/api/v1/restraint-seclusion/${id}/review`).send({});
    expect(reviewed.status).toBe(200);
    expect(reviewed.body.data.status).toBe('reviewed');
  });

  it('blocks ending an already-completed event (409)', async () => {
    const id = await completeEvent();
    const res = await request(app).post(`/api/v1/restraint-seclusion/${id}/end`).send({});
    expect(res.status).toBe(409);
  });

  it('complete requires end + parent-notification + debrief notes', async () => {
    const id = (await startEvent()).body.data._id;
    // before /end
    expect(
      (
        await request(app)
          .post(`/api/v1/restraint-seclusion/${id}/complete`)
          .send({ debriefNotes: 'x' })
      ).status
    ).toBe(400);
    await request(app).post(`/api/v1/restraint-seclusion/${id}/end`).send({});
    // after /end but before parent notification
    expect(
      (
        await request(app)
          .post(`/api/v1/restraint-seclusion/${id}/complete`)
          .send({ debriefNotes: 'x' })
      ).status
    ).toBe(400);
    await request(app)
      .post(`/api/v1/restraint-seclusion/${id}/notify-parent`)
      .send({ method: 'sms' });
    // after notification but without debrief notes
    expect(
      (await request(app).post(`/api/v1/restraint-seclusion/${id}/complete`).send({})).status
    ).toBe(400);
    // all gates satisfied
    const ok = await request(app)
      .post(`/api/v1/restraint-seclusion/${id}/complete`)
      .send({ debriefNotes: 'تم الـ debrief' });
    expect(ok.status).toBe(200);
  });

  it('rejects an invalid parent-notification method (400)', async () => {
    const id = (await startEvent()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/restraint-seclusion/${id}/notify-parent`)
      .send({ method: 'carrier_pigeon' });
    expect(res.status).toBe(400);
  });

  it('blocks reviewing a non-completed event (409)', async () => {
    const id = (await startEvent()).body.data._id;
    mockAuthState.user = supervisorA;
    const res = await request(app).post(`/api/v1/restraint-seclusion/${id}/review`).send({});
    expect(res.status).toBe(409);
  });
});

describe('W865 — review immutability + role gating', () => {
  it('forbids a therapist from reviewing (403)', async () => {
    const id = await completeEvent();
    const res = await request(app).post(`/api/v1/restraint-seclusion/${id}/review`).send({});
    expect(res.status).toBe(403);
  });

  it('blocks PATCH after the event is reviewed (409)', async () => {
    const id = await completeEvent();
    mockAuthState.user = supervisorA;
    await request(app).post(`/api/v1/restraint-seclusion/${id}/review`).send({});
    const res = await request(app)
      .patch(`/api/v1/restraint-seclusion/${id}`)
      .send({ triggerBehavior: 'edited' });
    expect(res.status).toBe(409);
  });

  it('allows PATCH while not yet reviewed and ignores a status-takeover field', async () => {
    const id = (await startEvent()).body.data._id;
    const res = await request(app)
      .patch(`/api/v1/restraint-seclusion/${id}`)
      .send({ triggerBehavior: 'updated trigger', status: 'reviewed' });
    expect(res.status).toBe(200);
    expect(res.body.data.triggerBehavior).toBe('updated trigger');
    expect(res.body.data.status).toBe('in_progress'); // route strips status from body
  });

  it('rejects a foreign branchId in the PATCH body at the branch-scope layer (403)', async () => {
    const id = (await startEvent()).body.data._id;
    const res = await request(app)
      .patch(`/api/v1/restraint-seclusion/${id}`)
      .send({ branchId: String(BRANCH_B) });
    expect(res.status).toBe(403);
  });
});

describe('W865 — DELETE role gating', () => {
  it('forbids a therapist from deleting (403)', async () => {
    const id = (await startEvent()).body.data._id;
    const res = await request(app).delete(`/api/v1/restraint-seclusion/${id}`);
    expect(res.status).toBe(403);
    expect(await RSEvent.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await startEvent()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/restraint-seclusion/${id}`);
    expect(res.status).toBe(200);
    expect(await RSEvent.countDocuments({})).toBe(0);
  });
});
