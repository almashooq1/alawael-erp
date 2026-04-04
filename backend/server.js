/**
 * server.js - HTTP Server, Socket.IO & Database Initialisation
 *
 * Express app configuration (middleware, routes, error handling) lives in app.js.
 * This file is responsible for:
 *  - Creating the HTTP server
 *  - Initialising Socket.IO (skipped in test env)
 *  - Connecting to MongoDB & seeding data
 *  - Starting the listening socket
 */

const http = require('http');
const socketIO = require('socket.io');
const logger = require('./utils/logger');

// Bootstrap OpenTelemetry if enabled (must load before other modules)
if (process.env.OTEL_ENABLED === 'true') {
  try {
    const { initializeOpenTelemetry } = require('./observability/opentelemetry');
    initializeOpenTelemetry();
    logger.info('OpenTelemetry SDK bootstrapped');
  } catch (err) {
    logger.warn('OpenTelemetry init skipped — missing dependencies or config:', err.message);
  }
}

// Import the fully-configured Express app
const app = require('./app');

const PORT = process.env.PORT || 3001;
const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;

// Database & Utils
const { connectDB } = require('./config/database');
const { ensureAdmin } = require('./utils/ensureAdmin');
const { seedDatabase } = require('./db/seeders/initialData');
const { createIndexes } = require('./config/database.optimization');
const { scheduleBackups } = require('./config/backup');
const redisClient = require('./config/redis');
const { registerGlobalPlugins } = require('./config/mongoose.plugins');

// Register Mongoose global plugins (slow-query logging, toJSON, prod safety)
registerGlobalPlugins();

// --- HTTP Server ---
const server = http.createServer(app);

// --- Timeouts (prevent hung connections) ---
server.timeout = 120_000; // 120 s — aligned with nginx proxy timeouts
server.keepAliveTimeout = 65_000; // 65 s — must be > ALB/Nginx idle (usually 60 s)
server.headersTimeout = 66_000; // slightly higher than keepAliveTimeout

