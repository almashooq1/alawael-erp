// Users Service
import apiClient from './apiClient';

const usersService = {
  // Get all users
  getUsers: async (params = {}) => {
    return await apiClient.get('/users', { params });
  },

  // Get user by ID
  getUserById: async userId => {
    return await apiClient.get(`/users/${userId}`);
  },

  // Create user
  createUser: async userData => {
    return await apiClient.post('/users', userData);
  },

  // Update user
  updateUser: async (userId, userData) => {
    return await apiClient.put(`/users/${userId}`, userData);
  },

  // Delete user
  deleteUser: async userId => {
    return await apiClient.delete(`/users/${userId}`);
  },

  // Update user status
  updateUserStatus: async (userId, status) => {
    return await apiClient.patch(`/users/${userId}/status`, { status });
  },

  // Assign role to user
  assignRole: async (userId, roleId) => {
    return await apiClient.post(`/users/${userId}/roles`, { roleId });
  },

  // Get user profile
  getUserProfile: async userId => {
    return await apiClient.get(`/users/${userId}/profile`);
  },

  // Update user profile
  updateUserProfile: async (userId, profileData) => {
    return await apiClient.patch(`/users/${userId}/profile`, profileData);
  },
  // Get current user (me)
  getMe: async () => {
    return await apiClient.get('/users/me');
  },
  // Update current user (me)
  updateMe: async data => {
    return await apiClient.patch('/users/me', data);
  },
};

export default usersService;
