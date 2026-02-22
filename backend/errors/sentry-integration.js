/**
 * Sentry Error Tracking Integration - نظام تتبع الأخطاء
 * Professional Error Management for Alawael ERP
 */

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const Tracing = require('@sentry/tracing');

// Configuration
const config = {
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.SENTRY_RELEASE || `alawael-erp@${process.env.npm_package_version || '1.0.0'}`,
  
  // Sampling rates
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  
  // Performance monitoring
  enableTracing: process.env.SENTRY_ENABLE_TRACING !== 'false',
  enableProfiling: process.env.SENTRY_ENABLE_PROFILING === 'true',
  
  // Session replay (frontend)
  replaysSessionSampleRate: parseFloat(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'),
  replaysOnErrorSampleRate: parseFloat(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE || '1.0'),
};

// User context
let currentUser = null;

/**
 * Initialize Sentry
 */
const initializeSentry = () => {
  if (!config.dsn) {
    console.warn('⚠️ Sentry DSN not configured. Error tracking disabled.');
    return false;
  }
  
  try {
    const integrations = [
      // Enable HTTP integration
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express integration
      new Tracing.Integrations.Express({
        app: undefined, // Will be set later
      }),
      // Enable MongoDB integration
      new Tracing.Integrations.Mongo(),
      // Enable Mongoose integration
      new Tracing.Integrations.Mongoose(),
    ];
    
    // Add profiling if enabled
    if (config.enableProfiling) {
      integrations.push(new ProfilingIntegration());
    }
    
    Sentry.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      integrations,
      
      // Performance Monitoring
      tracesSampleRate: config.tracesSampleRate,
      
      // Profiling
      profilesSampleRate: config.profilesSampleRate,
      
      // Set transaction name to route
      normalizeDepth: 10,
      
      // Additional options
      attachStacktrace: true,
      sendDefaultPii: false,
      
      // Before send hook - filter sensitive data
      beforeSend(event, hint) {
        // Don't send events in development unless explicitly enabled
        if (config.environment === 'development' && process.env.SENTRY_SEND_IN_DEV !== 'true') {
          return null;
        }
        
        // Filter out sensitive headers
        if (event.request?.headers) {
          const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie', 'x-api-key'];
          sensitiveHeaders.forEach(header => {
            if (event.request.headers[header]) {
              event.request.headers[header] = '[Filtered]';
            }
          });
        }
        
        // Filter out sensitive body fields
        if (event.request?.data) {
          try {
            const data = typeof event.request.data === 'string' 
              ? JSON.parse(event.request.data) 
              : event.request.data;
            
            const sensitiveFields = ['password', 'passwordConfirm', 'token', 'secret', 'apiKey'];
            sensitiveFields.forEach(field => {
              if (data[field]) {
                data[field] = '[Filtered]';
              }
            });
            
            event.request.data = JSON.stringify(data);
          } catch (e) {
            // Keep original data if parsing fails
          }
        }
        
        return event;
      },
      
      // Before breadcrumb hook
      beforeBreadcrumb(breadcrumb, hint) {
        // Filter out health check requests
        if (breadcrumb.category === 'http' && breadcrumb.data?.url) {
          const url = breadcrumb.data.url;
          if (url.includes('/health') || url.includes('/metrics')) {
            return null;
          }
        }
        return breadcrumb;
      },
      
      // Ignore specific errors
      ignoreErrors: [
        // Common browser errors
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
        'NetworkError',
        'cancelled',
        'canceled',
        
        // Common Node.js errors
        'ECONNREFUSED',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        
        // Custom errors to ignore
        'ValidationError',
        'UnauthorizedError',
      ],
      
      // Ignore transactions
      ignoreTransactions: [
        'GET /health',
        'GET /metrics',
        'GET /favicon.ico',
      ],
    });
    
    console.log('✅ Sentry initialized successfully');
    console.log(`📊 Environment: ${config.environment}`);
    console.log(`🏷️ Release: ${config.release}`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
    return false;
  }
};

/**
 * Set user context
 */
const setUser = (user) => {
  currentUser = user;
  
  if (user) {
    Sentry.setUser({
      id: user._id || user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      organization: user.organizationId || user.organization,
    });
  } else {
    Sentry.setUser(null);
  }
};

/**
 * Get current user
 */
const getUser = () => currentUser;

/**
 * Capture exception with context
 */
const captureException = (error, context = {}) => {
  // Add custom context
  if (Object.keys(context).length > 0) {
    Sentry.withScope((scope) => {
      // Add tags
      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }
      
      // Add extra context
      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }
      
      // Add request context
      if (context.request) {
        scope.setRequestData(context.request);
      }
      
      // Add user context
      if (context.user) {
        scope.setUser({
          id: context.user._id || context.user.id,
          email: context.user.email,
          username: context.user.username,
        });
      }
      
      // Set fingerprint for grouping
      if (context.fingerprint) {
        scope.setFingerprint(context.fingerprint);
      }
      
      // Set level
      if (context.level) {
        scope.setLevel(context.level);
      }
      
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
};

/**
 * Capture message
 */
const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.withScope((scope) => {
    // Add tags
    if (context.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    // Add extra context
    if (context.extra) {
      Object.entries(context.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
};

/**
 * Add breadcrumb
 */
const addBreadcrumb = (breadcrumb) => {
  Sentry.addBreadcrumb({
    timestamp: Date.now() / 1000,
    ...breadcrumb,
  });
};

/**
 * Start transaction for performance monitoring
 */
const startTransaction = (name, op = 'http.server') => {
  return Sentry.startTransaction({
    name,
    op,
  });
};

/**
 * Express error handler middleware
 */
const errorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Only capture 4xx and 5xx errors
      const statusCode = error.status || error.statusCode || 500;
      return statusCode >= 400;
    },
  });
};

/**
 * Express request handler middleware
 */
const requestHandler = () => {
  return Sentry.Handlers.requestHandler({
    user: ['id', 'email', 'username', 'role'],
    ip: true,
    request: true,
    transaction: 'methodPath',
  });
};

/**
 * Tracing middleware for Express
 */
const tracingMiddleware = () => {
  return Sentry.Handlers.tracingHandler();
};

/**
 * Create span for custom instrumentation
 */
const createSpan = (name, op, parentSpan) => {
  const scope = Sentry.getCurrentScope();
  const parent = parentSpan || scope.getSpan();
  
  if (parent) {
    return parent.startChild({
      op,
      description: name,
    });
  }
  
  return Sentry.startTransaction({
    name,
    op,
  });
};

/**
 * Wrap async function with error capture
 */
const wrapAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      captureException(error, {
        tags: {
          route: req.route?.path || req.path,
          method: req.method,
        },
        extra: {
          body: req.body,
          query: req.query,
          params: req.params,
        },
      });
      next(error);
    });
  };
};

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Error serializer for logging
 */
const serializeError = (error) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
    };
  }
  return error;
};

/**
 * Close Sentry connection
 */
const closeSentry = async () => {
  try {
    await Sentry.close(2000);
    console.log('✅ Sentry closed successfully');
  } catch (error) {
    console.error('❌ Error closing Sentry:', error);
  }
};

module.exports = {
  // Initialization
  initializeSentry,
  closeSentry,
  
  // User context
  setUser,
  getUser,
  
  // Error capture
  captureException,
  captureMessage,
  addBreadcrumb,
  
  // Performance
  startTransaction,
  createSpan,
  
  // Middleware
  requestHandler,
  errorHandler,
  tracingMiddleware,
  wrapAsync,
  
  // Error classes
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Utilities
  serializeError,
  config,
};