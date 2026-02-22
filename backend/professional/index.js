/**
 * Professional System Integration - تكامل النظام الاحترافي
 * Main Entry Point for All Professional Components
 * 
 * This module provides a unified interface to all professional
 * system components for the Alawael ERP system.
 */

// ==================== Observability ====================
const {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  getTracer,
  getMeter,
  createCustomMetrics,
  tracingMiddleware: otelTracingMiddleware,
} = require('../observability/opentelemetry');

// ==================== Error Tracking ====================
const {
  initializeSentry,
  closeSentry,
  setUser,
  getUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  requestHandler: sentryRequestHandler,
  errorHandler: sentryErrorHandler,
  tracingMiddleware: sentryTracingMiddleware,
  wrapAsync,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} = require('../errors/sentry-integration');

// ==================== Resilience ====================
const {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerFactory,
  CircuitState,
  RetryPolicy,
  Bulkhead,
  BulkheadError,
  factory: circuitBreakerFactory,
  wrap: wrapWithCircuitBreaker,
} = require('../resilience/circuit-breaker');

// ==================== Security ====================
const {
  accessControlMiddleware,
  createRBAC,
  encryption,
  sanitizeInput,
  sanitizationMiddleware,
  noSqlInjectionProtection,
  securityHeaders,
  corsConfig,
  passwordPolicy,
  sessionConfig,
  AccountLockout,
  securityLogger,
  ssrfProtection,
  ssrfMiddleware,
} = require('../security/owasp-compliance');

// ==================== Logging ====================
const {
  Logger,
  createLogger,
  logger,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  flushLogs,
} = require('../utils/advanced-logger');

// ==================== Health Checks ====================
const {
  HealthCheckManager,
  healthManager,
  HealthStatus,
  DatabaseHealthCheck,
  RedisHealthCheck,
  MemoryHealthCheck,
  CpuHealthCheck,
  DiskHealthCheck,
  ExternalServicesHealthCheck,
} = require('../health/advanced-health');

// ==================== Configuration ====================
const professionalConfig = {
  // Observability
  observability: {
    enabled: process.env.OBSERVABILITY_ENABLED !== 'false',
    serviceName: process.env.OTEL_SERVICE_NAME || 'alawael-erp-backend',
    prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  },
  
  // Error Tracking
  errorTracking: {
    enabled: !!process.env.SENTRY_DSN,
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.2'),
  },
  
  // Resilience
  resilience: {
    circuitBreaker: {
      enabled: process.env.CIRCUIT_BREAKER_ENABLED !== 'false',
      failureThreshold: parseInt(process.env.CB_FAILURE_THRESHOLD || '5'),
      timeout: parseInt(process.env.CB_TIMEOUT || '30000'),
    },
    retry: {
      enabled: process.env.RETRY_ENABLED !== 'false',
      maxRetries: parseInt(process.env.RETRY_MAX_RETRIES || '3'),
    },
  },
  
  // Security
  security: {
    headersEnabled: process.env.SECURITY_HEADERS_ENABLED !== 'false',
    sanitizeInput: process.env.SANITIZE_INPUT !== 'false',
    corsOrigins: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    prettyPrint: process.env.LOG_PRETTY === 'true',
    fileLogging: process.env.LOG_FILE === 'true',
  },
  
  // Health Checks
  healthChecks: {
    enabled: process.env.HEALTH_CHECKS_ENABLED !== 'false',
    path: process.env.HEALTH_PATH || '/health',
    livenessPath: process.env.LIVENESS_PATH || '/healthz',
    readinessPath: process.env.READINESS_PATH || '/readyz',
  },
};

// ==================== Initialization ====================

let initialized = false;

/**
 * Initialize all professional system components
 */
