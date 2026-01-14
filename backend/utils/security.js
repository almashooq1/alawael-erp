const crypto = require('crypto');

/**
 * Security utilities for additional protection
 */

/**
 * Generate a secure random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for storage
 */
const hashToken = token => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a random password
 */
const generateRandomPassword = (length = 16) => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one character from each category
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

/**
 * Check if IP is in whitelist (if enabled)
 */
const checkIPWhitelist = (ip, whitelist = []) => {
  if (whitelist.length === 0) return true; // Whitelist disabled
  return whitelist.includes(ip);
};

/**
 * Get client IP address
 */
const getClientIP = req => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.ip ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown'
  );
};

/**
 * Log security event
 */
const logSecurityEvent = (eventName, details = {}) => {
  const timestamp = new Date().toISOString();
  const event = {
    eventName,
    timestamp,
    details,
  };
  console.log(`🔒 [SECURITY] ${timestamp} - ${eventName}`, details);

  // In production, this should write to a dedicated security log file
  // or send to a security monitoring service
  return event;
};

/**
 * Detect suspicious patterns in request
 */
const detectSuspiciousActivity = req => {
  const suspiciousPatterns = [
    // SQL injection patterns
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    // XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Path traversal
    /\.\.\//g,
    // Command injection
    /[;&|`$()]/g,
  ];

  const checkString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      return true;
    }
  }

  return false;
};

/**
 * Middleware to detect and log suspicious activity
 */
const suspiciousActivityDetector = (req, res, next) => {
  if (detectSuspiciousActivity(req)) {
    logSecurityEvent('SUSPICIOUS_ACTIVITY_DETECTED', {
      ip: getClientIP(req),
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
    });

    return res.status(400).json({
      success: false,
      message: 'Invalid request detected',
    });
  }

  next();
};

module.exports = {
  generateSecureToken,
  hashToken,
  generateRandomPassword,
  checkIPWhitelist,
  getClientIP,
  logSecurityEvent,
  detectSuspiciousActivity,
  suspiciousActivityDetector,
};
