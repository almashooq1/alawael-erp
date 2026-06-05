'use strict';

/**
 * W933 drift guard — reports-webhooks real-handler wiring.
 *
 * Locks the env-gated activation of the REAL delivery/read-receipt handler that
 * replaces the no-op `_handlerStub` (which silently dropped every provider event,
 * leaving the W762-activated reporting platform with no delivery telemetry):
 *   • default OFF (ENABLE_REPORT_WEBHOOKS unset) → stub handler + no verifiers
 *     (byte-identical inert behaviour to the prior mount)
 *   • ON → a real WebhookHandler bound to the ReportDelivery ledger
 *   • ON → external providers FAIL-CLOSED (sendgrid/mailgun/twilio/whatsapp each
 *     get a () => false verifier → 401 on unsigned events; no fail-open hole)
 *   • portal path needs no verifier (records read-receipts straight to the ledger)
 *
 * Static source reads + behavioral calls to the exported resolvers (no DB).
 */

const fs = require('fs');
const path = require('path');

const ROUTE_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'reports-webhooks.routes.js'),
  'utf8'
);

const route = require('../routes/reports-webhooks.routes');
const { _resolveDefaultHandler, _resolveDefaultVerifiers } = route;

describe('W933 reports-webhooks wiring — source shape', () => {
  it('env-gates the real handler on ENABLE_REPORT_WEBHOOKS', () => {
    expect(ROUTE_SRC).toMatch(/process\.env\.ENABLE_REPORT_WEBHOOKS\s*!==\s*'true'/);
  });
  it('builds the real WebhookHandler against the ReportDelivery ledger', () => {
    expect(ROUTE_SRC).toMatch(/require\(\s*'\.\.\/services\/reporting\/webhookHandler'\s*\)/);
    expect(ROUTE_SRC).toMatch(/require\(\s*'\.\.\/models\/ReportDelivery'\s*\)/);
    expect(ROUTE_SRC).toMatch(/new WebhookHandler\(\s*\{\s*DeliveryModel:\s*ReportDelivery\s*\}\s*\)/);
  });
  it('falls back to the no-op stub on any load error (never breaks boot)', () => {
    expect(ROUTE_SRC).toMatch(/return _handlerStub;\s*\/\/ any load error/);
  });
  it('feeds the resolvers into buildRouter', () => {
    expect(ROUTE_SRC).toMatch(/handler:\s*_resolveDefaultHandler\(\)/);
    expect(ROUTE_SRC).toMatch(/verifiers:\s*_resolveDefaultVerifiers\(\)/);
  });
});

describe('W933 _resolveDefaultHandler — env-gated', () => {
  const prev = process.env.ENABLE_REPORT_WEBHOOKS;
  afterEach(() => {
    if (prev === undefined) delete process.env.ENABLE_REPORT_WEBHOOKS;
    else process.env.ENABLE_REPORT_WEBHOOKS = prev;
  });

  it('returns the no-op stub when the flag is unset (inert default)', async () => {
    delete process.env.ENABLE_REPORT_WEBHOOKS;
    const h = _resolveDefaultHandler();
    expect(typeof h.handleEvents).toBe('function');
    await expect(h.handleEvents('portal', [])).resolves.toEqual({ processed: 0 });
  });

  it('returns a real WebhookHandler (ledger-bound) when the flag is true', () => {
    process.env.ENABLE_REPORT_WEBHOOKS = 'true';
    const { WebhookHandler } = require('../services/reporting/webhookHandler');
    const h = _resolveDefaultHandler();
    expect(h).toBeInstanceOf(WebhookHandler);
    expect(h.DeliveryModel).toBeTruthy();
  });
});

describe('W933 _resolveDefaultVerifiers — fail-closed externals', () => {
  const prev = process.env.ENABLE_REPORT_WEBHOOKS;
  afterEach(() => {
    if (prev === undefined) delete process.env.ENABLE_REPORT_WEBHOOKS;
    else process.env.ENABLE_REPORT_WEBHOOKS = prev;
  });

  it('returns no verifiers when the flag is unset', () => {
    delete process.env.ENABLE_REPORT_WEBHOOKS;
    expect(_resolveDefaultVerifiers()).toEqual({});
  });

  it('fail-closes all four external providers when the flag is true', () => {
    process.env.ENABLE_REPORT_WEBHOOKS = 'true';
    const v = _resolveDefaultVerifiers();
    for (const p of ['sendgrid', 'mailgun', 'twilio', 'whatsapp']) {
      expect(typeof v[p]).toBe('function');
      expect(v[p]()).toBe(false); // → passVerification {ok:false} → 401
    }
    // portal deliberately has NO verifier (internal/authenticated path)
    expect(v.portal).toBeUndefined();
  });
});
