'use strict';

/**
 * uploads-route-svg-rejection-behavioral-wave1372.test.js — W1372.
 *
 * BEHAVIORAL counterpart to the static W1355 source-analysis guard
 * (upload-svg-xss-guard-wave1355). That guard reads the route source as a
 * string; it cannot prove the multer fileFilter actually REJECTS an svg upload
 * at runtime. This test boots the real uploads router (auth mocked, disk root
 * pointed at a temp dir) and drives multipart uploads through supertest:
 *   - image/svg+xml  -> REJECTED (not 201) — locks the W1370 stored-XSS fix.
 *   - text/html      -> REJECTED (not 201).
 *   - image/png      -> ACCEPTED (201, content-hash filename).
 *   - application/pdf-> ACCEPTED (201).
 * Per repo doctrine: pair every static drift guard with a behavioral one.
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { id: 'admin-1', role: 'admin' };
    next();
  },
  authorize: () => (_req, _res, next) => next(),
}));

const PNG_BYTES = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const PDF_BYTES = Buffer.from('%PDF-1.4\n%âãÏÓ\n');
const SVG_BYTES = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
);
const HTML_BYTES = Buffer.from('<html><body><script>alert(1)</script></body></html>');

let tmpRoot;
let app;

beforeAll(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'w1372-uploads-'));
  process.env.UPLOADS_ROOT = tmpRoot;
  // require AFTER env is set (ROOT is read at module load)
  const uploadsRouter = require('../routes/uploads.routes');
  app = express();
  app.use(express.json());
  app.use('/api/v1/uploads', uploadsRouter);
  // minimal error handler so multer fileFilter rejections become a clean 400
  // instead of a default 500 HTML page (mirrors production app-level handler).
  app.use((err, _req, res, _next) => {
    res.status(400).json({ ok: false, error: err.message });
  });
});

afterAll(() => {
  try {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('W1372 uploads route — svg/html rejected, png/pdf accepted (behavioral)', () => {
  test('rejects image/svg+xml (stored-XSS vector — W1370)', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .attach('file', SVG_BYTES, { filename: 'evil.svg', contentType: 'image/svg+xml' });
    expect(res.status).not.toBe(201);
    expect(res.body.ok).not.toBe(true);
  });

  test('rejects text/html', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .attach('file', HTML_BYTES, { filename: 'evil.html', contentType: 'text/html' });
    expect(res.status).not.toBe(201);
    expect(res.body.ok).not.toBe(true);
  });

  test('accepts image/png and content-hashes the filename', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .attach('file', PNG_BYTES, { filename: 'ok.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.mime).toBe('image/png');
    expect(res.body.filename).toMatch(/^[0-9a-f]{40}\.png$/);
  });

  test('accepts application/pdf', async () => {
    const res = await request(app)
      .post('/api/v1/uploads')
      .attach('file', PDF_BYTES, { filename: 'ok.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.filename).toMatch(/^[0-9a-f]{40}\.pdf$/);
  });

  test('an svg renamed with a .png extension is still rejected by mimetype (no ext backdoor)', async () => {
    // multer fileFilter keys on the declared MIME, not the filename extension.
    const res = await request(app)
      .post('/api/v1/uploads')
      .attach('file', SVG_BYTES, { filename: 'sneaky.png', contentType: 'image/svg+xml' });
    expect(res.status).not.toBe(201);
    expect(res.body.ok).not.toBe(true);
  });
});
