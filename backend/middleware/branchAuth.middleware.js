/**
 * Branch Auth Middleware - وسيط صلاحيات الفروع
 * Enforces granular RBAC per branch per module per action
 */
const {
  hasPermission,
  MODULES,
  ACTIONS,
  createAuditEntry,
} = require('../services/branchPermission.service');

// ─── Main Permission Guard ────────────────────────────────────────────────────
/**
 * requireBranchPermission(module, action)
 * Usage: router.get('/patients', requireBranchPermission('patients','read'), handler)
 */
function requireBranchPermission(module, action = ACTIONS.READ) {
  return async (req, res, next) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      // Get target branch from params or query
      const targetBranchCode =
        req.params.branch_code ||
        req.params.branchCode ||
        req.query.branch_code ||
        req.body?.branch_code ||
        user.branch_code;

      if (!targetBranchCode) {
        return res.status(400).json({ success: false, message: 'Branch code is required' });
      }

      // Attach IP for audit
      user._ip = req.ip || req.headers['x-forwarded-for'];

      const { allowed, reason } = hasPermission(
        user,
        targetBranchCode.toUpperCase(),
        module,
        action
      );

      // Create audit entry (async, don't await)
      const auditEntry = createAuditEntry(user, targetBranchCode, module, action, allowed, reason);
      saveAuditLog(auditEntry).catch(() => {}); // fire-and-forget

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
          reason,
          required: { module, action, branch: targetBranchCode },
        });
      }

      // Attach context to request
      req.branchCode = targetBranchCode.toUpperCase();
      req.branchPermission = { module, action, allowed: true };
      next();
    } catch (err) {
      next(err);
    }
  };
}

// ─── HQ Only Guard ───────────────────────────────────────────────────────────
function requireHQAccess(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

  const hqRoles = ['hq_super_admin', 'hq_admin'];
  if (!hqRoles.includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'HQ access required',
      userRole: user.role,
    });
  }
  next();
}

// ─── Super Admin Only Guard ───────────────────────────────────────────────────
function requireSuperAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

  if (user.role !== 'hq_super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Super Admin access required',
    });
  }
  next();
}

// ─── Own Branch Guard ─────────────────────────────────────────────────────────
/**
 * Ensures user can only access their own branch data
 * HQ users bypass this check
 */
function requireOwnBranch(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

  const hqRoles = ['hq_super_admin', 'hq_admin'];
  if (hqRoles.includes(user.role)) return next(); // HQ bypasses

  const targetBranchCode = req.params.branch_code || req.params.branchCode || req.query.branch_code;

  if (targetBranchCode && targetBranchCode.toUpperCase() !== user.branch_code) {
    return res.status(403).json({
      success: false,
      message: 'You can only access your own branch',
      yourBranch: user.branch_code,
      requested: targetBranchCode,
    });
  }
  next();
}

// ─── Audit Log Saver ─────────────────────────────────────────────────────────
async function saveAuditLog(entry) {
  try {
    // Try to save to MongoDB
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 1) return;

    const BranchAuditLog = require('../models/BranchAuditLog');
    await BranchAuditLog.create(entry);
  } catch {
    // Silent fail - don't break requests due to audit log issues
  }
}

module.exports = {
  requireBranchPermission,
  requireHQAccess,
  requireSuperAdmin,
  requireOwnBranch,
};
