'use strict';

/**
 * research-study-branch-isolation-wave1602.test.js — W1602
 *
 * domains/research: the canonical ResearchStudy model had NO branch field and ResearchService
 * applied no branch filter, so any authenticated user could list/read/update/transition every
 * branch's research study — and getStudy populates participants.beneficiaryId
 * (firstName/lastName/fileNumber) → cross-branch enrolled-beneficiary PHI. W1602 adds branchId
 * to the model, threads branchFilter(req) through every service op (findOne scoped, list
 * filtered), stamps branchId on create, and strips privileged fields (status/code/branchId/
 * createdBy/…) from the create+update payload (mass-assignment).
 */
jest.unmock('mongoose');
jest.setTimeout(60000);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const mockUser = { u: null };
const mockScope = { s: undefined };

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
  branchFilter: () =>
    mockScope.s && mockScope.s.restricted ? { branchId: mockScope.s.branchId } : {},
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;
let ResearchStudy;
const S = { a: null, b: null };

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1602-research' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  ResearchStudy = require('../models/ResearchStudy');
  const stub = new mongoose.Schema({ name: String }, { strict: false });
  for (const n of ['User', 'Beneficiary']) if (!mongoose.models[n]) mongoose.model(n, stub);
  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = mockUser.u;
    next();
  });
  app.use('/api/research', require('../domains/research/routes/research.routes'));

  const seed = (branchId, title) =>
    ResearchStudy.collection.insertOne({
      branchId,
      title,
      abstract: 'a',
      studyType: 'prospective',
      status: 'draft',
      principalInvestigator: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
      createdAt: new Date(),
    });
  S.a = (await seed(BRANCH_A, 'Study A')).insertedId;
  S.b = (await seed(BRANCH_B, 'Study B')).insertedId;
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'researcher' };
  mockScope.s = { restricted: true, branchId: BRANCH_A };
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/research';

describe('W1602 — research study branch isolation', () => {
  it('GET /:id — restricted user 404s on a foreign-branch study (no PHI read)', async () => {
    expect((await request(app).get(`${base}/${S.b}`)).status).toBe(404);
    expect((await request(app).get(`${base}/${S.a}`)).status).toBe(200);
  });

  it('GET / — restricted user lists only own-branch studies', async () => {
    const r = await request(app).get(base);
    expect(r.status).toBe(200);
    const ids = r.body.data.map(d => String(d._id));
    expect(ids).toContain(String(S.a));
    expect(ids).not.toContain(String(S.b));
  });

  it('PUT /:id — restricted user 404s updating a foreign-branch study', async () => {
    const r = await request(app).put(`${base}/${S.b}`).send({ title: 'hacked' });
    expect(r.status).toBe(404);
  });

  it('PUT /:id — own study: forged status is stripped, legit field applies', async () => {
    const r = await request(app).put(`${base}/${S.a}`).send({ status: 'active', title: 'Renamed A' });
    expect(r.status).toBe(200);
    expect(r.body.data.status).toBe('draft'); // status change must go via /:id/status, not PUT
    expect(r.body.data.title).toBe('Renamed A');
  });

  it('POST / — create stamps caller branch + strips forged status', async () => {
    const r = await request(app)
      .post(base)
      .send({
        title: 'New Study',
        type: 'prospective', // validateCreateStudy checks `type`
        abstract: 'x',
        studyType: 'prospective', // model requires `studyType`
        principalInvestigator: String(new mongoose.Types.ObjectId()),
        status: 'active', // forged — must be stripped
        branchId: String(BRANCH_B), // spoof — must be overridden to caller branch
      });
    expect(r.status).toBe(201);
    expect(String(r.body.data.branchId)).toBe(String(BRANCH_A));
    expect(r.body.data.status).toBe('draft');
  });

  it('cross-branch role sees any branch study', async () => {
    mockScope.s = { restricted: false };
    expect((await request(app).get(`${base}/${S.b}`)).status).toBe(200);
  });

  it('static: model has branchId + service threads branchFilter', () => {
    const model = fs.readFileSync(path.join(__dirname, '..', 'models', 'ResearchStudy.js'), 'utf8');
    expect(model).toMatch(/branchId: \{\s*type: mongoose\.Schema\.Types\.ObjectId,\s*ref: 'Branch'/);
    const svc = fs.readFileSync(
      path.join(__dirname, '..', 'domains', 'research', 'services', 'ResearchService.js'),
      'utf8'
    );
    expect(svc).toMatch(/async getStudy\(id, branchFilter = \{\}\)/);
    expect((svc.match(/\.\.\.branchFilter/g) || []).length).toBeGreaterThanOrEqual(6);
    const routes = fs.readFileSync(
      path.join(__dirname, '..', 'domains', 'research', 'routes', 'research.routes.js'),
      'utf8'
    );
    expect(routes).toMatch(/function stripStudy\(body\)/);
    expect((routes.match(/branchFilter\(req\)/g) || []).length).toBeGreaterThanOrEqual(7);
  });
});
