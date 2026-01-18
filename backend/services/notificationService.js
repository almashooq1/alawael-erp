/**
 * Enhanced Notification System
 * Multi-channel notifications (Email, SMS, In-App, Push)
 */

// In-memory storage
let notifications = new Map();
let notificationPreferences = new Map();
let notificationLog = new Map();

class NotificationService {
  /**
   * Send in-app notification
   */
  async sendInAppNotification(userId, title, message, type = 'info', metadata = {}) {
    try {
      const notificationId = `notif_${Date.now()}`;

      const notification = {
        id: notificationId,
        userId,
        title,
        message,
        type, // 'info', 'success', 'warning', 'error'
        channel: 'in-app',
        read: false,
        createdAt: new Date(),
        metadata,
      };

      notifications.set(notificationId, notification);

      // Log notification
      await this.logNotification(userId, 'in-app', title, 'sent');

      // In production, emit via Socket.IO
      // io.to(userId).emit('notification', notification)

      return {
        success: true,
        message: 'Notification sent',
        notificationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId, userEmail, subject, htmlContent, metadata = {}) {
    try {
      const notificationId = `notif_${Date.now()}`;

      const notification = {
        id: notificationId,
        userId,
        subject,
        content: htmlContent,
        channel: 'email',
        recipient: userEmail,
        status: 'sent',
        createdAt: new Date(),
        sentAt: new Date(),
        metadata,
      };

      notifications.set(notificationId, notification);

      // Log notification
      await this.logNotification(userId, 'email', subject, 'sent');

      // In production, call emailService
      // await emailService.send({
      //   to: userEmail,
      //   subject,
      //   html: htmlContent
      // })

      return {
        success: true,
        message: 'Email notification sent',
        notificationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSmsNotification(userId, phoneNumber, message, metadata = {}) {
    try {
      const notificationId = `notif_${Date.now()}`;

      const notification = {
        id: notificationId,
        userId,
        message,
        channel: 'sms',
        recipient: phoneNumber,
        status: 'sent',
        createdAt: new Date(),
        sentAt: new Date(),
        metadata,
      };

      notifications.set(notificationId, notification);

      // Log notification
      await this.logNotification(userId, 'sms', message.substring(0, 50), 'sent');

      // In production, call smsService
      // await smsService.send({
      //   to: phoneNumber,
      //   message
      // })

      return {
        success: true,
        message: 'SMS notification sent',
        notificationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, title, body, metadata = {}) {
    try {
      const notificationId = `notif_${Date.now()}`;

      const notification = {
        id: notificationId,
        userId,
        title,
        body,
        channel: 'push',
        status: 'sent',
        createdAt: new Date(),
        sentAt: new Date(),
        metadata,
      };

      notifications.set(notificationId, notification);

      // Log notification
      await this.logNotification(userId, 'push', title, 'sent');

      // In production, call Firebase Cloud Messaging
      // await admin.messaging().send({
      //   notification: { title, body },
      //   webpush: { fcmOptions: { link: metadata.link } }
      // })

      return {
        success: true,
        message: 'Push notification sent',
        notificationId,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send multi-channel notification
   */
  async sendMultiChannelNotification(userId, notification, channels = ['in-app', 'email', 'sms']) {
    try {
      const results = {
        userId,
        sentTo: [],
        failedChannels: [],
        timestamp: new Date(),
      };

      // Get user preferences
      const preferences = notificationPreferences.get(userId) || {};

      // Send to each channel if enabled
      if (channels.includes('in-app') && preferences.inApp !== false) {
        results.sentTo.push('in-app');
        // Send in-app
      }

      if (channels.includes('email') && preferences.email !== false) {
        results.sentTo.push('email');
        // Send email
      }

      if (channels.includes('sms') && preferences.sms !== false) {
        results.sentTo.push('sms');
        // Send SMS
      }

      if (channels.includes('push') && preferences.push !== false) {
        results.sentTo.push('push');
        // Send push
      }

      return {
        success: true,
        message: 'Multi-channel notification sent',
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get user notifications
   */
  async getNotifications(userId, limit = 50, offset = 0) {
    try {
      const userNotifications = Array.from(notifications.values())
        .filter(n => n.userId === userId && n.channel === 'in-app')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(offset, offset + limit);

      return {
        success: true,
        notifications: userNotifications,
        total: Array.from(notifications.values()).filter(n => n.userId === userId).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const notification = notifications.get(notificationId);

      if (!notification) {
        return {
          success: false,
          error: 'Notification not found',
        };
      }

      notification.read = true;
      notification.readAt = new Date();

      notifications.set(notificationId, notification);

      return {
        success: true,
        message: 'Notification marked as read',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    try {
      let count = 0;

      notifications.forEach((notification, key) => {
        if (notification.userId === userId && !notification.read) {
          notification.read = true;
          notification.readAt = new Date();
          notifications.set(key, notification);
          count++;
        }
      });

      return {
        success: true,
        message: `${count} notifications marked as read`,
        count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId) {
    try {
      notifications.delete(notificationId);

      return {
        success: true,
        message: 'Notification deleted',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Set notification preferences
   */
  async setNotificationPreferences(userId, preferences) {
    try {
      const currentPreferences = notificationPreferences.get(userId) || {};

      const updatedPreferences = {
        userId,
        ...currentPreferences,
        ...preferences,
        updatedAt: new Date(),
      };

      notificationPreferences.set(userId, updatedPreferences);

      return {
        success: true,
        message: 'Notification preferences updated',
        preferences: updatedPreferences,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(userId) {
    try {
      const preferences = notificationPreferences.get(userId) || {
        userId,
        inApp: true,
        email: true,
        sms: false,
        push: true,
        doNotDisturb: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
        },
      };

      return {
        success: true,
        preferences,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Schedule notification
   */
  async scheduleNotification(userId, notification, scheduledFor) {
    try {
      const notificationId = `notif_${Date.now()}`;

      const scheduled = {
        id: notificationId,
        userId,
        ...notification,
        scheduled: true,
        scheduledFor: new Date(scheduledFor),
        status: 'scheduled',
        createdAt: new Date(),
      };

      notifications.set(notificationId, scheduled);

      return {
        success: true,
        message: 'Notification scheduled',
        notificationId,
        scheduledFor,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    try {
      const unreadCount = Array.from(notifications.values()).filter(n => n.userId === userId && n.channel === 'in-app' && !n.read).length;

      return {
        success: true,
        unreadCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Log notification
   */
  async logNotification(userId, channel, title, status) {
    try {
      const logId = `log_${Date.now()}`;
      const log = {
        id: logId,
        userId,
        channel,
        title,
        status,
        timestamp: new Date(),
      };

      notificationLog.set(logId, log);

      // Keep only last 1000 logs
      if (notificationLog.size > 1000) {
        const keys = Array.from(notificationLog.keys());
        notificationLog.delete(keys[0]);
      }
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId) {
    try {
      const userNotifications = Array.from(notifications.values()).filter(n => n.userId === userId);

      const stats = {
        total: userNotifications.length,
        read: userNotifications.filter(n => n.read).length,
        unread: userNotifications.filter(n => !n.read).length,
        byChannel: {},
        byType: {},
      };

      // Count by channel
      userNotifications.forEach(n => {
        stats.byChannel[n.channel] = (stats.byChannel[n.channel] || 0) + 1;
        if (n.type) {
          stats.byType[n.type] = (stats.byType[n.type] || 0) + 1;
        }
      });

      return {
        success: true,
        stats,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = NotificationService;
