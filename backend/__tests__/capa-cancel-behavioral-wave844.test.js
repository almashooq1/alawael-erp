'use strict';

/**
 * capa-cancel-behavioral-wave844.test.js — W844.
 *
 * OPEN → CANCELLED requires reasonCode (no MFA tier gate).
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
    type: 'preventive',
    title: 'W844 cancel path',
    description: 'cancel behavioral',
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w844-capa-cancel' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  CapaItem = require('../models/quality/CapaItem.model');
  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'quality_officer', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W844 — CAPA OPEN → CANCELLED (behavioral)', () => {
  it('rejects without reasonCode (400)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'CANCELLED', notes: 'no reason code' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('REASON_CODE_REQUIRED');
    expect((await CapaItem.findById(own._id).lean()).status).toBe('OPEN');
  });

  it('transitions OPEN → CANCELLED with reasonCode (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'CANCELLED', reasonCode: 'SUPERSEDED', notes: 'duplicate capa opened' });
    expect(res.status).toBe(200);
    expect(res.body.capa.status).toBe('CANCELLED');
    expect((await CapaItem.findById(own._id).lean()).status).toBe('CANCELLED');
  });

  it('denies foreign-branch cancel with 404', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${foreign._id}/transition`)
      .send({ to: 'CANCELLED', reasonCode: 'OUT_OF_SCOPE' });
    expect(res.status).toBe(404);
    expect((await CapaItem.findById(foreign._id).lean()).status).toBe('OPEN');
  });
});
