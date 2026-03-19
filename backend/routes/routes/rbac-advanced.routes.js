/**
 * RBAC Advanced Routes
 * نقاط نهاية API متقدمة لنظام إدارة الصلاحيات الذكي
 * 
 * استخدام المكونات:
 * - Advanced RBAC System
 * - RBAC Policy Engine
 * - RBAC Auditing Service
 * - Intelligent RBAC Middleware
 */

const express = require('express');
const router = express.Router();

// Import advanced RBAC components
const AdvancedRBACSystem = require('../services/advanced-rbac.system');
const RBACPolicyEngine = require('../services/rbac-policy-engine');
const RBACAuditingService = require('../services/rbac-auditing.service');

// Initialize RBAC components
const rbacSystem = new AdvancedRBACSystem();
const policyEngine = new RBACPolicyEngine();
const auditingService = new RBACAuditingService();

// Track initialization state
let rbacInitialized = false;

// Setup default roles and permissions if needed
function setupDefaults() {
  try {
    // Check if already initialized (prevent duplicate initialization)
    if (rbacInitialized) {
      return; // Silently skip if already done
    }

    // Check if super-admin role exists
    const existingRole = rbacSystem.getRole?.('super-admin');
    if (existingRole) {
      rbacInitialized = true;
      return; // Already initialized
    }

    // Create default roles
    rbacSystem.createRole('super-admin', {
      name: 'Super Administrator',
      description: 'Full system access',
      level: 5,
      archived: false,
      metadata: { isSystem: true }
    });

    rbacSystem.createRole('admin', {
      name: 'Administrator',
      description: 'Administrative access',
      level: 4,
      archived: false,
      metadata: { isSystem: true }
    });

    rbacSystem.createRole('manager', {
      name: 'Manager',
      description: 'Management access',
      level: 3,
      archived: false,
      metadata: { isSystem: true }
    });

    rbacSystem.createRole('user', {
      name: 'User',
      description: 'Standard user access',
      level: 2,
      archived: false,
      metadata: { isSystem: true }
    });

    rbacSystem.createRole('guest', {
      name: 'Guest',
      description: 'Guest access',
      level: 1,
      archived: false,
      metadata: { isSystem: true }
    });

    // Create default permissions
    const permissions = [
      { id: 'users:create', name: 'Create User', resource: 'users', action: 'create', riskLevel: 'high' },
      { id: 'users:read', name: 'Read User', resource: 'users', action: 'read', riskLevel: 'low' },
      { id: 'users:update', name: 'Update User', resource: 'users', action: 'update', riskLevel: 'high' },
      { id: 'users:delete', name: 'Delete User', resource: 'users', action: 'delete', riskLevel: 'critical' },
      { id: 'roles:create', name: 'Create Role', resource: 'roles', action: 'create', riskLevel: 'critical' },
      { id: 'roles:read', name: 'Read Role', resource: 'roles', action: 'read', riskLevel: 'low' },
      { id: 'roles:update', name: 'Update Role', resource: 'roles', action: 'update', riskLevel: 'critical' },
      { id: 'roles:delete', name: 'Delete Role', resource: 'roles', action: 'delete', riskLevel: 'critical' },
      { id: 'reports:view', name: 'View Reports', resource: 'reports', action: 'read', riskLevel: 'low' },
      { id: 'audit:view', name: 'View Audit Logs', resource: 'audit', action: 'read', riskLevel: 'medium' },
    ];

    permissions.forEach(perm => {
      try {
        rbacSystem.createPermission(perm.id, perm);
      } catch (permErr) {
        // Permission might already exist, continue
      }
    });

    // Assign permissions to roles
    const rolePermissions = {
      'super-admin': ['users:create', 'users:read', 'users:update', 'users:delete', 'roles:create', 'roles:read', 'roles:update', 'roles:delete'],
      'admin': ['users:create', 'users:read', 'users:update', 'roles:read'],
      'user': ['users:read', 'reports:view'],
    };

    Object.entries(rolePermissions).forEach(([role, perms]) => {
      perms.forEach(perm => {
        try {
          rbacSystem.assignPermissionToRole(role, perm);
        } catch (permErr) {
          // Permission might already be assigned, continue
        }
      });
    });

    // Setup default policies (if not exists)
    try {
      policyEngine.createPolicy('admin-allow-all', {
        effect: 'Allow',
        priority: 10,
        principals: ['admin', 'super-admin'],
        actions: ['*'],
        resources: ['*'],
        conditions: []
      });
    } catch (policyErr) {
      // Policy might already exist
    }

    try {
      policyEngine.createPolicy('guest-deny-write', {
        effect: 'Deny',
        priority: 20,
        principals: ['guest'],
        actions: ['create', 'update', 'delete'],
        resources: ['*'],
        conditions: []
      });
    } catch (policyErr) {
      // Policy might already exist
    }

    rbacInitialized = true;
    if (process.env.DEBUG_RBAC === 'true') {
      console.log('✅ RBAC Defaults initialized');
    }
  } catch (error) {
    if (process.env.DEBUG_RBAC === 'true') {
      console.warn('⚠️  RBAC Initialization error:', error.message);
    }
    rbacInitialized = true; // Mark as initialized to prevent repeated attempts
  }
}

