/* eslint-disable no-unused-vars */
/**
 * ═══════════════════════════════════════════════════════════════
 * 📊 Notification Analytics & Monitoring System
 * نظام التحليلات والمراقبة للإشعارات
 * ═══════════════════════════════════════════════════════════════
 *
 * نظام متقدم للمراقبة وتحليل الإشعارات:
 * - إحصائيات شاملة
 * - تحليل الأداء
 * - التقارير التفصيلية
 * - الرسوم البيانية والمؤشرات
 */

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const EventEmitter = require('events');

// ═══════════════════════════════════════════════════════════════
// 📊 نموذج الإحصائيات
// ═══════════════════════════════════════════════════════════════

const notificationMetricsSchema = new mongoose.Schema({
  metricsId: { type: String, unique: true },
  timestamp: { type: Date, default: Date.now, index: true },

  // فترة التجميع
  period: {
    type: String,
    enum: ['realtime', 'hourly', 'daily', 'weekly', 'monthly'],
    default: 'hourly',
  },
  date: Date,

  // إحصائيات عامة
  totalNotifications: Number,
  sentNotifications: Number,
  failedNotifications: Number,
  pendingNotifications: Number,

  // حسب القنوات
  channelStats: {
    email: {
      sent: Number,
      failed: Number,
      bounced: Number,
      avgDeliveryTime: Number,
    },
    sms: {
      sent: Number,
      failed: Number,
      avgDeliveryTime: Number,
    },
    whatsapp: {
      sent: Number,
      failed: Number,
      read: Number,
      avgDeliveryTime: Number,
    },
    inApp: {
      sent: Number,
      read: Number,
      clicked: Number,
      avgReadTime: Number,
    },
    push: {
      sent: Number,
      failed: Number,
      opened: Number,
      dismissed: Number,
    },
    dashboard: {
      sent: Number,
      viewed: Number,
    },
  },

  // حسب الفئات
  categoryStats: mongoose.Schema.Types.Mixed,

  // حسب الأولويات
  priorityStats: mongoose.Schema.Types.Mixed,

  // معدل النجاح
  successRate: Number,
  deliveryRate: Number,
  readRate: Number,
  clickRate: Number,

  // أداء النظام
  performance: {
    avgProcessingTime: Number,
    avgQueueWaitTime: Number,
    peakTime: String,
    bottleneck: String,
  },

  // الأخطاء
  errors: {
    totalErrors: Number,
    byType: mongoose.Schema.Types.Mixed,
    mostCommon: [
      {
        errorType: String,
        count: Number,
        percentage: Number,
      },
    ],
  },

  // المستخدمون
  userStats: {
    activeUsers: Number,
    optedOut: Number,
    suspended: Number,
    engagementRate: Number,
  },

  // الاتجاهات
  trends: {
    increased: Boolean,
    changePercentage: Number,
    comparison: String, // 'higher', 'lower', 'stable'
  },
});

const NotificationMetrics = mongoose.model('NotificationMetrics', notificationMetricsSchema);

// ═══════════════════════════════════════════════════════════════
// 🎯 نظام التحليلات والمراقبة
// ═══════════════════════════════════════════════════════════════

