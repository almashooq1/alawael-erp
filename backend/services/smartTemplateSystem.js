/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * 📋 Smart Notification Templates System
 * نظام القوالب الذكية للإشعارات والتنبيهات
 * ═══════════════════════════════════════════════════════════════
 *
 * نظام قوالب متقدم وذكي مع:
 * - دعم اللغات المتعددة (العربية والإنجليزية)
 * - متغيرات ديناميكية
 * - إعادة استخدام وتخزين مؤقت
 * - تصنيفات منظمة
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════
// 📋 نموذج القالب
// ═══════════════════════════════════════════════════════════════

const templateSchema = new mongoose.Schema({
  // معلومات أساسية
  templateId: { type: String, unique: true, index: true },
  name: String,
  category: {
    type: String,
    enum: [
      'system', // تنبيهات النظام
      'business', // إشعارات الأعمال
      'transaction', // إشعارات المعاملات
      'security', // تنبيهات الأمان
      'reminder', // التذكيرات
      'warning', // التحذيرات
      'success', // رسائل النجاح
      'error', // رسائل الخطأ
      'custom', // مخصص
    ],
    default: 'custom',
  },

  // المحتوى متعدد اللغات
  content: {
    ar: {
      title: { type: String, required: true },
      body: { type: String, required: true },
      shortBody: String,
      actionText: String,
    },
    en: {
      title: { type: String, required: true },
      body: { type: String, required: true },
      shortBody: String,
      actionText: String,
    },
  },

  // المتغيرات المدعومة
  variables: [String], // مثل: {{user_name}}, {{amount}}, {{date}}
  requiredVariables: [String],

  // الإعدادات
  settings: {
    channels: [String], // ['email', 'sms', 'whatsapp', 'inApp', 'push']
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    maxRetries: { type: Number, default: 3 },
    expiryDays: Number,
    silent: { type: Boolean, default: false },
  },

  // البيانات الوصفية
  metadata: {
    icon: String,
    color: String,
    sound: String,
    vibration: { type: Boolean, default: true },
  },

  // الأداء والتتبع
  usage: {
    count: { type: Number, default: 0 },
    successRate: { type: Number, default: 0 },
    lastUsed: Date,
  },

  // التحكم
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: String,
  tags: [String],
});

const Template = mongoose.model('NotificationTemplate', templateSchema);

// ═══════════════════════════════════════════════════════════════
// 🎯 نظام القوالب الذكية
// ═══════════════════════════════════════════════════════════════

class SmartTemplateSystem {
  constructor() {
    // ذاكرة التخزين المؤقت
    this.cache = new Map();
    this.cacheTimeout = 3600000; // ساعة واحدة

    // القوالب المدمجة
    this.builtInTemplates = this.initializeBuiltInTemplates();

    // تحميل القوالب المدمجة إلى الذاكرة المؤقتة
    this.loadBuiltInTemplates();
  }

