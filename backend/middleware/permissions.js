/**
 * permissions.js — Compatibility Proxy
 * ══════════════════════════════════════════════════════════════════════════
 * DEPRECATED: Delegates to the canonical auth.js middleware.
 * Consumers should migrate to:
 *   const { requirePermission, requireRole } = require('./auth');
 * ══════════════════════════════════════════════════════════════════════════
 */

const auth = require('./auth');

module.exports = {
  checkPermission: auth.requirePermission,
  checkRole: auth.requireRole,
};
