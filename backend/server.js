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

// Import the fully-configured Express app
const app = require('./app');

const PORT = process.env.PORT || 3001;
const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;

// Database & Utils
const { connectDB } = require('./config/database');
const { seedDatabase } = require('./db/seeders/initialData');
const { createIndexes } = require('./config/database.optimization');
const { scheduleBackups } = require('./config/backup');
const redisClient = require('./config/redis');

// --- HTTP Server ---
const server = http.createServer(app);

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
          return origins.length > 0 ? origins : ['http://localhost:3001', 'http://localhost:3000'];
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
    if (process.env.NODE_ENV === 'production') {
      logger.error('FATAL: Database connection failed in production:', err.message);
      process.exit(1);
    }
    logger.warn('Database connection failed, continuing in dev mode...');
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

  // Schedule log cleanup — daily at startup, then every 24h
  try {
    const { cleanupOldLogs } = require('./config/logging.advanced');
    cleanupOldLogs(7);
    setInterval(() => cleanupOldLogs(7), 24 * 60 * 60 * 1000);
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
  const startServer = (port, attemptsLeft = 5) => {
    const host = '0.0.0.0';

    const onListening = () => {
      logger.info(`Server running at http://localhost:${port} (${host})`);
    };

    const onError = err => {
      if (err && err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const nextPort = Number(port) + 1;
        logger.warn(`Port ${port} in use, retrying on ${nextPort}...`);
        server.removeListener('error', onError);
        server.removeListener('listening', onListening);
        startServer(nextPort, attemptsLeft - 1);
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