const initializeProfessionalSystem = async (app, options = {}) => {
  if (initialized) {
    console.log('⚠️ Professional system already initialized');
    return;
  }
  
  console.log('🚀 Initializing Professional System Components...');
  
  try {
    // 1. Initialize OpenTelemetry (must be first)
    if (professionalConfig.observability.enabled) {
      try {
        await initializeOpenTelemetry();
        console.log('✅ OpenTelemetry initialized');
      } catch (error) {
        console.warn('⚠️ OpenTelemetry initialization skipped:', error.message);
      }
    }
    
    // 2. Initialize Sentry Error Tracking
    if (professionalConfig.errorTracking.enabled) {
      try {
        initializeSentry();
        console.log('✅ Sentry initialized');
      } catch (error) {
        console.warn('⚠️ Sentry initialization skipped:', error.message);
      }
    }
    
    // 3. Setup Security Middleware
    if (professionalConfig.security.headersEnabled && app) {
      app.use(securityHeaders);
      console.log('✅ Security headers configured');
    }
    
    // 4. Setup Request Logging
    if (app) {
      app.use(requestLoggingMiddleware);
      console.log('✅ Request logging configured');
    }
    
    // 5. Setup Sentry Request Handler
    if (professionalConfig.errorTracking.enabled && app) {
      app.use(sentryRequestHandler());
      app.use(sentryTracingMiddleware());
      console.log('✅ Sentry request handlers configured');
    }
    
    // 6. Setup Input Sanitization
    if (professionalConfig.security.sanitizeInput && app) {
      app.use(sanitizationMiddleware);
      app.use(noSqlInjectionProtection);
      console.log('✅ Input sanitization configured');
    }
    
    // 7. Setup Health Check Routes
    if (professionalConfig.healthChecks.enabled && app) {
      healthManager.setupRoutes(app);
      console.log('✅ Health check routes configured');
    }
    
    initialized = true;
    console.log('🎉 Professional System initialized successfully');
    
    return {
      success: true,
      components: {
        observability: professionalConfig.observability.enabled,
        errorTracking: professionalConfig.errorTracking.enabled,
        security: professionalConfig.security.headersEnabled,
        logging: true,
        healthChecks: professionalConfig.healthChecks.enabled,
      },
    };
  } catch (error) {
    console.error('❌ Failed to initialize professional system:', error);
    throw error;
  }
};

/**
 * Setup Error Handlers (must be called after all routes)
 */
const setupErrorHandlers = (app) => {
  if (!app) return;
  
  // Sentry Error Handler
  if (professionalConfig.errorTracking.enabled) {
    app.use(sentryErrorHandler());
  }
  
  // Logging Error Handler
  app.use(errorLoggingMiddleware);
  
  // Generic Error Handler
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const code = err.code || 'INTERNAL_ERROR';
    
    res.status(statusCode).json({
      success: false,
      code,
      message: err.message || 'An unexpected error occurred',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
      requestId: req.id,
      timestamp: new Date().toISOString(),
    });
  });
  
  console.log('✅ Error handlers configured');
};

/**
 * Graceful Shutdown
 */
const shutdownProfessionalSystem = async () => {
  console.log('🔄 Shutting down professional system...');
  
  try {
    // Flush logs
    await flushLogs();
    console.log('✅ Logs flushed');
    
    // Close Sentry
    await closeSentry();
    console.log('✅ Sentry closed');
    
    // Shutdown OpenTelemetry
    await shutdownOpenTelemetry();
    console.log('✅ OpenTelemetry shutdown');
    
    // Shutdown all circuit breakers
    circuitBreakerFactory.shutdownAll();
    console.log('✅ Circuit breakers shutdown');
    
    console.log('👋 Professional system shutdown complete');
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
  }
};

// ==================== Decorators and Utilities ====================

/**
 * Decorator to add resilience to async methods
 */
const resilient = (serviceName, options = {}) => {
  return (target, propertyKey, descriptor) => {
    const originalMethod = descriptor.value;
    const breaker = circuitBreakerFactory.get(`${serviceName}.${propertyKey}`, options);
    
    descriptor.value = async function (...args) {
      return breaker.fire(originalMethod.bind(this), ...args);
    };
    
    return descriptor;
  };
};

