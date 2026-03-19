/* eslint-disable no-unused-vars */
/**
 * خدمة مراقبة قاعدة البيانات - Database Monitor Service
 * نظام الألوائل للتأهيل وإعادة التأهيل
 */

const mongoose = require('mongoose');
const EventEmitter = require('events');
const logger = require('../utils/logger');

class DatabaseMonitorService extends EventEmitter {
  constructor() {
    super();
    this.isMonitoring = false;
    this.metrics = {
      connections: [],
      queries: [],
      performance: [],
      errors: [],
    };
    this.thresholds = {
      slowQueryMs: 1000,
      connectionTimeout: 30000,
      maxConnections: 100,
      memoryUsageMB: 512,
    };
    this.alerts = [];
  }

  // بدء المراقبة
  startMonitoring() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    // مراقبة الأداء كل دقيقة
    this.performanceInterval = setInterval(() => this.collectPerformanceMetrics(), 60000);

    // مراقبة الاتصالات كل 30 ثانية
    this.connectionInterval = setInterval(() => this.checkConnections(), 30000);

    // مراقبة الصحة كل 5 دقائق
    this.healthInterval = setInterval(() => this.healthCheck(), 300000);

    // مراقبة الاستعلامات البطيئة
    this.setupQueryMonitoring();

    logger.info('📊 بدء مراقبة قاعدة البيانات...');
  }

  // إيقاف المراقبة
  stopMonitoring() {
    this.isMonitoring = false;
    clearInterval(this.performanceInterval);
    clearInterval(this.connectionInterval);
    clearInterval(this.healthInterval);
    logger.info('⏹️ تم إيقاف مراقبة قاعدة البيانات');
  }

  // جمع مقاييس الأداء
  async collectPerformanceMetrics() {
    try {
      const db = mongoose.connection.db;
      const serverStatus = await db.admin().serverStatus();

      const metrics = {
        timestamp: new Date(),
        connections: serverStatus.connections,
        network: serverStatus.network,
        operations: serverStatus.opcounters,
        memory: serverStatus.mem,
        uptime: serverStatus.uptime,
      };

      this.metrics.performance.push(metrics);

      // الاحتفاظ بآخر 1000 مقياس فقط
      if (this.metrics.performance.length > 1000) {
        this.metrics.performance = this.metrics.performance.slice(-1000);
      }

      // فحص الاستخدام
      this.checkThresholds(metrics);

      this.emit('metrics', metrics);
      return metrics;
    } catch (error) {
      this.metrics.errors.push({ timestamp: new Date(), error: 'حدث خطأ داخلي' });
      return null;
    }
  }

  // مراقبة الاتصالات
  async checkConnections() {
    try {
      const status = mongoose.connection.readyState;
      const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

      const connectionInfo = {
        timestamp: new Date(),
        status: statusMap[status],
        readyState: status,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
      };

      this.metrics.connections.push(connectionInfo);

      // الاحتفاظ بآخر 100 سجل
      if (this.metrics.connections.length > 100) {
        this.metrics.connections = this.metrics.connections.slice(-100);
      }

      // تنبيه إذا كان هناك مشكلة
      if (status !== 1) {
        this.addAlert('connection', 'warning', `اتصال قاعدة البيانات: ${statusMap[status]}`);
      }

      return connectionInfo;
    } catch (error) {
      this.addAlert('connection', 'critical', 'حدث خطأ داخلي');
      return null;
    }
  }

  // فحص الصحة
  async healthCheck() {
    try {
      const db = mongoose.connection.db;
      await db.admin().ping();

      const collections = await db.listCollections().toArray();
      const stats = await db.stats();

      const health = {
        timestamp: new Date(),
        status: 'healthy',
        collections: collections.length,
        dataSize: stats.dataSize,
        indexSize: stats.indexSize,
        totalSize: stats.dataSize + stats.indexSize,
      };

      this.emit('health', health);
      return health;
    } catch (error) {
      const health = { timestamp: new Date(), status: 'unhealthy', error: 'حدث خطأ داخلي' };
      this.addAlert('health', 'critical', 'حدث خطأ داخلي');
      return health;
    }
  }

  // مراقبة الاستعلامات البطيئة
  setupQueryMonitoring() {
    mongoose.set('debug', (collectionName, method, query, doc) => {
      const startTime = Date.now();

      // تسجيل الاستعلام
      process.nextTick(() => {
        const duration = Date.now() - startTime;

        if (duration > this.thresholds.slowQueryMs) {
          const slowQuery = {
            timestamp: new Date(),
            collection: collectionName,
            method,
            query: JSON.stringify(query),
            duration,
            slow: true,
          };

          this.metrics.queries.push(slowQuery);
          this.addAlert(
            'slowQuery',
            'warning',
            `استعلام بطيء: ${collectionName}.${method} (${duration}ms)`
          );
        }
      });
    });
  }

  // فحص الحدود
  checkThresholds(metrics) {
    // فحص الذاكرة
    if (metrics.memory && metrics.memory.resident > this.thresholds.memoryUsageMB) {
      this.addAlert('memory', 'warning', `استخدام الذاكرة مرتفع: ${metrics.memory.resident}MB`);
    }

    // فحص الاتصالات
    if (metrics.connections && metrics.connections.current > this.thresholds.maxConnections) {
      this.addAlert(
        'connections',
        'warning',
        `عدد الاتصالات مرتفع: ${metrics.connections.current}`
      );
    }
  }

  // إضافة تنبيه
  addAlert(type, severity, message) {
    const alert = {
      id: Date.now(),
      timestamp: new Date(),
      type,
      severity,
      message,
      acknowledged: false,
    };

    this.alerts.push(alert);
    this.emit('alert', alert);

    // الاحتفاظ بآخر 100 تنبيه
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  // الحصول على الإحصائيات
  getStats() {
    return {
      isMonitoring: this.isMonitoring,
      performanceCount: this.metrics.performance.length,
      connectionsCount: this.metrics.connections.length,
      queriesCount: this.metrics.queries.length,
      errorsCount: this.metrics.errors.length,
      alertsCount: this.alerts.length,
      unacknowledgedAlerts: this.alerts.filter(a => !a.acknowledged).length,
    };
  }

  // الحصول على التنبيهات
  getAlerts(options = {}) {
    let alerts = [...this.alerts];

    if (options.severity) {
      alerts = alerts.filter(a => a.severity === options.severity);
    }
    if (options.unacknowledged) {
      alerts = alerts.filter(a => !a.acknowledged);
    }
    if (options.limit) {
      alerts = alerts.slice(-options.limit);
    }

    return alerts;
  }

  // تأكيد التنبيه
  acknowledgeAlert(alertId) {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return alert;
    }
    return null;
  }

  // تقرير الأداء
  async getPerformanceReport() {
    const recentMetrics = this.metrics.performance.slice(-60); // آخر ساعة

    if (recentMetrics.length === 0) {
      return { message: 'لا توجد بيانات كافية' };
    }

    const avgConnections =
      recentMetrics.reduce((sum, m) => sum + (m.connections?.current || 0), 0) /
      recentMetrics.length;

    const slowQueries = this.metrics.queries.filter(q => q.slow).length;

    return {
      period: 'آخر ساعة',
      avgConnections: Math.round(avgConnections),
      slowQueries,
      errors: this.metrics.errors.length,
      alerts: this.alerts.length,
      status:
        this.alerts.filter(a => a.severity === 'critical').length > 0
          ? 'critical'
          : this.alerts.filter(a => a.severity === 'warning').length > 0
            ? 'warning'
            : 'healthy',
    };
  }
}

module.exports = new DatabaseMonitorService();
