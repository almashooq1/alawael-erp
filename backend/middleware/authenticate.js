/* eslint-disable no-unused-vars */
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'test') return 'test-secret-key-for-testing-only';
  logger.error('CRITICAL: JWT_SECRET environment variable is not set!');
  throw new Error('JWT_SECRET must be configured via environment variable');
})();

/**
 * Authentication middleware for integration routes
 * Validates JWT token from Authorization header
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token is required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.error('Token verification error:', { error: err.message });
        if (err.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Access token has expired',
            expired: true,
          });
        }
        return res.status(401).json({ success: false, message: 'Invalid access token' });
      }
      req.user = decoded;
      next();
    });
  } catch (error) {
    logger.error('Auth middleware error:', { error: error.message });
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = authenticate;
