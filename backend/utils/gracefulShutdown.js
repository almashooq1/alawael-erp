/**
 * Graceful Shutdown Handler — معالج إيقاف التشغيل السلس
 *
 * Orchestrates clean shutdown of all services:
 *  1. Stop accepting new connections (HTTP server.close)
 *  2. Close Socket.IO connections
 *  3. Close MongoDB connections
 *  4. Close Redis connections (both performance & config clients)
 *  5. Exit process
 *
 * The FORCE_TIMEOUT (30s) MUST be less than PM2's kill_timeout (35s)
 * to allow a clean exit before PM2 sends SIGKILL.
 */

'use strict';

const logger = require('./logger');

let isShuttingDown = false;

// Must be < PM2 kill_timeout (35s) to avoid SIGKILL during cleanup
const FORCE_TIMEOUT_MS = parseInt(process.env.SHUTDOWN_TIMEOUT, 10) || 30000;

// ── Service shutdown hook registry ────────────────────────────────────────
// Services call registerShutdownHook(name, fn) to ensure clean teardown.
const shutdownHooks = [];

/**
 * Register a cleanup function to be called during graceful shutdown.
 * @param {string} name   Human-readable label (for logging)
 * @param {Function} fn   Async or sync cleanup function (max 5s per hook)
 */
const registerShutdownHook = (name, fn) => {
  if (typeof fn !== 'function') return;
  shutdownHooks.push({ name, fn });
  logger.debug(`[Shutdown] Hook registered: ${name}`);
};

/**
 * Setup graceful shutdown
 * إعداد إيقاف التشغيل السلس
 */
const setupGracefulShutdown = (server, io = null) => {
  const shutdown = async signal => {
    if (isShuttingDown) return;

    isShuttingDown = true;
    logger.info(
      `[Shutdown] ${signal} received. Draining connections (timeout: ${FORCE_TIMEOUT_MS}ms)...`
    );

    // Clear KPI, dashboard, and log-cleanup intervals
    if (server._kpiInterval) clearInterval(server._kpiInterval);
    if (server._dashboardInterval) clearInterval(server._dashboardInterval);
    if (server._logCleanupInterval) clearInterval(server._logCleanupInterval);

    // Stop accepting new connections
    const serverClosed = new Promise(resolve => {
      server.close(() => {
        logger.info('[Shutdown] HTTP server closed');
        resolve();
      });
    });

    // Set timeout for forced shutdown
    const forceShutdownTimeout = setTimeout(() => {
      logger.error('[Shutdown] Forced exit after timeout');
      process.exit(1);
    }, FORCE_TIMEOUT_MS);

    try {
      // Wait for in-flight requests to finish (up to 5s)
      await Promise.race([
        serverClosed,
        new Promise(resolve => {
          setTimeout(resolve, 5000);
        }),
      ]);

      // Close Socket.IO connections
      if (io) {
        await new Promise(resolve => {
          io.close(() => resolve());
          setTimeout(resolve, 2000); // don't wait forever
        });
        logger.info('[Shutdown] Socket.IO closed');
      }

      // Close database connection
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        logger.info('[Shutdown] MongoDB closed');
      }

      // Close ALL Redis connections (performance module + config/redis)
      const _redisCloseResults = await Promise.allSettled([
        (async () => {
          try {
            const { getRedisClient } = require('../config/performance');
            const client = getRedisClient();
            if (client) await client.quit();
          } catch {
            /* no performance redis */
          }
        })(),
        (async () => {
          try {
            const redisConfig = require('../config/redis');
            if (redisConfig.isConnected()) await redisConfig.close();
          } catch {
            /* no config redis */
          }
        })(),
      ]);
      logger.info('[Shutdown] Redis connections closed');

      // ── Run registered service shutdown hooks ──────────────────────────
      if (shutdownHooks.length > 0) {
        logger.info(`[Shutdown] Running ${shutdownHooks.length} service hook(s)...`);
        const hookResults = await Promise.allSettled(
          shutdownHooks.map(({ name, fn }) =>
            Promise.resolve()
              .then(() => fn())
              .then(() => logger.info(`[Shutdown] Hook OK: ${name}`))
              .catch(e => logger.warn(`[Shutdown] Hook FAIL: ${name} — ${e.message}`))
          )
        );
        const failed = hookResults.filter(r => r.status === 'rejected').length;
        if (failed) logger.warn(`[Shutdown] ${failed}/${shutdownHooks.length} hooks failed`);
      }

      clearTimeout(forceShutdownTimeout);
      logger.info('[Shutdown] Completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('[Shutdown] Error during cleanup:', error.message);
      clearTimeout(forceShutdownTimeout);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle Ctrl+C in development on Windows
  if (process.platform === 'win32') {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.on('SIGINT', () => shutdown('SIGINT'));
  }

  logger.info('[Shutdown] Graceful shutdown handlers registered');
};

/**
 * Middleware to check if server is shutting down.
 * Returns 503 + Connection: close to signal clients to reconnect elsewhere.
 */
const shutdownMiddleware = (req, res, next) => {
  if (isShuttingDown) {
    res.set('Connection', 'close');
    return res.status(503).json({
      success: false,
      message: 'Server is shutting down',
      code: 'SERVICE_UNAVAILABLE',
      retryAfter: 30,
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

module.exports = {
  setupGracefulShutdown,
  shutdownMiddleware,
  registerShutdownHook,
};
