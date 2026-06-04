'use strict';

/**
 * capa-transition-behavioral-wave838.test.js — W838.
 *
 * Extends W835 CAPA route behavioral coverage to POST /:id/transition:
 * proves branch ownership is enforced before the service mutates state, and
 * that a valid own-branch OPEN→IN_PROGRESS transition persists via the real
 * capa.service + CapaItem pre-save hook chain.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createCapaService } = require('../services/quality/capa.service');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));
jest.mock('../middleware/requireMfaTier', () => ({
  attachMfaActor: (req, _res, next) => {
    req.mfaActor = { tier: 2, userId: mockAuthState.user?._id || mockAuthState.user?.id };
    next();
  },
  requireMfaTier: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();
let CapaItem;

function seed(branchId, title = 'Transition test CAPA') {
  return CapaItem.create({
    type: 'corrective',
    title,
    description: 'W838 behavioral transition',
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
    req.app._capaService = createCapaService();
    next();
  });
  a.use('/api/v1/quality/capa', require('../routes/quality/capa.routes'));
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w838-capa-transition' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  CapaItem = require('../models/quality/CapaItem.model');
  mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'therapist', branchId: BRANCH_A };
  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W838 — CAPA POST /:id/transition (behavioral)', () => {
  it('rejects malformed ObjectId with 400', async () => {
    const res = await request(app)
      .post('/api/v1/quality/capa/not-an-id/transition')
      .send({ to: 'IN_PROGRESS' });
    expect(res.status).toBe(400);
  });

  it('denies foreign-branch transition with 404 (no mutation)', async () => {
    const foreign = await seed(BRANCH_B, 'Foreign CAPA');
    const res = await request(app)
      .post(`/api/v1/quality/capa/${foreign._id}/transition`)
      .send({ to: 'IN_PROGRESS' });
    expect(res.status).toBe(404);
    const unchanged = await CapaItem.findById(foreign._id).lean();
    expect(unchanged.status).toBe('OPEN');
  });

  it('transitions own-branch OPEN → IN_PROGRESS (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'IN_PROGRESS', notes: 'starting work' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.capa.status).toBe('IN_PROGRESS');
    const persisted = await CapaItem.findById(own._id).lean();
    expect(persisted.status).toBe('IN_PROGRESS');
  });
});
