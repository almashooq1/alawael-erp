'use strict';

/**
 * finance-approvals-branch-isolation-behavioral-wave1163.test.js — W269 behavioral.
 *
 * Proves the runtime isolation of finance-approvals: a branch-A manager is denied
 * (403) viewing/approving/paying a branch-B expense chain and allowed (200) their
 * own, an HQ (super_admin) sees any, and /pending is pinned to the caller's branch.
 * Uses the router's setStore() hook with an in-memory store + a mocked auth; the
 * gate uses the real svc.getStatus + assertBranchMatch, and requireBranchAccess is
 * synchronous for a restricted role → no DB needed.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/finance-approvals-branch-isolation-behavioral-wave1163.test.js
 */

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = global.__faUser || null;
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

const express = require('express');
const request = require('supertest');

const BRANCH_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BRANCH_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const CHAINS = {
  chainA: { expenseId: 'chainA', branchId: BRANCH_A, status: 'pending', amount: 100 },
  chainB: { expenseId: 'chainB', branchId: BRANCH_B, status: 'pending', amount: 200 },
};
const memStore = {
  get: async id => CHAINS[id] || null,
  list: async (filter = {}) =>
    Object.values(CHAINS).filter(
      c =>
        (!filter.status || c.status === filter.status) &&
        (!filter.branchId || String(c.branchId) === String(filter.branchId))
    ),
};

const asManagerA = () => {
  global.__faUser = { id: 'u1', role: 'manager', branchId: BRANCH_A };
};
const asSuperAdmin = () => {
  global.__faUser = { id: 'u2', role: 'super_admin' };
};

let app;
beforeAll(() => {
  const router = require('../routes/finance-approvals.routes');
  router.setStore(memStore);
  app = express();
  app.use(express.json());
  app.use('/api/finance/approvals', router);
});

describe('W269 — finance-approvals :expenseId routes isolate by branch', () => {
  it('denies a branch-A manager viewing a branch-B expense chain (403)', async () => {
    asManagerA();
    const res = await request(app).get('/api/finance/approvals/chainB');
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager viewing their OWN-branch chain (200)', async () => {
    asManagerA();
    const res = await request(app).get('/api/finance/approvals/chainA');
    expect(res.status).toBe(200);
  });

  it('allows an HQ (super_admin) role to view any branch chain (200)', async () => {
    asSuperAdmin();
    const res = await request(app).get('/api/finance/approvals/chainB');
    expect(res.status).toBe(200);
  });

  it('denies a branch-A manager approving a branch-B expense (403)', async () => {
    asManagerA();
    const res = await request(app).post('/api/finance/approvals/chainB/approve').send({});
    expect(res.status).toBe(403);
  });

  it('denies a branch-A manager PAYING a branch-B expense (403)', async () => {
    asManagerA();
    const res = await request(app).post('/api/finance/approvals/chainB/pay').send({});
    expect(res.status).toBe(403);
  });
});

describe('W269 — /pending is pinned to the caller branch', () => {
  it('a branch-A manager sees only branch-A pending chains', async () => {
    asManagerA();
    const res = await request(app).get('/api/finance/approvals/pending');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(String(res.body.data[0].branchId)).toBe(String(BRANCH_A));
  });
});
