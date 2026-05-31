'use strict';

/**
 * branch-denial-audit-c4.test.js — C4: cross-branch DENIALS must be durably
 * audited (not just logger.warn). The audit is env-gated DEFAULT OFF
 * (ENABLE_BRANCH_DENIAL_AUDIT) + fire-and-forget, so it is inert until enabled.
 * Verifies: flag ON → AuditLog row written on a foreign-branch request; flag OFF
 * → no write; and the 403 is unaffected either way.
 */

jest.unmock('mongoose');

// Intercept the lazily-required AuditLog model. The mock fn is created INSIDE
// the factory (jest.mock hoisting forbids out-of-scope refs), then grabbed.
jest.mock('../models/AuditLog', () => ({ create: jest.fn(() => Promise.resolve({ _id: 'a1' })) }));

const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const createMock = require('../models/AuditLog').create;

function mockReqRes(reqOverrides = {}) {
  const req = {
    user: { id: 'u1', role: 'therapist', branchId: 'BR-1' },
    query: {},
    body: {},
    params: {},
    originalUrl: '/api/beneficiaries',
    ip: '10.0.0.9',
    headers: {},
    ...reqOverrides,
  };
  const res = {
    statusCode: 0,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
  return { req, res, next: jest.fn() };
}

const ENV = 'ENABLE_BRANCH_DENIAL_AUDIT';
afterEach(() => {
  delete process.env[ENV];
  createMock.mockClear();
});

describe('C4 — cross-branch denial audit', () => {
  it('flag ON → writes a branch.access.denied AuditLog row on a foreign-branch request', async () => {
    process.env[ENV] = 'true';
    const { req, res, next } = mockReqRes({ query: { branchId: 'BR-2' } });

    await requireBranchAccess(req, res, next);

    expect(res.statusCode).toBe(403); // denial still happens
    expect(next).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(1);
    const row = createMock.mock.calls[0][0];
    expect(row.action).toBe('branch.access.denied');
    expect(row.userId).toBe('u1');
    expect(row.details.reason).toBe('foreign_branch_request');
    expect(row.details.attemptedBranchId).toBe('BR-2');
    expect(row.details.userBranchId).toBe('BR-1');
  });

  it('flag OFF (default) → 403 still returned but NO audit write', async () => {
    const { req, res, next } = mockReqRes({ query: { branchId: 'BR-2' } });

    await requireBranchAccess(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('flag ON + same-branch request → allowed, no denial audit', async () => {
    process.env[ENV] = 'true';
    const { req, res, next } = mockReqRes({ query: { branchId: 'BR-1' } });

    await requireBranchAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(0); // no 403
    expect(createMock).not.toHaveBeenCalled();
  });

  it('audit write rejection never breaks the 403 (fire-and-forget)', async () => {
    process.env[ENV] = 'true';
    createMock.mockImplementationOnce(() => Promise.reject(new Error('db down')));
    const { req, res } = mockReqRes({ query: { branchId: 'BR-2' } });

    // Must not throw/reject even though the audit write rejects (fire-and-forget).
    await requireBranchAccess(req, res, jest.fn());
    expect(res.statusCode).toBe(403);
  });
});
