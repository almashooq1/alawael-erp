/**
 * W1565 — CDSS branch scope must be server-derived, not a client header.
 *
 * P0: `const getBranchId = req => req.user?.branchId || req.headers['x-branch-id']`.
 * req.user.branchId is NEVER populated (the JWT omits it), so the branch used for
 * EVERY CDSS read filter + write stamp resolved to the client-controlled
 * `x-branch-id` header. requireBranchAccess never blocks a header (it only rejects a
 * foreign query/body/params branchId), so any restricted user could read or write
 * ANOTHER branch's clinical PHI (risk assessments, prescription validations, alerts,
 * decision logs, differential diagnoses) by sending one HTTP header.
 *
 * Fix: derive from effectiveBranchScope(req) (the requireBranchAccess server scope) —
 * a restricted caller gets their OWN branch (header ignored → exploit closed); the
 * header is only honoured for cross-branch roles (null scope), who may target any
 * branch anyway.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '../routes/cdss.routes.js'), 'utf8');

describe('W1565 — CDSS getBranchId is server-derived', () => {
  test('effectiveBranchScope is imported', () => {
    expect(SRC).toMatch(/effectiveBranchScope/);
  });
  test('getBranchId derives from effectiveBranchScope, not req.user.branchId', () => {
    expect(SRC).toMatch(/const getBranchId = req => effectiveBranchScope\(req\)/);
    // the always-undefined + header-primary form must be gone
    expect(SRC).not.toMatch(/req\.user\?\.branchId \|\| req\.headers\['x-branch-id'\]/);
  });
  test('the header is only a fallback after the server scope (cross-branch roles)', () => {
    // effectiveBranchScope short-circuits for restricted users; the header comes AFTER
    expect(SRC).toMatch(/effectiveBranchScope\(req\) \|\| req\.headers\['x-branch-id'\]/);
  });
});
