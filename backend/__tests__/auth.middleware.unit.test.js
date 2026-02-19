/**
 * Unit Tests for Auth Middleware
 * Testing all authentication and authorization functions
 *
 * This test suite covers:
 * - JWT token verification
 * - Role-based authorization
 * - Admin access control
 * - Optional authentication
 * - Error handling
 */

const jwt = require('jsonwebtoken');

// Test JWT secret (matches the test environment secret)
const JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = JWT_SECRET;

// Require after env setup so auth.js picks the test secret
// eslint-disable-next-line global-require
const auth = require('../middleware/auth');

describe('Auth Middleware Unit Tests', () => {
  // Mock request and response objects
  const createMockReq = (headers = {}) => ({
    headers: {
      authorization: null,
      ...headers,
    },
    user: null,
  });

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      jsonData: null,
      status: jest.fn(function (code) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(function (data) {
        this.jsonData = data;
        return this;
      }),
    };
    return res;
  };

  const createMockNext = () => jest.fn();

  // Helper to generate valid JWT tokens
  const generateToken = (payload, expiresIn = '1h') => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn });
  };

  describe('authenticateToken', () => {
    test('should allow request with valid Bearer token', done => {
      const token = generateToken({ userId: '123', role: 'user' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      // Give async jwt.verify time to complete
      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.userId).toBe('123');
        done();
      });
    });

    test('should reject request without token', done => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      setImmediate(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.jsonData).toHaveProperty('message');
        expect(next).not.toHaveBeenCalled();
        done();
      });
    });

    test('should reject request with invalid token', done => {
      const req = createMockReq({
        authorization: 'Bearer invalid.token.here',
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      setImmediate(() => {
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.jsonData).toHaveProperty('message');
        expect(next).not.toHaveBeenCalled();
        done();
      });
    });

    test('should reject request with expired token', done => {
      const expiredToken = jwt.sign(
        { userId: '123' },
        JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );
      const req = createMockReq({
        authorization: `Bearer ${expiredToken}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      setImmediate(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.jsonData).toHaveProperty('expired');
        expect(res.jsonData.expired).toBe(true);
        done();
      });
    });

    test('should allow request with pre-existing user (from previous middleware)', done => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'admin' }; // Pre-set by previous middleware
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user.userId).toBe('123');
        done();
      });
    });

    test('should handle Bearer token format correctly', done => {
      const token = generateToken({ userId: '456' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user.userId).toBe('456');
        done();
      });
    });
  });

  describe('requireAdmin', () => {
    test('should allow admin users to proceed', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'admin' };
      const res = createMockRes();
      const next = createMockNext();

      auth.requireAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject non-admin users', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'user' };
      const res = createMockRes();
      const next = createMockNext();

      auth.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData).toHaveProperty('message', 'Admin access required');
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request without user', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      auth.requireAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    test('should allow user with matching role', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'manager' };
      const res = createMockRes();
      const next = createMockNext();

      const managerRole = auth.requireRole('manager');
      managerRole(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject user with non-matching role', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'user' };
      const res = createMockRes();
      const next = createMockNext();

      const adminRole = auth.requireRole('admin');
      adminRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData).toHaveProperty('message', 'Forbidden');
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject request without user', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      const someRole = auth.requireRole('some-role');
      someRole(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuth', () => {
    test('should allow request without token', done => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      auth.optionalAuth(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeNull();
        done();
      });
    });

    test('should authenticate valid token when provided', done => {
      const token = generateToken({ userId: '123', role: 'user' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.optionalAuth(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.userId).toBe('123');
        done();
      });
    });

    test('should ignore invalid token and proceed', done => {
      const req = createMockReq({
        authorization: 'Bearer invalid.token',
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.optionalAuth(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeNull();
        done();
      });
    });

    test('should use pre-existing user', done => {
      const token = generateToken({ userId: '456' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      req.user = { userId: '999', role: 'admin' }; // Pre-existing user
      const res = createMockRes();
      const next = createMockNext();

      auth.optionalAuth(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user.userId).toBe('999'); // Should keep pre-existing user
        done();
      });
    });
  });

  describe('authorize (multiple roles)', () => {
    test('should allow user with one of the authorized roles', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'moderator' };
      const res = createMockRes();
      const next = createMockNext();

      const authorizeFn = auth.authorize(['admin', 'moderator', 'user']);
      authorizeFn(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject user without authorized role', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'guest' };
      const res = createMockRes();
      const next = createMockNext();

      const authorizeFn = auth.authorize(['admin', 'moderator']);
      authorizeFn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.jsonData).toHaveProperty('message', 'Insufficient permissions');
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated request', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      const authorizeFn = auth.authorize(['admin']);
      authorizeFn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.jsonData).toHaveProperty('message', 'Authentication required');
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow any role if none specified', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'any-role' };
      const res = createMockRes();
      const next = createMockNext();

      const authorizeFn = auth.authorize([]);
      authorizeFn(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('authorizeRole (alias)', () => {
    test('should work as alias for authorize', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'admin' };
      const res = createMockRes();
      const next = createMockNext();

      const authorizeFn = auth.authorizeRole(['admin', 'moderator']);
      authorizeFn(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    test('should reject unauthorized role', () => {
      const req = createMockReq();
      req.user = { userId: '123', role: 'user' };
      const res = createMockRes();
      const next = createMockNext();

      const authorizeFn = auth.authorizeRole(['admin']);
      authorizeFn(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireAuth', () => {
    test('should authenticate with valid Bearer token', () => {
      const token = generateToken({ userId: '123', role: 'user' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe('123');
    });

    test('should reject request without token', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      auth.requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.jsonData).toHaveProperty('message', 'Unauthorized');
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid token', () => {
      const req = createMockReq({
        authorization: 'Bearer invalid-token',
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.requireAuth(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('authenticate (alias)', () => {
    test('should be available as export', () => {
      expect(auth.authenticate).toBeDefined();
      expect(typeof auth.authenticate).toBe('function');
    });
  });

  describe('protect (alias)', () => {
    test('should be available as export', () => {
      expect(auth.protect).toBeDefined();
      expect(typeof auth.protect).toBe('function');
    });
  });

  describe('Integration scenarios', () => {
    test('should handle middleware chain: authenticateToken -> requireRole', done => {
      const token = generateToken({ userId: '123', role: 'manager' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      let nextCallCount = 0;
      const next = jest.fn(() => {
        nextCallCount++;
      });

      // First middleware: authenticate
      auth.authenticateToken(req, res, next);

      setImmediate(() => {
        // Second middleware: require role
        const requireManagerRole = auth.requireRole('manager');
        const nextForRole = jest.fn();
        const resForRole = createMockRes();
        requireManagerRole(req, resForRole, nextForRole);

        expect(nextForRole).toHaveBeenCalled();
        expect(resForRole.status).not.toHaveBeenCalled();
        done();
      });
    });

    test('should handle admin check after authentication', done => {
      const token = generateToken({ userId: '123', role: 'admin' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = jest.fn();

      // Authenticate first
      auth.authenticateToken(req, res, next);

      setImmediate(() => {
        // Then check admin
        const res2 = createMockRes();
        const next2 = jest.fn();
        auth.requireAdmin(req, res2, next2);

        expect(next2).toHaveBeenCalled();
        expect(res2.status).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
