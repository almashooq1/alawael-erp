'use strict';

/**
 * facility-asset-routes-behavioral-wave863b.test.js — W863 (facility-asset).
 *
 * ROUTE behavioral coverage for the W369 facility-asset surface (distinct from
 * model-level facility-asset-behavioral-wave369). Real Express + real
 * branchScope (W445) + MongoMemoryServer; only auth mocked. Exercises the PPM
 * inspection flow (pass advances schedule, fail → inspection_failed → restored
 * on pass), certificate management, the in_service↔maintenance↔out_of_service↔
 * retired availability machine, retire role gating, life-safety analytics, and
 * cross-branch isolation.
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
let Asset;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const MAINT_A = new mongoose.Types.ObjectId();
const FACILITY_MGR_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const maintA = {
  id: String(MAINT_A),
  _id: MAINT_A,
  role: 'maintenance',
  name: 'فني الصيانة',
  branchId: String(BRANCH_A),
};
const facilityMgrA = {
  id: String(FACILITY_MGR_A),
  _id: FACILITY_MGR_A,
  role: 'facility_manager',
  name: 'مدير المنشأة',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/facility-asset', require('../routes/facility-asset.routes'));
  return app;
}

let app;
let tagSeq = 0;

function assetPayload(overrides = {}) {
  tagSeq += 1;
  return {
    assetTag: `EL-${tagSeq}`,
    name: 'Elevator 1',
    category: 'elevator',
    branchId: String(BRANCH_A),
    criticality: 'life_safety',
    ...overrides,
  };
}

async function createAsset(overrides = {}) {
  return request(app).post('/api/v1/facility-asset').send(assetPayload(overrides));
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w863b-facility-asset' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Asset = require('../models/FacilityAsset');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = maintA;
});

afterEach(async () => {
  await Asset.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W863b — create + validation', () => {
  it('creates an asset (201, status=in_service)', async () => {
    const res = await createAsset();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('in_service');
  });

  it('rejects missing assetTag / name / branchId / category (400)', async () => {
    expect((await createAsset({ assetTag: '' })).status).toBe(400);
    expect((await createAsset({ name: '' })).status).toBe(400);
    expect((await createAsset({ category: 'teleporter' })).status).toBe(400);
    expect((await createAsset({ branchId: undefined })).status).toBe(400);
  });
});

describe('W863b — inspection flow', () => {
  it('a fail inspection requires defects and flips status to inspection_failed', async () => {
    const id = (await createAsset()).body.data._id;
    const noDefects = await request(app)
      .post(`/api/v1/facility-asset/${id}/inspection`)
      .send({ kind: 'regulatory_annual', outcome: 'fail' });
    expect(noDefects.status).toBe(400);

    const failed = await request(app)
      .post(`/api/v1/facility-asset/${id}/inspection`)
      .send({ kind: 'regulatory_annual', outcome: 'fail', defectsFound: ['brake worn'] });
    expect(failed.status).toBe(201);
    expect(failed.body.asset.status).toBe('inspection_failed');
  });

  it('a pass inspection restores a failed asset to in_service', async () => {
    const id = (await createAsset()).body.data._id;
    await request(app)
      .post(`/api/v1/facility-asset/${id}/inspection`)
      .send({ kind: 'regulatory_annual', outcome: 'fail', defectsFound: ['x'] });
    const pass = await request(app)
      .post(`/api/v1/facility-asset/${id}/inspection`)
      .send({ kind: 'regulatory_annual', outcome: 'pass' });
    expect(pass.status).toBe(201);
    expect(pass.body.asset.status).toBe('in_service');
  });

  it('rejects an invalid inspection kind/outcome (400)', async () => {
    const id = (await createAsset()).body.data._id;
    expect(
      (
        await request(app)
          .post(`/api/v1/facility-asset/${id}/inspection`)
          .send({ kind: 'x', outcome: 'pass' })
      ).status
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`/api/v1/facility-asset/${id}/inspection`)
          .send({ kind: 'regulatory_annual', outcome: 'maybe' })
      ).status
    ).toBe(400);
  });
});

describe('W863b — certificate + availability machine', () => {
  it('adds a certificate (requires number + authority + expiry)', async () => {
    const id = (await createAsset()).body.data._id;
    expect(
      (await request(app).post(`/api/v1/facility-asset/${id}/certificate`).send({ number: 'C1' }))
        .status
    ).toBe(400);
    const ok = await request(app)
      .post(`/api/v1/facility-asset/${id}/certificate`)
      .send({
        number: 'CD-2026-1',
        issuingAuthority: 'الدفاع المدني',
        expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      });
    expect(ok.status).toBe(201);
  });

  it('out-of-service (reason) → return-to-service', async () => {
    const id = (await createAsset()).body.data._id;
    expect(
      (await request(app).post(`/api/v1/facility-asset/${id}/out-of-service`).send({})).status
    ).toBe(400);
    const oos = await request(app)
      .post(`/api/v1/facility-asset/${id}/out-of-service`)
      .send({ reason: 'awaiting parts' });
    expect(oos.status).toBe(200);
    expect(oos.body.data.status).toBe('out_of_service');
    const back = await request(app).post(`/api/v1/facility-asset/${id}/return-to-service`).send({});
    expect(back.status).toBe(200);
    expect(back.body.data.status).toBe('in_service');
  });

  it('start-maintenance flips to maintenance; return-to-service from in_service is 409', async () => {
    const id = (await createAsset()).body.data._id;
    const start = await request(app)
      .post(`/api/v1/facility-asset/${id}/start-maintenance`)
      .send({});
    expect(start.status).toBe(200);
    expect(start.body.data.status).toBe('maintenance');
    const id2 = (await createAsset()).body.data._id;
    const bad = await request(app).post(`/api/v1/facility-asset/${id2}/return-to-service`).send({});
    expect(bad.status).toBe(409);
  });
});

describe('W863b — retire role gating + life-safety stats', () => {
  it('forbids a maintenance tech from retiring; facility manager retires with reason', async () => {
    const id = (await createAsset()).body.data._id;
    const forbidden = await request(app)
      .post(`/api/v1/facility-asset/${id}/retire`)
      .send({ reason: 'replaced' });
    expect(forbidden.status).toBe(403);
    mockAuthState.user = facilityMgrA;
    expect((await request(app).post(`/api/v1/facility-asset/${id}/retire`).send({})).status).toBe(
      400
    );
    const retired = await request(app)
      .post(`/api/v1/facility-asset/${id}/retire`)
      .send({ reason: 'replaced with new unit' });
    expect(retired.status).toBe(200);
    expect(retired.body.data.status).toBe('retired');
  });

  it('stats counts a life-safety out-of-service asset', async () => {
    const id = (await createAsset({ criticality: 'life_safety' })).body.data._id;
    await request(app)
      .post(`/api/v1/facility-asset/${id}/out-of-service`)
      .send({ reason: 'fault' });
    const res = await request(app).get('/api/v1/facility-asset/stats');
    expect(res.status).toBe(200);
    expect(res.body.lifeSafetyOutOfService).toBe(1);
  });
});

describe('W863b — cross-branch isolation (W445)', () => {
  it('hides a foreign-branch asset from GET /:id (404)', async () => {
    const other = await Asset.create({
      assetTag: 'EL-OTHER',
      name: 'Other branch elevator',
      category: 'elevator',
      branchId: BRANCH_B,
      criticality: 'life_safety',
      status: 'in_service',
    });
    const res = await request(app).get(`/api/v1/facility-asset/${other._id}`);
    expect(res.status).toBe(404);
  });
});

describe('W863b — DELETE role gating', () => {
  it('forbids a maintenance tech from deleting (403)', async () => {
    const id = (await createAsset()).body.data._id;
    const res = await request(app).delete(`/api/v1/facility-asset/${id}`);
    expect(res.status).toBe(403);
    expect(await Asset.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createAsset()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/facility-asset/${id}`);
    expect(res.status).toBe(200);
    expect(await Asset.countDocuments({})).toBe(0);
  });
});
