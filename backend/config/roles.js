/* eslint-disable no-unused-vars */
// backend/config/roles.js — Re-exports from unified RBAC config
// For backward compatibility. New code should import from config/rbac.config.js

const {
  ROLES,
  ALL_ROLES,
  ACTIONS,
  RESOURCES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  resolvePermissions,
  flattenPermissions,
  hasPermission,
  getRoleLevel,
  isAtLeast,
  getRoleLabel,
} = require('./rbac.config');

// Legacy flat permission strings (kept for backward compatibility)
const PERMISSIONS = {
  // User Management
  CREATE_USER: 'users:create',
  READ_USER: 'users:read',
  UPDATE_USER: 'users:update',
  DELETE_USER: 'users:delete',

  // HR & Employees
  CREATE_EMPLOYEE: 'employees:create',
  READ_EMPLOYEE: 'employees:read',
  UPDATE_EMPLOYEE: 'employees:update',
  DELETE_EMPLOYEE: 'employees:delete',
  MANAGE_ATTENDANCE: 'attendance:manage',

  // Finance
  VIEW_FINANCE: 'finance:read',
  MANAGE_INVOICES: 'invoices:manage',
  MANAGE_PAYROLL: 'payroll:manage',

  // Rehabilitation & Medical
  CREATE_SESSION: 'sessions:create',
  READ_SESSION: 'sessions:read',
  UPDATE_SESSION: 'sessions:update',
  VIEW_PATIENT_RECORDS: 'patients:read',
  UPDATE_PATIENT_RECORDS: 'patients:update',

  // Reports
  VIEW_REPORTS: 'reports:read',
  EXPORT_REPORTS: 'reports:export',

  // System
  MANAGE_SETTINGS: 'settings:manage',
  VIEW_LOGS: 'audit_logs:read',
};

module.exports = {
  ROLES,
  ALL_ROLES,
  ACTIONS,
  RESOURCES,
  PERMISSIONS,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  resolvePermissions,
  flattenPermissions,
  hasPermission,
  getRoleLevel,
  isAtLeast,
  getRoleLabel,
};
