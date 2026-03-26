/**
 * CSRF Protection Middleware — حماية ضد هجمات تزوير الطلبات
 *
 * Uses cookie-to-header token pattern with timing-safe comparison
 * to prevent both CSRF attacks and timing side-channel attacks.
 */

'use strict';

const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Maximum allowed length for client-supplied tokens (prevent abuse)
const MAX_TOKEN_LENGTH = 64;

const parseCookies = cookieHeader => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    try {
      acc[key] = decodeURIComponent(rest.join('='));
    } catch {
      // Malformed cookie value — skip silently
    }
    return acc;
  }, {});
};

const generateToken = () => crypto.randomBytes(32).toString('base64url');

/**
 * Timing-safe comparison of two strings.
 * Prevents timing side-channel attacks by always comparing in constant time.
 */
const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
};

const DEFAULT_EXCLUDE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/test',
  '/test-first',
  '/health',
];

// Pre-compute exclude paths set (rebuilt only when env var changes)
let _cachedExcludeSet = null;
let _cachedExcludeEnv = null;

const getExcludePaths = () => {
  const envVal = process.env.CSRF_EXCLUDE_PATHS || '';
  if (_cachedExcludeSet && _cachedExcludeEnv === envVal) return _cachedExcludeSet;

  const extraExcludes = envVal
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
  _cachedExcludeSet = new Set([...DEFAULT_EXCLUDE_PATHS, ...extraExcludes]);
  _cachedExcludeEnv = envVal;
  return _cachedExcludeSet;
};

const csrfProtection = (req, res, next) => {
  // CSRF protection is ON by default — explicitly set CSRF_DISABLE=true to skip
  if (process.env.CSRF_DISABLE === 'true') {
    return next();
  }

  if (getExcludePaths().has(req.path)) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  const existingToken = cookies[CSRF_COOKIE];

  if (SAFE_METHODS.has(req.method)) {
    const token = existingToken || generateToken();
    if (!existingToken) {
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours — auto-rotate daily
      });
    }
    res.setHeader('X-CSRF-Token', token);
    return next();
  }

  const headerToken = req.headers['x-csrf-token'];
  const hasAuthHeader = Boolean(req.headers.authorization || req.headers['x-api-key']);

  // Skip CSRF for Bearer/API-key authenticated requests without tokens
  if (hasAuthHeader && (!existingToken || !headerToken)) {
    return next();
  }

  // Validate token length to prevent abuse
  if (
    !existingToken ||
    !headerToken ||
    headerToken.length > MAX_TOKEN_LENGTH ||
    !timingSafeEqual(headerToken, existingToken)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  return next();
};

module.exports = csrfProtection;
