/**
 * Response Formatter Service
 * Standardized API responses with consistent formatting
 * Phase 10: Advanced Features
 */

const logger = require('../utils/logger');

class ResponseFormatter {
  constructor() {
    this.statusCodes = {
      OK: 200,
      CREATED: 201,
      ACCEPTED: 202,
      BAD_REQUEST: 400,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      INTERNAL_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
    };
  }

  /**
   * Success response
   */
  success(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      statusCode,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Error response
   */
  error(message, errorCode = null, statusCode = 400, details = null) {
    return {
      success: false,
      statusCode,
      message,
      errorCode,
      details,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Paginated response
   */
  paginated(items, total, page = 1, limit = 20, message = 'Data retrieved') {
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      statusCode: 200,
      message,
      data: {
        items,
        pagination: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * List response
   */
  list(items, message = 'Items retrieved') {
    return {
      success: true,
      statusCode: 200,
      message,
      data: {
        items,
        count: items.length,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Created response
   */
  created(data, message = 'Resource created') {
    return {
      success: true,
      statusCode: 201,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Updated response
   */
  updated(data, message = 'Resource updated') {
    return {
      success: true,
      statusCode: 200,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Deleted response
   */
  deleted(message = 'Resource deleted') {
    return {
      success: true,
      statusCode: 200,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Validation error response
   */
  validationError(errors, message = 'Validation failed') {
    return {
      success: false,
      statusCode: 400,
      message,
      errorCode: 'VALIDATION_ERROR',
      errors: Array.isArray(errors) ? errors : [errors],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Not found response
   */
  notFound(resource = 'Resource', message = null) {
    return {
      success: false,
      statusCode: 404,
      message: message || `${resource} not found`,
      errorCode: 'NOT_FOUND',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Unauthorized response
   */
  unauthorized(message = 'Unauthorized access') {
    return {
      success: false,
      statusCode: 401,
      message,
      errorCode: 'UNAUTHORIZED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Forbidden response
   */
  forbidden(message = 'Access forbidden') {
    return {
      success: false,
      statusCode: 403,
      message,
      errorCode: 'FORBIDDEN',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Conflict response
   */
  conflict(message = 'Resource conflict') {
    return {
      success: false,
      statusCode: 409,
      message,
      errorCode: 'CONFLICT',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Server error response
   */
  serverError(message = 'Internal server error', error = null) {
    if (error) {
      logger.error('Server error:', error);
    }

    return {
      success: false,
      statusCode: 500,
      message,
      errorCode: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Service unavailable response
   */
  serviceUnavailable(message = 'Service temporarily unavailable') {
    return {
      success: false,
      statusCode: 503,
      message,
      errorCode: 'SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Batch operation response
   */
  batchOperation(results, failedCount = 0, message = 'Batch operation completed') {
    return {
      success: failedCount === 0,
      statusCode: failedCount === 0 ? 200 : 207,
      message,
      data: {
        successful: results.length - failedCount,
        failed: failedCount,
        total: results.length,
        results,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Search results response
   */
  searchResults(results, query, total, message = 'Search completed') {
    return {
      success: true,
      statusCode: 200,
      message,
      data: {
        query,
        results,
        count: results.length,
        total,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analytics response
   */
  analytics(data, period = 'unknown', message = 'Analytics data retrieved') {
    return {
      success: true,
      statusCode: 200,
      message,
      data: {
        period,
        ...data,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Stream response headers
   */
  getStreamHeaders(filename = 'export') {
    return {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };
  }

  /**
   * Format error for logging
   */
  formatErrorLog(error, context = {}) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code,
      context,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new ResponseFormatter();
