'use strict';

/**
 * capa-close-behavioral-wave841.test.js — W841.
 *
 * Extends W840 with verification + closure transitions:
 * IMPLEMENTED → VERIFIED → CLOSED (MFA tier 2 required for final sign-off).
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
const ACTOR = new mongoose.Types.ObjectId();
let CapaItem;

function seed(branchId) {
  return CapaItem.create({
    type: 'corrective',
    title: 'W841 close chain',
    description: 'verification and closure',
    ownerUserId: ACTOR,
    dueDate: new Date(Date.now() + 86400000),
    branchId,
    source: { module: 'audit' },
    createdBy: ACTOR,
    status: 'OPEN',
  });
}

async function advanceToImplemented(capaId) {
  await request(app)
    .post(`/api/v1/quality/capa/${capaId}/transition`)
    .send({ to: 'IN_PROGRESS', notes: 'start' });
  await request(app)
    .post(`/api/v1/quality/capa/${capaId}/transition`)
    .send({ to: 'IMPLEMENTED', notes: 'done' });
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w841-capa-close' } });
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

describe('W841 — CAPA verification + closure (behavioral)', () => {
  it('transitions IMPLEMENTED → VERIFIED → CLOSED on own branch', async () => {
    const own = await seed(BRANCH_A);
    await advanceToImplemented(own._id);

    const verify = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'VERIFIED', notes: 'effective' });
    expect(verify.status).toBe(200);
    expect(verify.body.capa.status).toBe('VERIFIED');

    const close = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'CLOSED', notes: 'signed off' });
    expect(close.status).toBe(200);
    expect(close.body.capa.status).toBe('CLOSED');

    const persisted = await CapaItem.findById(own._id).lean();
    expect(persisted.status).toBe('CLOSED');
    expect(persisted.verifiedAt).toBeTruthy();
    expect(persisted.closedAt).toBeTruthy();
    expect(String(persisted.closedBy)).toBe(String(ACTOR));
  });

  it('rejects VERIFIED → CLOSED when MFA tier is insufficient', async () => {
    const own = await seed(BRANCH_A);
    await advanceToImplemented(own._id);
    await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'VERIFIED', notes: 'effective' });

    mockAuthState.mfaTier = 1;
    const res = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'CLOSED', notes: 'should fail' });
    mockAuthState.mfaTier = 2;

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MFA_TIER_INSUFFICIENT');
    const unchanged = await CapaItem.findById(own._id).lean();
    expect(unchanged.status).toBe('VERIFIED');
  });
});
