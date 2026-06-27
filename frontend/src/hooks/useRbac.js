import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacAPI } from '../services/api';

const RBAC_KEYS = {
  roles: ['rbac', 'roles'],
  roleDetail: (role) => ['rbac', 'roles', role],
  permissions: ['rbac', 'permissions'],
  userPermissions: (userId) => ['rbac', 'users', userId, 'permissions'],
};

/**
 * useRoles
 * جلب كل الـ roles
 */
export function useRoles() {
  return useQuery({
    queryKey: RBAC_KEYS.roles,
    queryFn: rbacAPI.getRoles,
    staleTime: 10 * 60 * 1000, // 10 minutes — roles rarely change
  });
}

/**
 * useRoleDetail
 * جلب تفاصيل role محدد
 * @param {string} role — اسم الـ role
 */
export function useRoleDetail(role) {
  return useQuery({
    queryKey: RBAC_KEYS.roleDetail(role),
    queryFn: () => rbacAPI.getRoleDetail(role),
    enabled: !!role,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * usePermissions
 * جلب كل الصلاحيات المتاحة
 */
export function usePermissions() {
  return useQuery({
    queryKey: RBAC_KEYS.permissions,
    queryFn: rbacAPI.getPermissions,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * useUserPermissions
 * جلب صلاحيات user محدد
 * @param {string} userId — ID الـ user
 */
export function useUserPermissions(userId) {
  return useQuery({
    queryKey: RBAC_KEYS.userPermissions(userId),
    queryFn: () => rbacAPI.getUserPermissions(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * useUpdateUserRole
 * Mutation لتحديث role الـ user
 * Invalidates userPermissions query بعد النجاح
 */
export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, role }) => rbacAPI.updateUserRole(userId, role),
    onSuccess: (_, { userId }) => {
      // Invalidate user permissions for this user
      queryClient.invalidateQueries({ queryKey: RBAC_KEYS.userPermissions(userId) });
      // Also invalidate roles list in case of new role creation
      queryClient.invalidateQueries({ queryKey: RBAC_KEYS.roles });
    },
  });
}

/**
 * useUpdateUserPermissions
 * Mutation لتحديث صلاحيات user
 */
export function useUpdateUserPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, customPermissions, deniedPermissions }) =>
      rbacAPI.updateUserPermissions(userId, customPermissions, deniedPermissions),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: RBAC_KEYS.userPermissions(userId) });
    },
  });
}

// Default export
export default {
  useRoles,
  useRoleDetail,
  usePermissions,
  useUserPermissions,
  useUpdateUserRole,
  useUpdateUserPermissions,
};
