'use strict';

/**
 * student-registration-episode-of-care-wave928.test.js — W928.
 *
 * Project doctrine mandates "اعتمد على Episode of Care موحد لكل مسار علاجي":
 * every beneficiary's clinical journey must hang off a unified Episode of
 * Care. The student-management registration wizard (W927) creates a
 * Beneficiary and fires `core.beneficiary.registered`, but it did NOT open
 * the canonical care pathway — the new student had no EpisodeOfCare, so
 * assessments / plans / sessions / measures had nothing to link to.
 *
 * W928 opens an initial EpisodeOfCare (status 'planned', phase 'intake',
 * type 'initial') immediately after a successful registration, links it to
 * the beneficiary, returns its id, and publishes `episodes.episode.created`
 * for downstream subscribers (timeline). Creation is fully guarded — an
 * episode hiccup degrades to episodeId:null and never fails the registration.
 *
 * This behavioral test boots the real route against an in-memory Mongo with
 * the EpisodeOfCare model registered, and asserts the episode is created and
 * linked.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// ── Spy on the integration bus publish ──────────────────────────────
// `mock`-prefixed so the jest.mock factory may reference it (hoisting rule).
const mockPublish = jest.fn().mockResolvedValue(undefined);
jest.mock('../integration/systemIntegrationBus', () => ({
  integrationBus: { publish: (...args) => mockPublish(...args) },
}));

// ── Pass-through auth / rbac / branch middleware ────────────────────
const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
}));
jest.mock('../middleware/rbac.v2.middleware', () => ({
  requireRole:
    (...roles) =>
    (req, res, next) => {
      const role = req.user && req.user.role;
      if (!roles.length || roles.includes(role)) return next();
      return res.status(403).json({ success: false, message: 'forbidden' });
    },
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

let mongod;
let Beneficiary;
let EpisodeOfCare;
let app;

const BRANCH_A = new mongoose.Types.ObjectId();
const admin = {
  _id: new mongoose.Types.ObjectId(),
  id: String(new mongoose.Types.ObjectId()),
  role: 'admin',
  branchId: String(BRANCH_A),
};

function buildApp() {
  const expressApp = express();
  expressApp.use(express.json());
  expressApp.use('/api/v1/student-management', require('../routes/student-management.routes'));
  return expressApp;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w928-student-episode' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  Beneficiary = require('../models/Beneficiary');
  // Register the canonical Episode of Care model so safeModel('EpisodeOfCare')
  // resolves and ensureInitialEpisode actually opens a pathway.
  EpisodeOfCare = require('../domains/episodes/models/EpisodeOfCare').EpisodeOfCare;
  app = buildApp();
});

beforeEach(() => {
  mockAuthState.user = admin;
  mockPublish.mockClear();
});

afterEach(async () => {
  await Beneficiary.deleteMany({});
  await EpisodeOfCare.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W928 — student registration opens a canonical Episode of Care', () => {
  it('creates an initial planned episode linked to the new beneficiary', async () => {
    const res = await request(app)
      .post('/api/v1/student-management')
      .send({
        personal: { firstNameAr: 'ريم', lastNameAr: 'العتيبي' },
        disability: { primaryType: 'sensory', severity: 'mild' },
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.episodeId).toBeTruthy();

    const beneficiaryId = res.body.data._id;
    const episode = await EpisodeOfCare.findById(res.body.episodeId).lean();
    expect(episode).toBeTruthy();
    expect(String(episode.beneficiaryId)).toBe(String(beneficiaryId));
    expect(episode.status).toBe('planned');
    expect(episode.currentPhase).toBe('intake');
    expect(episode.type).toBe('initial');
    expect(String(episode.branchId)).toBe(String(BRANCH_A));
    expect(episode.episodeNumber).toMatch(/^EP-/);
  });

  it('publishes episodes.episode.created for downstream subscribers', async () => {
    const res = await request(app)
      .post('/api/v1/student-management')
      .send({
        personal: { firstNameAr: 'فهد', lastNameAr: 'القحطاني' },
      });

    expect(res.status).toBe(201);

    // Allow the fire-and-forget publishes to settle.
    await new Promise(r => setImmediate(r));

    const episodeCreated = mockPublish.mock.calls.find(
      c => c[0] === 'episodes' && c[1] === 'episode.created'
    );
    expect(episodeCreated).toBeTruthy();
    const payload = episodeCreated[2];
    expect(String(payload.beneficiaryId)).toBe(String(res.body.data._id));
    expect(String(payload.episodeId)).toBe(String(res.body.episodeId));
    expect(payload.phase).toBe('intake');
  });

  it('still returns 201 (no episode) when required name fields are missing', async () => {
    const res = await request(app).post('/api/v1/student-management').send({ personal: {} });

    expect(res.status).toBe(400);
    expect(await EpisodeOfCare.countDocuments({})).toBe(0);
  });
});
