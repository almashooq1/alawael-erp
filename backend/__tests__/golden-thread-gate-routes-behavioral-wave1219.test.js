'use strict';

/**
 * golden-thread-gate-routes-behavioral-wave1219.test.js — ROUTE-layer
 * behavioral coverage for the W1204 R3 interface gate (distinct from the
 * pure/static wave1204 guard): real Express + supertest + real
 * domains/goals + domains/sessions routers + real assertBranchMatch
 * middlewares + MongoMemoryServer. Only the actor injection is stubbed.
 *
 * Proves the THREE gate modes over HTTP:
 *   off     → writes pass untouched (default — deploy-safe)
 *   warn    → writes pass + goldenThread.warnings in the envelope
 *   enforce → 422 GOLDEN_THREAD_VIOLATION, nothing persisted
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/golden-thread-gate-routes-behavioral-wave1219.test.js --runInBand
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let TherapeuticGoal;
let ClinicalSession;
let app;

const BRANCH_A = new mongoose.Types.ObjectId();
const BEN_A = new mongoose.Types.ObjectId();
const ADMIN = {
  id: String(new mongoose.Types.ObjectId()),
  role: 'admin',
  branchId: String(BRANCH_A),
};

const mockAuthState = { user: ADMIN };

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1215-gate-routes' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins');

  ({ TherapeuticGoal } = require('../domains/goals/models/TherapeuticGoal'));
  ({ ClinicalSession } = require('../domains/sessions/models/ClinicalSession'));

  // The beneficiary referenced by goal/session payloads (raw insert — the
  // branch-ownership middlewares only read _id + branchId).
  const Beneficiary = mongoose.model(
    'Beneficiary',
    new mongoose.Schema(
      { branchId: mongoose.Schema.Types.ObjectId },
      { collection: 'beneficiaries_w1215' }
    )
  );
  await Beneficiary.collection.insertOne({ _id: BEN_A, branchId: BRANCH_A });

  app = express();
  app.use(express.json());
  // dualMountAuth normally injects the authenticated actor — stub that layer.
  app.use((req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  });
  app.use('/api/v1/goals', require('../domains/goals/routes/goals.routes'));
  app.use('/api/v1/sessions', require('../domains/sessions/routes/sessions.routes'));
});

afterAll(async () => {
  delete process.env.GOLDEN_THREAD_ENFORCEMENT;
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  // Isolation guard: this suite may run against a persisted shared Mongo URI
  // in CI/local, so ensure no residue from other suites affects first-test counts.
  await TherapeuticGoal.deleteMany({});
  await ClinicalSession.deleteMany({});
});

afterEach(async () => {
  delete process.env.GOLDEN_THREAD_ENFORCEMENT;
  await TherapeuticGoal.deleteMany({});
  await ClinicalSession.deleteMany({});
});

function goalPayload(overrides = {}) {
  return {
    beneficiaryId: String(BEN_A),
    episodeId: String(new mongoose.Types.ObjectId()),
    title: 'هدف نطق تجريبي',
    type: 'short_term',
    startDate: new Date().toISOString(),
    target: { value: 100 },
    ...overrides,
  };
}

async function seedScheduledSession() {
  const doc = await ClinicalSession.create({
    beneficiaryId: BEN_A,
    episodeId: new mongoose.Types.ObjectId(),
    therapistId: new mongoose.Types.ObjectId(),
    type: 'individual',
    status: 'scheduled',
    scheduledDate: new Date(),
  });
  return doc;
}

describe('W1219 goal-create gate over HTTP (POST /api/v1/goals/goals)', () => {
  test('default (off): goal without measure passes — deploy-safe', async () => {
    const res = await request(app).post('/api/v1/goals/goals').send(goalPayload());
    expect(res.status).toBe(201);
    expect(res.body.goldenThread).toBeUndefined();
    expect(await TherapeuticGoal.countDocuments({})).toBe(1);
  });

  test('warn: goal without measure passes WITH warnings in the envelope', async () => {
    process.env.GOLDEN_THREAD_ENFORCEMENT = 'warn';
    const res = await request(app).post('/api/v1/goals/goals').send(goalPayload());
    expect(res.status).toBe(201);
    expect(res.body.goldenThread.mode).toBe('warn');
    expect(res.body.goldenThread.warnings[0].code).toBe('GOAL_WITHOUT_MEASURE');
    expect(await TherapeuticGoal.countDocuments({})).toBe(1);
  });

  test('enforce: goal without measure → 422 GOLDEN_THREAD_VIOLATION, nothing persisted', async () => {
    process.env.GOLDEN_THREAD_ENFORCEMENT = 'enforce';
    const res = await request(app).post('/api/v1/goals/goals').send(goalPayload());
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('GOLDEN_THREAD_VIOLATION');
    expect(res.body.violations[0].code).toBe('GOAL_WITHOUT_MEASURE');
    expect(await TherapeuticGoal.countDocuments({})).toBe(0);
  });

  test('enforce: goal WITH a measure link passes (linkedMeasures shape)', async () => {
    process.env.GOLDEN_THREAD_ENFORCEMENT = 'enforce';
    const res = await request(app)
      .post('/api/v1/goals/goals')
      .send(
        goalPayload({ linkedMeasures: [{ measureId: String(new mongoose.Types.ObjectId()) }] })
      );
    expect(res.status).toBe(201);
    expect(await TherapeuticGoal.countDocuments({})).toBe(1);
  });
});

describe('W1219 session-complete gate over HTTP (PUT /api/v1/sessions/:id/complete)', () => {
  test('default (off): completion without goalProgress passes', async () => {
    const session = await seedScheduledSession();
    const res = await request(app)
      .put(`/api/v1/sessions/${session._id}/complete`)
      .send({ duration: 45 });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  test('enforce: completion without goalProgress → 422, session stays scheduled', async () => {
    process.env.GOLDEN_THREAD_ENFORCEMENT = 'enforce';
    const session = await seedScheduledSession();
    const res = await request(app)
      .put(`/api/v1/sessions/${session._id}/complete`)
      .send({ duration: 45 });
    expect(res.status).toBe(422);
    expect(res.body.violations[0].code).toBe('SESSION_WITHOUT_GOAL');
    const fresh = await ClinicalSession.findById(session._id).lean();
    expect(fresh.status).toBe('scheduled');
  });

  test('enforce: completion WITH goalProgress[].goalId passes', async () => {
    process.env.GOLDEN_THREAD_ENFORCEMENT = 'enforce';
    const session = await seedScheduledSession();
    const res = await request(app)
      .put(`/api/v1/sessions/${session._id}/complete`)
      .send({
        duration: 45,
        goalProgress: [{ goalId: String(new mongoose.Types.ObjectId()), rating: 'developing' }],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.goalProgress).toHaveLength(1);
  });

  test('scheduling is NOT gated even under enforce (intake flow stays open)', async () => {
    process.env.GOLDEN_THREAD_ENFORCEMENT = 'enforce';
    const res = await request(app)
      .post('/api/v1/sessions')
      .send({
        beneficiaryId: String(BEN_A),
        episodeId: String(new mongoose.Types.ObjectId()),
        therapistId: String(new mongoose.Types.ObjectId()),
        scheduledDate: new Date().toISOString(),
      });
    expect(res.status).toBe(201);
  });
});
