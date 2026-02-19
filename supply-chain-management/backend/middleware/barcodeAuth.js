import jwt from 'jsonwebtoken';
import logger from '../config/logger.js';

/**
 * Middleware to verify JWT token for Barcode operations
 */
export const barcodeAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn(`Barcode API access attempt without token from ${req.ip}`);
      return res.status(401).json({
        message: 'Authorization token required',
        code: 'NO_TOKEN',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // Check if user has required role
    const allowedRoles = ['admin', 'warehouse_manager', 'logistics'];
    if (!allowedRoles.includes(decoded.role)) {
      logger.warn(`Unauthorized barcode access attempt by role: ${decoded.role}`);
      return res.status(403).json({
        message: 'Insufficient permissions for barcode operations',
        code: 'INSUFFICIENT_ROLE',
        requiredRoles: allowedRoles,
      });
    }

    req.user = decoded;
    req.user.ipAddress = req.ip;
    req.user.userAgent = req.get('user-agent');

    logger.debug(`Barcode API authenticated for user: ${decoded.id}`);
    next();
  } catch (error) {
    logger.error(`Barcode authentication error: ${error.message}`);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      message: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
  }
};

/**
 * Rate limiting for barcode generation
 * 100 requests per 15 minutes per IP
 */
const barcodeRateLimitStore = new Map();

export const barcodeRateLimit = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const window = 15 * 60 * 1000; // 15 minutes

  if (!barcodeRateLimitStore.has(ip)) {
    barcodeRateLimitStore.set(ip, { count: 1, resetTime: now + window });
    return next();
  }

  const record = barcodeRateLimitStore.get(ip);

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + window;
  } else {
    record.count++;
    if (record.count > 100) {
      logger.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({
        message: 'Too many requests. Please try again after 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000),
      });
    }
  }

  res.set('X-RateLimit-Limit', '100');
  res.set('X-RateLimit-Remaining', String(100 - record.count));
  res.set('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

  next();
};
