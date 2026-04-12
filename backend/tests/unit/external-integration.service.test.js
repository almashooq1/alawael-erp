'use strict';

const ExternalIntegrationService = require('../../services/externalIntegrationService');

describe('ExternalIntegrationService', () => {
  let svc;

  beforeEach(() => {
    svc = new ExternalIntegrationService();
  });

  // ═══════════════════════════════════════════════════════════════
  // Initialization
  // ═══════════════════════════════════════════════════════════════
  describe('initialization', () => {
    it('has 4 integrations', () => {
      expect(svc.integrations.size).toBe(4);
      expect(svc.integrations.has('slack')).toBe(true);
      expect(svc.integrations.has('email')).toBe(true);
      expect(svc.integrations.has('webhook')).toBe(true);
      expect(svc.integrations.has('api-gateway')).toBe(true);
    });

    it('starts with empty webhooks and event queue', () => {
      expect(svc.webhooks.size).toBe(0);
      expect(svc.eventQueue).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Slack
  // ═══════════════════════════════════════════════════════════════
  describe('configureSlack', () => {
    it('succeeds with valid Slack URL', async () => {
      const r = await svc.configureSlack('https://hooks.slack.com/services/test', ['#general']);
      expect(r.success).toBe(true);
      expect(r.message).toContain('تم تكوين Slack');
      expect(svc.connectionStatus.get('slack').connected).toBe(true);
    });

    it('fails with invalid URL', async () => {
      const r = await svc.configureSlack('https://invalid.com/webhook');
      expect(r.success).toBe(false);
      expect(svc.connectionStatus.get('slack').connected).toBe(false);
    });
  });

  describe('testSlackConnection', () => {
    it('valid URL returns success', async () => {
      const r = await svc.testSlackConnection('https://hooks.slack.com/services/T/B/X');
      expect(r.success).toBe(true);
    });

    it('null URL returns failure', async () => {
      const r = await svc.testSlackConnection(null);
      expect(r.success).toBe(false);
    });
  });

  describe('sendSlackMessage', () => {
    it('sends when configured', async () => {
      svc.integrations.get('slack').webhookUrl = 'https://hooks.slack.com/services/test';
      const r = await svc.sendSlackMessage('#general', 'Hello');
      expect(r.success).toBe(true);
      expect(r.sent.channel).toBe('#general');
      expect(svc.eventQueue.length).toBe(1);
    });

    it('fails when not configured', async () => {
      const r = await svc.sendSlackMessage('#general', 'Hello');
      expect(r.success).toBe(false);
    });
  });

  describe('validateSlackURL', () => {
    it('valid https hooks.slack.com URL', () => {
      expect(svc.validateSlackURL('https://hooks.slack.com/services/T123')).toBe(true);
    });

    it('http rejected', () => {
      expect(svc.validateSlackURL('http://hooks.slack.com/services/T123')).toBe(false);
    });

    it('null rejected', () => {
      expect(svc.validateSlackURL(null)).toBe(false);
    });
  });

  describe('formatSlackMessage', () => {
    it('builds blocks structure', () => {
      const msg = svc.formatSlackMessage({
        title: 'Test',
        text: 'Body',
        fields: [{ name: 'F', value: 'V' }],
        actions: [{ label: 'Click', value: 'v', url: 'http://x.com' }],
      });
      expect(msg.blocks.length).toBeGreaterThanOrEqual(3);
      expect(msg.attachments[0].color).toBe('#3498db');
    });

    it('works with defaults', () => {
      const msg = svc.formatSlackMessage();
      expect(msg.blocks.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Email
  // ═══════════════════════════════════════════════════════════════
  describe('configureEmail', () => {
    it('succeeds with full config', async () => {
      const r = await svc.configureEmail({ host: 'smtp.test.com', auth: { user: 'u', pass: 'p' } });
      expect(r.success).toBe(true);
    });

    it('fails with missing host', async () => {
      const r = await svc.configureEmail({ auth: { user: null, pass: null } });
      expect(r.success).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('sends when configured', async () => {
      const email = svc.integrations.get('email');
      email.config.host = 'smtp.test.com';
      email.config.auth = { user: 'u@test.com', pass: 'p' };

      const r = await svc.sendEmail('to@test.com', 'Subject', 'Body');
      expect(r.success).toBe(true);
      expect(r.email.to).toBe('to@test.com');
      expect(svc.eventQueue.length).toBe(1);
    });

    it('fails when host not set', async () => {
      svc.integrations.get('email').config.host = null;
      const r = await svc.sendEmail('to@test.com', 'Subject', 'Body');
      expect(r.success).toBe(false);
    });
  });

  describe('sendBulkEmail', () => {
    it('sends to multiple recipients', async () => {
      const email = svc.integrations.get('email');
      email.config.host = 'smtp.test.com';
      email.config.auth = { user: 'u@test.com', pass: 'p' };

      const r = await svc.sendBulkEmail(
        [{ email: 'a@t.com' }, { email: 'b@t.com' }],
        'Bulk',
        'Hello {{recipient}}'
      );
      expect(r.success).toBe(true);
      expect(r.totalSent).toBe(2);
    });
  });

  describe('validateEmail', () => {
    it('valid email', () => expect(svc.validateEmail('user@domain.com')).toBe(true));
    it('invalid email', () => expect(svc.validateEmail('invalid')).toBe(false));
    it('empty string', () => expect(svc.validateEmail('')).toBe(false));
  });

  // ═══════════════════════════════════════════════════════════════
  // Webhooks
  // ═══════════════════════════════════════════════════════════════
  describe('registerWebhook', () => {
    it('registers successfully', () => {
      const r = svc.registerWebhook('user.created', 'https://example.com/hook');
      expect(r.success).toBe(true);
      expect(r.webhook.event).toBe('user.created');
      expect(svc.webhooks.size).toBe(1);
    });
  });

  describe('triggerWebhooks', () => {
    it('triggers matching active webhooks', async () => {
      // Set webhooks manually to avoid Date.now() collision in same ms
      svc.webhooks.set('w1', {
        id: 'w1',
        event: 'order.placed',
        url: 'https://a.com',
        active: true,
        headers: {},
      });
      svc.webhooks.set('w2', {
        id: 'w2',
        event: 'order.placed',
        url: 'https://b.com',
        active: true,
        headers: {},
      });
      svc.webhooks.set('w3', {
        id: 'w3',
        event: 'user.created',
        url: 'https://c.com',
        active: true,
        headers: {},
      });

      const r = await svc.triggerWebhooks('order.placed', { orderId: 1 });
      expect(r.success).toBe(true);
      expect(r.triggered).toBe(2);
    });
  });

  describe('executeWebhook', () => {
    it('executes and logs event', async () => {
      const webhook = { id: 'w1', url: 'https://x.com', headers: {}, event: 'test' };
      const r = await svc.executeWebhook(webhook, { foo: 1 });
      expect(r.success).toBe(true);
      expect(svc.eventQueue.length).toBe(1);
    });
  });

  describe('deleteWebhook', () => {
    it('deletes by id', () => {
      const reg = svc.registerWebhook('e', 'https://x.com');
      const r = svc.deleteWebhook(reg.webhook.id);
      expect(r.success).toBe(true);
      expect(svc.webhooks.size).toBe(0);
    });
  });

  describe('updateWebhook', () => {
    it('updates fields', () => {
      const reg = svc.registerWebhook('e', 'https://x.com');
      const r = svc.updateWebhook(reg.webhook.id, { url: 'https://y.com' });
      expect(r.success).toBe(true);
      expect(r.webhook.url).toBe('https://y.com');
    });

    it('fails for non-existent', () => {
      const r = svc.updateWebhook('nonexistent', { url: 'x' });
      expect(r.success).toBe(false);
    });
  });

  describe('getWebhookHistory', () => {
    it('returns empty for non-existent', () => {
      expect(svc.getWebhookHistory('nonexistent')).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // External APIs
  // ═══════════════════════════════════════════════════════════════
  describe('registerExternalAPI', () => {
    it('registers API', () => {
      const r = svc.registerExternalAPI('payment', { baseUrl: 'https://api.pay.com', auth: 'k' });
      expect(r.success).toBe(true);
      expect(r.apiId).toBeDefined();
    });
  });

  describe('callExternalAPI', () => {
    it('calls registered API', async () => {
      const reg = svc.registerExternalAPI('payment', { baseUrl: 'https://api.pay.com', auth: 'k' });
      const r = await svc.callExternalAPI(reg.apiId, '/charge', 'POST', { amount: 100 });
      expect(r.success).toBe(true);
      expect(svc.eventQueue.length).toBe(1);
    });

    it('fails for unavailable API', async () => {
      const r = await svc.callExternalAPI('nonexistent', '/test');
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Connection status
  // ═══════════════════════════════════════════════════════════════
  describe('getConnectionStatus', () => {
    it('all statuses when no param', () => {
      const r = svc.getConnectionStatus();
      expect(Object.keys(r)).toEqual(['slack', 'email', 'webhook', 'api-gateway']);
    });

    it('specific integration', () => {
      const r = svc.getConnectionStatus('slack');
      expect(r.name).toBe('slack');
      expect(r.enabled).toBe(true);
    });

    it('undefined for unknown', () => {
      expect(svc.getConnectionStatus('unknown')).toBeUndefined();
    });
  });

  describe('getConnectionStatusByName', () => {
    it('default for unknown', () => {
      const r = svc.getConnectionStatusByName('unknown');
      expect(r.connected).toBe(false);
    });
  });

  describe('updateConnectionStatus', () => {
    it('sets status and lastChecked', () => {
      svc.updateConnectionStatus('slack', { connected: true });
      const s = svc.connectionStatus.get('slack');
      expect(s.connected).toBe(true);
      expect(s.lastChecked).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Event log
  // ═══════════════════════════════════════════════════════════════
  describe('getEventLog', () => {
    it('all events', () => {
      svc.eventQueue.push({ type: 'a', data: {} }, { type: 'b', data: {} });
      expect(svc.getEventLog().total).toBe(2);
    });

    it('filter by type', () => {
      svc.eventQueue.push({ type: 'a', data: {} }, { type: 'b', data: {} });
      expect(svc.getEventLog({ type: 'a' }).total).toBe(1);
    });

    it('limit results', () => {
      svc.eventQueue.push({ type: 'a' }, { type: 'b' }, { type: 'c' });
      expect(svc.getEventLog({ limit: 2 }).total).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Template / Retry / Sign
  // ═══════════════════════════════════════════════════════════════
  describe('renderTemplate', () => {
    it('replaces {{vars}}', () => {
      expect(svc.renderTemplate('Hello {{name}}!', { name: 'Ali' })).toBe('Hello Ali!');
    });
  });

  describe('retryFailedEvents', () => {
    it('retries failed events', async () => {
      svc.eventQueue.push({ type: 'a', failed: true }, { type: 'b', failed: false, success: true });
      const r = await svc.retryFailedEvents();
      expect(r.success).toBe(true);
      expect(r.retriedCount).toBe(1);
    });
  });

  describe('signPayload / verifyWebhookSignature', () => {
    it('signs and verifies', () => {
      const payload = { key: 'value' };
      const secret = 'mysecret';
      const sig = svc.signPayload(payload, secret);
      expect(typeof sig).toBe('string');
      expect(svc.verifyWebhookSignature(payload, sig, secret)).toBe(true);
      expect(svc.verifyWebhookSignature(payload, 'wrong', secret)).toBe(false);
    });
  });
});
