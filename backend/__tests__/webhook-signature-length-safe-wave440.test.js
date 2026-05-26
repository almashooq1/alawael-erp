/**
 * W440 — landmine cleanup: 3 dormant security helpers hardened.
 *
 *   (a) IntegrationService.validateWebhookSignature: `crypto.timingSafeEqual`
 *       throws on length-mismatched buffers. The only call site is currently
 *       commented out in routes/integrations.routes.js — but the method is
 *       public and a future un-comment plus a wrong-length signature would
 *       crash the request handler with a 500. Length pre-check + ALWAYS
 *       returns boolean (never throws).
 *
 *   (b) IntegrationService.registerWebhook + updateWebhook: in-memory
 *       webhook registry lacked SSRF gating. Dispatch is currently stubbed
 *       to log-only, but the moment someone wires real HTTP an attacker can
 *       SSRF via stored internal URLs. validateOutboundUrlSync runs at
 *       storage time, no network round-trip required.
 *
 *   (c) gpsSecurityService.verifyAPIKey: same `timingSafeEqual` length
 *       trap. Outer try/catch hid the throw, but the two failure paths
 *       (length-mismatch vs content-mismatch) traversed different code:
 *       added a length pre-check so both return false via the same
 *       short-circuit.
 *
 * Behavioral + static source guards.
 */

const fs = require('fs');
const path = require('path');

describe('W440 — landmine cleanup', () => {
  describe('IntegrationService.validateWebhookSignature', () => {
    const IntegrationService = require('../services/integrationService');

    test('returns false on wrong-length signature (no throw)', () => {
      const svc = new IntegrationService();
      const result = svc.validateWebhookSignature('shortsig', 'payload', 'secret');
      expect(result).toBe(false);
    });

    test('returns false on null signature', () => {
      const svc = new IntegrationService();
      expect(svc.validateWebhookSignature(null, 'payload', 'secret')).toBe(false);
      expect(svc.validateWebhookSignature(undefined, 'payload', 'secret')).toBe(false);
      expect(svc.validateWebhookSignature('', 'payload', 'secret')).toBe(false);
    });

    test('returns false on null secret', () => {
      const svc = new IntegrationService();
      expect(svc.validateWebhookSignature('a'.repeat(64), 'payload', null)).toBe(false);
      expect(svc.validateWebhookSignature('a'.repeat(64), 'payload', undefined)).toBe(false);
    });

    test('returns true on correct signature', () => {
      const svc = new IntegrationService();
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha256', 'mysecret').update('mypayload').digest('hex');
      expect(svc.validateWebhookSignature(sig, 'mypayload', 'mysecret')).toBe(true);
    });

    test('returns false on tampered correct-length signature', () => {
      const svc = new IntegrationService();
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha256', 'mysecret').update('mypayload').digest('hex');
      const tampered = '0'.repeat(sig.length);
      expect(svc.validateWebhookSignature(tampered, 'mypayload', 'mysecret')).toBe(false);
    });
  });

  describe('IntegrationService.registerWebhook SSRF guard', () => {
    const IntegrationService = require('../services/integrationService');

    test('rejects private IP URL', () => {
      const svc = new IntegrationService();
      expect(() => svc.registerWebhook('http://127.0.0.1/hook', ['e'])).toThrow(
        /Invalid webhook URL/
      );
    });

    test('rejects AWS metadata URL', () => {
      const svc = new IntegrationService();
      expect(() => svc.registerWebhook('http://169.254.169.254/latest/meta-data/', ['e'])).toThrow(
        /Invalid webhook URL/
      );
    });

    test('rejects localhost URL', () => {
      const svc = new IntegrationService();
      expect(() => svc.registerWebhook('http://localhost:9200/_search', ['e'])).toThrow(
        /Invalid webhook URL/
      );
    });

    test('rejects non-HTTP scheme', () => {
      const svc = new IntegrationService();
      expect(() => svc.registerWebhook('file:///etc/passwd', ['e'])).toThrow(/Invalid webhook URL/);
    });

    test('accepts public HTTPS URL', () => {
      const svc = new IntegrationService();
      expect(() => svc.registerWebhook('https://hooks.example.com/abc', ['e'])).not.toThrow();
    });
  });

  describe('IntegrationService.updateWebhook SSRF guard', () => {
    const IntegrationService = require('../services/integrationService');

    test('rejects update with private IP url', () => {
      const svc = new IntegrationService();
      const created = svc.registerWebhook('https://hooks.example.com/abc', ['e']);
      expect(() => svc.updateWebhook(created.id, { url: 'http://10.0.0.1/hook' })).toThrow(
        /Invalid webhook URL/
      );
    });

    test('allows url-less updates (events only) without SSRF check', () => {
      const svc = new IntegrationService();
      const created = svc.registerWebhook('https://hooks.example.com/abc', ['e']);
      expect(() => svc.updateWebhook(created.id, { events: ['new-event'] })).not.toThrow();
    });
  });

  describe('static source shapes', () => {
    const intSrc = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'integrationService.js'),
      'utf8'
    );
    const gpsSrc = fs.readFileSync(
      path.join(__dirname, '..', 'services', 'gpsSecurityService.js'),
      'utf8'
    );

    test('integrationService imports validateOutboundUrlSync', () => {
      expect(intSrc).toMatch(/validateOutboundUrlSync/);
    });

    test('gpsSecurityService.verifyAPIKey has length pre-check', () => {
      const block = gpsSrc.slice(
        gpsSrc.indexOf('static async verifyAPIKey'),
        gpsSrc.indexOf('static async verifyAPIKey') + 1500
      );
      expect(block).toMatch(/length\s*!==\s*hashBuf\.length/);
      expect(block).toMatch(/timingSafeEqual\(keyBuf,\s*hashBuf\)/);
    });
  });
});
