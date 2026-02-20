// Authentication Service
import apiClient from './apiClient';

const authService = {
  // Login
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  // Register
  register: async userData => {
    return await apiClient.post('/auth/register', userData);
  },

  // Logout
  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  // Get current user
  getCurrentUser: async () => {
    return await apiClient.get('/auth/me');
  },

  // Verify token
  verifyToken: async () => {
    return await apiClient.get('/auth/verify-token');
  },

  // Change password
  changePassword: async (oldPassword, newPassword) => {
    return await apiClient.patch('/auth/change-password', {
      oldPassword,
      newPassword,
    });
  },

  // Forgot password
  forgotPassword: async email => {
    return await apiClient.post('/auth/forgot-password', { email });
  },

  // Reset password
  resetPassword: async (token, newPassword) => {
    return await apiClient.post('/auth/reset-password', {
      token,
      newPassword,
    });
  },
};

export default authService;
