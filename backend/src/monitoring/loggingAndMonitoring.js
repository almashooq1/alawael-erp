/**
 * Monitoring & Logging Module
 * مراقبة والتسجيل المتقدم لنظام تتبع الحافلات
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const prometheus = require('prom-client');
const elasticsearch = require('@elastic/elasticsearch');
const StatsD = require('node-statsd').StatsD;

// ====== 1. نظام logging متقدم ======

class LoggingSystem {
  constructor() {
    this.initializeWinston();
    this.initializeElasticsearch();
    this.initializeStatsD();
  }

  /**
   * تهيئة Winston Logger
   */
  initializeWinston() {
    const levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4,
      trace: 5
    };

    const colors = {
      error: 'red',
      warn: 'yellow',
      info: 'green',
      http: 'magenta',
      debug: 'white',
      trace: 'gray'
    };

    winston.addColors(colors);

    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    );

    // Transports
    const transports = [
      // Console Transport
      new winston.transports.Console(),

      // Error Logs
      new DailyRotateFile({
        filename: 'logs/error/%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'error'
      }),

      // Combined Logs
      new DailyRotateFile({
        filename: 'logs/combined/%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d'
      }),

      // Performance Logs
      new DailyRotateFile({
        filename: 'logs/performance/%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d',
        filter: (info) => {
          return info.label === 'performance';
        }
      }),

      // Security Logs
      new DailyRotateFile({
        filename: 'logs/security/%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        filter: (info) => {
          return info.label === 'security';
        }
      })
    ];

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'debug',
      levels,
      format,
      transports,
      defaultMeta: { service: 'gps-fleet-api' }
    });
  }

  /**
   * تهيئة Elasticsearch للتسجيل المركزي
   */
  initializeElasticsearch() {
    this.elasticClient = new elasticsearch.Client({
      node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
      auth: {
        username: process.env.ELASTICSEARCH_USER || 'elastic',
        password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
      }
    });
  }

  /**
   * تهيئة StatsD للمٌقاييس
   */
  initializeStatsD() {
    this.statsd = new StatsD({
      host: process.env.STATSD_HOST || 'localhost',
      port: process.env.STATSD_PORT || 8125,
      prefix: 'gps_fleet.'
    });
  }

  /**
   * تسجيل في جميع الطبقات
   */
  async log(level, message, metadata = {}, label = 'general') {
    // Winston Logger
    this.logger.log(level, message, { label, ...metadata });

    // Elasticsearch
    if (process.env.ELASTICSEARCH_ENABLED === 'true') {
      await this.logToElasticsearch({
        level,
        message,
        metadata,
        label,
        timestamp: new Date()
      });
    }

    // Metrics
    this.recordMetric(level, metadata);
  }

  /**
   * تسجيل في Elasticsearch
   */
  async logToElasticsearch(logEntry) {
    const indexName = `logs-${new Date().toISOString().split('T')[0]}`;

    try {
      await this.elasticClient.index({
        index: indexName,
        document: logEntry
      });
    } catch (error) {
      console.error('Elasticsearch logging failed:', error);
    }
  }

  /**
   * تسجيل الأخطاء
   */
  async logError(error, context = {}) {
    await this.log('error', error.message, {
      stack: error.stack,
      ...context
    }, 'error');
  }

  /**
   * تسجيل الأداء
   */
  async logPerformance(operation, duration, success = true) {
    await this.log('info', `${operation}`, {
      duration: `${duration}ms`,
      success
    }, 'performance');

    // تسجيل في StatsD
    this.statsd.timing(`${operation}.duration`, duration);
    this.statsd.increment(success ? `${operation}.success` : `${operation}.failure`);
  }

  /**
   * تسجيل الأمان
   */
  async logSecurity(event, details) {
    await this.log('warn', `Security Event: ${event}`, details, 'security');

    // تنبيهات فورية للأحداث الخطيرة
    if (details.severity === 'critical' || details.severity === 'high') {
      await this.sendAlert(event, details);
    }
  }

  /**
   * تسجيل نشاط المستخدم
   */
  async logUserActivity(userId, action, details) {
    await this.log('info', `User Activity: ${action}`, {
      userId,
      ...details
    });
  }

  /**
   * تسجيل استعلام قاعدة البيانات
   */
  async logDatabaseQuery(query, duration, success = true) {
    // تسجيل الاستعلامات البطيئة فقط
    if (duration > 100) {
      await this.log('warn', 'Slow database query', {
        query,
        duration: `${duration}ms`,
        success
      }, 'performance');
    }

    this.statsd.timing('database_query.duration', duration);
  }

  /**
   * تسجيل طلب API
   */
  async logAPIRequest(req, res, duration) {
    const statusCode = res.statusCode;
    const method = req.method;
    const path = req.path;
    const clientIP = req.ip;

    const logLevel = statusCode >= 400 ? 'warn' : 'info';

    await this.log(logLevel, `${method} ${path}`, {
      statusCode,
      duration: `${duration}ms`,
      clientIP,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    });

    this.statsd.timing(`api_request.duration`, duration);
    this.statsd.increment(`api_${statusCode}`);
  }

  /**
   * إرسال تنبيه
   */
  async sendAlert(event, details) {
    // يمكن إرسال بريد أو رسالة Slack
    console.error(`🚨 ALERT: ${event}`, details);
  }

  /**
   * تسجيل Metric
   */
  recordMetric(level, metadata) {
    if (metadata.value !== undefined) {
      this.statsd.gauge(metadata.metric, metadata.value);
    }
  }
}

