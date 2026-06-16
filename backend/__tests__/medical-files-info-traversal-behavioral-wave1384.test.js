'use strict';

/**
 * W1384 — behavioral counterpart for the W453 path-traversal prefix
 * boundary in routes/medicalFiles.js `GET /info/:fileType/:fileName`.
 *
 * Third sibling of W1382 (/view) and W1383 (/download). The /info handler is
 * a DISTINCT read-only code path (line 371): strips dirs via
 * `safeName = path.basename(fileName)`, applies the W453 `+ path.sep`
 * boundary, then returns file metadata (size/mtime) as JSON. The W453 static
 * guard (path-traversal-prefix-boundary-wave453.test.js) covers line 371 only
 * as text; no behavioral test boots this metadata path. A refactor dropping
 * the basename strip would silently leak stat() info for files OUTSIDE the
 * type sub-dir while the static assertion still matched the bypassed line.
 *
 * Pure additive; zero production change. Completes the read-side trio
 * (view + download + info) for medicalFiles.js traversal boundaries.
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'doc-1', role: 'doctor' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
}));

const MEDICAL_ROOT = path.resolve(__dirname, '..', 'uploads', 'medical-files');
const RADIOLOGY_DIR = path.join(MEDICAL_ROOT, 'radiology'); // UPLOAD_DIRS['أشعة']

const LEGIT_NAME = 'w1384-legit-scan.png';
const LEGIT_PATH = path.join(RADIOLOGY_DIR, LEGIT_NAME);
const SECRET_NAME = 'w1384-secret.txt';
const SECRET_PATH = path.join(MEDICAL_ROOT, SECRET_NAME);

let app;

beforeAll(() => {
  fs.mkdirSync(RADIOLOGY_DIR, { recursive: true });
  fs.writeFileSync(LEGIT_PATH, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  fs.writeFileSync(SECRET_PATH, 'SECRET — metadata must never leak via traversal');

  const medicalFilesRouter = require('../routes/medicalFiles');
  app = express();
  app.use('/api/v1/medical-files', medicalFilesRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

afterAll(() => {
  for (const p of [LEGIT_PATH, SECRET_PATH]) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      /* best-effort */
    }
  }
});

describe('W1384 — medicalFiles /info W453 traversal boundary (behavioral)', () => {
  test('returns metadata for a legit file inside the type sub-dir (200)', async () => {
    const res = await request(app).get(`/api/v1/medical-files/info/أشعة/${LEGIT_NAME}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('size');
  });

  test('a ../-laden filename is neutralized (404, no metadata leak)', async () => {
    const traversal = encodeURIComponent(`../${SECRET_NAME}`);
    const res = await request(app).get(`/api/v1/medical-files/info/أشعة/${traversal}`);
    expect(res.status).toBe(404);
  });

  test('a non-existent filename returns 404 (not 500)', async () => {
    const res = await request(app).get('/api/v1/medical-files/info/أشعة/does-not-exist-w1384.png');
    expect(res.status).toBe(404);
  });
});
