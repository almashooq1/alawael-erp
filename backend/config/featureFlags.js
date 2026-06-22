/**
 * Feature flags for runtime toggling of behavior changes.
 *
 * Flags are read from environment variables. The default is enabled so that
 * new deployments get the fix immediately; set the env var to "false" to
 * disable in an emergency without redeploying.
 *
 * Usage:
 *   const { isFeatureEnabled } = require('../config/featureFlags');
 *   if (isFeatureEnabled('w1437')) { ... }
 *
 * Env vars:
 *   FEATURE_W1437=true|false   — master switch for all W1437 DB-timeout fixes
 */

'use strict';

const FLAGS = {
  w1437: {
    env: 'FEATURE_W1437',
    default: true,
    description: 'W1437 production DB timeout fixes (AdvancedTicket $in, NphiesClaim updatedAt)',
  },
};

function isFeatureEnabled(name) {
  const flag = FLAGS[name];
  if (!flag) {
    return false;
  }
  const raw = process.env[flag.env];
  if (raw === undefined) {
    return flag.default;
  }
  return !['false', '0', 'off', 'no'].includes(String(raw).toLowerCase());
}

function listFlags() {
  return Object.entries(FLAGS).map(([name, meta]) => ({
    name,
    enabled: isFeatureEnabled(name),
    ...meta,
  }));
}

module.exports = { isFeatureEnabled, listFlags };
