/**
 * W441 — SSRF guard on documentIntegrations service (create/update/_httpRequest).
 *
 * Pre-W441 the entire surface was a live SSRF:
 *   - POST /api/.../integrations stored `req.body.config.url` with no
 *     check
 *   - PATCH /integrations/:id updated `config.url` with no check
 *   - triggerIntegration → _httpRequest(config.url) actually fetched
 *     the stored URL via real fetch() / http.request()
 *
 * Attacker (authenticated): create integration with
 *   config.url = http://169.254.169.254/latest/meta-data/iam/...
 * fire the trigger, read the response out of IntegrationLog. AWS IAM
 * creds exfil.
 *
 * Fix — three gates:
 *   (1) create: `validateOutboundUrl(config.url)` (async, DNS-rebind
 *       defence)
 *   (2) update: same check on `updates.config.url` when present
 *   (3) _httpRequest: `validateOutboundUrlSync(url)` defense-in-depth
 *       at fetch time (no DNS round-trip)
 */

const fs = require('fs');
const path = require('path');

describe('W441 — SSRF guard on documentIntegrations.service', () => {
  const srcPath = path.join(
    __dirname,
    '..',
    'services',
    'documents',
    'documentIntegrations.service.js'
  );
  const src = fs.readFileSync(srcPath, 'utf8');

  describe('static source shape', () => {
    test('imports validateOutboundUrl + validateOutboundUrlSync', () => {
      expect(src).toMatch(/validateOutboundUrl/);
      expect(src).toMatch(/validateOutboundUrlSync/);
      expect(src).toMatch(/require\(['"]\.\.\/\.\.\/utils\/urlValidator['"]\)/);
    });

    test('create() invokes async validator before persist', () => {
      const block = src.slice(src.indexOf('async create('), src.indexOf('async create(') + 2000);
      expect(block).toMatch(/_validateOutboundUrl\(config\.url\)/);
      const validatorPos = block.indexOf('_validateOutboundUrl(config.url)');
      const newIntegrationPos = block.indexOf('new Integration(');
      expect(validatorPos).toBeGreaterThan(-1);
      expect(newIntegrationPos).toBeGreaterThan(-1);
      expect(validatorPos).toBeLessThan(newIntegrationPos);
    });

    test('update() invokes async validator before findByIdAndUpdate', () => {
      const block = src.slice(src.indexOf('async update('), src.indexOf('async update(') + 2000);
      expect(block).toMatch(/_validateOutboundUrl\(updates\.config\.url\)/);
      expect(block.indexOf('_validateOutboundUrl(updates.config.url)')).toBeLessThan(
        block.indexOf('findByIdAndUpdate')
      );
    });

    test('_httpRequest invokes sync validator before fetch / http.request', () => {
      const block = src.slice(
        src.indexOf('async _httpRequest('),
        src.indexOf('async _httpRequest(') + 3000
      );
      expect(block).toMatch(/_validateOutboundUrlSync\(url\)/);
      expect(block).toMatch(/SSRF-blocked outbound URL/);
      // Throw must come before fetch() and http.request(
      const checkPos = block.indexOf('_validateOutboundUrlSync(url)');
      const fetchPos = block.indexOf('await fetch(');
      const httpReqPos = block.indexOf('lib.request(');
      expect(checkPos).toBeLessThan(fetchPos);
      expect(checkPos).toBeLessThan(httpReqPos);
    });
  });

  describe('behavioral — _httpRequest defense-in-depth', () => {
    let svc;
    beforeAll(() => {
      const documentIntegrations = require('../services/documents/documentIntegrations.service');
      svc = documentIntegrations;
    });

    test('throws SSRF-blocked on private IP URL', async () => {
      await expect(svc._httpRequest('http://127.0.0.1/hook', { method: 'POST' })).rejects.toThrow(
        /SSRF-blocked/
      );
    });

    test('throws SSRF-blocked on AWS metadata URL', async () => {
      await expect(
        svc._httpRequest('http://169.254.169.254/latest/meta-data/', { method: 'GET' })
      ).rejects.toThrow(/SSRF-blocked/);
    });

    test('throws SSRF-blocked on localhost URL', async () => {
      await expect(svc._httpRequest('http://localhost:6379/', { method: 'GET' })).rejects.toThrow(
        /SSRF-blocked/
      );
    });

    test('throws SSRF-blocked on file:// scheme', async () => {
      await expect(svc._httpRequest('file:///etc/passwd', { method: 'GET' })).rejects.toThrow(
        /SSRF-blocked/
      );
    });
  });
});
