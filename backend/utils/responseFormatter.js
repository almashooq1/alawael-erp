/**
 * Standardized Response Formatter
 * تنسيق موحّد للاستجابات
 */

/**
 * Success Response Class
 */
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

/**
 * Paginated Response Class
 */
class PaginatedResponse extends SuccessResponse {
  constructor(data, page, limit, total, message = 'Success') {
    const meta = {
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(total),
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };

    super(data, message, meta);
  }
}

/**
 * Error Response Class
 */
class ErrorResponse {
  constructor(message, code = 'ERROR', errors = [], statusCode = 500) {
    this.success = false;
    this.error = message;
    this.code = code;

    if (errors.length > 0) {
      this.errors = errors;
    }

    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  send(res) {
    return res.status(this.statusCode).json(this);
  }
}

/**
 * Common error responses
 */
const ErrorTypes = {
  BadRequest: (message = 'Bad Request', errors = []) =>
    new ErrorResponse(message, 'BAD_REQUEST', errors, 400),

  Unauthorized: (message = 'Unauthorized') => new ErrorResponse(message, 'UNAUTHORIZED', [], 401),

  Forbidden: (message = 'Forbidden') => new ErrorResponse(message, 'FORBIDDEN', [], 403),

  NotFound: (message = 'Resource not found') => new ErrorResponse(message, 'NOT_FOUND', [], 404),

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

/**
 * Response Helper Functions
 */
const sendSuccess = (res, data = null, message = 'Success', meta = {}, statusCode = 200) => {
  return new SuccessResponse(data, message, meta).send(res, statusCode);
};

const sendCreated = (res, data = null, message = 'Created successfully') => {
  return new SuccessResponse(data, message).send(res, 201);
};

const sendPaginated = (res, data, page, limit, total, message = 'Success') => {
  return new PaginatedResponse(data, page, limit, total, message).send(res);
};

const sendError = (res, message, code = 'ERROR', errors = [], statusCode = 500) => {
  return new ErrorResponse(message, code, errors, statusCode).send(res);
};

/**
 * Express Response Extensions
 * تمديدات لكائن الاستجابة في Express
 */
const enhanceResponse = (req, res, next) => {
  // Success response
  res.success = (data = null, message = 'Success', meta = {}) => {
    return sendSuccess(res, data, message, meta);
  };

  // Created response
  res.created = (data = null, message = 'Created successfully') => {
    return sendCreated(res, data, message);
  };

  // Paginated response
  res.paginated = (data, page, limit, total, message = 'Success') => {
    return sendPaginated(res, data, page, limit, total, message);
  };

  // Error responses
  res.badRequest = (message = 'Bad Request', errors = []) => {
    return ErrorTypes.BadRequest(message, errors).send(res);
  };

  res.unauthorized = (message = 'Unauthorized') => {
    return ErrorTypes.Unauthorized(message).send(res);
  };

  res.forbidden = (message = 'Forbidden') => {
    return ErrorTypes.Forbidden(message).send(res);
  };

  res.notFound = (message = 'Resource not found') => {
    return ErrorTypes.NotFound(message).send(res);
  };

  res.conflict = (message = 'Resource already exists') => {
    return ErrorTypes.Conflict(message).send(res);
  };

  res.validationError = (errors = []) => {
    return ErrorTypes.ValidationError(errors).send(res);
  };

  res.serverError = (message = 'Internal server error') => {
    return ErrorTypes.ServerError(message).send(res);
  };

  next();
};

module.exports = {
  SuccessResponse,
  PaginatedResponse,
  ErrorResponse,
  ErrorTypes,
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendError,
  enhanceResponse,
};
