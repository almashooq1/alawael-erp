/**
 * RBAC Admin API — إدارة الأدوار والصلاحيات (config-based)
 *
 * Light-weight endpoints that read from the unified rbac.config.js
 * and manage per-user overrides (customPermissions / deniedPermissions).
 *
 * Endpoints:
 *   GET    /api/v1/rbac/roles                 — list all roles
 *   GET    /api/v1/rbac/roles/:role           — role detail + permissions
 *   GET    /api/v1/rbac/permissions            — all resources & actions
 *   GET    /api/v1/rbac/users/:id/permissions  — user effective permissions
 *   PUT    /api/v1/rbac/users/:id/role         — change user role
 *   PUT    /api/v1/rbac/users/:id/permissions  — set custom/denied overrides
 *
 * @module routes/rbac.admin
 */

const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth.middleware');
const {
  requirePermission,
  ROLES,
  RESOURCES,
  ACTIONS,
} = require('../middleware/rbac.v2.middleware');
const {
  ALL_ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  flattenPermissions,
  resolvePermissions,
  getRoleLabel,
  getRoleLevel,
} = require('../config/rbac.config');
const User = require('../models/User');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticateToken);

// ─────────────────────────────────────────────────────────────────────────
// GET /roles — جميع الأدوار مع المستويات والتسميات
// ─────────────────────────────────────────────────────────────────────────

router.get('/roles', (req, res) => {
  const roles = ALL_ROLES.map(role => {
    const h = ROLE_HIERARCHY[role] || {};
    return {
      value: role,
      label: h.label || role,
      labelEn: h.labelEn || role,
      level: h.level ?? 0,
      inherits: h.inherits || [],
    };
  }).sort((a, b) => b.level - a.level);

  res.json({ success: true, data: roles });
});

// ─────────────────────────────────────────────────────────────────────────
// GET /roles/:role — تفاصيل دور واحد مع صلاحياته الفعلية
// ─────────────────────────────────────────────────────────────────────────

router.get('/roles/:role', (req, res) => {
  const { role } = req.params;
  if (!ALL_ROLES.includes(role)) {
    return res.status(404).json({ success: false, error: 'الدور غير موجود' });
  }

  const h = ROLE_HIERARCHY[role] || {};
  const permissions = resolvePermissions(role);
  const flat = flattenPermissions(role);

  res.json({
    success: true,
    data: {
      value: role,
      label: h.label || role,
      labelEn: h.labelEn || role,
      level: h.level ?? 0,
      inherits: h.inherits || [],
      permissions, // { resource: [actions] }
      flatPermissions: flat, // ["resource:action", ...]
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// GET /permissions — جميع الموارد والإجراءات المتاحة
// ─────────────────────────────────────────────────────────────────────────

router.get('/permissions', (req, res) => {
  const resources = Object.entries(RESOURCES).map(([key, value]) => ({ key, value }));
  const actions = Object.entries(ACTIONS).map(([key, value]) => ({ key, value }));

  res.json({ success: true, data: { resources, actions } });
});

// ─────────────────────────────────────────────────────────────────────────
// GET /users/:id/permissions — صلاحيات مستخدم معين
// ─────────────────────────────────────────────────────────────────────────

router.get(
  '/users/:id/permissions',
  requirePermission(RESOURCES.USERS, ACTIONS.READ),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id).select(
        'fullName email role customPermissions deniedPermissions'
      );
      if (!user) {
        return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      }

      const effective = flattenPermissions(
        user.role,
        user.customPermissions || [],
        user.deniedPermissions || []
      );

      res.json({
        success: true,
        data: {
          id: user._id,
          name: user.fullName,
          email: user.email,
          role: user.role,
          roleLabel: getRoleLabel(user.role, 'ar'),
          roleLabelEn: getRoleLabel(user.role, 'en'),
          roleLevel: getRoleLevel(user.role),
          customPermissions: user.customPermissions || [],
          deniedPermissions: user.deniedPermissions || [],
          effectivePermissions: effective,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// PUT /users/:id/role — تغيير دور المستخدم (admin+ فقط)
// ─────────────────────────────────────────────────────────────────────────

router.put(
  '/users/:id/role',
  requirePermission(RESOURCES.USERS, ACTIONS.MANAGE),
  [
    param('id').isMongoId().withMessage('معرف المستخدم غير صالح'),
    body('role').isIn(ALL_ROLES).withMessage('الدور غير صالح'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { role } = req.body;
      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      }

      // Prevent assigning a role higher than your own
      const requestorLevel = getRoleLevel(req.user.role);
      const targetLevel = getRoleLevel(role);
      if (targetLevel > requestorLevel) {
        return res.status(403).json({
          success: false,
          error: 'لا يمكنك منح دور بمستوى أعلى من مستواك',
        });
      }

      const oldRole = targetUser.role;
      targetUser.role = role;
      await targetUser.save({ validateBeforeSave: false });

      logger.info(
        `[RBAC] Role changed: ${targetUser.email} ${oldRole} → ${role} by ${req.user.email}`
      );

      res.json({
        success: true,
        message: 'تم تحديث الدور بنجاح',
        data: {
          id: targetUser._id,
          email: targetUser.email,
          role: targetUser.role,
          roleLabel: getRoleLabel(role, 'ar'),
          roleLabelEn: getRoleLabel(role, 'en'),
          roleLevel: getRoleLevel(role),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────
// PUT /users/:id/permissions — تعيين صلاحيات مخصصة / محجوبة
// ─────────────────────────────────────────────────────────────────────────

router.put(
  '/users/:id/permissions',
  requirePermission(RESOURCES.USERS, ACTIONS.MANAGE),
  [
    param('id').isMongoId().withMessage('معرف المستخدم غير صالح'),
    body('customPermissions')
      .optional()
      .isArray()
      .withMessage('customPermissions must be an array'),
    body('deniedPermissions')
      .optional()
      .isArray()
      .withMessage('deniedPermissions must be an array'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const targetUser = await User.findById(req.params.id);
      if (!targetUser) {
        return res.status(404).json({ success: false, error: 'المستخدم غير موجود' });
      }

      if (req.body.customPermissions !== undefined) {
        targetUser.customPermissions = req.body.customPermissions;
      }
      if (req.body.deniedPermissions !== undefined) {
        targetUser.deniedPermissions = req.body.deniedPermissions;
      }

      await targetUser.save({ validateBeforeSave: false });

      const effective = flattenPermissions(
        targetUser.role,
        targetUser.customPermissions || [],
        targetUser.deniedPermissions || []
      );

      logger.info(`[RBAC] Permissions updated for ${targetUser.email} by ${req.user.email}`);

      res.json({
        success: true,
        message: 'تم تحديث الصلاحيات بنجاح',
        data: {
          id: targetUser._id,
          role: targetUser.role,
          customPermissions: targetUser.customPermissions,
          deniedPermissions: targetUser.deniedPermissions,
          effectivePermissions: effective,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
