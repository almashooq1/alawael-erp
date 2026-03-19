/**
 * ═══════════════════════════════════════════════════════════════
 * 🔔 Unified Notification Manager
 * مدير الإشعارات الموحد الشامل والذكي
 * ═══════════════════════════════════════════════════════════════
 * 
 * نظام متكامل لإدارة الإشعارات عبر أنوات متعددة:
 * - البريد الإلكتروني (Email)
 * - رسائل نصية (SMS)
 * - الواتس آب (WhatsApp)
 * - التنبيهات الفورية (In-App)
 * - إشعارات التطبيق (Push Notifications)
 * - لوحة التحكم (Dashboard)
 */

const EventEmitter = require('events');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
let twilio;
try {
  twilio = require('twilio');
} catch (e) {
  console.warn('⚠️  Twilio module not installed. SMS via Twilio will be unavailable.');
}
const logger = require('../utils/logger');
const whatsappService = require('./whatsappNotificationService');

// ═══════════════════════════════════════════════════════════════
// 📋 نموذج الإشعار
// ═══════════════════════════════════════════════════════════════

const notificationSchema = new mongoose.Schema({
  // معلومات أساسية
  id: { type: String, unique: true },
  userId: { type: String, required: true },
  type: {
    type: String,
    enum: [
      'alert',      // تنبيه
      'reminder',   // تذكير
      'notification', // إشعار
      'warning',    // تحذير
      'critical',   // حرج
      'info',       // معلومة
    ],
    default: 'notification',
  },

  // المحتوى
  title: {
    en: String,
    ar: String,
  },
  body: {
    en: String,
    ar: String,
  },
  category: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },

  // قنوات الإرسال
  channels: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
    push: { type: Boolean, default: false },
    dashboard: { type: Boolean, default: true },
  },

  // حالة الإرسال
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sent', 'failed', 'read', 'archived'],
    default: 'draft',
    index: true,
  },

  // معلومات الجهات المتعلقة
  relatedData: {
    entityType: String,     // نوع الكائن المرتبط
    entityId: String,       // معرف الكائن
    actionUrl: String,      // رابط الإجراء
  },

  // التواريخ
  createdAt: { type: Date, default: Date.now, index: true },
  scheduledAt: Date,
  sentAt: Date,
  readAt: Date,
  expiresAt: Date,

  // التتبع
  deliveryStatus: {
    email: {
      sent: Boolean,
      sentAt: Date,
      error: String,
    },
    sms: {
      sent: Boolean,
      sentAt: Date,
      messageId: String,
      error: String,
    },
    whatsapp: {
      sent: Boolean,
      sentAt: Date,
      messageId: String,
      error: String,
    },
    inApp: {
      sent: Boolean,
      sentAt: Date,
    },
    push: {
      sent: Boolean,
      sentAt: Date,
      error: String,
    },
    dashboard: {
      sent: Boolean,
      sentAt: Date,
    },
  },

  // البيانات الإضافية
  metadata: mongoose.Schema.Types.Mixed,
  tags: [String],

  // الأداء
  rate: Number, // تقييم المستخدم (1-5)
  ratedAt: Date,
  feedback: String,
});

