'use strict';

/**
 * capa-verification-failure-behavioral-wave845.test.js — W845.
 *
 * IMPLEMENTED → IN_PROGRESS (verification failed) requires reasonCode.
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

function seedImplemented(branchId) {
  return CapaItem.create({
    type: 'corrective',
    title: 'W845 verification failure',
    description: 'back to work',
    ownerUserId: ACTOR,
    dueDate: new Date(Date.now() + 86400000),
    branchId,
    source: { module: 'audit' },
    createdBy: ACTOR,
    status: 'IMPLEMENTED',
    implementedAt: new Date(),
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w845-capa-verify-fail' } });
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

describe('W845 — CAPA IMPLEMENTED → IN_PROGRESS (verification failure)', () => {
  it('rejects without reasonCode (400)', async () => {
    const capa = await seedImplemented(BRANCH_A);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${capa._id}/transition`)
      .send({ to: 'IN_PROGRESS', notes: 'failed verification' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('REASON_CODE_REQUIRED');
    expect((await CapaItem.findById(capa._id).lean()).status).toBe('IMPLEMENTED');
  });

  it('transitions IMPLEMENTED → IN_PROGRESS with reasonCode (200)', async () => {
    const capa = await seedImplemented(BRANCH_A);
    const res = await request(app).post(`/api/v1/quality/capa/${capa._id}/transition`).send({
      to: 'IN_PROGRESS',
      reasonCode: 'VERIFICATION_FAILED',
      notes: 'action not effective yet',
    });
    expect(res.status).toBe(200);
    expect(res.body.capa.status).toBe('IN_PROGRESS');
    expect((await CapaItem.findById(capa._id).lean()).status).toBe('IN_PROGRESS');
  });
});
