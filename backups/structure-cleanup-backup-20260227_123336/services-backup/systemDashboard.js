/**
 * Integrated System Dashboard Service
 * Central monitoring and orchestration
 * Phase 11: System Integration
 */

const logger = require('../utils/logger');
const searchEngine = require('./searchEngine');
const validator = require('./validator');

class SystemDashboard {
  constructor() {
    this.metrics = {
      system: {
        startTime: new Date(),
        uptime: 0,
        status: 'initializing',
      },
      services: {},
      performance: {
        averageResponseTime: 0,
        requestsProcessed: 0,
        errorsEncountered: 0,
        cacheHitRate: 0,
      },
      integrations: {
        mongodb: { status: 'disconnected', latency: 0 },
        redis: { status: 'disconnected', latency: 0 },
        elasticsearch: { status: 'disconnected', latency: 0 },
        websocket: { status: 'disconnected', connections: 0 },
      },
    };

    this.alerts = [];
    this.events = [];
  }

  /**
   * Initialize system components
   */
  async initialize() {
    try {
      logger.info('🚀 System Dashboard: Initializing components...');

      // Initialize services
      this.metrics.services = {
        search: { status: 'active', endpoints: 6 },
        validation: { status: 'active', endpoints: 7 },
        response: { status: 'active', methods: 18 },
        auth: { status: 'active', methods: 3 },
        analytics: { status: 'active', metrics: 5 },
      };

      this.metrics.system.status = 'ready';

      logger.info('✅ System Dashboard: Initialization complete');
      return true;
    } catch (error) {
      logger.error('❌ System Dashboard: Initialization failed', error);
      return false;
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth() {
    const uptime = (Date.now() - this.metrics.system.startTime.getTime()) / 1000;

    return {
      status: this.metrics.system.status,
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      services: Object.entries(this.metrics.services).map(([name, data]) => ({
        name,
        ...data,
      })),
      integrations: this.metrics.integrations,
      performance: this.metrics.performance,
      alerts: this.alerts.length,
      events: this.events.length,
    };
  }

  /**
   * Check service status
   */
  checkServiceStatus(serviceName) {
    const service = this.metrics.services[serviceName];
    if (!service) {
      return { status: 'unknown', message: `Service ${serviceName} not found` };
    }
    return service;
  }

  /**
   * Update integration status
   */
  async updateIntegrationStatus(integrationName, status, latency = 0) {
    if (this.metrics.integrations[integrationName]) {
      this.metrics.integrations[integrationName] = {
        status,
        latency,
        lastChecked: new Date().toISOString(),
      };

      const event = {
        timestamp: new Date().toISOString(),
        type: 'integration_update',
        integration: integrationName,
        status,
      };
      this.events.push(event);

      if (this.events.length > 100) {
        this.events.shift();
      }
    }
  }

  /**
   * Record performance metric
   */
  recordMetric(responseTime, success = true) {
    this.metrics.performance.requestsProcessed++;

    if (!success) {
      this.metrics.performance.errorsEncountered++;
    }

    const total = this.metrics.performance.requestsProcessed;
    const avg = this.metrics.performance.averageResponseTime;
    this.metrics.performance.averageResponseTime = (avg + responseTime) / 2;
  }

  /**
   * Add system alert
   */
  addAlert(severity, message, details = {}) {
    const alert = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      severity,
      message,
      details,
    };

    this.alerts.push(alert);
    logger.warn(`[${severity}] ${message}`);

    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts.shift();
    }

    return alert;
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary() {
    const serviceCount = Object.keys(this.metrics.services).length;
    const activeServices = Object.values(this.metrics.services).filter(
      s => s.status === 'active'
    ).length;
    const integrationCount = Object.keys(this.metrics.integrations).length;
    const connectedIntegrations = Object.values(this.metrics.integrations).filter(
      i => i.status === 'connected'
    ).length;

    return {
      summary: {
        serviceHealth: `${activeServices}/${serviceCount} active`,
        integrationHealth: `${connectedIntegrations}/${integrationCount} connected`,
        systemStatus: this.metrics.system.status,
        criticalAlerts: this.alerts.filter(a => a.severity === 'critical').length,
        averageResponseTime: `${Math.round(this.metrics.performance.averageResponseTime)}ms`,
        errorRate: `${((this.metrics.performance.errorsEncountered / Math.max(1, this.metrics.performance.requestsProcessed)) * 100).toFixed(2)}%`,
      },
      services: this.metrics.services,
      integrations: this.metrics.integrations,
      recentAlerts: this.alerts.slice(-10),
      recentEvents: this.events.slice(-10),
    };
  }

  /**
   * Export metrics for monitoring systems
   */
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: {
        system: this.metrics.system,
        services: this.metrics.services,
        performance: this.metrics.performance,
        integrations: this.metrics.integrations,
      },
      health: this.getSystemHealth(),
      summary: this.getDashboardSummary(),
    };
  }
}

module.exports = new SystemDashboard();
