'use strict';

/**
 * ai-recommendations-branch-isolation-wave1409.test.js — W1409
 *
 * Cross-branch IDOR regression test for routes/ai-recommendations.routes.js.
 *
 * Before W1409, GET /:id (full bundle + explainability) and GET /:id/audit
 * (state-transition trail) were gated only by requireMfaTier(1) — which
 * authorises the ACTION, not the branch. Any MFA-tier-1 user from any branch
 * could read any AiRecommendationBundle by id. W1409 adds requireBranchAccess +
 * a branchScopedResourceParam guard on :id (which runs BEFORE requireMfaTier,
 * so cross-branch is rejected at the param layer).
 *
 * MFA + auth are mocked to pass-through so this suite isolates the branch
 * guard's behaviour (MFA is exercised by its own suites).
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));
jest.mock('../middleware/requireMfaTier', () => ({
  attachMfaActor: (_req, _res, next) => next(),
  requireMfaTier: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

const supervisorA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'supervisor',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/ai-recommendations', require('../routes/ai-recommendations.routes'));
  return app;
}

let mongod;
let Bundle;

async function seedBundle(branchId) {
  const _id = new mongoose.Types.ObjectId();
  await Bundle.collection.insertOne({
    _id,
    branchId,
    status: 'PENDING_REVIEW',
    history: [{ at: new Date(), note: 'seed' }],
  });
  return _id;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1409-ai-rec' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/AiRecommendationBundle');
  Bundle = mongoose.model('AiRecommendationBundle');
});

beforeEach(() => {
  mockAuthState.user = supervisorA;
});

afterEach(async () => {
  await Bundle.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1409 — ai-recommendations GET /:id cross-branch isolation', () => {
  it('denies reading a foreign-branch bundle (was: leaked)', async () => {
    const id = await seedBundle(BRANCH_B);
    const res = await request(buildApp()).get(`/api/v1/ai-recommendations/${id}`);
    expect(res.status).toBe(403);
    expect(String(res.body.error || res.body.message || '')).toMatch(/cross-branch/i);
  });

  it('allows reading an own-branch bundle', async () => {
    const id = await seedBundle(BRANCH_A);
    const res = await request(buildApp()).get(`/api/v1/ai-recommendations/${id}`);
    expect(res.status).toBe(200);
  });

  it('denies the audit trail of a foreign-branch bundle', async () => {
    const id = await seedBundle(BRANCH_B);
    const res = await request(buildApp()).get(`/api/v1/ai-recommendations/${id}/audit`);
    expect(res.status).toBe(403);
  });
});

describe('W1409 — no regression', () => {
  it('an admin (cross-branch role) can still read any bundle', async () => {
    mockAuthState.user = { id: 'admin1', role: 'admin' };
    const id = await seedBundle(BRANCH_B);
    const res = await request(buildApp()).get(`/api/v1/ai-recommendations/${id}`);
    expect(res.status).toBe(200);
  });

  it('a non-ObjectId id (e.g. /metrics) is not blocked by the param guard', async () => {
    const res = await request(buildApp()).get('/api/v1/ai-recommendations/metrics');
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(404);
  });
});
