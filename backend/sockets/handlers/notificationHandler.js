/**
 * Notification Handler
 * معالج الإشعارات الفورية
 */

/**
 * Handle notification events
 * معالجة أحداث الإشعارات
 */
function notificationHandler(socket, io, activeSubscriptions) {
  // Subscribe to notifications
  socket.on('notification:subscribe', ({ userId }) => {
    const room = userId ? `notifications:${userId}` : 'notifications';
    socket.join(room);

    // Store subscription
    activeSubscriptions.set(socket.id, {
      type: 'notification',
      userId: userId || socket.userId,
      subscribedAt: new Date(),
    });

    console.log(`[Notification] ${socket.id} subscribed to ${room}`);

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

    console.log(`[Notification] ${socket.id} unsubscribed`);
    socket.emit('notification:unsubscribed');
  });

  // Send notification to specific user or broadcast
  socket.on('notification:send', data => {
    const { userId, type, title, message, priority, metadata } = data;

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

    if (userId) {
      // Send to specific user
      io.to(`notifications:${userId}`).emit('notification:new', notification);
      console.log(`[Notification] Sent to user ${userId}`);
    } else {
      // Broadcast to all subscribed clients
      io.to('notifications').emit('notification:new', notification);
      console.log('[Notification] Broadcast to all clients');
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

    console.log(`[Notification] Marked as read: ${notificationId}`);

    socket.emit('notification:read-confirmed', {
      notificationId,
      timestamp: new Date().toISOString(),
    });
  });

  // Mark all notifications as read
  socket.on('notification:mark-all-read', ({ userId }) => {
    const targetRoom = userId ? `notifications:${userId}` : socket.id;

    console.log(`[Notification] Marked all as read for: ${targetRoom}`);

    socket.emit('notification:all-read-confirmed', {
      timestamp: new Date().toISOString(),
    });
  });

  // Get unread count
  socket.on('notification:get-unread-count', ({ userId }) => {
    // This would normally query the database
    // For now, return a mock count
    socket.emit('notification:unread-count', {
      count: 0,
      timestamp: new Date().toISOString(),
    });
  });
}

module.exports = notificationHandler;
