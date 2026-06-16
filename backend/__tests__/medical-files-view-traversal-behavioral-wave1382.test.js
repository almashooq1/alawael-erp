'use strict';

/**
 * W1382 — behavioral counterpart for the W453 path-traversal prefix
 * boundary in routes/medicalFiles.js `GET /view/:fileType/:fileName`.
 *
 * medicalFiles.js has FOUR static W453 boundary sites (lines 262/292/335/371
 * on /view, /download, DELETE, /info) — all covered ONLY statically by
 * `path-traversal-prefix-boundary-wave453.test.js` (reads the file as text).
 * No behavioral test boots the real router. The /view handler defends at
 * runtime in TWO layers: (1) `safeName = path.basename(fileName)` strips any
 * leading `../` segments, then (2) the W453 `+ path.sep` boundary. A future
 * refactor dropping the basename strip would silently re-open traversal while
 * the static W453 assertion still matched the (now-bypassed) boundary line.
 *
 * This boots medicalFiles.js via supertest and proves, against the real
 * filesystem, that a `../`-laden filename param resolves INSIDE the type
 * sub-dir (404, no leak) — the runtime behaviour the static guard cannot see.
 * Pure additive; zero production change. Sibling of W1379 (media /file serve).
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

// medicalFiles.js resolves baseDir = path.join(__dirname, '../uploads/medical-files', subDir)
// with NO env override, so seed files under backend/uploads/medical-files.
const MEDICAL_ROOT = path.resolve(__dirname, '..', 'uploads', 'medical-files');
const RADIOLOGY_DIR = path.join(MEDICAL_ROOT, 'radiology'); // UPLOAD_DIRS['أشعة']

const LEGIT_NAME = 'w1382-legit-scan.png';
const LEGIT_PATH = path.join(RADIOLOGY_DIR, LEGIT_NAME);
// A secret ONE LEVEL ABOVE the type sub-dir — a `../secret` param targets it.
const SECRET_NAME = 'w1382-secret.txt';
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

describe('W1382 — medicalFiles /view W453 traversal boundary (behavioral)', () => {
  test('serves a legit file inside the type sub-dir (200)', async () => {
    const res = await request(app).get(`/api/v1/medical-files/view/أشعة/${LEGIT_NAME}`);
    expect(res.status).toBe(200);
  });

  test('a ../-laden filename is neutralized (404, secret not leaked)', async () => {
    const traversal = encodeURIComponent(`../${SECRET_NAME}`);
    const res = await request(app).get(`/api/v1/medical-files/view/أشعة/${traversal}`);
    expect(res.status).toBe(404);
    expect(bodyText(res)).not.toMatch(/SECRET/);
  });

  test('a non-existent filename returns 404 (not 500)', async () => {
    const res = await request(app).get('/api/v1/medical-files/view/أشعة/does-not-exist-w1382.png');
    expect(res.status).toBe(404);
  });
});
