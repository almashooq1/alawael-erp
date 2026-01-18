/**
 * Advanced Performance Monitoring & Logging
 * نظام مراقبة الأداء المتقدمة
 */

const fs = require('fs');
const path = require('path');

// ============================================
// 1. SLOW QUERY LOGGER
// ============================================

class SlowQueryLogger {
  constructor(threshold = 100) {
    this.threshold = threshold; // ms
    this.queries = [];
    this.logFile = path.join(__dirname, '../logs/slow-queries.log');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const dir = path.dirname(this.logFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  log(query, duration) {
    if (duration > this.threshold) {
      const entry = {
        timestamp: new Date().toISOString(),
        duration: `${duration}ms`,
        query: JSON.stringify(query),
        model: query.collection || 'Unknown',
      };

      this.queries.push(entry);

      // اكتب إلى الملف
      const logLine = `[${entry.timestamp}] ${entry.model} - ${entry.duration} - ${entry.query}\n`;
      fs.appendFileSync(this.logFile, logLine);

      // تنبيه إذا كانت جداً بطيئة
      if (duration > 1000) {
        console.warn(`⚠️ VERY SLOW QUERY: ${entry.model} took ${duration}ms`);
      }
    }
  }

  getSlowQueries() {
    return this.queries;
  }

  clearOldLogs(daysOld = 7) {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    this.queries = this.queries.filter(q => new Date(q.timestamp).getTime() > cutoffTime);
  }
}

// ============================================
// 2. PERFORMANCE METRICS COLLECTOR
// ============================================

class PerformanceMetrics {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      totalDuration: 0,
      slowQueries: 0,
      fastQueries: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      byEndpoint: {},
      byModel: {},
    };
    this.intervals = [];
  }

  recordQuery(endpoint, model, duration) {
    this.metrics.totalRequests++;
    this.metrics.totalDuration += duration;
    this.metrics.averageDuration = this.metrics.totalDuration / this.metrics.totalRequests;
    this.metrics.maxDuration = Math.max(this.metrics.maxDuration, duration);
    this.metrics.minDuration = Math.min(this.metrics.minDuration, duration);

    if (duration > 100) {
      this.metrics.slowQueries++;
    } else {
      this.metrics.fastQueries++;
    }

    // By endpoint
    if (!this.metrics.byEndpoint[endpoint]) {
      this.metrics.byEndpoint[endpoint] = { count: 0, duration: 0 };
    }
    this.metrics.byEndpoint[endpoint].count++;
    this.metrics.byEndpoint[endpoint].duration += duration;

    // By model
    if (!this.metrics.byModel[model]) {
      this.metrics.byModel[model] = { count: 0, duration: 0 };
    }
    this.metrics.byModel[model].count++;
    this.metrics.byModel[model].duration += duration;
  }

  getReport() {
    const slowQueryPercentage = ((this.metrics.slowQueries / this.metrics.totalRequests) * 100).toFixed(1);

    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        averageDuration: `${this.metrics.averageDuration.toFixed(2)}ms`,
        minDuration: `${this.metrics.minDuration.toFixed(2)}ms`,
        maxDuration: `${this.metrics.maxDuration.toFixed(2)}ms`,
        slowQueryPercentage: `${slowQueryPercentage}%`,
      },
      topSlowEndpoints: Object.entries(this.metrics.byEndpoint)
        .map(([endpoint, data]) => ({
          endpoint,
          count: data.count,
          avgDuration: (data.duration / data.count).toFixed(2) + 'ms',
        }))
        .sort((a, b) => parseFloat(b.avgDuration) - parseFloat(a.avgDuration))
        .slice(0, 5),
      topSlowModels: Object.entries(this.metrics.byModel)
        .map(([model, data]) => ({
          model,
          count: data.count,
          avgDuration: (data.duration / data.count).toFixed(2) + 'ms',
        }))
        .sort((a, b) => parseFloat(b.avgDuration) - parseFloat(a.avgDuration))
        .slice(0, 5),
    };
  }

  reset() {
    this.metrics = {
      totalRequests: 0,
      totalDuration: 0,
      slowQueries: 0,
      fastQueries: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      byEndpoint: {},
      byModel: {},
    };
  }
}

// ============================================
// 3. PERFORMANCE MIDDLEWARE
// ============================================

