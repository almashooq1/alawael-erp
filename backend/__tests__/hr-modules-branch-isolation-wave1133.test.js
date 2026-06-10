'use strict';

/**
 * hr-modules-branch-isolation-wave1133.test.js — W1133 static drift guard.
 *
 * Closes the `hr-modules branch-scoping BLOCKED` finding from the 2026-06-10
 * security sweep (docs/architecture/SECURITY-mass-assignment-sweep-2026-06-10.md):
 * the generic `attachCrud` factory in routes/hr/hr-modules.routes.js listed +
 * read + patched 12 HR modules with NO branch filter, mounted WITHOUT
 * requireBranchAccess — so a branch-restricted HR user saw every branch's loans,
 * visas, health-insurance, assets, …
 *
 * Fix: denormalize `branchId` onto the 7 employee-private models (derived from the
 * employee by models/HR/hrBranchScope.plugin.js) + enforce the standard
 * W269 isolation on the router (requireBranchAccess + branchFilter on lists +
 * assertBranchMatch on id / action paths). Org-wide modules (comp-bands, positions,
 * surveys, kudos, policies) are intentionally NOT branch-gated.
 *
 * This is the SOURCE-shape guard; the behavioral counterpart
 * (hr-branch-scope-plugin-behavioral-wave1133) proves the runtime behaviour.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hr-modules-branch-isolation-wave1133.test.js
 */

const fs = require('fs');
const path = require('path');

const HR_DIR = path.join(__dirname, '..', 'models', 'HR');
const ROUTER = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'hr', 'hr-modules.routes.js'),
  'utf-8'
);
const PLUGIN = fs.readFileSync(path.join(HR_DIR, 'hrBranchScope.plugin.js'), 'utf-8');

// The 7 employee-private models that MUST carry the derive-from-employee plugin.
const SCOPED_MODELS = [
  'Loan.js',
  'TravelRequest.js',
  'HealthInsurance.js',
  'AssetAssignment.js',
  'VisaRequest.js',
  'OnboardingChecklist.js',
  'ShiftSwap.js',
];

describe('W1133 — hr-modules.routes.js enforces W269 cross-branch isolation', () => {
  test('imports branchScope.middleware (requireBranchAccess + branchFilter)', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(ROUTER).toMatch(/requireBranchAccess/);
    expect(ROUTER).toMatch(/branchFilter/);
  });

  test('imports assertBranchMatch helper', () => {
    expect(ROUTER).toMatch(/require\(['"]\.\.\/\.\.\/middleware\/assertBranchMatch['"]\)/);
    expect(ROUTER).toMatch(/assertBranchMatch/);
  });

  test('router populates req.branchScope via requireBranchAccess for every route', () => {
    expect(ROUTER).toMatch(/router\.use\(requireBranchAccess\)/);
  });

  test('list queries merge the branch filter (listScopeFilter)', () => {
    expect(ROUTER).toMatch(/function listScopeFilter/);
    expect(ROUTER).toMatch(/\.\.\.listScopeFilter\(req, scope\)/);
  });

  test('per-doc ownership is asserted on id + action paths (>= 5 guard calls)', () => {
    expect(ROUTER).toMatch(/function guardDocBranch/);
    const uses = ROUTER.match(/guardDocBranch\(req, res,/g) || [];
    // GET/:id + PATCH/:id pre-load + onboarding.complete + asset.return + loan.approve
    expect(uses.length).toBeGreaterThanOrEqual(5);
  });

  test('the 7 employee-private prefixes are branch-scoped (scope option present)', () => {
    // 6 strict (scope: {}) + visas (allowNullBranch)
    const strict = ROUTER.match(/scope: \{\}/g) || [];
    expect(strict.length).toBe(6);
    expect(ROUTER).toMatch(/scope: \{ allowNullBranch: true \}/);
  });

  test('org-wide modules stay un-scoped (no scope on comp-bands/policies/surveys/kudos/positions)', () => {
    // These lines must NOT carry a scope option (shared config / recognition).
    expect(ROUTER).toMatch(/attachCrud\('\/comp-bands'[^\n]*\{ readRoles: ADMIN \}\)/);
    expect(ROUTER).toMatch(/attachCrud\('\/positions'[^\n]*\{ readRoles: ADMIN \}\)/);
    expect(ROUTER).toMatch(/attachCrud\('\/policies'[^\n]*\{ readRoles: MANAGER \}\)/);
  });
});

describe('W1133 — hrBranchScope.plugin derives branchId from the employee', () => {
  test('adds a branchId path only when absent + exposes introspection markers', () => {
    expect(PLUGIN).toMatch(/if \(!schema\.path\(field\)\)/);
    expect(PLUGIN).toMatch(/ref: 'Branch'/);
    expect(PLUGIN).toMatch(/__hrBranchScoped/);
    expect(PLUGIN).toMatch(/__hrEmployeeField/);
  });

  test('derives from Employee.branch_id on validate (single hook, no double lookup)', () => {
    expect(PLUGIN).toMatch(/schema\.pre\('validate'/);
    expect(PLUGIN).toMatch(/mongoose\.model\('Employee'\)/);
    expect(PLUGIN).toMatch(/branch_id branchId/);
    // best-effort: never throws
    expect(PLUGIN).toMatch(/catch \(_err\)/);
  });

  test('uses the canonical TENANT_FIELD as the default field name', () => {
    expect(PLUGIN).toMatch(/TENANT_FIELD/);
  });
});

describe('W1133 — the 7 employee-private models apply hrBranchScope.plugin', () => {
  test.each(SCOPED_MODELS)('%s applies hrBranchScope.plugin', file => {
    const src = fs.readFileSync(path.join(HR_DIR, file), 'utf-8');
    expect(src).toMatch(/\.plugin\(require\(['"]\.\/hrBranchScope\.plugin['"]\)/);
  });

  test('ShiftSwap derives from the requester (requesterId), not employeeId', () => {
    const src = fs.readFileSync(path.join(HR_DIR, 'ShiftSwap.js'), 'utf-8');
    expect(src).toMatch(/employeeField: 'requesterId'/);
  });
});
