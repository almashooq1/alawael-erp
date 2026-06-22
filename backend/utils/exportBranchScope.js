'use strict';

/**
 * W1459 — tenant-scope a Mongoose export query to the caller's branch.
 *
 * The bulk-export service (`importExportPro._fetchModuleData`) runs across ~30 models.
 * Exports were NOT branch-scoped, so a restricted user could export another branch's
 * data (via the `filters` param, or by omitting it → all branches). This forces the
 * caller's branch on branch-partitioned models, OVERRIDING any user-supplied branchId.
 *
 * No-op when: branchId is null (HQ / cross-branch caller), the model has no branch field
 * (global/reference data), or inputs are missing. Detects the field via schema
 * introspection (branchId camelCase, else branch_id snake_case).
 *
 * @param {object} mongoQuery - the query object being built (mutated in place)
 * @param {object} Model - a Mongoose model
 * @param {string|null} branchId - the caller's effective branch (null = no constraint)
 * @returns {object} the same mongoQuery
 */
function scopeQueryToBranch(mongoQuery, Model, branchId) {
  if (
    !branchId ||
    !mongoQuery ||
    !Model ||
    !Model.schema ||
    typeof Model.schema.path !== 'function'
  ) {
    return mongoQuery;
  }
  const branchField = Model.schema.path('branchId')
    ? 'branchId'
    : Model.schema.path('branch_id')
      ? 'branch_id'
      : null;
  if (branchField) mongoQuery[branchField] = branchId;
  return mongoQuery;
}

module.exports = { scopeQueryToBranch };
