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

  logger.error(err.message, logMeta);

  const message = IS_PRODUCTION ? GENERIC_MESSAGE : err.message;

  return res.status(500).json({ success: false, error: message });
}

module.exports = safeError;
