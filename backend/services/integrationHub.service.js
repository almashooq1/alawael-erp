/**
 * Integration Hub Service - مركز التكاملات المتقدم
 * Advanced Integrations Hub: Zapier, Workflows, Marketplace, Custom Connectors
 */

const EventEmitter = require('events');
const Logger = require('../utils/logger');

class IntegrationHubService extends EventEmitter {
  constructor() {
    super();
    this.connectors = new Map();
    this.workflows = new Map();
    this.webhooks = new Map();
    this.marketplaceApps = new Map();
    this.subscriptions = new Map();
    this.executionLogs = new Map();
    this.credentials = new Map();
    this._initializeDefaultConnectors();
  }

  /**
   * Initialize default integrations
   */
  _initializeDefaultConnectors() {
    const defaultConnectors = [
      {
        id: 'zapier',
        name: 'Zapier Integration',
        provider: 'zapier',
        status: 'active',
        config: { baseUrl: 'https://api.zapier.com/v1', rateLimit: 1000 },
      },
      {
        id: 'slack',
        name: 'Slack Integration',
        provider: 'slack',
        status: 'active',
        config: { baseUrl: 'https://slack.com/api', rateLimit: 500 },
      },
      {
        id: 'teams',
        name: 'Microsoft Teams Integration',
        provider: 'teams',
        status: 'active',
        config: { baseUrl: 'https://graph.microsoft.com/v1.0', rateLimit: 500 },
      },
      {
        id: 'shopify',
        name: 'Shopify Integration',
        provider: 'shopify',
        status: 'active',
        config: { baseUrl: 'https://shopify.api/v2022-10', rateLimit: 2000 },
      },
      {
        id: 'salesforce',
        name: 'Salesforce Integration',
        provider: 'salesforce',
        status: 'active',
        config: { baseUrl: 'https://api.salesforce.com/v57.0', rateLimit: 1500 },
      },
    ];

    defaultConnectors.forEach((conn) => {
      this.connectors.set(conn.id, {
        ...conn,
        createdAt: new Date(),
        updatedAt: new Date(),
        authStatus: 'not_configured',
      });
    });

    Logger.info('IntegrationHub: Initialized 5 default connectors');
  }

  /**
   * Register new connector
   */
  registerConnector(connectorId, connectorConfig) {
    if (this.connectors.has(connectorId)) {
      throw new Error(`Connector ${connectorId} already exists`);
    }

    const connector = {
      id: connectorId,
      name: connectorConfig.name,
      provider: connectorConfig.provider,
      baseUrl: connectorConfig.baseUrl,
      status: connectorConfig.status || 'active',
      config: connectorConfig.config || {},
      authStatus: 'not_configured',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: connectorConfig.metadata || {},
    };

    this.connectors.set(connectorId, connector);
    this.emit('connector:registered', { connectorId, connector });

    return {
      success: true,
      connector,
      message: `Connector ${connectorId} registered successfully`,
    };
  }

  /**
   * Authenticate connector with credentials
   */
  async authenticateConnector(connectorId, credentials) {
    if (!this.connectors.has(connectorId)) {
      throw new Error(`Connector ${connectorId} not found`);
    }

    const connector = this.connectors.get(connectorId);
    const credentialId = `cred_${connectorId}_${Date.now()}`;

    this.credentials.set(credentialId, {
      id: credentialId,
      connectorId,
      apiKey: credentials.apiKey,
      apiSecret: credentials.apiSecret,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      webhookUrl: credentials.webhookUrl,
      expiresAt: credentials.expiresAt || new Date(Date.now() + 86400000),
      createdAt: new Date(),
      status: 'active',
    });

    connector.authStatus = 'configured';
    connector.credentialId = credentialId;
    connector.updatedAt = new Date();

    this.emit('connector:authenticated', { connectorId, credentialId });

    return {
      success: true,
      credentialId,
      message: `Connector ${connectorId} authenticated successfully`,
    };
  }

  /**
   * Get all connectors
   */
  getAllConnectors() {
    return Array.from(this.connectors.values()).map((conn) => ({
      ...conn,
      isAuthenticated: conn.authStatus === 'configured',
    }));
  }

  /**
   * Get connector by ID
   */
  getConnector(connectorId) {
    if (!this.connectors.has(connectorId)) {
      return null;
    }

    const connector = this.connectors.get(connectorId);
    return {
      ...connector,
      isAuthenticated: connector.authStatus === 'configured',
    };
  }