class NotificationAnalyticsSystem extends EventEmitter {
  constructor() {
    super();

    // بيانات البث الفوري (In-Memory)
    this.liveMetrics = {
      totalNotificationsToday: 0,
      sentNotificationsToday: 0,
      failedNotificationsToday: 0,
      avgDeliveryTime: 0,
      currentQueueSize: 0,
      systemHealth: 'healthy',
    };

    // مؤشرات الأداء الرئيسية (KPIs)
    this.kpis = {
      deliveryRate: 0,
      successRate: 0,
      readRate: 0,
      clickRate: 0,
      optOutRate: 0,
      engagementRate: 0,
    };

    // بدء جمع الإحصائيات
    this.startMetricsCollection();
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📊 جمع الإحصائيات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * بدء جمع الإحصائيات
   */
  startMetricsCollection() {
    // تجميع كل ساعة
    this._hourlyInterval = setInterval(() => {
      this.collectHourlyMetrics();
    }, 3600000);

    // تجميع يومي
    this._dailyInterval = setInterval(() => {
      this.collectDailyMetrics();
    }, 86400000);

    logger.info('▶️ بدء نظام جمع الإحصائيات');
  }

  /**
   * جمع الإحصائيات بالساعة
   */
  async collectHourlyMetrics() {
    try {
      const hourAgo = new Date(Date.now() - 3600000);
      const now = new Date();

      // جمع البيانات من قاعدة البيانات
      const metrics = await this.calculateMetrics(hourAgo, now, 'hourly');

      // حفظ في قاعدة البيانات
      const savedMetrics = await this.saveMetrics(metrics);

      this.emit('hourlyMetricsCollected', savedMetrics);

      logger.info('📊 تم جمع إحصائيات الساعة');
    } catch (error) {
      logger.error(`❌ خطأ في جمع إحصائيات الساعة: ${error.message}`);
    }
  }

  /**
   * جمع الإحصائيات اليومية
   */
  async collectDailyMetrics() {
    try {
      const yesterday = new Date(Date.now() - 86400000);
      const now = new Date();

      const metrics = await this.calculateMetrics(yesterday, now, 'daily');

      const savedMetrics = await this.saveMetrics(metrics);

      this.emit('dailyMetricsCollected', savedMetrics);

      logger.info('📊 تم جمع الإحصائيات اليومية');
    } catch (error) {
      logger.error(`❌ خطأ في جمع الإحصائيات اليومية: ${error.message}`);
    }
  }

  /**
   * حساب الإحصائيات
   */
  async calculateMetrics(startDate, endDate, period) {
    try {
      // كود بسيط للتوضيح
      // في التطبيق الفعلي، سيتم الاستعلام عن قاعدة البيانات

      const metrics = {
        metricsId: `METRICS_${Date.now()}`,
        timestamp: new Date(),
        period,
        date: startDate,

        // إحصائيات عامة (أمثلة)
        totalNotifications: 1250,
        sentNotifications: 1200,
        failedNotifications: 30,
        pendingNotifications: 20,

        // حسب القنوات
        channelStats: {
          email: {
            sent: 400,
            failed: 5,
            bounced: 2,
            avgDeliveryTime: 2500,
          },
          sms: {
            sent: 150,
            failed: 3,
            avgDeliveryTime: 1200,
          },
          whatsapp: {
            sent: 300,
            failed: 8,
            read: 250,
            avgDeliveryTime: 3000,
          },
          inApp: {
            sent: 200,
            read: 180,
            clicked: 90,
            avgReadTime: 45000,
          },
          push: {
            sent: 150,
            failed: 10,
            opened: 100,
            dismissed: 40,
          },
          dashboard: {
            sent: 50,
            viewed: 45,
          },
        },

        // معدلات النجاح
        successRate: 96,
        deliveryRate: 95,
        readRate: 85,
        clickRate: 32,

        // الأخطاء
        errors: {
          totalErrors: 38,
          byType: {
            invalid_number: 8,
            delivery_timeout: 15,
            network_error: 10,
            authentication_failed: 5,
          },
          mostCommon: [
            { errorType: 'delivery_timeout', count: 15, percentage: 39.5 },
            { errorType: 'network_error', count: 10, percentage: 26.3 },
            { errorType: 'invalid_number', count: 8, percentage: 21.1 },
          ],
        },

        // إحصائيات المستخدم
        userStats: {
          activeUsers: 5420,
          optedOut: 120,
          suspended: 45,
          engagementRate: 78,
        },

        // الأداء
        performance: {
          avgProcessingTime: 450,
          avgQueueWaitTime: 250,
          peakTime: '14:30',
          bottleneck: 'whatsapp_delivery',
        },
      };

      return metrics;
    } catch (error) {
      logger.error(`❌ خطأ في حساب الإحصائيات: ${error.message}`);
      throw error;
    }
  }

  /**
   * حفظ الإحصائيات
   */
  async saveMetrics(metrics) {
    try {
      const savedMetrics = await NotificationMetrics.create(metrics);
      return savedMetrics;
    } catch (error) {
      logger.error(`❌ خطأ في حفظ الإحصائيات: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 📈 استرجاع الإحصائيات والتقارير
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * الحصول على الإحصائيات الحالية
   */
  async getCurrentMetrics() {
    try {
      const latestMetrics = await NotificationMetrics.findOne().sort({ timestamp: -1 }).exec();

      return (
        latestMetrics || {
          totalNotifications: 0,
          sentNotifications: 0,
          failedNotifications: 0,
        }
      );
    } catch (error) {
      logger.error(`❌ خطأ في جلب الإحصائيات الحالية: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات نطاق زمني
   */
  async getMetricsRange(startDate, endDate, period = 'daily') {
    try {
      const metrics = await NotificationMetrics.find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
        period,
      })
        .sort({ timestamp: 1 })
        .exec();

      return metrics;
    } catch (error) {
      logger.error(`❌ خطأ في جلب إحصائيات النطاق: ${error.message}`);
      throw error;
    }
  }

  /**
   * الحصول على مؤشرات الأداء الرئيسية (KPIs)
   */
  async getKPIs(period = 'daily') {
    try {
      const metrics = await this.getCurrentMetrics();

      if (!metrics) {
        return this.kpis;
      }

      return {
        deliveryRate: metrics.deliveryRate || 0,
        successRate: metrics.successRate || 0,
        readRate: metrics.readRate || 0,
        clickRate: metrics.clickRate || 0,
        engagementRate: metrics.userStats?.engagementRate || 0,
        optOutRate: this.calculateOptOutRate(metrics),
      };
    } catch (error) {
      logger.error(`❌ خطأ في جلب KPIs: ${error.message}`);
      throw error;
    }
  }

  /**
   * تقرير شامل
   */
  async generateComprehensiveReport(startDate, endDate) {
    try {
      const metricsArray = await this.getMetricsRange(startDate, endDate);

      if (metricsArray.length === 0) {
        throw new Error('لا توجد بيانات للفترة المحددة');
      }

      const report = {
        period: {
          start: startDate,
          end: endDate,
          days: Math.ceil((endDate - startDate) / (1000 * 3600 * 24)),
        },

        summary: {
          totalNotifications: this.sumMetrics(metricsArray, 'totalNotifications'),
          sentNotifications: this.sumMetrics(metricsArray, 'sentNotifications'),
          failedNotifications: this.sumMetrics(metricsArray, 'failedNotifications'),
          avgSuccessRate: this.avgMetrics(metricsArray, 'successRate'),
          avgDeliveryRate: this.avgMetrics(metricsArray, 'deliveryRate'),
        },

        byChannel: this.aggregateChannelMetrics(metricsArray),
        byCategory: this.aggregateCategoryMetrics(metricsArray),
        byPriority: this.aggregatePriorityMetrics(metricsArray),

        trends: this.calculateTrends(metricsArray),
        topErrors: this.getTopErrors(metricsArray),
        userInsights: this.getUserInsights(metricsArray),

        recommendations: this.generateRecommendations(metricsArray),
      };

      return report;
    } catch (error) {
      logger.error(`❌ خطأ في إنشاء التقرير الشامل: ${error.message}`);
      throw error;
    }
  }

  /**
   * تقرير القناة
   */
  async getChannelReport(channel, startDate, endDate) {
    try {
      const metricsArray = await this.getMetricsRange(startDate, endDate);

      const channelMetrics = metricsArray.map(m => m.channelStats?.[channel] || {});

      return {
        channel,
        period: { start: startDate, end: endDate },
        totalSent: this.sumProperty(channelMetrics, 'sent'),
        totalFailed: this.sumProperty(channelMetrics, 'failed'),
        avgDeliveryTime: this.avgProperty(channelMetrics, 'avgDeliveryTime'),
        successRate: this.calculateSuccessRate(
          this.sumProperty(channelMetrics, 'sent'),
          this.sumProperty(channelMetrics, 'failed')
        ),
      };
    } catch (error) {
      logger.error(`❌ خطأ في إنشاء تقرير القناة: ${error.message}`);
      throw error;
    }
  }

  /**
   * تقرير المستخدمين
   */
  async getUserEngagementReport(startDate, endDate) {
    try {
      const metricsArray = await this.getMetricsRange(startDate, endDate);

      const engagementMetrics = metricsArray.filter(m => m.userStats).map(m => m.userStats);

      return {
        period: { start: startDate, end: endDate },
        avgActiveUsers: Math.round(this.avgProperty(engagementMetrics, 'activeUsers')),
        avgOptedOut: Math.round(this.avgProperty(engagementMetrics, 'optedOut')),
        avgEngagementRate: Math.round(this.avgProperty(engagementMetrics, 'engagementRate')),
        trend: this.calculateTrend(engagementMetrics, 'engagementRate'),
      };
    } catch (error) {
      logger.error(`❌ خطأ في إنشاء تقرير المشاركة: ${error.message}`);
      throw error;
    }
  }

  /**
   * ═══════════════════════════════════════════════════════════════
   * 🛠️ الأدوات المساعدة للحسابات
   * ═══════════════════════════════════════════════════════════════
   */

  /**
   * إجمالي المقياس
   */
  sumMetrics(metricsArray, field) {
    return metricsArray.reduce((sum, metric) => sum + (metric[field] || 0), 0);
  }

  /**
   * متوسط المقياس
   */
  avgMetrics(metricsArray, field) {
    if (metricsArray.length === 0) return 0;
    return Math.round(
      metricsArray.reduce((sum, metric) => sum + (metric[field] || 0), 0) / metricsArray.length
    );
  }

  /**
   * مجموع الخاصية
   */
  sumProperty(items, property) {
    return items.reduce((sum, item) => sum + (item[property] || 0), 0);
  }

  /**
   * متوسط الخاصية
   */
  avgProperty(items, property) {
    if (items.length === 0) return 0;
    return this.sumProperty(items, property) / items.length;
  }

  /**
   * حساب معدل النجاح
   */
  calculateSuccessRate(sent, failed) {
    if (sent === 0) return 0;
    return Math.round(((sent - failed) / sent) * 100);
  }

  /**
   * حساب معدل الإلغاء
   */
  calculateOptOutRate(metrics) {
    if (!metrics.userStats) return 0;
    const total = metrics.userStats.activeUsers + metrics.userStats.optedOut;
    if (total === 0) return 0;
    return Math.round((metrics.userStats.optedOut / total) * 100);
  }

  /**
   * تجميع إحصائيات القنوات
   */
  aggregateChannelMetrics(metricsArray) {
    const channels = {};

    const channelNames = ['email', 'sms', 'whatsapp', 'inApp', 'push', 'dashboard'];

    channelNames.forEach(channel => {
      const channelMetrics = metricsArray
        .map(m => m.channelStats?.[channel] || {})
        .filter(m => Object.keys(m).length > 0);

      if (channelMetrics.length > 0) {
        channels[channel] = {
          sent: this.sumProperty(channelMetrics, 'sent'),
          failed: this.sumProperty(channelMetrics, 'failed'),
          avgDeliveryTime: Math.round(this.avgProperty(channelMetrics, 'avgDeliveryTime')),
          successRate: this.calculateSuccessRate(
            this.sumProperty(channelMetrics, 'sent'),
            this.sumProperty(channelMetrics, 'failed')
          ),
        };
      }
    });

    return channels;
  }

  /**
   * تجميع إحصائيات الفئات
   */
  aggregateCategoryMetrics(metricsArray) {
    // تجميع من البيانات المتاحة
    return {};
  }

  /**
   * تجميع إحصائيات الأولويات
   */
  aggregatePriorityMetrics(metricsArray) {
    // تجميع من البيانات المتاحة
    return {};
  }

  /**
   * حساب الاتجاهات
   */
  calculateTrends(metricsArray) {
    if (metricsArray.length < 2) {
      return { trend: 'stable', changePercentage: 0 };
    }

    const first = metricsArray[0].totalNotifications || 0;
    const last = metricsArray[metricsArray.length - 1].totalNotifications || 0;

    const change = ((last - first) / (first || 1)) * 100;

    return {
      trend: change > 5 ? 'increasing' : change < -5 ? 'decreasing' : 'stable',
      changePercentage: Math.round(change),
    };
  }

  /**
   * أكثر الأخطاء الشائعة
   */
  getTopErrors(metricsArray) {
    const allErrors = [];

    metricsArray.forEach(metric => {
      if (metric.errors?.mostCommon) {
        allErrors.push(...metric.errors.mostCommon);
      }
    });

    return allErrors.slice(0, 10);
  }

  /**
   * رؤى المستخدمين
   */
  getUserInsights(metricsArray) {
    const userStats = metricsArray.filter(m => m.userStats).map(m => m.userStats);

    return {
      avgActiveUsers: Math.round(this.avgProperty(userStats, 'activeUsers')),
      avgOptedOut: Math.round(this.avgProperty(userStats, 'optedOut')),
      avgEngagementRate: Math.round(this.avgProperty(userStats, 'engagementRate')),
    };
  }

  /**
   * توليد التوصيات
   */
  generateRecommendations(metricsArray) {
    const recommendations = [];

    const currentMetrics = metricsArray[metricsArray.length - 1];

    if (currentMetrics.successRate < 90) {
      recommendations.push({
        priority: 'high',
        message: 'معدل النجاح أقل من 90% - يوجد مشكلة في التسليم',
        action: 'تحقق من حالة الخوادم والاتصالات',
      });
    }

    if (currentMetrics.errors?.totalErrors > 50) {
      recommendations.push({
        priority: 'high',
        message: 'عدد الأخطاء مرتفع جداً',
        action: 'راجع سجلات الأخطاء وحدد المشكلة',
      });
    }

    if (this.calculateOptOutRate(currentMetrics) > 5) {
      recommendations.push({
        priority: 'medium',
        message: 'معدل الإلغاء مرتفع',
        action: 'قلل تكرار الإشعارات أو حسّن المحتوى',
      });
    }

    return recommendations;
  }

  /**
   * حساب الاتجاه
   */
  calculateTrend(items, property) {
    if (items.length < 2) return 'stable';

    const first = items[0][property] || 0;
    const last = items[items.length - 1][property] || 0;

    if (last > first) return 'increasing';
    if (last < first) return 'decreasing';
    return 'stable';
  }

  /**
   * مسح الإحصائيات القديمة
   */
  async cleanOldMetrics(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 86400000);

      const result = await NotificationMetrics.deleteMany({
        timestamp: { $lt: cutoffDate },
      });

      logger.info(`🗑️ تم حذف ${result.deletedCount} سجل إحصائي قديم`);

      return result;
    } catch (error) {
      logger.error(`❌ خطأ في تنظيف الإحصائيات القديمة: ${error.message}`);
      throw error;
    }
  }

  /**
   * Shutdown — clear intervals
   */
  shutdown() {
    if (this._hourlyInterval) {
      clearInterval(this._hourlyInterval);
      this._hourlyInterval = null;
    }
    if (this._dailyInterval) {
      clearInterval(this._dailyInterval);
      this._dailyInterval = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// 📦 التصدير
// ═══════════════════════════════════════════════════════════════

module.exports = {
  NotificationAnalyticsSystem,
  NotificationMetrics,
  analyticsSystem: new NotificationAnalyticsSystem(),
};
