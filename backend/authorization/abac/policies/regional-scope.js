/**
 * Policy: regional-scope
 *
 * L3 (branch-level) roles are scoped to their default branch by default.
 * Access to another branch's resource is permitted only when:
 *   - The branch is in `accessibleBranches` (explicit assignment), OR
 *   - The user has an active CrossBranchDelegation (checked by the caller).
 *
 * Complements cross-branch-access: that policy handles L1/L2 bypass;
 * this one enforces the positive scope for L3.
 */

'use strict';

const { ROLES, levelOf } = require('../../../config/constants/roles.constants');

const L3_ROLES = new Set([ROLES.ADMIN, ROLES.MANAGER, ROLES.ACCOUNTANT, ROLES.HR_MANAGER]);

module.exports = {
  id: 'regional-scope',
  description: 'L3 roles are scoped to default branch + accessibleBranches unless delegated.',

  applies({ subject, resource }) {
    if (!subject || !subject.roles || !resource || !resource.branchId) return false;
    return subject.roles.some(r => L3_ROLES.has(r)) && !subject.roles.some(r => levelOf(r) <= 2);
  },

  evaluate({ subject, resource }) {
    const home = String(subject.defaultBranchId || '');
    const accessible = new Set((subject.accessibleBranches || []).map(String));
    const target = String(resource.branchId);

    if (target === home) return { effect: 'permit' };
    if (accessible.has(target)) return { effect: 'permit' };

    // Caller may attach delegations in subject context; if present, accept.
    const delegations = subject.activeDelegations || [];
    if (delegations.some(d => String(d.branchId) === target)) {
      return { effect: 'permit', audit: 'delegated_branch_access' };
    }

    return { effect: 'deny', reason: 'outside_regional_scope' };
  },
};
