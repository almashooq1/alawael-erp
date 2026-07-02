'use strict';

/**
 * W1611 — goal-progress-admin write-IDOR. GoalProgressEntry has beneficiaryId but NO branchId,
 * so isolation must go through the beneficiary's branch (assertBeneficiaryInScope), not branchFilter.
 * READ/WRITE_ROLES include branch-restricted roles (manager/therapist ∉ CROSS_BRANCH_ROLES). Pre-fix,
 * GET /beneficiary/:id, PATCH /:id and DELETE /:id read/modified/deleted any beneficiary's goal
 * progress by id with no ownership check → cross-branch PHI read + modify + delete.
 *
 * Fix: assertBeneficiaryInScope(req, beneficiaryId, res) — on the beneficiary read, and on PATCH/DELETE
 * after loading the entry's beneficiaryId (load → verify → mutate). The remaining list/overview/goal/
 * export aggregates have no branchId to scope cheaply → a read-only secondary gap, noted for follow-up.
 */

const fs = require('fs');
const path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'goal-progress-admin.routes.js'), 'utf8');

function handlerBody(marker) {
  const i = SRC.indexOf(marker);
  return i < 0 ? '' : SRC.slice(i, i + 700);
}

describe('W1611 goal-progress-admin isolates by beneficiary branch', () => {
  test('imports assertBeneficiaryInScope', () => {
    expect(SRC).toMatch(/assertBeneficiaryInScope.*=.*assertBranchMatch|assertBeneficiaryInScope\s*,/s);
  });

  test('GET /beneficiary/:id guards before reading', () => {
    const b = handlerBody("'/beneficiary/:id'");
    const guardIdx = b.indexOf('assertBeneficiaryInScope');
    const readIdx = b.indexOf('GoalProgressEntry.find(');
    expect(guardIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(readIdx);
  });

  test('PATCH /:id and DELETE /:id verify beneficiary scope before the write', () => {
    const patch = SRC.slice(SRC.indexOf("router.patch('/:id'"), SRC.indexOf("router.delete('/:id'"));
    expect(patch.indexOf('assertBeneficiaryInScope')).toBeGreaterThan(-1);
    expect(patch.indexOf('assertBeneficiaryInScope')).toBeLessThan(patch.indexOf('findByIdAndUpdate'));

    const del = SRC.slice(SRC.indexOf("router.delete('/:id'"));
    expect(del.indexOf('assertBeneficiaryInScope')).toBeGreaterThan(-1);
    expect(del.indexOf('assertBeneficiaryInScope')).toBeLessThan(del.indexOf('findByIdAndDelete'));
  });
});
