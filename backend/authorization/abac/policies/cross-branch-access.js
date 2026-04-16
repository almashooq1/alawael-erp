/**
 * Policy: cross-branch-access
 *
 * Users whose role is not in CROSS_BRANCH_ROLES cannot access resources
 * in branches other than their accessibleBranches.
 *
 * L1/L2 roles are permitted cross-branch (and this policy attaches an
 * audit note so the PEP can record it).
 */

'use strict';

const { CROSS_BRANCH_ROLES } = require('../../../config/constants');

module.exports = {
  id: 'cross-branch-access',
  description: 'Restrict access to resources by branch; L1/L2 roles may cross branches (audited).',

  applies({ subject, resource }) {
    if (!subject || !resource) return false;
    if (!resource.branchId) return false;
    return true;
  },

  evaluate({ subject, resource }) {
    const userBranches = new Set([
      subject.defaultBranchId,
      ...(subject.accessibleBranches || []),
    ].filter(Boolean).map(String));

    const targetBranch = String(resource.branchId);

    if (userBranches.has(targetBranch)) {
      return { effect: 'permit' };
    }

    const isCrossBranchRole = (subject.roles || []).some(r => CROSS_BRANCH_ROLES.includes(r));
    if (isCrossBranchRole) {
      return { effect: 'permit', audit: 'cross_branch_access' };
    }

    return { effect: 'deny', reason: 'branch_isolation' };
  },
};
