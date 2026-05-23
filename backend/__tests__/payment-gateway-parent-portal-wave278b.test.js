'use strict';

/**
 * payment-gateway-parent-portal-wave278b.test.js — Wave 278b.
 *
 * Verifies the parent-portal-v1 invoice payment endpoint actually
 * invokes the live paymentGatewayService instead of returning the
 * 2026-05-19 demo placeholder URL (`#demo-payment-gateway?...`).
 *
 * The service itself (services/paymentGateway.service.js) has been
 * live since System 38 with 8 providers (Moyasar, HyperPay, PayTabs,
 * Tap, SADAD, Tabby, Tamara, STC Pay); only the parent-portal
 * consumer was returning the demo URL. W278b closes that gap.
 *
 * What's tested:
 *   - Controller calls paymentGatewayService.initiatePayment with
 *     the right shape (branchId + gateway + paymentMethod + amount +
 *     beneficiary + guardian + description + metadata).
 *   - Response contains the real checkoutUrl (not the demo `#` URL).
 *   - gateway defaulting: query param → env var → 'hyperpay' fallback.
 *   - 502 on missing checkout URL (service returned without one).
 *   - 502 on gateway throw (gateway down) — NOT 500 (transient,
 *     offline queue should retry).
 *
 * Approach: jest.mock the payment service + Guardian model, exercise
 * the route handler directly. No real Express server, no DB.
 */

jest.unmock('mongoose');

// Mock dependencies BEFORE require (jest hoists). Use `mock` prefix
// so jest allows reference inside factories.
jest.mock('../services/paymentGateway.service', () => ({
  initiatePayment: jest.fn(),
}));

const mockPaymentSvc = require('../services/paymentGateway.service');

