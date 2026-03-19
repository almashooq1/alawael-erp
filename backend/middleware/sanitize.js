/* eslint-disable no-unused-vars */
const mongoSanitize = require('express-mongo-sanitize');
const { xss } = require('express-xss-sanitizer');
const hpp = require('hpp');
const logger = require('../utils/logger');

/**
 * Input sanitization middleware
 * Protects against NoSQL injection, XSS, and parameter pollution
 *
 * NOTE: Replaced deprecated `xss-clean` (unmaintained since 2021) with
 *       `express-xss-sanitizer` — actively maintained with better
 *       coverage of nested objects, arrays and query strings.
 */
const sanitizeInput = [
  // Sanitize against NoSQL injection
  mongoSanitize({
    replaceWith: '_',
    onSanitize: ({ req, key }) => {
      logger.warn(`Sanitized input: ${key} in ${req.method} ${req.path}`);
    },
  }),

  // Protect against XSS attacks (express-xss-sanitizer — replaces deprecated xss-clean)
  xss(),

  // Prevent HTTP Parameter Pollution
  hpp({
    whitelist: ['sort', 'page', 'limit', 'fields'], // allowed duplicate parameters
  }),
];

module.exports = sanitizeInput;