// --- Socket.IO (disabled in tests) ---
const io = isTestEnv
  ? null
  : socketIO(server, {
      cors: {
        origin: (() => {
          const origins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '')
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .concat(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []);
          if (origins.length > 0) return origins;
          // In production, reject all if no origins configured
          if (process.env.NODE_ENV === 'production') return false;
          return ['http://localhost:3001', 'http://localhost:3000'];
        })(),
        methods: ['GET', 'POST'],
        credentials: true,
      },
      maxHttpBufferSize: 1e6, // 1 MB — prevent oversized payloads
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

if (!isTestEnv && io) {
  logger.info('[Socket.IO] Initializing modular handlers...');

  const socketManager = require('./config/socket.config');
  socketManager.initialize(io);

  const socketEmitter = require('./utils/socketEmitter');
  socketEmitter.initializeSocketEmitter(io);

  const { initializeHandlers } = require('./sockets/handlers');
  initializeHandlers(io);

  // Start periodic KPI + dashboard broadcasts (extracted to utils/realtimeDashboard)
  const { startRealtimeBroadcasts } = require('./utils/realtimeDashboard');
  startRealtimeBroadcasts(io, server);

  logger.info('[Socket.IO] All handlers initialized successfully');
}

// Seed Demo Data (extracted to db/seeders/mockVehicles.js)
const { seedMockVehicles } = require('./db/seeders/mockVehicles');

// --- Database Initialisation ---
const shouldSkipDBInit = isTestEnv && process.env.SMART_TEST_MODE === 'true';

(async () => {
  if (shouldSkipDBInit) {
    logger.info('Skipping database init in SMART_TEST_MODE test environment');
    return;
  }

  try {
    await connectDB();

    // ── تأكد من وجود مستخدم Admin (يعمل في كل بدء تشغيل) ──────────────────
    if (process.env.USE_MOCK_DB !== 'true') {
      try {
        await ensureAdmin();
      } catch (err) {
        logger.warn('[ensureAdmin] Skipped:', err.message);
      }
    }

    if (process.env.USE_MOCK_DB === 'true') {
      logger.info('Using in-memory database');
      await seedMockVehicles();
    } else {
      try {
        await seedDatabase();
      } catch (err) {
        logger.info('Seeding skipped:', err.message);
      }
      try {
        await createIndexes();
      } catch (err) {
        logger.info('Index creation skipped:', err.message);
      }
      if (process.env.ENABLE_AUTO_BACKUP === 'true') {
        scheduleBackups();
      }
    }
  } catch (err) {
    const safeMsg = (err.message || '').replace(
      /mongodb(\+srv)?:\/\/[^@]+@/gi,
      'mongodb://<credentials-hidden>@'
    );
    if (process.env.NODE_ENV === 'production') {
      logger.error('FATAL: Database connection failed in production:', safeMsg);
      process.exit(1);
    }
    logger.warn('Database connection failed, continuing in dev mode:', safeMsg);
  }

  // Initialize Redis
  try {
    if (process.env.REDIS_ENABLED === 'true') {
      await redisClient.initializeRedis();
      logger.info('Redis Cache ready');
    }
  } catch (err) {
    logger.info('Redis initialization failed:', err.message);
  }

  // Initialize Report Delivery Scheduler
  try {
    const mongoose = require('mongoose');
    const { reportSchedulerService } = require('./students/report-scheduler-service');
    await reportSchedulerService.initialize(mongoose.connection);
    logger.info('📬 Report Delivery Scheduler ready');
  } catch (err) {
    logger.info('Report Scheduler initialization skipped:', err.message);
  }

  // Initialize KPI & Attendance Scheduler (prompt_21 — Systems 36 & 37)
  try {
    const { startKpiAttendanceScheduler } = require('./scheduler/kpi-attendance.scheduler');
    startKpiAttendanceScheduler();
    logger.info(
      '📊 KPI & Attendance Scheduler ready (7 jobs: KPI daily/monthly/alerts + ZKTeco sync + attendance daily/absence-alerts/overtime)'
    );
  } catch (err) {
    logger.info('KPI & Attendance Scheduler initialization skipped:', err.message);
  }

  // Initialize Payment Gateway Scheduler (prompt_22 — System 38)
  try {
    const { register: registerPaymentScheduler } = require('./scheduler/payment-gateway.scheduler');
    registerPaymentScheduler();
    logger.info(
      '💳 Payment Gateway Scheduler ready (3 jobs: retry-failed-payments every 15min + ZATCA daily 02:00 + expire-old-transactions daily 01:30)'
    );
  } catch (err) {
    logger.info('Payment Gateway Scheduler initialization skipped:', err.message);
  }

  // Initialize Digital Wallet Scheduler (prompt_22 — System 39)
  try {
    const { register: registerWalletScheduler } = require('./scheduler/wallet.scheduler');
    registerWalletScheduler();
    logger.info(
      '👛 Digital Wallet Scheduler ready (2 jobs: expire-loyalty-points daily 01:00 + low-balance-alerts daily 09:00)'
    );
  } catch (err) {
    logger.info('Digital Wallet Scheduler initialization skipped:', err.message);
  }

  // Initialize Smart Insurance Scheduler (prompt_22 — System 40)
  try {
    const {
      register: registerInsuranceScheduler,
    } = require('./scheduler/smart-insurance.scheduler');
    registerInsuranceScheduler();
    logger.info(
      '🏥 Smart Insurance Scheduler ready (4 jobs: expiry-alerts daily 08:00 + pending-claims every 30min + sync-eligibility weekly Mon 03:00 + expire-policies daily 00:30)'
    );
  } catch (err) {
    logger.info('Smart Insurance Scheduler initialization skipped:', err.message);
  }

  // Initialize Volunteer Management Scheduler (prompt_23 — System 41)
  try {
    const { initVolunteerScheduler } = require('./scheduler/volunteer.scheduler');
    initVolunteerScheduler();
    logger.info(
      '🤝 Volunteer Management Scheduler ready (3 jobs: monthly-report 1st of month 09:00 + sync-mntasati weekly Sun 03:00 + close-past-opportunities daily 01:00)'
    );
  } catch (err) {
    logger.info('Volunteer Scheduler initialization skipped:', err.message);
  }

  // Initialize Community Service Scheduler (prompt_23 — System 42)
  try {
    const { initCommunityServiceScheduler } = require('./scheduler/community-service.scheduler');
    initCommunityServiceScheduler();
    logger.info(
      '🌍 Community Service Scheduler ready (3 jobs: events-reminder daily 08:00 + csr-report last day of month 23:00 + referrals-followup daily 09:00)'
    );
  } catch (err) {
    logger.info('Community Service Scheduler initialization skipped:', err.message);
  }

  // Initialize Internal Recruitment Scheduler (prompt_23 — System 43)
  try {
    const { initRecruitmentScheduler } = require('./scheduler/recruitment.scheduler');
    initRecruitmentScheduler();
    logger.info(
      '💼 Internal Recruitment Scheduler ready (4 jobs: close-expired-postings daily 00:30 + interview-reminders daily 07:30 + expire-offers daily 01:00 + nitaqat-report 1st of month 09:00)'
    );
  } catch (err) {
    logger.info('Recruitment Scheduler initialization skipped:', err.message);
  }

  // Schedule log cleanup — daily at startup, then every 24h
  try {
    const { cleanupOldLogs } = require('./config/logging.advanced');
    cleanupOldLogs(7);
    server._logCleanupInterval = setInterval(() => cleanupOldLogs(7), 24 * 60 * 60 * 1000);
    logger.info('Log cleanup scheduled (7-day retention)');
  } catch (err) {
    logger.info('Log cleanup setup skipped:', err.message);
  }

  // Initialize Message Queue (NATS or In-Memory)
  try {
    const { initializeMessageQueue } = require('./infrastructure/messageQueue');
    await initializeMessageQueue();
    logger.info('📨 Message Queue ready');
  } catch (err) {
    logger.info('Message Queue initialization skipped:', err.message);
  }

  // Run pending database migrations
  try {
    if (process.env.AUTO_MIGRATE !== 'false') {
      const { MigrationRunner } = require('./infrastructure/migrationRunner');
      const migrationRunner = new MigrationRunner();
      const result = await migrationRunner.up();
      if (result.applied > 0) {
        logger.info(`🔄 Applied ${result.applied} pending migration(s)`);
      } else {
        logger.info('✅ Database migrations up to date');
      }
    }
  } catch (err) {
    logger.info('Database migration skipped:', err.message);
  }
})().catch(err => {
  logger.error('Startup initialization failed:', err);
  if (process.env.NODE_ENV === 'production') process.exit(1);
});

// Process-level error handlers (safety net)
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Do NOT exit in cluster mode — let PM2 restart gracefully
});

