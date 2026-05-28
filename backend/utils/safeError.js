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
 * @param {Object} [opts] - Optional response-shape controls
 * @param {'success'|'ok'} [opts.shape='success'] - Response key shape.
 *   'success' → `{ success: false, error: <msg> }` (default; matches the
 *   majority of routes including the e603d4deb sweep).
 *   'ok' → `{ ok: false, error: <msg> }` (matches the legacy admin-ops /
 *   audit-reviews / forms-catalog / uploads family). Use this when the
 *   route previously responded with `ok: false` and frontend callers
 *   specifically check the `ok` key.
 */
function safeError(res, err, context, opts) {
  // ── Legacy string-returning form: safeError(error, fallback) ──────────────
  // The original safeError (pre "Round 9" refactor adbdea474) RETURNED a
  // sanitized string and was called as `message: safeError(err)`. ~650 call
  // sites still use that form. The refactor changed the signature to a
  // response-SENDER `safeError(res, err)` but never migrated those callers, so
  // every one threw `undefined.stack` on its error path → unhandled rejection.
  // Detect the call shape: a real Express `res` has .status + .json functions.
  const looksLikeRes = res && typeof res.status === 'function' && typeof res.json === 'function';
  if (!looksLikeRes) {
    const error = res; // first arg was actually the error
    const fallback = typeof err === 'string' ? err : undefined;
    if (IS_PRODUCTION) return undefined; // omit internal detail in prod
    if (error == null) return fallback || GENERIC_MESSAGE;
    return typeof error === 'string' ? error : error.message || fallback || GENERIC_MESSAGE;
  }

  // ── Response-sender form: safeError(res, err, context, opts) ──────────────
  err = err || {}; // tolerate safeError(res) with no error object
  const logMeta = { stack: err.stack };
  if (context) logMeta.context = context;

  const shape = opts && opts.shape === 'ok' ? 'ok' : 'success';

  // Errors that carry their own statusCode (e.g. RateLimitError=429) are
  // expected operational responses — pass them through verbatim, not as
  // a generic 500, and log at warn level rather than error.
  const passThroughStatus =
    Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 500;

  if (passThroughStatus) {
    logger.warn(err.message, { ...logMeta, code: err.code, statusCode: err.statusCode });
    const body =
      shape === 'ok'
        ? { ok: false, error: err.message, code: err.code }
        : { success: false, message: err.message, code: err.code };
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
  const body = shape === 'ok' ? { ok: false, error: message } : { success: false, error: message };
  return res.status(500).json(body);
}

module.exports = safeError;
// Named-import compatibility: some callers do `const { safeError } = require(...)`.
module.exports.safeError = safeError;
