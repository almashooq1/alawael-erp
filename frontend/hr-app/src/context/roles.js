// Role and permission definitions for RBAC
// You can expand these as needed

export const ROLES = {
  ADMIN: 'admin',
  HR: 'hr',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
};

export const PERMISSIONS = {
  VIEW_EMPLOYEES: 'view_employees',
  EDIT_EMPLOYEES: 'edit_employees',
  DELETE_EMPLOYEES: 'delete_employees',
  ADD_EMPLOYEES: 'add_employees',
  // Add more as needed
};

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_EMPLOYEES,
    PERMISSIONS.EDIT_EMPLOYEES,
    PERMISSIONS.DELETE_EMPLOYEES,
    PERMISSIONS.ADD_EMPLOYEES,
    // ...all permissions
  ],
  [ROLES.HR]: [PERMISSIONS.VIEW_EMPLOYEES, PERMISSIONS.EDIT_EMPLOYEES, PERMISSIONS.ADD_EMPLOYEES],
  [ROLES.MANAGER]: [PERMISSIONS.VIEW_EMPLOYEES],
  [ROLES.EMPLOYEE]: [],
};

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission);
}
