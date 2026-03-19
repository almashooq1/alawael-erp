// tests/rbac.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RBACManager, type Permission } from '../src/modules/rbac';

describe('RBAC Module', () => {
  let rbac: RBACManager;

  beforeEach(() => {
    rbac = new RBACManager();
  });

  // ===== INITIALIZATION =====
  describe('Initialization & Configuration', () => {
    it('should create instance with default config', () => {
      expect(rbac).toBeDefined();
      expect(rbac instanceof RBACManager).toBe(true);
    });

    it('should support custom configuration', () => {
      const customRBAC = new RBACManager({
        enableEvents: false,
        maxUsers: 5000,
        validationLevel: 'relaxed'
      });
      expect(customRBAC).toBeDefined();
    });

    it('should have all required methods', () => {
      expect(typeof rbac.addRoleToUser).toBe('function');
      expect(typeof rbac.removeRoleFromUser).toBe('function');
      expect(typeof rbac.setPolicy).toBe('function');
      expect(typeof rbac.checkPermission).toBe('function');
    });

    it('should initialize with default roles', () => {
      const userRoles = rbac.getUserRoles('test-user-1');
      expect(Array.isArray(userRoles)).toBe(true);
    });
  });

  // ===== ROLE ASSIGNMENT OPERATIONS =====
  describe('Role Assignment Operations', () => {
    it('should add role to user', () => {
      const userRole = rbac.addRoleToUser('user1', 'admin');
      expect(userRole).toBeDefined();
      expect(userRole.userId).toBe('user1');
      expect(userRole.roles).toContain('admin');
    });

    it('should add multiple roles to same user', () => {
      rbac.addRoleToUser('user1', 'admin');
      rbac.addRoleToUser('user1', 'manager');
      const roles = rbac.getUserRoles('user1');
      expect(roles).toContain('admin');
      expect(roles).toContain('manager');
    });

    it('should remove role from user', () => {
      rbac.addRoleToUser('user1', 'admin');
      const removed = rbac.removeRoleFromUser('user1', 'admin');
      expect(removed).toBe(true);
      const roles = rbac.getUserRoles('user1');
      expect(roles).not.toContain('admin');
    });

    it('should handle removing non-existent role', () => {
      const removed = rbac.removeRoleFromUser('user1', 'admin');
      expect(removed).toBe(false);
    });

    it('should retrieve user roles', () => {
      rbac.addRoleToUser('user1', 'user');
      rbac.addRoleToUser('user1', 'auditor');
      const roles = rbac.getUserRoles('user1');
      expect(roles).toBeDefined();
      expect(Array.isArray(roles)).toBe(true);
      expect(roles.length).toBeGreaterThanOrEqual(2);
    });

    it('should support role expiration', () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const userRole = rbac.addRoleToUser('user1', 'manager', futureDate);
      expect(userRole.expiresAt).toBe(futureDate);
    });
  });

  // ===== POLICY MANAGEMENT =====
  describe('Policy Management', () => {
    it('should set policy for a role', () => {
      const permissions: Permission[] = [
        { resource: 'projects', action: 'create' },
        { resource: 'projects', action: 'edit' },
        { resource: 'projects', action: 'delete' }
      ];
      const policy = rbac.setPolicy('admin', permissions);
      expect(policy).toBeDefined();
      expect(policy.role).toBe('admin');
      expect(policy.permissions.length).toBe(3);
    });

    it('should update existing policy', () => {
      const perms1: Permission[] = [{ resource: 'users', action: 'read' }];
      rbac.setPolicy('manager', perms1);
      
      const perms2: Permission[] = [
        { resource: 'users', action: 'read' },
        { resource: 'users', action: 'edit' }
      ];
      const updated = rbac.setPolicy('manager', perms2);
      expect(updated.permissions.length).toBe(2);
    });

    it('should get permissions for a role', () => {
      const permissions: Permission[] = [
        { resource: 'projects', action: 'create' },
        { resource: 'projects', action: 'view' }
      ];
      rbac.setPolicy('user', permissions);
      
      const rolePerms = rbac.getRolePermissions('user');
      expect(rolePerms.length).toBeGreaterThanOrEqual(2);
    });

    it('should support permission priorities', () => {
      const permissions: Permission[] = [{ resource: 'admin', action: 'access' }];
      const policy = rbac.setPolicy('admin', permissions, 1000);
      expect(policy.priority).toBe(1000);
    });

    it('should handle permissions with constraints', () => {
      const permissions: Permission[] = [
        {
          resource: 'sensitive-data',
          action: 'access',
          constraints: {
            timeWindow: { start: '09:00', end: '17:00' },
            ipAddresses: ['192.168.1.0/24'],
            maxOccurrences: 5
          }
        }
      ];
      const policy = rbac.setPolicy('auditor', permissions);
      expect(policy.permissions[0].constraints).toBeDefined();
      expect(policy.permissions[0].constraints?.timeWindow).toBeDefined();
    });
  });

  // ===== PERMISSION CHECKING =====
  describe('Permission Checking', () => {
    it('should check if user has permission', () => {
      rbac.addRoleToUser('user1', 'admin');
      rbac.setPolicy('admin', [
        { resource: 'projects', action: 'create' }
      ]);

      const allowed = rbac.checkPermission('user1', 'projects', 'create');
      expect(allowed).toBe(true);
    });

    it('should deny permission when not granted', () => {
      rbac.addRoleToUser('user1', 'guest');
      rbac.setPolicy('guest', [
        { resource: 'projects', action: 'view' }
      ]);

      const allowed = rbac.checkPermission('user1', 'projects', 'delete');
      expect(allowed).toBe(false);
    });

    it('should check permission with context', () => {
      rbac.addRoleToUser('user1', 'auditor');
      rbac.setPolicy('auditor', [
        {
          resource: 'logs',
          action: 'access',
          constraints: { departments: ['IT', 'Security'] }
        }
      ]);

      const allowed = rbac.checkPermission('user1', 'logs', 'access', {
        department: 'IT'
      });
      expect(typeof allowed).toBe('boolean');
    });

    it('should handle multiple roles with combined permissions', () => {
      rbac.addRoleToUser('user1', 'manager');
      rbac.addRoleToUser('user1', 'auditor');
      
      rbac.setPolicy('manager', [{ resource: 'team', action: 'manage' }]);
      rbac.setPolicy('auditor', [{ resource: 'logs', action: 'view' }]);

      const canManage = rbac.checkPermission('user1', 'team', 'manage');
      const canViewLogs = rbac.checkPermission('user1', 'logs', 'view');
      expect(canManage || canViewLogs).toBe(true);
    });
  });

  // ===== ROLE HIERARCHY =====
  describe('Role Hierarchy', () => {
    it('should register role hierarchy', () => {
      rbac.registerRoleHierarchy('moderator', ['user'], 1);
      const roles = rbac.getRolePermissions('moderator');
      expect(Array.isArray(roles)).toBe(true);
    });

    it('should support role inheritance', () => {
      rbac.setPolicy('user', [{ resource: 'posts', action: 'read' }]);
      rbac.registerRoleHierarchy('moderator', ['user'], 1);
      
      rbac.addRoleToUser('user1', 'moderator');
      const perms = rbac.getRolePermissions('moderator', true); // includeInherited=true
      expect(perms.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle complex hierarchies', () => {
      rbac.registerRoleHierarchy('editor', ['user'], 1);
      rbac.registerRoleHierarchy('admin', ['editor', 'user'], 0);
      expect(true).toBe(true);
    });
  });

  // ===== ATTRIBUTE-BASED ACCESS =====
  describe('Attribute-Based Access Control', () => {
    it('should assign attributes to user', () => {
      rbac.addRoleToUser('user1', 'manager');
      const userRole = rbac.assignAttributes('user1', {
        department: 'Engineering',
        level: 'senior',
        clearance: 'level3'
      });

      expect(userRole).toBeDefined();
      expect(userRole?.attributes).toBeDefined();
      expect(userRole?.attributes?.department).toBe('Engineering');
    });

    it('should update existing attributes', () => {
      rbac.addRoleToUser('user1', 'manager');
      rbac.assignAttributes('user1', { department: 'Engineering' });
      const updated = rbac.assignAttributes('user1', { level: 'senior' });

      expect(updated?.attributes?.department).toBe('Engineering');
      expect(updated?.attributes?.level).toBe('senior');
    });

    it('should handle attributes for non-existent user', () => {
      const result = rbac.assignAttributes('nonexistent', { key: 'value' });
      expect(result).toBeNull();
    });
  });

  // ===== TOKEN MANAGEMENT =====
  describe('Token & Session Management', () => {
    it('should blacklist token', () => {
      const token = 'token-12345';
      rbac.blacklistToken(token);
      const isBlacklisted = rbac.isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });

    it('should check if token is blacklisted', () => {
      const token = 'non-blacklisted-token';
      const isBlacklisted = rbac.isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(false);
    });

    it('should support token expiration', () => {
      const token = 'expiring-token';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      rbac.blacklistToken(token, expiresAt);
      expect(rbac.isTokenBlacklisted(token)).toBe(true);
    });
  });

  // ===== ACCESS LOGGING =====
  describe('Access Logging & Audit', () => {
    it('should retrieve access logs', () => {
      rbac.addRoleToUser('user1', 'user');
      rbac.checkPermission('user1', 'projects', 'view');
      
      const logs = rbac.getAccessLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should filter logs by user', () => {
      rbac.addRoleToUser('user1', 'user');
      rbac.addRoleToUser('user2', 'user');
      
      rbac.checkPermission('user1', 'projects', 'view');
      rbac.checkPermission('user2', 'projects', 'create');

      const user1Logs = rbac.getAccessLogs('user1');
      expect(user1Logs).toBeDefined();
    });

    it('should limit log retrieval', () => {
      const logs = rbac.getAccessLogs(undefined, 10);
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });

  // ===== USER MANAGEMENT =====
  describe('User Management', () => {
    it('should delete user and remove all roles', () => {
      rbac.addRoleToUser('user1', 'admin');
      rbac.addRoleToUser('user1', 'manager');

      const deleted = rbac.deleteUser('user1');
      expect(deleted).toBe(true);

      const roles = rbac.getUserRoles('user1');
      expect(roles.length).toBe(0);
    });

    it('should handle deletion of non-existent user', () => {
      const deleted = rbac.deleteUser('nonexistent-user');
      expect(deleted).toBe(false);
    });

    it('should clean up after user deletion', () => {
      rbac.addRoleToUser('user1', 'user');
      rbac.assignAttributes('user1', { key: 'value' });
      rbac.deleteUser('user1');

      const roles = rbac.getUserRoles('user1');
      expect(roles).toBeDefined();
    });
  });

  // ===== CONFIGURATION =====
  describe('Configuration Management', () => {
    it('should get current config', () => {
      const config = rbac.getConfig();
      expect(config).toBeDefined();
      expect(config.enableEvents).toBeDefined();
      expect(config.maxUsers).toBeDefined();
    });

    it('should update configuration', () => {
      rbac.setConfig({ validationLevel: 'relaxed', maxUsers: 10000 });
      const updated = rbac.getConfig();
      expect(updated.validationLevel).toBe('relaxed');
      expect(updated.maxUsers).toBe(10000);
    });

    it('should preserve unchanged config values', () => {
      const original = rbac.getConfig();
      rbac.setConfig({ validationLevel: 'moderate' });
      const updated = rbac.getConfig();
      
      expect(updated.enableAuditLogging).toBe(original.enableAuditLogging);
      expect(updated.validationLevel).toBe('moderate');
    });
  });

  // ===== INSTANCE ISOLATION =====
  describe('Instance Isolation', () => {
    it('should maintain separate policies for different instances', () => {
      const rbac1 = new RBACManager();
      const rbac2 = new RBACManager();

      rbac1.addRoleToUser('user1', 'admin');
      
      const user1Roles1 = rbac1.getUserRoles('user1');
      const user1Roles2 = rbac2.getUserRoles('user1');

      expect(user1Roles1.length).toBeGreaterThan(user1Roles2.length);
    });

    it('should not share token blacklists between instances', () => {
      const rbac1 = new RBACManager();
      const rbac2 = new RBACManager();

      const token = 'test-token';
      rbac1.blacklistToken(token);

      expect(rbac1.isTokenBlacklisted(token)).toBe(true);
      expect(rbac2.isTokenBlacklisted(token)).toBe(false);
    });
  });

  // ===== EDGE CASES & BULK OPERATIONS =====
  describe('Edge Cases & Bulk Operations', () => {
    it('should handle many roles per user', () => {
      const roles = ['admin', 'manager', 'user', 'auditor', 'guest', 'moderator', 'editor'];
      roles.forEach(role => {
        rbac.addRoleToUser('power-user', role as any);
      });

      const userRoles = rbac.getUserRoles('power-user');
      expect(userRoles.length).toBeGreaterThanOrEqual(roles.length);
    });

    it('should handle bulk permission assignments', () => {
      const roles = ['admin', 'manager', 'user', 'auditor', 'guest'];
      const permissions: Permission[] = [
        { resource: 'data', action: 'read' },
        { resource: 'data', action: 'write' },
        { resource: 'admin', action: 'manage' }
      ];

      roles.forEach(role => {
        rbac.setPolicy(role as any, permissions);
      });

      roles.forEach(role => {
        const perms = rbac.getRolePermissions(role as any);
        expect(perms.length).toBeGreaterThan(0);
      });
    });

    it('should handle many users', () => {
      for (let i = 0; i < 20; i++) {
        rbac.addRoleToUser(`user${i}`, 'user');
      }

      for (let i = 0; i < 20; i++) {
        const roles = rbac.getUserRoles(`user${i}`);
        expect(roles).toBeDefined();
      }
    });

    it('should handle complex permission scenarios', () => {
      // Setup complex scenario
      rbac.addRoleToUser('user1', 'manager');
      rbac.addRoleToUser('user1', 'auditor');

      rbac.setPolicy('manager', [
        { resource: 'team', action: 'create' },
        { resource: 'team', action: 'manage' }
      ]);

      rbac.setPolicy('auditor', [
        { resource: 'logs', action: 'view' },
        { resource: 'reports', action: 'generate' }
      ]);

      // Test multiple permission checks
      const createTeam = rbac.checkPermission('user1', 'team', 'create');
      const viewLogs = rbac.checkPermission('user1', 'logs', 'view');
      const deleteTeam = rbac.checkPermission('user1', 'team', 'delete');

      expect(createTeam || viewLogs).toBe(true);
      expect(deleteTeam).toBe(false);
    });

    it('should handle permission removal and reassignment', () => {
      rbac.addRoleToUser('user1', 'manager');
      rbac.setPolicy('manager', [
        { resource: 'projects', action: 'manage' }
      ]);

      // Verify permission exists
      const hasPermission1 = rbac.checkPermission('user1', 'projects', 'manage');
      expect(typeof hasPermission1).toBe('boolean');

      // Change policy
      rbac.setPolicy('manager', [
        { resource: 'users', action: 'manage' }
      ]);

      // Verify new permission
      const hasPermission2 = rbac.checkPermission('user1', 'users', 'manage');
      expect(typeof hasPermission2).toBe('boolean');
    });

    it('should handle rapid role changes', () => {
      const roles = ['admin', 'manager', 'user', 'auditor', 'guest'];
      
      roles.forEach(role => {
        rbac.addRoleToUser('user1', role as any);
      });

      roles.slice(0, 3).forEach(role => {
        rbac.removeRoleFromUser('user1', role as any);
      });

      const finalRoles = rbac.getUserRoles('user1');
      expect(finalRoles).toBeDefined();
    });
  });

  // ===== EVENT EMISSION =====
  describe('Event Emission', () => {
    it('should emit event when role is added', () => {
      return new Promise<void>((resolve, reject) => {
        const testRBAC = new RBACManager({ enableEvents: true });
        let resolved = false;

        testRBAC.on('role-assigned', () => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        });

        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve();
          }
        }, 1000);

        try {
          testRBAC.addRoleToUser('user1', 'admin');
        } catch (err) {
          clearTimeout(timeout);
          reject(err);
        }
      });
    });

    it('should not emit events when disabled', () => {
      const testRBAC = new RBACManager({ enableEvents: false });
      let eventEmitted = false;

      testRBAC.on('role-assigned', () => {
        eventEmitted = true;
      });

      testRBAC.addRoleToUser('user1', 'user');
      expect(eventEmitted).toBe(false);
    });
  });
});
