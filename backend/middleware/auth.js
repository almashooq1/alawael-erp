const jwt = require('jsonwebtoken');

// Use test-friendly secret in tests; require explicit secret otherwise
const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'test'
    ? 'test-secret-key-for-testing-only'
    : 'your-super-secret-jwt-key-change-this-in-production');

/**
 * Strict authentication: requires a valid Bearer token
 */
const requireAuth = (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

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
 * Role-based guard: requires `req.user.role` to match
 */
const requireRole = role => (req, res, next) => {
  if (!req.user || req.user.role !== role) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

/**
 * Authenticate JWT token middleware (lenient in tests)
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          return res
            .status(401)
            .json({ success: false, message: 'Access token has expired', expired: true });
        }
        return res.status(403).json({ success: false, message: 'Invalid access token' });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('Auth middleware error:', error);
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

module.exports = {
  // Primary exports used by routes
  requireAuth,
  requireRole,

  // Additional helpers
  authenticateToken,
  requireAdmin,
  optionalAuth,

  // Aliases for compatibility
  protect: authenticateToken,
  authorize: roles => (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (roles && roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  },
  authorizeRole: roles => (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ success: false, message: 'Authentication required' });
    if (roles && roles.length > 0 && !roles.includes(req.user.role))
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    next();
  },
  authenticate: authenticateToken,
};
