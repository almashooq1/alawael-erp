'use strict';

/**
 * finance-statements-branch-scope-wave1595.test.js — W1595
 *
 * routes/finance-statements.routes.js applied authenticateToken + requireRole but NOT
 * requireBranchAccess, and every handler read `const branchId = req.query.branchId || null`.
 * A branch-restricted finance/accountant/auditor who simply OMITTED branchId got null → NO
 * branch filter → every branch's trial-balance / P&L / aged-receivables (cross-branch
 * financial leak). W1595 adds requireBranchAccess (populates req.branchScope) and switches to
 * effectiveBranchScope(req) — which pins a restricted user to their own branch and honours
 * ?branchId= only for cross-branch/HQ — plus assertBranchIdsAllowed on /consolidated-pl.
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

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = mockUser.u;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));
jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (req, _res, next) => {
    req.branchScope = mockScope.s;
    next();
  },
  branchFilter: () => ({}),
}));
// echo the branchId each builder receives so we can assert what the route computed
const echo = args => ({ branchIdEcho: args.branchId != null ? String(args.branchId) : null });
jest.mock('../services/finance/financialStatementsService', () => ({
  buildTrialBalance: echo,
  buildProfitAndLoss: echo,
  buildCashFlow: echo,
  buildBudgetVsActual: echo,
  buildAgedReceivables: echo,
  buildAgedPayables: echo,
  consolidateBranchStatements: () => ({ consolidated: true }),
}));
jest.mock('../services/finance/subsidiaryLedgerService', () => ({
  buildAccountsReceivableLedger: echo,
  buildAccountsPayableLedger: echo,
}));

const BRANCH_A = new mongoose.Types.ObjectId();
const BRANCH_B = new mongoose.Types.ObjectId();

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1588-fin-stmt' } });
  await mongoose.connect(mongod.getUri());
  require('../config/mongoose.plugins');
  app = express();
  app.use(express.json());
  app.use('/api/finance/statements', require('../routes/finance-statements.routes'));
  app.use((err, _req, res, _next) => res.status(err.status || err.statusCode || 500).json({ error: err.message }));
});

beforeEach(() => {
  mockUser.u = { _id: new mongoose.Types.ObjectId(), id: 'u1', role: 'accountant' };
  mockScope.s = { restricted: true, branchId: BRANCH_A }; // restricted to branch A
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

const base = '/api/finance/statements';

describe('W1595 — finance-statements branch scope', () => {
  it('GET /trial-balance — restricted user is pinned to own branch even when branchId omitted', async () => {
    const r = await request(app).get(`${base}/trial-balance`);
    expect(r.status).toBe(200);
    expect(r.body.data.branchIdEcho).toBe(String(BRANCH_A)); // was: null → all branches
  });

  it('GET /aged-receivables — restricted user pinned to own branch', async () => {
    const r = await request(app).get(`${base}/aged-receivables`);
    expect(r.status).toBe(200);
    expect(r.body.data.branchIdEcho).toBe(String(BRANCH_A));
  });

  it('GET /trial-balance — cross-branch/HQ role sees all (branchId null) when none specified', async () => {
    mockScope.s = { restricted: false };
    const r = await request(app).get(`${base}/trial-balance`);
    expect(r.status).toBe(200);
    expect(r.body.data.branchIdEcho).toBeNull();
  });

  it('GET /consolidated-pl — restricted user 403s when naming a foreign branch', async () => {
    const r = await request(app)
      .get(`${base}/consolidated-pl?startDate=2027-01-01&endDate=2027-12-31&branchIds=${BRANCH_A},${BRANCH_B}`);
    expect(r.status).toBe(403);
  });

  it('GET /consolidated-pl — restricted user succeeds for own branch only', async () => {
    const r = await request(app)
      .get(`${base}/consolidated-pl?startDate=2027-01-01&endDate=2027-12-31&branchIds=${BRANCH_A}`);
    expect(r.status).toBe(200);
  });

  it('static: requireBranchAccess added + effectiveBranchScope used + assertBranchIdsAllowed on consolidated-pl', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'routes', 'finance-statements.routes.js'), 'utf8');
    expect(src).toMatch(/router\.use\(requireBranchAccess\)/);
    expect((src.match(/effectiveBranchScope\(req\)/g) || []).length).toBeGreaterThanOrEqual(8);
    expect(src).toMatch(/assertBranchIdsAllowed\(req, branchIds\)/);
    expect(src).not.toMatch(/const branchId = req\.query\.branchId \|\| null/); // old leaky code gone
  });
});
