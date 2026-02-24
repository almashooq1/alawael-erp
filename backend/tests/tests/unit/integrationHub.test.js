/**
 * Integration Hub Tests
 * Unit and integration tests for Phase 26 Advanced Integrations Hub
 */

const request = require('supertest');
const express = require('express');
const IntegrationHubService = require('../services/integrationHub.service');
const IntegrationHubController = require('../controllers/integrationHub.controller');

describe('Phase 26: Advanced Integrations Hub', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());

    // Setup mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: 'user_123' };
      req.tenant = { id: 'tenant_123' };
      next();
    });
  });

  /**
   * ========== SERVICE TESTS ==========
   */

  describe('IntegrationHubService', () => {
    it('should initialize with default connectors', () => {
      const connectors = IntegrationHubService.getAllConnectors();
      expect(connectors.length).toBe(5);
      expect(connectors.map(c => c.id)).toContain('zapier');
      expect(connectors.map(c => c.id)).toContain('slack');
      expect(connectors.map(c => c.id)).toContain('teams');
      expect(connectors.map(c => c.id)).toContain('shopify');
      expect(connectors.map(c => c.id)).toContain('salesforce');
    });

    it('should register a new connector', () => {
      const result = IntegrationHubService.registerConnector('custom_api', {
        name: 'Custom API',
        provider: 'custom',
        baseUrl: 'https://api.custom.com',
        config: { rateLimit: 500 },
      });

      expect(result.success).toBe(true);
      expect(result.connector.id).toBe('custom_api');
      expect(result.connector.name).toBe('Custom API');
    });

    it('should authenticate connector with credentials', async () => {
      const result = await IntegrationHubService.authenticateConnector('slack', {
        apiKey: 'test_key_123',
      });

      expect(result.success).toBe(true);
      expect(result.credentialId).toBeDefined();
    });

    it('should create a workflow', () => {
      const result = IntegrationHubService.createWorkflow({
        name: 'Test Workflow',
        description: 'A test workflow',
        trigger: {
          connectorId: 'slack',
          event: 'message.received',
        },
        actions: [
          {
            connectorId: 'zapier',
            type: 'webhook_call',
            data: { url: 'https://example.com/webhook' },
          },
        ],
        tenantId: 'tenant_123',
        createdBy: 'user_123',
      });

      expect(result.success).toBe(true);
      expect(result.workflow.id).toBeDefined();
      expect(result.workflow.name).toBe('Test Workflow');
      expect(result.workflow.status).toBe('draft');
    });

    it('should execute a workflow', async () => {
      // Create workflow first
      const workflow = IntegrationHubService.createWorkflow({
        name: 'Test Execution',
        trigger: { connectorId: 'slack', event: 'test' },
        actions: [
          {
            connectorId: 'zapier',
            type: 'log',
            data: { message: 'test' },
          },
        ],
        tenantId: 'tenant_123',
      });

      const execution = await IntegrationHubService.executeWorkflow(workflow.workflow.id, {
        testData: 'value',
      });

      expect(execution.workflowId).toBe(workflow.workflow.id);
      expect(execution.status).toBeDefined();
      expect(execution.actions).toBeInstanceOf(Array);
    });

    it('should register a webhook', () => {
      const result = IntegrationHubService.registerWebhook(
        'shopify',
        'https://example.com/webhooks/shopify',
        ['order.created', 'order.updated']
      );

      expect(result.success).toBe(true);
      expect(result.webhook.webhookId).toBeDefined();
      expect(result.webhook.events).toHaveLength(2);
    });

    it('should create marketplace app', () => {
      const result = IntegrationHubService.createMarketplaceApp({
        name: 'Email Validator',
        description: 'Validate emails in real-time',
        author: 'dev@example.com',
        version: '1.0.0',
        category: 'productivity',
        pricing: 'premium',
        features: ['Validation', 'Batch Processing'],
        documentation: 'https://example.com/docs',
      });

      expect(result.success).toBe(true);
      expect(result.app.id).toBeDefined();
      expect(result.app.name).toBe('Email Validator');
      expect(result.app.status).toBe('published');
    });

    it('should subscribe to marketplace app', () => {
      // Create app first
      const app = IntegrationHubService.createMarketplaceApp({
        name: 'Test App',
        author: 'dev@example.com',
        category: 'productivity',
      });

      const subscription = IntegrationHubService.subscribeToApp(
        'tenant_123',
        app.app.id,
        'premium'
      );

      expect(subscription.success).toBe(true);
      expect(subscription.subscription.appId).toBe(app.app.id);
      expect(subscription.subscription.tenantId).toBe('tenant_123');
      expect(subscription.subscription.plan).toBe('premium');
    });

    it('should retrieve marketplace apps', () => {
      const apps = IntegrationHubService.getMarketplaceApps();
      expect(Array.isArray(apps)).toBe(true);
    });

    it('should filter marketplace apps by category', () => {
      IntegrationHubService.createMarketplaceApp({
        name: 'Slack Connector',
        author: 'dev@example.com',
        category: 'communication',
      });

      const apps = IntegrationHubService.getMarketplaceApps({ category: 'communication' });
      const hasSlackConnector = apps.some(a => a.name === 'Slack Connector');
      expect(hasSlackConnector).toBe(true);
    });

    it('should get statistics', () => {
      const stats = IntegrationHubService.getStatistics();

      expect(stats.totalConnectors).toBeGreaterThanOrEqual(5);
      expect(stats.connectorsByStatus).toBeDefined();
      expect(stats.totalWorkflows).toBeGreaterThanOrEqual(0);
      expect(stats.webhooksRegistered).toBeGreaterThanOrEqual(0);
      expect(stats.marketplaceApps).toBeGreaterThanOrEqual(0);
    });

    it('should emit events', (done) => {
      IntegrationHubService.once('connector:registered', (connector) => {
        expect(connector.id).toBe('event_test');
        done();
      });

      IntegrationHubService.registerConnector('event_test', {
        name: 'Event Test',
        provider: 'test',
      });
    });
  });

  /**
   * ========== CONTROLLER TESTS ==========
   */

  describe('IntegrationHubController', () => {
    describe('Connectors', () => {
      it('should register connector endpoint', async () => {
        app.post(
          '/connectors/register',
          (req, res, next) => {
            req.body = req.body || {};
            next();
          },
          IntegrationHubController.registerConnector
        );

        const response = await request(app)
          .post('/connectors/register')
          .send({
            connectorId: 'test_connector',
            name: 'Test Connector',
            provider: 'test',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('test_connector');
      });

      it('should get connectors list', async () => {
        app.get('/connectors', IntegrationHubController.getConnectors);

        const response = await request(app).get('/connectors');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.connectors)).toBe(true);
        expect(response.body.data.count).toBeGreaterThanOrEqual(5);
      });

      it('should get single connector', async () => {
        app.get('/connectors/:connectorId', IntegrationHubController.getConnector);

        const response = await request(app).get('/connectors/slack');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.id).toBe('slack');
      });

      it('should return 404 for non-existent connector', async () => {
        app.get('/connectors/:connectorId', IntegrationHubController.getConnector);

        const response = await request(app).get('/connectors/nonexistent');

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Workflows', () => {
      it('should create workflow', async () => {
        app.post('/workflows', IntegrationHubController.createWorkflow);

        const response = await request(app)
          .post('/workflows')
          .send({
            name: 'Test Workflow',
            trigger: { connectorId: 'slack', event: 'test' },
            actions: [
              {
                connectorId: 'zapier',
                type: 'log',
                data: { message: 'test' },
              },
            ],
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Test Workflow');
      });

      it('should return 400 for missing required fields', async () => {
        app.post('/workflows', IntegrationHubController.createWorkflow);

        const response = await request(app)
          .post('/workflows')
          .send({
            description: 'Missing name and trigger',
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('Marketplace', () => {
      it('should publish app to marketplace', async () => {
        app.post('/marketplace/apps', IntegrationHubController.publishApp);

        const response = await request(app)
          .post('/marketplace/apps')
          .send({
            name: 'Test App',
            author: 'test@example.com',
            category: 'productivity',
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.name).toBe('Test App');
      });

      it('should list marketplace apps', async () => {
        app.get('/marketplace/apps', IntegrationHubController.getMarketplaceApps);

        const response = await request(app).get('/marketplace/apps');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data.apps)).toBe(true);
      });

      it('should filter marketplace apps', async () => {
        app.get('/marketplace/apps', IntegrationHubController.getMarketplaceApps);

        const response = await request(app).get('/marketplace/apps?category=productivity&limit=5');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.apps.length).toBeLessThanOrEqual(5);
      });
    });

    describe('Statistics', () => {
      it('should get statistics', async () => {
        app.get('/statistics', IntegrationHubController.getStatistics);

        const response = await request(app).get('/statistics');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.totalConnectors).toBeDefined();
        expect(response.body.data.totalWorkflows).toBeDefined();
        expect(response.body.data.webhooksRegistered).toBeDefined();
      });
    });
  });

  /**
   * ========== INTEGRATION TESTS ==========
   */

  describe('Integration: Connector → Workflow → Webhook', () => {
    it('should complete full integration flow', async () => {
      // 1. Register connector
      const connectorResult = IntegrationHubService.registerConnector('test_flow', {
        name: 'Test Flow',
        provider: 'test',
      });
      expect(connectorResult.success).toBe(true);

      // 2. Create workflow with registered connector
      const workflowResult = IntegrationHubService.createWorkflow({
        name: 'Full Flow Test',
        trigger: { connectorId: 'test_flow', event: 'test' },
        actions: [
          {
            connectorId: 'slack',
            type: 'send_message',
            data: { channel: '#test', text: 'Test message' },
          },
        ],
        tenantId: 'tenant_123',
      });
      expect(workflowResult.success).toBe(true);

      // 3. Register webhook for connector
      const webhookResult = IntegrationHubService.registerWebhook(
        'test_flow',
        'https://example.com/webhooks/test',
        ['test']
      );
      expect(webhookResult.success).toBe(true);

      // 4. Execute workflow
      const execution = await IntegrationHubService.executeWorkflow(workflowResult.workflow.id, {
        testData: 'value',
      });
      expect(execution.workflowId).toBeDefined();

      // 5. Verify statistics updated
      const stats = IntegrationHubService.getStatistics();
      expect(stats.totalConnectors).toBeGreaterThan(5); // Should include test_flow
      expect(stats.totalWorkflows).toBeGreaterThan(0);
      expect(stats.webhooksRegistered).toBeGreaterThan(0);
    });
  });

  /**
   * ========== ERROR HANDLING TESTS ==========
   */

  describe('Error Handling', () => {
    it('should handle missing connector gracefully', async () => {
      const result = await IntegrationHubService.executeWorkflow('nonexistent_workflow_id', {});
      expect(result).toBeDefined();
    });

    it('should handle invalid JSON in trigger data', async () => {
      const workflow = IntegrationHubService.createWorkflow({
        name: 'Error Test',
        trigger: { connectorId: 'slack' },
        actions: [],
        tenantId: 'tenant_123',
      });

      const execution = await IntegrationHubService.executeWorkflow(workflow.workflow.id, null);
      expect(execution).toBeDefined();
    });

    it('should validate required fields', async () => {
      app.post('/workflows', IntegrationHubController.createWorkflow);

      const response = await request(app)
        .post('/workflows')
        .send({
          description: 'No name or trigger',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Missing required fields');
    });
  });

  /**
   * ========== PERFORMANCE TESTS ==========
   */

  describe('Performance', () => {
    it('should register connector in < 50ms', () => {
      const start = Date.now();
      IntegrationHubService.registerConnector(`perf_test_${Date.now()}`, {
        name: 'Perf Test',
        provider: 'perf',
      });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('should retrieve all connectors in < 100ms', () => {
      const start = Date.now();
      IntegrationHubService.getAllConnectors();
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it('should create workflow in < 100ms', () => {
      const start = Date.now();
      IntegrationHubService.createWorkflow({
        name: 'Perf Workflow',
        trigger: { connectorId: 'slack' },
        actions: [],
        tenantId: 'tenant_123',
      });
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
  });
});

module.exports = {};
