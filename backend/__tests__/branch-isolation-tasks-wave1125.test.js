'use strict';

/**
 * branch-isolation-tasks-wave1125.test.js — W269 drift guard for tasks ID routes.
 *
 * GET/PUT/DELETE /tasks/:id were bare findById / findByIdAndUpdate with NO scope
 * check → any authed user could read/edit/delete any task by id.
 *
 * Task is user/assignment-oriented (`assignedTo`/`assignedBy`) with an OPTIONAL
 * `beneficiaryId` and NO `branchId` — so a blind ownership gate could break
 * legitimate manager workflows. SAFE partial fix (the disciplined call): gate the
 * CLINICAL-TASK subset (beneficiaryId-linked) by the beneficiary's branch.
 * `assertBeneficiaryInScope` / `fetchScopedByBeneficiary` no-op when there is no
 * beneficiary (and for cross-branch/HQ roles + unscoped tests), so general tasks
 * are untouched — their ownership model is a separate product decision (see
 * docs/architecture/SECURITY-mass-assignment-sweep-2026-06-10.md).
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/branch-isolation-tasks-wave1125.test.js
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'tasks.routes.js'), 'utf-8');

describe('W269 — tasks ID routes gate beneficiary-linked (clinical) tasks', () => {
  test('imports requireBranchAccess + beneficiaryBranchGate helpers', () => {
    expect(SRC).toMatch(/require\(['"]\.\.\/middleware\/branchScope\.middleware['"]\)/);
    expect(SRC).toMatch(/require\(['"]\.\.\/utils\/beneficiaryBranchGate['"]\)/);
  });

  test('GET /:id gates via fetchScopedByBeneficiary on beneficiaryId (before returning PHI)', () => {
    expect(SRC).toMatch(
      /fetchScopedByBeneficiary\(M, req\.params\.id, req, res, \{\s*beneficiaryField: 'beneficiaryId'/
    );
  });

  test('PUT + DELETE gate via the task beneficiaryId (>= 2)', () => {
    const gates = SRC.match(/assertBeneficiaryInScope\(req, existing\.beneficiaryId, res\)/g) || [];
    expect(gates.length).toBeGreaterThanOrEqual(2);
  });

  test('requireBranchAccess applied on the 3 ID routes (import + 3 uses)', () => {
    const uses = SRC.match(/requireBranchAccess/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(4);
  });

  test('each beneficiaryId gate is followed by an early return on denial', () => {
    const denials =
      SRC.match(
        /const denied = await assertBeneficiaryInScope[\s\S]{0,40}?if \(denied\) return;/g
      ) || [];
    expect(denials.length).toBeGreaterThanOrEqual(2);
  });

  test('W1131 — PUT + DELETE also enforce task-ownership (owner or manager/admin)', () => {
    expect(SRC).toMatch(/function denyIfNotTaskOwnerOrManager/);
    expect(SRC).toMatch(/TASK_PRIVILEGED_ROLES/);
    const uses = SRC.match(/denyIfNotTaskOwnerOrManager\(req, res, existing\)/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(2);
  });

  test('the ownership gate no-ops without an auth context (test/internal ergonomics)', () => {
    expect(SRC).toMatch(/if \(!req \|\| !req\.user\) return false/);
  });
});
