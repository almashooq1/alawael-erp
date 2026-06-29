/**
 * Document access-control guard (2026-06-29 documents bug-hunt).
 *
 * The Document model has NO branchId, so `requireBranchAccess` (mounted on the
 * router) cannot isolate documents — it only rejects a request that explicitly
 * names a foreign ?branchId=. The real gate is the per-route
 * `requireDocumentAccess(action)` middleware (owner / ACL / role), but it was
 * applied to only 2 of ~14 `:id` endpoints (preview + download). Every other
 * read/write/delete/share endpoint did a bare `Document.findById(req.params.id)`
 * → ANY authenticated user could read full PHI metadata, edit, soft-delete,
 * archive, restore, or SHARE (durable grant) any tenant's document by _id.
 *
 * This guard asserts every state-changing / detail-read `:id` route carries
 * requireDocumentAccess so the protection can't silently regress.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/documents.routes.js'), 'utf8');

// path string → expected action. Each must be immediately followed (within the
// route declaration) by requireDocumentAccess('<action>').
const GUARDED = [
  ["'/:id',", 'view'], // GET detail (also reused by PUT 'edit' + DELETE 'delete' — see below)
  ["'/:id/versions',", 'view'],
  ["'/:id/link',", 'edit'],
  ["'/:id/unlink',", 'edit'],
  ["'/:id/restore',", 'edit'],
  ["'/:id/archive',", 'edit'],
  ["'/:id/share',", 'share'],
  ["'/:id/share/:shareId',", 'share'],
  ["'/:id/upload-version',", 'edit'],
  ["'/:id/versions/:vid/restore',", 'edit'],
];

describe('documents.routes — every :id route is access-gated', () => {
  test('requireDocumentAccess is imported', () => {
    expect(SRC).toMatch(
      /requireDocumentAccess.*=.*require\('\.\.\/middleware\/documentAccess\.middleware'\)/
    );
  });

  test.each(GUARDED)('route %s is followed by requireDocumentAccess', (pathStr, action) => {
    // find each occurrence of the path string and require that the next ~80 chars
    // contain requireDocumentAccess (with the right action for unique paths)
    let idx = SRC.indexOf(pathStr);
    expect(idx).toBeGreaterThan(-1);
    let guardedSomewhere = false;
    while (idx !== -1) {
      const window = SRC.slice(idx, idx + 120);
      if (/requireDocumentAccess\(/.test(window)) {
        guardedSomewhere = true;
        if (pathStr !== "'/:id',") {
          expect(window).toContain(`requireDocumentAccess('${action}')`);
        }
      }
      idx = SRC.indexOf(pathStr, idx + 1);
    }
    expect(guardedSomewhere).toBe(true);
  });

  test('all three /:id verbs (GET view, PUT edit, DELETE delete) are gated', () => {
    expect(SRC).toMatch(/'\/:id',\s*requireDocumentAccess\('view'\)/);
    expect(SRC).toMatch(/'\/:id',\s*requireDocumentAccess\('edit'\)/);
    expect(SRC).toMatch(/'\/:id',\s*requireDocumentAccess\('delete'\)/);
  });

  test('at least 14 requireDocumentAccess gates present (2 pre-existing + 12 added)', () => {
    const count = (SRC.match(/requireDocumentAccess\(/g) || []).length;
    expect(count).toBeGreaterThanOrEqual(14);
  });
});
