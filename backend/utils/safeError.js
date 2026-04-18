/**
 * Production-safe error response helper
 * يمنع تسريب رسائل الأخطاء الداخلية في بيئة الإنتاج
 *
 * في Production: يُرجع رسالة عامة "حدث خطأ داخلي"
 * في Development: يُرجع err.message للتسهيل على المطور
 */

'use strict';

const logger = require('./logger');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const GENERIC_MESSAGE = 'حدث خطأ داخلي';

/**
 * Send a production-safe 500 error response
 * @param {import('express').Response} res - Express response
 * @param {Error} err - The caught error
 * @param {string} [context] - Optional context for logging (e.g. route name)
 */
function safeError(res, err, context) {
  const logMeta = { stack: err.stack };
  if (context) logMeta.context = context;

  // Errors that carry their own statusCode (e.g. RateLimitError=429) are
  // expected operational responses — pass them through verbatim, not as
  // a generic 500, and log at warn level rather than error.
  const passThroughStatus =
    Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 500;

  if (passThroughStatus) {
    logger.warn(err.message, { ...logMeta, code: err.code, statusCode: err.statusCode });
    const body = { success: false, message: err.message, code: err.code };
    if (err.retryAfterMs) body.retryAfterMs = err.retryAfterMs;
    if (err.scope) body.scope = err.scope;
    if (err.provider) body.provider = err.provider;

    // Standards-compliant Retry-After header on 429 — HTTP spec says
    // integer seconds. Proxies, SDKs, and browsers honour this before
    // looking at the JSON body, so we set it whenever retryAfterMs is
    // available (primarily on RateLimitError).
    if (err.statusCode === 429 && err.retryAfterMs) {
      res.set('Retry-After', String(Math.ceil(err.retryAfterMs / 1000)));
    }

    return res.status(err.statusCode).json(body);
  }

  logger.error(err.message, logMeta);
  const message = IS_PRODUCTION ? GENERIC_MESSAGE : err.message;
  return res.status(500).json({ success: false, error: message });
}

module.exports = safeError;
