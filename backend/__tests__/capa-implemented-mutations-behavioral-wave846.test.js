'use strict';

/**
 * capa-implemented-mutations-behavioral-wave846.test.js — W846.
 *
 * Write-path isolation when CAPA is already IMPLEMENTED: foreign-branch
 * transitions must not mutate via loadOwnedRequest + branchFilter.
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

function seedImplemented(branchId) {
  return CapaItem.create({
    type: 'corrective',
    title: 'W846 implemented isolation',
    description: 'foreign branch guard',
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
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w846-capa-impl' } });
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

describe('W846 — CAPA IMPLEMENTED-state cross-branch isolation', () => {
  it('denies foreign-branch VERIFIED transition with 404', async () => {
    const foreign = await seedImplemented(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${foreign._id}/transition`)
      .send({ to: 'VERIFIED', notes: 'should not apply' });
    expect(res.status).toBe(404);
    expect((await CapaItem.findById(foreign._id).lean()).status).toBe('IMPLEMENTED');
  });

  it('denies foreign-branch CANCELLED transition with 404', async () => {
    const foreign = await seedImplemented(BRANCH_B);
    const res = await request(app)
      .post(`/api/v1/quality/capa/${foreign._id}/transition`)
      .send({ to: 'CANCELLED', reasonCode: 'OUT_OF_SCOPE' });
    expect(res.status).toBe(404);
    expect((await CapaItem.findById(foreign._id).lean()).status).toBe('IMPLEMENTED');
  });
});
