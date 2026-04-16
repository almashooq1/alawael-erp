/**
 * Integration Hub Tests
 * Unit tests for Phase 26 Advanced Integrations Hub
 *
 * Service tests: ACTIVE — IntegrationHubService is pure in-memory (EventEmitter + Maps)
 * Controller tests: SKIPPED — integrationHub.controller.js was archived (dead — no route imports it)
 */

const IntegrationHubService = require('../../../services/integrationHub.service');

// ── SERVICE TESTS (all in-memory, no DB) ────────────────────────────────────

describe('IntegrationHubService', () => {
  it('should initialize with default connectors', () => {
    const connectors = IntegrationHubService.getAllConnectors();
    expect(connectors.length).toBeGreaterThanOrEqual(5);
    expect(connectors.map(c => c.id)).toContain('zapier');
    expect(connectors.map(c => c.id)).toContain('slack');
    expect(connectors.map(c => c.id)).toContain('teams');
    expect(connectors.map(c => c.id)).toContain('shopify');
    expect(connectors.map(c => c.id)).toContain('salesforce');
  });

  it('should register a new connector', () => {
    const result = IntegrationHubService.registerConnector('custom_api_' + Date.now(), {
      name: 'Custom API',
      provider: 'custom',
      baseUrl: 'https://api.custom.com',
      config: { rateLimit: 500 },
    });

    expect(result.success).toBe(true);
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

    workflow.workflow.enabled = true;

    const execution = await IntegrationHubService.executeWorkflow(workflow.workflow.id, {
      testData: 'value',
    });

    expect(execution.workflowId).toBe(workflow.workflow.id);
    expect(execution.status).toBeDefined();
    expect(execution.steps).toBeInstanceOf(Array);
  });

  it('should register a webhook', () => {
    const result = IntegrationHubService.registerWebhook(
      'shopify',
      'https://example.com/webhooks/shopify',
      ['order.created', 'order.updated']
    );

    expect(result.success).toBe(true);
    expect(result.webhook.id).toBeDefined();
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
    const app = IntegrationHubService.createMarketplaceApp({
      name: 'Test Sub App ' + Date.now(),
      author: 'dev@example.com',
      category: 'productivity',
    });

    const subscription = IntegrationHubService.subscribeToApp('tenant_123', app.app.id, 'premium');

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
      name: 'Comm App ' + Date.now(),
      author: 'dev@example.com',
      category: 'communication',
    });

    const apps = IntegrationHubService.getMarketplaceApps({ category: 'communication' });
    expect(apps.length).toBeGreaterThanOrEqual(1);
  });

  it('should get statistics', () => {
    const stats = IntegrationHubService.getStatistics();

    expect(stats.connectors.total).toBeGreaterThanOrEqual(5);
    expect(stats.workflows.total).toBeGreaterThanOrEqual(0);
    expect(stats.webhooks.total).toBeGreaterThanOrEqual(0);
    expect(stats.marketplace.totalApps).toBeGreaterThanOrEqual(0);
  });

  it('should emit events', done => {
    const id = 'event_test_' + Date.now();
    IntegrationHubService.once('connector:registered', event => {
      expect(event.connector.id).toBe(id);
      done();
    });

    IntegrationHubService.registerConnector(id, {
      name: 'Event Test',
      provider: 'test',
    });
  });
});

// ── INTEGRATION FLOW (service-only, no controller) ─────────────────────────

describe('Integration: Connector → Workflow → Webhook', () => {
  it('should complete full integration flow', async () => {
    const uid = Date.now();

    const connectorResult = IntegrationHubService.registerConnector('test_flow_' + uid, {
      name: 'Test Flow',
      provider: 'test',
    });
    expect(connectorResult.success).toBe(true);

    const workflowResult = IntegrationHubService.createWorkflow({
      name: 'Full Flow Test',
      trigger: { connectorId: 'test_flow_' + uid, event: 'test' },
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

    const webhookResult = IntegrationHubService.registerWebhook(
      'test_flow_' + uid,
      'https://example.com/webhooks/test',
      ['test']
    );
    expect(webhookResult.success).toBe(true);

    workflowResult.workflow.enabled = true;
    const execution = await IntegrationHubService.executeWorkflow(workflowResult.workflow.id, {
      testData: 'value',
    });
    expect(execution.workflowId).toBeDefined();

    const stats = IntegrationHubService.getStatistics();
    expect(stats.connectors.total).toBeGreaterThan(5);
  });
});

// ── ERROR HANDLING (service-only) ──────────────────────────────────────────

describe('Error Handling', () => {
  it('should handle missing workflow gracefully', async () => {
    try {
      await IntegrationHubService.executeWorkflow('nonexistent_workflow_id', {});
      expect(true).toBe(false); // should not reach
    } catch (error) {
      expect(error).toBeDefined();
      expect(error.message).toContain('not found');
    }
  });

  it('should handle null trigger data', async () => {
    const workflow = IntegrationHubService.createWorkflow({
      name: 'Error Test',
      trigger: { connectorId: 'slack' },
      actions: [],
      tenantId: 'tenant_123',
    });
    workflow.workflow.enabled = true;

    const execution = await IntegrationHubService.executeWorkflow(workflow.workflow.id, null);
    expect(execution).toBeDefined();
  });
});

// ── PERFORMANCE (service-only) ─────────────────────────────────────────────

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

// ── CONTROLLER TESTS (skipped — controller archived) ───────────────────────

describe.skip('IntegrationHubController (archived)', () => {
  it('placeholder — controller was archived as dead code', () => {
    expect(true).toBe(true);
  });
});

module.exports = {};
