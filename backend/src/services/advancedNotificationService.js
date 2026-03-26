/**
 * Advanced Notification System
 * نظام الإشعارات المتقدم
 * يدعم SMS, Email, Push Notifications, In-App
 */

const nodemailer = require('nodemailer');
const twilio = require('twilio');
const admin = require('firebase-admin');
const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../../utils/logger');

/**
 * Escape HTML special characters to prevent injection in email templates
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

class AdvancedNotificationService extends EventEmitter {
  constructor() {
    super();
    this.setupProviders();
    this.templates = this.initializeTemplates();
    this.queue = [];
    this.retryMap = new Map();
  }

  // ====== إعداد مزودي الخدمات ======

  setupProviders() {
    // إعداد Twilio للـ SMS
    this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    // إعداد Nodemailer للـ Email
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // إعداد Firebase للـ Push Notifications
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_CREDENTIALS || '{}')),
      });
    }
  }

  // ====== تعريف القوالب ======

  initializeTemplates() {
    return {
      // قوالب تنبيهات الحوادث
      accidentAlert: {
        title: 'تنبيه حادث محتمل',
        description: data =>
          `السائق ${data.driverName} قد يكون في خطر. درجة المخاطرة: ${data.riskScore}%`,
        priority: 'high',
        icon: '⚠️',
      },

      // قوالب تنبيهات الصيانة
      maintenanceAlert: {
        title: 'صيانة مطلوبة',
        description: data =>
          `المركبة ${data.vehicleNumber} تحتاج صيانة. متوقعة خلال ${data.days} أيام`,
        priority: 'medium',
        icon: '🔧',
      },

      // قوالب تنبيهات السلامة
      safetyAlert: {
        title: 'تنبيه سلامة',
        description: data => `تم اكتشاف ${data.violationType} بواسطة ${data.driverName}`,
        priority: 'high',
        icon: '🚨',
      },

      // قوالب تنبيهات الوقود
      fuelAlert: {
        title: 'تحذير الوقود',
        description: data => `وقود المركبة ${data.vehicleNumber} منخفض: ${data.fuelLevel}%`,
        priority: 'medium',
        icon: '⛽',
      },

      // قوالب تنبيهات الموقع
      locationAlert: {
        title: 'تنبيه الموقع',
        description: data => `المركبة ${data.vehicleNumber} خارج المسار المخطط`,
        priority: 'low',
        icon: '📍',
      },

      // قوالب التقارير اليومية
      dailyReport: {
        title: 'التقرير اليومي',
        description: data => `${data.vehiclesActive} مركبات نشطة، ${data.alerts} تنبيهات`,
        priority: 'low',
        icon: '📊',
      },

      // قوالب التنبيهات المخصصة
      customAlert: {
        title: data => data.customTitle,
        description: data => data.customMessage,
        priority: 'medium',
        icon: '📬',
      },
    };
  }

  // ====== إرسال الإشعارات ======

  async sendNotification(recipient, notification) {
    /**
     * recipient = {
     *   userId: string,
     *   email: string,
     *   phone: string,
     *   fcmToken: string,
     *   notificationPreferences: {
     *     sms: boolean,
     *     email: boolean,
     *     push: boolean,
     *     inApp: boolean
     *   }
     * }
     *
     * notification = {
     *   type: string,
     *   data: object,
     *   priority: 'high'|'medium'|'low',
     *   channels: ['sms', 'email', 'push', 'inApp']
     * }
     */

    const template = this.templates[notification.type];
    if (!template) {
      throw new Error(`قالب الإشعار ${notification.type} غير موجود`);
    }

    const notificationData = {
      id: this.generateNotificationId(),
      type: notification.type,
      title:
        typeof template.title === 'function' ? template.title(notification.data) : template.title,
      message:
        typeof template.description === 'function'
          ? template.description(notification.data)
          : template.description,
      priority: notification.priority || template.priority,
      timestamp: new Date(),
      read: false,
      channels: notification.channels || [],
    };

    // حفظ في قاعدة البيانات
    await this.saveNotification(recipient.userId, notificationData);

    // إرسال عبر القنوات المختارة
    const channels =
      notification.channels ||
      Object.keys(recipient.notificationPreferences).filter(
        key => recipient.notificationPreferences[key]
      );

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'sms':
            await this.sendSMS(recipient.phone, notificationData);
            break;
          case 'email':
            await this.sendEmail(recipient.email, notificationData);
            break;
          case 'push':
            await this.sendPushNotification(recipient.fcmToken, notificationData);
            break;
          case 'inApp':
            await this.sendInAppNotification(recipient.userId, notificationData);
            break;
        }
      } catch (error) {
        logger.error(`خطأ في إرسال ${channel}:`, error);
        await this.addToRetryQueue(recipient, notificationData, channel);
      }
    }

    return notificationData;
  }

  // ====== إرسال SMS ======

  async sendSMS(phoneNumber, notification) {
    if (!phoneNumber) {
      throw new Error('رقم الهاتف مطلوب');
    }

    const message = `${notification.title}\n${notification.message}`;

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: this.formatPhoneNumber(phoneNumber),
      });

      logger.info(`تم إرسال SMS برقم: ${result.sid}`);

      return {
        status: 'sent',
        messageId: result.sid,
        channel: 'sms',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('خطأ في إرسال SMS:', error);
      throw error;
    }
  }

  // ====== إرسال Email ======

  async sendEmail(email, notification) {
    if (!email) {
      throw new Error('عنوان البريد الإلكتروني مطلوب');
    }

    const htmlContent = this.generateEmailTemplate(notification);

    try {
      const result = await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: notification.title,
        html: htmlContent,
        priority: notification.priority === 'high' ? 'high' : 'normal',
      });

      logger.info(`تم إرسال البريد برقم: ${result.messageId}`);

      return {
        status: 'sent',
        messageId: result.messageId,
        channel: 'email',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('خطأ في إرسال البريد:', error);
      throw error;
    }
  }

  // ====== إرسال Push Notification ======

  async sendPushNotification(fcmToken, notification) {
    if (!fcmToken) {
      throw new Error('رمز Firebase مطلوب');
    }

    const message = {
      token: fcmToken,
      notification: {
        title: notification.title,
        body: notification.message,
        imageUrl: this.getIconUrl(notification.priority),
      },
      data: {
        type: notification.type,
        priority: notification.priority,
        timestamp: notification.timestamp.toString(),
        notificationId: notification.id,
      },
      android: {
        priority: notification.priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          channelId: 'fleet_alerts',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.message,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const result = await admin.messaging().send(message);
      logger.info(`تم إرسال Push برقم: ${result}`);

      return {
        status: 'sent',
        messageId: result,
        channel: 'push',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('خطأ في إرسال Push:', error);
      throw error;
    }
  }

  // ====== الإشعارات داخل التطبيق ======

  async sendInAppNotification(userId, notification) {
    // تخزين في قاعدة البيانات وإرسال عبر WebSocket
    const inAppNotification = {
      userId,
      ...notification,
      delivered: true,
      deliveredAt: new Date(),
    };

    // حفظ في قاعدة البيانات
    try {
      const NotificationModel = mongoose.model('Notification');
      await NotificationModel.create(inAppNotification);

      // بث عبر WebSocket
      this.emit('in_app_notification', {
        userId,
        notification: inAppNotification,
      });

      return {
        status: 'delivered',
        channel: 'inApp',
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('خطأ في الإشعار داخل التطبيق:', error);
      throw error;
    }
  }

  // ====== الإشعارات الفورية (Direct Alerts) ======

  async sendDirectAlert(recipients, alertData) {
    /**
     * إرسال تنبيه فوري لعدة مستقبلين
     * تستخدم هذه في حالة الطوارئ الحرجة
     */

    const alerts = [];

    for (const recipient of recipients) {
      try {
        // إرسال عبر جميع القنوات المتاحة
        const alert = await this.sendNotification(recipient, {
          type: 'customAlert',
          data: alertData,
          priority: 'high',
          channels: ['sms', 'email', 'push', 'inApp'],
        });

        alerts.push({
          recipient: recipient.userId,
          status: 'sent',
          notificationId: alert.id,
        });
      } catch (error) {
        alerts.push({
          recipient: recipient.userId,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return alerts;
  }

  // ====== التقارير المجدولة ======

  async scheduleReport(userId, reportType, schedule) {
    /**
     * reportType: 'daily', 'weekly', 'monthly'
     * schedule: { time: '08:00', days: [1,2,3,4,5] }
     */

    const schedule_entry = {
      userId,
      reportType,
      schedule,
      enabled: true,
      createdAt: new Date(),
      nextRun: this.calculateNextRun(schedule),
    };

    try {
      const ScheduleModel = mongoose.model('NotificationSchedule');
      await ScheduleModel.create(schedule_entry);

      logger.info(`تم جدولة التقرير ${reportType}`);
      return schedule_entry;
    } catch (error) {
      logger.error('خطأ في جدولة التقرير:', error);
      throw error;
    }
  }

  // ====== طلب الإشعارات ======

  async getNotifications(userId, options = {}) {
    /**
     * options = {
     *   limit: 10,
     *   offset: 0,
     *   unreadOnly: false,
     *   type: null,
     *   startDate: null,
     *   endDate: null
     * }
     */

    try {
      const NotificationModel = mongoose.model('Notification');
      const query = { userId };

      if (options.unreadOnly) {
        query.read = false;
      }

      if (options.type) {
        query.type = options.type;
      }

      if (options.startDate || options.endDate) {
        query.timestamp = {};
        if (options.startDate) query.timestamp.$gte = new Date(options.startDate);
        if (options.endDate) query.timestamp.$lte = new Date(options.endDate);
      }

      const notifications = await NotificationModel.find(query)
        .sort({ timestamp: -1 })
        .limit(options.limit || 10)
        .skip(options.offset || 0)
        .exec();

      const total = await NotificationModel.countDocuments(query);

      return {
        notifications,
        total,
        limit: options.limit || 10,
        offset: options.offset || 0,
      };
    } catch (error) {
      logger.error('خطأ في جلب الإشعارات:', error);
      throw error;
    }
  }

  // ====== تحديث حالة الإشعار ======

  async markAsRead(notificationId) {
    try {
      const NotificationModel = mongoose.model('Notification');
      await NotificationModel.findByIdAndUpdate(notificationId, {
        read: true,
        readAt: new Date(),
      });

      return { status: 'updated', notificationId };
    } catch (error) {
      logger.error('خطأ في تحديث الإشعار:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      const NotificationModel = mongoose.model('Notification');
      await NotificationModel.updateMany(
        { userId, read: false },
        {
          read: true,
          readAt: new Date(),
        }
      );

      logger.info(`تم تحديث جميع إشعارات المستخدم ${userId}`);
    } catch (error) {
      logger.error('خطأ:', error);
      throw error;
    }
  }

  // ====== حذف الإشعارات ======

  async deleteNotification(notificationId) {
    try {
      const NotificationModel = mongoose.model('Notification');
      await NotificationModel.findByIdAndDelete(notificationId);
      return { status: 'deleted', notificationId };
    } catch (error) {
      logger.error('خطأ في حذف الإشعار:', error);
      throw error;
    }
  }

  async clearOldNotifications(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
      const NotificationModel = mongoose.model('Notification');
      const result = await NotificationModel.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      logger.info(`تم حذف ${result.deletedCount} إشعار قديم`);
      return result;
    } catch (error) {
      logger.error('خطأ في حذف الإشعارات القديمة:', error);
      throw error;
    }
  }

  // ====== إدارة الوائم والإعادة ======

  async addToRetryQueue(recipient, notification, channel) {
    const queueItem = {
      recipient,
      notification,
      channel,
      timestamp: new Date(),
      retryCount: 0,
      maxRetries: 3,
    };

    this.queue.push(queueItem);

    // محاولة الإرسال كل 5 دقائق
    setTimeout(() => this.retryFailedNotification(queueItem), 5 * 60 * 1000);
  }

  async retryFailedNotification(queueItem) {
    if (queueItem.retryCount >= queueItem.maxRetries) {
      logger.warn(`تم تجاوز عدد محاولات الإرسال لـ ${queueItem.channel}`);
      return;
    }

    try {
      queueItem.retryCount++;

      switch (queueItem.channel) {
        case 'sms':
          await this.sendSMS(queueItem.recipient.phone, queueItem.notification);
          break;
        case 'email':
          await this.sendEmail(queueItem.recipient.email, queueItem.notification);
          break;
        case 'push':
          await this.sendPushNotification(queueItem.recipient.fcmToken, queueItem.notification);
          break;
      }

      logger.info(`نجحت المحاولة الثانية للإرسال عبر ${queueItem.channel}`);
    } catch (error) {
      if (queueItem.retryCount < queueItem.maxRetries) {
        setTimeout(() => this.retryFailedNotification(queueItem), 5 * 60 * 1000);
      }
    }
  }

  // ====== دوال مساعدة ======

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  formatPhoneNumber(phone) {
    // تنسيق رقم الهاتف للاستخدام مع Twilio
    return phone.replace(/\D/g, '');
  }

  generateEmailTemplate(notification) {
    return `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; }
          .priority-high { color: #e74c3c; font-weight: bold; }
          .timestamp { color: #7f8c8d; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${escapeHtml(notification.title)}</h2>
          </div>
          <div class="content">
            <p>${escapeHtml(notification.message)}</p>
            <p class="${notification.priority === 'high' ? 'priority-high' : ''}">
              الأولوية: ${escapeHtml(this.getPriorityLabel(notification.priority))}
            </p>
            <p class="timestamp">
              ${notification.timestamp.toLocaleString('ar-SA')}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPriorityLabel(priority) {
    const labels = {
      high: 'عالية',
      medium: 'متوسطة',
      low: 'منخفضة',
    };
    return labels[priority] || priority;
  }

  getIconUrl(priority) {
    const icons = {
      high: 'https://cdn-icons-png.flaticon.com/512/1779/1779807.png',
      medium: 'https://cdn-icons-png.flaticon.com/512/929/929509.png',
      low: 'https://cdn-icons-png.flaticon.com/512/892/892617.png',
    };
    return icons[priority] || icons.medium;
  }

  calculateNextRun(schedule) {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    const nextRun = new Date();
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    return nextRun;
  }

  async saveNotification(userId, notification) {
    try {
      const NotificationModel = mongoose.model('Notification');
      return await NotificationModel.create({
        userId,
        ...notification,
      });
    } catch (error) {
      logger.error('خطأ في حفظ الإشعار:', error);
      throw error;
    }
  }
}

module.exports = AdvancedNotificationService;
