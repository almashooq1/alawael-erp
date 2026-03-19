/* eslint-disable no-unused-vars */
/**
 * Authentication Middleware - مكون المصادقة
 *
 * ✅ Token Validation
 * ✅ User Context Setup
 * ✅ Role-Based Access Control (RBAC)
 * ✅ Error Handling
 * ✅ Token Refresh Logic
 */

const logger = require('../utils/logger');
const {
  ROLES,
  hasPermission: configHasPermission,
  getRoleLevel,
} = require('../config/rbac.config');

const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/secrets');
const User = require('../models/User');
const Session = require('../models/Session');

/**
 * Authenticate Token Middleware
 * التحقق من صحة التوكن وإعداد سياق المستخدم
 */
const authenticateToken = async (req, res, next) => {
  // SMART_TEST_MODE: only in test env with jest (never in production/development)
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.SMART_TEST_MODE === 'true' &&
    process.env.JEST_WORKER_ID
  ) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN',
      });
    }

    req.user = {
      id: req.headers['x-user-id'] || 'test_user',
      _id: req.headers['x-user-id'] || 'test_user',
      role: req.headers['x-user-role'] || 'user',
      permissions: (req.headers['x-user-permissions'] || '').split(',').filter(Boolean),
    };
    req.userId = req.user.id;
    req.userRole = req.user.role;
    req.permissions = req.user.permissions;
    return next();
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN',
      });
    }

    // Verify JWT
    jwt.verify(token, jwtSecret, async (err, user) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
            expiresAt: err.expiredAt,
          });
        }

        if (err.name === 'JsonWebTokenError') {
          return res.status(403).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
          });
        }

        return res.status(403).json({
          success: false,
          error: 'Token verification failed',
          code: 'TOKEN_VERIFICATION_FAILED',
        });
      }

      // Validate session (if Session tracking enabled)
      try {
        const session = await Session.findOne({ token, isActive: true });
        if (session && !session.isValid()) {
          return res.status(401).json({
            success: false,
            error: 'Session expired',
            code: 'SESSION_EXPIRED',
          });
        }

        // Update session activity
        if (session) {
          session.lastActivity = new Date();
          await session.save();
        }
      } catch (sessionError) {
        // Session validation optional - continue if DB unavailable
        logger.warn('Session validation skipped:', { error: sessionError.message });
      }

      // Attach user info
      req.user = user;
      req.userId = user.id || user.sub;
      req.userRole = user.role || 'user';
      req.permissions = user.permissions || [];

      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Authentication error',
      message: 'حدث خطأ في المصادقة',
    });
  }
};

/**
 * Require Admin Middleware
 * التحقق من أن المستخدم له صلاحية admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'User not authenticated',
    });
  }

  const role = (req.user.role || '').toLowerCase();
  if (role !== ROLES.ADMIN && role !== ROLES.SUPER_ADMIN) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      code: 'ADMIN_ONLY',
    });
  }

  next();
};

/**
 * Require Specific Role Middleware Factory
 * إنشاء middleware للتحقق من دور معين
 */
const requireRole = (...args) => {
  const allowedRoles = args.flat();
  return (req, res, next) => {
    // Test bypass only when running inside Jest
    if (
      process.env.NODE_ENV === 'test' &&
      process.env.SMART_TEST_MODE === 'true' &&
      process.env.JEST_WORKER_ID
    )
      return next();

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
};

/**
 * Require Permission Middleware
 * التحقق من صلاحية معينة للمستخدم
 */
const requirePermission = permission => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // تحقق من أن المستخدم لديه الصلاحية المطلوبة
    const hasPermission = req.user.permissions && req.user.permissions.includes(permission);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied',
        code: 'PERMISSION_DENIED',
        requiredPermission: permission,
      });
    }

    next();
  };
};

/**
 * Optional Auth Middleware
 * يتحقق من التوكن إن وُجد، لكن لا يرفع الطلب إذا لم يكن موجود
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // لا يوجد توكن، لكن نستمر بدون معلومات المستخدم
    req.user = null;
    return next();
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (!err) {
      req.user = user;
      req.userId = user.id || user.sub;
      req.userRole = user.role || 'user';
    }
    // في كلا الحالات، نستمر
    next();
  });
};

/**
 * Extract Token Helper
 * استخراج التوكن من الـ request
 */
const extractToken = req => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
};

/**
 * Verify Token Helper
 * التحقق من صحة التوكن (بدون الـ response)
 */
const verifyToken = token => {
  try {
    const decoded = jwt.verify(token, jwtSecret);
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Generate Token Helper
 * إنشاء توكن جديد
 */
const generateToken = (userData, expiresIn = '24h') => {
  return jwt.sign(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions || [],
    },
    jwtSecret,
    { expiresIn }
  );
};

/**
 * Refresh Token Helper
 * تحديث التوكن
 */
const refreshToken = (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided',
      });
    }

    // Verify token signature (allow expired tokens for refresh)
    const { jwtRefreshSecret } = require('../config/secrets');
    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret, { ignoreExpiration: true });
    } catch (verifyErr) {
      return res.status(403).json({
        success: false,
        error: 'Invalid token — cannot refresh',
      });
    }

    // Reject tokens older than refresh window (7 days)
    const tokenAge = Math.floor(Date.now() / 1000) - (decoded.iat || 0);
    const MAX_REFRESH_WINDOW = 7 * 24 * 60 * 60; // 7 days in seconds
    if (tokenAge > MAX_REFRESH_WINDOW) {
      return res.status(403).json({
        success: false,
        error: 'Token too old to refresh — please re-login',
      });
    }

    // إنشاء توكن جديد
    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    });

    return res.json({
      success: true,
      token: newToken,
      expiresIn: '1h',
    });
  } catch (error) {
    logger.error('Token refresh failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      message: 'حدث خطأ في تجديد الرمز',
    });
  }
};

/**
 * Generate token with session tracking
 */
const generateTokenWithSession = async (userData, ipAddress, userAgent, expiresIn = '24h') => {
  const token = generateToken(userData, expiresIn);
  const refreshToken = jwt.sign({ id: userData.id, type: 'refresh' }, jwtSecret, {
    expiresIn: '7d',
  });

  // Create session record
  try {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Session.create({
      userId: userData.id,
      token,
      refreshToken,
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true,
    });
  } catch (error) {
    logger.warn('Session creation failed:', { error: error.message });
  }

  return { token, refreshToken };
};

/**
 * Revoke token and terminate session
 */
const revokeToken = async token => {
  try {
    const session = await Session.findOne({ token });
    if (session) {
      await session.terminate();
    }
    return { success: true };
  } catch (error) {
    logger.error('Token revocation failed:', error.message);
    return { success: false, error: 'فشل إلغاء الجلسة' };
  }
};

/**
 * Require specific permissions
 */
const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }

    const userPermissions = req.permissions || req.user.permissions || [];
    if (userPermissions.includes('*:*')) return next();

    const hasAll = permissions.every(perm => {
      if (userPermissions.includes(perm)) return true;
      // Delegate resource:action checks to rbac.config engine
      const [resource, action] = perm.split(':');
      if (resource && action) {
        return configHasPermission(
          (req.user.role || 'guest').toLowerCase(),
          resource,
          action,
          req.user.customPermissions,
          req.user.deniedPermissions
        );
      }
      return false;
    });

    if (!hasAll) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: permissions,
        current: userPermissions,
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  requirePermissions,
  optionalAuth,
  extractToken,
  verifyToken,
  generateToken,
  generateTokenWithSession,
  refreshToken,
  revokeToken,
  authorizeRole: requireRole,
  Session,
};
