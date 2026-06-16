'use strict';

/**
 * W1376 — behavioral counterpart for the W453 download-serve path
 * boundary in routes/files.routes.js `GET /:id/download`.
 *
 * W452 (path-traversal-files-upload-wave452) is a STATIC guard, and it
 * covers the UPLOAD-time multer destination boundary only. The W453
 * fix added a SECOND boundary on the SERVE/download path:
 *
 *   const resolved = path.resolve(doc.storagePath);
 *   if (!resolved.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) {
 *     return res.status(403).json({ success: false, message: 'مسار غير مسموح' });
 *   }
 *
 * The `+ path.sep` is the crux: a stored doc whose storagePath points
 * at a PREFIX-SHARED SIBLING directory (e.g. `<root>/uploads-evil/x`
 * when UPLOAD_ROOT is `<root>/uploads`) shares the `uploads` prefix but
 * is NOT inside it. Pre-W453 `startsWith(UPLOAD_ROOT)` matched that
 * sibling and streamed the file (arbitrary read). No behavioral test
 * proves this boundary fires at runtime — only the source string is
 * asserted elsewhere. This file boots the real router and drives the
 * actual response codes.
 *
 * Pure additive test — zero production change. Sibling of W1375
 * (disposition) on the same handler.
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
jest.mock('../models/UploadedFile', () => ({
  findById: jest.fn(id => Promise.resolve(mockDocs[String(id)] || null)),
}));

// UPLOAD_ROOT is resolved at module load to backend/uploads.
const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
// A prefix-shared SIBLING of UPLOAD_ROOT — shares the "uploads" prefix
// but is NOT inside it (this is exactly what W453's `+ path.sep` blocks).
const SIBLING_ROOT = `${UPLOAD_ROOT}-evil-w1376`;
const insideDir = path.join(UPLOAD_ROOT, `.w1376-${process.pid}-${Date.now()}`);

const ID_INSIDE = 'a1a1a1a1a1a1a1a1a1a1a1a1';
const ID_SIBLING = 'b2b2b2b2b2b2b2b2b2b2b2b2';

let app;

beforeAll(() => {
  fs.mkdirSync(insideDir, { recursive: true });
  fs.mkdirSync(SIBLING_ROOT, { recursive: true });

  const insidePath = path.join(insideDir, 'legit.txt');
  fs.writeFileSync(insidePath, 'legit content');
  mockDocs[ID_INSIDE] = {
    _id: ID_INSIDE,
    originalName: 'legit.txt',
    mimeType: 'text/plain',
    storagePath: insidePath,
    status: 'active',
  };

  // Sibling-prefix escape: real file on disk, but OUTSIDE UPLOAD_ROOT.
  const siblingPath = path.join(SIBLING_ROOT, 'secret.txt');
  fs.writeFileSync(siblingPath, 'SECRET — must never be served');
  mockDocs[ID_SIBLING] = {
    _id: ID_SIBLING,
    originalName: 'secret.txt',
    mimeType: 'text/plain',
    storagePath: siblingPath,
    status: 'active',
  };

  const router = require('../routes/files.routes');
  app = express();
  app.use('/api/v1/files', router);
});

afterAll(() => {
  for (const dir of [insideDir, SIBLING_ROOT]) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});

describe('W1376 — files.routes.js /:id/download W453 path boundary (behavioral)', () => {
  test('serves a file STRICTLY inside UPLOAD_ROOT (200)', async () => {
    const res = await request(app).get(`/api/v1/files/${ID_INSIDE}/download`);
    expect(res.status).toBe(200);
    expect(res.text).toBe('legit content');
  });

  test('rejects a prefix-shared SIBLING path with 403 (does NOT leak secret)', async () => {
    const res = await request(app).get(`/api/v1/files/${ID_SIBLING}/download`);
    expect(res.status).toBe(403);
    // The boundary must fire BEFORE the file is streamed — body must not
    // contain the secret content.
    expect(res.text).not.toMatch(/SECRET/);
  });

  test('invalid ObjectId is rejected at the input gate with 400', async () => {
    const res = await request(app).get('/api/v1/files/not-an-objectid/download');
    expect(res.status).toBe(400);
  });
});
