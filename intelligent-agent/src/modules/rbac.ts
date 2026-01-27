// src/modules/rbac.ts
// Advanced Role-Based Access Control (RBAC) module
// Provides user roles, permissions, and policy enforcement for all system modules

import { Request, Response, NextFunction } from 'express';

export type Role = 'admin' | 'manager' | 'user' | 'auditor' | 'guest' | string;

export interface Permission {
  resource: string;
  action: string;
}

export interface Policy {
  role: Role;
  permissions: Permission[];
}

export interface UserRole {
  userId: string;
  roles: Role[];
}

// In-memory stores (replace with DB in production)
const policies: Policy[] = [];
const userRoles: UserRole[] = [];

// RBAC core logic
export function addRoleToUser(userId: string, role: Role) {
  let user = userRoles.find(u => u.userId === userId);
  if (!user) {
    user = { userId, roles: [] };
    userRoles.push(user);
  }
  if (!user.roles.includes(role)) user.roles.push(role);
}

export function removeRoleFromUser(userId: string, role: Role) {
  const user = userRoles.find(u => u.userId === userId);
  if (user) user.roles = user.roles.filter(r => r !== role);
}

export function setPolicy(role: Role, permissions: Permission[]) {
  const idx = policies.findIndex(p => p.role === role);
  if (idx >= 0) policies[idx].permissions = permissions;
  else policies.push({ role, permissions });
}

export function getUserRoles(userId: string): Role[] {
  return userRoles.find(u => u.userId === userId)?.roles || [];
}

export function getRolePermissions(role: Role): Permission[] {
  return policies.find(p => p.role === role)?.permissions || [];
}

export function checkPermission(userId: string, resource: string, action: string): boolean {
  const roles = getUserRoles(userId);
  for (const role of roles) {
    const perms = getRolePermissions(role);
    if (perms.some(p => p.resource === resource && p.action === action)) return true;
  }
  return false;
}

// Express middleware for RBAC enforcement
export function requirePermission(resource: string, action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Missing user ID' });
    if (!checkPermission(userId, resource, action)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

// REST API helpers (to be wired in server.ts)
export const rbacApi = {
  addRoleToUser,
  removeRoleFromUser,
  setPolicy,
  getUserRoles,
  getRolePermissions,
  checkPermission,
};