  /**
   * تهيئة القوالب المدمجة
   */
  initializeBuiltInTemplates() {
    return {
      // تنبيهات النظام
      SYSTEM_ALERT: {
        name: 'System Alert',
        category: 'system',
        content: {
          ar: {
            title: 'تنبيه نظام',
            body: 'تم اكتشاف {{alert_type}} في النظام. التفاصيل: {{details}}',
            shortBody: 'تنبيه: {{alert_type}}',
            actionText: 'عرض التفاصيل',
          },
          en: {
            title: 'System Alert',
            body: 'A {{alert_type}} has been detected in the system. Details: {{details}}',
            shortBody: 'Alert: {{alert_type}}',
            actionText: 'View Details',
          },
        },
        variables: ['alert_type', 'details'],
        requiredVariables: ['alert_type'],
        settings: {
          channels: ['email', 'inApp', 'push'],
          priority: 'high',
          maxRetries: 3,
        },
      },

      // إشعارات المعاملات
      TRANSACTION_SUCCESS: {
        name: 'Transaction Success',
        category: 'transaction',
        content: {
          ar: {
            title: '✅ تمت العملية بنجاح',
            body: 'تم إكمال معاملتك برقم {{transaction_id}}. المبلغ: {{amount}} {{currency}}. التاريخ: {{date}}',
            shortBody: 'معاملة ناجحة: {{amount}}',
            actionText: 'عرض الفاتورة',
          },
          en: {
            title: '✅ Transaction Completed',
            body: 'Your transaction {{transaction_id}} has been completed. Amount: {{amount}} {{currency}}. Date: {{date}}',
            shortBody: 'Success: {{amount}}',
            actionText: 'View Receipt',
          },
        },
        variables: ['transaction_id', 'amount', 'currency', 'date'],
        requiredVariables: ['transaction_id', 'amount'],
        settings: {
          channels: ['email', 'sms', 'whatsapp', 'inApp'],
          priority: 'medium',
          maxRetries: 3,
        },
      },

      // تنبيهات الأمان
      SECURITY_WARNING: {
        name: 'Security Warning',
        category: 'security',
        content: {
          ar: {
            title: '⚠️ تنبيه أمان',
            body: 'تم اكتشاف محاولة {{threat_type}} في حسابك. إذا لم تقم بهذا الإجراء، يرجى تغيير كلمة المرور الآن.',
            shortBody: 'تحذير أمان: {{threat_type}}',
            actionText: 'تغيير كلمة المرور',
          },
          en: {
            title: '⚠️ Security Warning',
            body: "A {{threat_type}} attempt was detected on your account. If this wasn't you, please change your password immediately.",
            shortBody: 'Security Alert: {{threat_type}}',
            actionText: 'Change Password',
          },
        },
        variables: ['threat_type'],
        requiredVariables: ['threat_type'],
        settings: {
          channels: ['email', 'sms', 'whatsapp', 'inApp', 'push'],
          priority: 'critical',
          maxRetries: 5,
          silent: false,
        },
      },

      // التذكيرات
      REMINDER_UPCOMING: {
        name: 'Reminder - Upcoming Event',
        category: 'reminder',
        content: {
          ar: {
            title: '⏰ تذكير',
            body: 'تذكير: {{event_name}} سيبدأ {{time_until}}. {{event_details}}',
            shortBody: 'تذكير: {{event_name}}',
            actionText: 'عرض المزيد',
          },
          en: {
            title: '⏰ Reminder',
            body: 'Reminder: {{event_name}} starts {{time_until}}. {{event_details}}',
            shortBody: 'Reminder: {{event_name}}',
            actionText: 'Learn More',
          },
        },
        variables: ['event_name', 'time_until', 'event_details'],
        requiredVariables: ['event_name', 'time_until'],
        settings: {
          channels: ['email', 'inApp', 'push'],
          priority: 'medium',
          maxRetries: 2,
        },
      },

      // رسائل الخطأ
      ERROR_OPERATION_FAILED: {
        name: 'Operation Failed',
        category: 'error',
        content: {
          ar: {
            title: '❌ فشلت العملية',
            body: 'فشلت العملية: {{operation_name}}. الخطأ: {{error_message}}. يرجى المحاولة مرة أخرى أو التواصل مع الدعم.',
            shortBody: 'خطأ: {{operation_name}}',
            actionText: 'التواصل مع الدعم',
          },
          en: {
            title: '❌ Operation Failed',
            body: 'Operation {{operation_name}} failed. Error: {{error_message}}. Please try again or contact support.',
            shortBody: 'Error: {{operation_name}}',
            actionText: 'Contact Support',
          },
        },
        variables: ['operation_name', 'error_message'],
        requiredVariables: ['operation_name'],
        settings: {
          channels: ['email', 'inApp', 'push'],
          priority: 'high',
          maxRetries: 3,
        },
      },

      // رسائل النجاح
      SUCCESS_NOTIFICATION: {
        name: 'Success Notification',
        category: 'success',
        content: {
          ar: {
            title: '✅ نجحت العملية',
            body: '{{operation_name}} قد تمت بنجاح. {{additional_info}}',
            shortBody: 'نجاح: {{operation_name}}',
            actionText: 'عرض التفاصيل',
          },
          en: {
            title: '✅ Success',
            body: '{{operation_name}} has been completed successfully. {{additional_info}}',
            shortBody: 'Success: {{operation_name}}',
            actionText: 'View Details',
          },
        },
        variables: ['operation_name', 'additional_info'],
        requiredVariables: ['operation_name'],
        settings: {
          channels: ['email', 'inApp', 'push'],
          priority: 'low',
          maxRetries: 2,
        },
      },

      // تنبيهات الأعمال
      BUSINESS_UPDATE: {
        name: 'Business Update',
        category: 'business',
        content: {
          ar: {
            title: '📊 تحديث الأعمال',
            body: '{{update_title}}\n\nالتفاصيل: {{update_content}}\n\nالتاريخ: {{date}}',
            shortBody: '{{update_title}}',
            actionText: 'عرض التقرير',
          },
          en: {
            title: '📊 Business Update',
            body: '{{update_title}}\n\nDetails: {{update_content}}\n\nDate: {{date}}',
            shortBody: '{{update_title}}',
            actionText: 'View Report',
          },
        },
        variables: ['update_title', 'update_content', 'date'],
        requiredVariables: ['update_title'],
        settings: {
          channels: ['email', 'inApp', 'push'],
          priority: 'medium',
          maxRetries: 3,
        },
      },

      // تنبيهات التحذير
      WARNING_NOTICE: {
        name: 'Warning Notice',
        category: 'warning',
        content: {
          ar: {
            title: '⚠️ تنبيه',
            body: 'تنبيه: {{warning_message}}. الإجراء المطلوب: {{required_action}}.',
            shortBody: 'تنبيه: {{warning_message}}',
            actionText: 'اتخاذ إجراء',
          },
          en: {
            title: '⚠️ Warning',
            body: 'Warning: {{warning_message}}. Required action: {{required_action}}.',
            shortBody: 'Warning: {{warning_message}}',
            actionText: 'Take Action',
          },
        },
        variables: ['warning_message', 'required_action'],
        requiredVariables: ['warning_message'],
        settings: {
          channels: ['email', 'sms', 'inApp', 'push'],
          priority: 'high',
          maxRetries: 3,
        },
      },
    };
  }

