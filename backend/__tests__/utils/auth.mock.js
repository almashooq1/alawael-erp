/* eslint-disable no-unused-vars */
/**
 * Authentication Mock Utility
 * Provides mock authentication for test environments
 * Allows tests to bypass auth middleware and reach business logic
 */

const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  role: 'admin',
  permissions: ['read', 'write', 'delete', 'admin'],
  name: 'Test User',
  department: 'Testing',
};

const mockToken = 'Bearer mock-test-token-12345';

/**
 * Setup auth mocking for Jest tests
 * Must be called BEFORE requiring server.js
 */
function setupAuthMocks() {
  // Mock the authenticate middleware
  jest.mock('../../middleware/auth', () => ({
    authenticate: (req, res, next) => {
      // Inject mock user into request
      req.user = mockUser;
      req.token = mockToken;
      return next();
    },
    authorize:
      (roles = []) =>
      (req, res, next) => {
        // Check if mock user has required roles
        if (roles.length === 0 || roles.includes(mockUser.role) || roles.includes('admin')) {
          return next();
        }
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      },
    apiKeyAuth: (req, res, next) => {
      req.apiKey = 'mock-api-key';
      return next();
    },
    verifyApiKey: (req, res, next) => {
      req.apiKey = 'mock-api-key';
      return next();
    },
    verifyJWT: token => {
      return mockUser;
    },
  }));
}

/**
 * Alternative: Inline auth mocking without jest.mock
 * Use in individual test files if needed
 */
function inlineAuthMock(app) {
  // Override authenticate middleware on app
  const originalUse = app.use;
  app.use = function (...args) {
    const maybeMW = args[args.length - 1];

    // If it's our auth middleware, replace it
    if (maybeMW && typeof maybeMW === 'function') {
      if (maybeMW.name === 'authenticate') {
        args[args.length - 1] = (req, res, next) => {
          req.user = mockUser;
          req.token = mockToken;
          return next();
        };
      }
    }

    return originalUse.apply(this, args);
  };

  return app;
}

/**
 * Get mock user for assertions
 */
function getMockUser() {
  return { ...mockUser };
}

/**
 * Get mock token for manual requests
 */
function getMockToken() {
  return mockToken;
}

/**
 * Create test user with custom role
 */
function createMockUserWithRole(role) {
  return {
    ...mockUser,
    role: role,
    permissions: role === 'admin' ? ['read', 'write', 'delete', 'admin'] : ['read'],
  };
}

module.exports = {
  setupAuthMocks,
  inlineAuthMock,
  getMockUser,
  getMockToken,
  createMockUserWithRole,
  mockUser,
  mockToken,
};
