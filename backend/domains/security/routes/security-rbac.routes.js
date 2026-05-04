/**
 * Security & RBAC Domain Routes — مسارات API للأمان والصلاحيات
 *
 * الهدف الأمني: واجهة /api/security/rbac موحدة لإدارة الأدوار
 * والصلاحيات وسجل التدقيق — يكمّل middleware/rbac.v2.middleware.js.
 *
 * @module domains/security/routes/security.routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const {
  validateCreateRole,
  validateCreatePermission,
  validateAssignPermission,
  validateCheckPermission,
  validate,
} = require('../validators/security.validator');

let sec;
try {
  sec = require('../index'); // re-exports rbacService facade
} catch (_e) {
  sec = null;
}

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const requireService = (req, res, next) => {
  if (!sec) {
    return res.status(503).json({ success: false, message: 'Security service unavailable' });
  }
  return next();
};

// ═══════════════════════════════════════════════════════════════════════════════
// Roles
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /rbac/roles — قائمة الأدوار */
router.get(
  '/rbac/roles',
  requireService,
  asyncHandler(async (req, res) => {
    const roles = await sec.roles.getAll(req.query);
    res.json({ success: true, data: roles });
  })
);

/** POST /rbac/roles — إنشاء دور */
router.post(
  '/rbac/roles',
  requireService,
  validate(validateCreateRole),
  asyncHandler(async (req, res) => {
    const role = await sec.roles.create(req.body);
    res.status(201).json({ success: true, data: role });
  })
);

/** GET /rbac/roles/hierarchy — تسلسل الأدوار */
router.get(
  '/rbac/roles/hierarchy',
  requireService,
  asyncHandler(async (req, res) => {
    const hierarchy = await sec.roles.getHierarchy();
    res.json({ success: true, data: hierarchy });
  })
);

/** GET /rbac/roles/:id — دور واحد */
router.get(
  '/rbac/roles/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const role = await sec.roles.getById(req.params.id);
    res.json({ success: true, data: role });
  })
);

/** PUT /rbac/roles/:id — تحديث دور */
router.put(
  '/rbac/roles/:id',
  requireService,
  asyncHandler(async (req, res) => {
    const updated = await sec.roles.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  })
);

/** DELETE /rbac/roles/:id — حذف دور */
router.delete(
  '/rbac/roles/:id',
  requireService,
  asyncHandler(async (req, res) => {
    await sec.roles.delete(req.params.id);
    res.json({ success: true, message: 'تم حذف الدور' });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Permissions
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /rbac/permissions — قائمة الصلاحيات */
router.get(
  '/rbac/permissions',
  requireService,
  asyncHandler(async (req, res) => {
    const permissions = await sec.permissions.getAll(req.query);
    res.json({ success: true, data: permissions });
  })
);

/** POST /rbac/permissions — إنشاء صلاحية */
router.post(
  '/rbac/permissions',
  requireService,
  validate(validateCreatePermission),
  asyncHandler(async (req, res) => {
    const permission = await sec.permissions.create(req.body);
    res.status(201).json({ success: true, data: permission });
  })
);

/** POST /rbac/roles/:roleId/permissions — تعيين صلاحية لدور */
router.post(
  '/rbac/roles/:roleId/permissions',
  requireService,
  validate(validateAssignPermission),
  asyncHandler(async (req, res) => {
    const result = await sec.permissions.assignToRole(req.params.roleId, req.body.permissionId);
    res.json({ success: true, data: result });
  })
);

/** DELETE /rbac/roles/:roleId/permissions/:permissionId — سحب صلاحية من دور */
router.delete(
  '/rbac/roles/:roleId/permissions/:permissionId',
  requireService,
  asyncHandler(async (req, res) => {
    const result = await sec.permissions.revokeFromRole(req.params.roleId, req.params.permissionId);
    res.json({ success: true, data: result });
  })
);

/** GET /rbac/users/:userId/permissions — صلاحيات مستخدم */
router.get(
  '/rbac/users/:userId/permissions',
  requireService,
  asyncHandler(async (req, res) => {
    const permissions = await sec.permissions.getUserPermissions(req.params.userId);
    res.json({ success: true, data: permissions });
  })
);

/** POST /rbac/check — التحقق من صلاحية */
router.post(
  '/rbac/check',
  requireService,
  validate(validateCheckPermission),
  asyncHandler(async (req, res) => {
    const { userId, permission, resource } = req.body;
    const allowed = await sec.permissions.checkUserPermission(userId, permission, resource);
    res.json({ success: true, data: { allowed } });
  })
);

// ═══════════════════════════════════════════════════════════════════════════════
// Audit log
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /rbac/audit — سجل أحداث الصلاحيات */
router.get(
  '/rbac/audit',
  requireService,
  asyncHandler(async (req, res) => {
    const events = await sec.audit.getEvents(req.query);
    res.json({ success: true, data: events });
  })
);

/** GET /rbac/audit/user/:userId — سجل أحداث مستخدم */
router.get(
  '/rbac/audit/user/:userId',
  requireService,
  asyncHandler(async (req, res) => {
    const events = await sec.audit.getByUser(req.params.userId, req.query);
    res.json({ success: true, data: events });
  })
);

/** GET /rbac/audit/report — تقرير التدقيق */
router.get(
  '/rbac/audit/report',
  requireService,
  asyncHandler(async (req, res) => {
    const report = await sec.audit.getReport(req.query);
    res.json({ success: true, data: report });
  })
);

module.exports = router;
