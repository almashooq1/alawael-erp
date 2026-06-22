/**
 * Input Sanitization Utilities
 * أدوات تنقية المدخلات
 */

/**
 * Escape special regex characters in user input to prevent ReDoS attacks.
 * Use this before passing user input to MongoDB $regex queries.
 *
 * @param {string} str - User input string
 * @returns {string} Escaped string safe for use in regex
 */
const escapeRegex = str => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Strip prototype-pollution keys (__proto__, constructor, prototype) from an object.
 * Returns a shallow copy without dangerous keys.
 *
 * @param {object} obj - Input object (usually req.body)
 * @returns {object} Cleaned object
 */
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const stripDangerousKeys = obj => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (!DANGEROUS_KEYS.has(key)) {
      clean[key] = obj[key];
    }
  }
  return clean;
};

/**
 * Strip fields that must never be set by user input in update operations.
 * Prevents mass-assignment attacks (e.g. setting role, isAdmin, createdBy).
 *
 * @param {object} obj - Input object (usually req.body)
 * @returns {object} Cleaned object without meta/privileged fields
 */
const UPDATE_BLACKLIST = new Set([
  '_id',
  '__v',
  'id',
  'createdBy',
  'createdAt',
  'updatedAt',
  'role',
  'roles',
  'isAdmin',
  'isSuperAdmin',
  'permissions',
  'password',
  'passwordHash',
  '__proto__',
  'constructor',
  'prototype',
]);

const stripUpdateMeta = obj => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (!UPDATE_BLACKLIST.has(key)) {
      clean[key] = obj[key];
    }
  }
  return clean;
};

/**
 * Recursively strip MongoDB query operators ($-prefixed keys) and dotted keys from a
 * user-supplied filter object. Use before passing a filter that originated from
 * untrusted input into a Mongoose query — e.g. a `JSON.parse`'d query-string param,
 * which bypasses the global express-mongo-sanitize (that only sees the raw string).
 * Prevents operator injection ($ne / $gt / $where / $regex / etc.) and dotted-path
 * injection. Returns a deep-cleaned copy; primitives pass through unchanged.
 *
 * @param {*} value - user-supplied filter (object / array / primitive)
 * @returns {*} cleaned value with no operator/dotted/dangerous keys
 */
const sanitizeMongoFilter = value => {
  if (Array.isArray(value)) return value.map(sanitizeMongoFilter);
  if (value && typeof value === 'object') {
    const clean = {};
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.') || DANGEROUS_KEYS.has(key)) continue;
      clean[key] = sanitizeMongoFilter(value[key]);
    }
    return clean;
  }
  return value;
};

module.exports = {
  escapeRegex,
  stripDangerousKeys,
  stripUpdateMeta,
  sanitizeMongoFilter,
  DANGEROUS_KEYS,
  UPDATE_BLACKLIST,
};
