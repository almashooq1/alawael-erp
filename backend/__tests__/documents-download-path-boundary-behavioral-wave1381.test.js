'use strict';

/**
 * W1381 — behavioral counterpart for the W454 DOWNLOAD-serve path
 * boundary in routes/documents.routes.js `GET /:id/download`.
 *
 * documents.routes.js exposes TWO distinct DB-backed serve handlers:
 *   - GET /:id/preview   (boundary behaviorally covered by W1378)
 *   - GET /:id/download  (this file)
 * Each has its own W454 `+ path.sep` boundary reading `doc.filePath`
 * straight from the document. W1374 covered the download handler's
 * DISPOSITION (always attachment) but NOT its path boundary. A
 * tampered/migrated doc whose filePath points at a prefix-shared
 * SIBLING (`<root>/uploads-evil` vs `<root>/uploads`) shares the prefix
 * but is outside; pre-W454 a bare `startsWith` matched it and streamed
 * the file. No behavioral test proves the download boundary fires.
 *
 * Pure additive test — zero production change. Completes the
 * download-side counterpart to W1378 (preview) on documents.routes.js.
 */

const express = require('express');
const request = require('supertest');
const fs = require('fs');
const os = require('os');
const path = require('path');

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

let uploadsRoot;
let siblingRoot;
let app;

beforeAll(() => {
  // UPLOADS_ROOT is read at module load — set BEFORE requiring the router.
  uploadsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'w1381-docs-'));
  process.env.UPLOADS_ROOT = uploadsRoot;
  // Prefix-shared SIBLING: shares the uploadsRoot prefix but is OUTSIDE it.
  siblingRoot = `${uploadsRoot}-evil-w1381`;
  fs.mkdirSync(siblingRoot, { recursive: true });

  const documentsRouter = require('../routes/documents.routes');

  const insidePath = path.join(uploadsRoot, 'legit.pdf');
  fs.writeFileSync(insidePath, '%PDF-1.4\nlegit-download-content');
  mockDocs['doc-inside'] = {
    _id: 'doc-inside',
    filePath: insidePath,
    mimeType: 'application/pdf',
    originalFileName: 'legit.pdf',
    fileName: 'legit.pdf',
    fileSize: fs.statSync(insidePath).size,
    status: 'نشط',
  };

  const siblingPath = path.join(siblingRoot, 'secret.pdf');
  fs.writeFileSync(siblingPath, '%PDF-1.4\nSECRET — must never be served');
  mockDocs['doc-sibling'] = {
    _id: 'doc-sibling',
    filePath: siblingPath,
    mimeType: 'application/pdf',
    originalFileName: 'secret.pdf',
    fileName: 'secret.pdf',
    fileSize: fs.statSync(siblingPath).size,
    status: 'نشط',
  };

  app = express();
  app.use('/api/v1/documents', documentsRouter);
  app.use((err, _req, res, _next) => {
    res.status(500).json({ ok: false, error: err.message });
  });
});

afterAll(() => {
  for (const dir of [uploadsRoot, siblingRoot]) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
});

// The download streams the file as a binary attachment, so supertest may
// surface the payload via res.body (Buffer) rather than res.text.
const bodyText = res =>
  res.text != null && res.text !== ''
    ? res.text
    : Buffer.isBuffer(res.body)
      ? res.body.toString('utf8')
      : JSON.stringify(res.body);

describe('W1381 — documents download W454 path boundary (behavioral)', () => {
  test('downloads a doc whose filePath is STRICTLY inside UPLOADS_ROOT (200, attachment)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-inside/download');
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment/i);
    expect(bodyText(res)).toContain('legit-download-content');
  });

  test('rejects a prefix-shared SIBLING filePath with 403 (does NOT leak secret)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-sibling/download');
    expect(res.status).toBe(403);
    expect(bodyText(res)).not.toMatch(/SECRET/);
  });

  test('missing document returns 404', async () => {
    const res = await request(app).get('/api/v1/documents/doc-missing/download');
    expect(res.status).toBe(404);
  });
});
