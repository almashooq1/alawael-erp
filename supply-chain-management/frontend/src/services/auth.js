/**
 * Auth Service - Token Management and Authentication
 * Handles JWT token generation, validation, and storage for frontend
 */

// Generate test token for development
export const generateTestToken = () => {
  const tokenData = {
    id: 'test-user-123',
    role: 'admin',
    email: 'test@example.com',
    name: 'Test User',
    permissions: ['read', 'write', 'delete'],
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };
  
  return Buffer.from(JSON.stringify(tokenData)).toString('base64');
};

// Store token in localStorage
export const setToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    localStorage.setItem('tokenExpiry', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString());
  }
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem('token');
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpiry');
  localStorage.removeItem('user');
};

// Check if token is expired
export const isTokenExpired = () => {
  const expiry = localStorage.getItem('tokenExpiry');
  if (!expiry) return true;
  return new Date() > new Date(expiry);
};

// Decode token (base64)
export const decodeToken = (token) => {
  try {
    return JSON.parse(Buffer.from(token, 'base64').toString());
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};

// Get current user from token
export const getCurrentUser = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const decoded = decodeToken(token);
    if (decoded && !isTokenExpired()) {
      return decoded;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  
  return null;
};

// Check if user has permission
export const hasPermission = (permission) => {
  const user = getCurrentUser();
  return user && user.permissions && user.permissions.includes(permission);
};

// Check if user has role
export const hasRole = (role) => {
  const user = getCurrentUser();
  return user && user.role === role;
};

// Logout user
export const logout = () => {
  removeToken();
  // Optionally call backend logout endpoint
  // return apiClient.post('/api/auth/logout');
};

export default {
  generateTestToken,
  setToken,
  getToken,
  removeToken,
  isTokenExpired,
  decodeToken,
  getCurrentUser,
  hasPermission,
  hasRole,
  logout,
};
