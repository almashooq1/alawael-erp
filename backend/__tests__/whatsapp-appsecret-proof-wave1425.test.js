/**
 * W1425 — WhatsApp Graph calls carry appsecret_proof when the app secret is set.
 *
 * Found LIVE during activation: the Meta app had "Require app secret" enabled, so
 * server-side Graph calls without appsecret_proof are rejected with
 * "API calls from the server require an appsecret_proof argument" (code 100) —
 * every send/template/media call would fail. Fix: request() appends
 * appsecret_proof = HMAC-SHA256(accessToken, appSecret) whenever an app secret
 * (WHATSAPP_WEBHOOK_SECRET) is configured. These tests lock that behavior.
 */
'use strict';

jest.mock('https');
const https = require('https');
const crypto = require('crypto');

function installCapture() {
  let captured = null;
  https.request.mockImplementation((options, cb) => {
    captured = options;
    return {
      on: () => {},
      write: () => {},
      end: () => {
        const res = {
          statusCode: 200,
          on: (ev, fn) => {
            if (ev === 'data') fn(JSON.stringify({ id: '999', display_phone_number: '+1' }));
            else if (ev === 'end') fn();
          },
        };
        cb(res);
      },
    };
  });
  return () => captured;
}

describe('W1425 — appsecret_proof on Graph calls', () => {
  const TOKEN = 'EAAtoken123';
  const SECRET = 'appsecret456';
  const PID = '999';
  const saved = {};
  const KEYS = [
    'WHATSAPP_API_TOKEN',
    'WHATSAPP_WEBHOOK_SECRET',
    'WHATSAPP_PHONE_ID',
    'WHATSAPP_ENABLED',
  ];

  beforeEach(() => {
    KEYS.forEach(k => (saved[k] = process.env[k]));
    process.env.WHATSAPP_API_TOKEN = TOKEN;
    process.env.WHATSAPP_WEBHOOK_SECRET = SECRET;
    process.env.WHATSAPP_PHONE_ID = PID;
    process.env.WHATSAPP_ENABLED = 'true';
    https.request.mockReset();
  });
  afterEach(() => {
    KEYS.forEach(k => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    });
  });

  test('a Graph call carries appsecret_proof = HMAC-SHA256(token, appSecret)', async () => {
    const get = installCapture();
    const svc = require('../services/whatsapp/whatsappService');
    await svc.getPhoneInfo();
    const opts = get();
    expect(opts).toBeTruthy();
    const expected = crypto.createHmac('sha256', SECRET).update(TOKEN).digest('hex');
    expect(opts.path).toContain('appsecret_proof=' + expected);
  });

  test('omits appsecret_proof when no app secret is configured (no crash)', async () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    const get = installCapture();
    const svc = require('../services/whatsapp/whatsappService');
    await svc.getPhoneInfo();
    const opts = get();
    expect(opts).toBeTruthy();
    expect(opts.path).not.toContain('appsecret_proof');
  });

  test('proof is appended with the correct separator (? for a query-less path)', async () => {
    const get = installCapture();
    const svc = require('../services/whatsapp/whatsappService');
    await svc.getPhoneInfo();
    const opts = get();
    // exactly one '?' and the proof present
    expect((opts.path.match(/\?/g) || []).length).toBe(1);
    expect(opts.path).toMatch(/[?&]appsecret_proof=[a-f0-9]{64}$/);
  });
});
