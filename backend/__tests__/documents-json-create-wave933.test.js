/**
 * Wave 933 — regression guard: documents must have a JSON POST / create route.
 *
 * The web-admin document form posts JSON (a stored-file URL + entity linkage) to
 * /api/v1/documents, but the route only had a multipart POST /upload → every
 * save 404'd. W933 adds a JSON `POST /` that maps the payload onto the Document
 * model (derives required fileName/originalFileName/filePath/fileSize, maps the
 * English category to the Arabic enum, stamps uploadedBy from the token).
 *
 * Static source guard (pure-unit, no DB).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'documents.routes.js'),
  'utf8'
);
const MODEL = fs.readFileSync(path.join(__dirname, '..', 'models', 'Document.js'), 'utf8');

describe('W933 — documents JSON create route + model fields', () => {
  it('defines the English→Arabic category map', () => {
    expect(ROUTE).toMatch(/DOC_CATEGORY_MAP/);
    expect(ROUTE).toMatch(/CLINICAL:\s*'تقارير'/);
    expect(ROUTE).toMatch(/FINANCE:\s*'مالي'/);
  });

  it('has a JSON POST / handler that creates a Document', () => {
    expect(ROUTE).toMatch(/router\.post\(\s*'\/'/);
    expect(ROUTE).toMatch(/fileUrl/);
    expect(ROUTE).toMatch(/Document\.create/);
    expect(ROUTE).toMatch(/uploadedBy:\s*actorId/);
    expect(ROUTE).toMatch(/DOC_CATEGORY_MAP\[category\]/);
  });

  it('reads the actor id from the token as id || _id (JWT carries id)', () => {
    expect(ROUTE).toMatch(/req\.user\.id\s*\|\|\s*req\.user\._id/);
  });

  it('model carries the additive entity-linkage fields', () => {
    expect(MODEL).toMatch(/entityType:\s*\{\s*type:\s*String/);
    expect(MODEL).toMatch(/entityId:\s*\{\s*type:\s*String/);
    expect(MODEL).toMatch(/fileUrl:\s*\{\s*type:\s*String/);
  });
});
