/**
 * Segregation of Duties (SoD) Registry.
 *
 * Central source of forbidden action-pair combinations on the same
 * resource / transaction. Used by:
 *   - abac/policies/sod-conflict.js (real-time deny)
 *   - authorization/sod/checker.js (pre-action programmatic check)
 *
 * Structure:
 *   { id, description, pair: [actionA, actionB], sameResource, allowEscalation }
 */

'use strict';

const RULES = [
  {
    id: 'sod-invoice-create-approve',
    description: 'Invoice creator cannot approve the same invoice',
    pair: ['invoice.create', 'invoice.approve'],
    sameResource: true,
    allowEscalation: true,
  },
  {
    id: 'sod-invoice-create-issue',
    description: 'Invoice creator cannot issue (ZATCA-submit) the same invoice',
    pair: ['invoice.create', 'invoice.issue'],
    sameResource: true,
    allowEscalation: false,
  },
  {
    id: 'sod-po-draft-approve',
    description: 'PO drafter cannot approve the same PO',
    pair: ['po.draft', 'po.approve'],
    sameResource: true,
    allowEscalation: true,
  },
  {
    id: 'sod-payroll-run-disburse',
    description: 'Payroll runner cannot disburse the same payroll run',
    pair: ['payroll.run', 'payroll.disburse'],
    sameResource: true,
    allowEscalation: false,
  },
  {
    id: 'sod-session-deliver-bill',
    description: 'Therapist who delivered a session cannot bill it',
    pair: ['session.deliver', 'session.bill'],
    sameResource: true,
    allowEscalation: false,
  },
  {
    id: 'sod-irp-author-approve',
    description: 'IRP author cannot approve the same IRP',
    pair: ['irp.author', 'irp.approve'],
    sameResource: true,
    allowEscalation: false,
  },
  {
    id: 'sod-incident-report-close',
    description: 'Incident reporter cannot close the same incident',
    pair: ['incident.report', 'incident.close'],
    sameResource: true,
    allowEscalation: true,
  },
  {
    id: 'sod-contract-draft-approve',
    description: 'Contract drafter cannot approve the same contract',
    pair: ['contract.draft', 'contract.approve'],
    sameResource: true,
    allowEscalation: true,
  },
  {
    id: 'sod-recruit-hire',
    description: 'Recruiter cannot approve onboarding of the same hire',
    pair: ['recruitment.interview', 'onboarding.approve'],
    sameResource: true,
    allowEscalation: false,
  },
  {
    id: 'sod-procurement-receive',
    description: 'Procurement officer cannot confirm goods receipt for their PO',
    pair: ['procurement.draft', 'goods.receive'],
    sameResource: true,
    allowEscalation: false,
  },
  {
    id: 'sod-audit-read-write',
    description: 'Audit log readers cannot write audit log entries',
    pair: ['audit.write', 'audit.read'],
    sameResource: false,
    allowEscalation: false,
  },
];

/**
 * Is there an SoD rule that forbids `currentAction` given `priorActions`?
 *
 * @param {string} currentAction
 * @param {string[]} priorActions
 * @returns {{ rule: object, conflictingWith: string } | null}
 */
function findConflict(currentAction, priorActions = []) {
  const prior = new Set(priorActions);
  for (const rule of RULES) {
    const [a, b] = rule.pair;
    if (currentAction === a && prior.has(b)) return { rule, conflictingWith: b };
    if (currentAction === b && prior.has(a)) return { rule, conflictingWith: a };
  }
  return null;
}

/** Return all rules touching a given action (for UI/admin listing). */
function rulesInvolving(action) {
  return RULES.filter(r => r.pair.includes(action));
}

function allRules() {
  return RULES.map(r => ({ ...r }));
}

module.exports = { RULES, findConflict, rulesInvolving, allRules };