  /**
   * Create workflow
   */
  createWorkflow(workflowData) {
    const workflowId = `wf_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const workflow = {
      id: workflowId,
      name: workflowData.name,
      description: workflowData.description,
      tenantId: workflowData.tenantId,
      trigger: workflowData.trigger, // event: connector.event
      actions: workflowData.actions || [], // array of action steps
      conditions: workflowData.conditions || [],
      status: 'draft',
      enabled: false,
      executeCount: 0,
      lastExecutedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: workflowData.createdBy,
    };

    this.workflows.set(workflowId, workflow);
    this.emit('workflow:created', { workflowId, workflow });

    return {
      success: true,
      workflow,
      message: `Workflow ${workflowId} created successfully`,
    };
  }

  /**
   * Execute workflow
   */
  async executeWorkflow(workflowId, triggerData = {}) {
    if (!this.workflows.has(workflowId)) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const workflow = this.workflows.get(workflowId);

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const steps = [];
    let success = true;

    try {
      // Execute each action in the workflow
      for (const action of workflow.actions) {
        const stepResult = await this._executeAction(action, triggerData);
        steps.push({
          actionId: action.id,
          status: stepResult.success ? 'success' : 'failed',
          result: stepResult,
          executedAt: new Date(),
        });

        if (!stepResult.success) {
          success = false;
          break; // Stop on first failure
        }
      }

      workflow.executeCount += 1;
      workflow.lastExecutedAt = new Date();
    } catch (error) {
      success = false;
      Logger.error(`Workflow execution error: ${error.message}`);
    }

    const execution = {
      id: executionId,
      workflowId,
      status: success ? 'completed' : 'failed',
      steps,
      triggerData,
      createdAt: new Date(),
    };

    this.executionLogs.set(executionId, execution);
    this.emit('workflow:executed', { workflowId, executionId, execution });

    return execution;
  }

  /**
   * Private: Execute single action
   */
  async _executeAction(action, triggerData) {
    try {
      // Get connector
      const connector = this.connectors.get(action.connectorId);
      if (!connector) {
        return { success: false, error: 'Connector not found' };
      }

      // Mock action execution
      const result = {
        success: true,
        connectorId: action.connectorId,
        actionType: action.type,
        data: action.data,
        executedAt: new Date(),
      };

      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Register webhook
   */
  registerWebhook(connectorId, webhookUrl, events = []) {
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const webhook = {
      id: webhookId,
      connectorId,
      url: webhookUrl,
      events,
      status: 'active',
      secret: Math.random().toString(36).substring(7),
      createdAt: new Date(),
      deliveryCount: 0,
      failureCount: 0,
    };

    this.webhooks.set(webhookId, webhook);
    this.emit('webhook:registered', { webhookId, webhook });

    return {
      success: true,
      webhook,
      message: `Webhook ${webhookId} registered successfully`,
    };
  }

  /**
   * Trigger webhook
   */
  async triggerWebhook(webhookId, data) {
    if (!this.webhooks.has(webhookId)) {
      return { success: false, error: 'Webhook not found' };
    }

    const webhook = this.webhooks.get(webhookId);

    try {
      // Mock webhook delivery
      webhook.deliveryCount += 1;

      return {
        success: true,
        webhookId,
        deliveryId: `del_${Date.now()}`,
        status: '200 OK',
        data,
      };
    } catch (error) {
      webhook.failureCount += 1;
      return { success: false, error: error.message };
    }
  }

  /**
   * Add app to marketplace
   */
  createMarketplaceApp(appData) {
    const appId = `app_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const app = {
      id: appId,
      name: appData.name,
      description: appData.description,
      icon: appData.icon,
      author: appData.author,
      version: appData.version || '1.0.0',
      category: appData.category,
      rating: 0,
      reviews: [],
      downloads: 0,
      pricing: appData.pricing, // free, premium, etc
      features: appData.features || [],
      documentation: appData.documentation,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.marketplaceApps.set(appId, app);
    this.emit('app:published', { appId, app });

    return {
      success: true,
      app,
      message: `App ${appId} published to marketplace`,
    };
  }

  /**
   * Subscribe to marketplace app
   */
  subscribeToApp(tenantId, appId, plan = 'free') {
    if (!this.marketplaceApps.has(appId)) {
      throw new Error(`App ${appId} not found`);
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const app = this.marketplaceApps.get(appId);

    const subscription = {
      id: subscriptionId,
      tenantId,
      appId,
      appName: app.name,
      plan,
      status: 'active',
      apiKey: Math.random().toString(36).substring(2, 15),
      webhookUrl: null,
      createdAt: new Date(),
      renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.emit('app:subscribed', { subscriptionId, subscription });

    return {
      success: true,
      subscription,
      message: `Subscribed to ${app.name} successfully`,
    };
  }

  /**
   * Get subscription
   */
  getSubscription(subscriptionId) {
    return this.subscriptions.get(subscriptionId) || null;
  }

  /**
   * Get all marketplace apps
   */
  getMarketplaceApps(filters = {}) {
    let apps = Array.from(this.marketplaceApps.values());

    if (filters.category) {
      apps = apps.filter((a) => a.category === filters.category);
    }

    if (filters.pricing) {
      apps = apps.filter((a) => a.pricing === filters.pricing);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      apps = apps.filter((a) => a.name.toLowerCase().includes(search));
    }

    // Sort by rating and downloads
    apps.sort((a, b) => b.rating - a.rating || b.downloads - a.downloads);

    return apps;
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      connectors: {
        total: this.connectors.size,
        authenticated: Array.from(this.connectors.values()).filter(
          (c) => c.authStatus === 'configured'
        ).length,
      },
      workflows: {
        total: this.workflows.size,
        enabled: Array.from(this.workflows.values()).filter((w) => w.enabled).length,
        totalExecutions: Array.from(this.workflows.values()).reduce((sum, w) => sum + w.executeCount, 0),
      },
      webhooks: {
        total: this.webhooks.size,
        active: Array.from(this.webhooks.values()).filter((w) => w.status === 'active').length,
        totalDeliveries: Array.from(this.webhooks.values()).reduce(
          (sum, w) => sum + w.deliveryCount,
          0
        ),
      },
      marketplace: {
        totalApps: this.marketplaceApps.size,
        totalSubscriptions: this.subscriptions.size,
      },
      credentials: {
        total: this.credentials.size,
      },
    };
  }
}

module.exports = new IntegrationHubService();
