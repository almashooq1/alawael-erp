/**
 * ═══════════════════════════════════════════════════════════════
 * ⚙️ User Notification Preferences Manager
 * مدير تفضيلات الإشعارات للمستخدمين
 * ═══════════════════════════════════════════════════════════════
 *
 * نظام متقدم لإدارة تفضيلات الإشعارات:
 * - القنوات المفضلة
 * - ساعات العمل والراحة
 * - حدود التكرار (Rate Limiting)
 * - الفئات والأنواع المفضلة
 * - إعدادات الخصوصية والأمان
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════
// 📋 نموذج تفضيلات الإشعارات
// ═══════════════════════════════════════════════════════════════

const notificationPreferencesSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  // القنوات المفعلة
  channels: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    inApp: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    dashboard: { type: Boolean, default: true },
  },

  // معلومات الاتصال
  contactInfo: {
    email: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    whatsappNumber: { type: String, default: null },
    language: { type: String, enum: ['ar', 'en'], default: 'ar' },
  },

  // حدود التكرار
  rateLimits: {
    emailPerDay: { type: Number, default: 50 },
    smsPerDay: { type: Number, default: 10 },
    whatsappPerDay: { type: Number, default: 20 },
    pushPerDay: { type: Number, default: 30 },
    totalPerDay: { type: Number, default: 100 },
  },

  // ساعات العمل (لتجنب الإزعاج)
  quietHours: {
    enabled: { type: Boolean, default: false },
    startTime: String, // "22:00"
    endTime: String, // "08:00"
    timezone: { type: String, default: 'Asia/Riyadh' },
    daysOff: [String], // ["friday", "saturday"]
  },

  // تفضيلات الفئات
  categoryPreferences: {
    system: { type: Boolean, default: true },
    business: { type: Boolean, default: true },
    transaction: { type: Boolean, default: true },
    security: { type: Boolean, default: true },
    reminder: { type: Boolean, default: true },
    warning: { type: Boolean, default: true },
    success: { type: Boolean, default: true },
    error: { type: Boolean, default: true },
  },

  // تفضيلات الأولوية
  priorityPreferences: {
    low: { type: Boolean, default: true },
    medium: { type: Boolean, default: true },
    high: { type: Boolean, default: true },
    critical: { type: Boolean, default: true },
  },

  // إعدادات الصوت والاهتزاز
  soundAndVibration: {
    enableSound: { type: Boolean, default: true },
    soundType: {
      type: String,
      enum: ['default', 'bell', 'chime', 'alert', 'none'],
      default: 'default',
    },
    enableVibration: { type: Boolean, default: true },
    vibrationPattern: {
      type: String,
      enum: ['normal', 'strong', 'light', 'silent'],
      default: 'normal',
    },
  },

  // إعدادات الخصوصية
  privacy: {
    doNotTrack: { type: Boolean, default: false },
    doNotShare: { type: Boolean, default: false },
    allowAnalytics: { type: Boolean, default: true },
    dataRetentionDays: { type: Number, default: 90 },
  },

  // قائمة الحظر (Blacklist)
  blacklist: {
    categories: [String],
    senders: [String],
    keywords: [String],
  },

  // قائمة البيضاء (Whitelist)
  whitelist: {
    senders: [String],
    trustedDevices: [String],
  },

  // الإحصائيات
  statistics: {
    totalNotificationsReceived: { type: Number, default: 0 },
    totalNotificationsRead: { type: Number, default: 0 },
    avgReadTime: { type: Number, default: 0 }, // ثواني
    lastUpdated: { type: Date, default: Date.now },
  },

  // التنبيهات المجمعة
  digestPreferences: {
    enableDigest: { type: Boolean, default: false },
    digestFrequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly'],
      default: 'daily',
    },
    digestTime: String, // "09:00"
  },

  // إعدادات التنبيهات الذكية
  smartNotifications: {
    adaptive: { type: Boolean, default: true },
    predictiveDelivery: { type: Boolean, default: true },
    contextualGrouping: { type: Boolean, default: true },
  },

  // موافقة المستخدم
  consents: {
    marketingEmails: { type: Boolean, default: false },
    transactionalEmails: { type: Boolean, default: true },
    analyticsTracking: { type: Boolean, default: false },
    consentDate: Date,
  },

  // التحكم والحالة
  isActive: { type: Boolean, default: true },
  suspendedUntil: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastModifiedBy: String,
  notes: String,
});

// فهرسة لتحسين الأداء
notificationPreferencesSchema.index({ userId: 1 });
notificationPreferencesSchema.index({ isActive: 1 });

const NotificationPreferences = mongoose.model(
  'NotificationPreferences',
  notificationPreferencesSchema
);

// ═══════════════════════════════════════════════════════════════
// 🎯 مدير التفضيلات
// ═══════════════════════════════════════════════════════════════

class UserPreferencesManager extends EventEmitter {
  constructor() {
    super();

    // ذاكرة التخزين المؤقت للتفضيلات
    this.cache = new Map();
    this.cacheTimeout = 1800000; // 30 دقيقة
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📖 جلب التفضيلات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على تفضيلات المستخدم
   */
  async getPreferences(userId) {
    try {
      // البحث في الذاكرة المؤقتة
      if (this.cache.has(userId)) {
        return this.cache.get(userId);
      }

      // البحث في قاعدة البيانات
      let preferences = await NotificationPreferences.findOne({
        userId,
      }).exec();

      // إنشاء تفضيلات افتراضية إذا لم تكن موجودة
      if (!preferences) {
        preferences = await this.createDefaultPreferences(userId);
      }

      // إضافة إلى الذاكرة المؤقتة
      this.cache.set(userId, preferences);

      // تحديد وقت انتهاء الصلاحية
      setTimeout(() => this.cache.delete(userId), this.cacheTimeout);

      return preferences;
    } catch (error) {
      logger.error(`❌ خطأ في جلب التفضيلات: ${error.message}`);
      throw error;
    }
  }

  /**
   * إنشاء تفضيلات افتراضية
   */
  async createDefaultPreferences(userId) {
    try {
      const preferences = new NotificationPreferences({
        userId,
      });

      const savedPreferences = await preferences.save();
      logger.info(`✅ تم إنشاء تفضيلات افتراضية للمستخدم: ${userId}`);

      return savedPreferences;
    } catch (error) {
      logger.error(`❌ خطأ في إنشاء التفضيلات الافتراضية: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🔧 تحديث التفضيلات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تحديث تفضيلات المستخدم
   */
  async updatePreferences(userId, updates) {
    try {
      const updatedPreferences = await NotificationPreferences.findOneAndUpdate(
        { userId },
        {
          ...updates,
          updatedAt: new Date(),
        },
        { new: true, upsert: true }
      ).exec();

      // تحديث الذاكرة المؤقتة
      this.cache.delete(userId);

      this.emit('preferencesUpdated', { userId, updates });

      logger.info(`✅ تم تحديث التفضيلات: ${userId}`);

      return updatedPreferences;
    } catch (error) {
      logger.error(`❌ خطأ في تحديث التفضيلات: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث القنوات المفعلة
   */
  async updateChannels(userId, channels) {
    try {
      return await this.updatePreferences(userId, { channels });
    } catch (error) {
      logger.error(`❌ خطأ في تحديث القنوات: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث معلومات الاتصال
   */
  async updateContactInfo(userId, contactInfo) {
    try {
      return await this.updatePreferences(userId, { contactInfo });
    } catch (error) {
      logger.error(`❌ خطأ في تحديث معلومات الاتصال: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث ساعات الراحة
   */
  async updateQuietHours(userId, quietHours) {
    try {
      return await this.updatePreferences(userId, { quietHours });
    } catch (error) {
      logger.error(`❌ خطأ في تحديث ساعات الراحة: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث حدود التكرار
   */
  async updateRateLimits(userId, rateLimits) {
    try {
      return await this.updatePreferences(userId, { rateLimits });
    } catch (error) {
      logger.error(`❌ خطأ في تحديث حدود التكرار: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث تفضيلات الفئات
   */
  async updateCategoryPreferences(userId, categoryPreferences) {
    try {
      return await this.updatePreferences(userId, { categoryPreferences });
    } catch (error) {
      logger.error(`❌ خطأ في تحديث تفضيلات الفئات: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🔍 التحقق من التفضيلات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * التحقق من إمكانية إرسال الإشعار
   */
  async canSendNotification(userId, notificationData) {
    try {
      const preferences = await this.getPreferences(userId);

      // التحقق من حالة التفعيل
      if (!preferences.isActive) {
        return { allowed: false, reason: 'User notifications disabled' };
      }

      // التحقق من التعليق المؤقت
      if (preferences.suspendedUntil && new Date() < preferences.suspendedUntil) {
        return { allowed: false, reason: 'Notifications temporarily suspended' };
      }

      // التحقق من القناة
      const channel = notificationData.channel;
      if (channel && !preferences.channels[channel]) {
        return { allowed: false, reason: `Channel ${channel} disabled` };
      }

      // التحقق من الفئة
      const category = notificationData.category;
      if (category && !preferences.categoryPreferences[category]) {
        return { allowed: false, reason: `Category ${category} disabled` };
      }

      // التحقق من الأولوية
      const priority = notificationData.priority || 'medium';
      if (!preferences.priorityPreferences[priority]) {
        return { allowed: false, reason: `Priority ${priority} disabled` };
      }

      // التحقق من قائمة الحظر
      if (this.isBlacklisted(notificationData, preferences)) {
        return { allowed: false, reason: 'Notification is blacklisted' };
      }

      // التحقق من ساعات الراحة
      if (!this.isWithinActiveHours(preferences)) {
        return { allowed: false, reason: 'Outside active hours' };
      }

      // التحقق من حدود التكرار
      if (!(await this.checkRateLimit(userId, channel, preferences))) {
        return { allowed: false, reason: 'Rate limit exceeded' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error(`❌ خطأ في التحقق من التفضيلات: ${error.message}`);
      throw error;
    }
  }

  /**
   * التحقق من قائمة الحظر
   */
  isBlacklisted(notificationData, preferences) {
    const blacklist = preferences.blacklist;

    // التحقق من الفئات المحظورة
    if (blacklist.categories.includes(notificationData.category)) {
      return true;
    }

    // التحقق من المرسلين المحظورين
    if (blacklist.senders.includes(notificationData.sender)) {
      return true;
    }

    // التحقق من الكلمات المحظورة
    const fullText = `${notificationData.title} ${notificationData.body}`.toLowerCase();
    if (blacklist.keywords.some(keyword => fullText.includes(keyword.toLowerCase()))) {
      return true;
    }

    return false;
  }

  /**
   * التحقق من ساعات العمل
   */
  isWithinActiveHours(preferences) {
    if (!preferences.quietHours.enabled) {
      return true;
    }

    const now = new Date();
    const day = now.toLocaleString('en-US', { weekday: 'lowercase' });

    // التحقق من أيام الراحة
    if (preferences.quietHours.daysOff.includes(day)) {
      return false;
    }

    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const startTime = preferences.quietHours.startTime;
    const endTime = preferences.quietHours.endTime;

    // التحقق من الفترة الزمنية
    if (startTime <= endTime) {
      return currentTime < startTime || currentTime >= endTime;
    } else {
      return currentTime < startTime && currentTime >= endTime;
    }
  }

  /**
   * التحقق من حدود التكرار
   */
  async checkRateLimit(userId, channel, preferences) {
    try {
      // هذا يتطلب نظام تتبع يومي للإشعارات المرسلة
      // يمكن تنفيذه باستخدام Redis أو قاعدة بيانات

      // مثال بسيط:
      const limit = preferences.rateLimits[`${channel}PerDay`];

      if (!limit) {
        return true; // لا يوجد حد
      }

      // يتطلب تنفيذ عداد يومي
      // return sentToday < limit;

      return true; // للآن
    } catch (error) {
      logger.error(`❌ خطأ في التحقق من حدود التكرار: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🛡️ إدارة قوائم الحظر والبيضاء
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إضافة إلى قائمة الحظر
   */
  async addToBlacklist(userId, type, value) {
    try {
      const preferences = await this.getPreferences(userId);

      if (!preferences.blacklist[type]) {
        preferences.blacklist[type] = [];
      }

      if (!preferences.blacklist[type].includes(value)) {
        preferences.blacklist[type].push(value);
        await preferences.save();
        this.cache.delete(userId);
      }

      return preferences;
    } catch (error) {
      logger.error(`❌ خطأ في إضافة إلى قائمة الحظر: ${error.message}`);
      throw error;
    }
  }

  /**
   * إزالة من قائمة الحظر
   */
  async removeFromBlacklist(userId, type, value) {
    try {
      const preferences = await this.getPreferences(userId);

      if (preferences.blacklist[type]) {
        preferences.blacklist[type] = preferences.blacklist[type].filter(item => item !== value);
        await preferences.save();
        this.cache.delete(userId);
      }

      return preferences;
    } catch (error) {
      logger.error(`❌ خطأ في إزالة من قائمة الحظر: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * ⏸️ التعليق والإلغاء
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تعليق الإشعارات مؤقتاً
   */
  async suspendNotifications(userId, hours = 1) {
    try {
      const suspendedUntil = new Date(Date.now() + hours * 3600000);

      return await this.updatePreferences(userId, { suspendedUntil });
    } catch (error) {
      logger.error(`❌ خطأ في تعليق الإشعارات: ${error.message}`);
      throw error;
    }
  }

  /**
   * إلغاء التعليق
   */
  async resumeNotifications(userId) {
    try {
      return await this.updatePreferences(userId, { suspendedUntil: null });
    } catch (error) {
      logger.error(`❌ خطأ في إلغاء التعليق: ${error.message}`);
      throw error;
    }
  }

  /**
   * تعطيل جميع الإشعارات
   */
  async disableAllNotifications(userId) {
    try {
      return await this.updatePreferences(userId, { isActive: false });
    } catch (error) {
      logger.error(`❌ خطأ في تعطيل الإشعارات: ${error.message}`);
      throw error;
    }
  }

  /**
   * تفعيل جميع الإشعارات
   */
  async enableAllNotifications(userId) {
    try {
      return await this.updatePreferences(userId, { isActive: true });
    } catch (error) {
      logger.error(`❌ خطأ في تفعيل الإشعارات: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📊 الإحصائيات والتقارير
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تحديث الإحصائيات
   */
  async updateStatistics(userId, readTime = 0) {
    try {
      const preferences = await this.getPreferences(userId);

      preferences.statistics.totalNotificationsReceived++;
      preferences.statistics.totalNotificationsRead++;
      preferences.statistics.lastUpdated = new Date();

      // حساب متوسط وقت القراءة
      if (readTime > 0) {
        const total =
          preferences.statistics.avgReadTime * (preferences.statistics.totalNotificationsRead - 1) +
          readTime;
        preferences.statistics.avgReadTime = total / preferences.statistics.totalNotificationsRead;
      }

      await preferences.save();
      this.cache.delete(userId);

      return preferences.statistics;
    } catch (error) {
      logger.error(`❌ خطأ في تحديث الإحصائيات: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على الإحصائيات
   */
  async getStatistics(userId) {
    try {
      const preferences = await this.getPreferences(userId);
      return preferences.statistics;
    } catch (error) {
      logger.error(`❌ خطأ في جلب الإحصائيات: ${error.message}`);
      throw error;
    }
  }

  /**
   * مسح الذاكرة المؤقتة
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`🗑️ تم مسح الذاكرة المؤقتة (${size} مستخدم)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📦 التصدير
// ═══════════════════════════════════════════════════════════════

module.exports = {
  UserPreferencesManager,
  NotificationPreferences,
  preferencesManager: new UserPreferencesManager(),
};
