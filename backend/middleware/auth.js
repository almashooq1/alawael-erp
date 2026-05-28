const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { jwtSecret } = require('../config/secrets');
const tokenBlacklist = require('../utils/tokenBlacklist');
const safeError = require('../utils/safeError');
const {
  _ROLES,
  hasPermission: configHasPermission,
  _getRoleLevel,
} = require('../config/rbac.config');

// Use centralized secret management (no hardcoded fallbacks)
const JWT_SECRET = jwtSecret;

// ── Lazy-loaded models (avoid circular deps at startup) ──────────────
let _User, _Session;
function _getUser() {
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

    // Explicit algorithms allowlist — jsonwebtoken v9 defaults are
    // mostly safe with a string secret (rejects RS256/ES256 since
    // those need a key object), but pinning to HS256 makes the
    // policy declarative and survives future jsonwebtoken-default
    // changes or accidental refactor to a Buffer/KeyObject secret.
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
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
const authenticateToken = async (req, res, next) => {
  try {
    // Only allow pre-set req.user inside Jest runner (for test mocks)
    if (req.user && process.env.JEST_WORKER_ID) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    // Only accept Bearer token from Authorization header
    // NOTE: query param tokens leak in server logs, referer headers, and browser history
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    // Synchronous verify — throws on invalid/expired token (fully caught by outer try/catch).
    // Explicit algorithms allowlist — see authenticate() above for rationale.
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res
          .status(401)
          .json({ success: false, message: 'Access token has expired', expired: true });
      }
      return res.status(403).json({ success: false, message: 'Invalid access token' });
    }

    // Check token blacklist (logout invalidation) — await is now safe inside async function
    if (await tokenBlacklist.isBlacklisted(token)) {
      return res.status(401).json({ success: false, message: 'Token has been revoked' });
    }

    req.user = decoded;
    req.userId = decoded.id || decoded.sub;
    req.userRole = decoded.role || 'user';
    req.permissions = decoded.permissions || [];
    next();
  } catch (error) {
    safeError(res, error, 'Auth middleware error');
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

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, decoded) => {
      if (!err) {
        req.user = decoded;
        req.userId = decoded.id || decoded.sub;
        req.userRole = decoded.role || 'user';
      }
      next();
    });
  } catch {
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
  if (
    normalizedRole !== 'admin' &&
    normalizedRole !== 'superadmin' &&
    normalizedRole !== 'super_admin'
  ) {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

/**
 * Authorization middleware: checks role-based permissions
 */
const authorize =
  (...args) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    // Accept BOTH call styles: authorize('admin', 'manager') varargs AND
    // authorize(['admin', 'manager']) array (and authorize(ROLE_CONST_ARRAY)).
    // A 2026-03-27 case-insensitive refactor (e870f5c9a) switched
    // roles.includes(...) → roles.some(...); strings have .includes but NOT
    // .some, so every varargs call site (~300) began throwing
    // "roles.some is not a function" → 500. flat() normalises both forms.
    const roles = args.flat();
    const userRole = (req.user.role || '').toLowerCase();
    if (roles.length > 0 && !roles.some(r => String(r).toLowerCase() === userRole)) {
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

    // Super-admin bypasses all permission checks (wildcard role)
    const role = (req.user.role || '').toLowerCase();
    if (role === 'superadmin' || role === 'super_admin') {
      return next();
    }

    const userPermissions = req.user.permissions || [];
    if (userPermissions.includes('*:*') || userPermissions.includes(permission)) {
      return next();
    }

    // Admin: delegate to RBAC config engine (finite permission set, no blanket bypass)
    if (role === 'admin') {
      const [resource, action] = permission.includes(':')
        ? permission.split(':')
        : [permission, 'read'];
      if (
        configHasPermission(
          role,
          resource,
          action,
          req.user.customPermissions,
          req.user.deniedPermissions
        )
      ) {
        return next();
      }
    }

    logger.warn(`Permission denied: user ${req.user.id} lacks [${permission}]`);

    // W398: emit canonical 'auth.permission_denied' event for cross-module
    // subscribers (audit / security analytics). Envelope per SYSTEM_EVENTS.
    // PERMISSION_DENIED: {userId, resource, action, ip}.
    try {
      const { integrationBus } = require('../integration/systemIntegrationBus');
      if (integrationBus && typeof integrationBus.publish === 'function') {
        const [resource, action] = permission.includes(':')
          ? permission.split(':')
          : [permission, 'read'];
        Promise.resolve()
          .then(() =>
            integrationBus.publish('system', 'auth.permission_denied', {
              userId: String(req.user.id),
              resource,
              action,
              ip: req.ip || req.headers['x-forwarded-for'] || '',
            })
          )
          .catch(err => logger.warn('auth.permission_denied publish failed:', err.message));
      }
    } catch {
      /* integrationBus optional */
    }

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
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
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

  // W396: emit canonical 'auth.logged_in' event for cross-module subscribers.
  // Envelope per SYSTEM_EVENTS.USER_LOGGED_IN: {userId, ip, userAgent}.
  // Fire-and-forget via integrationBus (lazy require to avoid hard coupling).
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (integrationBus && typeof integrationBus.publish === 'function') {
      Promise.resolve()
        .then(() =>
          integrationBus.publish('system', 'auth.logged_in', {
            userId: String(userData.id),
            ip: ipAddress || '',
            userAgent: userAgent || '',
          })
        )
        .catch(err => logger.warn('auth.logged_in publish failed:', err.message));
    }
  } catch {
    /* integrationBus optional */
  }

  return { token, refreshToken: refreshTk };
};

/**
 * Refresh an expired token using a valid refresh token
 * Requires: { refreshToken } in request body
 */
const refreshToken = (req, res) => {
  try {
    const { refreshToken: refreshTk } = req.body || {};
    if (!refreshTk) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token is required in request body',
      });
    }

    // Verify the refresh token with the dedicated refresh secret
    const { jwtRefreshSecret } = require('../config/secrets');
    let refreshDecoded;
    try {
      refreshDecoded = jwt.verify(refreshTk, jwtRefreshSecret, { algorithms: ['HS256'] });
    } catch {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired refresh token — please re-login',
      });
    }

    if (refreshDecoded.type !== 'refresh') {
      return res.status(403).json({
        success: false,
        error: 'Invalid token type — expected refresh token',
      });
    }

    // Also verify the expired access token to get user claims
    const accessToken = extractToken(req);
    if (!accessToken) {
      return res.status(401).json({ success: false, error: 'No access token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(accessToken, JWT_SECRET, {
        algorithms: ['HS256'],
        ignoreExpiration: true,
      });
    } catch {
      return res.status(403).json({ success: false, error: 'Invalid access token' });
    }

    // Ensure both tokens belong to the same user
    if (decoded.id !== refreshDecoded.id) {
      return res.status(403).json({
        success: false,
        error: 'Token mismatch — access and refresh tokens belong to different users',
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
    safeError(res, error, 'Token refresh failed');
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
      const userId = session.userId;
      await session.terminate();
      // W396: emit canonical 'auth.logged_out' event for cross-module subscribers.
      // Envelope per SYSTEM_EVENTS.USER_LOGGED_OUT: {userId}.
      try {
        const { integrationBus } = require('../integration/systemIntegrationBus');
        if (integrationBus && typeof integrationBus.publish === 'function') {
          Promise.resolve()
            .then(() =>
              integrationBus.publish('system', 'auth.logged_out', { userId: String(userId) })
            )
            .catch(err => logger.warn('auth.logged_out publish failed:', err.message));
        }
      } catch {
        /* integrationBus optional */
      }
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
  Session: {
    get current() {
      return getSession();
    },
  },
};