// إنشاء فهرسة مركبة لتحسين الأداء
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, status: 1 });
notificationSchema.index({ userId: 1, category: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

// ═══════════════════════════════════════════════════════════════
// 🎯 مدير الإشعارات الموحد
// ═══════════════════════════════════════════════════════════════

class UnifiedNotificationManager extends EventEmitter {
  constructor(config = {}) {
    super();

    // الإعدادات
    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 50,
      ...config,
    };

    // البريد الإلكتروني
    this.emailTransporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    // Twilio للرسائل النصية
    this.twilioClient = null;
    if (twilio && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // قائمة الانتظار
    this.queue = [];
    this.isProcessing = false;

    // الإحصائيات
    this.stats = {
      total: 0,
      sent: 0,
      failed: 0,
      channelStats: {
        email: { sent: 0, failed: 0 },
        sms: { sent: 0, failed: 0 },
        whatsapp: { sent: 0, failed: 0 },
        inApp: { sent: 0, failed: 0 },
        push: { sent: 0, failed: 0 },
        dashboard: { sent: 0, failed: 0 },
      },
    };

    this.startQueueProcessor();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📤 إرسال الإشعارات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إرسال إشعار موحد
   */
  async sendNotification(userId, notificationData) {
    try {
      // التحقق من المدخلات
      if (!userId || !notificationData) {
        throw new Error('معلومات الإشعار غير كاملة');
      }

      // إنشاء الإشعار
      const notification = new Notification({
        id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        ...notificationData,
      });

      // حفظ في قاعدة البيانات
      const savedNotification = await notification.save();

      // إضافة إلى قائمة الانتظار
      this.queue.push({
        notification: savedNotification,
        retries: 0,
      });

      // إطلاق حدث
      this.emit('notificationCreated', savedNotification);

      logger.info(`📬 إشعار موحد مضاف إلى قائمة الانتظار: ${userId}`);

      return savedNotification;
    } catch (error) {
      logger.error(`❌ خطأ في إرسال الإشعار: ${error.message}`);
      this.emit('notificationError', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * إرسال إشعار فوري (حالي)
   */
  async sendImmediateNotification(userId, notificationData) {
    try {
      const notification = new Notification({
        id: `insta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId,
        status: 'sent',
        ...notificationData,
      });

      const savedNotification = await notification.save();

      // محاولة الإرسال الفوري عبر جميع القنوات
      await this.deliverNotification(savedNotification);

      this.emit('immediateNotificationSent', savedNotification);

      return savedNotification;
    } catch (error) {
      logger.error(`❌ خطأ في الإرسال الفوري: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال إشعارات جماعية
   */
  async sendBulkNotifications(userIds, notificationTemplate) {
    try {
      const results = [];

      for (const userId of userIds) {
        try {
          const result = await this.sendNotification(userId, notificationTemplate);
          results.push({ userId, status: 'queued', id: result.id });
        } catch (error) {
          results.push({ userId, status: 'failed', error: error.message });
        }
      }

      logger.info(`📬 ${results.filter(r => r.status === 'queued').length} إشعار جماعي أضيف إلى قائمة الانتظار`);

      return results;
    } catch (error) {
      logger.error(`❌ خطأ في الإرسال الجماعي: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🚚 تسليم الإشعارات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * معالج قائمة الانتظار
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (!this.isProcessing && this.queue.length > 0) {
        await this.processQueue();
      }
    }, 1000);

    logger.info('▶️ معالج قائمة انتظار الإشعارات نشط');
  }

  /**
   * معالجة قائمة الانتظار
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.queue.splice(0, this.config.batchSize);

      for (const item of batch) {
        try {
          await this.deliverNotification(item.notification);
        } catch (error) {
          item.retries++;

          if (item.retries < this.config.maxRetries) {
            // إعادة محاولة
            setTimeout(
              () => this.queue.push(item),
              this.config.retryDelay * item.retries
            );
          } else {
            // فشل نهائي
            await Notification.updateOne(
              { id: item.notification.id },
              { status: 'failed' }
            );

            logger.error(`❌ فشل الإشعار بعد ${item.retries} محاولات: ${item.notification.id}`);
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * تسليم الإشعار عبر القنوات المختارة
   */
  async deliverNotification(notification) {
    const deliveryPromises = [];

    // البريد الإلكتروني
    if (notification.channels.email) {
      deliveryPromises.push(
        this.sendEmailNotification(notification).catch(err => ({
          channel: 'email',
          error: err,
        }))
      );
    }

    // الواتس آب
    if (notification.channels.whatsapp) {
      deliveryPromises.push(
        this.sendWhatsAppNotification(notification).catch(err => ({
          channel: 'whatsapp',
          error: err,
        }))
      );
    }

    // الرسائل النصية
    if (notification.channels.sms) {
      deliveryPromises.push(
        this.sendSMSNotification(notification).catch(err => ({
          channel: 'sms',
          error: err,
        }))
      );
    }

    // الإشعارات الفورية
    if (notification.channels.inApp) {
      deliveryPromises.push(
        this.sendInAppNotification(notification).catch(err => ({
          channel: 'inApp',
          error: err,
        }))
      );
    }

    // إشعارات التطبيق
    if (notification.channels.push) {
      deliveryPromises.push(
        this.sendPushNotification(notification).catch(err => ({
          channel: 'push',
          error: err,
        }))
      );
    }

    // لوحة التحكم
    if (notification.channels.dashboard) {
      deliveryPromises.push(
        this.sendDashboardNotification(notification).catch(err => ({
          channel: 'dashboard',
          error: err,
        }))
      );
    }

    // انتظار جميع الإرسالات
    const results = await Promise.allSettled(deliveryPromises);

    // تحديث حالة الإشعار
    notification.status = 'sent';
    notification.sentAt = new Date();

    await notification.save();

    this.emit('notificationDelivered', notification);

    logger.info(`✅ تم تسليم الإشعار: ${notification.id}`);
  }

  /**
   * إرسال عبر البريد الإلكتروني
   */
  async sendEmailNotification(notification) {
    try {
      // الحصول على بيانات المستخدم (يجب استدعاء قاعدة البيانات)
      // const user = await User.findById(notification.userId);

      const htmlContent = this.buildEmailTemplate(notification);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: notification.metadata?.email || 'user@example.com',
        subject: notification.title?.ar || notification.title?.en,
        html: htmlContent,
      };

      await this.emailTransporter.sendMail(mailOptions);

      // تحديث حالة البريد الإلكتروني
      await Notification.updateOne(
        { id: notification.id },
        {
          'deliveryStatus.email.sent': true,
          'deliveryStatus.email.sentAt': new Date(),
        }
      );

      this.stats.channelStats.email.sent++;

      logger.info(`📧 بريد إلكتروني مرسل: ${notification.userId}`);
    } catch (error) {
      this.stats.channelStats.email.failed++;
      logger.error(`❌ خطأ في إرسال البريد الإلكتروني: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال عبر الواتس آب
   */
  async sendWhatsAppNotification(notification) {
    try {
      const phoneNumber = notification.metadata?.phoneNumber;

      if (!phoneNumber) {
        throw new Error('رقم الهاتف غير متوفر');
      }

      const message = this.buildWhatsAppMessage(notification);

      await whatsappService.sendMessage(phoneNumber, message);

      // تحديث حالة الواتس آب
      await Notification.updateOne(
        { id: notification.id },
        {
          'deliveryStatus.whatsapp.sent': true,
          'deliveryStatus.whatsapp.sentAt': new Date(),
        }
      );

      this.stats.channelStats.whatsapp.sent++;

      logger.info(`💬 رسالة واتس آب مرسلة: ${phoneNumber}`);
    } catch (error) {
      this.stats.channelStats.whatsapp.failed++;
      logger.error(`❌ خطأ في إرسال الواتس آب: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال رسالة نصية
   */
  async sendSMSNotification(notification) {
    try {
      // تحقق من توفر Twilio
      if (!this.twilioClient) {
        logger.warn('⚠️ Twilio client not configured. SMS notification skipped.');
        this.stats.channelStats.sms.skipped = (this.stats.channelStats.sms.skipped || 0) + 1;
        return { success: false, message: 'Twilio not configured' };
      }

      const phoneNumber = notification.metadata?.phoneNumber;

      if (!phoneNumber) {
        throw new Error('رقم الهاتف غير متوفر');
      }

      const message = (notification.body?.ar || notification.body?.en || '').substring(0, 160);

      const smsMessage = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      // تحديث حالة الرسالة النصية
      await Notification.updateOne(
        { id: notification.id },
        {
          'deliveryStatus.sms.sent': true,
          'deliveryStatus.sms.sentAt': new Date(),
          'deliveryStatus.sms.messageId': smsMessage.sid,
        }
      );

      this.stats.channelStats.sms.sent++;

      logger.info(`📱 رسالة نصية مرسلة: ${phoneNumber}`);
    } catch (error) {
      this.stats.channelStats.sms.failed++;
      logger.error(`❌ خطأ في إرسال الرسالة النصية: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال إشعار فوري
   */
  async sendInAppNotification(notification) {
    try {
      // الإشعار الفوري يُخزن في قاعدة البيانات ويُعرض مباشرة للمستخدم
      // في الواجهة الأمامية عند الاتصال بـ API

      await Notification.updateOne(
        { id: notification.id },
        {
          'deliveryStatus.inApp.sent': true,
          'deliveryStatus.inApp.sentAt': new Date(),
        }
      );

      this.stats.channelStats.inApp.sent++;

      logger.info(`🔔 إشعار فوري للمستخدم: ${notification.userId}`);

      // بث الإشعار عبر WebSocket (اختياري)
      this.emit('inAppNotification', {
        userId: notification.userId,
        notification,
      });
    } catch (error) {
      this.stats.channelStats.inApp.failed++;
      throw error;
    }
  }

  /**
   * إرسال إشعار التطبيق
   */
  async sendPushNotification(notification) {
    try {
      // تنفيذ مع Firebase Cloud Messaging أو خدمة أخرى
      // هنا مثال على الهيكل فقط

      await Notification.updateOne(
        { id: notification.id },
        {
          'deliveryStatus.push.sent': true,
          'deliveryStatus.push.sentAt': new Date(),
        }
      );

      this.stats.channelStats.push.sent++;

      logger.info(`📲 إشعار تطبيق مرسل: ${notification.userId}`);
    } catch (error) {
      this.stats.channelStats.push.failed++;
      throw error;
    }
  }

  /**
   * إرسال إلى لوحة التحكم
   */
  async sendDashboardNotification(notification) {
    try {
      await Notification.updateOne(
        { id: notification.id },
        {
          'deliveryStatus.dashboard.sent': true,
          'deliveryStatus.dashboard.sentAt': new Date(),
        }
      );

      this.stats.channelStats.dashboard.sent++;

      // بث إلى لوحة التحكم عبر WebSocket
      this.emit('dashboardNotification', {
        userId: notification.userId,
        notification,
      });

      logger.info(`📊 إشعار لوحة التحكم: ${notification.userId}`);
    } catch (error) {
      this.stats.channelStats.dashboard.failed++;
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📨 بناء قوالب الرسائل
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * بناء قالب البريد الإلكتروني
   */
  buildEmailTemplate(notification) {
    const lang = notification.metadata?.language || 'ar';
    const title = notification.title?.[lang] || notification.title?.en || '';
    const body = notification.body?.[lang] || notification.body?.en || '';

    const isArabic = lang === 'ar';
    const direction = isArabic ? 'rtl' : 'ltr';

    return `
      <!DOCTYPE html>
      <html dir="${direction}">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .footer { background-color: #e9ecef; padding: 10px; border-radius: 0 0 5px 5px; font-size: 12px; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${title}</h2>
          </div>
          <div class="content">
            <p>${body}</p>
            ${notification.relatedData?.actionUrl ? `
              <a href="${notification.relatedData.actionUrl}" class="button">
                ${isArabic ? 'عرض التفاصيل' : 'View Details'}
              </a>
            ` : ''}
          </div>
          <div class="footer">
            <p>${isArabic ? 'هذا بريد تلقائي، يرجى عدم الرد عليه' : 'This is an automated email, please do not reply'}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * بناء رسالة الواتس آب
   */
  buildWhatsAppMessage(notification) {
    const lang = notification.metadata?.language || 'ar';
    const title = notification.title?.[lang] || notification.title?.en || '';
    const body = notification.body?.[lang] || notification.body?.en || '';

    const prefix = this.getNotificationEmoji(notification.type);

    return `${prefix} *${title}*\n\n${body}`;
  }

  /**
   * الحصول على الرموز التعبيرية
   */
  getNotificationEmoji(type) {
    const emojis = {
      alert: '🚨',
      reminder: '⏰',
      notification: '📢',
      warning: '⚠️',
      critical: '🔴',
      info: 'ℹ️',
    };

    return emojis[type] || '📢';
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📊 الإحصائيات والتقارير
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على الإحصائيات
   */
  getStatistics() {
    return {
      total: this.stats.total,
      sent: this.stats.sent,
      failed: this.stats.failed,
      successRate: this.stats.total > 0
        ? ((this.stats.sent / this.stats.total) * 100).toFixed(2) + '%'
        : '0%',
      channelStats: this.stats.channelStats,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * الحصول على إشعارات المستخدم
   */
  async getUserNotifications(userId, filters = {}) {
    try {
      const query = { userId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.type) {
        query.type = filters.type;
      }

      if (filters.category) {
        query.category = filters.category;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(filters.limit || 50)
        .exec();

      return notifications;
    } catch (error) {
      logger.error(`❌ خطأ في جلب الإشعارات: ${error.message}`);
      throw error;
    }
  }

  /**
   * وضع علامة على الإشعار كمقروء
   */
  async markAsRead(notificationId) {
    try {
      const result = await Notification.updateOne(
        { id: notificationId },
        {
          status: 'read',
          readAt: new Date(),
        }
      );

      return result;
    } catch (error) {
      logger.error(`❌ خطأ في وضع علامة المقروء: ${error.message}`);
      throw error;
    }
  }

  /**
   * حذف الإشعار
   */
  async deleteNotification(notificationId) {
    try {
      return await Notification.deleteOne({ id: notificationId });
    } catch (error) {
      logger.error(`❌ خطأ في حذف الإشعار: ${error.message}`);
      throw error;
    }
  }

  /**
   * تقييم الإشعار
   */
  async rateNotification(notificationId, rating, feedback = '') {
    try {
      return await Notification.updateOne(
        { id: notificationId },
        {
          rate: Math.min(5, Math.max(1, rating)),
          feedback,
          ratedAt: new Date(),
        }
      );
    } catch (error) {
      logger.error(`❌ خطأ في تقييم الإشعار: ${error.message}`);
      throw error;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 📦 التصدير
// ═══════════════════════════════════════════════════════════════

module.exports = {
  UnifiedNotificationManager,
  Notification,
  notificationManager: new UnifiedNotificationManager(),
};
