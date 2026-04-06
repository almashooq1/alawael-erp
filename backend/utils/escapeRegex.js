/**
 * escapeRegex — Escape special RegExp characters in user input
 * Prevents ReDoS (Regular Expression Denial of Service) attacks
 * when user input is used in new RegExp() constructors.
 *
 * @param {string} str - User input string to escape
 * @returns {string} Escaped string safe for use in RegExp
 *
 * @example
 * const escaped = escapeRegex(req.query.search);
 * const regex = new RegExp(escaped, 'i');
 */
function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = escapeRegex;
