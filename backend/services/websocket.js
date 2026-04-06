/* eslint-disable no-unused-vars */
// ===================================
// WebSocket Service - Real-time Updates
// ===================================

const socketIO = require('socket.io');
const logger = require('../utils/logger');

let io;
const connectedUsers = new Map(); // userId -> socketId

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection handler
  io.on('connection', socket => {
    logger.info(`✅ New WebSocket connection: ${socket.id}`);

    // Authentication handler
    socket.on('authenticate', userId => {
      if (userId) {
        connectedUsers.set(userId, socket.id);
        socket.userId = userId;
        logger.info(`👤 User authenticated: ${userId}`);

        // Send confirmation
        socket.emit('authenticated', { userId, socketId: socket.id });

        // Notify others that user is online
        socket.broadcast.emit('user_online', { userId });
      }
    });

    // Join room handler
    socket.on('join_room', room => {
      socket.join(room);
      logger.info(`📍 Socket ${socket.id} joined room: ${room}`);
      socket.emit('room_joined', { room });
    });

    // Leave room handler
    socket.on('leave_room', room => {
      socket.leave(room);
      logger.info(`🚪 Socket ${socket.id} left room: ${room}`);
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      if (socket.userId) {
        connectedUsers.delete(socket.userId);
        socket.broadcast.emit('user_offline', { userId: socket.userId });
        logger.info(`❌ User disconnected: ${socket.userId}`);
      } else {
        logger.info(`❌ Socket disconnected: ${socket.id}`);
      }
    });

    // Error handler
    socket.on('error', error => {
      logger.error('WebSocket error:', error);
    });
  });

  logger.info('🔌 WebSocket server initialized');
  return io;
}

/**
 * Get IO instance
 */
function getIO() {
  if (!io) {
    throw new Error('WebSocket not initialized. Call initializeWebSocket first.');
  }
  return io;
}

/**
 * Emit event to specific user
 */
function emitToUser(userId, event, data) {
  const socketId = connectedUsers.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
    return true;
  }
  return false;
}

/**
 * Emit event to all users in a room
 */
function emitToRoom(room, event, data) {
  if (io) {
    io.to(room).emit(event, data);
    return true;
  }
  return false;
}

/**
 * Broadcast event to all connected users
 */
function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
    return true;
  }
  return false;
}

/**
 * Get connected users count
 */
function getConnectedUsersCount() {
  return connectedUsers.size;
}

/**
 * Check if user is online
 */
function isUserOnline(userId) {
  return connectedUsers.has(userId);
}

/**
 * Get all connected user IDs
 */
function getConnectedUserIds() {
  return Array.from(connectedUsers.keys());
}

// ===================================
// Real-time Event Emitters
// ===================================

/**
 * Notify new notification
 */
function notifyNewNotification(userId, notification) {
  return emitToUser(userId, 'new_notification', notification);
}

/**
 * Notify support ticket update
 */
function notifySupportTicketUpdate(ticketId, update) {
  return emitToRoom(`ticket_${ticketId}`, 'ticket_updated', update);
}

/**
 * Notify system alert
 */
function notifySystemAlert(alert) {
  return broadcast('system_alert', alert);
}

/**
 * Notify performance metric update
 */
function notifyPerformanceUpdate(metrics) {
  return emitToRoom('monitoring', 'performance_update', metrics);
}

/**
 * Notify new message in chat
 */
function notifyNewMessage(roomId, message) {
  return emitToRoom(`chat_${roomId}`, 'new_message', message);
}

/**
 * Notify user activity
 */
function notifyUserActivity(activity) {
  return broadcast('user_activity', activity);
}

/**
 * Notify analytics update
 */
function notifyAnalyticsUpdate(data) {
  return emitToRoom('analytics', 'analytics_update', data);
}

/**
 * Notify report generation complete
 */
function notifyReportReady(userId, report) {
  return emitToUser(userId, 'report_ready', report);
}

module.exports = {
  initializeWebSocket,
  getIO,
  emitToUser,
  emitToRoom,
  broadcast,
  getConnectedUsersCount,
  isUserOnline,
  getConnectedUserIds,

  // Event emitters
  notifyNewNotification,
  notifySupportTicketUpdate,
  notifySystemAlert,
  notifyPerformanceUpdate,
  notifyNewMessage,
  notifyUserActivity,
  notifyAnalyticsUpdate,
  notifyReportReady,
};
