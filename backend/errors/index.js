/**
 * ═══════════════════════════════════════════════════════════════════════════
 * errors/index.js — Barrel Export for Error + Handler + Response System
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Single import point:
 *   const { NotFoundError, ValidationError } = require('./errors');
 *   const { errorHandler, asyncHandler }     = require('./errors');
 *   const { sendSuccess, enhanceResponse }   = require('./errors');
 */

'use strict';

const classes = require('./AppError');
const handler = require('./errorHandler');
const responses = require('./responseSystem');

module.exports = {
  ...classes,
  ...handler,
  ...responses,
};
