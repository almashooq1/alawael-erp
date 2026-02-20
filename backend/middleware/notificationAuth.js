/**
 * ═══════════════════════════════════════════════════════════════
 * 🔐 Notification System Authentication & Authorization Middleware
 * وسيط المصادقة والتفويض لنظام الإشعارات
 * ═══════════════════════════════════════════════════════════════
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Secret key for JWT (should be in environment variables in production)
const JWT_SECRET = process.env.NOTIFICATION_JWT_SECRET || 'notification-system-secret-key-2026';

// ═══════════════════════════════════════════════════════════════
// 🔑 Token Generation Utility
// ═══════════════════════════════════════════════════════════════

const generateToken = (userId, permissions = []) => {
  return jwt.sign(
    {
      userId,
      permissions,
      iat: Date.now(),
      type: 'notification-api'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// ═══════════════════════════════════════════════════════════════
// 🔐 Verify Token Middleware
// ═══════════════════════════════════════════════════════════════

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Access token required',
        code: 'NO_TOKEN',
        message: 'يرجى تقديم رمز الوصول'
      });
    }

    // Extract token from "Bearer token" format
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token format',
        code: 'INVALID_FORMAT',
        message: 'صيغة الرمز غير صحيحة'
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Attach user info to request
    req.user = decoded;
    req.userId = decoded.userId;
    req.permissions = decoded.permissions || [];

    logger.info(`✅ Token verified for user: ${decoded.userId}`);
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'EXPIRED_TOKEN',
        message: 'انتهت صلاحية الرمز'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN',
        message: 'الرمز غير صحيح'
      });
    }

    logger.error(`❌ Token verification error: ${error.message}`);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      code: 'AUTH_FAILED',
      message: 'فشل التحقق من الهوية'
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// 🛡️ Permission Check Middleware
// ═══════════════════════════════════════════════════════════════

const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user || !req.permissions) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        code: 'NO_PERMISSION',
        message: 'ليس لديك الصلاحيات المطلوبة'
      });
    }

    if (!req.permissions.includes(requiredPermission) && !req.permissions.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: `Permission denied: ${requiredPermission}`,
        code: 'PERMISSION_DENIED',
        message: `الصلاحية المطلوبة: ${requiredPermission}`
      });
    }

    next();
  };
};

// ═══════════════════════════════════════════════════════════════
// 🔒 Rate Limiting Middleware
// ═══════════════════════════════════════════════════════════════

const rateLimitStore = new Map();

const rateLimit = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const userId = req.userId || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitStore.has(userId)) {
      rateLimitStore.set(userId, []);
    }

    const requests = rateLimitStore.get(userId);
    const recentRequests = requests.filter(time => time > windowStart);

    if (recentRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد عدد الطلبات المسموح به',
        retryAfter: Math.ceil((Math.max(...recentRequests) + windowMs - now) / 1000)
      });
    }

    recentRequests.push(now);
    rateLimitStore.set(userId, recentRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      for (const [key, times] of rateLimitStore.entries()) {
        const validTimes = times.filter(t => t > windowStart);
        if (validTimes.length === 0) {
          rateLimitStore.delete(key);
        } else {
          rateLimitStore.set(key, validTimes);
        }
      }
    }

    next();
  };
};

// ═══════════════════════════════════════════════════════════════
// 🔓 Bypass Token for Testing (Development Only)
// ═══════════════════════════════════════════════════════════════

const verifyTokenOptional = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      req.userId = decoded.userId;
      req.permissions = decoded.permissions || [];
      req.authenticated = true;
    } else {
      // Allow unauthenticated access in development
      req.user = { userId: 'anonymous' };
      req.userId = 'anonymous';
      req.permissions = ['read'];
      req.authenticated = false;
    }

    next();
  } catch (error) {
    // Allow unauthenticated access in development
    req.user = { userId: 'anonymous' };
    req.userId = 'anonymous';
    req.permissions = ['read'];
    req.authenticated = false;
    next();
  }
};

// ═══════════════════════════════════════════════════════════════
// 🔓 API Key Authentication
// ═══════════════════════════════════════════════════════════════

const validApiKeys = new Map([
  ['test-notification-api-key-12345', { userId: 'test-user', permissions: ['read', 'write', 'admin'] }],
  ['demo-api-key-2026', { userId: 'demo-user', permissions: ['read', 'write'] }]
]);

const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return verifyToken(req, res, next); // Fall back to token verification
  }

  if (!validApiKeys.has(apiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      code: 'INVALID_API_KEY',
      message: 'مفتاح API غير صحيح'
    });
  }

  const apiKeyData = validApiKeys.get(apiKey);
  req.user = { userId: apiKeyData.userId, apiKey: true };
  req.userId = apiKeyData.userId;
  req.permissions = apiKeyData.permissions;
  req.authenticated = true;

  logger.info(`✅ API key verified for user: ${apiKeyData.userId}`);
  next();
};

// ═══════════════════════════════════════════════════════════════
// 📝 Audit Logging Middleware
// ═══════════════════════════════════════════════════════════════

const auditLog = (action) => {
  return (req, res, next) => {
    const originalJson = res.json;

    res.json = function(data) {
      const logEntry = {
        timestamp: new Date().toISOString(),
        userId: req.userId || 'anonymous',
        action,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        success: res.statusCode >= 200 && res.statusCode < 300,
        requestBody: req.body ? JSON.stringify(req.body).substring(0, 200) : null
      };

      if (res.statusCode >= 200 && res.statusCode < 300) {
        logger.info(`📝 Audit: ${action} - ${req.method} ${req.path} - User: ${req.userId}`);
      } else {
        logger.warn(`📝 Audit: ${action} - ${req.method} ${req.path} - Status: ${res.statusCode}`);
      }

      return originalJson.call(this, data);
    };

    next();
  };
};

// ═══════════════════════════════════════════════════════════════
// 📦 Export Middleware Functions
// ═══════════════════════════════════════════════════════════════

module.exports = {
  generateToken,
  verifyToken,
  verifyTokenOptional,
  verifyApiKey,
  checkPermission,
  rateLimit,
  auditLog,
  validApiKeys
};
