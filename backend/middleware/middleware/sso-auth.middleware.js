/**
 * Advanced SSO Authentication Middleware
 * Middleware متقدم لـ SSO مع دعم OAuth 2.0 و OpenID Connect
 */

const jwt = require('jwt-simple');
const SSOService = require('../services/sso.service');
const logger = require('../utils/logger');

class SSOAuthMiddleware {
  constructor() {
    this.ssoService = new SSOService();
    this.JWT_SECRET = process.env.JWT_SECRET || 'sso-secret-key';
  }

  /**
   * التحقق من SSO Token - Middleware رئيسي
   * Verify SSO token middleware
   */
  verifySSOToken = (_options = {}) => {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);

        if (!token) {
          return res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'No token provided',
            code: 'MISSING_TOKEN'
          });
        }

        // Get session ID from request or token
        const sessionId = req.headers['x-session-id'] || this.extractSessionId(token);

        if (!sessionId) {
          return res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'No session ID provided',
            code: 'MISSING_SESSION_ID'
          });
        }

        // Verify session
        const verification = await this.ssoService.verifySession(sessionId, token);

        if (!verification.valid) {
          return res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: verification.error,
            code: 'INVALID_SESSION'
          });
        }

        // Attach user and session info to request
        req.user = verification.user;
        req.session = verification.session;
        req.sessionId = sessionId;

        // Update activity tracking
        req.activityMetadata = {
          timestamp: Date.now(),
          endpoint: req.originalUrl,
          method: req.method,
          ip: this.getClientIp(req),
          userAgent: req.get('user-agent')
        };

        next();
      } catch (error) {
        logger.error('SSO token verification failed:', error);
        return res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED'
        });
      }
    };
  };

  /**
   * التحقق الاختياري من Token
   * Optional SSO verification
   */
  verifyOptionalSSO = async (req, res, next) => {
    try {
      const token = this.extractToken(req);

      if (token) {
        const sessionId = req.headers['x-session-id'] || this.extractSessionId(token);

        if (sessionId) {
          const verification = await this.ssoService.verifySession(sessionId, token);

          if (verification.valid) {
            req.user = verification.user;
            req.session = verification.session;
            req.sessionId = sessionId;
          }
        }
      }

      next();
    } catch (error) {
      logger.debug('Optional SSO verification failed:', error.message);
      // Continue without authentication
      next();
    }
  };

  /**
   * التحقق من الأدوار والصلاحيات
   * Role and permission verification
   */
  requireRole = (allowedRoles = []) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'User not authenticated',
            code: 'NOT_AUTHENTICATED'
          });
        }

        const userRole = req.user.role || req.user.roles?.[0];

        if (!allowedRoles.includes(userRole)) {
          logger.warn(`Unauthorized role access: user ${req.user.userId} attempted to access ${req.originalUrl}`);
          return res.status(403).json({
            success: false,
            error: 'forbidden',
            message: 'Insufficient permissions for this operation',
            code: 'FORBIDDEN',
            requiredRoles: allowedRoles
          });
        }

        next();
      } catch (error) {
        logger.error('Role verification failed:', error);
        return res.status(500).json({
          success: false,
          error: 'internal_error',
          message: 'Role verification failed'
        });
      }
    };
  };

  /**
   * التحقق من الصلاحيات الدقيقة
   * Fine-grained permission verification
   */
  requirePermission = (requiredPermissions = []) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'User not authenticated'
          });
        }

        const userPermissions = req.user.permissions || [];
        const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));

        if (!hasPermission) {
          return res.status(403).json({
            success: false,
            error: 'forbidden',
            message: 'Insufficient permissions',
            requiredPermissions
          });
        }

        next();
      } catch (error) {
        logger.error('Permission verification failed:', error);
        return res.status(500).json({
          success: false,
          error: 'internal_error',
          message: 'Permission verification failed'
        });
      }
    };
  };

  /**
   * التحقق من الجلسة المتعددة الأجهزة
   * Multi-device session verification
   */
  verifyMultiDeviceSession = (_options = {}) => {
    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        const sessionId = req.headers['x-session-id'];
        const deviceId = req.headers['x-device-id'];

        if (!token || !sessionId || !deviceId) {
          return res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: 'Missing authentication headers'
          });
        }

        const verification = await this.ssoService.verifySession(sessionId, token);

        if (!verification.valid) {
          return res.status(401).json({
            success: false,
            error: 'unauthorized',
            message: verification.error
          });
        }

        // Check if device ID matches
        if (verification.session.metadata.deviceId !== deviceId) {
          logger.warn(`Device mismatch for session ${sessionId}`);
          return res.status(403).json({
            success: false,
            error: 'forbidden',
            message: 'Device authentication failed',
            code: 'DEVICE_MISMATCH'
          });
        }

        req.user = verification.user;
        req.session = verification.session;
        req.sessionId = sessionId;
        req.deviceId = deviceId;

        next();
      } catch (error) {
        logger.error('Multi-device verification failed:', error);
        return res.status(401).json({
          success: false,
          error: 'unauthorized',
          message: 'Session verification failed'
        });
      }
    };
  };

  /**
   * Rate limiting بناءً على المستخدم
   * Per-user rate limiting
   */
  userRateLimit = (options = {}) => {
    const maxRequests = options.maxRequests || 100;
    const windowMs = options.windowMs || 60000; // 1 minute
    const storage = new Map();

    return async (req, res, next) => {
      try {
        const userId = req.user?.userId || req.ip;
        const now = Date.now();
        const key = `ratelimit:${userId}`;

        if (!storage.has(key)) {
          storage.set(key, { count: 1, resetAt: now + windowMs });
        } else {
          const userData = storage.get(key);

          if (now > userData.resetAt) {
            userData.count = 1;
            userData.resetAt = now + windowMs;
          } else {
            userData.count++;
          }

          if (userData.count > maxRequests) {
            return res.status(429).json({
              success: false,
              error: 'too_many_requests',
              message: 'Rate limit exceeded',
              retryAfter: Math.ceil((userData.resetAt - now) / 1000)
            });
          }
        }

        next();
      } catch (error) {
        logger.error('Rate limiting failed:', error);
        next();
      }
    };
  };

  /**
   * التحقق من CORS آمن مع SSO
   * Secure CORS verification with SSO
   */
  verifySSOMixCors = (_options = {}) => {
    return async (req, res, next) => {
      try {
        const origin = req.get('origin');
        const token = this.extractToken(req);

        // For requests with SSO token, verify token first
        if (token) {
          const sessionId = req.headers['x-session-id'];
          if (sessionId) {
            const verification = await this.ssoService.verifySession(sessionId, token);
            if (verification.valid) {
              req.user = verification.user;
              req.sessionId = sessionId;
            }
          }
        }

        // Verify CORS origin
        const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          res.set('Access-Control-Allow-Origin', origin || '*');
        }

        next();
      } catch (error) {
        logger.error('CORS SSO verification failed:', error);
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: 'CORS verification failed'
        });
      }
    };
  };

  /**
   * تسجيل النشاط والتدقيق
   * Activity logging and audit trail
   */
  auditLog = async (req, res, next) => {
    try {
      const original = res.json.bind(res);

      res.json = function (data) {
        // Log the request after sending response
        process.nextTick(() => {
          const auditEntry = {
            timestamp: new Date().toISOString(),
            userId: req.user?.userId || 'anonymous',
            action: req.method,
            endpoint: req.originalUrl,
            statusCode: res.statusCode,
            metadata: {
              ip: this.getClientIp(req),
              userAgent: req.get('user-agent'),
              sessionId: req.sessionId
            }
          };

          logger.info('AUDIT', auditEntry);
        });

        return original(data);
      };

      next();
    } catch (error) {
      logger.error('Audit logging failed:', error);
      next();
    }
  };

  /**
   * Helper method: Extract token from request
   */
  extractToken(req) {
    // Check Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Check X-Access-Token header
    if (req.headers['x-access-token']) {
      return req.headers['x-access-token'];
    }

    // Check cookies
    if (req.cookies?.accessToken) {
      return req.cookies.accessToken;
    }

    return null;
  }

  /**
   * Helper method: Extract session ID from token
   */
  extractSessionId(token) {
    try {
      const decoded = jwt.decode(token, this.JWT_SECRET);
      return decoded.sessionId;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Helper method: Get client IP
   */
  getClientIp(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

// Export singleton instance and factory function
const ssoAuthMiddleware = new SSOAuthMiddleware();

module.exports = {
  ssoAuthMiddleware,
  verifySSOToken: () => ssoAuthMiddleware.verifySSOToken(),
  requireRole: (roles) => ssoAuthMiddleware.requireRole(roles),
  requirePermission: (perms) => ssoAuthMiddleware.requirePermission(perms),
  verifyOptionalSSO: ssoAuthMiddleware.verifyOptionalSSO.bind(ssoAuthMiddleware),
  verifyMultiDeviceSession: () => ssoAuthMiddleware.verifyMultiDeviceSession(),
  userRateLimit: (opts) => ssoAuthMiddleware.userRateLimit(opts),
  verifySSOMixCors: (opts) => ssoAuthMiddleware.verifySSOMixCors(opts),
  auditLog: ssoAuthMiddleware.auditLog.bind(ssoAuthMiddleware)
};
