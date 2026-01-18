const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken'); // Added jwt

// Simple persistent flag using a file

const MAINTENANCE_FILE = path.join(__dirname, '../../maintenance.flag');

const isMaintenanceMode = () => {
  return fs.existsSync(MAINTENANCE_FILE);
};

const setMaintenanceMode = enabled => {
  if (enabled) {
    if (!isMaintenanceMode()) {
      fs.writeFileSync(MAINTENANCE_FILE, new Date().toISOString());
    }
  } else {
    if (isMaintenanceMode()) {
      fs.unlinkSync(MAINTENANCE_FILE);
    }
  }
};

/**
 * Maintenance Middleware
 * Blocks access to API if maintenance mode is on, unless user is Admin.
 */
const maintenanceMiddleware = (req, res, next) => {
  // Skip for login/auth routes so admins can still log in
  if (req.path.startsWith('/api/auth')) {
    return next();
  }

  // Check if maintenance is active
  if (isMaintenanceMode()) {
    // FAST PATH: Check if user is already populated (unlikely if global middleware order)
    if (req.user && (req.user.role === 'ADMIN' || req.user.role === 'DEVELOPER')) {
      res.set('X-System-Status', 'MAINTENANCE_MODE');
      return next();
    }

    // SLOW PATH: Manual Token Verification for Admins during Lockout
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && (decoded.role === 'ADMIN' || decoded.role === 'DEVELOPER')) {
          // Add header to warn admin
          res.set('X-System-Status', 'MAINTENANCE_MODE');
          // Store user for later middleware
          req.user = decoded;
          return next();
        }
      } catch (err) {
        // Token invalid, treat as blocking
      }
    }

    // Otherwise block
    return res.status(503).json({
      success: false,
      error: 'SERVICE_UNAVAILABLE',
      message: 'System is currently under maintenance. Please try again later.',
      timestamp: new Date().toISOString(),
    });
  }

  next();
};

module.exports = {
  maintenanceMiddleware,
  isMaintenanceMode,
  setMaintenanceMode,
};
