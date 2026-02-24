/**
 * Integration Hub Controllers
 * Controllers for connectors, workflows, and marketplace
 */

const IntegrationHubService = require('../services/integrationHub.service');
const Logger = require('../utils/logger');

class IntegrationHubController {
  /**
   * ========== CONNECTORS ==========
   */

  static async registerConnector(req, res) {
    try {
      const { connectorId, name, provider, baseUrl, config, metadata } = req.body;

      if (!connectorId || !name || !provider) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: connectorId, name, provider',
        });
      }

      const result = IntegrationHubService.registerConnector(connectorId, {
        name,
        provider,
        baseUrl,
        config,
        metadata,
      });

      res.status(201).json({
        success: true,
        data: result.connector,
        message: result.message,
      });
    } catch (error) {
      Logger.error(`Register connector error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to register connector',
        error: error.message,
      });
    }
  }

  static async authenticateConnector(req, res) {
    try {
      const { connectorId, apiKey, apiSecret, accessToken, refreshToken, webhookUrl } = req.body;

      if (!connectorId) {
        return res.status(400).json({
          success: false,
          message: 'Missing connectorId',
        });
      }

      const result = await IntegrationHubService.authenticateConnector(connectorId, {
        apiKey,
        apiSecret,
        accessToken,
        refreshToken,
        webhookUrl,
      });

      res.json({
        success: true,
        data: { credentialId: result.credentialId },
        message: result.message,
      });
    } catch (error) {
      Logger.error(`Authenticate connector error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to authenticate connector',
        error: error.message,
      });
    }
  }

  static async getConnectors(req, res) {
    try {
      const connectors = IntegrationHubService.getAllConnectors();

      res.json({
        success: true,
        data: { connectors, count: connectors.length },
      });
    } catch (error) {
      Logger.error(`Get connectors error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve connectors',
        error: error.message,
      });
    }
  }

  static async getConnector(req, res) {
    try {
      const { connectorId } = req.params;
      const connector = IntegrationHubService.getConnector(connectorId);

      if (!connector) {
        return res.status(404).json({
          success: false,
          message: `Connector ${connectorId} not found`,
        });
      }

      res.json({
        success: true,
        data: connector,
      });
    } catch (error) {
      Logger.error(`Get connector error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve connector',
        error: error.message,
      });
    }
  }

  /**
   * ========== WORKFLOWS ==========
   */

  static async createWorkflow(req, res) {
    try {
      const { name, description, trigger, actions, conditions } = req.body;
      const tenantId = req.tenant?.id || req.body.tenantId;
      const userId = req.user?.id || req.body.userId;

      if (!name || !trigger) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, trigger',
        });
      }

      const result = IntegrationHubService.createWorkflow({
        name,
        description,
        trigger,
        actions,
        conditions,
        tenantId,
        createdBy: userId,
      });

      res.status(201).json({
        success: true,
        data: result.workflow,
        message: result.message,
      });
    } catch (error) {
      Logger.error(`Create workflow error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to create workflow',
        error: error.message,
      });
    }
  }

  static async executeWorkflow(req, res) {
    try {
      const { workflowId } = req.params;
      const { triggerData } = req.body;

      if (!workflowId) {
        return res.status(400).json({
          success: false,
          message: 'Missing workflowId',
        });
      }

      const execution = await IntegrationHubService.executeWorkflow(workflowId, triggerData || {});

      res.json({
        success: true,
        data: execution,
        message: `Workflow execution ${execution.id} completed`,
      });
    } catch (error) {
      Logger.error(`Execute workflow error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to execute workflow',
        error: error.message,
      });
    }
  }

  /**
   * ========== WEBHOOKS ==========
   */

  static async registerWebhook(req, res) {
    try {
      const { connectorId, webhookUrl, events } = req.body;

      if (!connectorId || !webhookUrl) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: connectorId, webhookUrl',
        });
      }

      const result = IntegrationHubService.registerWebhook(connectorId, webhookUrl, events || []);

      res.status(201).json({
        success: true,
        data: result.webhook,
        message: result.message,
      });
    } catch (error) {
      Logger.error(`Register webhook error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to register webhook',
        error: error.message,
      });
    }
  }

  static async triggerWebhook(req, res) {
    try {
      const { webhookId } = req.params;
      const data = req.body;

      if (!webhookId) {
        return res.status(400).json({
          success: false,
          message: 'Missing webhookId',
        });
      }

      const result = await IntegrationHubService.triggerWebhook(webhookId, data);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to trigger webhook',
          error: result.error,
        });
      }

      res.json({
        success: true,
        data: result,
        message: 'Webhook triggered successfully',
      });
    } catch (error) {
      Logger.error(`Trigger webhook error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger webhook',
        error: error.message,
      });
    }
  }

  /**
   * ========== MARKETPLACE ==========
   */

  static async publishApp(req, res) {
    try {
      const { name, description, icon, author, version, category, pricing, features, documentation } =
        req.body;

      if (!name || !author || !category) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, author, category',
        });
      }

      const result = IntegrationHubService.createMarketplaceApp({
        name,
        description,
        icon,
        author,
        version,
        category,
        pricing,
        features,
        documentation,
      });

      res.status(201).json({
        success: true,
        data: result.app,
        message: result.message,
      });
    } catch (error) {
      Logger.error(`Publish app error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to publish app',
        error: error.message,
      });
    }
  }

  static async getMarketplaceApps(req, res) {
    try {
      const { category, pricing, search, limit } = req.query;

      const filters = {};
      if (category) filters.category = category;
      if (pricing) filters.pricing = pricing;
      if (search) filters.search = search;

      const apps = IntegrationHubService.getMarketplaceApps(filters);

      const limited = limit ? apps.slice(0, parseInt(limit)) : apps;

      res.json({
        success: true,
        data: { apps: limited, count: limited.length, total: apps.length },
      });
    } catch (error) {
      Logger.error(`Get marketplace apps error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve marketplace apps',
        error: error.message,
      });
    }
  }

  static async subscribeToApp(req, res) {
    try {
      const { appId, plan } = req.body;
      const tenantId = req.tenant?.id || req.body.tenantId;

      if (!appId) {
        return res.status(400).json({
          success: false,
          message: 'Missing appId',
        });
      }

      const result = IntegrationHubService.subscribeToApp(tenantId, appId, plan || 'free');

      res.status(201).json({
        success: true,
        data: result.subscription,
        message: result.message,
      });
    } catch (error) {
      Logger.error(`Subscribe to app error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to subscribe to app',
        error: error.message,
      });
    }
  }

  /**
   * ========== STATISTICS ==========
   */

  static async getStatistics(req, res) {
    try {
      const stats = IntegrationHubService.getStatistics();

      res.json({
        success: true,
        data: stats,
        message: 'Integration hub statistics',
      });
    } catch (error) {
      Logger.error(`Get statistics error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve statistics',
        error: error.message,
      });
    }
  }
}

module.exports = IntegrationHubController;
