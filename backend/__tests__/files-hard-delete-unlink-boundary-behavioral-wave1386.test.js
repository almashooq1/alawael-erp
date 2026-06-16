'use strict';

/**
 * W1386 — behavioral counterpart for the W453 path-boundary on the
 * DESTRUCTIVE hard-delete branch of routes/files.routes.js `DELETE /:id?hard=1`.
 *
 * files.routes.js has THREE W453 boundary sites; the serve sites are already
 * behaviorally covered (W1376 /:id/download path boundary, W1380 upload
 * destination). The remaining UNcovered site is the hard-delete disk unlink
 * (line ~305):
 *
 *   const doc = await UploadedFile.findByIdAndDelete(req.params.id);
 *   const resolved = path.resolve(doc.storagePath);
 *   if (resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
 *     await fsp.unlink(resolved).catch(() => {});   // ONLY if strictly inside
 *   }
 *
 * This is an INVERTED boundary: instead of 403-ing an outside path, it simply
 * SKIPS the unlink so a tampered/migrated storagePath pointing at a prefix-
 * shared sibling (`<root>-evil` vs `<root>`) can never trigger an arbitrary
 * out-of-root file deletion. The W453 static guard covers this line only as
 * text; no behavioral test proves the unlink stays inside-root. A refactor
 * dropping `+ path.sep` would silently re-enable sibling-file deletion while
 * the static assertion still matched the bypassed line.
 *
 * The destructive assertion: after a hard-delete of a doc whose storagePath
 * is a prefix-shared sibling, the sibling file must STILL EXIST on disk
 * (DB row removed → 200, but disk untouched). The inside-root case unlinks a
 * throwaway file created solely for this test.
 *
 * Pure additive; zero production change. requireRole is mocked pass-through;
 * req.user.role='admin' satisfies the in-handler HARD_DELETE_ROLES check.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticateToken: (req, _res, next) => {
    req.user = { id: 'u1', role: 'admin' };
    next();
  },
  requireRole: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/assertBranchMatch', () => ({
  bodyScopedBeneficiaryGuard: (_req, _res, next) => next(),
  assertBranchMatch: () => {},
  effectiveBranchScope: () => null,
  enforceBeneficiaryBranch: async () => {},
  assertBranchIdsAllowed: () => {},
}));

const mockDocs = {};
jest.mock('../models/UploadedFile', () => {
  const PURPOSES = [
    'portfolio',
    'disability_card_scan',
    'trip_doc',
    'pickup_auth_doc',
    'iep_signed_pdf',
    'rs_evidence',
    'meal_menu',
    'other',
  ];
  return {
    PURPOSES,
    findById: jest.fn(() => Promise.resolve(null)),
    findByIdAndDelete: jest.fn(id => Promise.resolve(mockDocs[String(id)] || null)),
    findByIdAndUpdate: jest.fn(() => Promise.resolve(null)),
  };
});

// UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads') in files.routes.js.
const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const SIBLING_ROOT = `${UPLOAD_ROOT}-evil-w1386`;

const ID_SIBLING = '0123456789abcdef01111111'; // valid 24-hex ObjectId
const ID_INSIDE = '0123456789abcdef01222222';

const SIBLING_FILE = path.join(SIBLING_ROOT, 'secret-w1386.bin');
const INSIDE_FILE = path.join(UPLOAD_ROOT, 'throwaway-w1386.bin');

let app;

beforeAll(() => {
  fs.mkdirSync(SIBLING_ROOT, { recursive: true });
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  fs.writeFileSync(SIBLING_FILE, 'SECRET — must never be unlinked via tampered storagePath');

  mockDocs[ID_SIBLING] = {
    _id: ID_SIBLING,
    storagePath: SIBLING_FILE,
    originalName: 'secret.bin',
    status: 'active',
  };
  mockDocs[ID_INSIDE] = {
    _id: ID_INSIDE,
    storagePath: INSIDE_FILE,
    originalName: 'throwaway.bin',
    status: 'active',
  };

  const filesRouter = require('../routes/files.routes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/files', filesRouter);
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

describe('W1386 — files hard-delete W453 disk-unlink boundary (behavioral)', () => {
  test('hard-delete of a prefix-shared sibling storagePath does NOT unlink the file', async () => {
    expect(fs.existsSync(SIBLING_FILE)).toBe(true);
    const res = await request(app).delete(`/api/v1/files/${ID_SIBLING}?hard=1`);
    expect(res.status).toBe(200);
    // DB row removed, but the out-of-root sibling file must survive.
    expect(fs.existsSync(SIBLING_FILE)).toBe(true);
  });

  test('hard-delete of an inside-root storagePath unlinks the file (200)', async () => {
    fs.writeFileSync(INSIDE_FILE, 'disposable');
    expect(fs.existsSync(INSIDE_FILE)).toBe(true);
    const res = await request(app).delete(`/api/v1/files/${ID_INSIDE}?hard=1`);
    expect(res.status).toBe(200);
    expect(fs.existsSync(INSIDE_FILE)).toBe(false);
  });

  test('hard-delete of a missing doc returns 404', async () => {
    const res = await request(app).delete('/api/v1/files/0123456789abcdef01333333?hard=1');
    expect(res.status).toBe(404);
  });
});
