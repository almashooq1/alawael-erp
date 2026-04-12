/**
 * startup/middleware.js — Express middleware stack
 * ═══════════════════════════════════════════════
 * Extracted from app.js for maintainability.
 *
 * Configures: security headers, CORS, body parsing, sanitization,
 * compression, caching, rate limiting, logging, Swagger, etc.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const logger = require('../utils/logger');
const { shutdownMiddleware } = require('../utils/gracefulShutdown');
const { sanitizeInput: requestValidationSanitize } = require('../middleware/requestValidation');
const sanitizeInput = require('../middleware/sanitize');
const { apiLimiter } = require('../middleware/rateLimiter');
const { suspiciousActivityDetector } = require('../utils/security');
const responseHandler = require('../middleware/responseHandler');
const { maintenanceMiddleware } = require('../middleware/maintenance.middleware');
const apiKeyAuth = require('../middleware/apiKey.middleware');
const { apiVersionMiddleware } = require('../middleware/apiVersion.middleware');
const { requestContext } = require('../middleware/dto.middleware');
const { auditMiddleware } = require('../middleware/auditTrail.middleware');
const { metricsMiddleware, metricsHandler } = require('../middleware/metrics.middleware');
const { requestLogger } = require('../config/security.advanced');
const securityHeaders = require('../middleware/securityHeaders');
const csrfProtection = require('../middleware/csrfProtection');
const { jsonDepthLimiter, validateSecurityConfig } = require('../middleware/securityHardening');
const sanitizeErrorResponse = require('../middleware/sanitizeErrorResponse');
const {
  initializeRedis,
  compressionMiddleware,
  requestTimerMiddleware,
  cacheMiddleware,
} = require('../config/performance');
const { initializePerformanceOptimizations } = require('../utils/performance-optimizer');
const { requestIdMiddleware } = require('../middleware/requestId.middleware');
const { requestLoggerMiddleware } = require('../middleware/requestLogger.middleware');
const {
  createIntegrationContextMiddleware,
} = require('../middleware/integrationContext.middleware');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { paginationDefaults } = require('../middleware/paginationDefaults');
const { globalValidation } = require('../middleware/globalValidation');

// Run security config audit at startup (logs warnings for risky settings)
validateSecurityConfig();

/**
 * Set up the full Express middleware stack.
 *
 * @param {import('express').Application} app
 * @param {object}  opts
 * @param {boolean} opts.isTestEnv
 * @param {boolean} opts.isProd
 */
