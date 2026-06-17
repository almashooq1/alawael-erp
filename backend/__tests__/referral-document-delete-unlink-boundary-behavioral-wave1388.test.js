'use strict';

/**
 * W1388 — behavioral counterpart for the in-root disk-unlink boundary on
 * routes/referral.routes.js `DELETE /documents/:docId`.
 *
 * BEFORE W1388 this handler deleted `doc.filePath` directly with no
 * `+ path.sep` boundary. A tampered/migrated filePath pointing at a
 * prefix-shared sibling (`<root>-evil`) or any absolute out-of-root path
 * could trigger an arbitrary out-of-root file deletion. The new helper
 * `safeUnlinkInsideReferral()` mirrors the sibling media/files hardening:
 * it unlinks ONLY when the resolved path is strictly inside the referral
 * uploads root.
 *
 * This boots the real router with supertest and asserts the runtime
 * behavior: sibling filePath -> 200 but file survives; inside-root
 * filePath -> 200 and file is removed; missing doc -> 404.
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const mockDocs = {};

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'admin-1', role: 'admin', branchId: 'branch-1' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

jest.mock('../middleware/assertBranchMatch', () => ({
  effectiveBranchScope: () => null,
}));

jest.mock('../models/Referral', () => ({
  Referral: {},
  ReferralDocument: {
    findById: jest.fn(id => Promise.resolve(mockDocs[String(id)] || null)),
  },
  ReferringFacility: {},
  ReferralCommunication: {},
  ReferralAssessment: {},
  FhirIntegrationLog: {},
}));

jest.mock('../services/referralService', () => ({
  receiveReferral: jest.fn(),
  reviewReferral: jest.fn(),
  transitionStatus: jest.fn(),
  sendCommunication: jest.fn(),
  importFromFhir: jest.fn(),
  getAnalytics: jest.fn(),
  attemptAutoAssignment: jest.fn(),
  recalculatePriority: jest.fn(),
  _canTransition: jest.fn(),
}));

const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'referrals');
const SIBLING_ROOT = `${UPLOAD_DIR}-evil-w1388`;
const SIBLING_FILE = path.join(SIBLING_ROOT, 'secret-referral-w1388.pdf');
const INSIDE_FILE = path.join(UPLOAD_DIR, 'throwaway-referral-w1388.pdf');

const ID_SIBLING = 'b1b1b1b1b1b1b1b1b1b11111';
const ID_INSIDE = 'b1b1b1b1b1b1b1b1b1b12222';

let app;

beforeAll(() => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(SIBLING_ROOT, { recursive: true });
  fs.writeFileSync(SIBLING_FILE, 'SECRET — must never be deleted via tampered referral filePath');

  mockDocs[ID_SIBLING] = {
    _id: ID_SIBLING,
    filePath: SIBLING_FILE,
    deleteOne: jest.fn(() => Promise.resolve()),
  };
  mockDocs[ID_INSIDE] = {
    _id: ID_INSIDE,
    filePath: INSIDE_FILE,
    deleteOne: jest.fn(() => Promise.resolve()),
  };

  const referralRouter = require('../routes/referral.routes');
  app = express();
  app.use(express.json());
  app.use('/api/referrals', referralRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

afterAll(() => {
  for (const p of [SIBLING_FILE, INSIDE_FILE]) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      /* best-effort */
    }
  }
  try {
    fs.rmSync(SIBLING_ROOT, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

describe('W1388 — referral document delete in-root boundary (behavioral)', () => {
  test('deleting a prefix-shared sibling filePath does NOT unlink the file', async () => {
    expect(fs.existsSync(SIBLING_FILE)).toBe(true);
    const res = await request(app).delete(`/api/referrals/documents/${ID_SIBLING}`);
    expect(res.status).toBe(200);
    expect(fs.existsSync(SIBLING_FILE)).toBe(true);
  });

  test('deleting an inside-root filePath unlinks the file (200)', async () => {
    fs.writeFileSync(INSIDE_FILE, 'disposable');
    expect(fs.existsSync(INSIDE_FILE)).toBe(true);
    const res = await request(app).delete(`/api/referrals/documents/${ID_INSIDE}`);
    expect(res.status).toBe(200);
    expect(fs.existsSync(INSIDE_FILE)).toBe(false);
  });

  test('deleting a missing referral document returns 404', async () => {
    const res = await request(app).delete('/api/referrals/documents/b1b1b1b1b1b1b1b1b1b13333');
    expect(res.status).toBe(404);
  });
});