/**
 * Create a resilient service wrapper
 */
const createResilientService = (name, service, options = {}) => {
  const breaker = circuitBreakerFactory.get(name, options);
  const retry = new RetryPolicy(options.retry || {});
  
  const wrappedService = {};
  
  for (const [key, fn] of Object.entries(service)) {
    if (typeof fn === 'function') {
      wrappedService[key] = async (...args) => {
        return retry.execute(() => breaker.fire(fn, ...args));
      };
    } else {
      wrappedService[key] = fn;
    }
  }
  
  return wrappedService;
};

/**
 * Create a monitored service
 */
const createMonitoredService = (name, service) => {
  const tracer = getTracer(name);
  const meter = getMeter(name);
  const log = createLogger({ service: name });
  
  const wrappedService = {};
  
  for (const [key, fn] of Object.entries(service)) {
    if (typeof fn === 'function') {
      wrappedService[key] = async (...args) => {
        const span = tracer.startSpan(`${name}.${key}`);
        
        try {
          const result = await fn(...args);
          span.setStatus({ code: 1 });
          span.end();
          return result;
        } catch (error) {
          span.recordException(error);
          span.setStatus({ code: 2, message: error.message });
          span.end();
          
          log.error(`Service error: ${name}.${key}`, error);
          captureException(error, {
            tags: { service: name, method: key },
          });
          
          throw error;
        }
      };
    } else {
      wrappedService[key] = fn;
    }
  }
  
  return wrappedService;
};

// ==================== Express Integration ====================

/**
 * Complete Express integration
 */
const integrateWithExpress = (app, options = {}) => {
  // Initialize system
  const initPromise = initializeProfessionalSystem(app, options);
  
  // Setup error handlers (should be called after routes are defined)
  const setupErrors = () => setupErrorHandlers(app);
  
  return {
    initialized: initPromise,
    setupErrorHandlers: setupErrors,
    shutdown: shutdownProfessionalSystem,
  };
};

// ==================== Exports ====================

module.exports = {
  // Main Functions
  initializeProfessionalSystem,
  setupErrorHandlers,
  shutdownProfessionalSystem,
  integrateWithExpress,
  
  // Configuration
  professionalConfig,
  
  // Observability
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  getTracer,
  getMeter,
  createCustomMetrics,
  otelTracingMiddleware,
  
  // Error Tracking
  initializeSentry,
  closeSentry,
  setUser,
  getUser,
  captureException,
  captureMessage,
  addBreadcrumb,
  startTransaction,
  sentryRequestHandler,
  sentryErrorHandler,
  sentryTracingMiddleware,
  wrapAsync,
  
  // Error Classes
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  
  // Resilience
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerFactory,
  CircuitState,
  RetryPolicy,
  Bulkhead,
  BulkheadError,
  circuitBreakerFactory,
  wrapWithCircuitBreaker,
  resilient,
  createResilientService,
  
  // Security
  accessControlMiddleware,
  createRBAC,
  encryption,
  sanitizeInput,
  sanitizationMiddleware,
  noSqlInjectionProtection,
  securityHeaders,
  corsConfig,
  passwordPolicy,
  sessionConfig,
  AccountLockout,
  securityLogger,
  ssrfProtection,
  ssrfMiddleware,
  
  // Logging
  Logger,
  createLogger,
  logger,
  requestLoggingMiddleware,
  errorLoggingMiddleware,
  flushLogs,
  
  // Health Checks
  HealthCheckManager,
  healthManager,
  HealthStatus,
  DatabaseHealthCheck,
  RedisHealthCheck,
  MemoryHealthCheck,
  CpuHealthCheck,
  DiskHealthCheck,
  ExternalServicesHealthCheck,
  
  // Utilities
  createMonitoredService,
};