/**
 * usePermission Hook
 * Phase 13 - Week 1: Permission Check Hook
 * Simplified hook for checking permissions in components
 */

import { useRBAC } from '../contexts/RBACContext';

/**
 * usePermission - Check if user has specific permission
 *
 * @param {string|array} permission - Permission(s) to check
 * @param {object} options - Options { requireAll: boolean }
 * @returns {boolean} - True if user has permission
 *
 * @example
 * const canWrite = usePermission('write:quality');
 * const canManage = usePermission(['write:quality', 'delete:quality'], { requireAll: true });
 */
export const usePermission = (permission, options = {}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useRBAC();

  if (!permission) return false;

  if (Array.isArray(permission)) {
    return options.requireAll ? hasAllPermissions(permission) : hasAnyPermission(permission);
  }

  return hasPermission(permission);
};

/**
 * usePermissions - Get multiple permission checks at once
 *
 * @param {object} permissionMap - Object mapping keys to permissions
 * @returns {object} - Object with same keys but boolean values
 *
 * @example
 * const { canRead, canWrite, canDelete } = usePermissions({
 *   canRead: 'read:quality',
 *   canWrite: 'write:quality',
 *   canDelete: 'delete:quality'
 * });
 */
export const usePermissions = (permissionMap = {}) => {
  const { hasPermission } = useRBAC();

  const result = {};
  Object.keys(permissionMap).forEach(key => {
    result[key] = hasPermission(permissionMap[key]);
  });

  return result;
};

export default usePermission;
