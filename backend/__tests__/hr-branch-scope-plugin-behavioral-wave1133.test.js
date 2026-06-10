'use strict';

/**
 * hr-branch-scope-plugin-behavioral-wave1133.test.js — W1133 behavioral counterpart.
 *
 * Proves the runtime behaviour the static guard (hr-modules-branch-isolation-wave1133)
 * can only assert by source shape:
 *   1. hrBranchScope.plugin derives branchId from the record's Employee on create.
 *   2. A client-supplied (spoofed) branchId is OVERRIDDEN with the employee's branch.
 *   3. Records with no employee link keep branchId null (candidate visas).
 *   4. The hardened hr-modules router isolates lists + id reads by branch:
 *      a branch-A manager sees only branch-A loans and gets 403 on a branch-B id,
 *      while an HQ (super_admin) role sees everything.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-branch-scope-plugin-behavioral-wave1133.test.js
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

// authorize → pass-through so the test exercises branch isolation, not RBAC.
jest.mock('../middleware/auth', () => ({
  authorize: () => (_req, _res, next) => next(),
}));

let mongod;
const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();
const ACTOR = new mongoose.Types.ObjectId();

const mockAuthState = { user: null };
let Employee;
let Loan;
let VisaRequest;
let empA;
let empB;

function mountApp() {
  const a = express();
  a.use(express.json());
  a.use((req, _res, next) => {
    req.user = mockAuthState.user;
    next();
  });
  const { createHrModulesRouter } = require('../routes/hr/hr-modules.routes');
  a.use('/api/v1/hr', createHrModulesRouter({ logger: console }));
  return a;
}

let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1133-hr-branch' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');

  // Lightweight Employee stand-in (the plugin only reads branch_id). Registered
  // under the canonical model name 'Employee' so the plugin's lookup resolves.
  Employee = mongoose.model(
    'Employee',
    new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId, name: String })
  );
  Loan = require('../models/HR/Loan');
  VisaRequest = require('../models/HR/VisaRequest');

  empA = await Employee.create({ branch_id: BRANCH_A, name: 'EmpA' });
  empB = await Employee.create({ branch_id: BRANCH_B, name: 'EmpB' });

  app = mountApp();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

describe('W1133 — plugin derives branchId from the employee', () => {
  it('stamps branchId from Employee.branch_id on create', async () => {
    const loan = await Loan.create({
      employeeId: empA._id,
      loanType: 'salary_advance',
      principalAmount: 1000,
    });
    expect(String(loan.branchId)).toBe(String(BRANCH_A));
  });

  it('OVERRIDES a client-supplied branchId with the employee branch (anti-spoof)', async () => {
    const loan = await Loan.create({
      employeeId: empB._id,
      branchId: BRANCH_A, // spoof — should be overridden to empB's branch (B)
      loanType: 'personal_loan',
      principalAmount: 500,
    });
    expect(String(loan.branchId)).toBe(String(BRANCH_B));
  });

  it('leaves branchId null when there is no employee link (candidate visa)', async () => {
    const visa = await VisaRequest.create({ visaType: 'work_visa', candidateName: 'Candidate' });
    expect(visa.branchId == null).toBe(true);
  });
});

describe('W1133 — hr-modules router isolates loans by branch', () => {
  beforeAll(async () => {
    await Loan.deleteMany({});
    await Loan.create({ employeeId: empA._id, loanType: 'emergency', principalAmount: 100 });
    await Loan.create({ employeeId: empB._id, loanType: 'emergency', principalAmount: 200 });
  });

  it('a branch-A manager lists ONLY branch-A loans', async () => {
    mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'manager', branchId: BRANCH_A };
    const res = await request(app).get('/api/v1/hr/loans');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(String(res.body.data.items[0].branchId)).toBe(String(BRANCH_A));
  });

  it('an HQ (super_admin) role lists ALL branches', async () => {
    mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'super_admin' };
    const res = await request(app).get('/api/v1/hr/loans');
    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(2);
  });

  it('a branch-A manager is denied a branch-B loan by id (403)', async () => {
    const foreign = await Loan.findOne({ employeeId: empB._id });
    mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'manager', branchId: BRANCH_A };
    const res = await request(app).get(`/api/v1/hr/loans/${foreign._id}`);
    expect(res.status).toBe(403);
  });

  it('a branch-A manager can read its OWN branch loan by id (200)', async () => {
    const own = await Loan.findOne({ employeeId: empA._id });
    mockAuthState.user = { id: ACTOR, _id: ACTOR, role: 'manager', branchId: BRANCH_A };
    const res = await request(app).get(`/api/v1/hr/loans/${own._id}`);
    expect(res.status).toBe(200);
    expect(String(res.body.data._id)).toBe(String(own._id));
  });
});
