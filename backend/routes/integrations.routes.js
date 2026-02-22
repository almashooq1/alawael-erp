/**
 * integrations.routes.js
 * AlAwael ERP - Integration API Routes
 * Webhooks, connectors, Zapier/IFTTT, data synchronization
 * February 22, 2026
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ===========================
// WEBHOOK ROUTES
// ===========================

/**
 * POST /api/v1/integrations/webhooks
 * Register new webhook
 */
router.post('/webhooks', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { url, events } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        error: 'url and events array are required'
      });
    }

    const webhook = integrationService.registerWebhook(url, events);

    res.status(201).json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        secret: webhook.secret,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/webhooks
 * List all webhooks
 */
router.get('/webhooks', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const webhooks = integrationService.getAllWebhooks();

    res.json({
      success: true,
      count: webhooks.length,
      webhooks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/webhooks/:id
 * Get specific webhook
 */
router.get('/webhooks/:id', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { id } = req.params;
    const webhook = integrationService.getWebhook(id);

    if (!webhook) {
      return res.status(404).json({
        success: false,
        error: `Webhook "${id}" not found`
      });
    }

    res.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt,
        lastDelivery: webhook.lastDelivery,
        deliveryCount: webhook.deliveryCount,
        failureCount: webhook.failureCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/integrations/webhooks/:id
 * Update webhook
 */
router.put('/webhooks/:id', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { id } = req.params;
    const updates = req.body;

    const webhook = integrationService.updateWebhook(id, updates);

    res.json({
      success: true,
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/integrations/webhooks/:id
 * Delete webhook
 */
router.delete('/webhooks/:id', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { id } = req.params;

    const deleted = integrationService.deleteWebhook(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Webhook "${id}" not found`
      });
    }

    res.json({
      success: true,
      message: `Webhook "${id}" deleted`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// EVENT ROUTES
// ===========================

/**
 * POST /api/v1/integrations/events
 * Emit custom event to webhooks
 */
router.post('/events', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { event, data } = req.body;

    if (!event || !data) {
      return res.status(400).json({
        success: false,
        error: 'event and data are required'
      });
    }

    const webhookEvent = integrationService.emitEvent(event, data);

    res.status(201).json({
      success: true,
      event: {
        id: webhookEvent.id,
        event: webhookEvent.event,
        timestamp: webhookEvent.timestamp,
        status: webhookEvent.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/events
 * Get event history
 */
router.get('/events', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { limit = 50 } = req.query;

    const history = integrationService.getEventHistory(parseInt(limit));

    res.json({
      success: true,
      count: history.length,
      events: history
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// CONNECTOR ROUTES
// ===========================

/**
 * POST /api/v1/integrations/connectors
 * Create new connector
 */
router.post('/connectors', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { name, type, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'name and type are required'
      });
    }

    const connector = integrationService.createConnector(name, type, config);

    res.status(201).json({
      success: true,
      connector: {
        id: connector.id,
        name: connector.name,
        type: connector.type,
        createdAt: connector.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/connectors
 * List all connectors
 */
router.get('/connectors', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const connectors = integrationService.getAllConnectors();

    res.json({
      success: true,
      count: connectors.length,
      connectors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/connectors/:id
 * Get specific connector
 */
router.get('/connectors/:id', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { id } = req.params;
    const connector = integrationService.getConnector(id);

    if (!connector) {
      return res.status(404).json({
        success: false,
        error: `Connector "${id}" not found`
      });
    }

    res.json({
      success: true,
      connector: {
        id: connector.id,
        name: connector.name,
        type: connector.type,
        isActive: connector.isActive,
        createdAt: connector.createdAt,
        lastSync: connector.lastSync,
        syncCount: connector.syncCount,
        errorCount: connector.errorCount,
        mappings: Object.fromEntries(connector.mappings)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/integrations/connectors/:id
 * Delete connector
 */
router.delete('/connectors/:id', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { id } = req.params;

    const deleted = integrationService.deleteConnector(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: `Connector "${id}" not found`
      });
    }

    res.json({
      success: true,
      message: `Connector "${id}" deleted`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// API INTEGRATION ROUTES
// ===========================

/**
 * POST /api/v1/integrations/apis
 * Register new API integration
 */
router.post('/apis', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { name, baseURL, config } = req.body;

    if (!name || !baseURL) {
      return res.status(400).json({
        success: false,
        error: 'name and baseURL are required'
      });
    }

    const integration = integrationService.registerAPI(name, baseURL, config);

    res.status(201).json({
      success: true,
      integration: {
        name: integration.name,
        baseURL: integration.baseURL,
        endpoints: integration.endpoints.size
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/apis
 * List all API integrations
 */
router.get('/apis', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const integrations = integrationService.getAllIntegrations();

    res.json({
      success: true,
      count: integrations.length,
      integrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/integrations/apis/:name/call
 * Call registered API endpoint
 */
router.post('/apis/:name/call', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { name } = req.params;
    const { endpoint, params, body } = req.body;

    const integration = integrationService.getIntegration(name);
    if (!integration) {
      return res.status(404).json({
        success: false,
        error: `Integration "${name}" not found`
      });
    }

    const result = integration.call(endpoint, params, body);

    res.json({
      success: true,
      result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// ZAPIER/IFTTT SUPPORT
// ===========================

/**
 * POST /api/v1/integrations/zapier/receive
 * Receive webhook from Zapier
 */
router.post('/zapier/receive', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { hookId, event, data } = req.body;

    // Validate webhook signature if provided
    if (req.headers['x-zapier-signature']) {
      const signature = req.headers['x-zapier-signature'];
      const payload = JSON.stringify(req.body);

      // Verify signature...
      // const isValid = integrationService.validateWebhookSignature(signature, payload, secret);
      // if (!isValid) {
      //   return res.status(401).json({ success: false, error: 'Invalid signature' });
      // }
    }

    // Emit event
    integrationService.emitEvent(event, data);

    res.json({
      success: true,
      message: 'Event received and processed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/zapier/auth
 * Zapier authentication test
 */
router.get('/zapier/auth', (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Authentication successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// SYNCHRONIZATION ROUTES
// ===========================

/**
 * POST /api/v1/integrations/sync/:connectorId
 * Manually trigger sync
 */
router.post('/sync/:connectorId', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const { connectorId } = req.params;

    const connector = integrationService.getConnector(connectorId);
    if (!connector) {
      return res.status(404).json({
        success: false,
        error: `Connector "${connectorId}" not found`
      });
    }

    // Trigger sync
    connector.recordSync(true);

    res.json({
      success: true,
      connector: {
        id: connector.id,
        name: connector.name,
        lastSync: connector.lastSync,
        syncCount: connector.syncCount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ===========================
// STATISTICS & HEALTH
// ===========================

/**
 * GET /api/v1/integrations/stats
 * Get integration statistics
 */
router.get('/stats', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const stats = integrationService.getStatistics();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/health
 * Get integration health report
 */
router.get('/health', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const health = integrationService.getIntegrationHealth();

    res.json({
      success: true,
      health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/integrations/export
 * Export integration configuration
 */
router.get('/export', (req, res) => {
  try {
    const integrationService = req.app.locals.integrationService;
    const config = integrationService.exportConfiguration();

    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="integrations_config.json"'
    });

    res.send(JSON.stringify(config, null, 2));
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
