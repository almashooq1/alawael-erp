/**
 * @deprecated — Merged into urlValidator.js (Round Refactor-1).
 * Re-exports validateOutboundUrlSync as the default validateOutboundUrl
 * so callers expecting a synchronous result continue to work.
 *
 * Migrate imports to:
 *   const { validateOutboundUrlSync } = require('../utils/urlValidator');
 */

const { validateOutboundUrlSync, isPrivateIP } = require('./urlValidator');

// Preserve the original synchronous API surface
module.exports = { validateOutboundUrl: validateOutboundUrlSync, isBlockedIP: isPrivateIP };
