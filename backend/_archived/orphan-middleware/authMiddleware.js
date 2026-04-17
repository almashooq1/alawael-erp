/**
 * Compatibility proxy for routes expecting "../middleware/authMiddleware"
 *
 * ⚠️ COMPATIBILITY PROXY — All logic consolidated in ./auth.js (Round 29)
 */
const auth = require('./auth');

// Default export behaves like an Express middleware (authenticate token)
module.exports = function authMiddleware(req, res, next) {
  return auth.authenticateToken(req, res, next);
};

// Named exports for routes that import specific helpers
module.exports.authenticate = auth.authenticateToken;
module.exports.authorizeRole = auth.requireRole;
module.exports.requireAdmin = auth.requireAdmin;
module.exports.optionalAuth = auth.optionalAuth;
module.exports.protect = auth.authenticateToken;
module.exports.authorize = auth.requireRole;
