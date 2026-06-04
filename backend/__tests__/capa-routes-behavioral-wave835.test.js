'use strict';

/**
 * capa-routes-behavioral-wave835.test.js — W835.
 *
 * Behavioral counterpart to W834 CAPA branch isolation hardening. Boots the real
 * capa router with requireBranchAccess + branchFilter and proves foreign-branch
 * CAPA items are invisible (404) on GET /:id and GET /:id/audit.
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

function seed(branchId) {
  return CapaItem.create({
    type: 'corrective',
    title: 'Test CAPA',
    description: 'Isolation test',
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w835-capa' } });
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

describe('W835 — CAPA cross-branch isolation (behavioral)', () => {
  it('GET /:id rejects malformed ObjectId with 400', async () => {
    const res = await request(app).get('/api/v1/quality/capa/not-an-id');
    expect(res.status).toBe(400);
  });

  it('GET /:id returns own-branch CAPA (200)', async () => {
    const own = await seed(BRANCH_A);
    const res = await request(app).get(`/api/v1/quality/capa/${own._id}`);
    expect(res.status).toBe(200);
    expect(res.body.capa.title).toBe('Test CAPA');
  });

  it('GET /:id hides foreign-branch CAPA (404, no leak)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/quality/capa/${foreign._id}`);
    expect(res.status).toBe(404);
    expect(res.body.capa).toBeUndefined();
  });

  it('GET /:id/audit hides foreign-branch CAPA (404)', async () => {
    const foreign = await seed(BRANCH_B);
    const res = await request(app).get(`/api/v1/quality/capa/${foreign._id}/audit`);
    expect(res.status).toBe(404);
  });
});
