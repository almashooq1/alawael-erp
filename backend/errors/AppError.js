/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AppError — Unified Error Class Hierarchy
 * نظام الأخطاء الموحّد للتطبيق
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for all application errors.
 * Every error class extends AppError, which extends native Error.
 *
 * Usage:
 *   throw new NotFoundError('User not found');
 *   throw new ValidationError('Email is required', ['email']);
 *   throw new AppError('Custom error', 500, 'CUSTOM_CODE');
 *
 * Features:
 *  - Consistent constructor: (message, statusCode, code)
 *  - isOperational flag for distinguishing operational vs programming errors
 *  - Automatic stack trace capture
 *  - Serializable to JSON for API responses
 */

'use strict';

// ─── Base Application Error ──────────────────────────────────────────────────

class AppError extends Error {
  /**
   * @param {string}  message    — Human-readable error message
   * @param {number}  statusCode — HTTP status code (default: 500)
   * @param {string}  code       — Machine-readable error code (default: derived from status)
   */
  constructor(message = 'Internal Server Error', statusCode = 500, code = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code || this._deriveCode(statusCode);
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  _deriveCode(status) {
    const codeMap = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'RATE_LIMIT_EXCEEDED',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };
    return codeMap[status] || 'APP_ERROR';
  }

  /**
   * Serialize for JSON API responses
   */
  toJSON() {
    return {
      success: false,
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      ...(this.errors && { errors: this.errors }),
      timestamp: this.timestamp,
    };
  }
}

// ─── Specific Error Classes ──────────────────────────────────────────────────

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', code = 'BAD_REQUEST') {
    super(message, 400, code);
  }
}

class ValidationError extends AppError {
  /**
   * @param {string}        message — Error message
   * @param {string[]}      errors  — Array of field-level error messages
   */
  constructor(message = 'Validation failed', errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}

class UnauthorizedError extends AuthenticationError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied', code = 'FORBIDDEN') {
    super(message, 403, code);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists', code = 'CONFLICT') {
    super(message, 409, code);
  }
}

class RateLimitError extends AppError {
  /**
   * @param {string} message
   * @param {number} retryAfter — Seconds until client can retry
   */
  constructor(message = 'Too many requests', retryAfter = 900) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

class TooManyRequestsError extends RateLimitError {
  constructor(message = 'Too Many Requests') {
    super(message);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

// ─── Backward Compatibility: ApiError (same interface as utils/apiResponse) ──

class ApiError extends AppError {
  /**
   * ApiError maintains the legacy constructor: (statusCode, message, errors, stack)
   * @param {number}   statusCode
   * @param {string}   message
   * @param {string[]} errors
   * @param {string}   stack
   */
  constructor(statusCode = 500, message = 'Something went wrong', errors = [], stack = '') {
    super(message, statusCode);
    this.errors = errors;
    this.data = null;
    this.success = false;
    if (stack) {
      this.stack = stack;
    }
  }
}

// ─── ApiResponse (moved here from utils/apiResponse for colocation) ──────────

class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  AppError,
  BadRequestError,
  ValidationError,
  AuthenticationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  TooManyRequestsError,
  ServiceUnavailableError,
  ApiError,
  ApiResponse,
};
