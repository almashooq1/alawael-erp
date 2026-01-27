// نظام صلاحيات تفصيلية
export type Permission = 'view_reports' | 'export_data' | 'manage_users' | 'manage_sources' | 'view_audit' | 'view_contracts' | 'manage_contracts' | 'custom';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

const roles: Role[] = [
  { id: 'admin', name: 'مدير', permissions: ['view_reports','export_data','manage_users','manage_sources','view_audit','view_contracts','manage_contracts'] },
  { id: 'viewer', name: 'مشاهد', permissions: ['view_reports','view_contracts'] },
];

export function addRole(name: string, permissions: Permission[]) {
  const role: Role = { id: Math.random().toString(36).slice(2), name, permissions };
  roles.push(role);
  return role;
}

export function updateRole(id: string, patch: Partial<Role>) {
  const role = roles.find(r => r.id === id);
  if (role) Object.assign(role, patch);
  return role;
}

export function listRoles() {
  return roles;
}

export function getRolePermissions(roleId: string) {
  const role = roles.find(r => r.id === roleId);
  return role ? role.permissions : [];
}
