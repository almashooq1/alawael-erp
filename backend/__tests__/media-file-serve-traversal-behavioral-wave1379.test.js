'use strict';

/**
 * W1379 — behavioral counterpart for the path-traversal defense on
 * routes/media.routes.js `GET /file/:filename`.
 *
 * The static W454 guard (path-traversal-stream-boundary-wave454) reads
 * media.routes.js source as a string. The serve handler defends in two
 * layers at RUNTIME:
 *
 *   const safeName = path.basename(req.params.filename);   // strips dirs
 *   const filePath = path.join(uploadsDir, safeName);
 *   if (!path.resolve(filePath).startsWith(path.resolve(uploadsDir) + path.sep))
 *     return res.status(400)...                            // W454 boundary
 *
 * Because `path.basename` strips ALL directory components first, a
 * traversal param (`../../etc/passwd`) collapses to `passwd` and is
 * looked up INSIDE uploadsDir — so it cannot escape (yields 404, not a
 * leak). No behavioral test proves this neutralization holds; a future
 * refactor that drops the basename strip would silently re-open the
 * hole while the static W454 string still matched. This file boots the
 * real router and asserts the runtime behavior.
 *
 * Pure additive test — zero production change. Sibling of W1377/W1378
 * (DB-backed download/preview boundaries) on the media serve surface.
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { _id: 'u1', role: 'admin' };
    next();
  },
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

jest.mock('../models/Media', () => ({ findById: jest.fn() }));
jest.mock('../models/MediaAlbum', () => ({}));

// uploadsDir resolves at module load to backend/uploads/media.
const UPLOADS_MEDIA = path.resolve(__dirname, '..', 'uploads', 'media');
// A secret file ONE level above uploadsDir — the target a traversal would
// try to reach. It must NEVER be served.
const SECRET_PATH = path.join(UPLOADS_MEDIA, '..', `w1379-secret-${process.pid}.txt`);
const LEGIT_NAME = `w1379-legit-${process.pid}.png`;
const LEGIT_PATH = path.join(UPLOADS_MEDIA, LEGIT_NAME);

let app;

beforeAll(() => {
  fs.mkdirSync(UPLOADS_MEDIA, { recursive: true });
  fs.writeFileSync(LEGIT_PATH, 'legit-image-bytes');
  fs.writeFileSync(SECRET_PATH, 'SECRET — outside uploadsDir, must never leak');

  const router = require('../routes/media.routes');
  app = express();
  app.use('/api/media', router);
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

describe('W1379 — media /file/:filename path-traversal neutralization (behavioral)', () => {
  test('serves a legit file inside uploadsDir with the correct content-type (200)', async () => {
    const res = await request(app).get(`/api/media/file/${LEGIT_NAME}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    const body =
      Buffer.isBuffer(res.body) && res.body.length ? res.body.toString('utf8') : res.text;
    expect(body).toContain('legit-image-bytes');
  });

  test('traversal param is neutralized by basename strip → 404, no secret leak', async () => {
    // `..%2f..%2fw1379-secret-<pid>.txt` decodes to a traversal that
    // path.basename collapses to the bare secret filename, then looks it
    // up INSIDE uploadsDir (where it does not exist) → 404.
    const traversal = encodeURIComponent(`../../${path.basename(SECRET_PATH)}`);
    const res = await request(app).get(`/api/media/file/${traversal}`);
    expect(res.status).toBe(404);
    const body =
      Buffer.isBuffer(res.body) && res.body.length ? res.body.toString('utf8') : res.text;
    expect(body).not.toMatch(/SECRET/);
  });

  test('a non-existent plain filename returns 404 (not 500)', async () => {
    const res = await request(app).get('/api/media/file/does-not-exist-w1379.png');
    expect(res.status).toBe(404);
  });
});
