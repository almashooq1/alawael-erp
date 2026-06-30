'use strict';

/**
 * W1424h — the secondary WhatsApp webhook (routes/webhook.routes.js, mounted at
 * /api/v1/webhooks) is now fail-closed and delegates to the canonical handlers.
 *
 * Before: GET verify returned 200 on a BAD token (and compared against
 * WHATSAPP_WEBHOOK_SECRET, not WHATSAPP_VERIFY_TOKEN); POST was fail-OPEN on the
 * HMAC signature (processed forged inbound events). Both now delegate to
 * whatsappService.verifyWebhook + whatsappWebhook.processWebhook (fail-closed).
 */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'routes', 'webhook.routes.js'), 'utf8');
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

describe('W1424h secondary webhook fail-closed + canonical delegation', () => {
  test('GET verify delegates to the canonical verifier', () => {
    expect(CODE).toMatch(/whatsappService\.verifyWebhook/);
  });

  test('no fail-open GET (no "status:ok" 200 on token mismatch, no wrong-token compare)', () => {
    expect(CODE).not.toMatch(/status:\s*['"]ok['"]/);
    expect(CODE).not.toMatch(/WHATSAPP_WEBHOOK_SECRET/);
    expect(CODE).not.toMatch(/hub\.verify_token/); // hand-rolled verify removed
  });

  test('POST verifies the HMAC signature fail-closed BEFORE processing', () => {
    expect(CODE).toMatch(/verifySignature/);
    expect(CODE).toMatch(/status\(401\)/);
    expect(CODE.indexOf('verifySignature')).toBeLessThan(CODE.indexOf('processWebhook'));
  });

  test('POST delegates to the canonical processWebhook (not the fail-open webhookHandler)', () => {
    expect(CODE).toMatch(/\.processWebhook\(/); // may be line-split off whatsappWebhook by prettier
    expect(CODE).toMatch(/whatsappWebhook/);
    expect(CODE).not.toMatch(/getWebhookHandler/);
  });
});
