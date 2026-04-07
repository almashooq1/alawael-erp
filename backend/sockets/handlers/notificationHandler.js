/* eslint-disable no-unused-vars */
/**
 * Notification Handler
 * معالج الإشعارات الفورية
 */

const logger = require('../../utils/logger');

/**
 * Handle notification events
 * معالجة أحداث الإشعارات
 */
function notificationHandler(socket, io, activeSubscriptions) {
  // Subscribe to notifications — always use verified socket.userId (Round 38)
  socket.on('notification:subscribe', () => {
    const verifiedUserId = socket.userId;
    const room = verifiedUserId ? `notifications:${verifiedUserId}` : 'notifications';
    socket.join(room);

    // Store subscription
    activeSubscriptions.set(socket.id, {
      type: 'notification',
      userId: verifiedUserId,
      subscribedAt: new Date(),
    });

    logger.info(`[Notification] ${socket.id} subscribed to ${room}`);

    // Send initial notification state
    socket.emit('notification:update', {
      unreadCount: 0,
      notifications: [],
      timestamp: new Date().toISOString(),
    });
  });

  // Unsubscribe from notifications
  socket.on('notification:unsubscribe', () => {
    const sub = activeSubscriptions.get(socket.id);
    if (sub && sub.type === 'notification') {
      const room = sub.userId ? `notifications:${sub.userId}` : 'notifications';
      socket.leave(room);
      activeSubscriptions.delete(socket.id);
    }

    logger.info(`[Notification] ${socket.id} unsubscribed`);
    socket.emit('notification:unsubscribed');
  });

  // Send notification — restrict target to own room or broadcast (Round 38)
  socket.on('notification:send', data => {
    const { type, title, message, priority, metadata } = data;
    const verifiedUserId = socket.userId;

    // Only admins may broadcast; regular users send to their own room only
    const isAdmin = socket.userRole === 'admin' || socket.userRole === 'superadmin';

    const notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'info',
      title: title || 'إشعار جديد',
      message: message || '',
      priority: priority || 'normal',
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
      read: false,
    };

    if (isAdmin && data.userId) {
      // Admin can send to a specific user
      io.to(`notifications:${data.userId}`).emit('notification:new', notification);
      logger.info(`[Notification] Admin ${verifiedUserId} sent to user ${data.userId}`);
    } else if (verifiedUserId) {
      // Regular user: send only to own room
      io.to(`notifications:${verifiedUserId}`).emit('notification:new', notification);
      logger.info(`[Notification] Sent to user ${verifiedUserId}`);
    } else {
      // Broadcast to all subscribed clients (admin only)
      if (!isAdmin) return;
      io.to('notifications').emit('notification:new', notification);
      logger.info('[Notification] Broadcast to all clients');
    }

    // Confirm to sender
    socket.emit('notification:sent', {
      success: true,
      notificationId: notification.id,
    });
  });

  // Mark notification as read
  socket.on('notification:mark-read', ({ notificationId }) => {
    if (!notificationId) return;

    logger.info(`[Notification] Marked as read: ${notificationId}`);

    socket.emit('notification:read-confirmed', {
      notificationId,
      timestamp: new Date().toISOString(),
    });
  });

  // Mark all notifications as read — use verified socket.userId (Round 38)
  socket.on('notification:mark-all-read', () => {
    const verifiedUserId = socket.userId;
    const targetRoom = verifiedUserId ? `notifications:${verifiedUserId}` : socket.id;

    logger.info(`[Notification] Marked all as read for: ${targetRoom}`);

    socket.emit('notification:all-read-confirmed', {
      timestamp: new Date().toISOString(),
    });
  });

  // Get unread count — use verified socket.userId (Round 38)
  socket.on('notification:get-unread-count', () => {
    // This would normally query the database
    // For now, return a mock count
    socket.emit('notification:unread-count', {
      count: 0,
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = notificationHandler;
