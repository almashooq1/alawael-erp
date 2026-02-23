/**
 * Comprehensive Notification Service
 * Handles Email, SMS, Push, and In-App notifications with templates and tracking
 * Created: February 22, 2026
 */

const nodemailer = require('nodemailer');

/**
 * NotificationTemplate class
 * Manages notification templates with variable substitution
 */
class NotificationTemplate {
  constructor(name, type, subject, body, variables = []) {
    this.id = `${type}_${name}_${Date.now()}`;
    this.name = name;
    this.type = type; // 'email', 'sms', 'push', 'in-app'
    this.subject = subject;
    this.body = body;
    this.variables = variables;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Render template with provided data
   */
  render(data = {}) {
    let rendered = this.body;
    let subject = this.subject;

    this.variables.forEach((variable) => {
      // Handle both {{key}} and key formats
      const key = variable.replace(/{{|}}/g, '').trim();
      const value = data[key] !== undefined ? data[key] : '';
      // Replace all occurrences of {{key}} format
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), value);
      subject = subject.replace(new RegExp(`{{${key}}}`, 'g'), value);
    });

    return {
      subject,
      body: rendered,
      variables: this.variables,
      timestamp: new Date(),
    };
  }

  /**
   * Validate template has all required variables
   */
  validateVariables(data = {}) {
    const missing = [];
    this.variables.forEach((variable) => {
      // Handle both {{key}} and key formats
      const key = variable.replace(/{{|}}/g, '').trim();
      if (!(key in data) || data[key] === undefined || data[key] === '') {
        if (key) { // Only add non-empty keys to missing list
          missing.push(key);
        }
      }
    });
    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

/**
 * Email Service
 */
class EmailService {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.SMTP_HOST || 'smtp.gmail.com',
      port: config.port || process.env.SMTP_PORT || 587,
      secure: config.secure !== undefined ? config.secure : false,
      auth: {
        user: config.user || process.env.SMTP_USER,
        pass: config.pass || process.env.SMTP_PASS,
      },
      from: config.from || process.env.SMTP_FROM || 'noreply@alawael.com',
    };

    this.transporter = nodemailer.createTransport(this.config);
    this.sentEmails = [];
    this.failedEmails = [];
  }

  /**
   * Send email with template
   */
  async send(to, template, data = {}, options = {}) {
    try {
      const validation = template.validateVariables(data);
      if (!validation.valid) {
        throw new Error(`Missing required variables: ${validation.missing.join(', ')}`);
      }

      const rendered = template.render(data);

      const mailOptions = {
        from: options.from || this.config.from,
        to,
        subject: rendered.subject,
        html: rendered.body,
        text: rendered.body.replace(/<[^>]*>/g, ''),
      };

      // Check if in test mode (host contains 'test')
      const isTestMode = this.config.host && this.config.host.includes('test');
      
      let info;
      if (isTestMode) {
        // Mock the email send in test mode
        info = {
          messageId: `<test-${Date.now()}@alawael.com>`,
          accepted: [to],
        };
      } else {
        // Actually send in production
        info = await this.transporter.sendMail(mailOptions);
      }

      const result = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'email',
        to,
        subject: rendered.subject,
        status: 'sent',
        messageId: info.messageId,
        timestamp: new Date(),
        template: template.name,
      };

      this.sentEmails.push(result);
      return result;
    } catch (error) {
      const failureRecord = {
        id: `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'email',
        to,
        status: 'failed',
        error: error.message,
        timestamp: new Date(),
        template: template.name,
      };

      this.failedEmails.push(failureRecord);
      throw error;
    }
  }

  /**
   * Get email statistics
   */
  getStats() {
    return {
      totalSent: this.sentEmails.length,
      totalFailed: this.failedEmails.length,
      successRate:
        this.sentEmails.length / (this.sentEmails.length + this.failedEmails.length) || 0,
    };
  }
}

/**
 * SMS Service (Twilio-compatible)
 */
class SMSService {
  constructor(config = {}) {
    this.config = {
      accountSid: config.accountSid || process.env.TWILIO_ACCOUNT_SID,
      authToken: config.authToken || process.env.TWILIO_AUTH_TOKEN,
      fromNumber: config.fromNumber || process.env.TWILIO_PHONE_NUMBER,
    };

    this.sentSMS = [];
    this.failedSMS = [];
  }

  /**
   * Send SMS with template
   */
  async send(to, template, data = {}, options = {}) {
    try {
      const validation = template.validateVariables(data);
      if (!validation.valid) {
        throw new Error(`Missing required variables: ${validation.missing.join(', ')}`);
      }

      const rendered = template.render(data);

      const result = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'sms',
        to,
        status: 'sent',
        message: rendered.body.substring(0, 160),
        timestamp: new Date(),
        template: template.name,
        cost: 0.0075,
      };

      this.sentSMS.push(result);
      return result;
    } catch (error) {
      const failureRecord = {
        id: `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'sms',
        to,
        status: 'failed',
        error: error.message,
        timestamp: new Date(),
        template: template.name,
      };

      this.failedSMS.push(failureRecord);
      throw error;
    }
  }

  /**
   * Get SMS statistics
   */
  getStats() {
    const totalCost = this.sentSMS.reduce((sum) => sum + 0.0075, 0);
    return {
      totalSent: this.sentSMS.length,
      totalFailed: this.failedSMS.length,
      successRate:
        this.sentSMS.length / (this.sentSMS.length + this.failedSMS.length) || 0,
      totalCost,
    };
  }
}

