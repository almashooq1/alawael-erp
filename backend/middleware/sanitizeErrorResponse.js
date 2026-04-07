'use strict';

/**
 * Sanitize Error Response Middleware (Round 37)
 * ─────────────────────────────────────────────
 * يعترض res.json() لتنقية رسائل الأخطاء في بيئة الإنتاج.
 * يمنع تسريب تفاصيل Mongoose/MongoDB/JWT الداخلية للعملاء.
 *
 * يُركّب قبل الراوتات في app.js حتى يَلتقط كل res.json({ success: false, message: ... }).
 */

const SENSITIVE_PATTERNS = [
  /Cast to \w+ failed/i,
  /Path `[^`]+` is required/i,
  /Validator failed for path/i,
  /E11000 duplicate key/i,
  /`\w+` model/i,
  /MongoServerError/i,
  /MongoError/i,
  /Cannot read propert/i,
  /is not a function/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /getaddrinfo/i,
  /at Object\.<anonymous>/i,
  /at Module\._compile/i,
  /node_modules/i,
  /BSONTypeError/i,
  /jwt malformed/i,
  /jwt expired/i,
  /invalid signature/i,
  /TokenExpiredError/i,
  /JsonWebTokenError/i,
];

const GENERIC_MESSAGE = 'حدث خطأ، يرجى المحاولة لاحقاً';

function sanitizeErrorResponse(req, res, next) {
  // Only sanitize in production
  if (process.env.NODE_ENV !== 'production') return next();

  const originalJson = res.json.bind(res);

  res.json = function sanitizedJson(body) {
    // Only intercept error responses
    if (
      body &&
      body.success === false &&
      typeof body.message === 'string' &&
      res.statusCode >= 400
    ) {
      const isSensitive = SENSITIVE_PATTERNS.some(pattern => pattern.test(body.message));
      if (isSensitive) {
        body.message = GENERIC_MESSAGE;
      }
      // Also strip stack traces if present
      delete body.stack;
    }
    return originalJson(body);
  };

  next();
}

module.exports = sanitizeErrorResponse;
