/**
 * 📊 Real-time Dashboard System
 *
 * Live metrics and status visualization
 * - System health dashboard
 * - Real-time KPI updates
 * - Service status monitoring
 * - Alert visualization
 */

class DashboardManager {
  constructor() {
    this.metrics = {
      systemHealth: { status: 'healthy', cpu: 0, memory: 0, uptime: 0 },
      services: new Map(),
      activeUsers: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      avgResponseTime: 0,
      cacheHitRate: 0,
      databaseLatency: 0,
      alerts: [],
      recentErrors: [],
    };

    this.updateInterval = 5000; // Update every 5 seconds
    this.subscribers = [];
    this.startMonitoring();
  }

  /**
   * Register WebSocket subscriber
   */
  subscribe(socketId, callback) {
    this.subscribers.push({ socketId, callback });
  }

  /**
   * Unsubscribe from updates
   */
  unsubscribe(socketId) {
    this.subscribers = this.subscribers.filter(s => s.socketId !== socketId);
  }

  /**
   * Update system health metrics
   */
  updateSystemHealth(data) {
    this.metrics.systemHealth = {
      status: data.status || 'healthy',
      cpu: data.cpu || process.cpuUsage().user / 1000000,
      memory: data.memory || process.memoryUsage().heapUsed / 1024 / 1024,
      uptime: process.uptime(),
      timestamp: Date.now(),
    };

    // Determine health status
    if (this.metrics.systemHealth.cpu > 80 || this.metrics.systemHealth.memory > 80) {
      this.metrics.systemHealth.status = 'warning';
    }
    if (this.metrics.systemHealth.cpu > 95 || this.metrics.systemHealth.memory > 95) {
      this.metrics.systemHealth.status = 'critical';
    }
  }

  /**
   * Register service
   */
  registerService(serviceName, config = {}) {
    this.metrics.services.set(serviceName, {
      name: serviceName,
      status: 'healthy',
      uptime: 0,
      requestCount: 0,
      errorCount: 0,
      avgLatency: 0,
      lastCheck: Date.now(),
      config,
    });
  }

  /**
   * Update service health
   */
  updateServiceHealth(serviceName, data) {
    if (!this.metrics.services.has(serviceName)) {
      this.registerService(serviceName);
    }

    const service = this.metrics.services.get(serviceName);
    Object.assign(service, data, { lastCheck: Date.now() });

    // Auto-determine status
    if (data.errorCount && data.requestCount) {
      const errorRate = (data.errorCount / data.requestCount) * 100;
      if (errorRate > 5) service.status = 'warning';
      if (errorRate > 10) service.status = 'critical';
    }
    if (data.avgLatency > 5000) service.status = 'warning';
    if (data.avgLatency > 10000) service.status = 'critical';
  }

  /**
   * Update request metrics
   */
  updateRequestMetrics(metrics) {
    this.metrics.requestsPerSecond = metrics.rps || 0;
    this.metrics.errorRate = metrics.errorRate || 0;
    this.metrics.avgResponseTime = metrics.avgResponseTime || 0;
    this.metrics.cacheHitRate = metrics.cacheHitRate || 0;
    this.metrics.databaseLatency = metrics.dbLatency || 0;
    this.metrics.activeUsers = metrics.activeUsers || 0;
  }

  /**
   * Add alert
   */
  addAlert(alert) {
    this.metrics.alerts.push({
      id: Date.now(),
      timestamp: Date.now(),
      ...alert,
    });

    // Keep only last 100 alerts
    if (this.metrics.alerts.length > 100) {
      this.metrics.alerts.shift();
    }

    // Notify subscribers
    this.notifySubscribers();
  }

  /**
   * Add error to recent errors list
   */
  recordError(error) {
    this.metrics.recentErrors.push({
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      severity: error.severity || 'error',
    });

    // Keep only last 50 errors
    if (this.metrics.recentErrors.length > 50) {
      this.metrics.recentErrors.shift();
    }
  }

  /**
   * Get dashboard data
   */
  getDashboard() {
    return {
      timestamp: Date.now(),
      systemHealth: this.metrics.systemHealth,
      services: Array.from(this.metrics.services.values()),
      metrics: {
        requestsPerSecond: this.metrics.requestsPerSecond,
        errorRate: this.metrics.errorRate,
        avgResponseTime: this.metrics.avgResponseTime,
        cacheHitRate: this.metrics.cacheHitRate,
        databaseLatency: this.metrics.databaseLatency,
        activeUsers: this.metrics.activeUsers,
      },
      alerts: this.metrics.alerts.slice(-20), // Last 20 alerts
      recentErrors: this.metrics.recentErrors.slice(-10), // Last 10 errors
    };
  }

  /**
   * Notify all subscribers
   */
  notifySubscribers() {
    const dashboardData = this.getDashboard();
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.callback(dashboardData);
      } catch (error) {
        console.error('[Dashboard] Notification error:', error.message);
      }
    });
  }

  /**
   * Start automatic monitoring
   */
  startMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.updateSystemHealth({});
      this.notifySubscribers();
    }, this.updateInterval);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * Get service status summary
   */
  getServicesSummary() {
    const services = Array.from(this.metrics.services.values());
    return {
      total: services.length,
      healthy: services.filter(s => s.status === 'healthy').length,
      warning: services.filter(s => s.status === 'warning').length,
      critical: services.filter(s => s.status === 'critical').length,
      services,
    };
  }

  /**
   * Get alert summary
   */
  getAlertsSummary() {
    return {
      total: this.metrics.alerts.length,
      critical: this.metrics.alerts.filter(a => a.severity === 'critical').length,
      warning: this.metrics.alerts.filter(a => a.severity === 'warning').length,
      info: this.metrics.alerts.filter(a => a.severity === 'info').length,
      recent: this.metrics.alerts.slice(-10),
    };
  }
}

/**
 * WebSocket middleware for dashboard
 */
function dashboardMiddleware(dashboardManager) {
  return io => {
    io.on('connection', socket => {
      console.log('[Dashboard] Client connected:', socket.id);

      // Subscribe to dashboard updates
      dashboardManager.subscribe(socket.id, data => {
        socket.emit('dashboard-update', data);
      });

      // Send initial dashboard state
      socket.emit('dashboard-state', dashboardManager.getDashboard());

      // Handle client requests
      socket.on('request-dashboard', () => {
        socket.emit('dashboard-state', dashboardManager.getDashboard());
      });

      socket.on('request-services', () => {
        socket.emit('services-summary', dashboardManager.getServicesSummary());
      });

      socket.on('request-alerts', () => {
        socket.emit('alerts-summary', dashboardManager.getAlertsSummary());
      });

      socket.on('disconnect', () => {
        console.log('[Dashboard] Client disconnected:', socket.id);
        dashboardManager.unsubscribe(socket.id);
      });
    });
  };
}

module.exports = {
  DashboardManager,
  dashboardMiddleware,
};
