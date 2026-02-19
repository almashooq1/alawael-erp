const jwt = require('jsonwebtoken');

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'test'
    ? 'test-secret-key-for-testing-only'
    : 'your-super-secret-jwt-key-change-this-in-production');

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
        console.error('Token verification error:', err.message);
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
    console.error('Auth middleware error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = authenticate;
