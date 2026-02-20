// RBAC Service
import apiClient from './apiClient';

const rbacService = {
  // Get all roles
  getRoles: async () => {
    return await apiClient.get('/rbac/roles');
  },

  // Create role
  createRole: async roleData => {
    return await apiClient.post('/rbac/roles', roleData);
  },

  // Update role
  updateRole: async (roleId, roleData) => {
    return await apiClient.put(`/rbac/roles/${roleId}`, roleData);
  },

  // Delete role
  deleteRole: async roleId => {
    return await apiClient.delete(`/rbac/roles/${roleId}`);
  },

  // Get all permissions
  getPermissions: async () => {
    return await apiClient.get('/rbac/permissions');
  },

  // Assign permission to role
  assignPermission: async (roleId, permissionId) => {
    return await apiClient.post(`/rbac/roles/${roleId}/permissions`, {
      permissionId,
    });
  },

  // Remove permission from role
  removePermission: async (roleId, permissionId) => {
    return await apiClient.delete(`/rbac/roles/${roleId}/permissions/${permissionId}`);
  },

  // Check user permission
  checkPermission: async (action, resource) => {
    return await apiClient.get('/rbac/check-permission', {
      params: { action, resource },
    });
  },
};

export default rbacService;
