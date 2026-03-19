// RBAC (Role-Based Access Control) Routes
// نقاط التحكم بالوصول بناءً على الأدوار

const express = require('express');
const router = express.Router();
const RBACService = require('../services/rbacService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

// الحصول على جميع الأدوار
router.get('/roles', (req, res, next) => {
  try {
    const result = RBACService.getAllRoles();

    return res.status(200).json(new ApiResponse(200, result, 'Roles fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch roles', [error.message]));
  }
});

// الحصول على تفاصيل الدور
router.get('/roles/:roleId', (req, res, next) => {
  try {
    const { roleId } = req.params;

    const result = RBACService.getRoleDetails(roleId);

    if (!result.success) {
      return res.status(404).json(new ApiResponse(404, {}, 'Role not found'));
    }

    return res.status(200).json(new ApiResponse(200, result, 'Role details fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch role details', [error.message]));
  }
});

// إنشاء دور جديد
router.post('/roles', (req, res, next) => {
  try {
    const { id, name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json(new ApiResponse(400, {}, 'Role name required'));
    }

    const result = RBACService.createRole({
      id,
      name,
      description,
      permissions,
    });

    return res.status(201).json(new ApiResponse(201, result, 'Role created'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to create role', [error.message]));
  }
});

// تحديث الدور
router.put('/roles/:roleId', (req, res, next) => {
  try {
    const { roleId } = req.params;
    const updates = req.body;

    const result = RBACService.updateRole(roleId, updates);

    if (!result.success) {
      return res.status(404).json(new ApiResponse(404, {}, 'Role not found'));
    }

    return res.status(200).json(new ApiResponse(200, result, 'Role updated'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to update role', [error.message]));
  }
});

// حذف الدور
router.delete('/roles/:roleId', (req, res, next) => {
  try {
    const { roleId } = req.params;

    const result = RBACService.deleteRole(roleId);

    if (!result.success) {
      return next(new ApiError(400, result.message || 'Failed to delete role', [result.error]));
    }

    return res.status(200).json(new ApiResponse(200, result, 'Role deleted'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to delete role', [error.message]));
  }
});

// الحصول على الصلاحيات المتاحة
router.get('/permissions', (req, res, next) => {
  try {
    const result = RBACService.getAvailablePermissions();

    return res.status(200).json(new ApiResponse(200, result, 'Permissions fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch permissions', [error.message]));
  }
});

// التحقق من الصلاحية
router.post('/check-permission', (req, res, next) => {
  try {
    const { userRole, requiredPermission } = req.body;

    if (!userRole || !requiredPermission) {
      return next(new ApiError(400, 'User role and required permission are required'));
    }

    const hasPermission = RBACService.hasPermission(userRole, requiredPermission);

    const response = {
      userRole,
      requiredPermission,
      hasPermission,
      timestamp: new Date().toISOString(),
    };

    return res.status(200).json(new ApiResponse(200, response, 'Permission check completed'));
  } catch (error) {
    return next(new ApiError(500, 'Permission check failed', [error.message]));
  }
});

// إضافة صلاحية للدور
router.post('/roles/:roleId/permissions', (req, res, next) => {
  try {
    const { roleId } = req.params;
    const { permission } = req.body;

    if (!permission) {
      return next(new ApiError(400, 'Permission required'));
    }

    const result = RBACService.addPermissionToRole(roleId, permission);

    if (!result.success) {
      return next(new ApiError(404, result.message || 'Role not found', [result.error]));
    }

    return res.status(200).json(new ApiResponse(200, result, 'Permission added'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to add permission', [error.message]));
  }
});

// إزالة صلاحية من الدور
router.delete('/roles/:roleId/permissions/:permission', (req, res, next) => {
  try {
    const { roleId, permission } = req.params;

    const result = RBACService.removePermissionFromRole(roleId, permission);

    if (!result.success) {
      return next(new ApiError(404, result.message || 'Role not found', [result.error]));
    }

    return res.status(200).json(new ApiResponse(200, result, 'Permission removed'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to remove permission', [error.message]));
  }
});

// فحص وصول المستخدم
router.post('/check-access', (req, res, next) => {
  try {
    const { userId, resource, action } = req.body;

    if (!userId || !resource || !action) {
      return next(new ApiError(400, 'User ID, resource, and action are required'));
    }

    const result = RBACService.checkAccess(userId, resource, action);

    return res.status(200).json(new ApiResponse(200, result, 'Access check completed'));
  } catch (error) {
    return next(new ApiError(500, 'Access check failed', [error.message]));
  }
});

// إحصائيات RBAC
router.get('/stats/overview', (req, res, next) => {
  try {
    const result = RBACService.getRBACStatistics();

    return res.status(200).json(new ApiResponse(200, result, 'RBAC statistics fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch RBAC statistics', [error.message]));
  }
});

// تدقيق الوصول
router.get('/audit/log', (req, res, next) => {
  try {
    const { userId, action, result: filterResult } = req.query;
    const filters = {};
    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (filterResult) filters.result = filterResult;

    const result = RBACService.auditAccess(filters);

    return res.status(200).json(new ApiResponse(200, result, 'Audit log fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch audit log', [error.message]));
  }
});

// تصدير تكوين RBAC
router.get('/export/config', (req, res, next) => {
  try {
    const result = RBACService.exportRBACConfig();

    return res.status(200).json(new ApiResponse(200, result, 'RBAC configuration exported'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to export RBAC configuration', [error.message]));
  }
});

// استيراد تكوين RBAC
router.post('/import/config', (req, res, next) => {
  try {
    const { file } = req.body;

    if (!file) {
      return next(new ApiError(400, 'File required'));
    }

    const result = RBACService.importRBACConfig(file);

    return res.status(200).json(new ApiResponse(200, result, 'RBAC configuration imported'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to import RBAC configuration', [error.message]));
  }
});

module.exports = router;
