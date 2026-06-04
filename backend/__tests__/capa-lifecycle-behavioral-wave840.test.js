'use strict';

/**
 * capa-lifecycle-behavioral-wave840.test.js — W840.
 *
 * Extends W838 with a second valid transition on the own-branch path:
 * OPEN → IN_PROGRESS → IMPLEMENTED via POST /:id/transition.
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
const ACTOR = new mongoose.Types.ObjectId();
let CapaItem;

function seed(branchId) {
  return CapaItem.create({
    type: 'corrective',
    title: 'W840 lifecycle chain',
    description: 'behavioral transition chain',
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w840-capa-lifecycle' } });
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

describe('W840 — CAPA transition chain (behavioral)', () => {
  it('transitions OPEN → IN_PROGRESS → IMPLEMENTED on own branch', async () => {
    const own = await seed(BRANCH_A);

    const step1 = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'IN_PROGRESS', notes: 'start' });
    expect(step1.status).toBe(200);
    expect(step1.body.capa.status).toBe('IN_PROGRESS');

    const step2 = await request(app)
      .post(`/api/v1/quality/capa/${own._id}/transition`)
      .send({ to: 'IMPLEMENTED', notes: 'done', reasonCode: 'CAPA_IMPLEMENTED' });
    expect(step2.status).toBe(200);
    expect(step2.body.capa.status).toBe('IMPLEMENTED');

    const persisted = await CapaItem.findById(own._id).lean();
    expect(persisted.status).toBe('IMPLEMENTED');
    expect(persisted.implementedAt).toBeTruthy();
  });
});
