/**
 * Advanced GOSI Notification Service
 * خدمة الإشعارات الذكية المتقدمة
 * 
 * Features:
 * - Multi-channel notifications (Email, SMS, Push, In-app)
 * - Smart scheduling
 * - User preferences
 * - Priority levels
 * - Template system
 */

const EventEmitter = require('events');
const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class GOSINotificationService extends EventEmitter {
  constructor() {
    super();
    this.name = 'GOSINotificationService';
    this.notificationQueue = [];
    this.isProcessing = false;

    // Initialize email service
    this.emailService = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Notification templates
    this.templates = {
      gosi_registration_confirmation: this._getTemplateGOSIRegistration(),
      medical_insurance_expiry_warning: this._getTemplateMedicalExpiry(),
      compliance_issue_alert: this._getTemplateComplianceAlert(),
      salary_update_confirmation: this._getTemplateSalaryUpdate(),
      document_expiry_reminder: this._getTemplateDocumentReminder(),
      compliance_report_ready: this._getTemplateReportReady()
    };
  }

  /**
   * Send notification
   * إرسال إشعار
   */
  async sendNotification(recipient, notificationData) {
    try {
      const {
        type,
        channel = ['email', 'in-app'],
        priority = 'normal',
        templateData = {},
        subject,
        message,
        actionUrl,
        scheduleTime = null
      } = notificationData;

      // Validate recipient
      if (!recipient || !recipient._id) {
        throw new Error('Invalid recipient');
      }

      // Check user notification preferences
      const preferences = await this._getUserPreferences(recipient._id);
      if (!this._shouldSendNotification(preferences, channel, type)) {
        logger.info(`Notification skipped - user preferences: ${recipient._id}`);
        return { skipped: true, reason: 'User preferences' };
      }

      const notification = {
        id: this._generateNotificationId(),
        recipient: recipient._id,
        type,
        channels: Array.isArray(channel) ? channel : [channel],
        priority,
        subject: subject || this._getSubject(type),
        message: message || this._renderTemplate(type, templateData),
        actionUrl,
        status: 'pending',
        createdAt: new Date(),
        scheduledFor: scheduleTime,
        sentAt: null,
        readAt: null
      };

      // Save to database
      await this._saveNotification(notification);

      // Schedule or send immediately
      if (scheduleTime && new Date(scheduleTime) > new Date()) {
        await this._scheduleNotification(notification);
        logger.info(`Notification scheduled: ${notification.id}`);
        return { scheduled: true, notificationId: notification.id };
      } else {
        await this._sendNotificationNow(notification, recipient, preferences);
        return { sent: true, notificationId: notification.id };
      }
    } catch (error) {
      logger.error('Failed to send notification', error);
      this.emit('notification.error', error);
      throw error;
    }
  }

  /**
   * Send bulk notifications
   * إرسال إشعارات مجموعة
   */
  async sendBulkNotifications(recipients, notificationData) {
    try {
      const results = [];

      for (const recipient of recipients) {
        try {
          const result = await this.sendNotification(recipient, notificationData);
          results.push({ recipient: recipient._id, ...result });
        } catch (error) {
          results.push({ recipient: recipient._id, error: error.message });
        }
      }

      logger.info(`Bulk notifications sent: ${results.length} recipients`);
      return results;
    } catch (error) {
      logger.error('Failed to send bulk notifications', error);
      throw error;
    }
  }

  /**
   * Notify GOSI registration
   * إشعار بتسجيل التأمينات
   */
  async notifyGOSIRegistration(recipient, gosiData) {
    return this.sendNotification(recipient, {
      type: 'gosi_registration_confirmation',
      channel: ['email', 'in-app', 'sms'],
      priority: 'high',
      subject: '✅ تم تسجيلك في التأمينات الاجتماعية',
      templateData: {
        gosiNumber: gosiData.gosiNumber,
        salary: gosiData.salary,
        startDate: gosiData.startDate,
        employerContribution: gosiData.employerContribution,
        employeeContribution: gosiData.employeeContribution
      }
    });
  }

  /**
   * Notify medical insurance expiry
   * إشعار بانتهاء صلاحية التأمين الطبي
   */
  async notifyMedicalInsuranceExpiry(recipient, insuranceData) {
    return this.sendNotification(recipient, {
      type: 'medical_insurance_expiry_warning',
      channel: ['email', 'sms', 'push'],
      priority: 'high',
      subject: '⚠️ تحذير: التأمين الطبي ينتهي قريباً',
      templateData: {
        policyNumber: insuranceData.policyNumber,
        expiryDate: insuranceData.expiryDate,
        daysRemaining: insuranceData.daysRemaining,
        renewalInstructions: 'يرجى التواصل مع قسم الموارد البشرية'
      },
      actionUrl: '/insurance/renew'
    });
  }

  /**
   * Notify compliance issue
   * إشعار بمشكلة امتثال
   */
  async notifyComplianceIssue(recipient, issueData) {
    return this.sendNotification(recipient, {
      type: 'compliance_issue_alert',
      channel: ['email', 'in-app'],
      priority: issueData.severity === 'critical' ? 'critical' : 'high',
      subject: `🚨 تنبيه امتثال: ${issueData.issue}`,
      templateData: {
        issue: issueData.issue,
        severity: issueData.severity,
        action: issueData.action,
        deadline: issueData.deadline
      },
      actionUrl: '/compliance/details'
    });
  }

  /**
   * Notify salary update
   * إشعار بتحديث الراتب
   */
  async notifySalaryUpdate(recipient, salaryData) {
    return this.sendNotification(recipient, {
      type: 'salary_update_confirmation',
      channel: ['email', 'in-app'],
      priority: 'normal',
      subject: '💰 تم تحديث راتبك',
      templateData: {
        previousSalary: salaryData.previousSalary,
        newSalary: salaryData.newSalary,
        effectiveDate: salaryData.effectiveDate,
        increase: salaryData.newSalary - salaryData.previousSalary
      },
      actionUrl: '/payroll/details'
    });
  }

  /**
   * Get notifications for user
   * الحصول على إشعارات المستخدم
   */
  async getNotifications(userId, filters = {}) {
    try {
      const {
        limit = 20,
        offset = 0,
        status = null, // null, 'read', 'unread'
        types = null,
        sorted = 'desc'
      } = filters;

      // This would normally query the database
      // For now, we'll return a mock response
      const notifications = [
        {
          id: 'notif001',
          userId,
          type: 'gosi_registration_confirmation',
          subject: '✅ تم تسجيلك في التأمينات الاجتماعية',
          message: 'تم تسجيل بيانات التأمينات الاجتماعية بنجاح',
          priority: 'high',
          status: 'unread',
          channels: ['email', 'in-app'],
          readAt: null,
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          actionUrl: '/insurance/details'
        },
        {
          id: 'notif002',
          userId,
          type: 'medical_insurance_expiry_warning',
          subject: '⚠️ التأمين الطبي ينتهي خلال 30 يوم',
          message: 'يرجى تجديد التأمين الطبي قبل انتهاء صلاحيته',
          priority: 'high',
          status: 'unread',
          channels: ['email', 'sms'],
          readAt: null,
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          actionUrl: '/insurance/renew'
        }
      ];

      // Apply filters
      let filtered = notifications;
      if (status) {
        filtered = filtered.filter(n => n.status === status);
      }
      if (types && Array.isArray(types)) {
        filtered = filtered.filter(n => types.includes(n.type));
      }

      // Sort
      filtered.sort((a, b) => {
        if (sorted === 'desc') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        } else {
          return new Date(a.createdAt) - new Date(b.createdAt);
        }
      });

      // Paginate
      const paginated = filtered.slice(offset, offset + limit);

      return {
        total: filtered.length,
        limit,
        offset,
        notifications: paginated
      };
    } catch (error) {
      logger.error('Failed to get notifications', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   * وضع علامة على إشعار كمقروء
   */
  async markAsRead(notificationId, userId) {
    try {
      // Update database
      await this._updateNotification(notificationId, {
        status: 'read',
        readAt: new Date()
      });

      logger.info(`Notification marked as read: ${notificationId}`);
      return { success: true, notificationId };
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Get notification statistics
   * الحصول على إحصائيات الإشعارات
   */
  async getNotificationStats(userId) {
    try {
      return {
        total: 45,
        unread: 8,
        byType: {
          'gosi_registration_confirmation': 5,
          'medical_insurance_expiry_warning': 8,
          'compliance_issue_alert': 12,
          'salary_update_confirmation': 15,
          'document_expiry_reminder': 5
        },
        byChannel: {
          'email': 35,
          'sms': 8,
          'push': 15,
          'in-app': 45
        },
        byPriority: {
          'critical': 2,
          'high': 15,
          'normal': 28
        }
      };
    } catch (error) {
      logger.error('Failed to get notification statistics', error);
      throw error;
    }
  }

  /**
   * Private methods
   */

  async _sendNotificationNow(notification, recipient, preferences) {
    const channels = notification.channels || ['in-app'];

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            if (preferences.emailNotifications) {
              await this._sendEmail(notification, recipient);
            }
            break;
          case 'sms':
            if (preferences.smsNotifications) {
              await this._sendSMS(notification, recipient);
            }
            break;
          case 'push':
            if (preferences.pushNotifications) {
              await this._sendPushNotification(notification, recipient);
            }
            break;
          case 'in-app':
            // In-app notifications are always sent
            await this._saveInAppNotification(notification);
            break;
        }
      } catch (error) {
        logger.error(`Failed to send ${channel} notification`, error);
      }
    }

    notification.status = 'sent';
    notification.sentAt = new Date();
    await this._updateNotification(notification.id, notification);
    this.emit('notification.sent', notification);
  }

  async _sendEmail(notification, recipient) {
    const mailOptions = {
      from: process.env.SMTP_FROM || 'noreply@company.com',
      to: recipient.email,
      subject: notification.subject,
      html: this._generateEmailHTML(notification),
      text: notification.message
    };

    await this.emailService.sendMail(mailOptions);
    logger.info(`Email notification sent: ${recipient.email}`);
  }

  async _sendSMS(notification, recipient) {
    // Implement SMS sending via Twilio or similar service
    logger.info(`SMS notification would be sent to: ${recipient.phone}`);
  }

  async _sendPushNotification(notification, recipient) {
    // Implement push notifications via Firebase or similar
    logger.info(`Push notification would be sent to: ${recipient._id}`);
  }

  async _saveInAppNotification(notification) {
    // Save to database
    logger.info(`In-app notification created: ${notification.id}`);
  }

  async _saveNotification(notification) {
    // Save to database
    logger.info(`Notification saved: ${notification.id}`);
  }

  async _updateNotification(notificationId, data) {
    // Update in database
    logger.info(`Notification updated: ${notificationId}`);
  }

  async _scheduleNotification(notification) {
    // Add to queue with scheduled time
    this.notificationQueue.push(notification);
    logger.info(`Notification scheduled: ${notification.id}`);
  }

  async _getUserPreferences(userId) {
    // Get user notification preferences from database
    return {
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      inAppNotifications: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      },
      disabledNotificationTypes: []
    };
  }

  _shouldSendNotification(preferences, channels, type) {
    if (preferences.disabledNotificationTypes.includes(type)) {
      return false;
    }

    // Check quiet hours
    if (preferences.quietHours?.enabled) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const startTime = parseInt(preferences.quietHours.start.split(':')[0]) * 60 +
                       parseInt(preferences.quietHours.start.split(':')[1]);
      const endTime = parseInt(preferences.quietHours.end.split(':')[0]) * 60 +
                     parseInt(preferences.quietHours.end.split(':')[1]);

      if (currentTime >= startTime && currentTime <= endTime) {
        return false;
      }
    }

    return true;
  }

  _generateNotificationId() {
    return `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _getSubject(type) {
    const subjects = {
      'gosi_registration_confirmation': '✅ تم تسجيلك في التأمينات الاجتماعية',
      'medical_insurance_expiry_warning': '⚠️ تحذير: التأمين الطبي ينتهي قريباً',
      'compliance_issue_alert': '🚨 تنبيه امتثال',
      'salary_update_confirmation': '💰 تم تحديث راتبك',
      'document_expiry_reminder': '📄 تذكير: وثيقة تنتهي صلاحيتها',
      'compliance_report_ready': '📊 تقرير الامتثال جاهز للعرض'
    };
    return subjects[type] || 'إشعار جديد';
  }

  _renderTemplate(type, data) {
    const template = this.templates[type];
    if (!template) return 'إشعار جديد';

    let message = template;
    Object.keys(data).forEach(key => {
      message = message.replace(`{{${key}}}`, data[key]);
    });
    return message;
  }

  _generateEmailHTML(notification) {
    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #003366; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f5f5f5; }
          .footer { background-color: #333; color: white; padding: 10px; text-align: center; font-size: 12px; }
          .action-btn { background-color: #003366; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${notification.subject}</h1>
          </div>
          <div class="content">
            <p>${notification.message}</p>
          </div>
          <div class="footer">
            <p>© 2026 نظام التأمينات الاجتماعية الذكي</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  _getTemplateGOSIRegistration() {
    return `تم تسجيل بيانات التأمينات الاجتماعية بنجاح
رقم التأمينات: {{gosiNumber}}
الراتب الخاضع للاشتراك: {{salary}} SAR
تاريخ البدء: {{startDate}}
اشتراك صاحب العمل: {{employerContribution}}
اشتراك الموظف: {{employeeContribution}}`;
  }

  _getTemplateMedicalExpiry() {
    return `تحذير: التأمين الطبي ينتهي خلال {{daysRemaining}} أيام
رقم البوليصة: {{policyNumber}}
تاريخ الانتهاء: {{expiryDate}}
الإجراء المطلوب: {{renewalInstructions}}`;
  }

  _getTemplateComplianceAlert() {
    return `تنبيه امتثال:
المشكلة: {{issue}}
مستوى الخطورة: {{severity}}
الإجراء المطلوب: {{action}}
الموعد النهائي: {{deadline}}`;
  }

  _getTemplateSalaryUpdate() {
    return `تم تحديث راتبك
الراتب السابق: {{previousSalary}} SAR
الراتب الجديد: {{newSalary}} SAR
الزيادة: {{increase}} SAR
التاريخ الفعال: {{effectiveDate}}`;
  }

  _getTemplateDocumentReminder() {
    return `تذكير: وثيقة تنتهي صلاحيتها
الوثيقة: {{documentName}}
تاريخ الانتهاء: {{expiryDate}}
الأيام المتبقية: {{daysRemaining}}`;
  }

  _getTemplateReportReady() {
    return `تقرير الامتثال جاهزللعرض
نوع التقرير: {{reportType}}
الفترة: {{period}}
حالة الامتثال: {{complianceStatus}}`;
  }
}

module.exports = new GOSINotificationService();
