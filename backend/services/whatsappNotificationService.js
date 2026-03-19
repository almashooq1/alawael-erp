/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * 📱 WhatsApp Notification Service
 * خدمة الإشعارات والتنبيهات عبر الواتس آب
 * ═══════════════════════════════════════════════════════════════
 *
 * متقدمة وشاملة وذكية لإرسال الرسائل والتنبيهات عبر الواتس آب
 * - دعم النصوص والصور والملفات
 * - نظام قوالب ذكية
 * - معالجة الأخطاء والإعادة التلقائية
 * - تتبع حالة الرسائل
 */

const axios = require('axios');
const EventEmitter = require('events');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// ✅ WhatsApp Notification Service
// ═══════════════════════════════════════════════════════════════

class WhatsAppNotificationService extends EventEmitter {
  constructor(config = {}) {
    super();

    // القائمة البيضاء (Whitelist) من أرقام الهاتف
    this.whitelist = new Set();

    // إعدادات الاتصال بـ WhatsApp API
    this.apiConfig = {
      baseURL: process.env.WHATSAPP_API_URL || 'https://api.whatsapp.com/send',
      token: process.env.WHATSAPP_API_TOKEN || process.env.WHATSAPP_TOKEN,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v18.0',
    };

    // خوادم WhatsApp الموثوقة
    this.whatsappProviders = {
      official: {
        baseURL: 'https://graph.facebook.com',
        version: 'v18.0',
      },
      twilio: {
        baseURL: 'https://api.twilio.com',
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
      },
      messagebird: {
        baseURL: 'https://messages-sandbox.nexmo.com',
        token: process.env.MESSAGEBIRD_API_KEY,
      },
    };

    // إعدادات المقدم النشط
    this.provider = process.env.WHATSAPP_PROVIDER || 'official';

    // قائمة الرسائل المرسلة (للتتبع)
    this.messageHistory = [];
    this.maxHistory = 1000;

    // معدل التحديد (Rate Limiting)
    this.rateLimit = {
      messagesPerMinute: parseInt(process.env.WHATSAPP_RATE_LIMIT || '60'),
      messagesPerHour: parseInt(process.env.WHATSAPP_RATE_LIMIT_HOUR || '1000'),
      messagesSent: [],
    };

    // مخزن مؤقت لإعادة المحاولات
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 ثواني

    // قوائم الانتظار
    this.messageQueue = [];
    this.isProcessing = false;

    this.initializeProvider();
    // Guard: don't start queue processor in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.startQueueProcessor();
    }
  }

  /**
   * تهيئة المقدم المختار
   */
  initializeProvider() {
    logger.info(`🔄 Initializing WhatsApp provider: ${this.provider}`);

    switch (this.provider) {
      case 'twilio':
        this.setupTwilioProvider();
        break;
      case 'messagebird':
        this.setupMessageBirdProvider();
        break;
      default:
        this.setupOfficialProvider();
    }
  }

  /**
   * إعداد مقدم WhatsApp الرسمي
   */
  setupOfficialProvider() {
    this.client = axios.create({
      baseURL: `${this.whatsappProviders.official.baseURL}/${this.whatsappProviders.official.version}/${this.apiConfig.phoneNumberId}`,
      headers: {
        Authorization: `Bearer ${this.apiConfig.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    logger.info('✅ WhatsApp Official Provider initialized');
  }

  /**
   * إعداد مقدم Twilio
   */
  setupTwilioProvider() {
    try {
      const twilio = require('twilio');
      this.twilioClient = twilio(
        this.whatsappProviders.twilio.accountSid,
        this.whatsappProviders.twilio.authToken
      );
      logger.info('✅ Twilio WhatsApp Provider initialized');
    } catch (error) {
      logger.warn('⚠️ Twilio module not available. Falling back to Official Provider.');
      this.provider = 'official';
      this.setupOfficialProvider();
    }
  }

  /**
   * إعداد مقدم MessageBird
   */
  setupMessageBirdProvider() {
    this.client = axios.create({
      baseURL: this.whatsappProviders.messagebird.baseURL,
      headers: {
        Authorization: `Bearer ${this.whatsappProviders.messagebird.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    logger.info('✅ MessageBird WhatsApp Provider initialized');
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📨 إرسال الرسائل
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إرسال رسالة نصية
   */
  async sendMessage(phoneNumber, message, options = {}) {
    try {
      // التحقق من صحة رقم الهاتف
      if (!this.isValidPhoneNumber(phoneNumber)) {
        throw new Error(`رقم الهاتف غير صحيح: ${phoneNumber}`);
      }

      // التحقق من قائمة بيضاء (اختياري)
      if (process.env.WHATSAPP_WHITELIST_ONLY === 'true') {
        if (!this.whitelist.has(phoneNumber)) {
          logger.warn(`📱 رقم الهاتف غير مدرج في القائمة البيضاء: ${phoneNumber}`);
          throw new Error('رقم الهاتف غير مصرح به');
        }
      }

      // التحقق من معدل التحديد
      if (!this.checkRateLimit()) {
        logger.warn('⚠️ تم تجاوز حد معدل الرسائل');
        throw new Error('تم تجاوز حد معدل الرسائل. يرجى المحاولة لاحقاً');
      }

      const messageData = {
        phoneNumber: this.normalizePhoneNumber(phoneNumber),
        message: this.sanitizeMessage(message),
        timestamp: new Date(),
        status: 'pending',
        retries: 0,
        ...options,
      };

      // إضافة إلى قائمة الانتظار
      this.messageQueue.push(messageData);

      // إرسال حدث
      this.emit('messageQueued', messageData);

      logger.info(`📝 الرسالة مضافة إلى قائمة الانتظار: ${phoneNumber}`);

      return messageData;
    } catch (error) {
      logger.error(`❌ خطأ في إرسال الرسالة: ${error.message}`);
      this.emit('messageSendError', { phoneNumber, error: 'حدث خطأ داخلي' });
      throw error;
    }
  }

  /**
   * إرسال رسالة مع صورة
   */
  async sendImageMessage(phoneNumber, imageUrl, caption = '', options = {}) {
    try {
      if (!this.isValidURL(imageUrl)) {
        throw new Error('رابط الصورة غير صحيح');
      }

      const messageData = {
        type: 'image',
        phoneNumber: this.normalizePhoneNumber(phoneNumber),
        media: imageUrl,
        caption: this.sanitizeMessage(caption),
        timestamp: new Date(),
        status: 'pending',
        retries: 0,
        ...options,
      };

      this.messageQueue.push(messageData);
      this.emit('messageQueued', messageData);

      logger.info(`🖼️ رسالة صورة مضافة إلى قائمة الانتظار: ${phoneNumber}`);

      return messageData;
    } catch (error) {
      logger.error(`❌ خطأ في إرسال رسالة الصورة: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال رسالة مع ملف
   */
  async sendDocumentMessage(phoneNumber, fileUrl, fileName = '', options = {}) {
    try {
      if (!this.isValidURL(fileUrl)) {
        throw new Error('رابط الملف غير صحيح');
      }

      const messageData = {
        type: 'document',
        phoneNumber: this.normalizePhoneNumber(phoneNumber),
        media: fileUrl,
        fileName: fileName || 'document',
        timestamp: new Date(),
        status: 'pending',
        retries: 0,
        ...options,
      };

      this.messageQueue.push(messageData);
      this.emit('messageQueued', messageData);

      logger.info(`📄 رسالة ملف مضافة إلى قائمة الانتظار: ${phoneNumber}`);

      return messageData;
    } catch (error) {
      logger.error(`❌ خطأ في إرسال رسالة الملف: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال رسالة تفاعلية (أزرار)
   */
  async sendInteractiveMessage(phoneNumber, message, buttons, options = {}) {
    try {
      if (!Array.isArray(buttons) || buttons.length === 0) {
        throw new Error('يجب توفير زر واحد على الأقل');
      }

      if (buttons.length > 3) {
        throw new Error('الحد الأقصى للأزرار هو 3');
      }

      const messageData = {
        type: 'interactive',
        phoneNumber: this.normalizePhoneNumber(phoneNumber),
        message: this.sanitizeMessage(message),
        buttons: buttons.map((btn, idx) => ({
          id: btn.id || `btn_${idx}`,
          title: btn.title,
          description: btn.description || '',
        })),
        timestamp: new Date(),
        status: 'pending',
        retries: 0,
        ...options,
      };

      this.messageQueue.push(messageData);
      this.emit('messageQueued', messageData);

      logger.info(`🔘 رسالة تفاعلية مضافة إلى قائمة الانتظار: ${phoneNumber}`);

      return messageData;
    } catch (error) {
      logger.error(`❌ خطأ في إرسال الرسالة التفاعلية: ${error.message}`);
      throw error;
    }
  }

  /**
   * إرسال رسائل جماعية
   */
  async sendBulkMessages(phoneNumbers, message, options = {}) {
    try {
      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error('يجب توفير قائمة أرقام الهاتف');
      }

      const results = [];

      for (const phoneNumber of phoneNumbers) {
        try {
          const result = await this.sendMessage(phoneNumber, message, options);
          results.push({
            phoneNumber,
            status: 'queued',
            id: result.id,
          });
        } catch (error) {
          results.push({
            phoneNumber,
            status: 'failed',
            error: 'حدث خطأ داخلي',
          });
        }
      }

      logger.info(
        `📬 تم إضافة ${results.filter(r => r.status === 'queued').length} رسالة جماعية إلى قائمة الانتظار`
      );

      return results;
    } catch (error) {
      logger.error(`❌ خطأ في الإرسال الجماعي: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * ⚙️ معالجة قائمة الانتظار
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * بدء معالج قائمة الانتظار
   */
  startQueueProcessor() {
    setInterval(() => {
      if (!this.isProcessing && this.messageQueue.length > 0) {
        this.processQueue();
      }
    }, 1000);

    logger.info('▶️ معالج قائمة الانتظار نشط');
  }

  /**
   * معالجة قائمة الانتظار
   */
  async processQueue() {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();

        try {
          const result = await this.deliverMessage(message);
          message.status = 'sent';
          message.id = result.id;
          message.sentAt = new Date();

          this.addToHistory(message);
          this.emit('messageSent', message);

          logger.info(`✅ رسالة مرسلة إلى ${message.phoneNumber}`);

          // تأخير صغير لتجنب الازدحام
          await this.delay(100);
        } catch (error) {
          message.retries = (message.retries || 0) + 1;

          if (message.retries >= this.maxRetries) {
            message.status = 'failed';
            message.error = 'حدث خطأ داخلي';
            this.addToHistory(message);
            this.emit('messageFailed', message);

            logger.error(`❌ فشل الإرسال بعد ${this.maxRetries} محاولات: ${message.phoneNumber}`);
          } else {
            // إعادة المحاولة
            this.retryQueue.push({
              message,
              retryAt: Date.now() + this.retryDelay * message.retries,
            });

            logger.warn(
              `⚠️ إعادة محاولة الإرسال (${message.retries}/${this.maxRetries}): ${message.phoneNumber}`
            );
          }
        }
      }

      // معالجة قائمة إعادة المحاولات
      await this.processRetryQueue();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * معالجة قائمة إعادة المحاولات
   */
  async processRetryQueue() {
    const now = Date.now();
    const readyRetries = this.retryQueue.filter(r => r.retryAt <= now);

    readyRetries.forEach(retry => {
      this.messageQueue.push(retry.message);
      this.retryQueue = this.retryQueue.filter(r => r !== retry);
    });
  }

  /**
   * تسليم الرسالة الفعلي
   */
  async deliverMessage(messageData) {
    try {
      switch (this.provider) {
        case 'twilio':
          return await this.sendViaTwilio(messageData);
        case 'messagebird':
          return await this.sendViaMessageBird(messageData);
        default:
          return await this.sendViaOfficial(messageData);
      }
    } catch (error) {
      logger.error(`❌ خطأ في التسليم: ${error.message}`);
      throw error;
    }
  }

  /**
   * الإرسال عبر WhatsApp الرسمي
   */
  async sendViaOfficial(messageData) {
    try {
      let payload;

      switch (messageData.type) {
        case 'image':
          payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: messageData.phoneNumber,
            type: 'image',
            image: {
              link: messageData.media,
            },
          };
          break;

        case 'document':
          payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: messageData.phoneNumber,
            type: 'document',
            document: {
              link: messageData.media,
              filename: messageData.fileName,
            },
          };
          break;

        case 'interactive':
          payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: messageData.phoneNumber,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: {
                text: messageData.message,
              },
              action: {
                buttons: messageData.buttons.map((btn, idx) => ({
                  type: 'reply',
                  reply: {
                    id: btn.id,
                    title: btn.title,
                  },
                })),
              },
            },
          };
          break;

        default:
          payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: messageData.phoneNumber,
            type: 'text',
            text: {
              preview_url: true,
              body: messageData.message,
            },
          };
      }

      const response = await this.client.post('/messages', payload);

      return {
        id: response.data.messages[0].id,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  /**
   * الإرسال عبر Twilio
   */
  async sendViaTwilio(messageData) {
    try {
      let message;

      switch (messageData.type) {
        case 'image':
          message = await this.twilioClient.messages.create({
            from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
            mediaUrl: [messageData.media],
            body: messageData.caption || '',
            to: 'whatsapp:' + messageData.phoneNumber,
          });
          break;

        default:
          message = await this.twilioClient.messages.create({
            from: 'whatsapp:' + process.env.TWILIO_WHATSAPP_NUMBER,
            body: messageData.message || messageData.caption,
            to: 'whatsapp:' + messageData.phoneNumber,
          });
      }

      return {
        id: message.sid,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  /**
   * الإرسال عبر MessageBird
   */
  async sendViaMessageBird(messageData) {
    try {
      const payload = {
        to: messageData.phoneNumber,
        from: process.env.MESSAGEBIRD_WHATSAPP_CHANNEL_ID,
        type: messageData.type || 'text',
        content: {
          text: messageData.message,
        },
      };

      const response = await this.client.post('/send', payload);

      return {
        id: response.data.id,
        status: 'sent',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error('حدث خطأ داخلي');
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🛠️ الأدوات المساعدة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * التحقق من صحة رقم الهاتف
   */
  isValidPhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  /**
   * تطبيع رقم الهاتف
   */
  normalizePhoneNumber(phoneNumber) {
    let cleaned = phoneNumber.replace(/\D/g, '');

    // إزالة الأصفار البادئة
    if (cleaned.startsWith('00')) {
      cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // إضافة كود المملكة السعودية إذا لم يكن موجوداً
    if (!cleaned.startsWith('966')) {
      if (cleaned.startsWith('5')) {
        cleaned = '966' + cleaned;
      }
    }

    return cleaned;
  }

  /**
   * تنظيف الرسالة
   */
  sanitizeMessage(message) {
    return (
      String(message)
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .trim()
        .substring(0, 4096)
    );
  }

  /**
   * التحقق من صحة الرابط
   */
  isValidURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * التحقق من معدل التحديد
   */
  checkRateLimit() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const oneHourAgo = now - 3600000;

    // تنظيف الرسائل القديمة
    this.rateLimit.messagesSent = this.rateLimit.messagesSent.filter(time => time > oneHourAgo);

    // التحقق من حد الدقيقة
    const lastMinute = this.rateLimit.messagesSent.filter(time => time > oneMinuteAgo).length;

    if (lastMinute >= this.rateLimit.messagesPerMinute) {
      return false;
    }

    // التحقق من حد الساعة
    if (this.rateLimit.messagesSent.length >= this.rateLimit.messagesPerHour) {
      return false;
    }

    this.rateLimit.messagesSent.push(now);
    return true;
  }

  /**
   * إضافة رسالة إلى السجل
   */
  addToHistory(message) {
    this.messageHistory.push({
      id: message.id || `msg_${Date.now()}`,
      phoneNumber: message.phoneNumber,
      type: message.type || 'text',
      status: message.status,
      sentAt: message.sentAt || new Date(),
      retries: message.retries || 0,
    });

    // الحفاظ على حد أقصى
    if (this.messageHistory.length > this.maxHistory) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistory);
    }
  }

  /**
   * تأخير
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📊 الإحصائيات والمراقبة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على إحصائيات الرسائل
   */
  getStatistics() {
    const total = this.messageHistory.length;
    const sent = this.messageHistory.filter(m => m.status === 'sent').length;
    const failed = this.messageHistory.filter(m => m.status === 'failed').length;
    const pending = this.messageQueue.length;

    return {
      total,
      sent,
      failed,
      pending,
      successRate: total > 0 ? ((sent / total) * 100).toFixed(2) + '%' : '0%',
      queueLength: pending,
      queueProcessing: this.isProcessing,
    };
  }

  /**
   * الحصول على سجل الرسائل
   */
  getHistory(limit = 50) {
    return this.messageHistory.slice(-limit);
  }

  /**
   * مسح السجل
   */
  clearHistory() {
    this.messageHistory = [];
    logger.info('🗑️ تم مسح سجل الرسائل');
  }

  /**
   * إضافة رقم إلى القائمة البيضاء
   */
  addToWhitelist(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    this.whitelist.add(normalized);
    logger.info(`✅ تم إضافة ${normalized} إلى القائمة البيضاء`);
  }

  /**
   * إزالة رقم من القائمة البيضاء
   */
  removeFromWhitelist(phoneNumber) {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    this.whitelist.delete(normalized);
    logger.info(`❌ تم إزالة ${normalized} من القائمة البيضاء`);
  }

  /**
   * الحصول على القائمة البيضاء
   */
  getWhitelist() {
    return Array.from(this.whitelist);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📦 التصدير
// ═══════════════════════════════════════════════════════════════

module.exports = new WhatsAppNotificationService();
