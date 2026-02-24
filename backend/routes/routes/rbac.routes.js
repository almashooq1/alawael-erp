/**
 * RBAC Routes
 * مسارات التحكم بالوصول القائم على الأدوار
 * 
 * تجميع جميع endpoints للسياسات والأدوار والقواعس والتدقيق
 */

const express = require('express');
const rbacController = require('../controllers/rbac.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

/**
 * ============================================
 * POLICY ENDPOINTS
 * ============================================
 */

/**
 * POST /api/rbac/policies
 * Create a new policy
 * @param {string} name - Policy name
 * @param {string} effect - Allow or Deny
 * @param {array} actions - Actions
 * @param {object} conditions - Conditions
 */
router.post('/policies', rbacController.createPolicy);

/**
 * GET /api/rbac/policies
 * Get all policies
 * @query {string} effect - Filter by effect
 * @query {string} status - Filter by status
 */
router.get('/policies', rbacController.getAllPolicies);

/**
 * GET /api/rbac/policies/:policyId
 * Get a specific policy
 */
router.get('/policies/:policyId', rbacController.getPolicy);

/**
 * PUT /api/rbac/policies/:policyId
 * Update a policy
 */
router.put('/policies/:policyId', rbacController.updatePolicy);

/**
 * DELETE /api/rbac/policies/:policyId
 * Delete a policy
 */
router.delete('/policies/:policyId', rbacController.deletePolicy);

/**
 * POST /api/rbac/policies/:policyId/evaluate
 * Test policy evaluation
 * @param {object} body - Evaluation context
 */
router.post('/policies/:policyId/evaluate', rbacController.evaluatePolicy);

/**
 * ============================================
 * ROLE ENDPOINTS
 * ============================================
 */

/**
 * POST /api/rbac/roles
 * Create a new role
 * @param {string} name - Role name
 * @param {string} description - Role description
 * @param {number} level - Role level
 */
router.post('/roles', rbacController.createRole);

/**
 * GET /api/rbac/roles
 * Get all roles
 */
router.get('/roles', rbacController.getAllRoles);

/**
 * POST /api/rbac/roles/:roleId/permissions/:permId
 * Assign permission to role
 */
router.post('/roles/:roleId/permissions/:permId', rbacController.assignPermissionToRole);

/**
 * DELETE /api/rbac/roles/:roleId/permissions/:permId
 * Remove permission from role
 */
router.delete('/roles/:roleId/permissions/:permId', rbacController.removePermissionFromRole);

/**
 * ============================================
 * USER-ROLE ASSIGNMENT ENDPOINTS
 * ============================================
 */

/**
 * POST /api/rbac/users/:userId/roles/:roleId
 * Assign role to user
 */
router.post('/users/:userId/roles/:roleId', rbacController.assignRoleToUser);

/**
 * DELETE /api/rbac/users/:userId/roles/:roleId
 * Remove role from user
 */
router.delete('/users/:userId/roles/:roleId', rbacController.removeRoleFromUser);

/**
 * GET /api/rbac/users/:userId/permissions
 * Get user effective permissions
 */
router.get('/users/:userId/permissions', rbacController.getUserPermissions);

/**
 * ============================================
 * RULE ENDPOINTS
 * ============================================
 */

/**
 * POST /api/rbac/rules
 * Create a new rule
 * @param {string} name - Rule name
 * @param {array} conditions - Rule conditions
 * @param {array} actions - Rule actions
 */
router.post('/rules', rbacController.createRule);

/**
 * GET /api/rbac/rules
 * Get all rules
 * @query {string} search - Search rules
 * @query {boolean} enabled - Filter by enabled status
 */
router.get('/rules', rbacController.getAllRules);

/**
 * POST /api/rbac/rules/:ruleId/evaluate
 * Test rule evaluation
 */
router.post('/rules/:ruleId/evaluate', rbacController.evaluateRule);

/**
 * GET /api/rbac/rules/templates
 * Get rule templates
 */
router.get('/rules/templates', rbacController.getRuleTemplates);

/**
 * ============================================
 * AUDIT LOG ENDPOINTS
 * ============================================
 */

/**
 * GET /api/rbac/audit/logs
 * Query audit logs
 * @query {string} userId - Filter by user
 * @query {string} type - Filter by type
 * @query {number} page - Page number
 * @query {number} limit - Items per page
 */
router.get('/audit/logs', rbacController.getAuditLogs);

/**
 * GET /api/rbac/audit/user/:userId
 * Get user activity report
 */
router.get('/audit/user/:userId', rbacController.getUserActivityReport);

/**
 * GET /api/rbac/audit/compliance
 * Get compliance report
 */
router.get('/audit/compliance', rbacController.getComplianceReport);

/**
 * GET /api/rbac/audit/decisions
 * Get decision statistics
 */
router.get('/audit/decisions', rbacController.getDecisionStats);

/**
 * ============================================
 * STATISTICS ENDPOINTS
 * ============================================
 */

/**
 * GET /api/rbac/statistics
 * Get comprehensive RBAC statistics
 */
router.get('/statistics', rbacController.getStatistics);

/**
 * GET /api/rbac/health
 * Health check
 */
router.get('/health', rbacController.healthCheck);

module.exports = router;
