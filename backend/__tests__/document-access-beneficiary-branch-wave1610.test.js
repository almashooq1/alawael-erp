/**
 * document-access-beneficiary-branch-wave1610.test.js — W1610
 *
 * `requireDocumentAccess` had a role-only fallback for entity-linked documents:
 * any admin/superadmin/super_admin/manager was granted access to ANY entity-linked
 * doc with NO branch check. `Document` has no branchId, so a branch-RESTRICTED
 * admin/manager could read ANOTHER branch's beneficiary-linked PHI (medical reports,
 * consent forms, ID scans).
 *
 * W1610 derives the branch from the linked Beneficiary for `entityType==='Beneficiary'`
 * docs via `assertBeneficiaryInScope` (denies cross-branch restricted callers, lets
 * unrestricted/cross-branch roles pass). Other entity types keep the role-only
 * fallback unchanged (minimal blast radius).
 *
 * This suite mounts the REAL middleware with the Beneficiary-scope guard mocked, so
 * it verifies the middleware's control flow (calls the guard for Beneficiary docs,
 * honors denial, skips it for other entity types).
 */

const express = require('express');
const request = require('supertest');

// Control the doc returned + the scope guard's verdict per test.
const state = { doc: null, denied: false };

jest.mock('../models/Document', () => ({
  findById: jest.fn(async () => state.doc),
}));
jest.mock('../services/documents/documentACL.service', () => ({
  checkPermission: jest.fn(async () => ({ allowed: false })), // force the fallback path
}));
jest.mock('../services/documents/documentSharing.service', () => ({
  DocumentShareAccessLog: function () {
    return { save: async () => {} };
  },
}));
jest.mock('../middleware/assertBranchMatch', () => ({
  assertBeneficiaryInScope: jest.fn(async (_req, _benId, res) => {
    if (state.denied) {
      res.status(403).json({ success: false, message: 'cross-branch denied' });
      return true;
    }
    return false;
  }),
}));

const { assertBeneficiaryInScope } = require('../middleware/assertBranchMatch');
const { requireDocumentAccess } = require('../middleware/documentAccess.middleware');

const OID = '507f1f77bcf86cd799439011';

function buildApp(role) {
  const app = express();
  app.use((req, _res, next) => {
    req.user = { id: 'u1', role };
    next();
  });
  app.get('/d/:id', requireDocumentAccess('download', { allowOwner: false }), (req, res) =>
    res.json({ ok: true })
  );
  return app;
}

describe('W1610 — document-access fallback branch-scopes Beneficiary-linked docs', () => {
  beforeEach(() => {
    assertBeneficiaryInScope.mockClear();
    state.doc = null;
    state.denied = false;
  });

  it('DENIES an admin from another branch on a Beneficiary-linked doc', async () => {
    state.doc = { _id: OID, entityType: 'Beneficiary', entityId: OID, uploadedBy: 'other' };
    state.denied = true;
    const res = await request(buildApp('admin')).get(`/d/${OID}`);
    expect(res.status).toBe(403);
    expect(assertBeneficiaryInScope).toHaveBeenCalledTimes(1);
  });

  it('ALLOWS an admin same-branch (or cross-branch role) on a Beneficiary-linked doc', async () => {
    state.doc = { _id: OID, entityType: 'Beneficiary', entityId: OID, uploadedBy: 'other' };
    state.denied = false;
    const res = await request(buildApp('manager')).get(`/d/${OID}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(assertBeneficiaryInScope).toHaveBeenCalledTimes(1);
  });

  it('does NOT branch-check non-Beneficiary entity docs (fallback unchanged)', async () => {
    state.doc = { _id: OID, entityType: 'CaseManagement', entityId: OID, uploadedBy: 'other' };
    const res = await request(buildApp('admin')).get(`/d/${OID}`);
    expect(res.status).toBe(200);
    expect(assertBeneficiaryInScope).not.toHaveBeenCalled();
  });

  it('still 403s a non-privileged role (no fallback grant)', async () => {
    state.doc = { _id: OID, entityType: 'Beneficiary', entityId: OID, uploadedBy: 'other' };
    const res = await request(buildApp('therapist')).get(`/d/${OID}`);
    expect(res.status).toBe(403);
    expect(assertBeneficiaryInScope).not.toHaveBeenCalled();
  });

  it('source imports + invokes assertBeneficiaryInScope for Beneficiary docs (static guard)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'middleware', 'documentAccess.middleware.js'),
      'utf8'
    );
    expect(src).toMatch(/require\('\.\/assertBranchMatch'\)/);
    expect(src).toMatch(/doc\.entityType === 'Beneficiary'/);
    expect(src).toMatch(/assertBeneficiaryInScope\(req, doc\.entityId, res\)/);
  });
});
