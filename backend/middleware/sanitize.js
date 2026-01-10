const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

/**
 * Input sanitization middleware
 * Protects against NoSQL injection, XSS, and parameter pollution
 */
const sanitizeInput = [
  // Sanitize against NoSQL injection
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      console.warn(`⚠️ Sanitized input: ${key} in ${req.method} ${req.path}`);
    },
  }),

  // Protect against XSS attacks
  xss(),

  // Prevent HTTP Parameter Pollution
  hpp({
    whitelist: ['sort', 'page', 'limit', 'fields'], // allowed duplicate parameters
  }),
];

module.exports = sanitizeInput;
