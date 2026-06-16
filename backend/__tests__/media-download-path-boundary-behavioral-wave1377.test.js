'use strict';

/**
 * W1377 — behavioral counterpart for the W455 download-serve path
 * boundary in routes/media.routes.js `GET /:id/download`.
 *
 * W454 (path-traversal-stream-boundary-wave454) is a STATIC source
 * guard over media.routes.js. The W455 boundary on the DB-backed
 * download handler is a real runtime defense:
 *
 *   const resolvedFile = path.resolve(filePath);   // filePath = media.filePath
 *   if (!resolvedFile.startsWith(path.resolve(uploadsDir) + path.sep)) {
 *     return res.status(403).json({ success: false, message: 'مسار غير مسموح' });
 *   }
 *
 * Unlike `GET /file/:filename` (which strips via path.basename), this
 * handler reads `media.filePath` straight from the DB document — so a
 * tampered/migrated doc whose filePath points at a prefix-shared
 * SIBLING (`<root>/uploads/media-evil` vs `<root>/uploads/media`)
 * shares the prefix but is outside. Pre-W455 a bare
 * `startsWith(uploadsDir)` matched it and `res.download`-ed the file.
 * No behavioral test proves this boundary fires. This file boots the
 * real router and drives the actual response codes.
 *
 * Pure additive test — zero production change. Sibling of W1376 on the
 * media serve surface.
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

const mockMedia = {};
jest.mock('../models/Media', () => ({
  findById: jest.fn(id => Promise.resolve(mockMedia[String(id)] || null)),
  findByIdAndUpdate: jest.fn(() => Promise.resolve(null)),
}));
jest.mock('../models/MediaAlbum', () => ({}));

// uploadsDir resolves at module load to backend/uploads/media.
const UPLOADS_MEDIA = path.resolve(__dirname, '..', 'uploads', 'media');
// Prefix-shared SIBLING of uploadsDir — shares "media" prefix but is
// NOT inside it (exactly what W455's `+ path.sep` blocks).
const SIBLING_ROOT = `${UPLOADS_MEDIA}-evil-w1377`;
const insideDir = path.join(UPLOADS_MEDIA, `.w1377-${process.pid}-${Date.now()}`);

const ID_INSIDE = 'c3c3c3c3c3c3c3c3c3c3c3c3';
const ID_SIBLING = 'd4d4d4d4d4d4d4d4d4d4d4d4';

let app;

beforeAll(() => {
  fs.mkdirSync(insideDir, { recursive: true });
  fs.mkdirSync(SIBLING_ROOT, { recursive: true });

  const insidePath = path.join(insideDir, 'legit.png');
  fs.writeFileSync(insidePath, 'legit-image-bytes');
  mockMedia[ID_INSIDE] = {
    _id: ID_INSIDE,
    filePath: insidePath,
    fileName: 'legit.png',
    originalName: 'legit.png',
    status: 'active',
  };

  const siblingPath = path.join(SIBLING_ROOT, 'secret.png');
  fs.writeFileSync(siblingPath, 'SECRET — must never be served');
  mockMedia[ID_SIBLING] = {
    _id: ID_SIBLING,
    filePath: siblingPath,
    fileName: 'secret.png',
    originalName: 'secret.png',
    status: 'active',
  };

  const router = require('../routes/media.routes');
  app = express();
  app.use('/api/media', router);
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

describe('W1377 — media.routes.js /:id/download W455 path boundary (behavioral)', () => {
  // res.download() streams the file as a binary attachment, so supertest
  // surfaces the payload via res.body (Buffer) rather than res.text.
  const bodyText = res =>
    res.text != null && res.text !== ''
      ? res.text
      : Buffer.isBuffer(res.body)
        ? res.body.toString('utf8')
        : JSON.stringify(res.body);

  test('serves a media file STRICTLY inside uploadsDir (200)', async () => {
    const res = await request(app).get(`/api/media/${ID_INSIDE}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(bodyText(res)).toContain('legit-image-bytes');
  });

  test('rejects a prefix-shared SIBLING filePath with 403 (does NOT leak secret)', async () => {
    const res = await request(app).get(`/api/media/${ID_SIBLING}/download`);
    expect(res.status).toBe(403);
    expect(bodyText(res)).not.toMatch(/SECRET/);
  });

  test('missing media doc returns 404', async () => {
    const res = await request(app).get('/api/media/e5e5e5e5e5e5e5e5e5e5e5e5/download');
    expect(res.status).toBe(404);
  });
});
