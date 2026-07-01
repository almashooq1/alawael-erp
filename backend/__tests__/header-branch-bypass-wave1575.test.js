/**
 * W1575 — volunteer + recruitment: client `x-branch-id` header bypassed branch scope.
 *
 * The #840 (cdss) class recurs: `const branchId = req.query.branchId ||
 * req.headers['x-branch-id']`. requireBranchAccess validates a query/body/params
 * branchId (403 on a foreign one) but is BLIND to the header. So a restricted user
 * who sent NO ?branchId but an `x-branch-id: <foreign>` header got that branch's data:
 *   - volunteer /stats + recruitment /stats spread `...filter` (the header branchId)
 *     AFTER `...branchFilter(req)`, so the header OVERRODE the enforced scope;
 *   - recruitment /reports/nitaqat + /reports/cost had NO branchFilter at all →
 *     fully header-scoped.
 * Fixed: derive from effectiveBranchScope(req) (server scope) with the query as a
 * cross-branch fallback (requireBranchAccess-validated); the header is never read.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const VOL = fs.readFileSync(path.join(__dirname, '../routes/volunteer.routes.js'), 'utf8');
const REC = fs.readFileSync(path.join(__dirname, '../routes/recruitment.routes.js'), 'utf8');

describe('W1575 — no client x-branch-id header trust', () => {
  test('volunteer + recruitment no longer read the x-branch-id header', () => {
    expect(VOL).not.toMatch(/req\.headers\['x-branch-id'\]/);
    expect(REC).not.toMatch(/req\.headers\['x-branch-id'\]/);
  });
  test('both derive the branch from effectiveBranchScope(req) (server scope)', () => {
    expect(VOL).toMatch(/const \{ effectiveBranchScope \} = require\('\.\.\/middleware\/assertBranchMatch'\)/);
    expect(REC).toMatch(/const \{ effectiveBranchScope \} = require\('\.\.\/middleware\/assertBranchMatch'\)/);
    expect((VOL.match(/effectiveBranchScope\(req\) \|\| req\.query\.branchId/g) || []).length).toBe(1);
    expect((REC.match(/effectiveBranchScope\(req\) \|\| req\.query\.branchId/g) || []).length).toBe(3);
  });
});
