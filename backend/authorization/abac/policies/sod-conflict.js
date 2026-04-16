/**
 * Policy: sod-conflict
 *
 * Segregation of Duties — deny if the subject has previously performed
 * a conflicting action on the same transaction / resource, per the
 * `sodRegistry` passed in `env.sod`.
 *
 * The caller loads prior actions by the user on the resource and
 * attaches them to `env.sod.priorActions`. The registry declares
 * forbidden pairs.
 *
 * Kept deliberately simple — the heavy lifting is in the registry.
 */

'use strict';

/**
 * Built-in forbidden action pairs on the same resource:
 * if the subject did action A, they cannot do action B (or vice versa).
 */
const BUILT_IN_PAIRS = [
  ['invoice.create', 'invoice.approve'],
  ['invoice.create', 'invoice.issue'],
  ['po.draft', 'po.approve'],
  ['payroll.run', 'payroll.disburse'],
  ['session.deliver', 'session.bill'],
  ['irp.author', 'irp.approve'],
  ['incident.report', 'incident.close'],
  ['contract.draft', 'contract.approve'],
  ['recruitment.interview', 'onboarding.approve'],
  ['procurement.draft', 'goods.receive'],
];

function conflictsWith(action, priorActions, extraPairs = []) {
  const pairs = [...BUILT_IN_PAIRS, ...extraPairs];
  const prior = new Set(priorActions || []);
  for (const [a, b] of pairs) {
    if (action === a && prior.has(b)) return b;
    if (action === b && prior.has(a)) return a;
  }
  return null;
}

module.exports = {
  id: 'sod-conflict',
  description:
    'Block actions that conflict with duties previously performed by the same user on this resource.',

  applies({ env, action }) {
    return !!(env && env.sod && action);
  },

  evaluate({ env, action }) {
    const conflict = conflictsWith(action, env.sod.priorActions, env.sod.extraPairs);
    if (conflict) {
      return { effect: 'deny', reason: `sod_conflict_with:${conflict}` };
    }
    return { effect: 'not_applicable' };
  },

  // Exported for unit testing and for programmatic checks elsewhere.
  __test__: { conflictsWith, BUILT_IN_PAIRS },
};
