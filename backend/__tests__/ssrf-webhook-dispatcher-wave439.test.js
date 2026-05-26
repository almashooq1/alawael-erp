/**
 * W439 — SSRF guard on DDD webhook dispatcher + WebhookService.updateWebhook.
 *
 * Pre-W439, three SSRF holes:
 *   1. `POST /api/.../webhooks` on dddWebhookDispatcher accepted `req.body.url`
 *      with no validation — attacker could register
 *      `http://169.254.169.254/latest/meta-data/iam/...` and read AWS creds
 *      out of the delivery log.
 *   2. `dispatchDDDWebhook` fired `http.request` to the stored URL with no
 *      check — stale rows or direct-DB writes could SSRF.
 *   3. `webhookService.updateWebhook` skipped the `validateOutboundUrl`
 *      check that `registerWebhook` ran, so PATCHing the URL bypassed it.
 *
 * Static source guards — both layers must invoke validateOutboundUrl.
 */

const fs = require('fs');
const path = require('path');

describe('W439 — SSRF guard on webhook dispatchers', () => {
  const dispatcherPath = path.join(__dirname, '..', 'integration', 'dddWebhookDispatcher.js');
  const dispatcherSrc = fs.readFileSync(dispatcherPath, 'utf8');

  const webhookServicePath = path.join(__dirname, '..', 'services', 'webhookService.js');
  const webhookServiceSrc = fs.readFileSync(webhookServicePath, 'utf8');

  describe('dddWebhookDispatcher', () => {
    test('imports validateOutboundUrl', () => {
      expect(dispatcherSrc).toMatch(/validateOutboundUrl/);
      expect(dispatcherSrc).toMatch(/require\(['"]\.\.\/utils\/urlValidator['"]\)/);
    });

    test('POST /webhooks validates URL before persist', () => {
      // Must call validateOutboundUrl(url) after the name/url presence
      // check and before DDDWebhook.create
      const postBlock = dispatcherSrc.slice(
        dispatcherSrc.indexOf("router.post('/webhooks'"),
        dispatcherSrc.indexOf('// Delete webhook')
      );
      expect(postBlock).toMatch(/validateOutboundUrl\(\s*url\s*\)/);
      expect(postBlock.indexOf('validateOutboundUrl')).toBeLessThan(
        postBlock.indexOf('DDDWebhook.create')
      );
    });

    test('dispatchDDDWebhook validates URL before fetch (defense-in-depth)', () => {
      const dispatchBlock = dispatcherSrc.slice(
        dispatcherSrc.indexOf('async function dispatchDDDWebhook'),
        dispatcherSrc.indexOf('function initializeDDDWebhooks')
      );
      expect(dispatchBlock).toMatch(/validateOutboundUrl\(\s*wh\.url\s*\)/);
      // Must short-circuit (`continue`) on validation failure so the
      // http.request call below never runs.
      expect(dispatchBlock).toMatch(/SSRF-blocked/);
      expect(dispatchBlock).toMatch(/continue;/);
    });
  });

  describe('webhookService.updateWebhook', () => {
    test('imports validateOutboundUrl (was already present from registerWebhook)', () => {
      expect(webhookServiceSrc).toMatch(/validateOutboundUrl/);
    });

    test('updateWebhook validates data.url before findByIdAndUpdate', () => {
      const updateBlock = webhookServiceSrc.slice(
        webhookServiceSrc.indexOf('async updateWebhook'),
        webhookServiceSrc.indexOf('async deleteWebhook')
      );
      expect(updateBlock).toMatch(/validateOutboundUrl\(\s*data\.url\s*\)/);
      expect(updateBlock.indexOf('validateOutboundUrl')).toBeLessThan(
        updateBlock.indexOf('findByIdAndUpdate')
      );
    });
  });

  describe('module load sanity', () => {
    test('dddWebhookDispatcher loads without throwing', () => {
      expect(() => require('../integration/dddWebhookDispatcher')).not.toThrow();
    });
  });
});
