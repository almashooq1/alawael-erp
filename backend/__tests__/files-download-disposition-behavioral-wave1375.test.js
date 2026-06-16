'use strict';

/**
 * W1375 — behavioral counterpart to the STATIC W463 guard
 * (stored-xss-files-preview-wave463.test.js).
 *
 * W463 reads routes/files.routes.js as a STRING and regex-asserts that
 * the `GET /:id/download` handler carries the W462-shape stored-XSS
 * mitigation (isExecutableScript → attachment + sandbox CSP). Static
 * source analysis proves the code is PRESENT but NOT that it FIRES at
 * runtime. Per repo doctrine — "pair every static drift guard with a
 * behavioral counterpart" — this file boots the real router via
 * supertest and asserts the actual response headers.
 *
 * The route name (`/download`) is misleading: it serves files INLINE by
 * default, so the disposition mitigation is the only thing standing
 * between a script-bearing mime and a stored-XSS render. This is the
 * sibling of W1374 (documents.routes.js) and W1372 (uploads.routes.js).
 *
 * Behaviour asserted (zero production change — additive test only):
 *   • html  → attachment + X-Frame-Options:DENY + sandbox CSP
 *   • xml   → attachment + sandbox CSP
 *   • svg   → attachment + sandbox CSP
 *   • pdf   → inline (no X-Frame-Options)
 *   • png   → inline
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const express = require('express');
const request = require('supertest');

// ── mock auth + branch middleware to pass-through ─────────────────────
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

// ── mock the UploadedFile model with a mutable registry ───────────────
const mockDocs = {};
jest.mock('../models/UploadedFile', () => ({
  findById: jest.fn(id => Promise.resolve(mockDocs[String(id)] || null)),
}));

// UPLOAD_ROOT is resolved at module load to backend/uploads — seed files
// must live STRICTLY inside it to pass the W453 path-boundary check.
const UPLOAD_ROOT = path.resolve(__dirname, '..', 'uploads');
const tmpDir = path.join(UPLOAD_ROOT, `.w1375-${process.pid}-${Date.now()}`);

// Each seeded doc uses a valid 24-hex ObjectId so mongoose.isValidObjectId passes.
function seedDoc(id, originalName, mimeType, body) {
  const filePath = path.join(tmpDir, originalName);
  fs.writeFileSync(filePath, body);
  mockDocs[id] = {
    _id: id,
    originalName,
    mimeType,
    storagePath: filePath,
    status: 'active',
  };
  return id;
}

const ID_HTML = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const ID_XML = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const ID_SVG = 'cccccccccccccccccccccccc';
const ID_PDF = 'dddddddddddddddddddddddd';
const ID_PNG = 'eeeeeeeeeeeeeeeeeeeeeeee';

let app;

beforeAll(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
  seedDoc(ID_HTML, 'evil.html', 'text/html', '<script>alert(1)</script>');
  seedDoc(ID_XML, 'data.xml', 'application/xml', '<root/>');
  seedDoc(ID_SVG, 'icon.svg', 'image/svg+xml', '<svg onload="alert(1)"/>');
  seedDoc(ID_PDF, 'report.pdf', 'application/pdf', '%PDF-1.4');
  seedDoc(ID_PNG, 'pic.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  const router = require('../routes/files.routes');
  app = express();
  app.use('/api/v1/files', router);
});

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
});

describe('W1375 — files.routes.js /:id/download disposition (behavioral)', () => {
  test('html → attachment + X-Frame-Options:DENY + sandbox CSP', async () => {
    const res = await request(app).get(`/api/v1/files/${ID_HTML}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment;/);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toMatch(/sandbox/);
  });

  test('xml → attachment + sandbox CSP', async () => {
    const res = await request(app).get(`/api/v1/files/${ID_XML}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment;/);
    expect(res.headers['content-security-policy']).toMatch(/sandbox/);
  });

  test('svg → attachment + sandbox CSP', async () => {
    const res = await request(app).get(`/api/v1/files/${ID_SVG}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment;/);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toMatch(/sandbox/);
  });

  test('pdf → inline (no X-Frame-Options)', async () => {
    const res = await request(app).get(`/api/v1/files/${ID_PDF}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^inline;/);
    expect(res.headers['x-frame-options']).toBeUndefined();
  });

  test('png → inline', async () => {
    const res = await request(app).get(`/api/v1/files/${ID_PNG}/download`);
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^inline;/);
  });
});
