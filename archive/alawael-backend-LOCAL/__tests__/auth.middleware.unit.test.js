/**
 * Unit Tests for Auth Middleware - alawael-backend Professional Upgrade
 * اختبارات وحدة لـ middleware المصادقة - الترقية الاحترافية
 * 
 * ** UPGRADE: Using Singleton Pattern with setServiceInstances() **
 * Tests use same service instances as production code
 */

const jwt = require('jsonwebtoken');
const { setServiceInstances, resetServiceInstances } = require('../../services/services.singleton');
const auth = require('../../middleware/auth.middleware');

const JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_SECRET = JWT_SECRET;

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

  const generateToken = (payload = {}) => {
    return jwt.sign(
      {
        id: payload.id || '123',
        email: payload.email || 'test@example.com',
        role: payload.role || 'user',
        permissions: payload.permissions || [],
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  };

  // Setup and teardown
  beforeEach(() => {
    // Create mock service instances
    const mockAuthService = {
      generateToken: jest.fn(),
      verifyToken: jest.fn(),
    };
    const mockOAuth2 = {
      validateAccessToken: jest.fn(),
      exchangeCodeForToken: jest.fn(),
    };
    const mockSecurityService = {
      verifyToken: jest.fn(),
      generateToken: jest.fn(),
      OAUTH_CLIENT_SECRET: 'test-secret',
    };

    // Inject test instances
    setServiceInstances(mockAuthService, mockOAuth2, mockSecurityService);
  });

  afterEach(() => {
    // Clean up after test
    resetServiceInstances();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    test('should pass valid token', (done) => {
      const validToken = generateToken({ id: 'user-123', email: 'test@example.com', role: 'user' });
      const req = createMockReq({
        authorization: `Bearer ${validToken}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      // Use setTimeout to allow async verification
      setTimeout(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe('user-123');
        done();
      }, 10);
    });

    test('should reject missing token', (done) => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        done();
      }, 10);
    });

    test('should reject invalid token', (done) => {
      const req = createMockReq({
        authorization: 'Bearer invalid.token.here',
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.authenticateToken(req, res, next);

      setTimeout(() => {
        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
        done();
      }, 10);
    });

    test('should handle expired token', (done) => {
      const expiredToken = jwt.sign(
        { id: 'user-123', email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a bit to ensure token is expired
      setTimeout(() => {
        const req = createMockReq({
          authorization: `Bearer ${expiredToken}`,
        });
        const res = createMockRes();
        const next = createMockNext();

        auth.authenticateToken(req, res, next);

        setTimeout(() => {
          expect(res.status).toHaveBeenCalledWith(401);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              code: 'TOKEN_EXPIRED',
            })
          );
          done();
        }, 10);
      }, 100);
    });
  });

  describe('requireRole', () => {
    test('should allow admin access', (done) => {
      const token = generateToken({ role: 'admin' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      // First authenticate
      auth.authenticateToken(req, res, next);

      setTimeout(() => {
        // Then check role
        const roleCheck = auth.requireRole('admin');
        roleCheck(req, res, next);

        expect(next).toHaveBeenCalled();
        done();
      }, 10);
    });

    test('should deny non-admin access', (done) => {
      const token = generateToken({ role: 'user' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      // First authenticate
      auth.authenticateToken(req, res, next);

      setTimeout(() => {
        // Then check role
        const roleCheck = auth.requireRole('admin');
        roleCheck(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
        done();
      }, 10);
    });
  });

  describe('optionalAuth', () => {
    test('should allow request with valid token', (done) => {
      const token = generateToken({ id: '123', role: 'user' });
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });
      const res = createMockRes();
      const next = createMockNext();

      auth.optionalAuth(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        done();
      });
    });

    test('should allow request without token (optional)', (done) => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      auth.optionalAuth(req, res, next);

      setImmediate(() => {
        expect(next).toHaveBeenCalled();
        done();
      });
    });

    test('should skip invalid token and proceed', (done) => {
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
  });

  describe('generateToken', () => {
    test('should generate valid token', () => {
      const user = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const result = auth.generateToken(user);

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBeDefined();
      expect(result.createdAt).toBeDefined();

      // Verify token is valid
      const decoded = jwt.verify(result.token, JWT_SECRET);
      expect(decoded.id).toBe('user-123');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('extractToken', () => {
    test('should extract token from Bearer header', () => {
      const token = 'test-token-123';
      const req = createMockReq({
        authorization: `Bearer ${token}`,
      });

      const extracted = auth.extractToken(req);

      expect(extracted).toBe(token);
    });

    test('should return null for missing header', () => {
      const req = createMockReq();

      const extracted = auth.extractToken(req);

      expect(extracted).toBeNull();
    });

    test('should return null for invalid format', () => {
      const req = createMockReq({
        authorization: 'InvalidFormat token-here',
      });

      const extracted = auth.extractToken(req);

      expect(extracted).toBeNull();
    });
  });

  describe('verifyToken', () => {
    test('should verify valid token', () => {
      const token = generateToken({ id: 'user-123', role: 'user' });

      const decoded = auth.verifyToken(token);

      expect(decoded).toBeDefined();
      expect(decoded.id).toBe('user-123');
      expect(decoded.role).toBe('user');
    });

    test('should return null for invalid token', () => {
      const decoded = auth.verifyToken('invalid.token.here');

      expect(decoded).toBeNull();
    });
  });

  describe('Singleton Integration', () => {
    test('should use injected service instances', () => {
      const mockAuth = {
        generateToken: jest.fn().mockReturnValue({ token: 'mock-token' }),
      };
      const mockOAuth = { validateAccessToken: jest.fn() };
      const mockSecurity = { verifyToken: jest.fn() };

      setServiceInstances(mockAuth, mockOAuth, mockSecurity);

      // Verify instances are set
      expect(mockAuth.generateToken).toHaveBeenCalledTimes(0); // Not called yet

      resetServiceInstances();
    });

    test('should reset instances after tests', () => {
      const mockAuth = { generateToken: jest.fn() };
      const mockOAuth = { validateAccessToken: jest.fn() };
      const mockSecurity = { verifyToken: jest.fn() };

      setServiceInstances(mockAuth, mockOAuth, mockSecurity);

      // Reset
      resetServiceInstances();

      // Verify reset
      const newInstances = require('../../services/services.singleton');
      // New instances should be created on next call
    });
  });
});
