const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');
const { EventEmitter } = require('events');
const moment = require('moment');

/**
 * SmartNotificationService
 * Multi-channel notification delivery with templates, scheduling, and analytics
 */
class SmartNotificationService extends EventEmitter {
  constructor() {
    super();
    this.name = 'SmartNotificationService';
    console.log(`[${this.name}] Initialized`);
  }

  /**
   * Send notification using template
   */
  async sendNotification(templateCode, recipientId, variables = {}, options = {}) {
    try {
      const template = await NotificationTemplate.getByCode(templateCode);
      if (!template) throw new Error(`Template ${templateCode} not found`);

      const notificationId = `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Render template with variables
      const rendered = template.render(variables);

      // Determine channels
      const channels = options.channels || template.defaultChannels;

      // Create notification document
      const notification = new Notification({
        notificationId,
        recipientId,
        type: options.type || 'system_alert',
        title: rendered.emailSubject || template.pushTitle || 'Notification',
        message: rendered.emailBody || rendered.smsBody || rendered.pushMessage,
        templateId: template._id,
        templateName: template.templateName,
        channels,
        variableData: variables,
        status: options.scheduled ? 'scheduled' : 'pending',
        scheduledFor: options.scheduledFor || null,
        priority: options.priority || template.priority,
        categoryId: options.categoryId,
        relatedEntityId: options.relatedEntityId,
        relatedEntityType: options.relatedEntityType,
        actionUrl: options.actionUrl || template.actionUrl,
        actionLabel: options.actionLabel || template.actionLabel,
      });

      // Initialize channel status
      channels.forEach(channel => {
        notification.channelStatus.push({
          channel,
          status: 'pending',
        });
      });

      await notification.save();

      this.emit('notification-created', {
        notificationId,
        recipientId,
        templateCode,
        channels,
      });

      // Send immediately if not scheduled
      if (!options.scheduled) {
        await this.deliverNotification(notification);
      }

      return notification;
    } catch (error) {
      this.emit('notification-error', { error: error.message });
      throw error;
    }
  }

  /**
   * Deliver notification to all channels
   */
  async deliverNotification(notification) {
    try {
      notification.status = 'sending';
      await notification.save();

      const deliveryPromises = notification.channels.map(channel =>
        this.sendToChannel(notification, channel)
      );

      await Promise.all(deliveryPromises);

      notification.status = 'sent';
      notification.sentAt = new Date();
      await notification.save();

      this.emit('notification-sent', {
        notificationId: notification.notificationId,
        channels: notification.channels,
      });

      return notification;
    } catch (error) {
      notification.status = 'failed';
      await notification.save();
      this.emit('notification-delivery-failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Send to specific channel
   */
  async sendToChannel(notification, channel) {
    try {
      let success = false;

      switch (channel) {
        case 'email':
          success = await this.sendEmail(notification);
          break;
        case 'sms':
          success = await this.sendSMS(notification);
          break;
        case 'push':
          success = await this.sendPush(notification);
          break;
        case 'in_app':
          success = await this.markInAppReady(notification);
          break;
        case 'slack':
          success = await this.sendSlack(notification);
          break;
        case 'webhook':
          success = await this.callWebhook(notification);
          break;
      }

      if (success) {
        await notification.markAsDelivered(channel);
      }

      return success;
    } catch (error) {
      await notification.markAsFailed(channel, error.message);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(notification) {
    // Integration with email service (SendGrid, SES, etc.)
    console.log(`[Email] Sending to ${notification.recipientEmail}: ${notification.title}`);
    // Simulated email sending
    return true;
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification) {
    // Integration with SMS service (Twilio, AWS SNS, etc.)
    console.log(
      `[SMS] Sending to ${notification.recipientPhone}: ${notification.message.substring(0, 50)}`
    );
    // Simulated SMS sending
    return true;
  }

  /**
   * Send push notification
   */
  async sendPush(notification) {
    // Integration with push service (FCM, APNs, etc.)
    console.log(`[Push] Sending: ${notification.title}`);
    // Simulated push sending
    return true;
  }

  /**
   * Mark in-app notification as ready
   */
  async markInAppReady(notification) {
    console.log(`[In-App] Queued: ${notification.title}`);
    return true;
  }

  /**
   * Send Slack notification
   */
  async sendSlack(notification) {
    // Integration with Slack API
    console.log(`[Slack] Sending: ${notification.message}`);
    return true;
  }

  /**
   * Call webhook
   */
  async callWebhook(notification) {
    // Integration with webhooks
    console.log(`[Webhook] Calling webhook for ${notification.type}`);
    return true;
  }

  /**
   * Batch send notifications
   */
  async batchSend(recipientIds, templateCode, variables = {}, options = {}) {
    try {
      const notifications = [];

      for (const recipientId of recipientIds) {
        const notif = await this.sendNotification(templateCode, recipientId, variables, options);
        notifications.push(notif);
      }

      this.emit('batch-sent', {
        count: notifications.length,
        templateCode,
      });

      return notifications;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Schedule bulk notifications
   */
  async scheduleBulk(recipients, templateCode, scheduledFor, variables = {}) {
    try {
      const notifications = [];

      for (const recipient of recipients) {
        const notif = await this.sendNotification(templateCode, recipient.recipientId, variables, {
          scheduled: true,
          scheduledFor,
          type: recipient.type,
          channels: recipient.channels,
        });
        notifications.push(notif);
      }

      this.emit('bulk-scheduled', {
        count: notifications.length,
        scheduledFor,
      });

      return notifications;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Send pending scheduled notifications
   */
  async processPending() {
    try {
      const pending = await Notification.getPending();

      for (const notification of pending) {
        await this.deliverNotification(notification);
      }

      this.emit('pending-processed', { count: pending.length });

      return pending;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailed() {
    try {
      const failed = await Notification.getFailed(3);

      for (const notification of failed) {
        await notification.retry();
        await this.deliverNotification(notification);
      }

      this.emit('failed-retried', { count: failed.length });

      return failed;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notification analytics
   */
  async getAnalytics(hours = 24) {
    try {
      const stats = await Notification.getDeliveryStats(hours);
      return stats[0] || this.getEmptyStats();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get template performance
   */
  async getTemplatePerformance(templateId) {
    try {
      const template = await NotificationTemplate.findById(templateId);
      if (!template) throw new Error('Template not found');

      return {
        template: template.templateName,
        totalSent: template.totalSent,
        deliveryRate: template.deliveryRate,
        openRate: template.openRate,
        clickRate: template.clickRate,
        conversionRate: template.conversionRate,
        averageDeliveryTime: template.averageDeliveryTime,
        lastUsedAt: template.lastUsedAt,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create notification template
   */
  async createTemplate(templateData) {
    try {
      const template = new NotificationTemplate({
        templateName: templateData.name,
        templateCode: templateData.code,
        description: templateData.description,
        emailBody: templateData.emailBody,
        emailSubject: templateData.emailSubject,
        smsBody: templateData.smsBody,
        pushMessage: templateData.pushMessage,
        variables: templateData.variables || [],
        defaultChannels: templateData.defaultChannels || ['email'],
        category: templateData.category || 'notification',
        priority: templateData.priority || 'normal',
      });

      // Validate template
      const validation = template.validate();
      if (!validation.isValid) {
        throw new Error(`Template validation failed: ${validation.errors.join(', ')}`);
      }

      await template.save();

      this.emit('template-created', {
        templateCode: template.templateCode,
        templateName: template.templateName,
      });

      return template;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get user unread notifications
   */
  async getUnreadNotifications(recipientId, limit = 10) {
    try {
      return await Notification.getUnread(recipientId).limit(limit);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) throw new Error('Notification not found');

      await notification.markAsRead();

      this.emit('notification-read', { notificationId });

      return notification;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Record click on notification
   */
  async recordClick(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) throw new Error('Notification not found');

      await notification.recordClick();

      this.emit('notification-clicked', { notificationId });

      return notification;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Unsubscribe from notifications
   */
  async unsubscribe(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) throw new Error('Notification not found');

      await notification.unsubscribe();

      this.emit('notification-unsubscribed', { notificationId });

      return notification;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notification by ID
   */
  async getNotification(notificationId) {
    try {
      return await Notification.findById(notificationId).populate('templateId');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get notifications by type
   */
  async getNotificationsByType(recipientId, type) {
    try {
      return await Notification.getByType(recipientId, type);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get empty stats object
   */
  getEmptyStats() {
    return {
      total: 0,
      sent: 0,
      failed: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      deliveryRate: 0,
      openRate: 0,
      clickRate: 0,
    };
  }
}

// Export singleton instance
module.exports = new SmartNotificationService();