process.on('uncaughtException', err => {
  logger.error('Uncaught Exception:', err);
  // Exit for truly unrecoverable errors
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// --- Graceful Shutdown ---
const { setupGracefulShutdown } = require('./utils/gracefulShutdown');
if (!isTestEnv) {
  setupGracefulShutdown(server, io);
}

// --- Exports (backward-compatible) ---
module.exports = app;
module.exports.app = app;
module.exports.io = io;
module.exports.server = server;

// --- Start Server ---
if (require.main === module) {
  const startServer = port => {
    const host = '0.0.0.0';
    const isProduction = process.env.NODE_ENV === 'production';

    const onListening = () => {
      logger.info(`Server running at http://localhost:${port} (${host})`);
      // Signal PM2 that the app is ready (required for wait_ready: true / zero-downtime reload)
      if (typeof process.send === 'function') {
        process.send('ready');
      }
    };

    const onError = err => {
      if (err && err.code === 'EADDRINUSE' && !isProduction) {
        const nextPort = Number(port) + 1;
        logger.warn(`Port ${port} in use, retrying on ${nextPort}...`);
        server.removeListener('error', onError);
        server.removeListener('listening', onListening);
        startServer(nextPort);
      } else {
        logger.error('Failed to start server:', err ? err.message : 'Unknown error');
        process.exit(1);
      }
    };

    server.once('listening', onListening);
    server.once('error', onError);
    server.listen(port, host);
  };

  startServer(PORT);
}
