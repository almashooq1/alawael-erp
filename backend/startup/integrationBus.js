/**
 * startup/integrationBus.js — Cross-module event-driven integration
 * ═══════════════════════════════════════════════════════════════════
 * Extracted from app.js for maintainability.
 *
 * Initializes: Integration bus, module connector, domain event contracts,
 *   DDD subscribers, notification triggers, workflow automations,
 *   scheduled jobs, webhook dispatcher, and integration API routes.
 */

const logger = require('../utils/logger');
const {
  integrationBus,
  mountIntegrationBusRoutes,
} = require('../integration/systemIntegrationBus');
const { moduleConnector, mountModuleConnectorRoutes } = require('../integration/moduleConnector');
const { mountIntegrationContextRoutes } = require('../middleware/integrationContext.middleware');
const { initializeCrossModuleSubscribers } = require('../integration/crossModuleSubscribers');
const { ALL_CONTRACTS } = require('../events/contracts/domainEventContracts');

/**
 * Initialize the full integration bus and mount its API routes.
 *
 * @param {import('express').Application} app
 */
function setupIntegrationBus(app) {
  try {
    // Initialize the integration bus with existing infrastructure singletons
    const { eventStore } = require('../infrastructure/eventStore');
    const { getMessageQueue } = require('../infrastructure/messageQueue');
    const socketEmitter = (() => {
      try {
        return require('../utils/socketEmitter');
      } catch {
        return null;
      }
    })();

    integrationBus.initialize({
      eventStore,
      messageQueue: getMessageQueue(),
      socketEmitter,
    });

    // Register all domain event contracts
    for (const [domain, contracts] of Object.entries(ALL_CONTRACTS)) {
      const events = Object.values(contracts).map(c => c.eventType);
      integrationBus.registerDomain(domain, { version: '1.0.0', events });
    }

    // Register DDD rehabilitation domain event contracts (20 domains, 37 events)
    try {
      const { DDD_CONTRACTS } = require('../events/contracts/dddEventContracts');
      for (const [domain, contracts] of Object.entries(DDD_CONTRACTS)) {
        const events = Object.values(contracts).map(c => c.eventType);
        integrationBus.registerDomain(`ddd:${domain}`, { version: '1.0.0', events });
      }
      logger.info('[Integration] ✓ DDD rehabilitation event contracts registered');
    } catch (dddErr) {
      logger.warn('[Integration] DDD event contracts skipped:', dddErr.message);
    }

    // Initialize the module connector
    moduleConnector.initialize({ integrationBus });

    // Wire cross-module subscribers
    initializeCrossModuleSubscribers(integrationBus, moduleConnector);

    // Wire DDD rehabilitation cross-domain subscribers (16 event flows)
    try {
      const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
      initializeDDDSubscribers(integrationBus, moduleConnector);
      logger.info('[Integration] ✓ DDD cross-domain subscribers wired');
    } catch (dddSubErr) {
      logger.warn('[Integration] DDD subscribers skipped:', dddSubErr.message);
    }

    // Wire DDD notification triggers (10 notification rules)
    try {
      const { initializeDDDNotifications } = require('../integration/dddNotificationTriggers');
      initializeDDDNotifications(integrationBus);
      logger.info('[Integration] ✓ DDD notification triggers wired');
    } catch (dddNotifErr) {
      logger.warn('[Integration] DDD notifications skipped:', dddNotifErr.message);
    }

    // Wire DDD workflow automations (Phase 4 — 12 automation rules)
    try {
      const { initializeDDDAutomations } = require('../integration/dddWorkflowAutomations');
      initializeDDDAutomations(integrationBus);
      logger.info('[Integration] ✓ DDD workflow automations wired');
    } catch (dddAutoErr) {
      logger.warn('[Integration] DDD automations skipped:', dddAutoErr.message);
    }

    // Initialize DDD scheduled jobs (Phase 4 — 6 cron jobs)
    try {
      const { initializeDDDScheduler } = require('../services/dddScheduler');
      initializeDDDScheduler();
      logger.info('[Integration] ✓ DDD scheduler initialized');
    } catch (dddSchedErr) {
      logger.warn('[Integration] DDD scheduler skipped:', dddSchedErr.message);
    }

    // Wire DDD webhook dispatcher (Phase 5 — external webhook bridge)
    try {
      const { initializeDDDWebhooks } = require('../integration/dddWebhookDispatcher');
      initializeDDDWebhooks(integrationBus);
      logger.info('[Integration] ✓ DDD webhook dispatcher wired');
    } catch (dddWhErr) {
      logger.warn('[Integration] DDD webhook dispatcher skipped:', dddWhErr.message);
    }

    // Mount integration API routes
    mountIntegrationBusRoutes(app);
    mountModuleConnectorRoutes(app);
    mountIntegrationContextRoutes(app);

    logger.info('[Integration] ✓ System integration bus initialized successfully');
  } catch (err) {
    logger.warn('[Integration] Integration bus initialization skipped:', err.message);
  }
}

module.exports = { setupIntegrationBus };
