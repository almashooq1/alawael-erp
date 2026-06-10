'use strict';

/**
 * finance-invoice-branch-isolation-behavioral-wave1161.test.js — W269 behavioral.
 *
 * Proves the runtime isolation of financeOperations' invoice routes: a branch-A
 * manager is denied (403) a branch-B invoice (read + cancel) and allowed (200) their
 * own, an HQ (super_admin) sees any, and the list is pinned to the caller's branch.
 * financeOpsService is mocked (getInvoice returns a {branchId} stub) so the test
 * isolates the branch-gate; requireBranchAccess is real + synchronous for a
 * restricted role, so no DB is needed.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/finance-invoice-branch-isolation-behavioral-wave1161.test.js
 */

const BRANCH_A = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const BRANCH_B = 'bbbbbbbbbbbbbbbbbbbbbbbb';

global.__fInvoices = { invA: BRANCH_A, invB: BRANCH_B };
global.__fUser = null;

// `mock`-prefixed so the hoisted jest.mock factory may reference it.
const mockListInvoices = jest.fn(async query => ({ items: [], _query: query }));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = global.__fUser || null;
    next();
  },
}));

jest.mock('../services/financeOperations.service', () => ({
  getInvoice: jest.fn(async id => {
    const branchId = global.__fInvoices[String(id)];
    if (!branchId) throw Object.assign(new Error('not found'), { status: 404 });
    return { _id: id, branchId };
  }),
  listInvoices: mockListInvoices,
  updateInvoice: jest.fn(async () => ({ ok: true })),
  cancelInvoice: jest.fn(async () => ({ ok: true })),
  markInvoicePaid: jest.fn(async () => ({ ok: true })),
}));

const express = require('express');
const request = require('supertest');

const asManagerA = () => {
  global.__fUser = { id: 'u1', role: 'manager', branchId: BRANCH_A };
};
const asSuperAdmin = () => {
  global.__fUser = { id: 'u2', role: 'super_admin' };
};

let app;
beforeAll(() => {
  const router = require('../routes/financeOperations.routes');
  app = express();
  app.use(express.json());
  app.use('/api/finance-operations', router);
});

describe('W269 — financeOperations invoice :id routes isolate by branch', () => {
  it('denies a branch-A manager reading a branch-B invoice (403)', async () => {
    asManagerA();
    const res = await request(app).get('/api/finance-operations/invoices/invB');
    expect(res.status).toBe(403);
  });

  it('allows a branch-A manager reading their OWN-branch invoice (200)', async () => {
    asManagerA();
    const res = await request(app).get('/api/finance-operations/invoices/invA');
    expect(res.status).toBe(200);
  });

  it('allows an HQ (super_admin) role to read any branch invoice (200)', async () => {
    asSuperAdmin();
    const res = await request(app).get('/api/finance-operations/invoices/invB');
    expect(res.status).toBe(200);
  });

  it('denies a branch-A manager cancelling a branch-B invoice (403)', async () => {
    asManagerA();
    const res = await request(app).post('/api/finance-operations/invoices/invB/cancel').send({});
    expect(res.status).toBe(403);
  });
});

describe('W269 — the invoice list is pinned to the caller branch', () => {
  it('passes the caller branch as branchId to listInvoices', async () => {
    asManagerA();
    mockListInvoices.mockClear();
    const res = await request(app).get('/api/finance-operations/invoices');
    expect(res.status).toBe(200);
    expect(mockListInvoices.mock.calls[0][0].branchId).toBe(BRANCH_A);
  });

  it('does not pin a branch for an HQ role (branchId null → all branches)', async () => {
    asSuperAdmin();
    mockListInvoices.mockClear();
    await request(app).get('/api/finance-operations/invoices');
    expect(mockListInvoices.mock.calls[0][0].branchId).toBeNull();
  });
});
