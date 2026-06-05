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

// W946: replicates PRODUCTION — only `branchId` is enriched onto req.user; the
// legacy `branch` field is NEVER populated. Pre-W946 the list/create endpoints
// read req.user.branch directly, so for this user they filtered/stamped by
// undefined (cross-branch read leak + orphaned writes).
const therapistBranchIdOnly = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

const headOffice = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'head_office_admin',
  branchId: String(BRANCH_A),
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

describe('W946 — list/create endpoints scope via branchId, NOT the never-populated req.user.branch', () => {
  it('GET /consultations returns ONLY same-branch rows for a branchId-only user', async () => {
    mockAuthState.user = therapistBranchIdOnly;
    await seedConsultation(BRANCH_A, { consultationNumber: `C-A-${uuidv4()}` });
    await seedConsultation(BRANCH_B, { consultationNumber: `C-B-${uuidv4()}` });
    const res = await request(app).get('/api/v1/telehealth/consultations');
    expect(res.status).toBe(200);
    const branches = (res.body.data || []).map(c => String(c.branch));
    expect(branches).toContain(String(BRANCH_A));
    expect(branches).not.toContain(String(BRANCH_B)); // pre-W946: leaked both (filter by undefined)
  });

  it('GET /availability-slots returns ONLY same-branch slots for a branchId-only user', async () => {
    mockAuthState.user = therapistBranchIdOnly;
    await seedSlot(BRANCH_A);
    await seedSlot(BRANCH_B);
    const res = await request(app).get('/api/v1/telehealth/availability-slots');
    expect(res.status).toBe(200);
    const branches = (res.body.data || []).map(s => String(s.branch));
    expect(branches).not.toContain(String(BRANCH_B));
  });

  it("POST /availability-slots stamps the caller's real branch (not undefined) for a branchId-only user", async () => {
    mockAuthState.user = therapistBranchIdOnly;
    const res = await request(app)
      .post('/api/v1/telehealth/availability-slots')
      .send({
        provider: String(PROVIDER),
        slotDate: new Date().toISOString(),
        startTime: '10:00',
        endTime: '10:30',
      });
    expect([200, 201]).toContain(res.status);
    const slot = res.body.data || res.body.slot;
    expect(String(slot.branch)).toBe(String(BRANCH_A)); // pre-W946: branch was undefined (orphaned)
  });

  it('a cross-branch (head_office) user sees BOTH branches', async () => {
    mockAuthState.user = headOffice;
    await seedConsultation(BRANCH_A, { consultationNumber: `C-A-${uuidv4()}` });
    await seedConsultation(BRANCH_B, { consultationNumber: `C-B-${uuidv4()}` });
    const res = await request(app).get('/api/v1/telehealth/consultations');
    expect(res.status).toBe(200);
    const branches = (res.body.data || []).map(c => String(c.branch));
    expect(branches).toEqual(expect.arrayContaining([String(BRANCH_A), String(BRANCH_B)]));
  });
});