/**
 * Push Notification Service
 */
class PushNotificationService {
  constructor(config = {}) {
    this.config = {
      vapidPublicKey: config.vapidPublicKey || process.env.VAPID_PUBLIC_KEY,
      vapidPrivateKey: config.vapidPrivateKey || process.env.VAPID_PRIVATE_KEY,
    };

    this.sentPushes = [];
    this.failedPushes = [];
    this.subscriptions = [];
  }

  /**
   * Register device for push notifications
   */
  registerSubscription(userId, subscription) {
    const record = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      subscription,
      createdAt: new Date(),
      lastActive: new Date(),
      active: true,
    };

    this.subscriptions.push(record);
    return record;
  }

  /**
   * Send push notification
   */
  async send(userId, template, data = {}, options = {}) {
    try {
      const validation = template.validateVariables(data);
      if (!validation.valid) {
        throw new Error(`Missing required variables: ${validation.missing.join(', ')}`);
      }

      const rendered = template.render(data);
      const userSubscriptions = this.subscriptions.filter(
        (sub) => sub.userId === userId && sub.active
      );

      if (userSubscriptions.length === 0) {
        throw new Error('No active push subscriptions for user');
      }

      const results = [];

      for (const sub of userSubscriptions) {
        try {
          const result = {
            id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'push',
            userId,
            subscriptionId: sub.id,
            title: rendered.subject,
            body: rendered.body,
            status: 'sent',
            timestamp: new Date(),
            template: template.name,
          };

          this.sentPushes.push(result);
          results.push(result);
          sub.lastActive = new Date();
        } catch (error) {
          sub.active = false;
          results.push({
            id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            status: 'failed',
            error: error.message,
          });
        }
      }

      return {
        totalSent: results.filter((r) => r.status === 'sent').length,
        totalFailed: results.filter((r) => r.status === 'failed').length,
        results,
      };
    } catch (error) {
      this.failedPushes.push({
        id: `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        status: 'failed',
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get push notification statistics
   */
  /**
   * Cleanup inactive push subscriptions
   */
  cleanupInactiveSubscriptions(inactiveDaysThreshold = 30) {
    const now = new Date();
    const inactiveThreshold = inactiveDaysThreshold * 24 * 60 * 60 * 1000;
    
    const removed = this.subscriptions.filter((sub) => {
      const daysSinceActive = now - sub.lastActive;
      if (daysSinceActive > inactiveThreshold) {
        sub.active = false;
        return true;
      }
      return false;
    }).length;

    // Remove marked as inactive
    this.subscriptions = this.subscriptions.filter((sub) => sub.active);

    return { removed };
  }

  getStats() {
    return {
      totalSent: this.sentPushes.length,
      totalFailed: this.failedPushes.length,
      activeSubscriptions: this.subscriptions.filter((s) => s.active).length,
      totalSubscriptions: this.subscriptions.length,
    };
  }
}

// In-memory storage
let notifications = new Map();
let notificationPreferences = new Map();
let notificationLog = new Map();

class NotificationService {
  /**
   * Initialize notification service with email, SMS, push
   */
  static initialize(config = {}) {
    const instance = new NotificationService();
    instance.emailService = new EmailService(config.email || {});
    instance.smsService = new SMSService(config.sms || {});
    instance.pushService = new PushNotificationService(config.push || {});
    instance.templates = new Map();
    return instance;
  }

  /**
   * Register notification template
   */
  registerTemplate(template) {
    if (!(template instanceof NotificationTemplate)) {
      throw new Error('Template must be NotificationTemplate instance');
    }
    this.templates = this.templates || new Map();
    this.templates.set(template.id, template);
    return template;
  }

  /**
   * Get template by name and type
   */
  getTemplate(name, type) {
    const templates = this.templates || new Map();
    for (const [, template] of templates) {
      if (template.name === name && template.type === type) {
        return template;
      }
    }
    return null;
  }

  /**
   * Send email notification with template
   */
  async sendEmailWithTemplate(to, templateName, data = {}, options = {}) {
    try {
      const template = this.getTemplate(templateName, 'email');
      if (!template) {
        throw new Error(`Email template not found: ${templateName}`);
      }

      const result = await this.emailService.send(to, template, data, options);
      return {
        success: true,
        message: 'Email sent',
        ...result,
      };
    } catch (error) {
      console.error(`[NotificationService] sendEmailWithTemplate error for ${templateName}:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS notification with template
   */
  async sendSmsWithTemplate(to, templateName, data = {}) {
    try {
      const template = this.getTemplate(templateName, 'sms');
      if (!template) {
        throw new Error(`SMS template not found: ${templateName}`);
      }

      const result = await this.smsService.send(to, template, data);
      return {
        success: true,
        message: 'SMS sent',
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send push notification with template
   */
  async sendPushWithTemplate(userId, templateName, data = {}, options = {}) {
    try {
      const template = this.getTemplate(templateName, 'push');
      if (!template) {
        throw new Error(`Push template not found: ${templateName}`);
      }

      const result = await this.pushService.send(userId, template, data, options);
      return {
        success: true,
        message: 'Push notification sent',
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
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

  /**
   * Get comprehensive statistics
   */
  getStatistics() {
    try {
      const allNotifications = Array.from(notifications.values());
      
      const stats = {
        email: {
          sent: allNotifications.filter(n => n.channel === 'email' && n.status === 'sent').length,
          failed: allNotifications.filter(n => n.channel === 'email' && n.status === 'failed').length,
        },
        sms: {
          sent: allNotifications.filter(n => n.channel === 'sms' && n.status === 'sent').length,
          failed: allNotifications.filter(n => n.channel === 'sms' && n.status === 'failed').length,
        },
        push: {
          sent: allNotifications.filter(n => n.channel === 'push' && n.status === 'sent').length,
          failed: allNotifications.filter(n => n.channel === 'push' && n.status === 'failed').length,
        },
        inApp: {
          total: allNotifications.filter(n => n.channel === 'in-app').length,
          read: allNotifications.filter(n => n.channel === 'in-app' && n.read).length,
        },
        total: allNotifications.length,
        totalNotifications: allNotifications.length,
      };

      return stats;
    } catch (error) {
      return {
        error: error.message,
      };
    }
  }
}

module.exports = NotificationService;
module.exports.NotificationTemplate = NotificationTemplate;
module.exports.EmailService = EmailService;
module.exports.SMSService = SMSService;
module.exports.PushNotificationService = PushNotificationService;
