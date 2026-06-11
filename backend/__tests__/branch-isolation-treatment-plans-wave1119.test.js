'use strict';

/**
 * branch-isolation-treatment-plans-wave1119.test.js — W269 drift guard.
 *
 * therapist-extended `PUT /treatment-plans/:planId` + `PATCH …/goals/:goalId`
 * were bare `findByIdAndUpdate(planId)` with NO ownership check → any authed
 * therapist could edit ANY branch's clinical care plan (cross-branch IDOR on
 * clinical PHI — the W269 "Layer B" class, surfaced as a secondary finding of
 * the 2026-06-10 mass-assignment sweep).
 *
 * Now gated with the proven care-plans-admin pattern:
 *   route-level requireBranchAccess (populates req.branchScope)
 *   → pre-load the plan's beneficiary
 *   → assertBeneficiaryInScope(req, beneficiary, res)  (404 + return on deny;
 *     no-op for cross-branch/HQ roles + unscoped test calls).
 *
 * Static drift guard (locks the enforcement + forbids regression). A behavioral
 * cross-branch-denial test (W269 doctrine ideal) is a follow-up — the underlying
 * assertBeneficiaryInScope helper is already behaviorally proven by the
 * care-plans-admin branch-isolation suites.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/branch-isolation-treatment-plans-wave1119.test.js
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'therapist-extended.routes.js'),
  'utf-8'
);

describe('W269 — therapist-extended treatment-plan writes are branch-gated', () => {
  test('imports requireBranchAccess + assertBeneficiaryInScope', () => {
    expect(SRC).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(SRC).toMatch(/require\(['"]\.\.\/utils\/beneficiaryBranchGate['"]\)/);
    expect(SRC).toMatch(/requireBranchAccess/);
    expect(SRC).toMatch(/assertBeneficiaryInScope/);
  });

  test('both treatment-plan writes gate via assertBeneficiaryInScope on the plan beneficiary', () => {
    const gates = SRC.match(/assertBeneficiaryInScope\(req, existing\.beneficiary, res\)/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(2); // PUT + goals PATCH
  });

  test('both writes pre-load the plan beneficiary BEFORE mutating', () => {
    const loads = SRC.match(/findById\(req\.params\.planId\)\.select\('beneficiary'\)/g) || [];
    expect(loads.length).toBeGreaterThanOrEqual(2);
  });

  test('requireBranchAccess is applied route-level on the gated writes (import + 2 uses)', () => {
    const uses = SRC.match(/requireBranchAccess/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(3); // 1 import + 2 routes
  });

  test('every gate is followed by an early return on denial', () => {
    const denials =
      SRC.match(
        /const denied = await assertBeneficiaryInScope[\s\S]{0,40}?if \(denied\) return;/g
      ) || [];
    expect(denials.length).toBeGreaterThanOrEqual(4); // 2 treatment-plan writes + prescriptions PUT/DELETE
  });

  test('GET /treatment-plans/:id gates before loading PHI via fetchScopedByBeneficiary', () => {
    expect(SRC).toMatch(/fetchScopedByBeneficiary/);
    expect(SRC).toMatch(/fetchScopedByBeneficiary\(M, req\.params\.planId, req, res/);
  });

  test('prescriptions PUT + DELETE gate via the prescription beneficiaryId', () => {
    const gates = SRC.match(/assertBeneficiaryInScope\(req, existing\.beneficiaryId, res\)/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(2);
  });

  test('professional-dev PUT + DELETE enforce therapist-ownership (denyIfNotOwnTherapistRecord)', () => {
    expect(SRC).toMatch(/function denyIfNotOwnTherapistRecord/);
    const uses = SRC.match(/denyIfNotOwnTherapistRecord\(req, res, existing\.therapistId\)/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
  });
});
