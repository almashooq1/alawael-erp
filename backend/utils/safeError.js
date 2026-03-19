/**
 * Safe Error Utility
 * ===================
 * Prevents leaking internal error details to clients in production.
 * In development, returns the actual error message for debugging.
 * In production, returns a generic Arabic message.
 *
 * Usage:
 *   const { safeError } = require('../utils/safeError');
 *   catch (error) {
 *     res.status(500).json({ success: false, message: 'خطأ', error: safeError(error) });
 *   }
 */

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

/**
 * Returns error message only in development; generic message in production.
 * @param {Error|string} error - The error object or message
 * @param {string} [fallback='حدث خطأ داخلي'] - Fallback message for production
 * @returns {string|undefined} Error detail string (dev) or undefined (prod)
 */
function safeError(error, fallback) {
  if (isDev) {
    return typeof error === 'string' ? error : error?.message || fallback || 'حدث خطأ داخلي';
  }
  // In production, return undefined so the field is omitted from JSON
  return undefined;
}

module.exports = { safeError };
