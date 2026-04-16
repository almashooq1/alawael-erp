/**
 * Policy: confidentiality-level
 *
 * Additional guard on records with `confidentialityLevel`:
 *   - `normal`    — no additional constraint (handled by other policies)
 *   - `sensitive` — (already handled by sensitive-clinical-access)
 *   - `restricted` — writes require an active DPO-approved override
 *
 * The `env.dpoOverride` flag is set by a dedicated DPO approval flow;
 * without it, writes on restricted records are denied.
 */

'use strict';

module.exports = {
  id: 'confidentiality-level',
  description: 'Writes to `restricted` records require a valid DPO override.',

  applies({ action, resource }) {
    if (!resource || resource.confidentialityLevel !== 'restricted') return false;
    return ['create', 'update', 'delete', 'export'].includes(action);
  },

  evaluate({ env }) {
    if (env && env.dpoOverride === true) {
      return { effect: 'permit', audit: 'dpo_override_used' };
    }
    return { effect: 'deny', reason: 'restricted_requires_dpo_override' };
  },
};
