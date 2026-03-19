/* eslint-disable no-unused-vars */
/**
 * Authentication Mock Utility for Jest Tests
 * Provides mock implementations of auth middleware to bypass authentication in test environment
 * Allows tests to reach business logic without auth barriers
 */

const { Types } = require('mongoose');

// Mock user object for tests
const mockTestUser = {
  id: new Types.ObjectId().toString(),
  _id: new Types.ObjectId().toString(),
  email: 'test@alawael.com',
  username: 'testuser',
  roles: ['user', 'manager', 'admin'],
  permissions: ['read', 'write', 'delete'],
  isActive: true,
  token: 'mock-jwt-token-test',
};

/**
 * Mock authenticate middleware
 * Injects test user into request context
 */
const mockAuthenticate = (req, res, next) => {
  req.user = mockTestUser;
  req.isAuthenticated = true;
  req.token = mockTestUser.token;
  next();
};

/**
 * Mock authorize middleware (role-based)
 * Accepts any required roles for tests
 */
const mockAuthorize = (requiredRoles = []) => {
  return (req, res, next) => {
    req.user = mockTestUser;
    req.userRoles = mockTestUser.roles;
    // In test mode, always authorize
    next();
  };
};

/**
 * Mock API key validation
 */
const mockApiKeyValidation = (req, res, next) => {
  req.apiKey = 'mock-api-key-test';
  req.client = { id: 'test-client', name: 'Test Client' };
  next();
};

/**
 * Setup function to mock all auth middleware globally
 * Call this in test setup files or beforeAll hooks
 */
const setupAuthMocks = () => {
  // Mock the auth middleware module
  jest.mock(
    '../middleware/auth',
    () => ({
      authenticate: mockAuthenticate,
      authorize: mockAuthorize,
      verifyToken: token => mockTestUser,
      generateTestToken: () => mockTestUser.token,
    }),
    { virtual: true }
  );

  // Mock API key middleware
  jest.mock(
    '../middleware/apiKey.middleware',
    () => ({
      validateApiKey: mockApiKeyValidation,
    }),
    { virtual: true }
  );
};

/**
 * Attach mock user to request (for use in test setup)
 */
const attachMockUser = req => {
  req.user = mockTestUser;
  req.isAuthenticated = true;
  return req;
};

/**
 * Create request with auth context
 * Use this in test cases to attach user to request builder
 */
const withAuthContext = request => {
  return {
    ...request,
    user: mockTestUser,
    isAuthenticated: true,
  };
};

module.exports = {
  mockTestUser,
  mockAuthenticate,
  mockAuthorize,
  mockApiKeyValidation,
  setupAuthMocks,
  attachMockUser,
  withAuthContext,
};
