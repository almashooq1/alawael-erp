/**
 * authorization.middleware.singleton.js — DEPRECATED PROXY (was Singleton Pattern)
 * ══════════════════════════════════════════════════════════════════════════
 * Delegates to the canonical auth.js middleware.
 * Consumers should migrate to: require('./auth')
 * ══════════════════════════════════════════════════════════════════════════
 */
const auth = require('./auth');
const logger = require('../utils/logger');

const authorize = (...roles) => auth.requireRole(...roles);

const checkOwnership = (paramName = 'id') => (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Authentication required' });
  const role = (req.user.role || '').toLowerCase();
  if (['admin', 'superadmin', 'super_admin'].includes(role)) return next();
  const resourceId = req.params[paramName];
  if (resourceId && req.user.id === resourceId) return next();
  return res.status(403).json({ success: false, message: 'Access denied' });
};

const requirePermission = (...perms) => auth.requirePermission(...perms);

const checkBranch = (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied' });
  const role = (req.user.role || '').toLowerCase();
  if (['admin', 'superadmin', 'super_admin'].includes(role)) return next();
  const branch = req.params.branchId || req.body.branch || req.query.branch;
  if (branch && req.user.branch !== branch) {
    return res.status(403).json({ success: false, message: 'Branch access denied' });
  }
  next();
};

module.exports = {
  authorize,
  checkOwnership,
  requirePermission,
  checkBranch,
  requireRole: auth.requireRole,
  requireAdmin: auth.requireAdmin,
  isAuthenticated: auth.authenticateToken,
};
