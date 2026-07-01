/**
 * W1551 — care-plan branch isolation (2026-06-30 hunt).
 *
 * The care-plan surface (CarePlanVersion — beneficiary PHI + clinical lifecycle)
 * was mounted with `authenticate` ONLY: no requireBranchAccess → req.branchScope
 * was never set → the router's own isolation machinery
 * (bodyScopedBeneficiaryGuard, the :id param guard, effectiveBranchScope in
 * listPlans) all no-op'd → full cross-branch read/write/state-machine IDOR, plus
 * unscoped list enumeration (listPlans read the always-undefined req.user.branchId).
 *
 * These are static guards on the wiring; the behavioural proof lives in the
 * existing care-plan-list-wave54 / care-plan-routes-wave42 suites (updated to
 * simulate requireBranchAccess via req.branchScope).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const BOOT = fs.readFileSync(path.join(__dirname, '../startup/carePlanningBootstrap.js'), 'utf8');
const ROUTES = fs.readFileSync(path.join(__dirname, '../routes/care-plan.routes.js'), 'utf8');
const SVC = fs.readFileSync(path.join(__dirname, '../intelligence/care-plan.service.js'), 'utf8');

describe('W1551 — care-plan mount activates branch scope', () => {
  test('the /api/v1/care-plans mount chain includes requireBranchAccess', () => {
    expect(BOOT).toMatch(/requireBranchAccess.*=.*require\('\.\.\/middleware\/branchScope\.middleware'\)/s);
    expect(BOOT).toMatch(/app\.use\(\s*'\/api\/v1\/care-plans',\s*cpAuthMw,\s*requireBranchAccess,/);
  });
});

describe('W1551 — every :id route is branch-scoped by a param guard', () => {
  test('router.param(\'id\', branchScopedResourceParam({ CarePlanVersion }))', () => {
    expect(ROUTES).toMatch(/branchScopedResourceParam/);
    const i = ROUTES.indexOf("router.param(");
    expect(i).toBeGreaterThan(-1);
    const block = ROUTES.slice(i, i + 320);
    expect(block).toMatch(/'id'/);
    expect(block).toMatch(/modelName: 'CarePlanVersion'/);
  });
});

describe('W1551 — list + history scope to the enforced branch (not req.user.branchId)', () => {
  test('listPlans derives the actor branch from effectiveBranchScope(req)', () => {
    expect(ROUTES).toMatch(/const actorBranchId = effectiveBranchScope\(req\)/);
    // the always-undefined JWT path must be gone
    expect(ROUTES).not.toMatch(/const actorBranchId = req\.user\?\.branchId/);
  });
  test('history route passes the branch scope through to the service', () => {
    const i = ROUTES.indexOf("router.get('/plan/:planId/versions'");
    const block = ROUTES.slice(i, i + 600);
    expect(block).toMatch(/getVersionHistory\(\s*req\.params\.planId,\s*effectiveBranchScope\(req\)/s);
  });
  test('getVersionHistory filters by branchId when one is supplied', () => {
    expect(SVC).toMatch(/async function getVersionHistory\(planId, branchId = null\)/);
    expect(SVC).toMatch(/find\(\{ planId, \.\.\.\(branchId \? \{ branchId \} : \{\}\) \}\)/);
  });
});
