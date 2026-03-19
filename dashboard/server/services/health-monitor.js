/**
 * Advanced Health Monitoring Service
 * Monitors system health and performance
 */

const os = require('os');
const { performance } = require('perf_hooks');
const { cache, getCacheStats } = require('../middleware/cache');

class HealthMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.slowRequestCount = 0;
    this.lastHealthCheck = null;
    this.healthHistory = [];
    this.maxHistorySize = 100;
    this.memorySamples = [];
    this.maxMemorySamples = 5;
    this.memoryWarnStreak = 0;
    this.memoryWarnStreakThreshold = parseInt(
      process.env.HEALTH_MEMORY_WARN_STREAK_THRESHOLD || '3',
      10
    );

    this.memoryWarnThreshold = parseFloat(process.env.HEALTH_MEMORY_WARN_THRESHOLD || '90');
    this.memoryFailThreshold = parseFloat(process.env.HEALTH_MEMORY_FAIL_THRESHOLD || '98');

    if (os.platform() === 'win32' && !process.env.HEALTH_MEMORY_WARN_THRESHOLD) {
      this.memoryWarnThreshold = 94;
    }
  }

  /**
   * Increment request counter
   */
  recordRequest() {
    this.requestCount++;
  }

  /**
   * Record error
   */
  recordError() {
    this.errorCount++;
  }

  /**
   * Record slow request
   */
  recordSlowRequest() {
    this.slowRequestCount++;
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus() {
    const now = Date.now();
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: {
        seconds: uptime,
        readable: this.formatUptime(uptime),
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
        loadAverage: os.loadavg(),
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        memory: {
          heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
          heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
          external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
          rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        },
        cpu: {
          user: `${(cpuUsage.user / 1000000).toFixed(2)}ms`,
          system: `${(cpuUsage.system / 1000000).toFixed(2)}ms`,
        },
      },
      metrics: {
        totalRequests: this.requestCount,
        totalErrors: this.errorCount,
        slowRequests: this.slowRequestCount,
        errorRate:
          this.requestCount > 0
            ? ((this.errorCount / this.requestCount) * 100).toFixed(2) + '%'
            : '0%',
        requestsPerMinute: this.calculateRequestsPerMinute(),
      },
      cache: this.getCacheHealth(),
      checks: await this.runHealthChecks(),
    };

    // Determine overall health status
    health.status = this.determineHealthStatus(health);

    // Store in history
    this.healthHistory.push({
      timestamp: now,
      status: health.status,
      memory: memory.heapUsed,
      requests: this.requestCount,
    });

    // Limit history size
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory.shift();
    }

    this.lastHealthCheck = health;
    return health;
  }

  /**
   * Run health checks
   */
  async runHealthChecks() {
    const checks = [];

    // Memory check
    const memory = process.memoryUsage();
    const heapUsedPercent = (memory.heapUsed / memory.heapTotal) * 100;
    this.memorySamples.push(heapUsedPercent);
    if (this.memorySamples.length > this.maxMemorySamples) {
      this.memorySamples.shift();
    }

    const averagedHeapUsedPercent =
      this.memorySamples.reduce((sum, value) => sum + value, 0) / this.memorySamples.length;

    checks.push({
      name: 'Memory Usage',
      status:
        averagedHeapUsedPercent < this.memoryWarnThreshold
          ? 'pass'
          : averagedHeapUsedPercent < this.memoryFailThreshold
            ? 'warn'
            : 'fail',
      value: `${heapUsedPercent.toFixed(2)}% (avg ${averagedHeapUsedPercent.toFixed(2)}%)`,
      threshold: `< ${this.memoryWarnThreshold}%`,
    });

    const memoryCheck = checks.find(check => check.name === 'Memory Usage');
    if (memoryCheck?.status === 'warn') {
      this.memoryWarnStreak++;
    } else {
      this.memoryWarnStreak = 0;
    }

    // CPU check
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    checks.push({
      name: 'CPU Load',
      status: cpuUsage < 0.7 ? 'pass' : cpuUsage < 0.9 ? 'warn' : 'fail',
      value: `${(cpuUsage * 100).toFixed(2)}%`,
      threshold: '< 70%',
    });

    // Error rate check
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;
    checks.push({
      name: 'Error Rate',
      status: errorRate < 5 ? 'pass' : errorRate < 10 ? 'warn' : 'fail',
      value: `${errorRate.toFixed(2)}%`,
      threshold: '< 5%',
    });

    // Uptime check
    const uptime = process.uptime();
    checks.push({
      name: 'Uptime',
      status: 'pass',
      value: this.formatUptime(uptime),
      threshold: 'N/A',
    });

    return checks;
  }

  /**
   * Determine overall health status
   */
  determineHealthStatus(health) {
    const failedChecks = health.checks.filter(c => c.status === 'fail');
    const warnChecks = health.checks.filter(c => c.status === 'warn');

    if (failedChecks.length > 0) return 'unhealthy';
    if (warnChecks.length === 1 && warnChecks[0].name === 'Memory Usage') {
      return this.memoryWarnStreak >= this.memoryWarnStreakThreshold ? 'degraded' : 'healthy';
    }
    if (warnChecks.length > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Get cache health metrics
   */
  getCacheHealth() {
    try {
      const stats = getCacheStats();
      return {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitRate:
          stats.hits + stats.misses > 0
            ? `${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)}%`
            : '0%',
        ksize: stats.ksize,
        vsize: stats.vsize,
      };
    } catch (error) {
      return { error: 'Cache stats unavailable' };
    }
  }

  /**
   * Calculate requests per minute
   */
  calculateRequestsPerMinute() {
    const uptimeMinutes = process.uptime() / 60;
    return uptimeMinutes > 0 ? (this.requestCount / uptimeMinutes).toFixed(2) : 0;
  }

  /**
   * Format uptime in readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Get health history
   */
  getHealthHistory() {
    return this.healthHistory;
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.slowRequestCount = 0;
    this.healthHistory = [];
  }

  /**
   * Get system metrics for monitoring
   */
  getSystemMetrics() {
    return {
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100,
      },
      cpu: {
        count: os.cpus().length,
        loadAverage: os.loadavg(),
        model: os.cpus()[0].model,
      },
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
      },
    };
  }
}

// Singleton instance
const healthMonitor = new HealthMonitor();

/**
 * Middleware to track requests
 */
function healthMiddleware(req, res, next) {
  healthMonitor.recordRequest();

  const startTime = performance.now();

  res.on('finish', () => {
    // Track errors
    if (res.statusCode >= 500) {
      healthMonitor.recordError();
    }

    // Track slow requests
    const duration = performance.now() - startTime;
    if (duration > 1000) {
      healthMonitor.recordSlowRequest();
    }
  });

  next();
}

module.exports = {
  healthMonitor,
  healthMiddleware,
  HealthMonitor,
};
