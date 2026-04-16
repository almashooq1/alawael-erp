/**
 * Policy: approval-authority
 *
 * When a resource is "pending_approval", only the current step's
 * approver may act on it. Used to prevent a user from updating
 * (or approving) a record that is waiting on someone else.
 *
 * The caller may hint the required role via `resource.currentApproverRole`;
 * if present, subject must have that role.
 */

'use strict';

const APPROVAL_SENSITIVE_ACTIONS = new Set(['approve', 'reject', 'update', 'finalize']);

module.exports = {
  id: 'approval-authority',
  description: 'Only the current step approver may act on a pending_approval record.',

  applies({ action, resource }) {
    if (!resource) return false;
    if (!APPROVAL_SENSITIVE_ACTIONS.has(action)) return false;
    return resource.status === 'pending_approval';
  },

  evaluate({ subject, resource }) {
    const required = resource.currentApproverRole;
    if (!required) {
      return { effect: 'deny', reason: 'pending_approval_no_current_approver' };
    }
    const roles = subject.roles || [];
    if (roles.includes(required)) return { effect: 'permit' };
    return {
      effect: 'deny',
      reason: `awaiting_approver_role:${required}`,
    };
  },
};
