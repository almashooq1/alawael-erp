'use strict';

/**
 * capa-reject-behavioral-wave843.test.js — W843.
 *
 * OPEN → REJECTED requires reasonCode + MFA tier 2 (W337 lib rules).
 * Proves the route/service/hook chain enforces both on own-branch rows.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createCapaService } = require('../services/quality/capa.service');

const mockAuthState = { user: null, mfaTier: 2 };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));
jest.mock('../middleware/requireMfaTier', () => ({
  attachMfaActor: (req, _res, next) => {
    req.mfaActor = {
      tier: mockAuthState.mfaTier,
      userId: mockAuthState.user?._id || mockAuthState.user?.id,
    };
    next();
  },
  requireMfaTier: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();
let CapaItem;

function seed(branchId) {
  return CapaItem.create({
    type: 'corrective',
    title: 'W843 reject path',
    description: 'reject behavioral',
    ownerUserId: ACTOR,
    dueDate: new Date(Date.now() + 86400000),
    branchId,
    source: { module: 'audit' },
    createdBy: ACTOR,
    status: 'OPEN',
  });
}

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.app._capaService = createCapaService({ enforceMfa: true });
    next();
  });
  a.use('/api/v1/quality/capa', require('../routes/quality/capa.routes'));
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w843-capa-reject' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  CapaItem = require('../models/quality/CapaItem.model');
  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'quality_officer', branchId: BRANCH_A };
  mockAuthState.mfaTier = 2;
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W843 — CAPA OPEN → REJECTED (behavioral)', () => {
  it('rejects without reasonCode (400)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'REJECTED', notes: 'missing reason' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('REASON_CODE_REQUIRED');
    const unchanged = await CapaItem.findById(own._id).lean();
    expect(unchanged.status).toBe('OPEN');
  });

  it('rejects with reasonCode but MFA tier 1 (403)', async () => {
    const own = await seed(BRANCH_A);
    mockAuthState.mfaTier = 1;
    const res = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'REJECTED', reasonCode: 'OUT_OF_SCOPE', notes: 'not applicable' });
    mockAuthState.mfaTier = 2;
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MFA_TIER_INSUFFICIENT');
    const unchanged = await CapaItem.findById(own._id).lean();
    expect(unchanged.status).toBe('OPEN');
  });

  it('transitions OPEN → REJECTED with reasonCode + tier 2 (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'REJECTED', reasonCode: 'DUPLICATE_CAPA', notes: 'duplicate finding' });
    expect(res.status).toBe(200);
    expect(res.body.capa.status).toBe('REJECTED');
    const persisted = await CapaItem.findById(own._id).lean();
    expect(persisted.status).toBe('REJECTED');
  });

  it('denies foreign-branch reject with 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${foreign._id}/transition`)
      .send({ to: 'REJECTED', reasonCode: 'OUT_OF_SCOPE' });
    expect(res.status).toBe(404);
    const unchanged = await CapaItem.findById(foreign._id).lean();
    expect(unchanged.status).toBe('OPEN');
  });
});
