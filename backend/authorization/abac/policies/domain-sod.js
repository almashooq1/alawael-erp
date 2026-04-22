/**
 * Policy: domain-sod
 *
 * Phase-7 domain-level Segregation of Duties. Distinct from the
 * existing `sod-conflict` policy: that one denies based on PRIOR
 * actions by the same user on the same resource (transactional SoD).
 * This one denies based on ROLE alone — certain roles must never
 * perform certain actions regardless of whether they touched the
 * record before (regulatory separation).
 *
 * Rules and matching live in `authorization/sod/domain-rules.js`.
 * This policy is a thin PDP adapter so the rules are evaluated
 * during normal request processing.
 *
 * Subject shape expected:
 *   { role: string, ... }   ← single role, normalized lowercase
 *
 * Action shape expected:
 *   `${resource}:${verb}` — same form as the rest of the codebase.
 *
 * Compliance hooks:
 *   • CBAHI 4.3 (HR↔Finance separation)
 *   • CBAHI 8.7 (Clinical billing independence)
 *   • SAMA pre-pay control
 *   • PDPL data minimization (clinical data limited to clinical
 *     roles)
 *   • Saudi Labor Law dual-control on payroll / employee records
 */

'use strict';

const { checkDomainSoD } = require('../../sod/domain-rules');

module.exports = {
  id: 'domain-sod',
  description:
    'Block actions that violate static domain-SoD rules ' +
    '(HR↔Finance, Clinical↔Finance, Quality independence, ' +
    'IT-admin↔audit, internal_auditor read-only, ops↔PHI).',

  applies({ subject, action }) {
    // Need a role and a `resource:verb` action to evaluate.
    return !!(subject && subject.role && typeof action === 'string' && action.includes(':'));
  },

  evaluate({ subject, action }) {
    const role = String(subject.role).toLowerCase();
    const conflict = checkDomainSoD(role, action);
    if (conflict) {
      return {
        effect: 'deny',
        reason: `domain_sod:${conflict.rule.id}`,
        // Surface metadata so audit logs can show the human-readable
        // explanation without re-loading the rule catalog.
        meta: {
          ruleId: conflict.rule.id,
          severity: conflict.rule.severity,
          description: conflict.rule.description,
        },
      };
    }
    return { effect: 'not_applicable' };
  },
};
