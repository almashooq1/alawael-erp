/**
 * Unified Notification Service
 * خدمة الإشعارات الموحدة
 *
 * Features:
 * - Unified queue for all notification types
 * - Support for Email, SMS, WhatsApp, Push, In-App
 * - Template system with variables
 * - User preferences
 * - Retry mechanism
 * - Delivery tracking
 * - Priority levels
 */

const emailService = require('./emailService');
const smsService = require('./smsService');
const Notification = require('../models/Notification');
const AuditLogger = require('./audit-logger');

class UnifiedNotificationService {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.RETRY_ATTEMPTS = 3;
    this.RETRY_DELAY = 5000; // 5 seconds
  }

  /**
   * Send notification (main entry point)
   */
  async send(notification) {
    try {
      // Validate notification
      this.validateNotification(notification);

      // Check user preferences
      const allowed = await this.checkUserPreferences(
        notification.userId,
        notification.type,
        notification.channel
      );

      if (!allowed) {
        console.log(
          `Notification blocked by user preferences: ${notification.userId} - ${notification.channel}`
        );
        return { success: false, reason: 'blocked_by_preferences' };
      }

      // Create notification record
      const notificationRecord = await Notification.create({
        userId: notification.userId,
        type: notification.type,
        channel: notification.channel,
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        priority: notification.priority || 'normal',
        status: 'pending',
      });

      // Add to queue
      this.queue.push({
        id: notificationRecord._id,
        ...notification,
      });

      // Start processing queue
      this.processQueue();

      return {
        success: true,
        notificationId: notificationRecord._id,
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send multiple notifications (batch)
   */
  async sendBatch(notifications) {
    const results = [];
    for (const notification of notifications) {
      try {
        const result = await this.send(notification);
        results.push(result);
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Process notification queue
   */
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      // Sort by priority
      this.queue.sort((a, b) => {
        const priorityOrder = { urgent: 1, high: 2, normal: 3, low: 4 };
        return priorityOrder[a.priority || 'normal'] - priorityOrder[b.priority || 'normal'];
      });

      const notification = this.queue.shift();

      try {
        await this.deliverNotification(notification);
      } catch (error) {
        console.error('Error delivering notification:', error);
        await this.handleDeliveryFailure(notification, error);
      }
    }

    this.processing = false;
  }

  /**
   * Deliver notification via appropriate channel
   */
  async deliverNotification(notification) {
    const { channel, userId, title, message, data } = notification;

    let result = null;

    switch (channel) {
      case 'email':
        result = await this.sendEmailNotification(notification);
        break;

      case 'sms':
        result = await this.sendSMSNotification(notification);
        break;

      case 'whatsapp':
        result = await this.sendWhatsAppNotification(notification);
        break;

      case 'push':
        result = await this.sendPushNotification(notification);
        break;

      case 'in-app':
        result = await this.sendInAppNotification(notification);
        break;

      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }

    // Update notification status
    await Notification.findByIdAndUpdate(notification.id, {
      status: 'delivered',
      deliveredAt: new Date(),
      deliveryResult: result,
    });

    // Log delivery
    await AuditLogger.log({
      action: 'notification.delivered',
      userId,
      metadata: {
        notificationId: notification.id,
        channel,
        type: notification.type,
      },
    });

    return result;
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    const user = await this.getUserInfo(notification.userId);
    if (!user || !user.email) {
      throw new Error('User email not found');
    }

    await emailService.sendTemplateEmail(user.email, {
      subject: notification.title,
      template: notification.template || 'default',
      variables: {
        username: user.username || user.fullName,
        message: notification.message,
        ...notification.data,
      },
    });

    return { success: true, email: user.email };
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(notification) {
    const user = await this.getUserInfo(notification.userId);
    if (!user || !user.phone) {
      throw new Error('User phone not found');
    }

    await smsService.sendMessage(user.phone, notification.message);

    return { success: true, phone: user.phone };
  }

  /**
   * Send WhatsApp notification
   */
  async sendWhatsAppNotification(notification) {
    const user = await this.getUserInfo(notification.userId);
    if (!user || !user.phone) {
      throw new Error('User phone not found');
    }

    // WhatsApp integration (placeholder)
    // await whatsappService.sendMessage(user.phone, notification.message);

    console.log(`[WhatsApp] Would send to ${user.phone}: ${notification.message}`);

    return { success: true, phone: user.phone, method: 'whatsapp' };
  }

  /**
   * Send Push notification
   */
  async sendPushNotification(notification) {
    // Push notification integration (placeholder)
    // await pushService.send(notification.userId, {
    //   title: notification.title,
    //   body: notification.message,
    //   data: notification.data
    // });

    console.log(`[Push] Would send to ${notification.userId}: ${notification.title}`);

    return { success: true, userId: notification.userId, method: 'push' };
  }

  /**
   * Send In-App notification
   */
  async sendInAppNotification(notification) {
    // Create in-app notification (already created in Notification model)
    // Emit via Socket.IO if available
    try {
      const io = require('../server').io;
      if (io) {
        io.to(`user:${notification.userId}`).emit('notification', {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          data: notification.data,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      console.warn('Socket.IO not available for in-app notification');
    }

    return { success: true, userId: notification.userId, method: 'in-app' };
  }

  /**
   * Handle delivery failure
   */
  async handleDeliveryFailure(notification, error) {
    const attempt = (notification.attempts || 0) + 1;

    // Update notification with failure
    await Notification.findByIdAndUpdate(notification.id, {
      status: 'failed',
      failureReason: error.message,
      attempts: attempt,
    });

    // Retry if under max attempts
    if (attempt < this.RETRY_ATTEMPTS) {
      console.log(`Retrying notification ${notification.id} (attempt ${attempt + 1})`);

      // Add back to queue with delay
      setTimeout(() => {
        this.queue.push({
          ...notification,
          attempts: attempt,
        });
      }, this.RETRY_DELAY * attempt); // Exponential backoff
    } else {
      console.error(`Notification ${notification.id} failed after ${attempt} attempts`);

      await AuditLogger.log({
        action: 'notification.failed',
        userId: notification.userId,
        metadata: {
          notificationId: notification.id,
          channel: notification.channel,
          attempts: attempt,
          error: error.message,
        },
      });
    }
  }

  /**
   * Validate notification
   */
  validateNotification(notification) {
    if (!notification.userId) {
      throw new Error('userId is required');
    }

    if (!notification.type) {
      throw new Error('type is required');
    }

    if (!notification.channel) {
      throw new Error('channel is required');
    }

    if (!notification.message) {
      throw new Error('message is required');
    }

    const validChannels = ['email', 'sms', 'whatsapp', 'push', 'in-app'];
    if (!validChannels.includes(notification.channel)) {
      throw new Error(`Invalid channel: ${notification.channel}`);
    }

    const validTypes = ['payment', 'security', 'system', 'marketing', 'reminder', 'alert', 'info'];
    if (!validTypes.includes(notification.type)) {
      throw new Error(`Invalid type: ${notification.type}`);
    }
  }

  /**
   * Check user notification preferences
   */
  async checkUserPreferences(userId, type, channel) {
    try {
      const User = require('../models/User');
      const user = await User.findById(userId).select('notificationPreferences');

      if (!user || !user.notificationPreferences) {
        return true; // Allow by default
      }

      const prefs = user.notificationPreferences;

      // Check if channel is enabled
      if (prefs.channels && prefs.channels[channel] === false) {
        return false;
      }

      // Check if type is enabled
      if (prefs.types && prefs.types[type] === false) {
        return false;
      }

      // Check quiet hours
      if (prefs.quietHours && prefs.quietHours.enabled) {
        const now = new Date();
        const currentHour = now.getHours();
        const { start, end } = prefs.quietHours;

        if (currentHour >= start && currentHour < end) {
          // During quiet hours, only allow urgent notifications
          return notification.priority === 'urgent';
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking user preferences:', error);
      return true; // Allow on error (fail open)
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(userId) {
    try {
      const User = require('../models/User');
      return await User.findById(userId).select('email phone username fullName');
    } catch (error) {
      console.error('Error getting user info:', error);
      return null;
    }
  }

  /**
   * Get notification history
   */
  async getHistory(userId, options = {}) {
    try {
      const { page = 1, limit = 20, status, type, channel, unreadOnly = false } = options;

      const query = { userId };

      if (status) query.status = status;
      if (type) query.type = type;
      if (channel) query.channel = channel;
      if (unreadOnly) query.read = false;

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      console.error('Error getting notification history:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { read: true, readAt: new Date() },
        { new: true }
      );

      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, read: false },
        { read: true, readAt: new Date() }
      );

      return { modifiedCount: result.modifiedCount };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        read: false,
      });

      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      await Notification.findOneAndDelete({
        _id: notificationId,
        userId,
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

module.exports = new UnifiedNotificationService();