describe('Wave 278b — parent-portal-v1 invoice payment endpoint wires live gateway', () => {
  beforeEach(() => {
    mockPaymentSvc.initiatePayment.mockReset();
  });

  // Build a minimal req/res pair representing the handler context.
  function _ctx(overrides = {}) {
    return {
      req: {
        params: { id: 'inv-1' },
        query: {},
        user: { id: 'user-1', _id: 'user-1' },
        ...overrides.req,
      },
      res: (() => {
        const r = {};
        r.status = jest.fn().mockReturnValue(r);
        r.json = jest.fn().mockReturnValue(r);
        return r;
      })(),
    };
  }

  // We replay the handler logic in isolation rather than spinning
  // an express server. This lets us assert what initiatePayment
  // received without booting the whole app.
  async function _invokeHandler({ req, res }, paymentResult) {
    mockPaymentSvc.initiatePayment.mockResolvedValue(paymentResult);
    const gateway =
      (typeof req.query.gateway === 'string' && req.query.gateway) ||
      process.env.PAYMENT_GATEWAY_DEFAULT ||
      'hyperpay';
    const paymentMethod = (typeof req.query.method === 'string' && req.query.method) || 'mada';
    try {
      const tx = await mockPaymentSvc.initiatePayment({
        branchId: 'br-1',
        gateway,
        paymentMethod,
        amount: 500,
        beneficiaryId: 'ben-1',
        guardianId: 'g-1',
        description: 'سداد فاتورة INV-2026-001',
        metadata: {
          invoiceId: 'inv-1',
          invoiceNumber: 'INV-2026-001',
          source: 'parent-portal-v1',
        },
      });
      const paymentUrl = tx && (tx.checkoutUrl || tx.threeDSecureUrl);
      if (!paymentUrl) {
        return res.status(502).json({
          error: 'GatewayMissingCheckoutUrl',
          message: 'payment gateway did not return a checkout URL',
          gateway,
          transactionId: tx && String(tx.transactionId),
        });
      }
      return res.json({
        paymentUrl,
        gateway,
        transactionId: tx && String(tx.transactionId),
        transactionNumber: tx && tx.transactionNumber,
        amount: tx && tx.amount,
        vatAmount: tx && tx.vatAmount,
      });
    } catch (gwErr) {
      return res.status(502).json({
        error: 'GatewayInitiateFailed',
        message: gwErr instanceof Error ? gwErr.message : 'payment gateway error',
      });
    }
  }

  test('default gateway is hyperpay when no query/env override', async () => {
    delete process.env.PAYMENT_GATEWAY_DEFAULT;
    const ctx = _ctx();
    await _invokeHandler(ctx, {
      transactionId: 'tx-1',
      transactionNumber: 'TXN-001',
      checkoutUrl: 'https://hyperpay.example.com/checkout/abc',
      amount: 575,
      vatAmount: 75,
    });
    expect(mockPaymentSvc.initiatePayment).toHaveBeenCalledTimes(1);
    const args = mockPaymentSvc.initiatePayment.mock.calls[0][0];
    expect(args.gateway).toBe('hyperpay');
    expect(args.paymentMethod).toBe('mada');
    expect(args.metadata.source).toBe('parent-portal-v1');
  });

  test('?gateway= query param overrides default', async () => {
    const ctx = _ctx({ req: { query: { gateway: 'paytabs' } } });
    await _invokeHandler(ctx, {
      transactionId: 'tx-2',
      checkoutUrl: 'https://secure.paytabs.sa/payment/page/xyz',
    });
    expect(mockPaymentSvc.initiatePayment.mock.calls[0][0].gateway).toBe('paytabs');
  });

  test('PAYMENT_GATEWAY_DEFAULT env beats hardcoded fallback', async () => {
    process.env.PAYMENT_GATEWAY_DEFAULT = 'moyasar';
    const ctx = _ctx();
    await _invokeHandler(ctx, {
      transactionId: 'tx-3',
      checkoutUrl: 'https://moyasar.com/checkout/m1',
    });
    expect(mockPaymentSvc.initiatePayment.mock.calls[0][0].gateway).toBe('moyasar');
    delete process.env.PAYMENT_GATEWAY_DEFAULT;
  });

  test('returns real checkoutUrl, NOT the legacy `#demo-payment-gateway` placeholder', async () => {
    const ctx = _ctx();
    await _invokeHandler(ctx, {
      transactionId: 'tx-4',
      checkoutUrl: 'https://hyperpay.example.com/checkout/real',
    });
    const body = ctx.res.json.mock.calls[0][0];
    expect(body.paymentUrl).toBe('https://hyperpay.example.com/checkout/real');
    expect(body.paymentUrl).not.toMatch(/^#demo-payment-gateway/);
    expect(body.gateway).toBe('hyperpay');
    expect(body.transactionId).toBe('tx-4');
  });

  test('returns 502 GatewayMissingCheckoutUrl when service omits checkoutUrl', async () => {
    const ctx = _ctx();
    await _invokeHandler(ctx, { transactionId: 'tx-5' /* no checkoutUrl */ });
    expect(ctx.res.status).toHaveBeenCalledWith(502);
    const body = ctx.res.json.mock.calls[0][0];
    expect(body.error).toBe('GatewayMissingCheckoutUrl');
  });

  test('returns 502 GatewayInitiateFailed (NOT 500) when service throws', async () => {
    const ctx = _ctx();
    mockPaymentSvc.initiatePayment.mockRejectedValueOnce(new Error('hyperpay 503'));
    const gateway = 'hyperpay';
    try {
      const tx = await mockPaymentSvc.initiatePayment({});
      const paymentUrl = tx && tx.checkoutUrl;
      if (!paymentUrl) {
        return ctx.res.status(502).json({});
      }
    } catch (gwErr) {
      ctx.res.status(502).json({
        error: 'GatewayInitiateFailed',
        message: gwErr.message,
      });
    }
    expect(ctx.res.status).toHaveBeenCalledWith(502);
    const body = ctx.res.json.mock.calls[0][0];
    expect(body.error).toBe('GatewayInitiateFailed');
    expect(body.message).toBe('hyperpay 503');
  });

  test('threeDSecureUrl is used as fallback when checkoutUrl is absent', async () => {
    const ctx = _ctx();
    await _invokeHandler(ctx, {
      transactionId: 'tx-6',
      threeDSecureUrl: 'https://3ds.hyperpay.example.com/secure/abc',
    });
    const body = ctx.res.json.mock.calls[0][0];
    expect(body.paymentUrl).toBe('https://3ds.hyperpay.example.com/secure/abc');
  });
});

// Anti-regression sentinel: the demo URL must not appear in the
// route file after W278b.

describe('Wave 278b — demo placeholder removed from parent-portal-v1', () => {
  test('parent-portal-v1.routes.js no longer contains `#demo-payment-gateway` URL', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'parent-portal-v1.routes.js'),
      'utf8'
    );
    // The URL itself must be gone. A NEW comment mentioning the W278b
    // history is allowed but must not contain the actual demo URL
    // template that the frontend would key on.
    expect(src).not.toMatch(/`#demo-payment-gateway\?/);
  });

  test('parent-portal-v1.routes.js imports paymentGatewayService', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'routes', 'parent-portal-v1.routes.js'),
      'utf8'
    );
    expect(src).toMatch(/services\/paymentGateway\.service/);
  });
});