// Initialize defaults on route load (once only)
setupDefaults();

// ============================================
// ROLE MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/rbac/roles
 * Create a new role
 */
router.post('/roles', (req, res) => {
  try {
    const { roleId, name, description, level, metadata } = req.body;

    if (!roleId || !name) {
      return res.status(400).json({
        success: false,
        message: 'roleId and name are required',
      });
    }

    rbacSystem.createRole(roleId, {
      name,
      description,
      level: level || 1,
      metadata: metadata || {},
      archived: false,
    });

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'CREATE_ROLE',
      resourceType: 'role',
      resourceId: roleId,
      details: { name, description },
      status: 'success',
      severity: 'high',
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: { roleId, name },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/roles
 * Get all roles
 */
router.get('/roles', (req, res) => {
  try {
    const roles = rbacSystem.getAllRoles();
    res.json({
      success: true,
      data: roles,
      count: roles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/roles/:roleId
 * Get specific role
 */
router.get('/roles/:roleId', (req, res) => {
  try {
    const { roleId } = req.params;
    const role = rbacSystem.getRole(roleId);

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Role not found',
      });
    }

    res.json({
      success: true,
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /api/rbac/roles/:roleId
 * Update role
 */
router.put('/roles/:roleId', (req, res) => {
  try {
    const { roleId } = req.params;
    const { name, description, level } = req.body;

    rbacSystem.updateRole(roleId, {
      name,
      description,
      level,
    });

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'UPDATE_ROLE',
      resourceType: 'role',
      resourceId: roleId,
      details: { name, description, level },
      status: 'success',
      severity: 'high',
    });

    res.json({
      success: true,
      message: 'Role updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rbac/roles/:roleId
 * Delete role
 */
router.delete('/roles/:roleId', (req, res) => {
  try {
    const { roleId } = req.params;

    rbacSystem.deleteRole(roleId);

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'DELETE_ROLE',
      resourceType: 'role',
      resourceId: roleId,
      status: 'success',
      severity: 'critical',
    });

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// PERMISSION MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/rbac/permissions
 * Create permission
 */
router.post('/permissions', (req, res) => {
  try {
    const { permissionId, name, resource, action, riskLevel } = req.body;

    if (!permissionId || !resource || !action) {
      return res.status(400).json({
        success: false,
        message: 'permissionId, resource, and action are required',
      });
    }

    rbacSystem.createPermission(permissionId, {
      name,
      resource,
      action,
      riskLevel: riskLevel || 'low',
    });

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'CREATE_PERMISSION',
      resourceType: 'permission',
      resourceId: permissionId,
      details: { resource, action },
      status: 'success',
      severity: 'high',
    });

    res.status(201).json({
      success: true,
      message: 'Permission created successfully',
      data: { permissionId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/rbac/roles/:roleId/permissions/:permId
 * Assign permission to role
 */
router.post('/roles/:roleId/permissions/:permId', (req, res) => {
  try {
    const { roleId, permId } = req.params;

    rbacSystem.assignPermissionToRole(roleId, permId);

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'ASSIGN_PERMISSION',
      resourceType: 'role',
      resourceId: roleId,
      details: { permissionId: permId },
      status: 'success',
      severity: 'high',
    });

    res.json({
      success: true,
      message: 'Permission assigned to role',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rbac/roles/:roleId/permissions/:permId
 * Remove permission from role
 */
router.delete('/roles/:roleId/permissions/:permId', (req, res) => {
  try {
    const { roleId, permId } = req.params;

    rbacSystem.removePermissionFromRole(roleId, permId);

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'REMOVE_PERMISSION',
      resourceType: 'role',
      resourceId: roleId,
      details: { permissionId: permId },
      status: 'success',
      severity: 'high',
    });

    res.json({
      success: true,
      message: 'Permission removed from role',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// USER-ROLE ASSIGNMENT ENDPOINTS
// ============================================

/**
 * POST /api/rbac/users/:userId/roles/:roleId
 * Assign role to user
 */
router.post('/users/:userId/roles/:roleId', (req, res) => {
  try {
    const { userId, roleId } = req.params;
    const { expiresAt } = req.body;

    rbacSystem.assignRoleToUser(userId, roleId, { expiresAt });

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'ASSIGN_ROLE_TO_USER',
      resourceType: 'user',
      resourceId: userId,
      details: { roleId, expiresAt },
      status: 'success',
      severity: 'high',
    });

    res.json({
      success: true,
      message: 'Role assigned to user',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /api/rbac/users/:userId/roles/:roleId
 * Remove role from user
 */
router.delete('/users/:userId/roles/:roleId', (req, res) => {
  try {
    const { userId, roleId } = req.params;

    rbacSystem.removeRoleFromUser(userId, roleId);

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'REMOVE_ROLE_FROM_USER',
      resourceType: 'user',
      resourceId: userId,
      details: { roleId },
      status: 'success',
      severity: 'high',
    });

    res.json({
      success: true,
      message: 'Role removed from user',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/users/:userId/roles
 * Get user roles
 */
router.get('/users/:userId/roles', (req, res) => {
  try {
    const { userId } = req.params;
    const roles = rbacSystem.getUserRoles(userId);

    res.json({
      success: true,
      data: roles,
      count: roles.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/users/:userId/permissions
 * Get user effective permissions
 */
router.get('/users/:userId/permissions', (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = rbacSystem.getUserEffectivePermissions(userId);

    res.json({
      success: true,
      data: permissions,
      count: permissions.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/users/:userId/permissions/:permId/check
 * Check if user has permission
 */
router.get('/users/:userId/permissions/:permId/check', (req, res) => {
  try {
    const { userId, permId } = req.params;
    const context = req.query;

    const hasPermission = rbacSystem.hasPermission(userId, permId, context);

    res.json({
      success: true,
      userId,
      permissionId: permId,
      hasPermission,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// POLICY MANAGEMENT ENDPOINTS
// ============================================

/**
 * POST /api/rbac/policies
 * Create policy
 */
router.post('/policies', (req, res) => {
  try {
    const { policyId, effect, priority, principals, actions, resources, conditions } = req.body;

    if (!policyId || !effect) {
      return res.status(400).json({
        success: false,
        message: 'policyId and effect are required',
      });
    }

    policyEngine.createPolicy(policyId, {
      effect,
      priority: priority || 10,
      principals: principals || [],
      actions: actions || [],
      resources: resources || [],
      conditions: conditions || [],
    });

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'CREATE_POLICY',
      resourceType: 'policy',
      resourceId: policyId,
      details: { effect, principals, actions },
      status: 'success',
      severity: 'high',
    });

    res.status(201).json({
      success: true,
      message: 'Policy created successfully',
      data: { policyId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/policies
 * Get all policies
 */
router.get('/policies', (req, res) => {
  try {
    const policies = policyEngine.getAllPolicies();
    res.json({
      success: true,
      data: policies,
      count: policies.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/rbac/users/:userId/evaluate-policies
 * Evaluate policies for user
 */
router.post('/users/:userId/evaluate-policies', (req, res) => {
  try {
    const { userId } = req.params;
    const { action, resource } = req.body;

    const context = {
      userId,
      action,
      resource,
      ...req.body,
    };

    const decisions = policyEngine.evaluatePolicies(userId, context);

    res.json({
      success: true,
      userId,
      decisions,
      evaluationTime: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/rbac/users/:userId/access-decision
 * Make final access decision
 */
router.post('/users/:userId/access-decision', (req, res) => {
  try {
    const { userId } = req.params;
    const { action, resource } = req.body;

    const context = {
      userId,
      action,
      resource,
      ...req.body,
    };

    const decision = policyEngine.makeAccessDecision(userId, action, resource, context);

    res.json({
      success: true,
      userId,
      action,
      resource,
      decision,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// AUDIT & REPORTING ENDPOINTS
// ============================================

/**
 * GET /api/rbac/audit-logs
 * Get audit logs
 */
router.get('/audit-logs', (req, res) => {
  try {
    const query = {
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0,
      filters: req.query.filters || {},
    };

    const logs = auditingService.queryAuditLog(query);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/rbac/audit-report
 * Generate audit report
 */
router.post('/audit-report', (req, res) => {
  try {
    const config = req.body || {};

    const report = auditingService.generateAuditReport(config);

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/security-incidents
 * Get security incidents
 */
router.get('/security-incidents', (req, res) => {
  try {
    const incidents = auditingService.getSecurityIncidents();

    res.json({
      success: true,
      data: incidents,
      count: incidents.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/security-summary
 * Get security summary
 */
router.get('/security-summary', (req, res) => {
  try {
    const summary = auditingService.getSecuritySummary();

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/rbac/system-stats
 * Get system statistics
 */
router.get('/system-stats', (req, res) => {
  try {
    const stats = {
      roles: rbacSystem.getAllRoles().length,
      permissions: rbacSystem.getAllPermissions().length,
      users: rbacSystem.getAllUsers().length,
      policies: policyEngine.getAllPolicies().length,
      auditEvents: auditingService.auditLog.length,
      securityIncidents: auditingService.getSecurityIncidents().length,
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/rbac/export
 * Export RBAC data
 */
router.get('/export', (req, res) => {
  try {
    const data = rbacSystem.exportData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/rbac/import
 * Import RBAC data
 */
router.post('/import', (req, res) => {
  try {
    const { data } = req.body;

    if (!data) {
      return res.status(400).json({
        success: false,
        message: 'data is required',
      });
    }

    rbacSystem.importData(data);

    auditingService.logAuditEvent({
      userId: req.user?.id || 'system',
      action: 'IMPORT_DATA',
      resourceType: 'system',
      resourceId: 'rbac',
      status: 'success',
      severity: 'critical',
    });

    res.json({
      success: true,
      message: 'Data imported successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

/**
 * GET /api/rbac/health
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    components: {
      rbacSystem: 'operational',
      policyEngine: 'operational',
      auditingService: 'operational',
    },
  });
});

module.exports = router;
