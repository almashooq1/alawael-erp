const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { jwtSecret } = require('../config/secrets');
const tokenBlacklist = require('../utils/tokenBlacklist');

// Use centralized secret management (no hardcoded fallbacks)
const JWT_SECRET = jwtSecret;

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
 * Role-based guard: requires `req.user.role` to match one of the provided roles
 */
const requireRole =
  (...roles) =>
  (req, res, next) => {
    const userRole = (req.user?.role || '').toLowerCase();
    if (!req.user || !roles.some(r => r.toLowerCase() === userRole)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    next();
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
      next();
    });
  } catch (error) {
    logger.error('Auth middleware error:', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

/**
 * Check if user is admin
 */
const requireAdmin = (req, res, next) => {
  const role = req && req.user && req.user.role;
  if (role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
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
      }
      next();
    });
  } catch (error) {
    next();
  }
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

/**
 * Alias for authorize — kept for backward compatibility.
 * Both functions are identical; prefer `authorize` in new code.
 */
const authorizeRole = authorize;

module.exports = {
  // Primary exports used by routes
  requireAuth,
  requireRole,

  // Additional helpers
  authenticateToken,
  requireAdmin,
  optionalAuth,
  authorize,
  authorizeRole,

  // Aliases for compatibility
  protect: authenticateToken,
  authenticate: authenticateToken,
};
