/**
 * Integration Manager
 * مدير التكامل الموحد - نقطة مركزية لجميع الموصلات الخارجية
 *
 * الاستخدام:
 * const integrations = new IntegrationManager(config);
 * await integrations.gov.verifyCitizen(...);
 * await integrations.insurance.submitClaim(...);
 * await integrations.lab.submitOrder(...);
 */

const GovernmentConnector = require('./government-connector');
const InsuranceConnector = require('./insurance-connector');
const LabConnector = require('./lab-connector');
const EventEmitter = require('events');
const pino = require('pino');

class IntegrationManager extends EventEmitter {
  constructor(config = {}) {
    super();

    // Initialize logger
    this.logger = pino({
      level: config.logLevel || 'info',
      transport: {
        target: 'pino-pretty',
        options: { colorize: true },
      },
    });

    // Initialize connectors
    this.gov = new GovernmentConnector(config.government || {});
    this.insurance = new InsuranceConnector(config.insurance || {});
    this.lab = new LabConnector(config.lab || {});

    // Track metrics
    this.metrics = {
      gov: { requests: 0, failures: 0 },
      insurance: { requests: 0, failures: 0 },
      lab: { requests: 0, failures: 0 },
    };

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for all connectors
   */
  setupEventListeners() {
    // Government connector events
    this.gov.on('operation-failed', ({ operation, error }) => {
      this.metrics.gov.failures++;
      this.logger.error({ connector: 'gov', operation, error });
      this.emit('integration-error', { connector: 'gov', operation, error });
    });

    // Insurance connector events
    this.insurance.on('operation-failed', ({ operation, error }) => {
      this.metrics.insurance.failures++;
      this.logger.error({ connector: 'insurance', operation, error });
      this.emit('integration-error', { connector: 'insurance', operation, error });
    });

    this.insurance.on('claim-approved', data => {
      this.emit('claim-approved', data);
      this.logger.info({ event: 'claim-approved', ...data });
    });

    this.insurance.on('claim-rejected', data => {
      this.emit('claim-rejected', data);
      this.logger.warn({ event: 'claim-rejected', ...data });
    });

    // Lab connector events
    this.lab.on('operation-failed', ({ operation, error }) => {
      this.metrics.lab.failures++;
      this.logger.error({ connector: 'lab', operation, error });
      this.emit('integration-error', { connector: 'lab', operation, error });
    });

    this.lab.on('poison-queue', entry => {
      this.logger.warn({ event: 'poison-queue', ...entry });
      this.emit('poison-queue', entry);
    });

    this.lab.on('reconciliation-timeout', ({ orderId }) => {
      this.logger.error({ event: 'reconciliation-timeout', orderId });
      this.emit('reconciliation-timeout', { orderId });
    });
  }

  /**
   * Perform health check on all integrations
   */
  async healthCheck() {
    const results = {
      timestamp: new Date().toISOString(),
      government: null,
      insurance: null,
      laboratory: null,
      overallStatus: 'healthy',
    };

    try {
      results.government = await this.gov.healthCheck();
    } catch (error) {
      results.government = { healthy: false, error: error.message };
      results.overallStatus = 'degraded';
    }

    try {
      results.insurance = await this.insurance.healthCheck();
    } catch (error) {
      results.insurance = { healthy: false, error: error.message };
      results.overallStatus = 'degraded';
    }

    try {
      results.laboratory = await this.lab.healthCheck();
    } catch (error) {
      results.laboratory = { healthy: false, error: error.message };
      results.overallStatus = 'degraded';
    }

    // Check if all are down
    if (!results.government.healthy && !results.insurance.healthy && !results.laboratory.healthy) {
      results.overallStatus = 'unhealthy';
    }

    this.logger.info({ event: 'health-check', ...results });
    return results;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      timestamp: new Date().toISOString(),
      connectors: this.metrics,
      uptime: process.uptime(),
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      gov: { requests: 0, failures: 0 },
      insurance: { requests: 0, failures: 0 },
      lab: { requests: 0, failures: 0 },
    };
  }

  /**
   * Initialize background tasks
   */
  startBackgroundTasks() {
    // Health check every 5 minutes
    this.healthCheckInterval = setInterval(
      async () => {
        try {
          await this.healthCheck();
        } catch (error) {
          this.logger.error({ event: 'health-check-failed', error: error.message });
        }
      },
      5 * 60 * 1000
    );

    // Lab reconciliation every 1 hour
    this.reconciliationInterval = setInterval(
      async () => {
        try {
          const result = await this.lab.reconcilePendingOrders();
          this.logger.info({ event: 'reconciliation-completed', ...result });
        } catch (error) {
          this.logger.error({ event: 'reconciliation-failed', error: error.message });
        }
      },
      60 * 60 * 1000
    );

    this.logger.info('Background tasks started');
  }

  /**
   * Stop background tasks
   */
  stopBackgroundTasks() {
    if (this.healthCheckInterval) clearInterval(this.healthCheckInterval);
    if (this.reconciliationInterval) clearInterval(this.reconciliationInterval);
    this.logger.info('Background tasks stopped');
  }

  /**
   * Close all connections
   */
  async shutdown() {
    this.stopBackgroundTasks();
    // Add cleanup logic if needed
    this.logger.info('Integration manager shut down');
  }
}

module.exports = IntegrationManager;
