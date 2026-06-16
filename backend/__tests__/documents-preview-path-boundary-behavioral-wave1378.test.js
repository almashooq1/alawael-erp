'use strict';

/**
 * W1378 — behavioral counterpart for the W454 preview-serve path
 * boundary in routes/documents.routes.js `GET /:id/preview`.
 *
 * The static guard `path-traversal-stream-boundary-wave454` reads
 * documents.routes.js source as a string. The W1374 behavioral test
 * covers the W462 stored-XSS DISPOSITION mitigation on the same
 * handler — but NOT the W454 path boundary that precedes it:
 *
 *   const resolvedPath = path.resolve(doc.filePath);   // from DB doc
 *   if (!resolvedPath.startsWith(path.resolve(UPLOADS_ROOT) + path.sep)) {
 *     return res.status(403).json({ success: false, message: 'مسار غير مسموح' });
 *   }
 *
 * `doc.filePath` is read straight from the Document, so a tampered/
 * migrated doc whose filePath points at a prefix-shared SIBLING
 * (`<root>/uploads-evil` vs `<root>/uploads`) shares the prefix but is
 * outside. Pre-W454 a bare `startsWith(UPLOADS_ROOT)` matched it and
 * streamed the file. No behavioral test proves the `+ path.sep` term
 * fires. This file boots the real router and drives the response codes.
 *
 * Pure additive test — zero production change. Sibling of W1376 (files)
 * and W1377 (media) on the documents serve surface.
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
  uploadsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'w1378-docs-'));
  process.env.UPLOADS_ROOT = uploadsRoot;
  // Prefix-shared SIBLING: shares the uploadsRoot prefix but is OUTSIDE it.
  siblingRoot = `${uploadsRoot}-evil-w1378`;
  fs.mkdirSync(siblingRoot, { recursive: true });

  const documentsRouter = require('../routes/documents.routes');

  const insidePath = path.join(uploadsRoot, 'legit.pdf');
  fs.writeFileSync(insidePath, '%PDF-1.4\nlegit-content');
  mockDocs['doc-inside'] = {
    _id: 'doc-inside',
    filePath: insidePath,
    mimeType: 'application/pdf',
    originalFileName: 'legit.pdf',
    fileName: 'legit.pdf',
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

// The preview streams the file with a binary Content-Type, so supertest may
// surface the payload via res.body (Buffer) rather than res.text.
const bodyText = res =>
  res.text != null && res.text !== ''
    ? res.text
    : Buffer.isBuffer(res.body)
      ? res.body.toString('utf8')
      : JSON.stringify(res.body);

describe('W1378 — documents preview W454 path boundary (behavioral)', () => {
  test('previews a doc whose filePath is STRICTLY inside UPLOADS_ROOT (200)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-inside/preview');
    expect(res.status).toBe(200);
    expect(bodyText(res)).toContain('legit-content');
  });

  test('rejects a prefix-shared SIBLING filePath with 403 (does NOT leak secret)', async () => {
    const res = await request(app).get('/api/v1/documents/doc-sibling/preview');
    expect(res.status).toBe(403);
    expect(bodyText(res)).not.toMatch(/SECRET/);
  });

  test('missing document returns 404', async () => {
    const res = await request(app).get('/api/v1/documents/doc-missing/preview');
    expect(res.status).toBe(404);
  });
});
