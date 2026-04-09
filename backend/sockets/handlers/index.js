/* eslint-disable no-unused-vars */
/**
 * Socket.IO Handlers - Centralized Event Management
 * مدير أحداث Socket.IO المركزي
 */

const moduleHandler = require('./moduleHandler');
const dashboardHandler = require('./dashboardHandler');
const notificationHandler = require('./notificationHandler');
const chatHandler = require('./chatHandler');
const dddHandler = require('./dddHandler');
const logger = require('../../utils/logger');

// Active subscriptions tracking
const activeSubscriptions = new Map();

/**
 * Initialize all socket handlers
 * تهيئة جميع معالجات Socket
 */
function initializeHandlers(io) {
  logger.info('[Socket.IO] Initializing handlers...');

  io.on('connection', socket => {
    // Use JWT-verified userId set by auth middleware; never trust raw query params
    const userId = socket.userId || socket.user?.id || 'anonymous';
    logger.info(`[Socket.IO] Client connected: ${socket.id} (User: ${userId})`);

    // Persist verified user info
    socket.userId = userId;
    socket.joinedAt = new Date();

    // Initialize individual handlers
    moduleHandler(socket, io, activeSubscriptions);
    dashboardHandler(socket, io, activeSubscriptions);
    notificationHandler(socket, io, activeSubscriptions);
    chatHandler(socket, io, activeSubscriptions);
    dddHandler(socket, io, activeSubscriptions);

    // Connection health check
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Disconnect handler
    socket.on('disconnect', reason => {
      logger.info(`[Socket.IO] Client disconnected: ${socket.id} (Reason: ${reason})`);

      // Cleanup subscriptions
      activeSubscriptions.delete(socket.id);

      // Clear any intervals stored for this socket
      if (socket.intervals) {
        socket.intervals.forEach(interval => clearInterval(interval));
      }
    });

    // Error handler
    socket.on('error', error => {
      const safeError = error instanceof Error ? { message: error.message } : String(error);
      logger.error(`[Socket.IO] Socket error (${socket.id}):`, safeError);
      socket.emit('error', {
        message: 'حدث خطأ في الاتصال',
        code: 'SOCKET_ERROR',
        timestamp: new Date().toISOString(),
      });
    });

    // Welcome message
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date().toISOString(),
      message: 'تم الاتصال بنجاح بخادم Socket.IO',
    });
  });

  // Global error handling
  io.engine.on('connection_error', err => {
    const safeErr =
      err instanceof Error
        ? { message: err.message, code: err.code, context: err.context }
        : String(err);
    logger.error('[Socket.IO] Connection error:', safeErr);
  });

  logger.info('[Socket.IO] All handlers initialized successfully');
}

/**
 * Get active subscriptions stats
 * الحصول على إحصائيات الاشتراكات النشطة
 */
function getSubscriptionStats() {
  const stats = {
    total: activeSubscriptions.size,
    byType: {},
    byModule: {},
  };

  activeSubscriptions.forEach((sub, socketId) => {
    const type = sub.type || 'unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    if (sub.moduleKey) {
      stats.byModule[sub.moduleKey] = (stats.byModule[sub.moduleKey] || 0) + 1;
    }
  });

  return stats;
}

module.exports = {
  initializeHandlers,
  getSubscriptionStats,
  activeSubscriptions,
};
