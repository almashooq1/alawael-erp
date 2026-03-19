/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * 🎯 Advanced Alert Rules Engine
 * محرك القواعس المتقدمة للتنبيهات
 * ═══════════════════════════════════════════════════════════════
 *
 * نظام متقدم وذكي لإدارة قواعد التنبيهات:
 * - قواعس مرنة وقابلة للتخصيص
 * - تقييم الشروط المعقدة
 * - الإجراءات الذكية
 * - التسلسل والتجميع
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════
// 📋 نموذج قاعدة التنبيه
// ═══════════════════════════════════════════════════════════════

const alertRuleSchema = new mongoose.Schema({
  ruleId: { type: String, unique: true, index: true },
  name: { type: String, required: true },
  description: String,

  // التفعيل
  isActive: { type: Boolean, default: true, index: true },

  // شروط التفعيل (Conditions)
  conditions: {
    // نوع الحدث
    eventType: [String], // ['system_error', 'high_traffic', 'low_performance', ...]

    // مستوى الشدة
    severity: [String], // ['low', 'medium', 'high', 'critical']

    // مرشحات مخصصة
    customFilters: [
      {
        field: String, // اسم الحقل
        operator: String, // 'equals', 'contains', 'gt', 'lt', 'regex', ...
        value: mongoose.Schema.Types.Mixed,
        logicalOperator: String, // 'AND', 'OR'
      },
    ],

    // عدد التكرارات
    minOccurrences: { type: Number, default: 1 },
    timeWindow: Number, // بالثواني (5000 = 5 ثواني)

    // نطاق الوقت
    timeRange: {
      enabled: { type: Boolean, default: false },
      startTime: String, // "08:00"
      endTime: String, // "18:00"
    },

    // أيام محددة
    daysOfWeek: [String], // ['monday', 'tuesday', ...]
  },

  // الإجراءات (Actions)
  actions: {
    // إرسال إشعار
    notify: {
      enabled: { type: Boolean, default: true },
      channels: [String], // ['email', 'sms', 'whatsapp', ...]
      templateId: String,
      recipients: {
        userIds: [String],
        groups: [String],
        roles: [String],
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
    },

    // تنفيذ عملية
    executeAction: {
      enabled: { type: Boolean, default: false },
      actionType: String, // 'escalate', 'autofix', 'create_ticket', ...
      actionData: mongoose.Schema.Types.Mixed,
    },

    // تسجيل الحدث
    logEvent: {
      enabled: { type: Boolean, default: true },
      logLevel: { type: String, default: 'info' },
      includeDetails: { type: Boolean, default: true },
    },

    // استدعاء webhook
    webhook: {
      enabled: { type: Boolean, default: false },
      url: String,
      method: { type: String, default: 'POST' },
      headers: mongoose.Schema.Types.Mixed,
      payload: mongoose.Schema.Types.Mixed,
    },

    // تشغيل وظيفة
    runFunction: {
      enabled: { type: Boolean, default: false },
      functionName: String,
      parameters: mongoose.Schema.Types.Mixed,
    },
  },

  // القيود (Constraints)
  constraints: {
    // معدل التحديد (الحد الأقصى للتنبيهات)
    rateLimit: {
      enabled: { type: Boolean, default: true },
      maxPerHour: { type: Number, default: 10 },
      maxPerDay: { type: Number, default: 100 },
    },

    // تجميع الإشعارات
    aggregation: {
      enabled: { type: Boolean, default: false },
      groupBy: String, // حقل للتجميع حسبه
      timeWindow: Number, // ثوانٍ
      sendAfter: Number, // إرسال بعد هذا الوقت
    },

    // فترة الانتظار (Cooldown)
    cooldown: {
      enabled: { type: Boolean, default: true },
      duration: { type: Number, default: 300 }, // 5 دقائق
    },

    // الاستثناءات
    exclusions: {
      eventTypes: [String],
      customFilter: mongoose.Schema.Types.Mixed,
    },
  },

  // الأولويات والترتيب
  priority: { type: Number, default: 1 },
  executionOrder: { type: String, enum: ['sequential', 'parallel'], default: 'sequential' },

  // المراقبة والإحصائيات
  monitoring: {
    enabled: { type: Boolean, default: true },
    trackMetrics: { type: Boolean, default: true },
    alertOnFailure: { type: Boolean, default: false },
  },

  // الإحصائيات
  stats: {
    triggered: { type: Number, default: 0 },
    succeeded: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    lastTriggered: Date,
    lastSucceeded: Date,
    lastFailed: Date,
  },

  // بيانات تعريفية
  tags: [String],
  owner: String,
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: String,
  notes: String,
});

const AlertRule = mongoose.model('AlertRule', alertRuleSchema);

// ═══════════════════════════════════════════════════════════════
// 🎯 محرك القواعس المتقدم
// ═══════════════════════════════════════════════════════════════

class AdvancedAlertRulesEngine extends EventEmitter {
  constructor() {
    super();

    // ذاكرة التخزين المؤقت
    this.cache = new Map();
    this.cacheTimeout = 600000; // 10 دقائق

    // قائمة الحدود النشطة
    this.recentEvents = new Map(); // للتحقق من معدل التحديد

    // عداد الإجراءات المنفذة
    this.executeCounters = new Map();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📋 إدارة القواعس
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إنشاء قاعدة جديدة
   */
  async createRule(ruleData) {
    try {
      // التحقق من البيانات
      this.validateRuleData(ruleData);

      const rule = new AlertRule({
        ruleId: `RULE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...ruleData,
      });

      const savedRule = await rule.save();

      // إضافة إلى الذاكرة المؤقتة
      this.cache.set(savedRule.ruleId, savedRule);

      this.emit('ruleCreated', savedRule);

      logger.info(`✅ تم إنشاء قاعدة جديدة: ${savedRule.ruleId}`);

      return savedRule;
    } catch (error) {
      logger.error(`❌ خطأ في إنشاء القاعدة: ${error.message}`);
      throw error;
    }
  }

  /**
   * تحديث قاعدة
   */
  async updateRule(ruleId, updates) {
    try {
      const rule = await AlertRule.findOneAndUpdate(
        { ruleId },
        { ...updates, updatedAt: new Date() },
        { new: true }
      );

      if (!rule) {
        throw new Error(`القاعدة غير موجودة: ${ruleId}`);
      }

      // تحديث الذاكرة المؤقتة
      this.cache.delete(ruleId);

      this.emit('ruleUpdated', rule);

      logger.info(`📝 تم تحديث القاعدة: ${ruleId}`);

      return rule;
    } catch (error) {
      logger.error(`❌ خطأ في تحديث القاعدة: ${error.message}`);
      throw error;
    }
  }

  /**
   * حذف قاعدة
   */
  async deleteRule(ruleId) {
    try {
      const result = await AlertRule.deleteOne({ ruleId });

      this.cache.delete(ruleId);

      this.emit('ruleDeleted', { ruleId });

      logger.info(`🗑️ تم حذف القاعدة: ${ruleId}`);

      return result;
    } catch (error) {
      logger.error(`❌ خطأ في حذف القاعدة: ${error.message}`);
      throw error;
    }
  }

  /**
   * تفعيل/تعطيل قاعدة
   */
  async toggleRule(ruleId, isActive) {
    try {
      return await this.updateRule(ruleId, { isActive });
    } catch (error) {
      logger.error(`❌ خطأ في تبديل حالة القاعدة: ${error.message}`);
      throw error;
    }
  }

  /**
   * البحث عن القواعس
   */
  async searchRules(criteria = {}) {
    try {
      const query = { isActive: true, ...criteria };
      const rules = await AlertRule.find(query).sort({ priority: -1, createdAt: -1 }).exec();

      return rules;
    } catch (error) {
      logger.error(`❌ خطأ في البحث عن القواعس: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🔍 تقييم الأحداث
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * معالجة حدث
   */
  async evaluateEvent(eventData) {
    try {
      // الحصول على القواعس النشطة
      const rules = await this.searchRules();

      const triggeredRules = [];

      for (const rule of rules) {
        // التحقق من شروط القاعدة
        if (await this.evaluateRule(rule, eventData)) {
          // التحقق من القيود
          if (await this.checkConstraints(rule, eventData)) {
            triggeredRules.push(rule);

            // تنفيذ الإجراءات
            await this.executeActions(rule, eventData);

            // تحديث الإحصائيات
            rule.stats.triggered++;
            await rule.save();
          }
        }
      }

      this.emit('eventEvaluated', {
        event: eventData,
        triggeredRules,
      });

      return triggeredRules;
    } catch (error) {
      logger.error(`❌ خطأ في تقييم الحدث: ${error.message}`);
      throw error;
    }
  }

  /**
   * تقييم قاعدة معينة
   */
  async evaluateRule(rule, eventData) {
    try {
      // التحقق من نوع الحدث
      if (rule.conditions.eventType.length > 0) {
        if (!rule.conditions.eventType.includes(eventData.type)) {
          return false;
        }
      }

      // التحقق من مستوى الشدة
      if (rule.conditions.severity.length > 0) {
        if (!rule.conditions.severity.includes(eventData.severity)) {
          return false;
        }
      }

      // تقييم المرشحات المخصصة
      if (!this.evaluateCustomFilters(rule.conditions.customFilters, eventData)) {
        return false;
      }

      // التحقق من نطاق الوقت
      if (rule.conditions.timeRange.enabled) {
        if (!this.isWithinTimeRange(rule.conditions.timeRange)) {
          return false;
        }
      }

      // التحقق من أيام الأسبوع
      if (rule.conditions.daysOfWeek.length > 0) {
        if (!this.isDayAllowed(rule.conditions.daysOfWeek)) {
          return false;
        }
      }

      // التحقق من التكرارات
      if (!(await this.checkOccurrences(rule, eventData))) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`❌ خطأ في تقييم القاعدة: ${error.message}`);
      throw error;
    }
  }

  /**
   * تقييم المرشحات المخصصة
   */
  evaluateCustomFilters(filters, eventData) {
    if (!filters || filters.length === 0) {
      return true;
    }

    let result = true;
    let lastLogicalOp = 'AND';

    for (const filter of filters) {
      const conditionResult = this.evaluateFilter(filter, eventData);

      if (lastLogicalOp === 'AND') {
        result = result && conditionResult;
      } else if (lastLogicalOp === 'OR') {
        result = result || conditionResult;
      }

      lastLogicalOp = filter.logicalOperator || 'AND';
    }

    return result;
  }

  /**
   * تقييم مرشح واحد
   */
  evaluateFilter(filter, eventData) {
    const fieldValue = this.getNestedValue(eventData, filter.field);

    switch (filter.operator) {
      case 'equals':
        return fieldValue === filter.value;
      case 'notEquals':
        return fieldValue !== filter.value;
      case 'contains':
        return String(fieldValue).includes(String(filter.value));
      case 'notContains':
        return !String(fieldValue).includes(String(filter.value));
      case 'gt':
        return fieldValue > filter.value;
      case 'gte':
        return fieldValue >= filter.value;
      case 'lt':
        return fieldValue < filter.value;
      case 'lte':
        return fieldValue <= filter.value;
      case 'regex':
        return new RegExp(filter.value).test(String(fieldValue));
      case 'in':
        return filter.value.includes(fieldValue);
      case 'notIn':
        return !filter.value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'notExists':
        return fieldValue === undefined || fieldValue === null;
      default:
        return true;
    }
  }

  /**
   * الحصول على قيمة متداخلة
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  }

  /**
   * التحقق من التكرارات
   */
  async checkOccurrences(rule, eventData) {
    const key = `${rule.ruleId}_${eventData.type}`;
    const now = Date.now();

    if (!this.recentEvents.has(key)) {
      this.recentEvents.set(key, []);
    }

    const events = this.recentEvents.get(key);
    const windowStart = now - rule.conditions.timeWindow;

    // تنظيف الأحداث القديمة
    const filteredEvents = events.filter(timestamp => timestamp > windowStart);

    if (filteredEvents.length >= rule.conditions.minOccurrences) {
      return true;
    }

    filteredEvents.push(now);
    this.recentEvents.set(key, filteredEvents);

    return filteredEvents.length >= rule.conditions.minOccurrences;
  }

  /**
   * التحقق من القيود
   */
  async checkConstraints(rule, eventData) {
    // التحقق من معدل التحديد
    if (rule.constraints.rateLimit.enabled) {
      if (!(await this.checkRateLimit(rule))) {
        return false;
      }
    }

    // التحقق من الاستثناءات
    if (rule.constraints.exclusions.eventTypes.includes(eventData.type)) {
      return false;
    }

    return true;
  }

  /**
   * التحقق من معدل التحديد
   */
  async checkRateLimit(rule) {
    const key = `rate_${rule.ruleId}`;
    const now = Date.now();

    if (!this.executeCounters.has(key)) {
      this.executeCounters.set(key, { hourly: [], daily: [] });
    }

    const counter = this.executeCounters.get(key);
    const oneHourAgo = now - 3600000;
    const oneDayAgo = now - 86400000;

    // تنظيف العدادات
    counter.hourly = counter.hourly.filter(t => t > oneHourAgo);
    counter.daily = counter.daily.filter(t => t > oneDayAgo);

    // التحقق من الحدود
    if (counter.hourly.length >= rule.constraints.rateLimit.maxPerHour) {
      return false;
    }

    if (counter.daily.length >= rule.constraints.rateLimit.maxPerDay) {
      return false;
    }

    counter.hourly.push(now);
    counter.daily.push(now);

    return true;
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * ⚡ تنفيذ الإجراءات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * تنفيذ جميع الإجراءات
   */
  async executeActions(rule, eventData) {
    try {
      const promises = [];

      // إرسال إشعار
      if (rule.actions.notify.enabled) {
        promises.push(this.executeNotifyAction(rule, eventData));
      }

      // تنفيذ عملية
      if (rule.actions.executeAction.enabled) {
        promises.push(this.executeCustomAction(rule, eventData));
      }

      // تسجيل الحدث
      if (rule.actions.logEvent.enabled) {
        promises.push(this.executeLogAction(rule, eventData));
      }

      // استدعاء webhook
      if (rule.actions.webhook.enabled) {
        promises.push(this.executeWebhookAction(rule, eventData));
      }

      // تشغيل وظيفة
      if (rule.actions.runFunction.enabled) {
        promises.push(this.executeFunctionAction(rule, eventData));
      }

      // انتظار جميع الإجراءات
      const results = await Promise.allSettled(promises);

      // تحديث الإحصائيات
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      rule.stats.succeeded += succeeded;
      rule.stats.failed += failed;
      rule.stats.lastTriggered = new Date();

      if (failed === 0) {
        rule.stats.lastSucceeded = new Date();
      } else {
        rule.stats.lastFailed = new Date();
      }

      await rule.save();

      this.emit('actionsExecuted', {
        ruleId: rule.ruleId,
        succeeded,
        failed,
      });
    } catch (error) {
      logger.error(`❌ خطأ في تنفيذ الإجراءات: ${error.message}`);
      throw error;
    }
  }

  /**
   * تنفيذ إجراء الإشعار
   */
  async executeNotifyAction(rule, eventData) {
    try {
      // هنا يتم استدعاء الخدمة الموحدة للإشعارات
      logger.info(`📢 تنفيذ إجراء الإشعار للقاعدة: ${rule.ruleId}`);

      return { status: 'executed' };
    } catch (error) {
      logger.error(`❌ خطأ في تنفيذ إجراء الإشعار: ${error.message}`);
      throw error;
    }
  }

  /**
   * تنفيذ إجراء مخصص
   */
  async executeCustomAction(rule, eventData) {
    try {
      logger.info(`⚙️ تنفيذ إجراء مخصص: ${rule.actions.executeAction.actionType}`);

      return { status: 'executed' };
    } catch (error) {
      logger.error(`❌ خطأ في تنفيذ الإجراء المخصص: ${error.message}`);
      throw error;
    }
  }

  /**
   * تنفيذ إجراء التسجيل
   */
  async executeLogAction(rule, eventData) {
    try {
      const logLevel = rule.actions.logEvent.logLevel || 'info';
      const message = `Alert Rule [${rule.name}] triggered by event: ${eventData.type}`;

      logger[logLevel](message);

      return { status: 'executed' };
    } catch (error) {
      logger.error(`❌ خطأ في تنفيذ إجراء التسجيل: ${error.message}`);
      throw error;
    }
  }

  /**
   * تنفيذ إجراء webhook
   */
  async executeWebhookAction(rule, eventData) {
    try {
      const axios = require('axios');

      const payload = rule.actions.webhook.payload || eventData;

      await axios({
        method: rule.actions.webhook.method,
        url: rule.actions.webhook.url,
        headers: rule.actions.webhook.headers,
        data: payload,
        timeout: 10000,
      });

      logger.info(`🪝 تم استدعاء webhook: ${rule.actions.webhook.url}`);

      return { status: 'executed' };
    } catch (error) {
      logger.error(`❌ خطأ في تنفيذ webhook: ${error.message}`);
      throw error;
    }
  }

  /**
   * تنفيذ إجراء الدالة
   */
  async executeFunctionAction(rule, eventData) {
    try {
      logger.info(`📞 تنفيذ دالة: ${rule.actions.runFunction.functionName}`);

      // هنا يمكن تنفيذ دالة مديرة من الكود
      // الآن مجرد تسجيل

      return { status: 'executed' };
    } catch (error) {
      logger.error(`❌ خطأ في تنفيذ الدالة: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🛠️ الأدوات المساعدة
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * التحقق من صحة بيانات القاعدة
   */
  validateRuleData(ruleData) {
    if (!ruleData.name) {
      throw new Error('اسم القاعدة مطلوب');
    }

    if (ruleData.conditions && !ruleData.conditions.eventType) {
      throw new Error('يجب تحديد واحد على الأقل من أنواع الأحداث');
    }

    return true;
  }

  /**
   * التحقق من نطاق الوقت
   */
  isWithinTimeRange(timeRange) {
    const now = new Date();
    const currentTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const startTime = timeRange.startTime;
    const endTime = timeRange.endTime;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * التحقق من يوم الأسبوع
   */
  isDayAllowed(daysOfWeek) {
    const today = new Date().toLocaleString('en-US', { weekday: 'lowercase' });
    return daysOfWeek.includes(today);
  }

  /**
   * الحصول على إحصائيات قاعدة
   */
  async getRuleStatistics(ruleId) {
    try {
      const rule = await AlertRule.findOne({ ruleId });
      return rule?.stats || {};
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
    logger.info(`🗑️ تم مسح الذاكرة المؤقتة (${size} قاعدة)`);
  }
}

// ═══════════════════════════════════════════════════════════════
// 📦 التصدير
// ═══════════════════════════════════════════════════════════════

module.exports = {
  AdvancedAlertRulesEngine,
  AlertRule,
  rulesEngine: new AdvancedAlertRulesEngine(),
};
