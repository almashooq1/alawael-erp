'use strict';

/**
 * documents-preview-disposition-behavioral-wave1374.test.js — W1374.
 *
 * BEHAVIORAL counterpart to the static W462 source-analysis guard
 * (stored-xss-document-preview-wave462). That guard reads the preview-handler
 * source as a string; it cannot prove that at RUNTIME the handler actually
 * forces `Content-Disposition: attachment` (+ sandbox CSP + X-Frame-Options)
 * for executable-script MIME types and keeps `inline` for safe ones.
 *
 * `routes/documents.routes.js` ALLOWED_MIMES is a broad clinical set that
 * includes `text/html`, `text/xml`, `application/xml`, and `image/svg+xml`.
 * W462 mitigates stored-XSS on `GET /:id/preview` by forcing the `attachment`
 * disposition for those mimes so the browser downloads (never renders) them in
 * the application origin. `GET /:id/download` was always `attachment`.
 *
 * This test boots the real documents router (auth + branch middleware mocked,
 * Document model mocked to return seeded docs whose filePath points at real
 * temp files under UPLOADS_ROOT) and drives GET requests through supertest:
 *   preview text/html       -> attachment + X-Frame-Options:DENY + sandbox CSP
 *   preview text/xml        -> attachment
 *   preview image/svg+xml   -> attachment
 *   preview application/pdf -> inline   (safe mime still previews inline)
 *   preview image/png       -> inline
 *   download text/html      -> attachment (download path always attachment)
 *
 * Per repo doctrine: pair every static drift guard with a behavioral one.
 * Pure (no DB, no network) — Document is mocked, files are real on a temp disk.
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Mutable registry the mocked Document model reads. `mock`-prefixed so the
// jest.mock factory may close over it (jest hoist allowlist).
const mockDocs = {};

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
}));

jest.mock('../middleware/branchScope.middleware', () => ({
  requireBranchAccess: (_req, _res, next) => next(),
}));

jest.mock('../models/Document', () => ({
  findOne: jest.fn(query => Promise.resolve(mockDocs[String(query._id)] || null)),
  findByIdAndUpdate: jest.fn(() => Promise.resolve({})),
}));

let tmpRoot;
let app;

function seedDoc(id, fileName, mimeType, body) {
  const filePath = path.join(tmpRoot, fileName);
  fs.writeFileSync(filePath, body);
  mockDocs[id] = {
    _id: id,
    filePath,
    mimeType,
    originalFileName: fileName,
    fileName,
    fileSize: Buffer.byteLength(body),
    status: 'نشط',
  };
}

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'w1374-docs-'));
  process.env.UPLOADS_ROOT = tmpRoot;
  // require AFTER env is set (UPLOADS_ROOT is read at module load)
  const documentsRouter = require('../routes/documents.routes');

  seedDoc('doc-html', 'evil.html', 'text/html', '<html><script>alert(1)</script></html>');
  seedDoc('doc-xml', 'data.xml', 'text/xml', '<?xml version="1.0"?><root/>');
  seedDoc('doc-svg', 'pic.svg', 'image/svg+xml', '<svg><script>alert(1)</script></svg>');
  seedDoc('doc-pdf', 'report.pdf', 'application/pdf', '%PDF-1.4\ncontent');
  seedDoc('doc-png', 'image.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47]));

  app = express();
  app.use('/api/v1/documents', documentsRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

afterAll(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('W1374 documents preview/download disposition (behavioral)', () => {
  test('preview text/html forces attachment + sandbox CSP + X-Frame-Options', async () => {
    const res = await request(app).get('/api/v1/documents/doc-html/preview');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment/i);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['content-security-policy']).toMatch(/sandbox/i);
  });

  test('preview text/xml forces attachment (XSL/PI XSS vector)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-xml/preview');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment/i);
  });

  test('preview image/svg+xml forces attachment (inline <script> vector)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-svg/preview');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment/i);
    expect(res.headers['content-security-policy']).toMatch(/sandbox/i);
  });

  test('preview application/pdf stays inline (safe mime unchanged)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-pdf/preview');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^inline/i);
    expect(res.headers['x-frame-options']).toBeUndefined();
  });

  test('preview image/png stays inline (safe mime unchanged)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-png/preview');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^inline/i);
  });

  test('download text/html always uses attachment disposition', async () => {
    const res = await request(app).get('/api/v1/documents/doc-html/download');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment/i);
  });
});
