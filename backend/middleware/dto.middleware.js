/**
 * Professional Request/Response DTO Layer — طبقة نقل البيانات الاحترافية
 *
 * Provides standardized request validation and response formatting
 * across the entire API surface.
 *
 * @module middleware/dto
 */

const { validationResult, body, param, query } = require('express-validator');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════
// RESPONSE ENVELOPE — غلاف الاستجابة الموحّد
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standard API response wrapper.
 * All successful responses follow: { success, data, meta, timestamp }
 * All error responses follow:     { success, error, message, details, timestamp }
 */
class ApiResponse {
  /**
   * Success response
   */
  static success(res, { data = null, message = null, meta = {}, statusCode = 200 } = {}) {
    const envelope = {
      success: true,
      ...(message && { message }),
      data,
      meta: {
        ...meta,
        timestamp: new Date().toISOString(),
        version: res.getHeader('X-API-Version') || 'v2',
      },
    };
    return res.status(statusCode).json(envelope);
  }

  /**
   * Created response (201)
   */
  static created(res, { data = null, message = 'تم الإنشاء بنجاح' } = {}) {
    return ApiResponse.success(res, { data, message, statusCode: 201 });
  }

  /**
   * Paginated list response
   */
  static paginated(res, { data = [], page = 1, limit = 20, total = 0, message = null } = {}) {
    const totalPages = Math.ceil(total / limit);
    return ApiResponse.success(res, {
      data,
      message,
      meta: {
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  }

  /**
   * Error response
   */
  static error(
    res,
    {
      message = 'حدث خطأ',
      statusCode = 500,
      code = 'INTERNAL_ERROR',
      details = null,
      stack = null,
    } = {}
  ) {
    const envelope = {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
        ...(process.env.NODE_ENV !== 'production' && stack && { stack }),
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };
    return res.status(statusCode).json(envelope);
  }

  /**
   * Validation error response (422)
   */
  static validationError(res, errors = []) {
    return ApiResponse.error(res, {
      message: 'فشل التحقق من صحة البيانات',
      statusCode: 422,
      code: 'VALIDATION_ERROR',
      details: errors.map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  /**
   * Not found response (404)
   */
  static notFound(res, resource = 'المورد') {
    return ApiResponse.error(res, {
      message: `${resource} غير موجود`,
      statusCode: 404,
      code: 'NOT_FOUND',
    });
  }

  /**
   * Unauthorized response (401)
   */
  static unauthorized(res, message = 'غير مصرح لك بالوصول') {
    return ApiResponse.error(res, {
      message,
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  }

  /**
   * Forbidden response (403)
   */
  static forbidden(res, message = 'ليس لديك صلاحية للوصول إلى هذا المورد') {
    return ApiResponse.error(res, {
      message,
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE — وسيط التحقق من صحة البيانات
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Run express-validator validations and return 422 on failure.
 */
const validate = validations => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return ApiResponse.validationError(res, errors.array());
  };
};

// ═══════════════════════════════════════════════════════════════════════════
// COMMON VALIDATORS — أدوات التحقق الشائعة
// ═══════════════════════════════════════════════════════════════════════════

const commonValidators = {
  /** MongoDB ObjectId */
  mongoId: (field = 'id', location = 'params') => {
    const fn = location === 'params' ? param : location === 'body' ? body : query;
    return fn(field).isMongoId().withMessage(`${field} يجب أن يكون معرّف MongoDB صالح`);
  },

  /** Pagination params */
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('رقم الصفحة يجب أن يكون عدد صحيح أكبر من 0')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('حجم الصفحة يجب أن يكون بين 1 و 100')
      .toInt(),
    query('sort').optional().isString().withMessage('حقل الترتيب يجب أن يكون نص'),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('اتجاه الترتيب يجب أن يكون asc أو desc'),
  ],

  /** Required string */
  requiredString: (field, { min = 1, max = 500 } = {}) =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage(`${field} مطلوب`)
      .isLength({ min, max })
      .withMessage(`${field} يجب أن يكون بين ${min} و ${max} حرف`),

  /** Optional string */
  optionalString: (field, { max = 500 } = {}) =>
    body(field)
      .optional()
      .trim()
      .isLength({ max })
      .withMessage(`${field} يجب أن لا يتجاوز ${max} حرف`),

  /** Required email */
  requiredEmail: (field = 'email') =>
    body(field)
      .trim()
      .notEmpty()
      .withMessage('البريد الإلكتروني مطلوب')
      .isEmail()
      .withMessage('البريد الإلكتروني غير صالح')
      .normalizeEmail(),

  /** Phone number (Saudi format) */
  phone: (field = 'phone') =>
    body(field)
      .optional()
      .matches(/^(\+966|0)?5\d{8}$/)
      .withMessage('رقم الهاتف يجب أن يكون بصيغة سعودية صالحة'),

  /** Date range */
  dateRange: () => [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('تاريخ البداية يجب أن يكون بتنسيق ISO 8601'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('تاريخ النهاية يجب أن يكون بتنسيق ISO 8601'),
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST CONTEXT ENRICHMENT — إثراء سياق الطلب
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Attach request context (requestId, timing, client info) to every request.
 */
const requestContext = (req, res, next) => {
  const requestId =
    req.headers['x-request-id'] ||
    `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  req.requestId = requestId;
  req.startTime = process.hrtime.bigint();

  res.setHeader('X-Request-Id', requestId);

  // Log request start
  logger.info(`[${requestId}] → ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent']?.substring(0, 80),
    userId: req.user?.id || 'anonymous',
  });

  // Log response completion
  const originalJson = res.json.bind(res);
  res.json = data => {
    const duration = Number(process.hrtime.bigint() - req.startTime) / 1e6;
    logger.info(`[${requestId}] ← ${res.statusCode} (${duration.toFixed(1)}ms)`, {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration.toFixed(1),
    });
    return originalJson(data);
  };

  next();
};

module.exports = {
  ApiResponse,
  validate,
  commonValidators,
  requestContext,
};
