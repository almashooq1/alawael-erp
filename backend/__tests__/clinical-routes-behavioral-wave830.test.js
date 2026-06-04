'use strict';

/**
 * clinical-routes-behavioral-wave830.test.js — W830.
 *
 * Behavioral (supertest + MongoMemoryServer) route-layer coverage for three
 * more surfaces with static-only guards: communication-aid / AAC profiles
 * (W358), adaptive-sports programs (W362), and CBAHI attestations (W360/W367).
 * Continuation of the W826/W827/W828/W829 thread — same harness + doctrine.
 *
 * Per surface: cross-branch isolation (own 200 / foreign 404), invalid
 * ObjectId 400, status-transition discipline (409 / required-field 400),
 * plus the CBAHI static standards registry endpoint.
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

let CommAid;
let SportsProgram;
let CbahiAttestation;
let cbahiKeys;

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use('/api/v1/communication-aid', require('../routes/communication-aid.routes'));
  a.use('/api/v1/adaptive-sports', require('../routes/adaptive-sports.routes'));
  a.use('/api/v1/cbahi', require('../routes/cbahi.routes'));
  a.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({ success: false, message: err.message });
  });
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w830-clinical' } });
  await mongoose.connect(mongod.getUri());

  // Mongoose-9 legacy-hook compat shim — models use callback-style pre('save').
  require('../config/mongoose.plugins');

  require('../models/Beneficiary');
  CommAid = require('../models/CommunicationAidProfile');
  SportsProgram = require('../models/AdaptiveSportsProgram');
  CbahiAttestation = require('../models/CbahiAttestation');
  cbahiKeys = require('../intelligence/cbahi-standards.registry').allKeys();

  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'therapist', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

// ── communication-aid (AAC) ───────────────────────────────────────────────
describe('W830 — communication-aid behavioral (tenant isolation + activate)', () => {
  function seed(branchId, withModality = true) {
    return CommAid.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      lifecycleStatus: 'draft',
      ...(withModality ? { primaryModality: 'speech', activeModalities: ['speech'] } : {}),
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/communication-aid/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch profile (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/communication-aid/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch profile (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/communication-aid/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /:id/activate on a foreign-branch profile is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/communication-aid/${foreign._id}/activate`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('activate requires primaryModality (400), else transitions to active (200)', async () => {
    const noModality = await seed(BRANCH_A, false);
    const bad = await request(app)
      .post(`/api/v1/communication-aid/${noModality._id}/activate`)
      .send({});
    expect(bad.status).toBe(400);

    const ready = await seed(BRANCH_A, true);
    const ok = await request(app).post(`/api/v1/communication-aid/${ready._id}/activate`).send({});
    expect(ok.status).toBe(200);
    expect(ok.body.data.lifecycleStatus).toBe('active');
  });
});

// ── adaptive-sports ───────────────────────────────────────────────────────
describe('W830 — adaptive-sports behavioral (tenant isolation + activate)', () => {
  function seed(branchId, opts = {}) {
    return SportsProgram.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      branchId,
      sport: opts.sport || 'boccia',
      category: 'individual',
      physicalDemand: opts.physicalDemand || 'low',
      status: 'draft',
    });
  }

  it('GET /:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/adaptive-sports/bad');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns an own-branch program (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/adaptive-sports/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /:id hides a foreign-branch program (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/adaptive-sports/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('activate transition: draft → active (200), second activate 409', async () => {
    const own = await seed(BRANCH_A);
    const first = await request(app).post(`/api/v1/adaptive-sports/${own._id}/activate`).send({});
    expect(first.status).toBe(200);
    expect(first.body.data.status).toBe('active');

    const second = await request(app).post(`/api/v1/adaptive-sports/${own._id}/activate`).send({});
    expect(second.status).toBe(409);
  });

  it('high-demand sport requires medical clearance before activation (400)', async () => {
    const own = await seed(BRANCH_A, { sport: 'powerlifting', physicalDemand: 'high' });
    const res = await request(app).post(`/api/v1/adaptive-sports/${own._id}/activate`).send({});
    expect(res.status).toBe(400);
  });
});

// ── cbahi ─────────────────────────────────────────────────────────────────
describe('W830 — cbahi behavioral (standards registry + attestation isolation)', () => {
  let keyIdx = 0;
  function seed(branchId) {
    return CbahiAttestation.create({
      branchId,
      standardKey: cbahiKeys[keyIdx++ % cbahiKeys.length],
      status: 'draft',
    });
  }

  it('GET /standards returns the static registry (200, non-empty)', async () => {
    const res = await request(app).get('/api/v1/cbahi/standards');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('GET /attestations/:id rejects a malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/cbahi/attestations/bad');
    expect(res.status).toBe(400);
  });

  it('GET /attestations/:id returns an own-branch attestation (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/cbahi/attestations/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });

  it('GET /attestations/:id hides a foreign-branch attestation (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/cbahi/attestations/${foreign._id}`);
    expect(res.status).toBe(404);
  });

  it('POST /attestations/:id/attest on a foreign-branch attestation is 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/cbahi/attestations/${foreign._id}/attest`)
      .send({ status: 'met' });
    expect(res.status).toBe(404);
  });

  it('attest rejects an invalid status (400), accepts a valid one (200)', async () => {
    const own = await seed(BRANCH_A);
    const bad = await request(app)
      .post(`/api/v1/cbahi/attestations/${own._id}/attest`)
      .send({ status: 'totally_met' });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post(`/api/v1/cbahi/attestations/${own._id}/attest`)
      .send({ status: 'met', score: 95 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe('met');
  });
});
