// Advanced Error Handling Middleware
// Provides centralized error handling with logging and proper responses

import { Request, Response, NextFunction } from 'express';
import { logger } from '../modules/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
export function errorHandler(err: Error | AppError, req: Request, res: Response, next: NextFunction) {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;
  }

  // Log error
  logger.error(`Error ${statusCode}: ${message}`, {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userId: (req as any).user?.id,
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
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(`Route not found: ${req.originalUrl}`, 404);
  next(error);
}

// Async handler wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation error handler
export function validationError(message: string) {
  return new AppError(message, 400);
}

// Authorization error handler
export function authorizationError(message: string = 'Unauthorized') {
  return new AppError(message, 401);
}

// Forbidden error handler
export function forbiddenError(message: string = 'Forbidden') {
  return new AppError(message, 403);
}

// Not found error handler
export function notFoundError(resource: string) {
  return new AppError(`${resource} not found`, 404);
}
