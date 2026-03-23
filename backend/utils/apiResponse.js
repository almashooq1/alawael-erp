// @deprecated — Prefer importing from 'errors/AppError' for ApiResponse & ApiError
/* eslint-disable no-unused-vars */
// backend/utils/apiResponse.js
/**
 * Standardized API Response wrapper
 * Used for consistent response formatting across all API endpoints
 */

class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

/**
 * API Error wrapper
 * Used for consistent error handling across all API endpoints
 */
class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.errors = errors;
    this.success = false;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = {
  ApiResponse,
  ApiError,
};
