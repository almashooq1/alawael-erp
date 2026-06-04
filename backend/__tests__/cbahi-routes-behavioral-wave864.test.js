'use strict';

/**
 * cbahi-routes-behavioral-wave864.test.js — W864.
 *
 * ROUTE behavioral coverage for the W360/W367 CBAHI accreditation surface
 * (distinct from model-level cbahi-wave360). Real Express + real branchScope
 * (W447) + MongoMemoryServer; only auth mocked. Exercises the read-only
 * standards registry, the per-(branch,standard) attestation singleton guard,
 * the draft→met/partial/not_met attest flow, evidence subdocs, the dashboard
 * compliance computation, role gating, and cross-branch isolation. Closes the
 * W356-W370 clinical-series route behavioral coverage.
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
let Attestation;

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const QUALITY_A = new mongoose.Types.ObjectId();
const THERAPIST_A = new mongoose.Types.ObjectId();
const ADMIN_A = new mongoose.Types.ObjectId();

const STD_KEY = 'PSG_FALL_RISK_ASSESSMENT';
const STD_KEY_2 = 'MMS_HIGH_ALERT_DOUBLE_CHECK';

const qualityA = {
  id: String(QUALITY_A),
  _id: QUALITY_A,
  role: 'quality',
  name: 'مسؤول الجودة',
  branchId: String(BRANCH_A),
};
const therapistA = {
  id: String(THERAPIST_A),
  _id: THERAPIST_A,
  role: 'therapist',
  branchId: String(BRANCH_A),
};
const adminA = { id: String(ADMIN_A), _id: ADMIN_A, role: 'admin', branchId: String(BRANCH_A) };

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/cbahi', require('../routes/cbahi.routes'));
  return app;
}

let app;

async function createAttestation(overrides = {}) {
  return request(app)
    .post('/api/v1/cbahi/attestations')
    .send({ branchId: String(BRANCH_A), standardKey: STD_KEY, ...overrides });
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w864-cbahi' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Attestation = require('../models/CbahiAttestation');
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = qualityA;
});

afterEach(async () => {
  await Attestation.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W864 — standards registry (read-only)', () => {
  it('lists the standards catalog', async () => {
    const res = await request(app).get('/api/v1/cbahi/standards');
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.standards)).toBe(true);
  });

  it('returns a single standard by key (and 404 for unknown)', async () => {
    const ok = await request(app).get(`/api/v1/cbahi/standards/${STD_KEY}`);
    expect(ok.status).toBe(200);
    expect(ok.body.data.key).toBe(STD_KEY);
    const missing = await request(app).get('/api/v1/cbahi/standards/NOT_A_STANDARD');
    expect(missing.status).toBe(404);
  });

  it('lists chapters with standard counts', async () => {
    const res = await request(app).get('/api/v1/cbahi/chapters');
    expect(res.status).toBe(200);
    expect(res.body.chapters.length).toBeGreaterThan(0);
  });
});

describe('W864 — attestation create + singleton guard', () => {
  it('creates a draft attestation (201) carrying chapter + code from the registry', async () => {
    const res = await createAttestation();
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.standardChapter).toBe('PSG');
    expect(res.body.data.standardCode).toBe('PSG.6');
  });

  it('refuses a duplicate (branch, standard) attestation (409)', async () => {
    await createAttestation();
    const res = await createAttestation();
    expect(res.status).toBe(409);
    expect(res.body.existingId).toBeDefined();
  });

  it('rejects an unknown standardKey (400)', async () => {
    const res = await createAttestation({ standardKey: 'NOPE' });
    expect(res.status).toBe(400);
  });

  it('forbids a therapist (not quality/compliance) from creating (403)', async () => {
    mockAuthState.user = therapistA;
    const res = await createAttestation();
    expect(res.status).toBe(403);
  });
});

describe('W864 — attest + evidence flow', () => {
  it('attests met with a score and records the assessor', async () => {
    const id = (await createAttestation()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/cbahi/attestations/${id}/attest`)
      .send({ status: 'met', score: 95 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('met');
    expect(res.body.data.score).toBe(95);
    expect(res.body.data.assessedAt).toBeTruthy();
  });

  it('rejects an invalid attest status (400)', async () => {
    const id = (await createAttestation()).body.data._id;
    const res = await request(app)
      .post(`/api/v1/cbahi/attestations/${id}/attest`)
      .send({ status: 'super_met' });
    expect(res.status).toBe(400);
  });

  it('adds evidence (requires valid type + summary) then removes it', async () => {
    const id = (await createAttestation()).body.data._id;
    expect(
      (
        await request(app)
          .post(`/api/v1/cbahi/attestations/${id}/evidence`)
          .send({ type: 'x', summary: 's' })
      ).status
    ).toBe(400);
    const add = await request(app)
      .post(`/api/v1/cbahi/attestations/${id}/evidence`)
      .send({ type: 'policy_document', summary: 'سياسة تقييم خطر السقوط' });
    expect(add.status).toBe(201);
    const evId = add.body.attestation.evidence[0]._id;
    const del = await request(app).delete(`/api/v1/cbahi/attestations/${id}/evidence/${evId}`);
    expect(del.status).toBe(200);
    expect(del.body.data.evidence).toHaveLength(0);
  });
});

describe('W864 — dashboard compliance computation', () => {
  it('reflects met / not_applicable in coverage + compliance percentages', async () => {
    const m = (await createAttestation({ standardKey: STD_KEY })).body.data._id;
    await request(app).post(`/api/v1/cbahi/attestations/${m}/attest`).send({ status: 'met' });
    const na = (await createAttestation({ standardKey: STD_KEY_2 })).body.data._id;
    await request(app)
      .post(`/api/v1/cbahi/attestations/${na}/attest`)
      .send({ status: 'not_applicable' });

    const res = await request(app).get('/api/v1/cbahi/attestations/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.totalAttested).toBe(2);
    expect(res.body.coverageAttestedKeys).toBe(2);
    expect(res.body.byStatus.met).toBe(1);
    expect(res.body.byStatus.not_applicable).toBe(1);
    expect(res.body.compliancePct).toBeGreaterThan(0);
  });
});

describe('W864 — cross-branch isolation (W447)', () => {
  it('hides a foreign-branch attestation from GET /:id (404)', async () => {
    const other = await Attestation.create({
      branchId: BRANCH_B,
      standardKey: STD_KEY,
      standardChapter: 'PSG',
      standardCode: 'PSG.6',
      status: 'draft',
    });
    const res = await request(app).get(`/api/v1/cbahi/attestations/${other._id}`);
    expect(res.status).toBe(404);
  });

  it('GET /attestations only lists caller-branch rows', async () => {
    await createAttestation();
    await Attestation.create({
      branchId: BRANCH_B,
      standardKey: STD_KEY,
      standardChapter: 'PSG',
      standardCode: 'PSG.6',
      status: 'draft',
    });
    const res = await request(app).get('/api/v1/cbahi/attestations');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(String(res.body.items[0].branchId)).toBe(String(BRANCH_A));
  });
});

describe('W864 — DELETE role gating', () => {
  it('forbids a quality officer from deleting (403)', async () => {
    const id = (await createAttestation()).body.data._id;
    const res = await request(app).delete(`/api/v1/cbahi/attestations/${id}`);
    expect(res.status).toBe(403);
    expect(await Attestation.countDocuments({})).toBe(1);
  });

  it('allows an admin to delete (200)', async () => {
    const id = (await createAttestation()).body.data._id;
    mockAuthState.user = adminA;
    const res = await request(app).delete(`/api/v1/cbahi/attestations/${id}`);
    expect(res.status).toBe(200);
    expect(await Attestation.countDocuments({})).toBe(0);
  });
});
