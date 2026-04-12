/**
 * Consolidated RBAC & Authorization Domain — نطاق الصلاحيات والتفويض
 * ══════════════════════════════════════════════════════════════════════════
 * Facade over RBAC services. Consolidates 5 fragmented files (~3,300 lines).
 *
 * Replaces: rbacService, rbacManager.service, rbac-policy-engine,
 *   rbac-auditing.service, advanced-rbac.system
 *
 * The canonical middleware for request-level RBAC is:
 *   backend/middleware/rbac.v2.middleware.js
 *
 * @module domains/security/services/rbacService
 * @version 3.0.0
 */

const logger = require('../../../utils/logger');

// ── Lazy-load delegates (pick one canonical impl per function) ──────────

let _rbacManager, _rbacAudit;

function rbacManager() {
  if (!_rbacManager) {
    try {
      _rbacManager = require('../../../services/rbacManager.service');
    } catch {
      _rbacManager = {};
    }
  }
  return _rbacManager;
}

function rbacAudit() {
  if (!_rbacAudit) {
    try {
      _rbacAudit = require('../../../services/rbac-auditing.service');
    } catch {
      _rbacAudit = {};
    }
  }
  return _rbacAudit;
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. ROLE MANAGEMENT — إدارة الأدوار
// ═══════════════════════════════════════════════════════════════════════════

const roles = {
  create: (...args) => rbacManager().createRole?.(...args),
  getAll: (...args) => rbacManager().getRoles?.(...args),
  getById: (...args) => rbacManager().getRoleById?.(...args),
  update: (...args) => rbacManager().updateRole?.(...args),
  delete: (...args) => rbacManager().deleteRole?.(...args),
  getHierarchy: (...args) => rbacManager().getRoleHierarchy?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. PERMISSION MANAGEMENT — إدارة الصلاحيات
// ═══════════════════════════════════════════════════════════════════════════

const permissions = {
  create: (...args) => rbacManager().createPermission?.(...args),
  getAll: (...args) => rbacManager().getPermissions?.(...args),
  assignToRole: (...args) => rbacManager().assignPermissionToRole?.(...args),
  revokeFromRole: (...args) => rbacManager().revokePermissionFromRole?.(...args),
  checkUserPermission: (...args) => rbacManager().checkPermission?.(...args),
  getUserPermissions: (...args) => rbacManager().getUserPermissions?.(...args),
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. AUDIT — سجل التدقيق
// ═══════════════════════════════════════════════════════════════════════════

const audit = {
  log: (...args) => rbacAudit().logAuditEvent?.(...args),
  getEvents: (...args) => rbacAudit().getAuditEvents?.(...args),
  getByUser: (...args) => rbacAudit().getAuditEventsByUser?.(...args),
  getReport: (...args) => rbacAudit().getAuditReport?.(...args),
};

module.exports = {
  roles,
  permissions,
  audit,
  // Flat backward-compatible aliases
  createRole: roles.create,
  getRoles: roles.getAll,
  getRoleById: roles.getById,
  updateRole: roles.update,
  deleteRole: roles.delete,
  createPermission: permissions.create,
  getPermissions: permissions.getAll,
  assignPermissionToRole: permissions.assignToRole,
  checkPermission: permissions.checkUserPermission,
  getUserPermissions: permissions.getUserPermissions,
  logAuditEvent: audit.log,
  getAuditEvents: audit.getEvents,
};
