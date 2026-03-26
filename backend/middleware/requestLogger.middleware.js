/**
 * Request Logger Middleware — ربط سجل الطلبات
 *
 * Creates a child logger bound to the current request ID so that
 * every log line emitted via `req.log` carries the correlation ID
 * automatically.  Place this immediately after `requestIdMiddleware`.
 *
 * Usage in route handlers / services:
 *   req.log.info('Payment processed', { amount: 500 });
 *   // → { requestId: 'abc-123', message: 'Payment processed', amount: 500 }
 */

'use strict';

const { createChildLogger } = require('../utils/logger');

/**
 * Attach `req.log` — a child logger pre-bound with `req.id`.
 * Falls back to the root logger if no request ID is set yet.
 */
function requestLoggerMiddleware(req, _res, next) {
  try {
    req.log = createChildLogger(req.id);
  } catch (_err) {
    // Fallback — ensure `req.log` always exists even if child logger fails
    req.log = require('../utils/logger');
  }
  next();
}

module.exports = { requestLoggerMiddleware };
