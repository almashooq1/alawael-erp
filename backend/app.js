/**
 * app.js — Express Application Configuration
 *
 * Responsible for:
 *  - Middleware stack (security, CORS, body parsing, logging, etc.)
 *  - Route mounting (via routes/_registry)
 *  - Error handling
 *
 * Server startup, Socket.IO, and database initialisation live in server.js.
 */

require('dotenv').config();
const { validateEnv } = require('./config/validateEnv');
validateEnv(); // fail-fast on bad config

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

// Default to in-memory DB when no Mongo URI is provided (developer-friendly)
if (!process.env.MONGODB_URI && !process.env.USE_MOCK_DB) {
  process.env.USE_MOCK_DB = 'true';
}

// Force predictable behaviour in tests (no real DB/socket side effects)
const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
if (isTestEnv) {
  process.env.USE_MOCK_DB = 'true';
  process.env.NODE_ENV = 'test';
  process.env.SMART_TEST_MODE = process.env.SMART_TEST_MODE || 'true';
  process.env.CSRF_PROTECTION_ENABLED = 'false';
}

// ─── Utilities & Config ──────────────────────────────────────────────────────
const logger = require('./utils/logger');
const { shutdownMiddleware } = require('./utils/gracefulShutdown');
const {
  errorHandler,
  notFoundHandler,
  uncaughtExceptionHandler,
  unhandledRejectionHandler,
} = require('./middleware/errorHandler.enhanced');
const { sanitizeInput: requestValidationSanitize } = require('./middleware/requestValidation');

// Security middleware
const sanitizeInput = require('./middleware/sanitize');
const { apiLimiter } = require('./middleware/rateLimiter');
const { suspiciousActivityDetector } = require('./utils/security');
const responseHandler = require('./middleware/responseHandler');
const { maintenanceMiddleware } = require('./middleware/maintenance.middleware');
const apiKeyAuth = require('./middleware/apiKey.middleware');

// Professional Middleware (v2)
const { apiVersionMiddleware } = require('./middleware/apiVersion.middleware');
const { requestContext } = require('./middleware/dto.middleware');
const { auditMiddleware } = require('./middleware/auditTrail.middleware');
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics.middleware');

// Advanced Security
const {
  authRateLimiter,
  mongoSanitizeMiddleware,
  requestLogger,
} = require('./config/security.advanced');

// On-demand imports (used in routes, not at top-level)
// const { requirePermission, requireRole, ROLES } = require('./middleware/rbac.v2.middleware');
// const { ApiResponse } = require('./middleware/dto.middleware');
const securityHeaders = require('./middleware/securityHeaders');
const csrfProtection = require('./middleware/csrfProtection');

// Performance optimization modules
const {
  initializeRedis,
  compressionMiddleware,
  requestTimerMiddleware,
  cacheMiddleware,
} = require('./config/performance');
const { initializePerformanceOptimizations } = require('./utils/performance-optimizer');

// Request ID middleware for traceability
const { requestIdMiddleware } = require('./middleware/requestId.middleware');

// Centralised route registry (replaces 100+ inline imports)
const { mountAllRoutes } = require('./routes/_registry');

// ─── Infrastructure (Phase II – Technical Improvements) ──────────────────────
const { mountEventStoreRoutes } = require('./infrastructure/eventStore');
const { mountMessageQueueRoutes } = require('./infrastructure/messageQueue');
const { mountMigrationRoutes } = require('./infrastructure/migrationRunner');
const { getVersionRouter, mountOnVersions } = require('./api/versionRouter');
const { mountAllDomains, healthCheckAll: domainHealthCheck } = require('./domains/index');

// ─── Create Express App ──────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 DEV-ONLY TEST ENDPOINTS (BEFORE ALL MIDDLEWARE)
// ═══════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV !== 'production') {
  app.get('/test-first', (req, res) => {
    res.json({
      success: true,
      message: 'FIRST ENDPOINT WORKS! (Super Early)',
      timestamp: new Date(),
    });
  });

  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: '/api/test works! (Super Early)', timestamp: new Date() });
  });

  logger.debug('Dev test endpoints mounted: /test-first, /api/test');
}

// ═══════════════════════════════════════════════════════════════════════════
// 🔓 DEV BYPASS: Skip auth/security for Phase 29-33 (public for testing)
// ═══════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/phases-29-33')) {
      req.isPhase2933Public = true;
    }
    next();
  });
}

// Minimal service worker route
app.get('/service-worker.js', (req, res) => {
  res
    .type('application/javascript')
    .send(
      `// Minimal placeholder service worker\nself.addEventListener('install', () => self.skipWaiting());\nself.addEventListener('activate', () => self.clients.claim());`
    );
});

// ─── Trust proxy ─────────────────────────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Request ID (traceability — must be before everything else) ──────────────
app.use(requestIdMiddleware);

// ─── Security Middleware (MUST be first) ──────────────────────────────────────
app.use(securityHeaders); // Helmet with hardened CSP + Permissions-Policy
app.use(suspiciousActivityDetector);
app.use(mongoSanitizeMiddleware);
app.use(shutdownMiddleware);
app.use(apiKeyAuth);
app.use(maintenanceMiddleware);

// ─── CORS ────────────────────────────────────────────────────────────────────
const devOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3004',
  'http://localhost:3005',
];
// Support both CORS_ORIGINS (plural) and CORS_ORIGIN (singular) env vars
const prodOriginsRaw = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
const prodOrigins = prodOriginsRaw
  ? prodOriginsRaw
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
  : [];

