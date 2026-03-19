/**
 * RBAC & Audit Components Index
 * Phase 13 - Week 1: Centralized Exports
 */

// Context Providers
export { RBACProvider, useRBAC, ROLES } from './contexts/RBACContext';

// Guards
export { RoleGuard } from './components/rbac/RoleGuard';
export { PermissionGuard, Can, Cannot } from './components/rbac/PermissionGuard';

// Management Components
export { UserRoleManager } from './components/rbac/UserRoleManager';
export { AuditLogViewer } from './components/audit/AuditLogViewer';

// Hooks
export { usePermission, usePermissions } from './hooks/usePermission';
export { useAuditLog } from './hooks/useAuditLog';
