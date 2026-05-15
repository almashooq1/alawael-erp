'use strict';

// Pure crypto test — doesn't need mongoose. Stays inside the global
// jest mock context.

const crypto = require('crypto');
const { verifySignature } = require('../services/whatsapp/whatsappWebhook.service');

function sign(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
}

describe('verifySignature — HMAC length-safety regression test', () => {
  const SECRET = 'test-webhook-secret-XYZ';
  const body = JSON.stringify({ object: 'whatsapp_business_account', entry: [] });

  beforeEach(() => {
    process.env.WHATSAPP_WEBHOOK_SECRET = SECRET;
  });
  afterAll(() => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
  });

  test('accepts a correctly-signed payload', () => {
    expect(verifySignature(body, sign(body, SECRET))).toBe(true);
  });

  test('rejects a payload signed with the wrong secret', () => {
    expect(verifySignature(body, sign(body, 'wrong-secret'))).toBe(false);
  });

  test('returns false on missing/empty signature without throwing', () => {
    expect(verifySignature(body, null)).toBe(false);
    expect(verifySignature(body, '')).toBe(false);
    expect(verifySignature(body, undefined)).toBe(false);
  });

  test('returns false on shorter-than-expected signature (REGRESSION)', () => {
    // Before the fix, `crypto.timingSafeEqual` threw on length mismatch
    // and crashed the webhook handler. Verify we now return false
    // cleanly without throwing.
    expect(() => verifySignature(body, 'sha256=abc')).not.toThrow();
    expect(verifySignature(body, 'sha256=abc')).toBe(false);
  });

  test('returns false on longer-than-expected signature without throwing', () => {
    expect(() => verifySignature(body, 'sha256=' + 'a'.repeat(200))).not.toThrow();
    expect(verifySignature(body, 'sha256=' + 'a'.repeat(200))).toBe(false);
  });

  test('returns false on non-string signature', () => {
    expect(verifySignature(body, 12345)).toBe(false);
    expect(verifySignature(body, { sig: 'x' })).toBe(false);
  });

  test('returns true when secret env-var is unset (dev/test mode)', () => {
    delete process.env.WHATSAPP_WEBHOOK_SECRET;
    expect(verifySignature(body, 'whatever')).toBe(true);
  });
});