// ====== 2. نظام المراقبة المتقدم ======

class MonitoringSystem {
  constructor() {
    this.initializePrometheus();
    this.setupMetrics();
  }

  /**
   * تهيئة Prometheus
   */
  initializePrometheus() {
    // تفعيل جمع المقاييس الافتراضية
    prometheus.collectDefaultMetrics({ prefix: 'gps_fleet_' });
  }

  /**
   * إعداد المقاييس المخصصة
   */
  setupMetrics() {
    // مقاييس العمليات الرئيسية
    this.httpRequestDuration = new prometheus.Histogram({
      name: 'gps_fleet_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10]
    });

    this.activeConnections = new prometheus.Gauge({
      name: 'gps_fleet_active_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['connection_type']
    });

    this.gpsLocationUpdates = new prometheus.Counter({
      name: 'gps_fleet_location_updates_total',
      help: 'Total number of GPS location updates',
      labelNames: ['vehicle_type', 'status']
    });

    this.predictedAccidents = new prometheus.Counter({
      name: 'gps_fleet_predicted_accidents_total',
      help: 'Total predicted accidents',
      labelNames: ['confidence_level']
    });

    this.databaseQueryDuration = new prometheus.Histogram({
      name: 'gps_fleet_db_query_duration_seconds',
      help: 'Database query duration',
      labelNames: ['operation', 'collection'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1]
    });

    this.cacheHitRate = new prometheus.Gauge({
      name: 'gps_fleet_cache_hit_rate',
      help: 'Cache hit rate percentage',
      labelNames: ['cache_type']
    });

    this.notificationsSent = new prometheus.Counter({
      name: 'gps_fleet_notifications_sent_total',
      help: 'Total notifications sent',
      labelNames: ['channel', 'status']
    });

    this.systemErrors = new prometheus.Counter({
      name: 'gps_fleet_system_errors_total',
      help: 'Total system errors',
      labelNames: ['error_type', 'severity']
    });
  }

  /**
   * الحصول على مقاييس Prometheus
   */
  async getMetrics() {
    return await prometheus.register.metrics();
  }

  /**
   * تسجيل طلب HTTP
   */
  recordHttpRequest(method, route, statusCode, duration) {
    this.httpRequestDuration
      .labels(method, route, statusCode)
      .observe(duration / 1000);
  }

  /**
   * تحديث الاتصالات النشطة
   */
  setActiveConnections(connectionType, count) {
    this.activeConnections.labels(connectionType).set(count);
  }

  /**
   * تسجيل تحديث موقع
   */
  recordLocationUpdate(vehicleType, status) {
    this.gpsLocationUpdates.labels(vehicleType, status).inc();
  }

  /**
   * تسجيل حادثة متنبー بها
   */
  recordPredictedAccident(confidenceLevel) {
    this.predictedAccidents.labels(confidenceLevel).inc();
  }

  /**
   * تسجيل استعلام قاعدة البيانات
   */
  recordDatabaseQuery(operation, collection, duration) {
    this.databaseQueryDuration
      .labels(operation, collection)
      .observe(duration / 1000);
  }

  /**
   * تسجيل معدل الـ Hit على الـ Cache
   */
  setCacheHitRate(cacheType, hitRate) {
    this.cacheHitRate.labels(cacheType).set(hitRate * 100);
  }

  /**
   * تسجيل رسالة مرسلة
   */
  recordNotificationSent(channel, status) {
    this.notificationsSent.labels(channel, status).inc();
  }

  /**
   * تسجيل خطأ في النظام
   */
  recordSystemError(errorType, severity) {
    this.systemErrors.labels(errorType, severity).inc();
  }
}

// ====== 3. لوحة التحكم (Dashboard) ======

class DashboardMetrics {
  constructor(monitoring) {
    this.monitoring = monitoring;
  }

