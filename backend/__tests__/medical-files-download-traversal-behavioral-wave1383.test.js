'use strict';

/**
 * W1383 — behavioral counterpart for the W453 path-traversal prefix
 * boundary in routes/medicalFiles.js `GET /download/:fileType/:fileName`.
 *
 * Sibling of W1382 (which covered the /view handler). The /download handler
 * is a DISTINCT code path (line 292) — it strips dirs via
 * `safeName = path.basename(fileName)`, applies the W453 `+ path.sep`
 * boundary, then serves the file as an ATTACHMENT via `res.download(...)`
 * (whereas /view uses `res.sendFile`). The W453 static guard
 * (path-traversal-prefix-boundary-wave453.test.js) covers line 292 only as
 * text; no behavioral test boots this download path. A refactor dropping the
 * basename strip on the download route would silently re-open traversal while
 * the static assertion still matched the bypassed line.
 *
 * Pure additive; zero production change. Completes the download-side
 * counterpart to W1382 (view) on medicalFiles.js.
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

const LEGIT_NAME = 'w1383-legit-scan.png';
const LEGIT_PATH = path.join(RADIOLOGY_DIR, LEGIT_NAME);
const SECRET_NAME = 'w1383-secret.txt';
const SECRET_PATH = path.join(MEDICAL_ROOT, SECRET_NAME);

let app;

beforeAll(() => {
  fs.mkdirSync(RADIOLOGY_DIR, { recursive: true });
  fs.writeFileSync(LEGIT_PATH, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  fs.writeFileSync(SECRET_PATH, 'SECRET — must never be served via traversal');

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

const bodyText = res =>
  res.text != null && res.text !== ''
    ? res.text
    : Buffer.isBuffer(res.body)
      ? res.body.toString('utf8')
      : JSON.stringify(res.body);

describe('W1383 — medicalFiles /download W453 traversal boundary (behavioral)', () => {
  test('downloads a legit file inside the type sub-dir (200, attachment)', async () => {
    const res = await request(app).get(`/api/v1/medical-files/download/أشعة/${LEGIT_NAME}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment/i);
  });

  test('a ../-laden filename is neutralized (404, secret not leaked)', async () => {
    const traversal = encodeURIComponent(`../${SECRET_NAME}`);
    const res = await request(app).get(`/api/v1/medical-files/download/أشعة/${traversal}`);
    expect(res.status).toBe(404);
    expect(bodyText(res)).not.toMatch(/SECRET/);
  });

  test('a non-existent filename returns 404 (not 500)', async () => {
    const res = await request(app).get(
      '/api/v1/medical-files/download/أشعة/does-not-exist-w1383.png'
    );
    expect(res.status).toBe(404);
  });
});
