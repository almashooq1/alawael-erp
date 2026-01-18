const Notification = require('../models/Notification');

// We will require the socket instance.
// Since we don't have global access to io here easily unless passed,
// we will assume request context or a global exporter.
// For now, we'll design this to be used where IO is available, or use a partial pattern.

class NotificationService {
  /**
   * Create and Dispatch a Notification
   * @param {Object} io - Socket.io instance (optional, if realtime needed)
   * @param {string} recipientId - User ID
   * @param {Object} data - { title, message, type, link, meta }
   */
  static async send(io, recipientId, data) {
    try {
      // 1. Save to Database
      const notification = new Notification({
        recipient: recipientId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        link: data.link,
        meta: data.meta,
      });

      await notification.save();

      // 2. Emit Realtime Event if User is Online
      if (io) {
        // Emit to specific user room (assuming rooms are named by userId)
        io.to(recipientId.toString()).emit('notification:new', notification);
      }

      return notification;
    } catch (error) {
      console.error('Notification Service Error:', error);
      throw error;
    }
  }

  /**
   * Get User Notifications
   */
  static async getUserNotifications(userId, unreadOnly = false, page = 1, limit = 20) {
    const query = { recipient: userId };
    if (unreadOnly) query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return { notifications, total, unreadCount };
  }

  /**
   * Mark as Read
   */
  static async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate({ _id: notificationId, recipient: userId }, { isRead: true }, { new: true });
  }

  /**
   * Mark all as Read
   */
  static async markAllAsRead(userId) {
    return await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
  }
}

module.exports = NotificationService;
module.exports.instance = new NotificationService();
