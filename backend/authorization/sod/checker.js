/**
 * SoD Checker — programmatic helper for the service layer.
 *
 * Usage:
 *   const prior = await AuditLog.find({ actorId: user.id, resourceId, resourceType }).distinct('action');
 *   sodChecker.check('invoice.approve', prior);  // throws if conflict
 */

'use strict';

const { findConflict } = require('./registry');

class SodViolationError extends Error {
  constructor(rule, conflictingWith) {
    super(
      `SoD violation: cannot ${rule.pair.join(' & ')} by same user on same resource (${rule.id})`
    );
    this.name = 'SodViolationError';
    this.code = 'SOD_VIOLATION';
    this.ruleId = rule.id;
    this.conflictingWith = conflictingWith;
    this.allowEscalation = !!rule.allowEscalation;
  }
}

/**
 * Throws SodViolationError on conflict. Returns the rule + conflict otherwise null.
 */
function check(currentAction, priorActions) {
  const conflict = findConflict(currentAction, priorActions);
  if (!conflict) return null;
  throw new SodViolationError(conflict.rule, conflict.conflictingWith);
}

/**
 * Non-throwing variant — returns { ok, rule? }.
 */
function assess(currentAction, priorActions) {
  const c = findConflict(currentAction, priorActions);
  if (!c) return { ok: true };
  return {
    ok: false,
    rule: c.rule,
    conflictingWith: c.conflictingWith,
    allowEscalation: !!c.rule.allowEscalation,
  };
}

module.exports = { check, assess, SodViolationError };
