'use strict';

/** episodes-routes-branch-isolation-wave905.test.js — W905 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockAuthState = { user: null };
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const BENE_A = new mongoose.Types.ObjectId();

const coordinatorA = {
  _id: new mongoose.Types.ObjectId(),
  role: 'coordinator',
  branchId: String(BRANCH_A),
};

let mongod;
let episodeB;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/episodes', require('../routes/episodes.routes'));
  return app;
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w905-episodes' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  require('../models/Beneficiary');
  require('../models/User');
  const EpisodeOfCare = require('../models/EpisodeOfCare');
  await mongoose.connection.collection('beneficiaries').insertOne({
    _id: BENE_A,
    branchId: BRANCH_A,
    status: 'active',
  });
  await EpisodeOfCare.collection.insertOne({
    episodeNumber: 'EP-A-905',
    beneficiaryId: BENE_A,
    branchId: BRANCH_A,
    status: 'active',
    currentPhase: 'referral',
    isArchived: false,
  });
  const ins = await EpisodeOfCare.collection.insertOne({
    episodeNumber: 'EP-B-905',
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: BRANCH_B,
    status: 'active',
    currentPhase: 'referral',
    isArchived: false,
  });
  episodeB = ins.insertedId;
});

beforeEach(() => {
  mockAuthState.user = coordinatorA;
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W905 — episodes isolation', () => {
  it('lists only in-scope episodes', async () => {
    const res = await request(buildApp()).get('/api/episodes');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });

  it('returns 404 for foreign-branch episode GET /:id', async () => {
    const res = await request(buildApp()).get(`/api/episodes/${episodeB}`);
    expect(res.status).toBe(404);
  });
});