const isProd = process.env.NODE_ENV === 'production';
if (isProd && !prodOrigins.length) {
  console.warn(
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
  maxAge: 86400, // preflight cache duration (24h)
};
app.use(cors(corsOptions));

// ─── Body Parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: true, limit: '256kb' }));

// ─── Input Sanitization ─────────────────────────────────────────────────────
app.use(sanitizeInput);
app.use(requestValidationSanitize);

// ─── CSRF Protection ────────────────────────────────────────────────────────
app.use(csrfProtection);

// ─── Performance ─────────────────────────────────────────────────────────────
app.use(compressionMiddleware);
app.use(requestTimerMiddleware);
app.use(cacheMiddleware(300, 'api'));

if (!isTestEnv) {
  initializeRedis();
}
initializePerformanceOptimizations(app);

// ─── API Versioning & Request Context ────────────────────────────────────────
app.use(apiVersionMiddleware);
app.use(requestContext);
app.use(metricsMiddleware);

// Prometheus metrics endpoint
app.get('/metrics', metricsHandler);
// ─── Audit Trail (auto-audit write operations) ───────────────────────────────
app.use(auditMiddleware());

// ─── Response Helper & Logging ───────────────────────────────────────────────
app.use(responseHandler);
app.use(morgan('dev'));
app.use(requestLogger);

// ─── Test Mode: Mock User ────────────────────────────────────────────────────
const { Types } = mongoose;
let requestCount = 0;
const mockUserId = new Types.ObjectId();

app.use((req, res, next) => {
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

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const apiLimiterWithPhase2933Skip = (req, res, next) => {
  if (
    process.env.NODE_ENV !== 'production' &&
    (req.path.startsWith('/phases-29-33') || req.path.startsWith('/api/phases-29-33'))
  ) {
    return next();
  }
  apiLimiter(req, res, next);
};

// Single rate limiter for /api — removed duplicate advancedApiLimiter (same 60req/min)
app.use('/api', apiLimiterWithPhase2933Skip);

// ─── Swagger (consolidated via config/swagger.config.js) ─────────────────────
const { setupSwagger } = require('./config/swagger.config');
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

// ─── Public Health Endpoints ─────────────────────────────────────────────────
const { getRedisStatus } = require('./config/performance');

/**
 * Liveness probe — checks API + database + Redis connectivity.
 * Returns 200 when healthy or degraded, 503 only in production when fully unhealthy.
 */
app.get('/health', (_req, res) => {
  const mongoStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const dbState = isTestEnv
    ? 'connected'
    : mongoStates[mongoose.connection.readyState] || 'unknown';
  const redisState = getRedisStatus();
  const dbOk = dbState === 'connected' || dbState === 'connecting';
  const redisOk = redisState === 'connected' || redisState === 'disabled'; // disabled is OK (mock mode)

  let overall;
  if (dbOk && redisOk) {
    overall = 'ok';
  } else if (dbOk || redisOk) {
    overall = 'degraded';
  } else {
    overall = 'unhealthy';
  }

  // 503 only when fully unhealthy; degraded services still return 200
  const statusCode = overall === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json({
    status: overall,
    message: 'AlAwael ERP Backend is running',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'up',
      database: dbState,
      redis: redisState,
      websocket: 'up',
    },
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'نظام الأوقاف يعمل بشكل صحيح',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Kubernetes readiness probe — DB + Redis must be ready
app.get('/readiness', (req, res) => {
  const dbReady = isTestEnv || mongoose.connection.readyState === 1;
  const redisReady = getRedisStatus() === 'connected' || getRedisStatus() === 'disabled';
  const isReady = dbReady && redisReady;
  if (isReady) {
    return res.status(200).json({ status: 'ready', db: 'ok', redis: getRedisStatus() });
  }
  return res
    .status(503)
    .json({ status: 'not-ready', db: dbReady ? 'ok' : 'down', redis: getRedisStatus() });
});

// System info — restricted in production (no internal flags exposed)
app.get('/api/info', (req, res) => {
  res.json({
    status: 'OK',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    // Internal diagnostics — development/staging only
    ...(isProd
      ? {}
      : {
          environment: process.env.NODE_ENV || 'development',
          port: process.env.PORT || 3001,
          useMockDb: process.env.USE_MOCK_DB === 'true',
          redisDisabled: process.env.DISABLE_REDIS === 'true',
          smartTestMode: process.env.SMART_TEST_MODE === 'true',
        }),
  });
});

// Serve static files
app.use(express.static('public'));

// ─── Route Mounting (centralised in routes/_registry.js) ─────────────────────
mountAllRoutes(app, { authRateLimiter });

// ─── Infrastructure API Routes (v2) ─────────────────────────────────────────
mountEventStoreRoutes(app);
mountMessageQueueRoutes(app);
mountMigrationRoutes(app);

// ─── Domain Registry (v2) ────────────────────────────────────────────────────
try {
  mountAllDomains(app);
} catch (err) {
  logger.warn('Domain mounting skipped:', err.message);
}
app.get('/api/v2/domains/health', async (_req, res) => {
  try {
    const health = await domainHealthCheck();
    res.json({ success: true, domains: health });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'AlAwael ERP API',
    version: '1.0.0',
    description: 'Rehabilitation Center Management System',
    endpoints: { health: '/health', readiness: '/readiness', api: '/api', docs: '/api-docs' },
  });
});

// ─── Error Handling (MUST be after all routes) ───────────────────────────────
app.use(notFoundHandler); // 404 for unmatched routes (regular middleware)
app.use(errorHandler); // centralised error handler (4-arg middleware)
uncaughtExceptionHandler();
unhandledRejectionHandler();

// ─── Exports ─────────────────────────────────────────────────────────────────
module.exports = app;
module.exports.PORT = PORT;
