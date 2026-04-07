const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { jwtSecret } = require('../config/secrets');
const tokenBlacklist = require('../utils/tokenBlacklist');
const {
  ROLES,
  hasPermission: configHasPermission,
  getRoleLevel,
} = require('../config/rbac.config');

// Use centralized secret management (no hardcoded fallbacks)
const JWT_SECRET = jwtSecret;

// ── Lazy-loaded models (avoid circular deps at startup) ──────────────
let _User, _Session;
function getUser() {
  if (!_User) _User = require('../models/User');
  return _User;
}
function getSession() {
  if (!_Session) _Session = require('../models/Session');
  return _Session;
}

// =====================================================================
//  1. Core Authentication Middleware
// =====================================================================

/**
 * Strict authentication: requires a valid Bearer token
 */
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Check token blacklist (logout invalidation)
    if (await tokenBlacklist.isBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err && err.name === 'TokenExpiredError') {
      return res
        .status(401)
        .json({ success: false, message: 'Access token has expired', expired: true });
    }
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
};

/**
 * Authenticate JWT token middleware (lenient in tests)
 */
const authenticateToken = (req, res, next) => {
  try {
    // Only allow pre-set req.user inside Jest runner (for test mocks)
    if (req.user && process.env.JEST_WORKER_ID) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    // Support Bearer token from header, fallback to query param (SSE streams)
    const token = (authHeader && authHeader.split(' ')[1]) || req.query?.token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res
            .status(401)
            .json({ success: false, message: 'Access token has expired', expired: true });
        }
        return res.status(403).json({ success: false, message: 'Invalid access token' });
      }

      // Check token blacklist (logout invalidation)
      if (await tokenBlacklist.isBlacklisted(token)) {
        return res.status(401).json({ success: false, message: 'Token has been revoked' });
      }

      req.user = decoded;
      req.userId = decoded.id || decoded.sub;
      req.userRole = decoded.role || 'user';
      req.permissions = decoded.permissions || [];
      next();
    });
  } catch (error) {
    logger.error('Auth middleware error:', { error: error.message });
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

/**
 * Optional authentication (doesn't fail if no token)
 */
const optionalAuth = (req, res, next) => {
  try {
    // If user is already set, allow it
    if (req.user) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (!err) {
        req.user = decoded;
        req.userId = decoded.id || decoded.sub;
        req.userRole = decoded.role || 'user';
      }
      next();
    });
  } catch (error) {
    next();
  }
};

// =====================================================================
//  2. Role-Based Authorization
// =====================================================================

/**
 * Role-based guard: requires `req.user.role` to match one of the provided roles
 */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase();
    if (!req.user || !roles.flat().some(r => r.toLowerCase() === userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
  };

/**
 * Check if user is admin
 */
const requireAdmin = (req, res, next) => {
  const role = req && req.user && req.user.role;
  if (!role) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }
  const normalizedRole = role.toLowerCase();
  if (normalizedRole !== 'admin' && normalizedRole !== 'superadmin' && normalizedRole !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

/**
 * Authorization middleware: checks role-based permissions
 */
const authorize =
  (roles = []) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const userRole = (req.user.role || '').toLowerCase();
    if (roles && roles.length > 0 && !roles.some(r => r.toLowerCase() === userRole)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };

// =====================================================================
//  3. Permission-Based Authorization
// =====================================================================

/**
 * Require a single permission
 * @param {string} permission - Permission string (e.g., 'view_accident_analytics')
 */
const requirePermission = permission => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'يجب تسجيل الدخول أولاً' });
    }

    // Admin bypasses permission checks
    const role = (req.user.role || '').toLowerCase();
    if (role === 'admin' || role === 'superadmin' || role === 'super_admin') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    if (userPermissions.includes('*:*') || userPermissions.includes(permission)) {
      return next();
    }

    logger.warn(`Permission denied: user ${req.user.id} lacks [${permission}]`);
    return res.status(403).json({
      success: false,
      message: 'ليس لديك صلاحية للوصول إلى هذا المورد',
      required: [permission],
    });
  };
};

/**
 * Require multiple permissions (all must be present)
 * @param {...string} permissions - Required permissions
 */
const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
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
        message: 'Insufficient permissions',
        required: permissions,
        current: userPermissions,
      });
    }

    next();
  };
};

// =====================================================================
//  4. Token Helpers
// =====================================================================

/**
 * Extract Bearer token from request
 */
const extractToken = req => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
};

/**
 * Verify token (returns decoded payload or null)
 */
const verifyToken = token => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

/**
 * Generate a new JWT token
 */
const generateToken = (userData, expiresIn = '1h') => {
  return jwt.sign(
    {
      id: userData.id,
      email: userData.email,
      role: userData.role,
      permissions: userData.permissions || [],
    },
    JWT_SECRET,
    { expiresIn }
  );
};

// =====================================================================
//  5. Session Management
// =====================================================================

/**
 * Generate token with session tracking
 */
const generateTokenWithSession = async (userData, ipAddress, userAgent, expiresIn = '1h') => {
  const token = generateToken(userData, expiresIn);
  const { jwtRefreshSecret } = require('../config/secrets');
  const refreshTk = jwt.sign({ id: userData.id, type: 'refresh' }, jwtRefreshSecret, {
    expiresIn: '7d',
  });

  // Create session record
  try {
    const Session = getSession();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await Session.create({
      userId: userData.id,
      token,
      refreshToken: refreshTk,
      ipAddress,
      userAgent,
      expiresAt,
      isActive: true,
    });
  } catch (error) {
    logger.warn('Session creation failed:', { error: error.message });
  }

  return { token, refreshToken: refreshTk };
};

/**
 * Refresh an expired token (within 7-day window)
 */
const refreshToken = (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch (verifyErr) {
      return res.status(403).json({ success: false, error: 'Invalid token — cannot refresh' });
    }

    // Reject tokens older than refresh window (7 days)
    const tokenAge = Math.floor(Date.now() / 1000) - (decoded.iat || 0);
    const MAX_REFRESH_WINDOW = 7 * 24 * 60 * 60;
    if (tokenAge > MAX_REFRESH_WINDOW) {
      return res.status(403).json({
        success: false,
        error: 'Token too old to refresh — please re-login',
      });
    }

    const newToken = generateToken({
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions,
    });

    return res.json({ success: true, token: newToken, expiresIn: '1h' });
  } catch (error) {
    logger.error('Token refresh failed:', error.message);
    return res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
};

/**
 * Revoke token and terminate session
 */
const revokeToken = async token => {
  try {
    const Session = getSession();
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

// =====================================================================
//  Aliases for backward compatibility
// =====================================================================
const authorizeRole = authorize;

module.exports = {
  // Core authentication
  requireAuth,
  authenticateToken,
  optionalAuth,

  // Role-based authorization
  requireRole,
  requireAdmin,
  authorize,
  authorizeRole,

  // Permission-based authorization
  requirePermission,
  requirePermissions,

  // Token helpers
  extractToken,
  verifyToken,
  generateToken,
  generateTokenWithSession,
  refreshToken,
  revokeToken,

  // Aliases for compatibility
  protect: authenticateToken,
  authenticate: authenticateToken,

  // Re-export Session model (used by some importers of auth.middleware)
  Session: { get current() { return getSession(); } },
};
