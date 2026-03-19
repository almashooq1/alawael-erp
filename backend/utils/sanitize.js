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

module.exports = {
  escapeRegex,
};
