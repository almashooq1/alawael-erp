/**
 * Security Hardening — Additional Protections
 *
 * - JSON depth limiter (prevents deeply-nested payload DoS)
 * - Sensitive header scrubber (prevents credential leakage in logs)
 * - Security config validator (warns about risky settings at startup)
 */

'use strict';

const logger = require('../utils/logger');

// ─── JSON Depth Limiter ──────────────────────────────────────────────────────
// Deeply nested JSON objects (100+ levels) can cause CPU spikes during parsing
// or serialization. This middleware rejects payloads that exceed a safe depth.
const MAX_JSON_DEPTH = parseInt(process.env.MAX_JSON_DEPTH, 10) || 20;

function measureDepth(obj, current = 1) {
  if (current > MAX_JSON_DEPTH) return current;
  if (obj === null || typeof obj !== 'object') return current;

  let maxChild = current;
  const keys = Array.isArray(obj) ? obj : Object.values(obj);
  for (const val of keys) {
    if (val && typeof val === 'object') {
      const childDepth = measureDepth(val, current + 1);
      if (childDepth > maxChild) maxChild = childDepth;
      if (maxChild > MAX_JSON_DEPTH) return maxChild; // early exit
    }
  }
  return maxChild;
}

/**
 * Middleware that rejects requests with excessively nested JSON bodies.
 */
function jsonDepthLimiter(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    const depth = measureDepth(req.body);
    if (depth > MAX_JSON_DEPTH) {
      logger.warn(`[Security] Rejected request with JSON depth ${depth} from ${req.ip}`, {
        method: req.method,
        path: req.path,
        depth,
      });
      return res.status(400).json({
        success: false,
        message: 'Request payload is too deeply nested',
        code: 'PAYLOAD_TOO_DEEP',
      });
    }
  }
  next();
}

// ─── Sensitive Header Scrubber ───────────────────────────────────────────────
// Strips Authorization and Cookie headers from request objects before logging.
const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-csrf-token',
  'proxy-authorization',
]);

/**
 * Returns a copy of req.headers with sensitive values redacted.
 * Safe to log or serialize.
 */
function scrubHeaders(headers) {
  if (!headers || typeof headers !== 'object') return {};
  const clean = {};
  for (const [key, val] of Object.entries(headers)) {
    clean[key] = SENSITIVE_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : val;
  }
  return clean;
}

// ─── Security Config Validator ───────────────────────────────────────────────
// Run at startup to warn about risky or missing configuration.

function validateSecurityConfig() {
  const warnings = [];
  const isProd = process.env.NODE_ENV === 'production';

  // JWT secret
  const jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret || jwtSecret.length < 32) {
    warnings.push('JWT_SECRET is missing or too short (< 32 chars)');
  }
  if (['secret', 'test', 'changeme', '123456'].includes(jwtSecret.toLowerCase())) {
    warnings.push('JWT_SECRET is a well-known default value — change immediately');
  }

  // CORS origins
  if (isProd && !process.env.CORS_ORIGINS && !process.env.CORS_ORIGIN) {
    warnings.push(
      'No CORS_ORIGINS set in production — cross-origin requests may be rejected or overly open'
    );
  }

  // HTTPS / HSTS
  if (isProd && process.env.SSL_ENABLED !== 'true' && process.env.FORCE_HSTS !== 'true') {
    warnings.push('SSL_ENABLED / FORCE_HSTS not set in production — HSTS will be disabled');
  }

  // Rate limiting
  if (process.env.SKIP_RATE_LIMIT === 'true' && isProd) {
    warnings.push('SKIP_RATE_LIMIT is true in production — rate limiting is disabled');
  }

  // CSRF
  if (process.env.CSRF_DISABLE === 'true' && isProd) {
    warnings.push('CSRF_DISABLE is true in production — CSRF protection is OFF');
  }

  // Session / cookie secret
  if (isProd && !process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET not set — sessions may use an insecure default');
  }

  // MongoDB connection
  if (isProd && !process.env.MONGODB_URI) {
    warnings.push('MONGODB_URI not set in production');
  }

  // Log results
  if (warnings.length === 0) {
    logger.info('[SecurityAudit] ✅ All security configuration checks passed');
  } else {
    for (const w of warnings) {
      logger.warn(`[SecurityAudit] ⚠️  ${w}`);
    }
    logger.warn(`[SecurityAudit] ${warnings.length} issue(s) found — review before deploying`);
  }

  return warnings;
}

module.exports = {
  jsonDepthLimiter,
  scrubHeaders,
  validateSecurityConfig,
  MAX_JSON_DEPTH,
};
