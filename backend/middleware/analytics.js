const logger = require('../utils/logger');

/**
 * Advanced Analytics Middleware
 * Collects and tracks application metrics
 */
class Analytics {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        byMethod: {},
        byRoute: {},
        byStatus: {},
      },
      performance: {
        avgResponseTime: 0,
        slowRequests: [],
        fastestRequest: Infinity,
        slowestRequest: 0,
      },
      errors: {
        total: 0,
        byType: {},
        byRoute: {},
      },
      users: {
        activeUsers: new Set(),
        totalSessions: 0,
        loginAttempts: 0,
      },
      system: {
        uptime: Date.now(),
        memoryUsage: [],
        cpuUsage: [],
      },
    };
  }

  /**
   * Track request metrics
   */
  trackRequest = (req, res, duration) => {
    const { method, path, user, ip } = req;
    const { statusCode } = res;

    // Total requests
    this.metrics.requests.total++;

    // By method
    this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;

    // By route
    const route = this.normalizeRoute(path);
    this.metrics.requests.byRoute[route] = {
      count: (this.metrics.requests.byRoute[route]?.count || 0) + 1,
      avgTime: this.calculateAverage(
        this.metrics.requests.byRoute[route]?.avgTime || 0,
        duration,
        this.metrics.requests.byRoute[route]?.count || 0
      ),
    };

    // By status
    const statusCategory = Math.floor(statusCode / 100) * 100;
    this.metrics.requests.byStatus[statusCode] =
      (this.metrics.requests.byStatus[statusCode] || 0) + 1;

    // Performance tracking
    this.trackPerformance(duration, route, statusCode);

    // User tracking
    if (user) {
      this.metrics.users.activeUsers.add(user.id);
    }
  };

  /**
   * Track performance metrics
   */
  trackPerformance = (duration, route, statusCode) => {
    const { performance } = this.metrics;

    // Update average response time
    performance.avgResponseTime = this.calculateAverage(
      performance.avgResponseTime,
      duration,
      this.metrics.requests.total - 1
    );

    // Track slow requests
    if (duration > 1000) {
      // > 1 second
      performance.slowRequests.push({
        route,
        duration,
        timestamp: new Date(),
        statusCode,
      });

      // Keep only last 100 slow requests
      if (performance.slowRequests.length > 100) {
        performance.slowRequests.shift();
      }
    }

    // Update fastest/slowest
    performance.fastestRequest = Math.min(performance.fastestRequest, duration);
    performance.slowestRequest = Math.max(performance.slowestRequest, duration);
  };

  /**
   * Track errors
   */
  trackError = (error, req) => {
    this.metrics.errors.total++;

    const errorType = error.name || 'Unknown';
    this.metrics.errors.byType[errorType] = (this.metrics.errors.byType[errorType] || 0) + 1;

    const route = this.normalizeRoute(req.path);
    this.metrics.errors.byRoute[route] = (this.metrics.errors.byRoute[route] || 0) + 1;
  };

  /**
   * Track user activity
   */
  trackUserActivity = (userId, action) => {
    if (action === 'login') {
      this.metrics.users.activeUsers.add(userId);
      this.metrics.users.totalSessions++;
      this.metrics.users.loginAttempts++;
    } else if (action === 'logout') {
      this.metrics.users.activeUsers.delete(userId);
    }
  };

  /**
   * Get analytics summary
   */
  getSummary = () => {
    const uptime = Date.now() - this.metrics.system.uptime;

    return {
      requests: {
        total: this.metrics.requests.total,
        perSecond: (this.metrics.requests.total / (uptime / 1000)).toFixed(2),
        byMethod: this.metrics.requests.byMethod,
        byStatus: this.metrics.requests.byStatus,
        topRoutes: this.getTopRoutes(5),
      },
      performance: {
        avgResponseTime: this.metrics.performance.avgResponseTime.toFixed(2) + 'ms',
        fastestRequest: this.metrics.performance.fastestRequest + 'ms',
        slowestRequest: this.metrics.performance.slowestRequest + 'ms',
        slowRequests: this.metrics.performance.slowRequests.length,
      },
      errors: {
        total: this.metrics.errors.total,
        byType: this.metrics.errors.byType,
        errorRate:
          ((this.metrics.errors.total / this.metrics.requests.total) * 100).toFixed(2) + '%',
        topErrorRoutes: this.getTopErrorRoutes(5),
      },
      users: {
        activeNow: this.metrics.users.activeUsers.size,
        totalSessions: this.metrics.users.totalSessions,
        loginAttempts: this.metrics.users.loginAttempts,
      },
      system: {
        uptime: this.formatUptime(uptime),
        uptimeMs: uptime,
      },
    };
  };

  /**
   * Reset analytics
   */
  reset = () => {
    this.metrics.system.uptime = Date.now();
    logger.info('Analytics reset');
  };

  /**
   * Helper methods
   */
  normalizeRoute = path => {
    return path.replace(/\/\d+/g, '/:id').split('?')[0];
  };

  calculateAverage = (currentAvg, newValue, count) => {
    return (currentAvg * count + newValue) / (count + 1);
  };

  getTopRoutes = limit => {
    return Object.entries(this.metrics.requests.byRoute)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, limit)
      .map(([route, data]) => ({ route, ...data }));
  };

  getTopErrorRoutes = limit => {
    return Object.entries(this.metrics.errors.byRoute)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([route, count]) => ({ route, count }));
  };

  formatUptime = ms => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  /**
   * Export metrics for visualization
   */
  exportMetrics = () => {
    return {
      timestamp: new Date().toISOString(),
      ...this.getSummary(),
    };
  };
}

module.exports = new Analytics();
