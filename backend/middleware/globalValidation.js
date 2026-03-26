/**
 * Global Validation Middleware — Safety-Net Input Validation
 * ميدلوير التحقق العام — شبكة أمان للتحقق من المدخلات
 *
 * Provides automatic validation for ALL routes without requiring
 * per-route express-validator chains. This catches the most common
 * attack vectors and malformed input globally:
 *
 *  1. MongoDB ObjectId params  — rejects invalid :id, :studentId, etc.
 *  2. Numeric params           — validates :year, :month as integers
 *  3. Query string hygiene     — caps string lengths, validates page/limit
 *  4. Body size sanity         — rejects deeply nested / oversized payloads
 *  5. Prototype pollution      — blocks __proto__, constructor, prototype keys
 *
 * Individual routes can (and should) add their own express-validator
 * chains for business-specific rules. This middleware only enforces
 * structural/format rules that apply universally.
 */

'use strict';

// ─── Configuration ───────────────────────────────────────────────────────────

/** Params that MUST be valid MongoDB ObjectIds */
const OBJECT_ID_PARAM_PATTERN = /^id$|Id$/; // 'id', 'studentId', 'employeeId', etc.

/** Params that must be positive integers */
const INTEGER_PARAMS = new Set(['year', 'month', 'day', 'page', 'limit']);

/** Query string keys whose values must not exceed this length */
const MAX_QUERY_VALUE_LENGTH = 500;

/** Maximum nesting depth for request body */
const MAX_BODY_DEPTH = 10;

/** Maximum number of keys in a single object */
const MAX_OBJECT_KEYS = 200;

/** Keys that indicate prototype pollution attempts */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a string is a valid MongoDB ObjectId format (24-char hex).
 * Pure regex — no Mongoose dependency required.
 */
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const isValidObjectId = value => typeof value === 'string' && OBJECT_ID_REGEX.test(value);

/**
 * Recursively check an object for forbidden keys and excessive nesting.
 * Returns an error message string, or null if clean.
 */
const scanObject = (obj, depth = 0, path = 'body') => {
  if (depth > MAX_BODY_DEPTH) {
    return `Request body exceeds maximum nesting depth (${MAX_BODY_DEPTH}) at ${path}`;
  }

  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return null;
  }

  // Arrays — check each element
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const err = scanObject(obj[i], depth + 1, `${path}[${i}]`);
      if (err) return err;
    }
    return null;
  }

  // Objects — check keys and recurse
  const keys = Object.getOwnPropertyNames(obj);
  if (keys.length > MAX_OBJECT_KEYS) {
    return `Request body has too many keys (${keys.length}) at ${path}. Maximum: ${MAX_OBJECT_KEYS}`;
  }

  for (const key of keys) {
    if (FORBIDDEN_KEYS.has(key)) {
      return `Forbidden key "${key}" detected in request body at ${path}`;
    }
    const err = scanObject(obj[key], depth + 1, `${path}.${key}`);
    if (err) return err;
  }

  return null;
};

// ─── Middleware Factory ──────────────────────────────────────────────────────

/**
 * Create the global validation middleware.
 *
 * @param {Object} [options]
 * @param {number} [options.maxQueryValueLength=500]  Max chars per query param value
 * @param {number} [options.maxBodyDepth=10]           Max nesting depth for body
 * @param {boolean} [options.strictObjectIds=true]     Validate ObjectId params
 * @param {boolean} [options.scanBody=true]            Scan body for pollution/depth
 * @returns {Function} Express middleware
 */
const globalValidation = (options = {}) => {
  const {
    maxQueryValueLength = MAX_QUERY_VALUE_LENGTH,
    maxBodyDepth = MAX_BODY_DEPTH,
    strictObjectIds = true,
    scanBody = true,
  } = options;

  return (req, res, next) => {
    // ── 1. Validate URL params ──────────────────────────────────────────

    if (req.params && strictObjectIds) {
      for (const [paramName, paramValue] of Object.entries(req.params)) {
        // Skip empty params (Express sometimes sends '0' for unmatched captures)
        if (!paramValue) continue;

        // ObjectId params
        if (OBJECT_ID_PARAM_PATTERN.test(paramName)) {
          if (!isValidObjectId(paramValue)) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${paramName}: must be a valid 24-character hex ID`,
              field: paramName,
            });
          }
        }

        // Integer params (:year, :month, :day)
        if (INTEGER_PARAMS.has(paramName)) {
          const num = Number(paramValue);
          if (!Number.isInteger(num) || num < 0) {
            return res.status(400).json({
              success: false,
              message: `Invalid ${paramName}: must be a non-negative integer`,
              field: paramName,
            });
          }
        }
      }
    }

    // ── 2. Validate query string ────────────────────────────────────────

    if (req.query) {
      const queryKeys = Object.getOwnPropertyNames(req.query);
      for (const key of queryKeys) {
        const value = req.query[key];
        // Block prototype pollution via query string
        if (FORBIDDEN_KEYS.has(key)) {
          return res.status(400).json({
            success: false,
            message: `Forbidden query parameter: ${key}`,
          });
        }

        // Cap string value length to prevent abuse
        if (typeof value === 'string' && value.length > maxQueryValueLength) {
          return res.status(400).json({
            success: false,
            message: `Query parameter "${key}" exceeds maximum length (${maxQueryValueLength})`,
            field: key,
          });
        }

        // Validate page/limit if in query (redundant safety on top of paginationDefaults)
        if (key === 'page' || key === 'limit') {
          const num = Number(value);
          if (value !== '' && (!Number.isFinite(num) || num < 0 || !Number.isInteger(num))) {
            return res.status(400).json({
              success: false,
              message: `Query parameter "${key}" must be a non-negative integer`,
              field: key,
            });
          }
        }
      }
    }

    // ── 3. Scan request body for depth / pollution ──────────────────────

    if (scanBody && req.body && typeof req.body === 'object') {
      const bodyError = scanObject(req.body, 0, 'body');
      if (bodyError) {
        return res.status(400).json({
          success: false,
          message: bodyError,
        });
      }
    }

    next();
  };
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = { globalValidation, isValidObjectId, scanObject };
