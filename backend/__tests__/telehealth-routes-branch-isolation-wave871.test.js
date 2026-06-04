'use strict';

/**
 * telehealth-routes-branch-isolation-wave871.test.js — W871.
 *
 * Telehealth models use legacy `branch` (not branchId). Pre-W871 instance
 * endpoints used bare findById despite requireBranchAccess — any authenticated
 * user could read/update/cancel foreign-branch teleconsultations (beneficiary
 * PHI + clinical notes) and availability slots by ObjectId guess. W871 maps
 * branchFilter → { branch } on every instance lookup. Real Express + real
 * branchScope + MongoMemoryServer; only auth mocked.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { v4: uuidv4 } = require('uuid');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
let Teleconsultation;
let ProviderAvailabilitySlot;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE = new mongoose.Types.ObjectId();
const PROVIDER = new mongoose.Types.ObjectId();

const therapistA = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
  branch: BRANCH_A,
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/telehealth', require('../routes/telehealth.routes'));
  return app;
}

let app;

async function seedConsultation(branch, overrides = {}) {
  return Teleconsultation.create({
    uuid: uuidv4(),
    branch,
    beneficiary: BENE,
    provider: PROVIDER,
    type: 'video',
    scheduledAt: new Date(),
    status: 'scheduled',
    ...overrides,
  });
}

async function seedSlot(branch, overrides = {}) {
  return ProviderAvailabilitySlot.create({
    uuid: uuidv4(),
    branch,
    provider: PROVIDER,
    slotDate: new Date(),
    startTime: '09:00',
    endTime: '09:30',
    status: 'available',
    ...overrides,
  });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w871-telehealth' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  require('../models/User');
  if (!mongoose.models.Employee) {
    mongoose.model(
      'Employee',
      new mongoose.Schema({ name: String, specialty: String, licenseNumber: String })
    );
  }
  const models = require('../models/Telehealth');
  Teleconsultation = models.Teleconsultation;
  ProviderAvailabilitySlot = models.ProviderAvailabilitySlot;
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = therapistA;
});

afterEach(async () => {
  await Teleconsultation.deleteMany({});
  await ProviderAvailabilitySlot.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W871 — teleconsultation GET /:id is branch-scoped', () => {
  it('returns 200 for same-branch consultation', async () => {
    const row = await seedConsultation(BRANCH_A);
    const res = await request(app).get(`/api/v1/telehealth/consultations/${row._id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for foreign-branch consultation (IDOR regression)', async () => {
    const row = await seedConsultation(BRANCH_B);
    const res = await request(app).get(`/api/v1/telehealth/consultations/${row._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W871 — teleconsultation PATCH /:id is branch-scoped', () => {
  it('returns 404 when patching foreign-branch consultation', async () => {
    const row = await seedConsultation(BRANCH_B);
    const res = await request(app)
      .patch(`/api/v1/telehealth/consultations/${row._id}`)
      .send({ clinicalNotes: 'leak' });
    expect(res.status).toBe(404);
  });
});

describe('W871 — availability slot instance paths are branch-scoped', () => {
  it('GET /availability-slots/:id → 404 across branches', async () => {
    const slot = await seedSlot(BRANCH_B);
    const res = await request(app).get(`/api/v1/telehealth/availability-slots/${slot._id}`);
    expect(res.status).toBe(404);
  });

  it('DELETE /availability-slots/:id → 404 across branches', async () => {
    const slot = await seedSlot(BRANCH_B);
    const res = await request(app).delete(`/api/v1/telehealth/availability-slots/${slot._id}`);
    expect(res.status).toBe(404);
    expect(await ProviderAvailabilitySlot.countDocuments({ _id: slot._id })).toBe(1);
  });
});
