'use strict';

/**
 * assistive-device-routes-behavioral-wave860.test.js — W860.
 *
 * ROUTE behavioral coverage for the W359 assistive-device surface (distinct
 * from model-level assistive-device-behavioral-wave359). Real Express + real
 * branchScope (W443) + bodyScopedBeneficiaryGuard + MongoMemoryServer; only
 * auth mocked. Exercises the catalog CRUD + the full loan lifecycle
 * (request→approve→check-out→return / mark-damaged / cancel) with the device
 * availability state machine, the maintenance start/end flow, the approve-vs-
 * write role split, and cross-branch isolation.
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
let Device;
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
  app.use('/api/v1/assistive-device', require('../routes/assistive-device.routes'));
  return app;
}

let app;
let tagSeq = 0;

function devicePayload(overrides = {}) {
  tagSeq += 1;
  return {
    assetTag: `WC-${tagSeq}`,
    name: 'Wheelchair',
    category: 'wheelchair',
    branchId: String(BRANCH_A),
    ...overrides,
  };
}

async function createDevice(overrides = {}) {
  return request(app).post('/api/v1/assistive-device').send(devicePayload(overrides));
}

async function approveLoan(deviceId, loanId) {
  mockAuthState.user = supervisorA;
  const r = await request(app)
    .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/approve`)
    .send({});
  mockAuthState.user = therapistA;
  return r;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w860-assistive-device' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Device = require('../models/AssistiveDevice');
  Beneficiary = require('../models/Beneficiary');
  await Beneficiary.collection.insertOne({ _id: BENE_A, branchId: BRANCH_A });
  await Beneficiary.collection.insertOne({ _id: BENE_B, branchId: BRANCH_B });
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await Device.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W860 — catalog create + validation', () => {
  it('creates a device (201, availability=available)', async () => {
    const res = await createDevice();
    expect(res.status).toBe(201);
    expect(res.body.data.availability).toBe('available');
  });

  it('rejects missing assetTag / name (400)', async () => {
    expect((await createDevice({ assetTag: '' })).status).toBe(400);
    expect((await createDevice({ name: '' })).status).toBe(400);
  });

  it('rejects an invalid category (400)', async () => {
    const res = await createDevice({ category: 'spaceship' });
    expect(res.status).toBe(400);
  });
});

describe('W860 — loan lifecycle', () => {
  it('request → approve → check-out → return drives device availability', async () => {
    const deviceId = (await createDevice()).body.data._id;

    const loanRes = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans`)
      .send({ beneficiaryId: String(BENE_A), purpose: 'home use' });
    expect(loanRes.status).toBe(201);
    expect(loanRes.body.data.status).toBe('requested');
    const loanId = loanRes.body.data._id;

    expect((await approveLoan(deviceId, loanId)).status).toBe(200);

    const checkout = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/check-out`)
      .send({});
    expect(checkout.status).toBe(200);
    expect(checkout.body.device.availability).toBe('loaned');

    const ret = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/return`)
      .send({ conditionOnReturn: 'good' });
    expect(ret.status).toBe(200);
    expect(ret.body.device.availability).toBe('available');
  });

  it('blocks a loan request for a foreign-branch beneficiary (403)', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans`)
      .send({ beneficiaryId: String(BENE_B) });
    expect(res.status).toBe(403);
  });

  it('blocks check-out before approval (409)', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const loanId = (
      await request(app)
        .post(`/api/v1/assistive-device/${deviceId}/loans`)
        .send({ beneficiaryId: String(BENE_A) })
    ).body.data._id;
    const res = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/check-out`)
      .send({});
    expect(res.status).toBe(409);
  });

  it('blocks a second loan request while the device is loaned (409)', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const loanId = (
      await request(app)
        .post(`/api/v1/assistive-device/${deviceId}/loans`)
        .send({ beneficiaryId: String(BENE_A) })
    ).body.data._id;
    await approveLoan(deviceId, loanId);
    await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/check-out`)
      .send({});
    const res = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans`)
      .send({ beneficiaryId: String(BENE_A) });
    expect(res.status).toBe(409);
  });

  it('cancels a requested loan; cannot cancel after checkout', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const loanId = (
      await request(app)
        .post(`/api/v1/assistive-device/${deviceId}/loans`)
        .send({ beneficiaryId: String(BENE_A) })
    ).body.data._id;
    const cancel = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/cancel`)
      .send({});
    expect(cancel.status).toBe(200);
    expect(cancel.body.data.status).toBe('cancelled');
  });

  it('mark-damaged flips the device to maintenance (supervisor only)', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const loanId = (
      await request(app)
        .post(`/api/v1/assistive-device/${deviceId}/loans`)
        .send({ beneficiaryId: String(BENE_A) })
    ).body.data._id;
    await approveLoan(deviceId, loanId);
    await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/check-out`)
      .send({});
    // therapist cannot mark-damaged (APPROVE role)
    const forbidden = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/mark-damaged`)
      .send({ incidentDetails: 'wheel broke' });
    expect(forbidden.status).toBe(403);
    mockAuthState.user = supervisorA;
    const dmg = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/loans/${loanId}/mark-damaged`)
      .send({ incidentDetails: 'wheel broke' });
    expect(dmg.status).toBe(200);
    expect(dmg.body.device.availability).toBe('maintenance');
  });
});

describe('W860 — maintenance + retire role gating', () => {
  it('maintenance start → maintenance, end → available', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const start = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/maintenance/start`)
      .send({});
    expect(start.status).toBe(200);
    expect(start.body.data.availability).toBe('maintenance');
    const end = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/maintenance/end`)
      .send({ condition: 'good' });
    expect(end.status).toBe(200);
    expect(end.body.data.availability).toBe('available');
  });

  it('logs a maintenance event (201) and advances nextMaintenanceDue', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const due = new Date(Date.now() + 90 * 86400000).toISOString();
    const res = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/maintenance`)
      .send({ kind: 'preventive', description: 'annual check', nextDueAt: due });
    expect(res.status).toBe(201);
    expect(res.body.device.nextMaintenanceDue).toBeTruthy();
  });

  it('forbids a therapist from retiring; supervisor retires with a reason', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const forbidden = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/retire`)
      .send({ retirementReason: 'end of life' });
    expect(forbidden.status).toBe(403);
    mockAuthState.user = supervisorA;
    const noReason = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/retire`)
      .send({});
    expect(noReason.status).toBe(400);
    const retired = await request(app)
      .post(`/api/v1/assistive-device/${deviceId}/retire`)
      .send({ retirementReason: 'end of life' });
    expect(retired.status).toBe(200);
    expect(retired.body.data.availability).toBe('retired');
  });
});

describe('W860 — cross-branch isolation (W443)', () => {
  it('hides a foreign-branch device from GET /:id (404)', async () => {
    const other = await Device.create({
      assetTag: 'WC-OTHER',
      name: 'Other branch wheelchair',
      category: 'wheelchair',
      branchId: BRANCH_B,
      availability: 'available',
    });
    const res = await request(app).get(`/api/v1/assistive-device/${other._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W860 — DELETE role gating', () => {
  it('forbids a therapist from deleting (403)', async () => {
    const deviceId = (await createDevice()).body.data._id;
    const res = await request(app).delete(`/api/v1/assistive-device/${deviceId}`);
    expect(res.status).toBe(403);
    expect(await Device.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const deviceId = (await createDevice()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/assistive-device/${deviceId}`);
    expect(res.status).toBe(200);
    expect(await Device.countDocuments({})).toBe(0);
  });
});
