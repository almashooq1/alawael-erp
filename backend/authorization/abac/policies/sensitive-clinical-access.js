/**
 * Policy: sensitive-clinical-access
 *
 * Resources flagged confidentialityLevel === 'sensitive' require:
 *   - MFA-verified session
 *   - non-BYOD device OR emergency override
 *
 * Applies on top of other checks — deny-overrides combination.
 */

'use strict';

module.exports = {
  id: 'sensitive-clinical-access',
  description: 'Sensitive clinical records require MFA + trusted device.',

  applies({ resource }) {
    return resource && resource.confidentialityLevel === 'sensitive';
  },

  evaluate({ subject, env }) {
    if (!subject.mfaVerified) {
      return { effect: 'deny', reason: 'mfa_required_for_sensitive' };
    }
    const trusted = env.deviceTrust === 'corp-managed';
    const emergency = env.emergencyFlag === true;
    if (!trusted && !emergency) {
      return { effect: 'deny', reason: 'trusted_device_required_for_sensitive' };
    }
    return { effect: 'permit', audit: 'sensitive_access' };
  },
};
