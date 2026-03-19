/**
 * RBAC Controller
 * المتحكم بالتحكم بالوصول القائم على الأدوار
 * 
 * يدير:
 * - إدارة السياسات
 * - إدارة الأدوار والأذونات
 * - إدارة قواعد الوصول
 * - تقارير التدقيق والامتثال
 */

const policyEngine = require('../services/policyEngine.service');
const rbacManager = require('../services/rbacManager.service');
const auditLog = require('../services/auditLog.service');
const ruleBuilder = require('../services/ruleBuilder.service');
const Logger = require('../utils/logger');

/**
 * ============================================
 * POLICIES ENDPOINTS (السياسات)
 * ============================================
 */

/**
 * POST /rbac/policies
 * Create a new policy
 * إنشاء سياسة جديدة
 */
exports.createPolicy = (req, res) => {
  try {
    const { name, description, effect, conditions, actions, resource, priority, metadata } = req.body;

    if (!name || !effect || !actions) {
      return res.status(400).json({
        success: false,
        message: 'Name, effect, and actions are required',
        en: 'Name, effect, and actions are required'
      });
    }

    const policy = policyEngine.createPolicy({
      name,
      description,
      effect: effect.toUpperCase(),
      conditions: conditions || {},
      actions,
      resource: resource || '*',
      priority: priority || 500,
      metadata: { ...metadata, userId: req.user?.id }
    });

    // Log to audit
    auditLog.logCustomEvent({
      eventType: 'POLICY_CREATED',
      userId: req.user?.id,
      action: 'CREATE',
      details: { policyId: policy.id, policyName: name },
      severity: 'INFO'
    });

    res.status(201).json({
      success: true,
      message: 'Policy created successfully',
      en: 'Policy created successfully',
      data: policy
    });
  } catch (error) {
    Logger.error(`Error creating policy: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/policies/:policyId
 * Get a specific policy
 * الحصول على سياسة معينة
 */
exports.getPolicy = (req, res) => {
  try {
    const { policyId } = req.params;
    const policy = policyEngine.getPolicy(policyId);

    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found',
        en: 'Policy not found'
      });
    }

    res.json({
      success: true,
      message: 'Policy retrieved successfully',
      en: 'Policy retrieved successfully',
      data: policy
    });
  } catch (error) {
    Logger.error(`Error getting policy: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/policies
 * Get all policies with optional filters
 * الحصول على جميع السياسات
 */
exports.getAllPolicies = (req, res) => {
  try {
    const { effect, status, _sort } = req.query;
    const filter = {};

    if (effect) filter.effect = effect;
    if (status) filter.status = status;

    const policies = policyEngine.getAllPolicies(filter);

    res.json({
      success: true,
      message: 'Policies retrieved successfully',
      en: 'Policies retrieved successfully',
      data: policies
    });
  } catch (error) {
    Logger.error(`Error getting policies: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * PUT /rbac/policies/:policyId
 * Update a policy
 * تحديث سياسة
 */
exports.updatePolicy = (req, res) => {
  try {
    const { policyId } = req.params;
    const updates = req.body;

    policyEngine.updatePolicy(policyId, updates);

    // Log to audit
    auditLog.logCustomEvent({
      eventType: 'POLICY_UPDATED',
      userId: req.user?.id,
      action: 'UPDATE',
      details: { policyId },
      severity: 'INFO'
    });

    res.json({
      success: true,
      message: 'Policy updated successfully',
      en: 'Policy updated successfully',
      data: policyEngine.getPolicy(policyId)
    });
  } catch (error) {
    Logger.error(`Error updating policy: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * DELETE /rbac/policies/:policyId
 * Delete a policy
 * حذف سياسة
 */
exports.deletePolicy = (req, res) => {
  try {
    const { policyId } = req.params;

    if (!policyEngine.getPolicy(policyId)) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found',
        en: 'Policy not found'
      });
    }

    policyEngine.deletePolicy(policyId);

    // Log to audit
    auditLog.logCustomEvent({
      eventType: 'POLICY_DELETED',
      userId: req.user?.id,
      action: 'DELETE',
      details: { policyId },
      severity: 'WARNING'
    });

    res.json({
      success: true,
      message: 'Policy deleted successfully',
      en: 'Policy deleted successfully'
    });
  } catch (error) {
    Logger.error(`Error deleting policy: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * POST /rbac/policies/:policyId/evaluate
 * Test policy evaluation
 * اختبار تقييم السياسة
 */
exports.evaluatePolicy = (req, res) => {
  try {
    const { _policyId } = req.params;
    const context = req.body;

    const result = policyEngine.evaluatePolicies(context);

    // Log evaluation
    auditLog.logPolicyEvaluation({
      userId: req.user?.id,
      action: context.action,
      resource: context.resource,
      decision: result.decision,
      reason: result.reason,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({
      success: true,
      message: 'Policy evaluation completed',
      en: 'Policy evaluation completed',
      data: result
    });
  } catch (error) {
    Logger.error(`Error evaluating policy: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * ============================================
 * ROLES & PERMISSIONS ENDPOINTS (الأدوار والأذونات)
 * ============================================
 */

/**
 * POST /rbac/roles
 * Create a new role
 * إنشاء دور جديد
 */
exports.createRole = (req, res) => {
  try {
    const { name, description, level, parent, metadata } = req.body;

    const role = rbacManager.createRole({
      name,
      description,
      level,
      parent,
      metadata: { ...metadata, userId: req.user?.id }
    });

    auditLog.logRoleAssignment({
      userId: req.user?.id,
      roleId: role.id,
      action: 'ROLE_CREATED',
      assignedBy: req.user?.id,
      reason: 'Role created',
      metadata: { correlationId: req.id }
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      en: 'Role created successfully',
      data: role
    });
  } catch (error) {
    Logger.error(`Error creating role: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/roles
 * Get all roles
 * الحصول على جميع الأدوار
 */
exports.getAllRoles = (req, res) => {
  try {
    const _roles = [];
    const _roleMap = policyEngine.policies?.get ? new Map() : null;

    // Collect all roles from rbac manager
    const allRoles = Array.from(rbacManager.roles.values());

    res.json({
      success: true,
      message: 'Roles retrieved successfully',
      en: 'Roles retrieved successfully',
      data: allRoles
    });
  } catch (error) {
    Logger.error(`Error getting roles: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * POST /rbac/roles/:roleId/permissions/:permId
 * Assign permission to role
 * تعيين إذن للدور
 */
exports.assignPermissionToRole = (req, res) => {
  try {
    const { roleId, permId } = req.params;

    rbacManager.assignPermissionToRole(roleId, permId);

    auditLog.logPermissionChange({
      roleId,
      permissionId: permId,
      action: 'ADD',
      changedBy: req.user?.id,
      reason: 'Permission assigned',
      metadata: { correlationId: req.id }
    });

    res.json({
      success: true,
      message: 'Permission assigned successfully',
      en: 'Permission assigned successfully',
      data: { roleId, permId }
    });
  } catch (error) {
    Logger.error(`Error assigning permission: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * DELETE /rbac/roles/:roleId/permissions/:permId
 * Remove permission from role
 * إزالة إذن من الدور
 */
exports.removePermissionFromRole = (req, res) => {
  try {
    const { roleId, permId } = req.params;

    rbacManager.removePermissionFromRole(roleId, permId);

    auditLog.logPermissionChange({
      roleId,
      permissionId: permId,
      action: 'REMOVE',
      changedBy: req.user?.id,
      reason: 'Permission removed',
      metadata: { correlationId: req.id }
    });

    res.json({
      success: true,
      message: 'Permission removed successfully',
      en: 'Permission removed successfully'
    });
  } catch (error) {
    Logger.error(`Error removing permission: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * POST /rbac/users/:userId/roles/:roleId
 * Assign role to user
 * تعيين دور للمستخدم
 */
exports.assignRoleToUser = (req, res) => {
  try {
    const { userId, roleId } = req.params;

    rbacManager.assignRoleToUser(userId, roleId);

    auditLog.logRoleAssignment({
      userId,
      roleId,
      action: 'ASSIGN',
      assignedBy: req.user?.id,
      reason: req.body.reason || 'Role assigned',
      metadata: { correlationId: req.id }
    });

    res.json({
      success: true,
      message: 'Role assigned to user successfully',
      en: 'Role assigned to user successfully',
      data: { userId, roleId }
    });
  } catch (error) {
    Logger.error(`Error assigning role to user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * DELETE /rbac/users/:userId/roles/:roleId
 * Remove role from user
 * إزالة دور من المستخدم
 */
exports.removeRoleFromUser = (req, res) => {
  try {
    const { userId, roleId } = req.params;

    rbacManager.removeRoleFromUser(userId, roleId);

    auditLog.logRoleAssignment({
      userId,
      roleId,
      action: 'REMOVE',
      assignedBy: req.user?.id,
      reason: req.body.reason || 'Role removed',
      metadata: { correlationId: req.id }
    });

    res.json({
      success: true,
      message: 'Role removed from user successfully',
      en: 'Role removed from user successfully'
    });
  } catch (error) {
    Logger.error(`Error removing role from user: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/users/:userId/permissions
 * Get user effective permissions
 * الحصول على أذونات المستخدم الفعالة
 */
exports.getUserPermissions = (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = rbacManager.getEffectivePermissions(userId);

    res.json({
      success: true,
      message: 'User permissions retrieved',
      en: 'User permissions retrieved',
      data: {
        userId,
        permissions: Array.from(permissions)
      }
    });
  } catch (error) {
    Logger.error(`Error getting user permissions: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * ============================================
 * RULES ENDPOINTS (القواعد)
 * ============================================
 */

/**
 * POST /rbac/rules
 * Create a new rule
 * إنشاء قاعدة جديدة
 */
exports.createRule = (req, res) => {
  try {
    const { name, description, conditions, actions, priority, metadata } = req.body;

    const rule = ruleBuilder.createRule({
      name,
      description,
      conditions,
      actions,
      priority,
      metadata: { ...metadata, userId: req.user?.id }
    });

    res.status(201).json({
      success: true,
      message: 'Rule created successfully',
      en: 'Rule created successfully',
      data: rule
    });
  } catch (error) {
    Logger.error(`Error creating rule: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/rules
 * Get all rules
 * الحصول على جميع القواعد
 */
exports.getAllRules = (req, res) => {
  try {
    const { search, enabled } = req.query;
    const rules = ruleBuilder.getAllRules({ search, enabled: enabled === 'true' });

    res.json({
      success: true,
      message: 'Rules retrieved successfully',
      en: 'Rules retrieved successfully',
      data: rules
    });
  } catch (error) {
    Logger.error(`Error getting rules: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * POST /rbac/rules/:ruleId/evaluate
 * Test rule evaluation
 * اختبار تقييم القاعدة
 */
exports.evaluateRule = (req, res) => {
  try {
    const { ruleId } = req.params;
    const context = req.body;

    const result = ruleBuilder.evaluateRule(ruleId, context);

    res.json({
      success: true,
      message: 'Rule evaluation completed',
      en: 'Rule evaluation completed',
      data: result
    });
  } catch (error) {
    Logger.error(`Error evaluating rule: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/rules/templates
 * Get rule templates
 * الحصول على قوالس القواعد
 */
exports.getRuleTemplates = (req, res) => {
  try {
    const templates = ruleBuilder.getTemplates();

    res.json({
      success: true,
      message: 'Templates retrieved successfully',
      en: 'Templates retrieved successfully',
      data: templates
    });
  } catch (error) {
    Logger.error(`Error getting templates: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * ============================================
 * AUDIT ENDPOINTS (التدقيق)
 * ============================================
 */

/**
 * GET /rbac/audit/logs
 * Query audit logs
 * الاستعلام عن سجلات التدقيق
 */
exports.getAuditLogs = (req, res) => {
  try {
    const {
      userId,
      type,
      action,
      decision,
      severity,
      startDate,
      endDate,
      page,
      limit,
      sortBy,
      sortOrder
    } = req.query;

    const result = auditLog.queryLogs({
      userId,
      type,
      action,
      decision,
      severity,
      startDate,
      endDate,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      sortBy: sortBy || 'timestamp',
      sortOrder: sortOrder || 'desc'
    });

    res.json({
      success: true,
      message: 'Audit logs retrieved successfully',
      en: 'Audit logs retrieved successfully',
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    Logger.error(`Error getting audit logs: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/audit/user/:userId
 * Get user activity report
 * الحصول على تقرير نشاط المستخدم
 */
exports.getUserActivityReport = (req, res) => {
  try {
    const { userId } = req.params;
    const report = auditLog.getUserActivityReport(userId);

    res.json({
      success: true,
      message: 'Activity report retrieved',
      en: 'Activity report retrieved',
      data: report
    });
  } catch (error) {
    Logger.error(`Error getting activity report: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/audit/compliance
 * Get compliance report
 * الحصول على تقرير الامتثال
 */
exports.getComplianceReport = (req, res) => {
  try {
    const report = auditLog.getComplianceReport();

    res.json({
      success: true,
      message: 'Compliance report retrieved',
      en: 'Compliance report retrieved',
      data: report
    });
  } catch (error) {
    Logger.error(`Error getting compliance report: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/audit/decisions
 * Get decision statistics
 * الحصول على إحصائيات القرارات
 */
exports.getDecisionStats = (req, res) => {
  try {
    const stats = auditLog.getDecisionStats();

    res.json({
      success: true,
      message: 'Decision stats retrieved',
      en: 'Decision stats retrieved',
      data: stats
    });
  } catch (error) {
    Logger.error(`Error getting decision stats: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * ============================================
 * STATISTICS ENDPOINTS
 * ============================================
 */

/**
 * GET /rbac/statistics
 * Get comprehensive RBAC statistics
 * الحصول على إحصائيات RBAC الشاملة
 */
exports.getStatistics = (req, res) => {
  try {
    const stats = {
      rbac: rbacManager.getStatistics(),
      policies: policyEngine.getStatistics(),
      rules: ruleBuilder.getStatistics(),
      audit: auditLog.getStatistics()
    };

    res.json({
      success: true,
      message: 'Statistics retrieved successfully',
      en: 'Statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    Logger.error(`Error getting statistics: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Error: ${error.message}`,
      en: `Error: ${error.message}`
    });
  }
};

/**
 * GET /rbac/health
 * Health check
 * فحص الصحة
 */
exports.healthCheck = (req, res) => {
  try {
    res.json({
      success: true,
      message: 'RBAC system is healthy',
      en: 'RBAC system is healthy',
      data: {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          policyEngine: 'operational',
          rbacManager: 'operational',
          auditLog: 'operational',
          ruleBuilder: 'operational'
        }
      }
    });
  } catch (error) {
    Logger.error(`Error in health check: ${error.message}`);
    res.status(500).json({
      success: false,
      message: `Health check failed: ${error.message}`,
      en: `Health check failed: ${error.message}`
    });
  }
};
