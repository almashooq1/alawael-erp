'use strict';

/**
 * hr-copilot-compliance-branch-isolation-behavioral-wave1143.test.js — W269.
 *
 * The two HR routes the W1142 guard had baselined as KNOWN_UNGATED were genuine
 * cross-branch reads: their role allow-lists include branch-restricted manager /
 * hr_manager / hr, so a branch-A caller could summarize / verify a branch-B
 * employee. W1143 gated both; this proves the runtime 403 (and own-branch 200).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-copilot-compliance-branch-isolation-behavioral-wave1143.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
  authenticateToken: (req, _res, next) => {
    req.user = global.__hcUser || null;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
let Employee;
let empA;
let empB;
let app;

const asManagerA = () => {
  global.__hcUser = { id: new mongoose.Types.ObjectId(), role: 'manager', branchId: BRANCH_A };
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1143-hr-copilot-compliance' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  Employee = mongoose.model(
    'Employee',
    new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId, national_id: String })
  );
  empA = await Employee.create({ branch_id: BRANCH_A, national_id: '1' });
  empB = await Employee.create({ branch_id: BRANCH_B, national_id: '2' });

  const copilot = {
    stats: () => ({ available: false }),
    summarizeEmployee: async () => ({ available: true }),
    draftLetter: async () => ({ available: true }),
    answerQuestion: async () => ({ available: true }),
    suggestImprovements: async () => ({ available: true }),
  };
  const { createHrCopilotRouter } = require('../routes/hr/hr-copilot.routes');
  const complianceRouter = require('../routes/hr-compliance.routes');

  app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = global.__hcUser || null;
    next();
  });
  app.use('/copilot', createHrCopilotRouter({ logger: console, copilot }));
  app.use('/compliance', complianceRouter);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W269 — hr-copilot summarize isolates by branch', () => {
  it('denies a branch-A manager summarizing a branch-B employee (403)', async () => {
    asManagerA();
    const res = await request(app).post(`/copilot/summarize/${empB._id}`).send({});
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager summarizing their OWN-branch employee (200)', async () => {
    asManagerA();
    const res = await request(app).post(`/copilot/summarize/${empA._id}`).send({});
    expect(res.status).toBe(200);
  });
});

describe('W269 — hr-compliance verification isolates by branch', () => {
  it('denies a branch-A manager reading a branch-B employee compliance (403)', async () => {
    asManagerA();
    const res = await request(app).get(`/compliance/${empB._id}/status`);
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager reading their OWN-branch employee compliance (200)', async () => {
    asManagerA();
    const res = await request(app).get(`/compliance/${empA._id}/status`);
    expect(res.status).toBe(200);
  });
});
