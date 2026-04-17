/* eslint-disable no-unused-vars */
/**
 * RBAC Controller
 * Handles role and permission management
 * Maps requests to RBACService methods
 */

const RBACService = require('../services/rbacService');

class RBACController {
  constructor() {
    this.rbacService = new RBACService();
  }

  /**
   * Create a new role
   * POST /api/v1/roles
   */
  async createRole(req, res, next) {
    try {
      const { name, description, permissions } = req.body;

      if (!name) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Role name is required',
          code: 'MISSING_NAME',
        });
      }

      const role = this.rbacService.createRole({
        name,
        description: description || '',
        permissions: permissions || [],
      });

      res.status(201).json({
        success: true,
        data: role,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role by ID
   * GET /api/v1/roles/:id
   */
  async getRole(req, res, next) {
    try {
      const { id } = req.params;

      const role = this.rbacService.getRole(id);

      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      if ((error.message || '').includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: 'حدث خطأ داخلي',
          code: 'ROLE_NOT_FOUND',
        });
      }
      next(error);
    }
  }

  /**
   * List all roles
   * GET /api/v1/roles
   */
  async listRoles(req, res, next) {
    try {
      const roles = this.rbacService.listRoles();

      res.json({
        success: true,
        data: roles,
        count: roles.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update role
   * PUT /api/v1/roles/:id
   */
  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const updated = this.rbacService.updateRole(id, updates);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      if ((error.message || '').includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: 'حدث خطأ داخلي',
          code: 'ROLE_NOT_FOUND',
        });
      }
      next(error);
    }
  }

  /**
   * Delete role
   * DELETE /api/v1/roles/:id
   */
  async deleteRole(req, res, next) {
    try {
      const { id } = req.params;

      this.rbacService.deleteRole(id);

      res.status(204).send();
    } catch (error) {
      if ((error.message || '').includes('not found')) {
        return res.status(404).json({
          error: 'not_found',
          message: 'حدث خطأ داخلي',
          code: 'ROLE_NOT_FOUND',
        });
      }
      next(error);
    }
  }

  /**
   * Assign role to user
   * POST /api/v1/users/:userId/roles/:roleId
   */
  async assignRoleToUser(req, res, next) {
    try {
      const { userId, roleId } = req.params;

      const result = this.rbacService.assignRoleToUser(userId, roleId);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke role from user
   * DELETE /api/v1/users/:userId/roles/:roleId
   */
  async revokeRoleFromUser(req, res, next) {
    try {
      const { userId, roleId } = req.params;

      this.rbacService.revokeRoleFromUser(userId, roleId);

      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user roles
   * GET /api/v1/users/:userId/roles
   */
  async getUserRoles(req, res, next) {
    try {
      const { userId } = req.params;

      const roles = this.rbacService.getUserRoles(userId);

      res.json({
        success: true,
        data: roles,
        count: roles.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user permissions
   * GET /api/v1/users/:userId/permissions
   */
  async getUserPermissions(req, res, next) {
    try {
      const { userId } = req.params;

      const permissions = this.rbacService.getUserPermissions(userId);

      res.json({
        success: true,
        data: permissions,
        count: permissions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if user has permission
   * GET /api/v1/users/:userId/permissions/:permissionKey
   */
  async checkPermission(req, res, next) {
    try {
      const { userId, permissionKey } = req.params;

      const hasPermission = this.rbacService.hasPermission(userId, permissionKey);

      res.json({
        success: true,
        data: {
          userId,
          permission: permissionKey,
          hasPermission,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check resource access
   * POST /api/v1/users/:userId/access
   */
  async checkResourceAccess(req, res, next) {
    try {
      const { userId } = req.params;
      const { action, resource } = req.body;

      if (!action || !resource) {
        return res.status(400).json({
          error: 'validation_error',
          message: 'Action and resource are required',
          code: 'MISSING_FIELDS',
        });
      }

      const hasAccess = this.rbacService.checkResourceAccess(userId, action, resource);

      res.json({
        success: true,
        data: {
          userId,
          action,
          resource,
          hasAccess,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RBACController;
