/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * 🎮 Advanced RBAC Controller - متحكم RBAC متقدم
 * ═══════════════════════════════════════════════════════════════
 *
 * يدير جميع عمليات RBAC عبر REST API مع:
 * ✅ إدارة الأدوار والأذونات
 * ✅ إدارة السياسات المتقدمة
 * ✅ التقارير والتحليلات
 * ✅ معالجة الأخطاء المحترفة
 */

const logger = require('../utils/logger');

class AdvancedRBACController {
  constructor(rbacSystem, policyEngine, auditingService, middleware) {
    this.rbac = rbacSystem;
    this.policyEngine = policyEngine;
    this.auditing = auditingService;
    this.middleware = middleware;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * ROLE MANAGEMENT - إدارة الأدوار
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء دور جديد
   */
  async createRole(req, res) {
    try {
      const { roleId, name, description, level, scope, parentRole } = req.body;

      if (!roleId || !name) {
        return res.status(400).json({
          error: 'Missing required fields: roleId, name',
        });
      }

      const role = this.rbac.createRole(roleId, {
        name,
        description,
        level,
        scope,
        parentRole,
        createdBy: req.user?.id || 'system',
      });

      this.auditing.logAuditEvent({
        eventType: 'ROLE_CREATED',
        userId: req.user?.id,
        action: 'CREATE',
        resource: `roles/${roleId}`,
        after: role,
        status: 'success',
      });

      res.status(201).json({
        success: true,
        data: role,
      });
    } catch (error) {
      this._handleError(res, error, 'createRole');
    }
  }

  /**
   * الحصول على جميع الأدوار
   */
  async getAllRoles(req, res) {
    try {
      const roles = Array.from(this.rbac.roles.values());

      res.json({
        success: true,
        total: roles.length,
        data: roles,
      });
    } catch (error) {
      this._handleError(res, error, 'getAllRoles');
    }
  }

  /**
   * الحصول على دور محدد
   */
  async getRole(req, res) {
    try {
      const { roleId } = req.params;
      const role = this.rbac.roles.get(roleId);

      if (!role) {
        return res.status(404).json({
          error: `Role ${roleId} not found`,
        });
      }

      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      this._handleError(res, error, 'getRole');
    }
  }

  /**
   * تحديث دور
   */
  async updateRole(req, res) {
    try {
      const { roleId } = req.params;
      const updates = req.body;

      const oldRole = JSON.parse(JSON.stringify(this.rbac.roles.get(roleId)));
      const updatedRole = this.rbac.updateRole(roleId, updates);

      this.auditing.logAuditEvent({
        eventType: 'ROLE_UPDATED',
        userId: req.user?.id,
        action: 'UPDATE',
        resource: `roles/${roleId}`,
        before: oldRole,
        after: updatedRole,
        status: 'success',
        changes: this._calculateChanges(oldRole, updatedRole),
      });

      res.json({
        success: true,
        data: updatedRole,
      });
    } catch (error) {
      this._handleError(res, error, 'updateRole');
    }
  }

  /**
   * حذف دور
   */
  async deleteRole(req, res) {
    try {
      const { roleId } = req.params;
      const role = this.rbac.roles.get(roleId);

      if (!role) {
        return res.status(404).json({ error: `Role ${roleId} not found` });
      }

      this.rbac.deleteRole(roleId);

      this.auditing.logAuditEvent({
        eventType: 'ROLE_DELETED',
        userId: req.user?.id,
        action: 'DELETE',
        resource: `roles/${roleId}`,
        before: role,
        status: 'success',
        severity: 'high',
      });

      res.json({ success: true });
    } catch (error) {
      this._handleError(res, error, 'deleteRole');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PERMISSION MANAGEMENT - إدارة الأذونات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء إذن جديد
   */
  async createPermission(req, res) {
    try {
      const { permId, name, description, resource, action, riskLevel } = req.body;

      if (!permId) {
        return res.status(400).json({
          error: 'Missing required field: permId',
        });
      }

      const permission = this.rbac.createPermission(permId, {
        name,
        description,
        resource,
        action,
        riskLevel,
      });

      this.auditing.logAuditEvent({
        eventType: 'PERMISSION_CREATED',
        userId: req.user?.id,
        action: 'CREATE',
        resource: `permissions/${permId}`,
        after: permission,
        status: 'success',
      });

      res.status(201).json({
        success: true,
        data: permission,
      });
    } catch (error) {
      this._handleError(res, error, 'createPermission');
    }
  }

  /**
   * إضافة إذن إلى دور
   */
  async assignPermissionToRole(req, res) {
    try {
      const { roleId, permId } = req.params;

      const role = this.rbac.assignPermissionToRole(roleId, permId, {
        assignedBy: req.user?.id,
      });

      this.auditing.logAuditEvent({
        eventType: 'PERMISSION_ASSIGNED',
        userId: req.user?.id,
        action: 'ASSIGN',
        resource: `roles/${roleId}`,
        metadata: { permissionId: permId },
        status: 'success',
      });

      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      this._handleError(res, error, 'assignPermissionToRole');
    }
  }

  /**
   * إزالة إذن من دور
   */
  async removePermissionFromRole(req, res) {
    try {
      const { roleId, permId } = req.params;

      const role = this.rbac.removePermissionFromRole(roleId, permId);

      this.auditing.logAuditEvent({
        eventType: 'PERMISSION_REMOVED',
        userId: req.user?.id,
        action: 'REMOVE',
        resource: `roles/${roleId}`,
        metadata: { permissionId: permId },
        status: 'success',
      });

      res.json({
        success: true,
        data: role,
      });
    } catch (error) {
      this._handleError(res, error, 'removePermissionFromRole');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * USER-ROLE MANAGEMENT - تعيين الأدوار للمستخدمين
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تعيين دور للمستخدم
   */
  async assignRoleToUser(req, res) {
    try {
      const { userId } = req.params;
      const { roleId, expiresAt, scope, conditions } = req.body;

      if (!roleId) {
        return res.status(400).json({ error: 'Missing required field: roleId' });
      }

      const assignment = this.rbac.assignRoleToUser(userId, roleId, {
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        scope,
        conditions,
        assignedBy: req.user?.id,
      });

      this.auditing.logAuditEvent({
        eventType: 'ROLE_ASSIGNED',
        userId: req.user?.id,
        action: 'ASSIGN_ROLE',
        resource: `users/${userId}`,
        metadata: { roleId, expiresAt },
        status: 'success',
      });

      res.json({
        success: true,
        data: assignment,
      });
    } catch (error) {
      this._handleError(res, error, 'assignRoleToUser');
    }
  }

  /**
   * إزالة دور من المستخدم
   */
  async removeRoleFromUser(req, res) {
    try {
      const { userId, roleId } = req.params;

      const removed = this.rbac.removeRoleFromUser(userId, roleId);

      if (!removed) {
        return res.status(404).json({
          error: `User ${userId} does not have role ${roleId}`,
        });
      }

      this.auditing.logAuditEvent({
        eventType: 'ROLE_REMOVED',
        userId: req.user?.id,
        action: 'REMOVE_ROLE',
        resource: `users/${userId}`,
        metadata: { roleId },
        status: 'success',
      });

      res.json({ success: true });
    } catch (error) {
      this._handleError(res, error, 'removeRoleFromUser');
    }
  }

  /**
   * الحصول على أدوار المستخدم
   */
  async getUserRoles(req, res) {
    try {
      const { userId } = req.params;
      const roles = this.rbac.getUserRoles(userId);

      res.json({
        success: true,
        userId,
        total: roles.length,
        data: roles,
      });
    } catch (error) {
      this._handleError(res, error, 'getUserRoles');
    }
  }

  /**
   * الحصول على الأذونات الفعالة للمستخدم
   */
  async getUserPermissions(req, res) {
    try {
      const { userId } = req.params;
      const permissions = this.rbac.getUserEffectivePermissions(userId);

      res.json({
        success: true,
        userId,
        total: permissions.length,
        data: permissions,
      });
    } catch (error) {
      this._handleError(res, error, 'getUserPermissions');
    }
  }

  /**
   * التحقق من إذن للمستخدم
   */
  async checkPermission(req, res) {
    try {
      const { userId, permId } = req.params;
      const context = req.query;

      const hasAccess = this.rbac.hasPermission(userId, permId, context);

      res.json({
        success: true,
        userId,
        permissionId: permId,
        hasAccess,
      });
    } catch (error) {
      this._handleError(res, error, 'checkPermission');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * POLICY MANAGEMENT - إدارة السياسات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء سياسة جديدة
   */
  async createPolicy(req, res) {
    try {
      const { policyId, name, description, principal, action, resource, effect } = req.body;

      const policy = this.policyEngine.createPolicy(policyId, {
        name,
        description,
        principal,
        action,
        resource,
        effect,
        createdBy: req.user?.id,
      });

      this.auditing.logAuditEvent({
        eventType: 'POLICY_CREATED',
        userId: req.user?.id,
        action: 'CREATE_POLICY',
        resource: `policies/${policyId}`,
        after: policy,
        status: 'success',
      });

      res.status(201).json({
        success: true,
        data: policy,
      });
    } catch (error) {
      this._handleError(res, error, 'createPolicy');
    }
  }

  /**
   * الحصول على جميع السياسات
   */
  async getPolicies(req, res) {
    try {
      const filters = req.query;
      const policies = this.policyEngine.getAllPolicies(filters);

      res.json({
        success: true,
        total: policies.length,
        data: policies,
      });
    } catch (error) {
      this._handleError(res, error, 'getPolicies');
    }
  }

  /**
   * تقييم السياسات
   */
  async evaluatePolicies(req, res) {
    try {
      const { userId } = req.params;
      const context = req.body || {};

      const result = this.policyEngine.evaluatePolicies(userId, context);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      this._handleError(res, error, 'evaluatePolicies');
    }
  }

  /**
   * اتخاذ قرار الوصول
   */
  async makeAccessDecision(req, res) {
    try {
      const { userId } = req.params;
      const { action, resource } = req.body;

      if (!action || !resource) {
        return res.status(400).json({
          error: 'Missing required fields: action, resource',
        });
      }

      const decision = this.policyEngine.makeAccessDecision(userId, action, resource, req.query);

      res.json({
        success: true,
        data: decision,
      });
    } catch (error) {
      this._handleError(res, error, 'makeAccessDecision');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * AUDIT & REPORTING - التدقيق والتقارير
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على سجلات التدقيق
   */
  async getAuditLog(req, res) {
    try {
      const query = req.query;
      const result = this.auditing.queryAuditLog(query);

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      this._handleError(res, error, 'getAuditLog');
    }
  }

  /**
   * الحصول على تقرير التدقيق
   */
  async generateAuditReport(req, res) {
    try {
      const reportConfig = req.body || {};
      const report = this.auditing.generateAuditReport(reportConfig);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      this._handleError(res, error, 'generateAuditReport');
    }
  }

  /**
   * الحصول على الحوادث الأمنية
   */
  async getSecurityIncidents(req, res) {
    try {
      const filters = req.query;
      const incidents = this.auditing.getSecurityIncidents(filters);

      res.json({
        success: true,
        total: incidents.length,
        data: incidents,
      });
    } catch (error) {
      this._handleError(res, error, 'getSecurityIncidents');
    }
  }

  /**
   * الحصول على ملخص الأمان
   */
  async getSecuritySummary(req, res) {
    try {
      const summary = this.auditing.getSecuritySummary();
      const anomalies = this.rbac.getAnomalyReport?.() || [];
      const stats = this.rbac.getSystemStats?.() || {};

      res.json({
        success: true,
        data: {
          security: summary,
          anomalies,
          systemStats: stats,
          performance: this.middleware.getPerformanceStats?.(),
        },
      });
    } catch (error) {
      this._handleError(res, error, 'getSecuritySummary');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * ADMIN OPERATIONS - عمليات إدارية
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على الإحصائيات الشاملة
   */
  async getSystemStats(req, res) {
    try {
      const stats = {
        rbac: this.rbac.getSystemStats?.(),
        auditing: this.auditing.getSecuritySummary?.(),
        middleware: this.middleware.getPerformanceStats?.(),
        timestamp: new Date(),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      this._handleError(res, error, 'getSystemStats');
    }
  }

  /**
   * تصدير البيانات
   */
  async exportData(req, res) {
    try {
      const format = req.query.format || 'json';

      const exportData = {
        rbac: this.rbac.exportData?.(),
        policies: this.policyEngine.exportPolicies?.(),
        auditLogs: this.auditing.auditLog.slice(-1000),
        timestamp: new Date(),
      };

      if (format === 'csv') {
        const csv = this.auditing.exportAuditLogs?.('csv');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
        res.send(csv);
      } else {
        res.json({
          success: true,
          data: exportData,
        });
      }
    } catch (error) {
      this._handleError(res, error, 'exportData');
    }
  }

  /**
   * استيراد البيانات
   */
  async importData(req, res) {
    try {
      const data = req.body;

      if (data.rbac)
        this.rbac.importData?.({
          roles: data.rbac.roles,
          permissions: data.rbac.permissions,
        });

      if (data.policies) this.policyEngine.importPolicies?.(data.policies);

      this.auditing.logAuditEvent({
        eventType: 'DATA_IMPORTED',
        userId: req.user?.id,
        action: 'IMPORT',
        resource: 'system',
        status: 'success',
        severity: 'high',
      });

      res.json({ success: true });
    } catch (error) {
      this._handleError(res, error, 'importData');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * PRIVATE HELPER METHODS - طرق مساعدة خاصة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * حساب التغييرات بين نسختين
   */
  _calculateChanges(oldData, newData) {
    const changes = [];

    for (const [key, newValue] of Object.entries(newData)) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue,
        });
      }
    }

    return changes;
  }

  /**
   * معالجة الأخطاء
   */
  _handleError(res, error, context) {
    logger.error(`Error in ${context}:`, error);

    const msg = error.message || '';
    if (msg.includes('not found')) {
      return res.status(404).json({ error: 'حدث خطأ في الخادم' });
    }

    if (msg.includes('already exists')) {
      return res.status(409).json({ error: 'حدث خطأ في الخادم' });
    }

    if (msg.includes('Cannot')) {
      return res.status(403).json({ error: 'حدث خطأ في الخادم' });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: 'حدث خطأ داخلي',
      context,
    });
  }

  /**
   * توليد استجابة ناجحة
   */
  _successResponse(data, statusCode = 200) {
    return {
      statusCode,
      success: true,
      data,
    };
  }

  /**
   * توليد استجابة خطأ
   */
  _errorResponse(error, statusCode = 400) {
    return {
      statusCode,
      success: false,
      error: 'حدث خطأ داخلي' || error,
    };
  }
}

module.exports = AdvancedRBACController;
