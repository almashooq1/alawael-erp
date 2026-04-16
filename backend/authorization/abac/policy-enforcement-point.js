/**
 * ABAC Policy Enforcement Point (PEP).
 *
 * Express middleware that consults the PDP and either:
 *   - allows the request (attaches decision + audit tags), or
 *   - rejects with 403 (audit-logged).
 */

'use strict';

const { PERMIT, DENY, NOT_APPLICABLE } = require('./policy-decision-point');

/**
 * Build a subject object from req.user.
 * Defensive against legacy/partial shapes.
 */
function subjectFromReq(req) {
  const u = req.user || {};
  const roles = Array.isArray(u.roles)
    ? u.roles
    : (u.role ? [u.role] : []);
  return {
    userId: u.id || u._id || u.userId,
    roles,
    defaultBranchId: u.defaultBranchId || u.branchId,
    accessibleBranches: u.accessibleBranches || [],
    department: u.department,
    mfaVerified: !!u.mfaVerified,
    linkedBeneficiaries: u.linkedBeneficiaries || [],
  };
}

function environmentFromReq(req) {
  return {
    time: new Date(),
    ip: req.ip,
    deviceTrust: req.get('X-Device-Trust') || 'unknown',
    emergencyFlag: req.get('X-Emergency-Access') === 'true',
  };
}

/**
 * @param {Object} opts
 * @param {object} opts.pdp - PolicyDecisionPoint instance
 * @param {string} opts.action - action name (read/update/...)
 * @param {string} opts.resourceType - type name for the resource
 * @param {Function} [opts.resourceLoader] - async (req) => resource object
 * @param {Function} [opts.resourceFromReq] - sync (req) => minimal resource (for creates)
 * @param {'allow'|'deny'} [opts.onNotApplicable='allow'] - fall-through default
 */
function enforce({
  pdp,
  action,
  resourceType,
  resourceLoader,
  resourceFromReq,
  onNotApplicable = 'allow',
}) {
  if (!pdp) throw new Error('ABAC PEP requires a pdp instance');
  if (!action) throw new Error('ABAC PEP requires an action');
  if (!resourceType) throw new Error('ABAC PEP requires resourceType');

  return async function abacEnforce(req, res, next) {
    try {
      let resource;
      if (resourceLoader) {
        resource = await resourceLoader(req);
        if (!resource) return res.status(404).json({ error: 'resource_not_found' });
      } else if (resourceFromReq) {
        resource = resourceFromReq(req);
      } else {
        resource = { type: resourceType };
      }
      if (!resource.type) resource.type = resourceType;

      const subject = subjectFromReq(req);
      const env = environmentFromReq(req);
      const decision = pdp.evaluate({ subject, action, resource, env });

      req.abacDecision = decision;
      req.abacResource = resource;

      if (decision.effect === PERMIT) return next();
      if (decision.effect === DENY) {
        return res.status(403).json({
          error: 'forbidden',
          reason: decision.reason,
          policy: decision.denyingPolicy,
        });
      }
      // NOT_APPLICABLE
      if (onNotApplicable === 'deny') {
        return res.status(403).json({ error: 'forbidden', reason: 'no_applicable_policy' });
      }
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { enforce, subjectFromReq, environmentFromReq };
