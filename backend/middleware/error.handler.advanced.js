/**
 * Advanced Error Handling Middleware
 * معالجة أخطاء متقدمة مع تسجيل شامل
 */

const { logError, logSecurityEvent } = require('../config/logging.advanced');

/**
 * Custom Error Class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error
 */
class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.messageAr = 'خطأ في التحقق من البيانات';
  }
}

/**
 * Authentication Error
 */
class AuthenticationError extends AppError {
  constructor(message = 'Unauthorized', details = {}) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
    this.messageAr = 'غير مصرح';
  }
}

/**
 * Authorization Error
 */
class AuthorizationError extends AppError {
  constructor(message = 'Forbidden', details = {}) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
    this.messageAr = 'الوصول مرفوض';
  }
}

/**
 * Not Found Error
 */
class NotFoundError extends AppError {
  constructor(resource = 'Resource', details = {}) {
    super(`${resource} not found`, 404, 'NOT_FOUND', details);
    this.messageAr = `${resource} غير موجود`;
  }
}

/**
 * Conflict Error
 */
class ConflictError extends AppError {
  constructor(message = 'Conflict', details = {}) {
    super(message, 409, 'CONFLICT', details);
    this.messageAr = 'تضارب';
  }
}

/**
 * Rate Limit Error
 */
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details = {}) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', details);
    this.messageAr = 'عدد كبير جداً من الطلبات';
  }
}

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, _next) => {
  // تعيين قيم افتراضية
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';
  err.code = err.code || 'INTERNAL_ERROR';

  // تسجيل الخطأ
  const context = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userId: req.user?.id,
    userAgent: req.get('user-agent'),
    query: req.query,
    body: sanitizeBody(req.body),
  };

  logError(err, context);

  // تسجيل أخطاء الأمان
  if (err.statusCode === 401 || err.statusCode === 403) {
    logSecurityEvent(`${err.code} - ${err.message}`, err.statusCode === 401 ? 'warn' : 'warn', {
      userId: req.user?.id,
      ip: req.ip,
      path: req.path,
    });
  }

  // معالجة أنواع الأخطاء المختلفة
  if (err.name === 'JsonWebTokenError') {
    err = new AuthenticationError('Invalid token');
  }

  if (err.name === 'TokenExpiredError') {
    err = new AuthenticationError('Token expired');
  }

  if (err.name === 'ValidationError') {
    err = new ValidationError('Validation failed', {
      errors: Object.values(err.errors).map(e => e.message),
    });
  }

  if (err.name === 'CastError') {
    err = new ValidationError(`Invalid ${err.path}`, {
      field: err.path,
      value: err.value,
    });
  }

  // إنشاء استجابة الخطأ
  const errorResponse = {
    success: false,
    error: {
      code: err.code,
      message: err.message,
      messageAr: err.messageAr || 'حدث خطأ',
      statusCode: err.statusCode,
      timestamp: err.timestamp || new Date().toISOString(),
    },
  };

  // إضافة التفاصيل في بيئة التطوير
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.details = err.details;
    errorResponse.error.stack = err.stack;
  }

  // إضافة تفاصيل الخطأ إذا كانت موجودة
  if (Object.keys(err.details || {}).length > 0) {
    errorResponse.error.details = err.details;
  }

  res.status(err.statusCode).json(errorResponse);
};

/**
 * معالجة الأخطاء غير الموجودة (404)
 */
const notFoundHandler = (req, res, next) => {
  const error = new NotFoundError('Endpoint', {
    method: req.method,
    path: req.path,
  });

  next(error);
};

/**
 * معالجة الأخطاء غير المتزامنة في المسارات
 */
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * تنظيف بيانات الطلب الحساسة
 */
function sanitizeBody(body) {
  if (!body) return undefined;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'pin', 'token', 'secret', 'apiKey'];

  const sanitizeRecursive = obj => {
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeRecursive(obj[key]);
      }
    }
  };

  sanitizeRecursive(sanitized);
  return sanitized;
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  sanitizeBody,
};
