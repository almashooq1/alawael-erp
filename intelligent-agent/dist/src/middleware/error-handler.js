"use strict";
// Advanced Error Handling Middleware
// Provides centralized error handling with logging and proper responses
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
exports.asyncHandler = asyncHandler;
exports.validationError = validationError;
exports.authorizationError = authorizationError;
exports.forbiddenError = forbiddenError;
exports.notFoundError = notFoundError;
const logger_1 = require("../modules/logger");
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// Error handler middleware
function errorHandler(err, req, res, next) {
    let statusCode = 500;
    let message = 'Internal Server Error';
    let isOperational = false;
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        isOperational = err.isOperational;
    }
    // Log error
    logger_1.logger.error(`Error ${statusCode}: ${message}`, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.user?.id,
    }, err);
    // Don't leak error details in production for non-operational errors
    if (!isOperational && process.env.NODE_ENV === 'production') {
        message = 'Internal Server Error';
    }
    res.status(statusCode).json({
        success: false,
        error: {
            message,
            statusCode,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        },
    });
}
// Not found handler
function notFoundHandler(req, res, next) {
    const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
    next(error);
}
// Async handler wrapper
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
// Validation error handler
function validationError(message) {
    return new AppError(message, 400);
}
// Authorization error handler
function authorizationError(message = 'Unauthorized') {
    return new AppError(message, 401);
}
// Forbidden error handler
function forbiddenError(message = 'Forbidden') {
    return new AppError(message, 403);
}
// Not found error handler
function notFoundError(resource) {
    return new AppError(`${resource} not found`, 404);
}
