'use strict';

/**
 * W1385 — behavioral counterpart for the W453 path-traversal prefix
 * boundary in routes/medicalFiles.js `DELETE /:fileType/:fileName`.
 *
 * Fourth and final sibling (W1382 /view, W1383 /download, W1384 /info). The
 * DELETE handler is the ONLY destructive boundary site (line 335): it strips
 * dirs via `safeName = path.basename(fileName)`, applies the W453 `+ path.sep`
 * boundary, then `fs.unlink(filePath)`. This is the highest-stakes traversal
 * surface — a refactor dropping the basename strip would let `../<secret>`
 * DELETE files OUTSIDE the type sub-dir. The W453 static guard covers line 335
 * only as text; no behavioral test proves the real unlink stays inside-root.
 *
 * The destructive assertion: after a `../`-laden DELETE request, the secret
 * file ONE LEVEL ABOVE the type sub-dir must STILL EXIST on disk. The legit
 * case deletes a throwaway file created solely for this test.
 *
 * Pure additive; zero production change. authorize() is mocked to a pass-
 * through so the role gate doesn't mask the boundary behaviour under test.
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
}));

const MEDICAL_ROOT = path.resolve(__dirname, '..', 'uploads', 'medical-files');
const RADIOLOGY_DIR = path.join(MEDICAL_ROOT, 'radiology'); // UPLOAD_DIRS['أشعة']

const THROWAWAY_NAME = 'w1385-throwaway.png';
const THROWAWAY_PATH = path.join(RADIOLOGY_DIR, THROWAWAY_NAME);
const SECRET_NAME = 'w1385-secret.txt';
const SECRET_PATH = path.join(MEDICAL_ROOT, SECRET_NAME);

let app;

beforeAll(() => {
  fs.mkdirSync(RADIOLOGY_DIR, { recursive: true });
  fs.writeFileSync(SECRET_PATH, 'SECRET — must never be deleted via traversal');

  const medicalFilesRouter = require('../routes/medicalFiles');
  app = express();
  app.use('/api/v1/medical-files', medicalFilesRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

afterAll(() => {
  for (const p of [THROWAWAY_PATH, SECRET_PATH]) {
    try {
      fs.rmSync(p, { force: true });
    } catch {
      /* best-effort */
    }
  }
});

describe('W1385 — medicalFiles DELETE W453 traversal boundary (behavioral)', () => {
  test('a ../-laden DELETE is neutralized — secret above the sub-dir survives', async () => {
    expect(fs.existsSync(SECRET_PATH)).toBe(true);
    const traversal = encodeURIComponent(`../${SECRET_NAME}`);
    const res = await request(app).delete(`/api/v1/medical-files/أشعة/${traversal}`);
    expect([400, 404]).toContain(res.status);
    // The destructive guarantee: traversal did NOT reach the secret.
    expect(fs.existsSync(SECRET_PATH)).toBe(true);
  });

  test('a non-existent file returns 404 (not 500)', async () => {
    const res = await request(app).delete('/api/v1/medical-files/أشعة/does-not-exist-w1385.png');
    expect(res.status).toBe(404);
  });

  test('deletes a legit file strictly inside the type sub-dir (200)', async () => {
    fs.writeFileSync(THROWAWAY_PATH, 'disposable');
    expect(fs.existsSync(THROWAWAY_PATH)).toBe(true);
    const res = await request(app).delete(`/api/v1/medical-files/أشعة/${THROWAWAY_NAME}`);
    expect(res.status).toBe(200);
    expect(fs.existsSync(THROWAWAY_PATH)).toBe(false);
  });
});
