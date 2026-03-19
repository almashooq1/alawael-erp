/**
 * permissions — RBAC permission constants.
 * ثوابت الصلاحيات والأدوار
 */

/** Permission actions */
export const ACTIONS = {
  VIEW: 'view',
  CREATE: 'create',
  EDIT: 'edit',
  DELETE: 'delete',
  APPROVE: 'approve',
  EXPORT: 'export',
  PRINT: 'print',
  MANAGE: 'manage',
};

/** Resource areas */
export const RESOURCES = {
  DASHBOARD: 'dashboard',
  USERS: 'users',
  EMPLOYEES: 'employees',
  STUDENTS: 'students',
  BENEFICIARIES: 'beneficiaries',
  SESSIONS: 'sessions',
  CARE_PLANS: 'care_plans',
  FINANCE: 'finance',
  ACCOUNTING: 'accounting',
  PAYROLL: 'payroll',
  HR: 'hr',
  ATTENDANCE: 'attendance',
  LEAVES: 'leaves',
  INVENTORY: 'inventory',
  PURCHASING: 'purchasing',
  DOCUMENTS: 'documents',
  REPORTS: 'reports',
  COMMUNICATIONS: 'communications',
  QUALITY: 'quality',
  FLEET: 'fleet',
  MAINTENANCE: 'maintenance',
  CRM: 'crm',
  CONTRACTS: 'contracts',
  TRAINING: 'training',
  SETTINGS: 'settings',
  AUDIT_LOGS: 'audit_logs',
  ADMIN: 'admin',
};

/**
 * Build a permission string.
 * @param {string} resource
 * @param {string} action
 * @returns {string} e.g., "employees:view"
 */
export const buildPermission = (resource, action) => `${resource}:${action}`;

/** Role hierarchy (higher index = more permissions) */
export const ROLE_HIERARCHY = {
  staff: 0,
  parent: 0,
  driver: 1,
  receptionist: 2,
  nurse: 3,
  teacher: 3,
  therapist: 3,
  doctor: 4,
  accountant: 4,
  hr: 4,
  it: 5,
  supervisor: 6,
  manager: 7,
  admin: 8,
  super_admin: 9,
};

/**
 * Check if role A has equal or higher privilege than role B.
 * @param {string} roleA
 * @param {string} roleB
 * @returns {boolean}
 */
export const hasHigherRole = (roleA, roleB) => {
  return (ROLE_HIERARCHY[roleA] || 0) >= (ROLE_HIERARCHY[roleB] || 0);
};

/** Default permissions per role group */
export const ROLE_PERMISSIONS = {
  super_admin: ['*'],
  admin: [
    `${RESOURCES.DASHBOARD}:*`,
    `${RESOURCES.USERS}:*`,
    `${RESOURCES.EMPLOYEES}:*`,
    `${RESOURCES.SETTINGS}:*`,
    `${RESOURCES.AUDIT_LOGS}:${ACTIONS.VIEW}`,
    `${RESOURCES.REPORTS}:*`,
    `${RESOURCES.ADMIN}:*`,
  ],
  manager: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.EMPLOYEES}:${ACTIONS.VIEW}`,
    `${RESOURCES.EMPLOYEES}:${ACTIONS.EDIT}`,
    `${RESOURCES.REPORTS}:${ACTIONS.VIEW}`,
    `${RESOURCES.REPORTS}:${ACTIONS.EXPORT}`,
    `${RESOURCES.SESSIONS}:*`,
    `${RESOURCES.CARE_PLANS}:*`,
    `${RESOURCES.QUALITY}:*`,
  ],
  doctor: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.BENEFICIARIES}:*`,
    `${RESOURCES.SESSIONS}:*`,
    `${RESOURCES.CARE_PLANS}:*`,
    `${RESOURCES.REPORTS}:${ACTIONS.VIEW}`,
    `${RESOURCES.DOCUMENTS}:${ACTIONS.VIEW}`,
    `${RESOURCES.DOCUMENTS}:${ACTIONS.CREATE}`,
  ],
  therapist: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.SESSIONS}:${ACTIONS.VIEW}`,
    `${RESOURCES.SESSIONS}:${ACTIONS.CREATE}`,
    `${RESOURCES.SESSIONS}:${ACTIONS.EDIT}`,
    `${RESOURCES.CARE_PLANS}:${ACTIONS.VIEW}`,
    `${RESOURCES.BENEFICIARIES}:${ACTIONS.VIEW}`,
    `${RESOURCES.DOCUMENTS}:${ACTIONS.VIEW}`,
    `${RESOURCES.DOCUMENTS}:${ACTIONS.CREATE}`,
    `${RESOURCES.REPORTS}:${ACTIONS.VIEW}`,
  ],
  teacher: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.STUDENTS}:${ACTIONS.VIEW}`,
    `${RESOURCES.SESSIONS}:${ACTIONS.VIEW}`,
    `${RESOURCES.SESSIONS}:${ACTIONS.CREATE}`,
    `${RESOURCES.ATTENDANCE}:${ACTIONS.VIEW}`,
    `${RESOURCES.ATTENDANCE}:${ACTIONS.CREATE}`,
    `${RESOURCES.REPORTS}:${ACTIONS.VIEW}`,
  ],
  accountant: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.FINANCE}:*`,
    `${RESOURCES.ACCOUNTING}:*`,
    `${RESOURCES.PAYROLL}:${ACTIONS.VIEW}`,
    `${RESOURCES.REPORTS}:${ACTIONS.VIEW}`,
    `${RESOURCES.REPORTS}:${ACTIONS.EXPORT}`,
  ],
  hr: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.HR}:*`,
    `${RESOURCES.EMPLOYEES}:*`,
    `${RESOURCES.ATTENDANCE}:*`,
    `${RESOURCES.LEAVES}:*`,
    `${RESOURCES.PAYROLL}:*`,
    `${RESOURCES.TRAINING}:*`,
    `${RESOURCES.REPORTS}:${ACTIONS.VIEW}`,
  ],
  receptionist: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.BENEFICIARIES}:${ACTIONS.VIEW}`,
    `${RESOURCES.BENEFICIARIES}:${ACTIONS.CREATE}`,
    `${RESOURCES.SESSIONS}:${ACTIONS.VIEW}`,
    `${RESOURCES.ATTENDANCE}:${ACTIONS.VIEW}`,
    `${RESOURCES.COMMUNICATIONS}:${ACTIONS.VIEW}`,
  ],
  parent: [
    `${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`,
    `${RESOURCES.SESSIONS}:${ACTIONS.VIEW}`,
    `${RESOURCES.REPORTS}:${ACTIONS.VIEW}`,
    `${RESOURCES.COMMUNICATIONS}:${ACTIONS.VIEW}`,
    `${RESOURCES.COMMUNICATIONS}:${ACTIONS.CREATE}`,
    `${RESOURCES.DOCUMENTS}:${ACTIONS.VIEW}`,
  ],
  staff: [`${RESOURCES.DASHBOARD}:${ACTIONS.VIEW}`],
};

/**
 * Check if a role has a specific permission.
 * @param {string} role
 * @param {string} permission — "resource:action"
 * @returns {boolean}
 */
export const roleHasPermission = (role, permission) => {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;
  const [resource, action] = permission.split(':');
  return (
    perms.includes(permission) || perms.includes(`${resource}:*`) || perms.includes(`*:${action}`)
  );
};

export default {
  ACTIONS,
  RESOURCES,
  buildPermission,
  ROLE_HIERARCHY,
  hasHigherRole,
  ROLE_PERMISSIONS,
  roleHasPermission,
};
