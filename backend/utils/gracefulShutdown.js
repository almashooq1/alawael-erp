/**
 * Graceful Shutdown Handler
 * معالج إيقاف التشغيل السلس
 */

let isShuttingDown = false;

/**
 * Setup graceful shutdown
 * إعداد إيقاف التشغيل السلس
 */
const setupGracefulShutdown = (server, io = null) => {
  const shutdown = async signal => {
    if (isShuttingDown) {
      console.log('Shutdown already in progress...');
      return;
    }

    isShuttingDown = true;
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      console.log('✅ HTTP server closed');
    });

    // Set timeout for forced shutdown
    const forceShutdownTimeout = setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 30000); // 30 seconds

    try {
      // Close Socket.IO connections
      if (io) {
        console.log('🔌 Closing Socket.IO connections...');
        io.close(() => {
          console.log('✅ Socket.IO connections closed');
        });
      }

      // Close database connection
      const mongoose = require('mongoose');
      if (mongoose.connection.readyState === 1) {
        console.log('🗄️  Closing MongoDB connection...');
        await mongoose.connection.close();
        console.log('✅ MongoDB connection closed');
      }

      // Close Redis connection
      try {
        const { getRedisClient } = require('../config/performance');
        const redisClient = getRedisClient();
        if (redisClient) {
          console.log('⚡ Closing Redis connection...');
          await redisClient.quit();
          console.log('✅ Redis connection closed');
        }
      } catch (error) {
        console.log('ℹ️  No Redis connection to close');
      }

      clearTimeout(forceShutdownTimeout);
      console.log('✅ Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      clearTimeout(forceShutdownTimeout);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle Ctrl+C in development
  if (process.platform === 'win32') {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on('SIGINT', () => {
      shutdown('SIGINT');
    });
  }

  console.log('✅ Graceful shutdown handlers registered');
};

/**
 * Middleware to check if server is shutting down
 */
const shutdownMiddleware = (req, res, next) => {
  if (isShuttingDown) {
    res.set('Connection', 'close');
    return res.status(503).json({
      success: false,
      message: 'Server is shutting down',
      code: 'SERVICE_UNAVAILABLE',
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

module.exports = {
  setupGracefulShutdown,
  shutdownMiddleware,
};
