/**
 * usePermissions — React hook for permission checks
 *
 * Reads the current user's permissions from AuthContext and exposes
 * convenience helpers for conditional rendering and access control.
 *
 * Usage:
 *   const { can, canAny, canAll, role, roleLevel } = usePermissions();
 *   if (can('finance', 'read')) { ... }
 *
 * @module hooks/usePermissions
 */

import { useMemo } from 'react';
import { useAuth } from 'contexts/AuthContext';

export default function usePermissions() {
  const { currentUser } = useAuth();

  const permissions = useMemo(() => currentUser?.permissions || [], [currentUser?.permissions]);

  const role = currentUser?.role || 'guest';
  const roleLevel = currentUser?.roleLevel ?? 0;
  const roleLabel = currentUser?.roleLabel || role;

  /**
   * Check if the user has a specific permission.
   * @param {string} resource — e.g. 'finance'
   * @param {string} action   — e.g. 'read'
   * @returns {boolean}
   */
  const can = (resource, action) => {
    if (role === 'super_admin') return true;
    return (
      permissions.includes(`${resource}:${action}`) ||
      permissions.includes(`${resource}:*`) ||
      permissions.includes('*:*')
    );
  };

  /**
   * Check if the user has ALL of the listed permissions.
   * @param {Array<[string,string]>} checks — e.g. [['finance','read'], ['reports','export']]
   */
  const canAll = (...checks) => checks.every(([r, a]) => can(r, a));

  /**
   * Check if the user has ANY of the listed permissions.
   * @param {Array<[string,string]>} checks
   */
  const canAny = (...checks) => checks.some(([r, a]) => can(r, a));

  /**
   * Check if the user's role level is at least `minLevel`.
   */
  const isAtLeast = minLevel => roleLevel >= minLevel;

  /**
   * Check if the user's role is one of the given roles.
   */
  const hasRole = (...roles) => roles.flat().includes(role);

  return {
    permissions,
    role,
    roleLevel,
    roleLabel,
    can,
    canAll,
    canAny,
    isAtLeast,
    hasRole,
  };
}
