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

module.exports = {
  escapeRegex,
  stripDangerousKeys,
  DANGEROUS_KEYS,
};
