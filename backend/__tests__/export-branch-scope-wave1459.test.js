'use strict';

/**
 * W1459 — export tenant-scoping guard.
 *
 * BUG: importExportPro._fetchModuleData ran across ~30 models with NO branch scoping, so
 * a restricted user could export another branch's data (via the `filters` param, or by
 * omitting it → all branches). FIX: scopeQueryToBranch forces the caller's branch on
 * branch-partitioned models (overriding user-supplied branchId); no-op for HQ (null) and
 * global/reference models.
 */

const { scopeQueryToBranch } = require('../utils/exportBranchScope');

const modelWith = field => ({ schema: { path: p => (p === field ? {} : undefined) } });

describe('W1459 scopeQueryToBranch', () => {
  test('forces branchId on a branchId model, OVERRIDING a user-supplied value', () => {
    const q = { status: 'active', branchId: 'OTHER-BRANCH' };
    scopeQueryToBranch(q, modelWith('branchId'), 'B1');
    expect(q.branchId).toBe('B1'); // caller's branch wins
    expect(q.status).toBe('active');
  });

  test('forces branch_id on a snake_case model', () => {
    const q = {};
    scopeQueryToBranch(q, modelWith('branch_id'), 'B2');
    expect(q.branch_id).toBe('B2');
    expect(q.branchId).toBeUndefined();
  });

  test('no-op when branchId is null (HQ / cross-branch caller keeps their filter)', () => {
    const q = { branchId: 'whatever' };
    scopeQueryToBranch(q, modelWith('branchId'), null);
    expect(q.branchId).toBe('whatever');
  });

  test('no-op for a model without a branch field (global/reference data)', () => {
    const q = {};
    scopeQueryToBranch(q, modelWith('name'), 'B1');
    expect(q.branchId).toBeUndefined();
    expect(q.branch_id).toBeUndefined();
  });

  test('safe on missing/invalid inputs', () => {
    expect(() => scopeQueryToBranch({}, null, 'B1')).not.toThrow();
    expect(() => scopeQueryToBranch(null, modelWith('branchId'), 'B1')).not.toThrow();
    expect(() => scopeQueryToBranch({}, {}, 'B1')).not.toThrow();
  });
});