  /**
   * تحميل القوالب المدمجة إلى الذاكرة المؤقتة
   */
  loadBuiltInTemplates() {
    Object.entries(this.builtInTemplates).forEach(([key, template]) => {
      this.cache.set(key, {
        ...template,
        templateId: key,
        isBuiltIn: true,
      });
    });

    logger.info(
      `✅ تم تحميل ${Object.keys(this.builtInTemplates).length} قالب مدمج إلى الذاكرة المؤقتة`
    );
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📋 إدارة القوالب
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على قالب
   */
  async getTemplate(templateId, language = 'ar') {
    try {
      // البحث في الذاكرة المؤقتة
      if (this.cache.has(templateId)) {
        return this.cache.get(templateId);
      }

      // البحث في قاعدة البيانات
      const template = await Template.findOne({
        templateId,
        isActive: true,
      }).exec();

      if (template) {
        // إضافة إلى الذاكرة المؤقتة
        this.cache.set(templateId, template);

        // تحديد وقت انتهاء الصلاحية
        setTimeout(() => this.cache.delete(templateId), this.cacheTimeout);
      }

      return template;
    } catch (error) {
      logger.error(`❌ خطأ في جلب القالب: ${error.message}`);
      throw error;
    }
  }

  /**
   * إنشاء قالب جديد
   */
  async createTemplate(templateData) {
    try {
      // التحقق من البيانات
      this.validateTemplateData(templateData);

      const template = new Template({
        templateId: `CUSTOM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...templateData,
      });

      const savedTemplate = await template.save();

      // إضافة إلى الذاكرة المؤقتة
      this.cache.set(savedTemplate.templateId, savedTemplate);

      logger.info(`✅ تم إنشاء قالب جديد: ${savedTemplate.templateId}`);

      return savedTemplate;
    } catch (error) {
      logger.error(`❌ خطأ في إنشاء القالب: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث قالب
   */
  async updateTemplate(templateId, updates) {
    try {
      const result = await Template.updateOne(
        { templateId },
        {
          ...updates,
          updatedAt: new Date(),
        }
      );

      // تحديث الذاكرة المؤقتة
      this.cache.delete(templateId);

      logger.info(`📝 تم تحديث القالب: ${templateId}`);

      return result;
    } catch (error) {
      logger.error(`❌ خطأ في تحديث القالب: ${error.message}`);
      throw error;
    }
  }

  /**
   * حذف قالب
   */
  async deleteTemplate(templateId) {
    try {
      const result = await Template.deleteOne({ templateId });

      // حذف من الذاكرة المؤقتة
      this.cache.delete(templateId);

      logger.info(`🗑️ تم حذف القالب: ${templateId}`);

      return result;
    } catch (error) {
      logger.error(`❌ خطأ في حذف القالب: ${error.message}`);
      throw error;
    }
  }

  /**
   * البحث عن القوالب
   */
  async searchTemplates(criteria = {}) {
    try {
      const query = {
        isActive: true,
        ...criteria,
      };

      const templates = await Template.find(query).exec();

      return templates;
    } catch (error) {
      logger.error(`❌ خطأ في البحث عن القوالب: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🔄 إنشاء الإشعار من القالب
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء إشعار من قالب
   */
  async createNotificationFromTemplate(templateId, variables = {}, language = 'ar') {
    try {
      // الحصول على القالب
      const template = await this.getTemplate(templateId, language);

      if (!template) {
        throw new Error(`القالب غير موجود: ${templateId}`);
      }

      // التحقق من المتغيرات المطلوبة
      const missing = template.requiredVariables.filter(variable => !variables[variable]);

      if (missing.length > 0) {
        throw new Error(`متغيرات مطلوبة مفقودة: ${missing.join(', ')}`);
      }

      // بناء الإشعار
      const notificationContent = this.buildNotificationContent(template, variables, language);

      return {
        title: notificationContent.title,
        body: notificationContent.body,
        shortBody: notificationContent.shortBody,
        actionText: notificationContent.actionText,
        type: template.category,
        channels: template.settings.channels,
        priority: template.settings.priority,
      };
    } catch (error) {
      logger.error(`❌ خطأ في إنشاء الإشعار من القالب: ${error.message}`);
      throw error;
    }
  }

  /**
   * بناء محتوى الإشعار
   */
  buildNotificationContent(template, variables, language = 'ar') {
    const templateContent = template.content[language] || template.content.en;

    return {
      title: this.replaceVariables(templateContent.title, variables),
      body: this.replaceVariables(templateContent.body, variables),
      shortBody: this.replaceVariables(templateContent.shortBody || '', variables),
      actionText: templateContent.actionText,
    };
  }

  /**
   * استبدال المتغيرات
   */
  replaceVariables(text, variables) {
    if (!text) return '';

    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return variables[variable] !== undefined ? String(variables[variable]) : match;
    });
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🛠️ الأدوات المساعدة والتحقق
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * التحقق من صحة بيانات القالب
   */
  validateTemplateData(templateData) {
    // التحقق من المحتوى العربي
    if (!templateData.content?.ar?.title || !templateData.content?.ar?.body) {
      throw new Error('المحتوى العربي مطلوب (title و body)');
    }

    // التحقق من المحتوى الإنجليزي
    if (!templateData.content?.en?.title || !templateData.content?.en?.body) {
      throw new Error('المحتوى الإنجليزي مطلوب (title و body)');
    }

    // التحقق من المتغيرات
    if (templateData.requiredVariables) {
      const allVariables = new Set([
        ...(templateData.variables || []),
        ...templateData.requiredVariables,
      ]);

      templateData.variables = Array.from(allVariables);
    }

    return true;
  }

  /**
   * الحصول على جميع القوالس المتاحة
   */
  async getAllTemplates(filters = {}) {
    try {
      const query = { isActive: true, ...filters };
      const templates = await Template.find(query).sort({ category: 1, name: 1 }).exec();

      return templates;
    } catch (error) {
      logger.error(`❌ خطأ في جلب جميع القوالب: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على القوالب حسب الفئة
   */
  async getTemplatesByCategory(category) {
    try {
      const templates = await Template.find({
        category,
        isActive: true,
      }).exec();

      return templates;
    } catch (error) {
      logger.error(`❌ خطأ في جلب القوالب حسب الفئة: ${error.message}`);
      throw error;
    }
  }

  /**
   * مسح الذاكرة المؤقتة
   */
  clearCache() {
    const size = this.cache.size;
    this.cache.clear();
    this.loadBuiltInTemplates();
    logger.info(`🗑️ تم مسح الذاكرة المؤقتة (${size} عنصر)`);
  }

  /**
   * الحصول على إحصائيات الذاكرة المؤقتة
   */
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      builtInTemplates: Object.keys(this.builtInTemplates).length,
      cacheTimeout: this.cacheTimeout / 1000 + 's',
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// 📦 التصدير
// ═══════════════════════════════════════════════════════════════

module.exports = {
  SmartTemplateSystem,
  Template,
  templateSystem: new SmartTemplateSystem(),
};
