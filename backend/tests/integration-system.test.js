/**
 * integration-system.test.js
 * AlAwael ERP - Integration System Test Suite
 * Testing webhooks, connectors, API integrations, and synchronization
 * February 22, 2026
 */

const {
  IntegrationService,
  WebhookEvent,
  WebhookSubscription,
  IntegrationConnector,
  APIIntegration
} = require('../services/IntegrationService');

describe('Integration System - Comprehensive Tests', () => {
  let integrationService;

  beforeEach(() => {
    integrationService = new IntegrationService();
  });

  // ===========================
  // WEBHOOK EVENT TESTS
  // ===========================
  describe('WebhookEvent', () => {
    test('creates webhook event with valid data', () => {
      const event = new WebhookEvent('order.created', { orderId: '123', amount: 500 });

      expect(event.event).toBe('order.created');
      expect(event.data.orderId).toBe('123');
      expect(event.status).toBe('pending');
      expect(event.id).toBeDefined();
    });

    test('generates unique event IDs', () => {
      const event1 = new WebhookEvent('test1', {});
      const event2 = new WebhookEvent('test2', {});

      expect(event1.id).not.toBe(event2.id);
    });

    test('generates HMAC SHA256 signature', () => {
      const event = new WebhookEvent('order.created', { amount: 100 });
      const secret = 'test-secret';

      const signature = event.generateSignature(secret);

      expect(signature).toBeDefined();
      expect(signature.length).toBeGreaterThan(0);
      expect(event.signature).toBe(signature);
    });

    test('provides payload with signature', () => {
      const event = new WebhookEvent('payment.completed', { transactionId: 'tx-123' });
      event.generateSignature('secret');

      const payload = event.getPayload();

      expect(payload.id).toBe(event.id);
      expect(payload.event).toBe('payment.completed');
      expect(payload.signature).toBeDefined();
    });

    test('tracks retry attempts', () => {
      const event = new WebhookEvent('test', {});

      expect(event.retries).toBe(0);

      event.retries = 1;
      event.status = 'retrying';

      expect(event.retries).toBe(1);
      expect(event.status).toBe('retrying');
    });
  });

  // ===========================
  // WEBHOOK SUBSCRIPTION TESTS
  // ===========================
  describe('WebhookSubscription', () => {
    test('creates subscription with URL and events', () => {
      const webhook = new WebhookSubscription(
        'https://example.com/webhooks',
        ['order.created', 'order.updated']
      );

      expect(webhook.url).toBe('https://example.com/webhooks');
      expect(webhook.events.length).toBe(2);
      expect(webhook.isActive).toBe(true);
    });

    test('generates unique secret', () => {
      const webhook1 = new WebhookSubscription('url1', ['*']);
      const webhook2 = new WebhookSubscription('url2', ['*']);

      expect(webhook1.secret).not.toBe(webhook2.secret);
    });

    test('matches events correctly', () => {
      const webhook = new WebhookSubscription('url', ['order.created', 'order.deleted']);

      expect(webhook.matches('order.created')).toBe(true);
      expect(webhook.matches('order.deleted')).toBe(true);
      expect(webhook.matches('order.updated')).toBe(false);
    });

    test('matches wildcard events', () => {
      const webhook = new WebhookSubscription('url', ['*']);

      expect(webhook.matches('order.created')).toBe(true);
      expect(webhook.matches('payment.sent')).toBe(true);
      expect(webhook.matches('anything')).toBe(true);
    });

    test('tracks delivery counts', () => {
      const webhook = new WebhookSubscription('url', ['*']);

      webhook.incrementDelivery(true);
      webhook.incrementDelivery(true);
      webhook.incrementDelivery(false);

      expect(webhook.deliveryCount).toBe(2);
      expect(webhook.failureCount).toBe(1);
    });

    test('calculates retry delay with exponential backoff', () => {
      const webhook = new WebhookSubscription('url', ['*']);

      const delay1 = webhook.getRetryDelay(0);
      const delay2 = webhook.getRetryDelay(1);
      const delay3 = webhook.getRetryDelay(2);

      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay3).toBeLessThanOrEqual(webhook.retryPolicy.maxDelay);
    });
  });

  // ===========================
  // INTEGRATION CONNECTOR TESTS
  // ===========================
  describe('IntegrationConnector', () => {
    test('creates connector with name, type, and config', () => {
      const connector = new IntegrationConnector(
        'Shopify',
        'api',
        { baseURL: 'https://shopify.com/api' }
      );

      expect(connector.name).toBe('Shopify');
      expect(connector.type).toBe('api');
      expect(connector.isActive).toBe(true);
    });

    test('registers field mappings', () => {
      const connector = new IntegrationConnector('Test', 'api', {});

      connector.addFieldMapping('sourceId', 'target_id');
      connector.addFieldMapping('amount', 'total_amount', (val) => val * 100);

      expect(connector.mappings.size).toBe(2);
    });

    test('applies field mappings', () => {
      const connector = new IntegrationConnector('Test', 'api', {});

      connector.addFieldMapping('orderId', 'order_id');
      connector.addFieldMapping('amount', 'total', (val) => val * 100);

      const mapped = connector.applyMappings({
        orderId: '123',
        amount: 50,
        ignoredField: 'ignored'
      });

      expect(mapped.order_id).toBe('123');
      expect(mapped.total).toBe(5000); // 50 * 100
      expect(mapped.ignoredField).toBeUndefined();
    });

    test('adds and applies filters', () => {
      const connector = new IntegrationConnector('Test', 'api', {});

      connector.addFilter('status', '==', 'active');
      connector.addFilter('amount', '>', 100);

      expect(connector.applyFilters({ status: 'active', amount: 150 })).toBe(true);
      expect(connector.applyFilters({ status: 'inactive', amount: 150 })).toBe(false);
      expect(connector.applyFilters({ status: 'active', amount: 50 })).toBe(false);
    });

    test('records synchronization', () => {
      const connector = new IntegrationConnector('Test', 'api', {});

      connector.recordSync(true);
      connector.recordSync(false);
      connector.recordSync(true);

      expect(connector.syncCount).toBe(2);
      expect(connector.errorCount).toBe(1);
      expect(connector.lastSync).toBeDefined();
    });
  });

  // ===========================
  // API INTEGRATION TESTS
  // ===========================
  describe('APIIntegration', () => {
    test('creates API integration with base URL', () => {
      const api = new APIIntegration('Shopify', 'https://shopify.com/api/v1');

      expect(api.name).toBe('Shopify');
      expect(api.baseURL).toBe('https://shopify.com/api/v1');
      expect(api.config.timeout).toBe(30000); // default
    });

    test('registers endpoints', () => {
      const api = new APIIntegration('MyAPI', 'https://api.example.com');

      api.registerEndpoint('getOrder', 'GET', '/orders/:orderId');
      api.registerEndpoint('createOrder', 'POST', '/orders');

      expect(api.endpoints.size).toBe(2);
    });

    test('retrieves registered endpoint', () => {
      const api = new APIIntegration('Test', 'https://api.test.com');

      api.registerEndpoint('getUser', 'GET', '/users/:userId');

      const endpoint = api.endpoints.get('getUser');

      expect(endpoint.method).toBe('GET');
      expect(endpoint.path).toBe('/users/:userId');
    });

    test('tracks API calls', async () => {
      const api = new APIIntegration('Test', 'https://api.test.com');

      api.registerEndpoint('test', 'GET', '/test');

      await api.call('test');

      expect(api.callCount).toBe(1);
      expect(api.lastCall).toBeDefined();
    });

    test('returns API call result', async () => {
      const api = new APIIntegration('Test', 'https://api.test.com');

      api.registerEndpoint('getUser', 'GET', '/users/:id');

      const result = await api.call('getUser', { id: '123' });

      expect(result.success).toBe(true);
      expect(result.endpoint).toBe('getUser');
      expect(result.timestamp).toBeDefined();
    });

    test('provides API summary', () => {
      const api = new APIIntegration('TestAPI', 'https://api.test.com');

      api.registerEndpoint('list', 'GET', '/items');
      api.registerEndpoint('create', 'POST', '/items');

      const summary = api.getSummary();

      expect(summary.name).toBe('TestAPI');
      expect(summary.endpoints).toBe(2);
    });
  });

  // ===========================
  // INTEGRATION SERVICE TESTS
  // ===========================
  describe('IntegrationService', () => {
    test('registers webhooks', () => {
      const webhook = integrationService.registerWebhook(
        'https://example.com/webhook',
        ['order.created']
      );

      expect(webhook.id).toBeDefined();
      expect(webhook.url).toBe('https://example.com/webhook');
    });

    test('retrieves specific webhook', () => {
      const webhook = integrationService.registerWebhook('url', ['*']);

      const retrieved = integrationService.getWebhook(webhook.id);

      expect(retrieved).toBe(webhook);
    });

    test('retrieves all webhooks', () => {
      integrationService.registerWebhook('url1', ['order.created']);
      integrationService.registerWebhook('url2', ['payment.sent']);

      const all = integrationService.getAllWebhooks();

      expect(all.length).toBe(2);
    });

    test('updates webhook', () => {
      const webhook = integrationService.registerWebhook('url', ['order.created']);

      integrationService.updateWebhook(webhook.id, {
        events: ['order.created', 'order.updated']
      });

      const updated = integrationService.getWebhook(webhook.id);

      expect(updated.events.length).toBe(2);
    });

    test('deletes webhook', () => {
      const webhook = integrationService.registerWebhook('url', ['*']);

      integrationService.deleteWebhook(webhook.id);

      const retrieved = integrationService.getWebhook(webhook.id);

      expect(retrieved).toBeUndefined();
    });

    test('emits events', () => {
      integrationService.registerWebhook('https://webhook.test', ['order.created']);

      const event = integrationService.emitEvent('order.created', { orderId: '123' });

      expect(event).toBeDefined();
      expect(event.event).toBe('order.created');
    });

    test('stores event history', () => {
      integrationService.emitEvent('event1', { data: 1 });
      integrationService.emitEvent('event2', { data: 2 });
      integrationService.emitEvent('event3', { data: 3 });

      const history = integrationService.getEventHistory(10);

      expect(history.length).toBe(3);
    });

    test('creates connectors', () => {
      const connector = integrationService.createConnector(
        'Shopify',
        'api',
        { baseURL: 'https://shopify.com' }
      );

      expect(connector.id).toBeDefined();
      expect(connector.name).toBe('Shopify');
    });

    test('registers APIs', () => {
      const api = integrationService.registerAPI(
        'MyAPI',
        'https://api.example.com'
      );

      expect(api.name).toBe('MyAPI');
      expect(api.baseURL).toBe('https://api.example.com');
    });

    test('retrieves registered APIs', () => {
      integrationService.registerAPI('API1', 'https://api1.com');
      integrationService.registerAPI('API2', 'https://api2.com');

      const integrations = integrationService.getAllIntegrations();

      expect(integrations.length).toBe(2);
    });

    test('registers data transformations', () => {
      const transform = (data) => ({ transformed: true, ...data });

      integrationService.registerTransformation('addFlag', transform);

      const result = integrationService.applyTransformation('addFlag', { test: 'data' });

      expect(result.transformed).toBe(true);
      expect(result.test).toBe('data');
    });

    test('validates webhook signatures', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';

      const signature = require('crypto')
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      const isValid = integrationService.validateWebhookSignature(
        signature,
        payload,
        secret
      );

      expect(isValid).toBe(true);
    });

    test('generates system statistics', () => {
      integrationService.registerWebhook('url1', ['*']);
      integrationService.registerWebhook('url2', ['*']);
      integrationService.createConnector('C1', 'api', {});

      const stats = integrationService.getStatistics();

      expect(stats.webhooks).toBe(2);
      expect(stats.connectors).toBe(1);
      expect(stats.successRate).toBeDefined();
    });

    test('generates integration health report', () => {
      integrationService.createConnector('C1', 'api', {});
      integrationService.createConnector('C2', 'api', {});

      const health = integrationService.getIntegrationHealth();

      expect(health.timestamp).toBeDefined();
      expect(health.totalConnectors).toBe(2);
      expect(health.healthPercentage).toBeDefined();
    });

    test('exports configuration', () => {
      integrationService.registerWebhook('url', ['*']);
      integrationService.createConnector('Test', 'api', {});

      const config = integrationService.exportConfiguration();

      expect(config.webhooks).toBeDefined();
      expect(config.connectors).toBeDefined();
      expect(config.statistics).toBeDefined();
    });
  });

  // ===========================
  // INTEGRATION WORKFLOW TESTS
  // ===========================
  describe('Integration Workflows', () => {
    test('complete webhook workflow', (done) => {
      const webhook = integrationService.registerWebhook(
        'https://webhook.test',
        ['order.created']
      );

      integrationService.on('order.created', (event) => {
        expect(event.event).toBe('order.created');
        expect(event.data.amount).toBe(500);
        done();
      });

      integrationService.emitEvent('order.created', { amount: 500 });
    });

    test('connector with field mapping workflow', () => {
      const connector = integrationService.createConnector('Shopify', 'api', {});

      connector.addFieldMapping('shopifyId', 'id');
      connector.addFieldMapping('customerEmail', 'email');

      const source = { shopifyId: '123', customerEmail: 'test@example.com' };
      const mapped = connector.applyMappings(source);

      expect(mapped.id).toBe('123');
      expect(mapped.email).toBe('test@example.com');
    });

    test('multiple webhook deliveries', () => {
      const webhook1 = integrationService.registerWebhook('url1', ['order.*']);
      const webhook2 = integrationService.registerWebhook('url2', ['order.created']);
      const webhook3 = integrationService.registerWebhook('url3', ['payment.*']);

      const event = integrationService.emitEvent('order.created', {});

      // Both webhook1 and webhook2 should match
      expect(webhook1.matches('order.created')).toBe(true);
      expect(webhook2.matches('order.created')).toBe(true);
      expect(webhook3.matches('order.created')).toBe(false);
    });

    test('API call with parameter substitution', async () => {
      const api = integrationService.registerAPI('TestAPI', 'https://api.test.com');

      api.registerEndpoint('getOrder', 'GET', '/orders/:orderId');

      const result = await api.call('getOrder', { orderId: '123' });

      expect(result.success).toBe(true);
    });
  });

  // ===========================
  // ERROR HANDLING TESTS
  // ===========================
  describe('Error Handling', () => {
    test('throws error for non-registered endpoint', async () => {
      const api = integrationService.registerAPI('Test', 'https://api.test.com');

      expect(() => {
        api.call('nonexistent');
      }).toThrow();
    });

    test('throws error for non-existent transformation', () => {
      expect(() => {
        integrationService.applyTransformation('nonexistent', {});
      }).toThrow();
    });

    test('throws error for non-existent connector', () => {
      expect(() => {
        integrationService.getConnector('nonexistent');
      }).toThrow();
    });
  });
});

describe('Integration System - Advanced Scenarios', () => {
  let service;

  beforeEach(() => {
    service = new IntegrationService();
  });

  test('handles complex data transformation pipeline', () => {
    const connector = service.createConnector('Complex', 'api', {});

    // Register transformations
    service.registerTransformation('normalizeData', (data) => ({
      normalized: true,
      ...data
    }));

    service.registerTransformation('addTimestamp', (data) => ({
      ...data,
      timestamp: new Date()
    }));

    let data = { test: 'value' };
    data = service.applyTransformation('normalizeData', data);
    data = service.applyTransformation('addTimestamp', data);

    expect(data.normalized).toBe(true);
    expect(data.timestamp).toBeDefined();
  });

  test('manages multiple concurrent webhook deliveries', () => {
    service.registerWebhook('webhook1', ['*']);
    service.registerWebhook('webhook2', ['*']);
    service.registerWebhook('webhook3', ['*']);

    for (let i = 0; i < 10; i++) {
      service.emitEvent('test.event', { index: i });
    }

    const history = service.getEventHistory(100);

    expect(history.length).toBe(10);
  });
});
