/**
 * W1622 — social-case (care/social) cross-branch PHI leak. [REVIEW]
 *
 * care/social.routes.js is dualMount'ed (no injected auth) with per-route
 * `authenticate` but NO requireBranchAccess anywhere. The SocialCase reads:
 *   • GET /cases        → getService().list({ branchId: req.query.branchId })
 *   • GET /cases/:id    → getService().findById(req.params.id)  (bare)
 * left the branch scope entirely caller-controlled — a restricted user could
 * omit/spoof ?branchId (or just read any :id) and reach ANOTHER branch's
 * social-work cases (beneficiary + risk levels + interventions + assessments).
 *
 * Fix: requireBranchAccess on both read routes + force the caller's branch via
 * effectiveBranchScope(req) (null for cross-branch roles → unchanged); the
 * service findById(id, branchId) denies a foreign-branch case (→ 404).
 *
 * LEAVE IN REVIEW: adds branch access-control to a live surface — owner confirms
 * which social roles (social_manager?) are legitimately cross-branch.
 *
 * Static guard.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'care', 'social.routes.js'),
  'utf8'
);
const SVC = fs.readFileSync(
  path.join(__dirname, '..', 'services', 'care', 'socialCase.service.js'),
  'utf8'
);

describe('W1622 social-case branch isolation', () => {
  test('route imports requireBranchAccess + effectiveBranchScope', () => {
    expect(ROUTE).toMatch(/requireBranchAccess.*require\(.*branchScope\.middleware/);
    expect(ROUTE).toMatch(/effectiveBranchScope.*require\(.*assertBranchMatch/);
  });

  test('both read routes apply requireBranchAccess', () => {
    // GET /cases
    const list = ROUTE.slice(ROUTE.indexOf("'/cases',"), ROUTE.indexOf("'/cases/:id'"));
    expect(list).toMatch(/requireBranchAccess/);
    // GET /cases/:id
    const one = ROUTE.slice(ROUTE.indexOf("'/cases/:id'"), ROUTE.indexOf("'/cases/:id'") + 400);
    expect(one).toMatch(/requireBranchAccess/);
  });

  test('reads force the caller branch (no raw client passthrough)', () => {
    expect(ROUTE).toMatch(/branchId: effectiveBranchScope\(req\) \|\| req\.query\.branchId/);
    expect(ROUTE).toMatch(/findById\(req\.params\.id, effectiveBranchScope\(req\)\)/);
    expect(ROUTE).not.toMatch(/findById\(req\.params\.id\)\s*;/);
  });

  test('service findById denies a foreign-branch case', () => {
    expect(SVC).toMatch(/async function findById\(id, branchId\)/);
    expect(SVC).toMatch(/branchId && doc\.branchId && String\(doc\.branchId\) !== String\(branchId\)/);
  });
});