function createPerformanceMonitoringMiddleware(metrics) {
  return (req, res, next) => {
    const start = Date.now();

    // تجاوز الاستجابة الأصلية
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - start;

      metrics.recordQuery(req.path, req.body?.model || 'Unknown', duration);

      // إضافة header للأداء
      res.set('X-Response-Time', `${duration}ms`);

      // حذر إذا كانت بطيئة
      if (duration > 1000) {
        console.warn(`⚠️ SLOW REQUEST: ${req.method} ${req.path} - ${duration}ms`);
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

// ============================================
// 4. API ENDPOINTS FOR MONITORING
// ============================================

function setupMonitoringRoutes(router, metrics, slowQueryLogger) {
  /**
   * GET /api/monitoring/performance
   * الحصول على تقرير الأداء الحالي
   */
  router.get('/api/monitoring/performance', (req, res) => {
    const report = metrics.getReport();
    res.json({
      timestamp: new Date().toISOString(),
      performance: report,
      status: 'success',
    });
  });

  /**
   * GET /api/monitoring/slow-queries
   * الحصول على قائمة الاستعلامات البطيئة
   */
  router.get('/api/monitoring/slow-queries', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const slowQueries = slowQueryLogger.getSlowQueries().slice(-limit);

    res.json({
      timestamp: new Date().toISOString(),
      totalSlow: slowQueries.length,
      queries: slowQueries,
      status: 'success',
    });
  });

  /**
   * GET /api/monitoring/health
   * الحصول على صحة النظام
   */
  router.get('/api/monitoring/health', (req, res) => {
    const report = metrics.getReport();
    const slowPercentage = parseFloat(report.summary.slowQueryPercentage);

    const health = {
      status: slowPercentage < 5 ? 'healthy' : slowPercentage < 20 ? 'warning' : 'critical',
      slowQueryPercentage: slowPercentage,
      recommendations: [],
    };

    if (slowPercentage > 20) {
      health.recommendations.push('❌ More than 20% of queries are slow');
      health.recommendations.push('💡 Consider implementing query optimization');
    }

    if (slowPercentage > 5) {
      health.recommendations.push('⚠️ Some slow queries detected');
      health.recommendations.push('💡 Review top slow endpoints');
    } else {
      health.recommendations.push('✅ All queries are performing well');
    }

    res.json({
      timestamp: new Date().toISOString(),
      health,
      metrics: report,
      status: 'success',
    });
  });

  /**
   * POST /api/monitoring/reset
   * إعادة تعيين المقاييس
   */
  router.post('/api/monitoring/reset', (req, res) => {
    metrics.reset();

    res.json({
      timestamp: new Date().toISOString(),
      message: 'Performance metrics reset successfully',
      status: 'success',
    });
  });

  /**
   * GET /api/monitoring/dashboard
   * لوحة معلومات الأداء
   */
  router.get('/api/monitoring/dashboard', (req, res) => {
    const report = metrics.getReport();

    res.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Performance Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .metric { background: #f0f0f0; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .warning { color: #ff6b00; }
          .critical { color: #ff0000; }
          .good { color: #00cc00; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #4CAF50; color: white; }
        </style>
      </head>
      <body>
        <h1>🚀 Performance Dashboard</h1>
        <div class="metric">
          <h3>Summary</h3>
          <p>Total Requests: <strong>${report.summary.totalRequests}</strong></p>
          <p>Avg Duration: <strong>${report.summary.averageDuration}</strong></p>
          <p class="warning">Slow Queries: <strong>${report.summary.slowQueryPercentage}</strong></p>
        </div>
        
        <div class="metric">
          <h3>Top Slow Endpoints</h3>
          <table>
            <tr><th>Endpoint</th><th>Count</th><th>Avg Duration</th></tr>
            ${report.topSlowEndpoints.map(e => `<tr><td>${e.endpoint}</td><td>${e.count}</td><td>${e.avgDuration}</td></tr>`).join('')}
          </table>
        </div>

        <div class="metric">
          <h3>Top Slow Models</h3>
          <table>
            <tr><th>Model</th><th>Count</th><th>Avg Duration</th></tr>
            ${report.topSlowModels.map(m => `<tr><td>${m.model}</td><td>${m.count}</td><td>${m.avgDuration}</td></tr>`).join('')}
          </table>
        </div>
      </body>
      </html>
    `);
  });
}

// ============================================
// 5. USAGE EXAMPLE
// ============================================

const usageExample = `
// في server.js:

const express = require('express');
const { PerformanceMetrics, SlowQueryLogger, createPerformanceMonitoringMiddleware, setupMonitoringRoutes } = require('./advanced-monitoring');

const app = express();
const metrics = new PerformanceMetrics();
const slowQueryLogger = new SlowQueryLogger(100); // log queries > 100ms

// تطبيق middleware
app.use(createPerformanceMonitoringMiddleware(metrics));

// تطبيق routes
setupMonitoringRoutes(app, metrics, slowQueryLogger);

// الآن جميع الـ endpoints يتم مراقبتهم تلقائياً!
`;

// ============================================
// 6. DASHBOARD ALERTS
// ============================================

class PerformanceAlerting {
  constructor() {
    this.alerts = [];
    this.alertThresholds = {
      slowQueryPercentage: 20, // %
      avgResponseTime: 500, // ms
      maxResponseTime: 5000, // ms
    };
  }

  checkMetrics(metrics) {
    const report = metrics.getReport();
    const slowPercent = parseFloat(report.summary.slowQueryPercentage);
    const avgDuration = parseFloat(report.summary.averageDuration);
    const maxDuration = parseFloat(report.summary.maxDuration);

    if (slowPercent > this.alertThresholds.slowQueryPercentage) {
      this.alerts.push({
        level: 'warning',
        message: `${slowPercent}% of queries are slow`,
        timestamp: new Date(),
      });
    }

    if (avgDuration > this.alertThresholds.avgResponseTime) {
      this.alerts.push({
        level: 'warning',
        message: `Average response time is ${avgDuration.toFixed(0)}ms`,
        timestamp: new Date(),
      });
    }

    if (maxDuration > this.alertThresholds.maxResponseTime) {
      this.alerts.push({
        level: 'critical',
        message: `Maximum response time exceeded: ${maxDuration.toFixed(0)}ms`,
        timestamp: new Date(),
      });
    }

    return this.alerts;
  }

  getAlerts() {
    return this.alerts.slice(-10); // آخر 10 تنبيهات
  }
}

module.exports = {
  SlowQueryLogger,
  PerformanceMetrics,
  createPerformanceMonitoringMiddleware,
  setupMonitoringRoutes,
  PerformanceAlerting,
  usageExample,
};
