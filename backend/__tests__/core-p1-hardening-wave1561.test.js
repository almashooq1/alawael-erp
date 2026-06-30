'use strict';

/**
 * W1561 — domains/core P1 hardening (mergeable, additive isolation + PDPL + perf).
 *
 *  1. BaseRepository.findById skipped _applyDeleteFilter (unlike find/findOne/count) →
 *     GET /:beneficiaryId + /360 surfaced soft-deleted (isArchived) PII. Core repo now
 *     routes findById/findWithFullContext through the delete filter.
 *  2. bulkAction looped body.ids[] with no ObjectId validation (bad id → 500 mid-batch)
 *     and no branch ownership (param/body hooks don't cover ids[]) → cross-branch
 *     archive/delete/re-status write-IDOR. Now validates + batch ownership-checks.
 *  3. nationalId emitted raw in the 360 summary (no role gate) → masked to last-4 (PDPL).
 *  4. address.city had no index (getCities distinct + city regex → COLLSCAN) → indexed.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

const repo = read('domains/core/repositories/beneficiary.repository.js');
const service = read('domains/core/services/beneficiary.service.js');
const routes = read('domains/core/routes/beneficiary.routes.js');
const s360 = read('domains/core/services/beneficiary360.service.js');
const model = read('models/Beneficiary.js');

describe('W1561 core P1 hardening', () => {
  test('findById honors the soft-delete filter (with includeDeleted escape hatch)', () => {
    const code = strip(repo);
    expect(code).toMatch(/async findById\(id, \{[^}]*includeDeleted[^}]*\}/);
    expect(code).toMatch(/return this\.findOne\(\{ _id: id \}/);
    expect(code).toMatch(/includeDeleted\) \{\s*return super\.findById/);
  });

  test('360 full-context read excludes archived', () => {
    expect(strip(repo)).toMatch(/findOne\(\{ _id: id, isArchived: \{ \$ne: true \} \}\)/);
  });

  test('bulkAction validates ObjectIds + enforces batch branch ownership', () => {
    const code = strip(service);
    expect(code).toMatch(/isValidObjectId/);
    expect(code).toMatch(/context\.branchScope/);
    expect(code).toMatch(/statusCode = 403/);
  });

  test('bulk-action route passes branchScope into the service context', () => {
    expect(strip(routes)).toMatch(/branchScope: effectiveBranchScope\(req\)/);
  });

  test('360 summary masks nationalId (no raw value)', () => {
    const code = strip(s360);
    expect(code).not.toMatch(/nationalId: b\.nationalId,/);
    expect(code).toMatch(/String\(b\.nationalId\)\.slice\(-4\)/);
  });

  test('address.city is indexed', () => {
    expect(strip(model)).toMatch(/index\(\{ 'address\.city': 1 \}\)/);
  });
});
