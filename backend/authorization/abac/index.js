/**
 * ABAC public API.
 *
 * Import this module for route wiring:
 *   const { pdp, enforce } = require('../authorization/abac');
 */

'use strict';

const { PolicyDecisionPoint, PERMIT, DENY, NOT_APPLICABLE } = require('./policy-decision-point');
const { enforce, subjectFromReq, environmentFromReq } = require('./policy-enforcement-point');
const policies = require('./policies');

const pdp = new PolicyDecisionPoint().registerAll(policies);

/**
 * Wrapped enforce() with the default PDP bound in.
 */
function enforceWithDefault(opts) {
  return enforce({ pdp, ...opts });
}

module.exports = {
  pdp,
  enforce: enforceWithDefault,
  enforceWith: enforce,
  PolicyDecisionPoint,
  subjectFromReq,
  environmentFromReq,
  PERMIT,
  DENY,
  NOT_APPLICABLE,
};
