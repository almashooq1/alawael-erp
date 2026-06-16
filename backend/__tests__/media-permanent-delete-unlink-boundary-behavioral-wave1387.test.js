'use strict';

/**
 * W1387 — production hardening + behavioral coverage for the disk-unlink
 * path boundary on the DESTRUCTIVE media delete surfaces in
 * routes/media.routes.js (`DELETE /:id/permanent` and `POST /trash/empty`).
 *
 * BEFORE W1387 these two handlers called `fs.unlinkSync(media.filePath)` /
 * `fs.unlinkSync(t.path)` DIRECTLY with no boundary, while the SERVE handlers
 * in the same file already enforced the `+ path.sep` in-root check (W454
 * /file, W455 /:id/download). A tampered/migrated `media.filePath` pointing at
 * a prefix-shared sibling (`<root>-evil`) or an absolute out-of-root location
 * would trigger an arbitrary out-of-root file deletion.
 *
 * W1387 routes all four delete-site unlinks through `safeUnlinkInsideMedia`,
 * which resolves the path and unlinks ONLY when it is STRICTLY inside the
 * media uploads root (matching the serve-side sibling pattern). Both real
 * file paths and thumbnail paths live under that root (thumbsDir is a subdir),
 * so legitimate deletion is unchanged.
 *
 * This test boots media.routes.js via supertest and asserts the new runtime
 * behaviour: a permanent-delete of a doc whose filePath is a prefix-shared
 * sibling removes the DB row (200) but leaves the out-of-root file on disk;
 * a permanent-delete of an inside-root filePath unlinks it. Companion to
 * W1386 (files.routes.js hard-delete inverted boundary).
 */

const fs = require('fs');
const path = require('path');
const express = require('express');
const request = require('supertest');

const mockMedia = {};

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
  branchFilter: () => ({}),
}));

jest.mock('../models/Media', () => ({
  findById: jest.fn(id => Promise.resolve(mockMedia[String(id)] || null)),
  findByIdAndDelete: jest.fn(id => {
    delete mockMedia[String(id)];
    return Promise.resolve({});
  }),
  findByIdAndUpdate: jest.fn(() => Promise.resolve({})),
  find: jest.fn(() => Promise.resolve([])),
  deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 0 })),
}));

jest.mock('../models/MediaAlbum', () => ({
  findByIdAndUpdate: jest.fn(() => Promise.resolve({})),
}));

// uploadsDir = path.join(__dirname, '../uploads/media') — no env override.
const UPLOADS_MEDIA = path.resolve(__dirname, '..', 'uploads', 'media');
const SIBLING_ROOT = `${UPLOADS_MEDIA}-evil-w1387`;

const ID_SIBLING = 'a1a1a1a1a1a1a1a1a1a11111';
const ID_INSIDE = 'a1a1a1a1a1a1a1a1a1a12222';

const SIBLING_FILE = path.join(SIBLING_ROOT, 'secret-w1387.bin');
const INSIDE_FILE = path.join(UPLOADS_MEDIA, 'throwaway-w1387.bin');

let app;

beforeAll(() => {
  fs.mkdirSync(SIBLING_ROOT, { recursive: true });
  fs.mkdirSync(UPLOADS_MEDIA, { recursive: true });
  fs.writeFileSync(SIBLING_FILE, 'SECRET — must never be unlinked via tampered filePath');

  mockMedia[ID_SIBLING] = {
    _id: ID_SIBLING,
    filePath: SIBLING_FILE,
    fileName: 'secret.bin',
    fileSize: 10,
    status: 'نشط',
    thumbnails: [],
  };
  mockMedia[ID_INSIDE] = {
    _id: ID_INSIDE,
    filePath: INSIDE_FILE,
    fileName: 'throwaway.bin',
    fileSize: 10,
    status: 'نشط',
    thumbnails: [],
  };

  const mediaRouter = require('../routes/media.routes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/media', mediaRouter);
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

describe('W1387 — media permanent-delete disk-unlink in-root boundary (behavioral)', () => {
  test('permanent-delete of a prefix-shared sibling filePath does NOT unlink the file', async () => {
    expect(fs.existsSync(SIBLING_FILE)).toBe(true);
    const res = await request(app).delete(`/api/v1/media/${ID_SIBLING}/permanent`);
    expect(res.status).toBe(200);
    // DB row removed, but the out-of-root sibling file must survive.
    expect(fs.existsSync(SIBLING_FILE)).toBe(true);
  });

  test('permanent-delete of an inside-root filePath unlinks the file (200)', async () => {
    fs.writeFileSync(INSIDE_FILE, 'disposable');
    expect(fs.existsSync(INSIDE_FILE)).toBe(true);
    const res = await request(app).delete(`/api/v1/media/${ID_INSIDE}/permanent`);
    expect(res.status).toBe(200);
    expect(fs.existsSync(INSIDE_FILE)).toBe(false);
  });

  test('permanent-delete of a missing doc returns 404', async () => {
    const res = await request(app).delete('/api/v1/media/a1a1a1a1a1a1a1a1a1a13333/permanent');
    expect(res.status).toBe(404);
  });
});