function setupMiddleware(app, { isTestEnv, isProd }) {
  // ── DEV-ONLY test endpoints (before all middleware) ──────────────────────
  if (process.env.NODE_ENV === 'development') {
    app.get('/test-first', (_req, res) => {
      res.json({
        success: true,
        message: 'FIRST ENDPOINT WORKS! (Super Early)',
        timestamp: new Date(),
      });
    });
    app.get('/api/test', (_req, res) => {
      res.json({ success: true, message: '/api/test works! (Super Early)', timestamp: new Date() });
    });
    logger.debug('Dev test endpoints mounted: /test-first, /api/test');
  }

  // ── Phase 29-33 public bypass ────────────────────────────────────────────
  if (process.env.PHASE2933_PUBLIC === 'true') {
    app.use((req, _res, next) => {
      if (req.path.startsWith('/api/phases-29-33')) {
        req.isPhase2933Public = true;
      }
      next();
    });
  }

  // ── Service worker ───────────────────────────────────────────────────────
  app.get('/service-worker.js', (_req, res) => {
    const swPath = require('path').join(__dirname, '..', 'public', 'service-worker.js');
    res.type('application/javascript').sendFile(swPath);
  });

  // ── Trust proxy ──────────────────────────────────────────────────────────
  app.set('trust proxy', 1);

  // ── Request ID (traceability — must be before everything else) ──────────
  app.use(requestIdMiddleware);
  app.use(requestLoggerMiddleware);

  // ── Security (must be first) ─────────────────────────────────────────────
  app.use(securityHeaders);
  app.use(sanitizeErrorResponse);
  app.use(suspiciousActivityDetector);
  app.use(shutdownMiddleware);
  app.use(apiKeyAuth);
  app.use(maintenanceMiddleware);

  // ── CORS ─────────────────────────────────────────────────────────────────
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'http://localhost:3004',
    'http://localhost:3005',
  ];
  const prodOriginsRaw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
  const prodOrigins = prodOriginsRaw
    ? prodOriginsRaw
        .split(',')
        .map(o => o.trim())
        .filter(Boolean)
    : [];

  if (isProd && !prodOrigins.length) {
    logger.warn(
      '⚠️  WARNING: No CORS_ORIGINS or CORS_ORIGIN set in production. ' +
        'Falling back to FRONTEND_URL or rejecting cross-origin requests.'
    );
  }

  const corsOptions = {
    origin: isProd
      ? prodOrigins.length
        ? prodOrigins
        : process.env.FRONTEND_URL
          ? [process.env.FRONTEND_URL]
          : false
      : [process.env.FRONTEND_URL || 'http://localhost:3004', ...devOrigins],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token',
      'X-Request-Id',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Response-Time', 'X-Cache', 'X-RateLimit-Remaining'],
    maxAge: 86400,
  };
  app.use(cors(corsOptions));

  // ── Body parsing ─────────────────────────────────────────────────────────
  app.use('/api/upload', express.json({ limit: '10mb' }));
  app.use('/api/upload', express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // ── JSON depth limiter (DoS protection) ──────────────────────────────────
  app.use(jsonDepthLimiter);

  // ── Input sanitization ───────────────────────────────────────────────────
  app.use(sanitizeInput);
  app.use(requestValidationSanitize);

  // ── Pagination cap ───────────────────────────────────────────────────────
  const capPagination = require('../middleware/capPagination');
  app.use(capPagination());

  // ── CSRF ─────────────────────────────────────────────────────────────────
  app.use(csrfProtection);

  // ── Performance ──────────────────────────────────────────────────────────
  app.use(compressionMiddleware);
  app.use(requestTimerMiddleware);
  app.use(cacheMiddleware(300, 'api'));

  if (!isTestEnv) {
    initializeRedis();
  }
  initializePerformanceOptimizations(app);

  // ── API versioning & request context ─────────────────────────────────────
  app.use(apiVersionMiddleware);
  app.use(requestContext);
  app.use(metricsMiddleware);

  // Prometheus metrics endpoint
  app.get(
    '/metrics',
    (req, res, next) => {
      const token = process.env.METRICS_TOKEN;
      if (token && req.headers.authorization !== `Bearer ${token}`) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      next();
    },
    metricsHandler
  );

  // ── Audit trail ──────────────────────────────────────────────────────────
  app.use(auditMiddleware());

  // ── Response helper & logging ────────────────────────────────────────────
  app.use(responseHandler);

  // Custom morgan token — strips sensitive query params
  const SENSITIVE_QS_KEYS =
    /(?:^|&)(token|password|secret|key|authorization|api_key|apikey|access_token|refresh_token)=[^&]*/gi;
  morgan.token('safe-url', req => {
    const url = req.originalUrl || req.url || '';
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return url;
    const pathPart = url.substring(0, qIdx);
    const qs = url
      .substring(qIdx + 1)
      .replace(SENSITIVE_QS_KEYS, (m, k) => (m.startsWith('&') ? '&' : '') + `${k}=[REDACTED]`);
    return `${pathPart}?${qs}`;
  });
  app.use(morgan(':method :safe-url :status :response-time ms'));
  app.use(requestLogger);

  // ── Test mode: mock user ─────────────────────────────────────────────────
  const { Types } = mongoose;
  let requestCount = 0;
  const mockUserId = new Types.ObjectId();

  app.use((req, _res, next) => {
    if (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID) {
      requestCount++;
      req.user = {
        _id: mockUserId,
        id: mockUserId.toString(),
        email: 'test@alawael.local',
        role: 'admin',
        name: 'Test User',
        permissions: ['read', 'write', 'delete', 'admin'],
      };
      if (requestCount <= 3) {
        logger.info(
          `[TEST MODE ${requestCount}] ${req.method} ${req.path} - User injected:`,
          req.user.email
        );
      }
    }
    next();
  });
  if (isTestEnv) {
    logger.info('✅ Test mode: DYNAMIC mock user middleware registered for test requests');
  }

  // ── Rate limiting ────────────────────────────────────────────────────────
  const apiLimiterWithPhase2933Skip = (req, res, next) => {
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.PHASE2933_PUBLIC === 'true' &&
      (req.path.startsWith('/phases-29-33') || req.path.startsWith('/api/phases-29-33'))
    ) {
      return next();
    }
    apiLimiter(req, res, next);
  };
  app.use('/api', apiLimiterWithPhase2933Skip);

  // ── Swagger ──────────────────────────────────────────────────────────────
  const { setupSwagger } = require('../config/swagger.config');
  const enableSwagger = process.env.ENABLE_SWAGGER
    ? process.env.ENABLE_SWAGGER === 'true'
    : process.env.NODE_ENV !== 'test';
  if (enableSwagger) {
    setupSwagger(app);
  }

  // ── Static files ─────────────────────────────────────────────────────────
  app.use(
    express.static(require('path').join(__dirname, '..', 'public'), {
      maxAge: '1d',
      setHeaders: (res, filePath) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        if (/\.[a-f0-9]{8,}\./i.test(filePath)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    })
  );

  // ── Integration context middleware (distributed tracing) ─────────────────
  app.use(createIntegrationContextMiddleware({ integrationBus, serviceName: 'alawael-erp' }));

  // ── Cache-control for API responses ──────────────────────────────────────
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    next();
  });

  // ── Pagination defaults ──────────────────────────────────────────────────
  app.use('/api', paginationDefaults({ max: 100 }));

  // ── Global validation (ObjectId params, query hygiene, body scan) ────────
  app.use('/api', globalValidation());

  // ── Global ObjectId param validation ─────────────────────────────────────
  app.param('id', (req, res, next, value) => {
    if (value && !mongoose.isValidObjectId(value)) {
      return res.status(400).json({
        success: false,
        message: 'معرّف غير صالح',
        message_en: 'Invalid id format',
      });
    }
    next();
  });
}

module.exports = { setupMiddleware };
