/**
 * Registry of built-in ABAC policies.
 *
 * Order does not matter — PDP applies deny-overrides.
 *
 * See blueprint/05-role-matrix.md §4 for the source of truth.
 */

'use strict';

module.exports = [
  require('./caseload-access'),
  require('./cross-branch-access'),
  require('./guardian-own-child'),
  require('./session-amendment-window'),
  require('./sensitive-clinical-access'),
  require('./record-ownership'),
  require('./regional-scope'),
  require('./confidentiality-level'),
  require('./approval-authority'),
  require('./break-glass-active'),
  require('./sod-conflict'),
];
