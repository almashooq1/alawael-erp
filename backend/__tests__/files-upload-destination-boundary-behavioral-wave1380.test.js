'use strict';

/**
 * W1380 — behavioral counterpart for the W452 UPLOAD-time multer
 * destination path-boundary in routes/files.routes.js `POST /`.
 *
 * The static W452 guard (path-traversal-files-upload-wave452) reads the
 * source as a string. At RUNTIME the multer diskStorage `destination`
 * function defends in two layers:
 *
 *   const raw = String(req.body?.purpose || 'other');
 *   const purpose = UploadedFile.PURPOSES.includes(raw) ? raw : 'other'; // collapse
 *   const dir = path.join(UPLOAD_ROOT, purpose, dateDir);
 *   if (!path.resolve(dir).startsWith(path.resolve(UPLOAD_ROOT) + path.sep))
 *     return cb(new Error('invalid upload path'), '');                    // boundary
 *
 * Pre-W452 `req.body.purpose` flowed straight into path.join, so
 * `purpose: '../../../etc/sneaky'` made multer create a directory and
 * write the file OUTSIDE UPLOAD_ROOT before the route's PURPOSES check.
 * Now the unknown purpose collapses to 'other' (kept INSIDE root) and
 * the route then 400s it. No behavioral test proves the traversal
 * purpose cannot escape; a future refactor dropping the collapse/boundary
 * would silently re-open it while the static W452 string still matched.
 * This file boots the real router and drives the actual runtime behavior.
 *
 * Pure additive test — zero production change. Sibling of W1372 (SVG
 * fileFilter) on the upload surface; companion to W1376 (download
 * boundary) on the same router.
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

// Real PURPOSES list (mirrors models/UploadedFile.js) + a create() stub that
// records the storagePath multer chose so we can clean it up afterwards.
const createdPaths = [];
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
    create: jest.fn(doc => {
      if (doc && doc.storagePath) createdPaths.push(doc.storagePath);
      return Promise.resolve({ ...doc, _id: 'new-id', toJSON: () => ({ ...doc, _id: 'new-id' }) });
    }),
  };
});

// UPLOAD_ROOT is resolved at module load to backend/uploads (no env override).
const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let app;

beforeAll(() => {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  const router = require('../routes/files.routes');
  app = express();
  app.use('/api/files', router);
  // app-level error handler so a multer cb(Error) becomes a clean 400 JSON
  // rather than a default 500 HTML page (mirrors production).
  app.use((err, _req, res, _next) => {
    res.status(400).json({ success: false, message: err.message });
  });
});

afterAll(() => {
  for (const p of createdPaths) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      /* best-effort */
    }
  }
});

describe('W1380 — files.routes.js POST / multer destination boundary (behavioral)', () => {
  test('accepts a valid purpose + allowed mime and stores INSIDE UPLOAD_ROOT (201)', async () => {
    const res = await request(app)
      .post('/api/files')
      .field('purpose', 'other')
      .attach('file', PNG_BYTES, { filename: 'ok.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // The stored path must resolve STRICTLY inside UPLOAD_ROOT.
    const stored = path.resolve(res.body.data.storagePath);
    expect(stored.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)).toBe(true);
  });

  test('a traversal purpose cannot escape UPLOAD_ROOT and is rejected (400, no sibling dir)', async () => {
    const siblingBefore = fs.existsSync(path.resolve(UPLOAD_ROOT, '..', 'etc'));
    const res = await request(app)
      .post('/api/files')
      .field('purpose', '../../../etc/sneaky')
      .attach('file', PNG_BYTES, { filename: 'evil.png', contentType: 'image/png' });
    // Route rejects the unknown purpose at the PURPOSES allowlist (400).
    expect(res.status).toBe(400);
    // And multer must NOT have created an `etc` directory OUTSIDE UPLOAD_ROOT.
    const siblingAfter = fs.existsSync(path.resolve(UPLOAD_ROOT, '..', 'etc'));
    expect(siblingAfter).toBe(siblingBefore);
  });

  test('a disallowed mime (svg) is rejected by fileFilter (not 201)', async () => {
    const res = await request(app)
      .post('/api/files')
      .field('purpose', 'other')
      .attach('file', Buffer.from('<svg><script>alert(1)</script></svg>'), {
        filename: 'evil.svg',
        contentType: 'image/svg+xml',
      });
    expect(res.status).not.toBe(201);
  });
});
