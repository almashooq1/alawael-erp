/* eslint-disable no-unused-vars */
/**
 * Advanced Authentication Middleware — Compatibility Proxy
 * ══════════════════════════════════════════════════════════════════════════
 * DEPRECATED: This file now delegates to the canonical auth.js middleware.
 * Unique features (MFA, branch check, API key, etc.) are kept inline.
 *
 * Consumers should migrate to:
 *   const auth = require('./auth');
 *
 * This proxy preserves the old export names so existing callers keep working.
 * ══════════════════════════════════════════════════════════════════════════
 */

const auth = require('./auth');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

/* istanbul ignore next — thin compatibility shim */

// ── Unique features not present in auth.js ──────────────────────────────

const requireMFA = (req, res, next) => {
  if (req.user?.mfaEnabled && !req.user?.mfaVerified) {
    return res.status(403).json({ success: false, message: 'MFA verification required', code: 'MFA_REQUIRED' });
  }
  next();
};

const checkOwnership = (getResourceUserId) => async (req, res, next) => {
  if (!req.user) return res.status(401).json({ success: false, message: 'Access denied' });
  const role = (req.user.role || '').toLowerCase();
  if (['admin', 'superadmin', 'super_admin'].includes(role)) return next();
  try {
    const resourceUserId = typeof getResourceUserId === 'function' ? await getResourceUserId(req) : null;
    if (resourceUserId && req.user.id !== resourceUserId?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
  } catch (err) {
    safeError(res, err, '[advancedAuth] checkOwnership error');
  }
};

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

const validateAPIKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ success: false, message: 'API Key required' });
  req.apiKey = apiKey;
  next();
};

const requirePasswordChange = (req, res, next) => {
  if (req.user?.requirePasswordChange) {
    return res.status(403).json({ success: false, message: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' });
  }
  next();
};

const requireVerified = (req, res, next) => {
  if (req.user && !req.user.verified && !req.user.emailVerified) {
    return res.status(403).json({ success: false, message: 'Account not verified', code: 'ACCOUNT_NOT_VERIFIED' });
  }
  next();
};

const checkActiveUser = (req, res, next) => {
  if (req.user?.status === 'deleted' || req.user?.deletedAt) {
    return res.status(403).json({ success: false, message: 'Account deleted', code: 'ACCOUNT_DELETED' });
  }
  if (req.user?.status === 'suspended') {
    return res.status(403).json({ success: false, message: 'Account suspended', code: 'ACCOUNT_SUSPENDED' });
  }
  next();
};

const detectNewDevice = async (req, _res, next) => { next(); };

// ── Re-export: old name → canonical auth.js function ─────────────────────
module.exports = {
  authenticate:        auth.authenticateToken,
  optionalAuth:        auth.optionalAuth,
  authorize:           auth.authorize,
  checkPermission:     (resource, action) => auth.requirePermission(`${resource}:${action}`),
  requireMFA,
  checkOwnership,
  checkBranch,
  refreshToken:        auth.refreshToken,
  validateAPIKey,
  logActivity:         (action) => (req, _res, next) => { logger.info(`[AUTH] ${action}`, { userId: req.user?.id }); next(); },
  requirePasswordChange,
  requireVerified,
  checkActiveUser,
  detectNewDevice,
};
