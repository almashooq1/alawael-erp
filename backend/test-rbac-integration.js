#!/usr/bin/env node

/**
 * RBAC Advanced System Integration Test
 * اختبار شامل لنظام الصلاحيات المتقدم
 */

const AdvancedRBACSystem = require('./services/advanced-rbac.system');
const RBACPolicyEngine = require('./services/rbac-policy-engine');
const RBACAuditingService = require('./services/rbac-auditing.service');
const IntelligentRBACMiddleware = require('./middleware/rbac-intelligent.middleware');

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

class RBACIntegrationTest {
  constructor() {
    this.rbacSystem = new AdvancedRBACSystem();
    this.policyEngine = new RBACPolicyEngine(this.rbacSystem);
    this.auditingService = new RBACAuditingService();
    this.intelligentMiddleware = new IntelligentRBACMiddleware(this.rbacSystem, this.policyEngine, this.auditingService);
    this.passed = 0;
    this.failed = 0;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  log_test(name) {
    this.log(`\n📝 ${name}`, 'cyan');
  }

  pass(message) {
    this.passed++;
    this.log(`  ✅ ${message}`, 'green');
  }

  fail(message, error) {
    this.failed++;
    this.log(`  ❌ ${message}`, 'red');
    if (error) this.log(`     Error: ${error}`, 'red');
  }

  async runAllTests() {
    console.log('\n' + '='.repeat(60));
    this.log('🚀 RBAC Advanced System Integration Test', 'cyan');
    console.log('='.repeat(60) + '\n');

    // Test 1: Role Management
    this.test_role_management();

    // Test 2: Permission Management
    this.test_permission_management();

    // Test 3: User-Role Assignment
    this.test_user_role_assignment();

    // Test 4: Permission Checking
    this.test_permission_checking();

    // Test 5: ABAC Features
    this.test_abac_features();

    // Test 6: Policy Engine
    this.test_policy_engine();

    // Test 7: Auditing Service
    this.test_auditing_service();

    // Test 8: Intelligent Middleware
    this.test_intelligent_middleware();

    // Test 9: Integration Test
    this.test_integration();

    // Test 10: Data Export/Import
    this.test_export_import();

    // Summary
    this.print_summary();
  }

  test_role_management() {
    this.log_test('Role Management');

    try {
      // Create role
      this.rbacSystem.createRole('test-admin', {
        name: 'Test Admin',
        description: 'Test administrator role',
        level: 5,
      });
      this.pass('Create role');

      // Get role
      const role = this.rbacSystem.getRole('test-admin');
      if (role && role.name === 'Test Admin') {
        this.pass('Get role');
      } else {
        this.fail('Get role - role not found or incorrect');
      }

      // Get all roles
      const roles = this.rbacSystem.getAllRoles();
      if (roles.length > 0) {
        this.pass(`Get all roles (${roles.length} total)`);
      } else {
        this.fail('Get all roles - no roles found');
      }

      // Update role
      this.rbacSystem.updateRole('test-admin', { description: 'Updated description' });
      const updatedRole = this.rbacSystem.getRole('test-admin');
      if (updatedRole.description === 'Updated description') {
        this.pass('Update role');
      } else {
        this.fail('Update role - description not updated');
      }
    } catch (error) {
      this.fail('Role Management', error.message);
    }
  }

  test_permission_management() {
    this.log_test('Permission Management');

    try {
      // Create permission
      this.rbacSystem.createPermission('test:write', {
        name: 'Test Write',
        resource: 'test',
        action: 'write',
        riskLevel: 'high',
      });
      this.pass('Create permission');

      // Get all permissions
      const permissions = this.rbacSystem.getAllPermissions();
      if (permissions.length > 0) {
        this.pass(`Get all permissions (${permissions.length} total)`);
      } else {
        this.fail('Get all permissions - no permissions found');
      }

      // Assign permission to role
      this.rbacSystem.assignPermissionToRole('test-admin', 'test:write');
      const rolePerms = this.rbacSystem.getRolePermissions('test-admin');
      if (rolePerms.some(p => p === 'test:write')) {
        this.pass('Assign permission to role');
      } else {
        this.fail('Assign permission to role - permission not assigned');
      }

      // Remove permission from role
      this.rbacSystem.removePermissionFromRole('test-admin', 'test:write');
      const updatedPerms = this.rbacSystem.getRolePermissions('test-admin');
      if (!updatedPerms.some(p => p === 'test:write')) {
        this.pass('Remove permission from role');
      } else {
        this.fail('Remove permission from role - permission still exists');
      }
    } catch (error) {
      this.fail('Permission Management', error.message);
    }
  }

  test_user_role_assignment() {
    this.log_test('User-Role Assignment');

    try {
      const testUserId = 'test-user-' + Date.now();

      // Assign role to user
      this.rbacSystem.assignRoleToUser(testUserId, 'test-admin');
      this.pass('Assign role to user');

      // Get user roles
      const userRoles = this.rbacSystem.getUserRoles(testUserId);
      if (userRoles.some(r => r.id === 'test-admin')) {
        this.pass('Get user roles');
      } else {
        this.fail('Get user roles - role not found');
      }

      // Remove role from user
      this.rbacSystem.removeRoleFromUser(testUserId, 'test-admin');
      const updatedRoles = this.rbacSystem.getUserRoles(testUserId);
      if (!updatedRoles.some(r => r.id === 'test-admin')) {
        this.pass('Remove role from user');
      } else {
        this.fail('Remove role from user - role still exists');
      }
    } catch (error) {
      this.fail('User-Role Assignment', error.message);
    }
  }

  test_permission_checking() {
    this.log_test('Permission Checking');

    try {
      const testUserId = 'test-user-' + Date.now();

      // Create test permission
      this.rbacSystem.createPermission('permission-test:read', {
        name: 'Permission Test Read',
        resource: 'permission-test',
        action: 'read',
        riskLevel: 'low',
      });

      // Assign role with permission
      this.rbacSystem.assignRoleToUser(testUserId, 'test-admin');
      this.rbacSystem.assignPermissionToRole('test-admin', 'permission-test:read');

      // Check permission
      const hasPermission = this.rbacSystem.hasPermission(testUserId, 'permission-test:read');
      if (hasPermission) {
        this.pass('Check user permission');
      } else {
        this.fail('Check user permission - permission check failed');
      }

      // Check non-existent permission
      const noPermission = this.rbacSystem.hasPermission(testUserId, 'non-existent:action');
      if (!noPermission) {
        this.pass('Check non-existent permission');
      } else {
        this.fail('Check non-existent permission - should return false');
      }
    } catch (error) {
      this.fail('Permission Checking', error.message);
    }
  }

  test_abac_features() {
    this.log_test('ABAC (Attribute-Based Access Control)');

    try {
      const testUserId = 'test-user-abac-' + Date.now();

      // Set user attributes
      this.rbacSystem.setUserAttributes(testUserId, {
        department: 'IT',
        clearance: 'SECRET',
        level: 5,
      });
      this.pass('Set user attributes');

      // Get user attributes
      const attributes = this.rbacSystem.getUserAttributes(testUserId);
      if (attributes.department === 'IT' && attributes.clearance === 'SECRET') {
        this.pass('Get user attributes');
      } else {
        this.fail('Get user attributes - attributes not set correctly');
      }

      // Calculate user scope
      this.rbacSystem.assignRoleToUser(testUserId, 'test-admin');
      const scope = this.rbacSystem.calculateUserScope(testUserId);
      if (scope) {
        this.pass('Calculate user scope');
      } else {
        this.fail('Calculate user scope - scope not calculated');
      }
    } catch (error) {
      this.fail('ABAC Features', error.message);
    }
  }

  test_policy_engine() {
    this.log_test('Policy Engine');

    try {
      // Create policy
      this.policyEngine.createPolicy('test-policy', {
        effect: 'Allow',
        priority: 10,
        principals: ['test-admin'],
        actions: ['read', 'write'],
        resources: ['test-resource'],
        conditions: [],
      });
      this.pass('Create policy');

      // Get all policies
      const policies = this.policyEngine.getAllPolicies();
      if (policies.length > 0) {
        this.pass(`Get all policies (${policies.length} total)`);
      } else {
        this.fail('Get all policies - no policies found');
      }

      // Get specific policy
      const policy = this.policyEngine.getPolicy('test-policy');
      if (policy && policy.effect === 'Allow') {
        this.pass('Get specific policy');
      } else {
        this.fail('Get specific policy - policy not found or incorrect');
      }

      // Create conditional rule
      this.policyEngine.createConditionalRule('test-rule', {
        operator: 'AND',
        conditions: [
          { field: 'time', operator: 'greater_than', value: '08:00' },
          { field: 'time', operator: 'less_than', value: '17:00' },
        ],
      });
      this.pass('Create conditional rule');
    } catch (error) {
      this.fail('Policy Engine', error.message);
    }
  }

  test_auditing_service() {
    this.log_test('Auditing Service');

    try {
      // Log audit event
      this.auditingService.logAuditEvent({
        userId: 'test-user',
        action: 'TEST_ACTION',
        resource: 'test',
        resourceId: 'test-1',
        status: 'success',
        severity: 'low',
      });
      this.pass('Log audit event');

      // Query audit log
      const logs = this.auditingService.queryAuditLog({
        limit: 100,
        filters: { action: 'TEST_ACTION' },
      });
      if (logs && logs.results && logs.results.length > 0) {
        this.pass('Query audit log');
      } else {
        this.fail('Query audit log - no logs found');
      }

      // Get security summary
      const summary = this.auditingService.getSecuritySummary();
      if (summary && summary.last7Days) {
        this.pass('Get security summary');
      } else {
        this.fail('Get security summary - summary not generated');
      }

      // Report security incident
      this.auditingService.reportSecurityIncident({
        type: 'BRUTE_FORCE_ATTEMPT',
        userId: 'test-user',
        severity: 'high',
        details: 'Test incident',
      });
      this.pass('Report security incident');
    } catch (error) {
      this.fail('Auditing Service', error.message);
    }
  }

  test_intelligent_middleware() {
    this.log_test('Intelligent Middleware');

    try {
      const testUserId = 'test-user-' + Date.now();

      // Create session
      const sessionId = this.intelligentMiddleware.createSession(testUserId, {
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
      });
      if (sessionId) {
        this.pass('Create session');
      } else {
        this.fail('Create session - session not created');
      }

      // Validate session
      const isValid = this.intelligentMiddleware.validateSession(sessionId);
      if (isValid) {
        this.pass('Validate session');
      } else {
        this.fail('Validate session - session validation failed');
      }

      // Calculate risk score
      const riskScore = this.intelligentMiddleware.calculateRiskScore(testUserId, {
        action: 'delete_user',
        ipAddress: '127.0.0.1',
      });
      if (typeof riskScore === 'number') {
        this.pass(`Calculate risk score (${riskScore.toFixed(2)})`);
      } else {
        this.fail('Calculate risk score - score not calculated');
      }

      // Get performance stats
      const stats = this.intelligentMiddleware.getPerformanceStats();
      if (stats && stats.cacheHitRate !== undefined) {
        this.pass('Get performance stats');
      } else {
        this.fail('Get performance stats - stats not available');
      }
    } catch (error) {
      this.fail('Intelligent Middleware', error.message);
    }
  }

  test_integration() {
    this.log_test('Full Integration Test');

    try {
      const userId = 'integration-test-user-' + Date.now();

      // 1. Create roles
      this.rbacSystem.createRole('role-1', { name: 'Role 1', level: 3 });
      this.rbacSystem.createRole('role-2', { name: 'Role 2', level: 2 });

      // 2. Create permissions
      this.rbacSystem.createPermission('action:read', { resource: 'action', action: 'read' });
      this.rbacSystem.createPermission('action:write', { resource: 'action', action: 'write' });
      this.rbacSystem.createPermission('action:delete', { resource: 'action', action: 'delete' });

      // 3. Assign permissions to roles
      this.rbacSystem.assignPermissionToRole('role-1', 'action:read');
      this.rbacSystem.assignPermissionToRole('role-1', 'action:write');
      this.rbacSystem.assignPermissionToRole('role-2', 'action:read');

      // 4. Assign roles to user
      this.rbacSystem.assignRoleToUser(userId, 'role-1');

      // 5. Check permissions
      const hasRead = this.rbacSystem.hasPermission(userId, 'action:read');
      const hasWrite = this.rbacSystem.hasPermission(userId, 'action:write');
      const hasDelete = this.rbacSystem.hasPermission(userId, 'action:delete');

      if (hasRead && hasWrite && !hasDelete) {
        this.pass('User has correct permissions from role hierarchy');
      } else {
        this.fail('Permission inheritance not working correctly');
      }

      // 6. Create and evaluate policies
      this.policyEngine.createPolicy('integration-policy', {
        effect: 'Allow',
        principal: { role: 'role-1' },
        action: ['read', 'write'],
        resource: ['action'],
      });

      const policies = this.policyEngine.evaluatePolicies(userId, {
        action: 'read',
        resource: 'action',
      });

      if (policies && (policies.policiesApplied?.length > 0 || policies.finalDecision === 'Allow')) {
        this.pass('Policy evaluation works correctly');
      } else {
        this.fail('Policy evaluation failed');
      }

      // 7. Log audit events
      this.auditingService.logAuditEvent({
        userId,
        action: 'INTEGRATION_TEST',
        resourceType: 'test',
        resourceId: 'integration-1',
        status: 'success',
      });

      this.pass('Full integration flow completed successfully');
    } catch (error) {
      this.fail('Full Integration Test', error.message);
    }
  }

  test_export_import() {
    this.log_test('Data Export/Import');

    try {
      // Export data
      const exportedData = this.rbacSystem.exportData();
      if (exportedData && exportedData.roles) {
        this.pass('Export RBAC data');
      } else {
        this.fail('Export RBAC data - export failed');
      }

      // Create new system for import test
      const newSystem = new AdvancedRBACSystem();

      // Import data
      newSystem.importData(exportedData);
      const importedRoles = newSystem.getAllRoles();

      if (importedRoles.length > 0) {
        this.pass('Import RBAC data');
      } else {
        this.fail('Import RBAC data - import failed');
      }
    } catch (error) {
      this.fail('Data Export/Import', error.message);
    }
  }

  print_summary() {
    console.log('\n' + '='.repeat(60));
    const total = this.passed + this.failed;
    const percentage = total > 0 ? ((this.passed / total) * 100).toFixed(2) : 0;

    this.log(`\n📊 Test Results:`, 'cyan');
    this.log(`  Total Tests: ${total}`, 'cyan');
    this.log(`  Passed: ${this.passed} ✅`, 'green');
    this.log(`  Failed: ${this.failed} ❌`, this.failed > 0 ? 'red' : 'green');
    this.log(`  Success Rate: ${percentage}%\n`, percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');

    if (this.failed === 0) {
      this.log('🎉 All tests passed! System is ready for production.', 'green');
    } else {
      this.log('⚠️  Some tests failed. Please review the errors above.', 'yellow');
    }

    console.log('='.repeat(60) + '\n');

    process.exit(this.failed > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new RBACIntegrationTest();
tester.runAllTests();
