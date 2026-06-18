'use strict';

/**
 * alerts-workflow-branch-isolation-wave1409.test.js — W1409
 *
 * Cross-branch IDOR regression test for routes/alerts-workflow.routes.js.
 *
 * Before W1409 every :id-keyed action — POST /:id/{acknowledge,assign,snooze,
 * mute,resolve,comments} (WRITES) and GET /:id/timeline (READ) — acted on any
 * branch's Alert with no per-document ownership check. The router is
 * authenticated (global authenticate) but had no branch scoping, so any
 * branch-restricted user could read OR mutate another branch's alerts by id.
 *
 * W1409 adds requireBranchAccess + a branchScopedResourceParam guard on :id
 * (runs before the handlers). MFA/role gating is unchanged; this suite isolates
 * the branch guard.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { createAlertsWorkflowRouter } = require('../routes/alerts-workflow.routes');

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

// A branch-A therapist — a branch-restricted role (NOT cross-branch).
const therapistA = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'therapist',
  branchId: String(BRANCH_A),
};

const authState = { user: therapistA };

// Minimal workflow stub — the factory only requires acknowledgeAlert to exist.
// For cross-branch requests the param guard 403s before any of these run.
const workflow = {
  acknowledgeAlert: async () => ({ ok: true, alert: {} }),
  assignAlert: async () => ({ ok: true, alert: {} }),
  snoozeAlert: async () => ({ ok: true, alert: {} }),
  muteAlert: async () => ({ ok: true, alert: {} }),
  resolveAlert: async () => ({ ok: true, alert: {} }),
  commentAlert: async () => ({ ok: true, alert: {} }),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = authState.user;
    next();
  });
  app.use('/api/v1/alerts', createAlertsWorkflowRouter({ workflow }));
  return app;
}

let mongod;
let Alert;

async function seedAlert(branchId) {
  const _id = new mongoose.Types.ObjectId();
  await Alert.collection.insertOne({
    _id,
    branchId,
    state: { current: 'OPEN', transitions: [] },
    comments: [],
    reopens: [],
  });
  return _id;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1409-alerts-wf' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Alert = require('../alerts/alert.model').model;
});

beforeEach(() => {
  authState.user = therapistA;
});

afterEach(async () => {
  await Alert.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1409 — alerts-workflow GET /:id/timeline cross-branch isolation', () => {
  it('denies reading the timeline of a foreign-branch alert (was: leaked)', async () => {
    const id = await seedAlert(BRANCH_B);
    const res = await request(buildApp()).get(`/api/v1/alerts/${id}/timeline`);
    expect(res.status).toBe(403);
  });

  it('allows reading the timeline of an own-branch alert', async () => {
    const id = await seedAlert(BRANCH_A);
    const res = await request(buildApp()).get(`/api/v1/alerts/${id}/timeline`);
    expect(res.status).toBe(200);
  });
});

describe('W1409 — alerts-workflow POST /:id/acknowledge cross-branch isolation', () => {
  it('denies acknowledging a foreign-branch alert (was: write-leak)', async () => {
    const id = await seedAlert(BRANCH_B);
    const res = await request(buildApp()).post(`/api/v1/alerts/${id}/acknowledge`).send({});
    expect(res.status).toBe(403);
  });

  it('lets an own-branch acknowledge THROUGH the guard (not 403/404)', async () => {
    const id = await seedAlert(BRANCH_A);
    const res = await request(buildApp()).post(`/api/v1/alerts/${id}/acknowledge`).send({});
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(404);
  });
});

describe('W1409 — no regression', () => {
  it('an admin (cross-branch role) can still read any alert timeline', async () => {
    authState.user = { id: 'admin1', role: 'admin' };
    const id = await seedAlert(BRANCH_B);
    const res = await request(buildApp()).get(`/api/v1/alerts/${id}/timeline`);
    expect(res.status).toBe(200);
  });
});
