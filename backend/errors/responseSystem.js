/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Unified Response System — نظام الاستجابات الموحّد
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for ALL response formatting across the API.
 * Replaces 4 competing systems:
 *   - utils/response.js          (functions)
 *   - utils/responseFormatter.js  (classes)
 *   - utils/responseHelpers.js    (Arabic defaults)
 *   - middleware/responseHandler.js (Express extensions)
 *
 * Features:
 *   - Fluent response classes (SuccessResponse, PaginatedResponse, ErrorResponse)
 *   - Helper functions (sendSuccess, sendError, sendPaginated, sendCreated)
 *   - Express middleware (res.success, res.created, res.error, res.paginated, res.noContent)
 *   - Request ID correlation
 *   - Pagination with hasNext/hasPrev
 */

'use strict';

// ─── Response Classes ────────────────────────────────────────────────────────

class SuccessResponse {
  constructor(data = null, message = 'Success', meta = {}) {
    this.success = true;
    this.message = message;
    this.data = data;

    if (Object.keys(meta).length > 0) {
      this.meta = meta;
    }

    this.timestamp = new Date().toISOString();
  }

  send(res, statusCode = 200) {
    return res.status(statusCode).json(this);
  }
}

class PaginatedResponse extends SuccessResponse {
  constructor(data, page, limit, total, message = 'Success') {
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 20;
    const parsedTotal = parseInt(total) || 0;
    const totalPages = Math.ceil(parsedTotal / parsedLimit);

    const meta = {
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total: parsedTotal,
        pages: totalPages,
        hasNext: parsedPage < totalPages,
        hasPrev: parsedPage > 1,
        hasMore: parsedPage * parsedLimit < parsedTotal,
      },
    };

    super(data, message, meta);
  }
}

class ErrorResponse {
  constructor(message, code = 'ERROR', errors = [], statusCode = 500) {
    this.success = false;
    this.message = message;
    this.error = message;
    this.code = code;
    this.statusCode = statusCode;

    if (errors.length > 0) {
      this.errors = errors;
    }

    this.timestamp = new Date().toISOString();
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

// ─── Error Type Factory ──────────────────────────────────────────────────────

const ErrorTypes = {
  BadRequest: (message = 'Bad Request', errors = []) =>
    new ErrorResponse(message, 'BAD_REQUEST', errors, 400),

  Unauthorized: (message = 'Unauthorized') =>
    new ErrorResponse(message, 'UNAUTHORIZED', [], 401),

  Forbidden: (message = 'Forbidden') =>
    new ErrorResponse(message, 'FORBIDDEN', [], 403),

  NotFound: (message = 'Resource not found') =>
    new ErrorResponse(message, 'NOT_FOUND', [], 404),

  Conflict: (message = 'Resource already exists') =>
    new ErrorResponse(message, 'CONFLICT', [], 409),

  ValidationError: (errors = []) =>
    new ErrorResponse('Validation failed', 'VALIDATION_ERROR', errors, 400),

  RateLimitExceeded: (retryAfter = 900) =>
    new ErrorResponse(
      'Too many requests',
      'RATE_LIMIT_EXCEEDED',
      [{ retryAfter: `${retryAfter} seconds` }],
      429
    ),

  ServerError: (message = 'Internal server error') =>
    new ErrorResponse(message, 'SERVER_ERROR', [], 500),

  ServiceUnavailable: (message = 'Service temporarily unavailable') =>
    new ErrorResponse(message, 'SERVICE_UNAVAILABLE', [], 503),
};

// ─── Response Helper Functions ───────────────────────────────────────────────

const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return new SuccessResponse(data, message).send(res, statusCode);
};

const sendSuccess = (res, data, message = 'تمت العملية بنجاح', statusCode = 200) => {
  return new SuccessResponse(data, message).send(res, statusCode);
};

const sendCreated = (res, data = null, message = 'Created successfully') => {
  return new SuccessResponse(data, message).send(res, 201);
};

const errorResponse = (res, message = 'Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (errors) response.errors = Array.isArray(errors) ? errors : [errors];
  return res.status(statusCode).json(response);
};

const sendError = (res, message = 'حدث خطأ في الخادم', statusCode = 500, details = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
};

const paginatedResponse = (res, data, total, page, limit, message = 'Success') => {
  return new PaginatedResponse(data, page, limit, total, message).send(res);
};

const sendPaginated = (res, data, page, limit, total, message = 'Success') => {
  return new PaginatedResponse(data, page, limit, total, message).send(res);
};

// ─── Express Middleware (attach res.success, res.error, etc.) ────────────────

const enhanceResponse = (req, res, next) => {
  const requestId = req.id || req.headers?.['x-request-id'];

  /**
   * res.success(data, message, statusCode)
   */
  res.success = (data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      requestId: requestId || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * res.created(data, message)
   */
  res.created = (data = null, message = 'Created successfully') => {
    return res.status(201).json({
      success: true,
      message,
      data,
      requestId: requestId || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * res.error(message, statusCode, data)
   */
  res.error = (message = 'Error', statusCode = 500, data = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      data,
      requestId: requestId || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * res.validationError(errors, message)
   */
  res.validationError = (errors, message = 'Validation failed') => {
    return res.status(400).json({
      success: false,
      message,
      errors: Array.isArray(errors) ? errors : [errors],
      requestId: requestId || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * res.paginated(data, total, limit, offset, message)
   */
  res.paginated = (data, total, limit, offset, message = 'Success') => {
    const parsedLimit = parseInt(limit) || 20;
    const parsedOffset = parseInt(offset) || 0;
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        pages: Math.ceil(total / parsedLimit),
        hasMore: parsedOffset + parsedLimit < total,
      },
      requestId: requestId || undefined,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * res.noContent()
   */
  res.noContent = () => {
    return res.status(204).end();
  };

  // Shorthand error helpers
  res.badRequest = (message = 'Bad Request', errors = []) =>
    ErrorTypes.BadRequest(message, errors).send(res);

  res.unauthorized = (message = 'Unauthorized') =>
    ErrorTypes.Unauthorized(message).send(res);

  res.forbidden = (message = 'Forbidden') =>
    ErrorTypes.Forbidden(message).send(res);

  res.notFound = (message = 'Resource not found') =>
    ErrorTypes.NotFound(message).send(res);

  res.conflict = (message = 'Resource already exists') =>
    ErrorTypes.Conflict(message).send(res);

  res.serverError = (message = 'Internal server error') =>
    ErrorTypes.ServerError(message).send(res);

  next();
};

// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Classes
  SuccessResponse,
  PaginatedResponse,
  ErrorResponse,
  ErrorTypes,

  // Functions (utils/response.js style)
  successResponse,
  errorResponse,
  paginatedResponse,

  // Functions (utils/responseHelpers.js style)
  sendSuccess,
  sendError,
  sendCreated,
  sendPaginated,

  // Middleware
  enhanceResponse,
};
