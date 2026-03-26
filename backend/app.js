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

require('express-async-errors'); // global async error catching — no more silent promise rejections
const path = require('path');
require('dotenv').config();
// Fallback: also load from project root if backend/.env not present
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
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
  process.env.CSRF_DISABLE = 'true';
}

// ─── Utilities & Config ──────────────────────────────────────────────────────
const logger = require('./utils/logger');
const { shutdownMiddleware } = require('./utils/gracefulShutdown');
const {
  errorHandler,
  notFoundHandler,
  uncaughtExceptionHandler,
  unhandledRejectionHandler,
} = require('./errors/errorHandler');
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
const { requestLoggerMiddleware } = require('./middleware/requestLogger.middleware');

// Centralised route registry (replaces 100+ inline imports)
const { mountAllRoutes } = require('./routes/_registry');

// ─── Infrastructure (Phase II – Technical Improvements) ──────────────────────
const { mountEventStoreRoutes } = require('./infrastructure/eventStore');
const { mountMessageQueueRoutes } = require('./infrastructure/messageQueue');
const { mountMigrationRoutes } = require('./infrastructure/migrationRunner');
const {
  getVersionRouter: _getVersionRouter,
  mountOnVersions: _mountOnVersions,
} = require('./api/versionRouter');
const { mountAllDomains, healthCheckAll: domainHealthCheck } = require('./domains/index');

// ─── Integration Layer (cross-module event-driven architecture) ──────────────
const { integrationBus, mountIntegrationBusRoutes } = require('./integration/systemIntegrationBus');
const { moduleConnector, mountModuleConnectorRoutes } = require('./integration/moduleConnector');
const {
  createIntegrationContextMiddleware,
  mountIntegrationContextRoutes,
} = require('./middleware/integrationContext.middleware');
const { initializeCrossModuleSubscribers } = require('./integration/crossModuleSubscribers');
const { ALL_CONTRACTS } = require('./events/contracts/domainEventContracts');

// ─── Create Express App ──────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════════════════════
// 🧪 DEV-ONLY TEST ENDPOINTS (BEFORE ALL MIDDLEWARE)
// ═══════════════════════════════════════════════════════════════════════════
if (process.env.NODE_ENV === 'development') {
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
if (process.env.PHASE2933_PUBLIC === 'true') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/phases-29-33')) {
      req.isPhase2933Public = true;
    }
    next();
  });
}

// Service worker — served from static file
app.get('/service-worker.js', (req, res) => {
  const swPath = require('path').join(__dirname, 'public', 'service-worker.js');
  res.type('application/javascript').sendFile(swPath);
});

// ─── Trust proxy ─────────────────────────────────────────────────────────────
// When behind a reverse proxy (Nginx, AWS ALB, Cloudflare, etc.), Express needs
// to trust the X-Forwarded-* headers so that:
//   • req.ip returns the real client IP (not the proxy's IP)
//   • req.protocol reflects the original scheme (https)
//   • Rate-limiters count per real client instead of per proxy
//
// Value of 1 means "trust the first hop" — correct for a single Nginx/ALB.
// For multiple proxies set this to the hop count or use 'loopback' for local.
// See: https://expressjs.com/en/guide/behind-proxies.html
app.set('trust proxy', 1);

// ─── Request ID (traceability — must be before everything else) ──────────────
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware); // attach req.log (child logger with requestId)

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
  maxAge: 86400, // preflight cache duration (24h)
};
app.use(cors(corsOptions));

// ─── Body Parsing ────────────────────────────────────────────────────────────
// Upload routes allow larger payloads; API routes default to 1 MB
app.use('/api/upload', express.json({ limit: '10mb' }));
app.use('/api/upload', express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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

// Prometheus metrics endpoint (protected by token in production)
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
    process.env.PHASE2933_PUBLIC === 'true' &&
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
// Enable Swagger in all environments except test; controlled via ENABLE_SWAGGER env var
const enableSwagger = process.env.ENABLE_SWAGGER
  ? process.env.ENABLE_SWAGGER === 'true'
  : process.env.NODE_ENV !== 'test';
if (enableSwagger) {
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

// NOTE: /api/health removed — use /health liveness probe instead (L316)
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

// Serve static files — with security headers and immutable cache for hashed assets
app.use(
  express.static('public', {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      // Immutable cache for fingerprinted/hashed assets
      if (/\.[a-f0-9]{8,}\./i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  })
);

// ─── Integration Context Middleware (distributed tracing) ────────────────────
app.use(createIntegrationContextMiddleware({ integrationBus, serviceName: 'alawael-erp' }));

// ─── Cache-Control for API responses (prevent accidental proxy caching) ──────
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

// ─── Pagination Defaults (cap ?limit to prevent DB dumps) ────────────────────
const { paginationDefaults } = require('./middleware/paginationDefaults');
app.use('/api', paginationDefaults({ max: 100 }));

// ─── Global Validation (safety-net: ObjectId params, query hygiene, body scan)
const { globalValidation } = require('./middleware/globalValidation');
app.use('/api', globalValidation());

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

// ─── Integration Bus Initialization (cross-module event-driven architecture) ─
try {
  // Initialize the integration bus with existing infrastructure singletons
  const { eventStore } = require('./infrastructure/eventStore');
  const { getMessageQueue } = require('./infrastructure/messageQueue');
  const socketEmitter = (() => {
    try {
      return require('./utils/socketEmitter');
    } catch {
      return null;
    }
  })();

  integrationBus.initialize({
    eventStore,
    messageQueue: getMessageQueue(),
    socketEmitter,
  });

  // Register all domain event contracts
  for (const [domain, contracts] of Object.entries(ALL_CONTRACTS)) {
    const events = Object.values(contracts).map(c => c.eventType);
    integrationBus.registerDomain(domain, { version: '1.0.0', events });
  }

  // Initialize the module connector
  moduleConnector.initialize({ integrationBus });

  // Wire cross-module subscribers
  initializeCrossModuleSubscribers(integrationBus, moduleConnector);

  // Mount integration API routes
  mountIntegrationBusRoutes(app);
  mountModuleConnectorRoutes(app);
  mountIntegrationContextRoutes(app);

  logger.info('[Integration] ✓ System integration bus initialized successfully');
} catch (err) {
  logger.warn('[Integration] Integration bus initialization skipped:', err.message);
}

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
