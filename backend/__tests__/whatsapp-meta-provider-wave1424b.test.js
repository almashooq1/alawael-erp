'use strict';

/**
 * W1424b — Meta WhatsApp Cloud API provider.
 *
 * Closes the activation gap: the Meta creds (WHATSAPP_API_TOKEN/PHONE_ID) +
 * webhook were staged, but PROVIDER_MAP only had UltraMsg + Twilio — no Meta
 * sender. This provider posts to graph.facebook.com/{v}/{phoneId}/messages.
 */

const MetaCloudProvider = require('../integrations/whatsapp/providers/metaCloudProvider');
const { PROVIDER_MAP } = require('../integrations/whatsapp/providers');
const { PROVIDER } = require('../integrations/whatsapp/constants');

function withMockFetch(fn) {
  const orig = global.fetch;
  const captures = [];
  global.fetch = async (url, opts) => {
    captures.push({ url, body: opts.body ? JSON.parse(opts.body) : null, headers: opts.headers });
    return { ok: true, json: async () => ({ messages: [{ id: 'wamid.TEST' }] }) };
  };
  return Promise.resolve(fn(captures)).finally(() => {
    global.fetch = orig;
  });
}

describe('W1424b Meta WhatsApp Cloud API provider', () => {
  test('is registered under PROVIDER.META', () => {
    expect(PROVIDER.META).toBe('meta');
    expect(PROVIDER_MAP[PROVIDER.META]).toBe(MetaCloudProvider);
  });

  test('isEnabled only when token + phoneId present', () => {
    expect(new MetaCloudProvider({ token: 't', phoneId: 'p' }).isEnabled()).toBe(true);
    expect(new MetaCloudProvider({ token: 't' }).isEnabled()).toBe(false);
    expect(new MetaCloudProvider({ phoneId: 'p' }).isEnabled()).toBe(false);
  });

  test('sendText posts the correct Cloud-API text payload + Bearer auth', async () => {
    const p = new MetaCloudProvider({ token: 'EAATtest', phoneId: '123456' });
    await withMockFetch(async (caps) => {
      const r = await p.sendText('0512345678', 'مرحبا');
      expect(r.success).toBe(true);
      expect(r.messageId).toBe('wamid.TEST');
      const c = caps[0];
      expect(c.url).toMatch(/graph\.facebook\.com\/.*\/123456\/messages$/);
      expect(c.headers.Authorization).toBe('Bearer EAATtest');
      expect(c.body.messaging_product).toBe('whatsapp');
      expect(c.body.type).toBe('text');
      expect(c.body.to).toBe('966512345678'); // 0-prefix → 966
      expect(c.body.text.body).toBe('مرحبا');
    });
  });

  test('sendTemplate builds template payload with body parameters', async () => {
    const p = new MetaCloudProvider({ token: 't', phoneId: 'p' });
    await withMockFetch(async (caps) => {
      await p.sendTemplate('966512345678', 'reminder', { 1: 'غدًا', 2: '10ص' }, 'ar');
      const c = caps[0];
      expect(c.body.type).toBe('template');
      expect(c.body.template.name).toBe('reminder');
      expect(c.body.template.language.code).toBe('ar');
      expect(c.body.template.components[0].parameters).toHaveLength(2);
    });
  });

  test('parseWebhook extracts inbound messages from Meta payload', () => {
    const p = new MetaCloudProvider({ token: 't', phoneId: 'p' });
    const events = p.parseWebhook({
      entry: [
        {
          changes: [
            {
              value: {
                metadata: { phone_number_id: '123' },
                messages: [{ id: 'm1', from: '966512345678', type: 'text', text: { body: 'اختبار' }, timestamp: '1700000000' }],
              },
            },
          ],
        },
      ],
    });
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('message_received');
    expect(events[0].data.body).toBe('اختبار');
    expect(events[0].data.from).toBe('966512345678');
  });

  test('verifyWebhookSignature accepts a valid sha256= signature', () => {
    const crypto = require('crypto');
    const p = new MetaCloudProvider({ token: 't', phoneId: 'p' });
    const secret = 'app-secret';
    const body = JSON.stringify({ hello: 'world' });
    const sig = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
    expect(p.verifyWebhookSignature(sig, body, secret)).toBe(true);
    expect(p.verifyWebhookSignature('sha256=deadbeef', body, secret)).toBe(false);
  });
});
