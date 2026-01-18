// backend/config/roles.js

const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  HR: 'hr',
  ACCOUNTANT: 'accountant',
  DOCTOR: 'doctor',
  THERAPIST: 'therapist',
  RECEPTIONIST: 'receptionist',
  USER: 'user',
};

const PERMISSIONS = {
  // User Management
  CREATE_USER: 'create:user',
  READ_USER: 'read:user',
  UPDATE_USER: 'update:user',
  DELETE_USER: 'delete:user',

  // HR & Employees
  CREATE_EMPLOYEE: 'create:employee',
  READ_EMPLOYEE: 'read:employee',
  UPDATE_EMPLOYEE: 'update:employee',
  DELETE_EMPLOYEE: 'delete:employee',
  MANAGE_ATTENDANCE: 'manage:attendance',

  // Finance
  VIEW_FINANCE: 'read:finance',
  MANAGE_INVOICES: 'manage:invoices',
  MANAGE_PAYROLL: 'manage:payroll',

  // Rehabilitation & Medical
  CREATE_SESSION: 'create:session',
  READ_SESSION: 'read:session',
  UPDATE_SESSION: 'update:session',
  VIEW_PATIENT_RECORDS: 'read:patients',
  UPDATE_PATIENT_RECORDS: 'update:patients',

  // Reports
  VIEW_REPORTS: 'read:reports',
  EXPORT_REPORTS: 'export:reports',

  // System
  MANAGE_SETTINGS: 'manage:settings',
  VIEW_LOGS: 'read:logs',
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS), // Admin has all permissions

  [ROLES.MANAGER]: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.READ_EMPLOYEE,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.VIEW_FINANCE,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.EXPORT_REPORTS,
    PERMISSIONS.VIEW_PATIENT_RECORDS,
  ],

  [ROLES.HR]: [
    PERMISSIONS.CREATE_EMPLOYEE,
    PERMISSIONS.READ_EMPLOYEE,
    PERMISSIONS.UPDATE_EMPLOYEE,
    PERMISSIONS.DELETE_EMPLOYEE,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.MANAGE_PAYROLL,
    PERMISSIONS.READ_USER,
  ],

  [ROLES.ACCOUNTANT]: [PERMISSIONS.VIEW_FINANCE, PERMISSIONS.MANAGE_INVOICES, PERMISSIONS.MANAGE_PAYROLL, PERMISSIONS.VIEW_REPORTS],

  [ROLES.DOCTOR]: [
    PERMISSIONS.VIEW_PATIENT_RECORDS,
    PERMISSIONS.UPDATE_PATIENT_RECORDS,
    PERMISSIONS.READ_SESSION,
    PERMISSIONS.CREATE_SESSION,
    PERMISSIONS.UPDATE_SESSION,
  ],

  [ROLES.THERAPIST]: [PERMISSIONS.VIEW_PATIENT_RECORDS, PERMISSIONS.READ_SESSION, PERMISSIONS.UPDATE_SESSION],

  [ROLES.RECEPTIONIST]: [
    PERMISSIONS.READ_USER,
    PERMISSIONS.READ_SESSION,
    PERMISSIONS.CREATE_SESSION, // For scheduling
    PERMISSIONS.VIEW_PATIENT_RECORDS, // Basic contact info usually
  ],

  [ROLES.USER]: [
    // Basic user permissions
  ],
};

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
};