  /**
   * الحصول على ملخص صحة النظام
   */
  async getSystemHealth() {
    return {
      timestamp: new Date(),
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }

  /**
   * الحصول على إحصائيات الأداء
   */
  async getPerformanceStats() {
    return {
      avgResponseTime: '150ms',
      requestsPerSecond: 1250,
      errorRate: '0.2%',
      cacheHitRate: '85%'
    };
  }

  /**
   * الحصول على إحصائيات النشاط
   */
  async getActivityStats() {
    return {
      activeVehicles: 150,
      activeDrivers: 95,
      liveTrips: 45,
      totalUsers: 500,
      activeConnections: 320
    };
  }

  /**
   * الحصول على تنبيهات النظام
   */
  async getSystemAlerts() {
    return [
      {
        id: 1,
        severity: 'high',
        message: 'High CPU usage detected',
        timestamp: new Date()
      },
      {
        id: 2,
        severity: 'medium',
        message: 'MongoDB connection pool near capacity',
        timestamp: new Date()
      }
    ];
  }

  /**
   * الحصول على معلومات الخادم
   */
  async getServerInfo() {
    return {
      hostname: require('os').hostname(),
      platform: process.platform,
      nodeVersion: process.version,
      uptime: `${Math.floor(process.uptime() / 60)} minutes`,
      pid: process.pid
    };
  }

  /**
   * الحصول على إحصائيات قاعدة البيانات
   */
  async getDatabaseStats() {
    return {
      vehicles: 1500,
      trips: 45000,
      drivers: 500,
      notifications: 250000,
      collectionSizes: {
        vehicles: '2.5 MB',
        trips: '150 MB',
        drivers: '1.2 MB'
      }
    };
  }
}

// ====== 4. نظام التنبيهات ======

class AlertingSystem {
  constructor(logger, monitoring) {
    this.logger = logger;
    this.monitoring = monitoring;
    this.alerts = new Map();
    this.setupAlertRules();
  }

  /**
   * إعداد قواعد التنبيهات
   */
  setupAlertRules() {
    this.rules = {
      high_error_rate: {
        threshold: 5, // أكثر من 5 أخطاء في الدقيقة
        severity: 'high',
        action: 'trigger_alert'
      },
      high_cpu: {
        threshold: 80,
        severity: 'medium',
        action: 'trigger_alert'
      },
      high_memory: {
        threshold: 85,
        severity: 'medium',
        action: 'trigger_alert'
      },
      database_slow: {
        threshold: 1000, // أكثر من 1 ثانية
        severity: 'low',
        action: 'trigger_alert'
      },
      connection_pool_high: {
        threshold: 90,
        severity: 'medium',
        action: 'trigger_alert'
      }
    };
  }

  /**
   * التحقق من القواعس وتشغيل التنبيهات
   */
  async checkAlertRules(metrics) {
    for (const [ruleName, rule] of Object.entries(this.rules)) {
      if (metrics[ruleName] > rule.threshold) {
        await this.triggerAlert(ruleName, rule, metrics[ruleName]);
      }
    }
  }

  /**
   * تشغيل تنبيه
   */
  async triggerAlert(ruleName, rule, value) {
    const alert = {
      id: Date.now(),
      ruleName,
      severity: rule.severity,
      value,
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.set(alert.id, alert);

    // سجل التنبيه
    await this.logger.log('warn', `Alert triggered: ${ruleName}`, {
      rule,
      value,
      severity: rule.severity
    });

    // أرسل إشعار
    await this.sendNotification(alert);
  }

  /**
   * إرسال إشعار التنبيه
   */
  async sendNotification(alert) {
    // أرسل Slack message
    console.log(`📢 Alert Notification: ${alert.ruleName}`);

    // أرسل بريد إلكتروني إذا كان الخطر عالياً
    if (alert.severity === 'critical') {
      // sendEmail(alert);
    }
  }

  /**
   * الحصول على التنبيهات النشطة
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(a => !a.acknowledged);
  }

  /**
   * الاعتراف بتنبيه
   */
  acknowledgeAlert(alertId) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }
}

// ====== التصدير ======

module.exports = {
  LoggingSystem,
  MonitoringSystem,
  DashboardMetrics,
  AlertingSystem,

  // Helper function
  createMiddleware: function(logging, monitoring) {
    return (req, res, next) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        logging.log('info', `${req.method} ${req.path}`, {
          statusCode: res.statusCode,
          duration: `${duration}ms`
        });

        monitoring.recordHttpRequest(
          req.method,
          req.path,
          res.statusCode,
          duration
        );
      });

      next();
    };
  }
};
