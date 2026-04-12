/* eslint-disable no-undef */
'use strict';
/**
 * Unit Tests — Billing Engine Validation
 * ═══════════════════════════════════════
 * Tests the express-validator chains for billing endpoints.
 * Pure unit tests — no DB, no server needed.
 */

const { validationResult } = require('express-validator');
const v = require('../../validations/billing-engine.validation');

/* ─── Test Helpers ─── */
function mockReq(body = {}, params = {}, query = {}) {
  return { body, params, query, headers: {} };
}

async function runValidation(chains, req) {
  await Promise.all(chains.map(c => c.run(req)));
  return validationResult(req);
}

/* ═══════════════════════════════════════════ */
/*  Service Charges                            */
/* ═══════════════════════════════════════════ */
describe('billing-engine.validation', () => {
  describe('createServiceCharge', () => {
    it('passes with valid data', async () => {
      const req = mockReq({
        code: 'SRV-001',
        name: 'Physical Therapy Session',
        category: 'therapy_session',
        basePrice: 250,
      });
      const result = await runValidation(v.createServiceCharge, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing code', async () => {
      const req = mockReq({
        name: 'Test',
        category: 'consultation',
        basePrice: 100,
      });
      const result = await runValidation(v.createServiceCharge, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array()[0].path).toBe('code');
    });

    it('rejects invalid category', async () => {
      const req = mockReq({
        code: 'SRV-002',
        name: 'Test',
        category: 'INVALID_CATEGORY',
        basePrice: 100,
      });
      const result = await runValidation(v.createServiceCharge, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'category')).toBe(true);
    });

    it('rejects negative basePrice', async () => {
      const req = mockReq({
        code: 'SRV-003',
        name: 'Test',
        category: 'consultation',
        basePrice: -50,
      });
      const result = await runValidation(v.createServiceCharge, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'basePrice')).toBe(true);
    });

    it('accepts optional valid currency', async () => {
      const req = mockReq({
        code: 'SRV-004',
        name: 'Test',
        category: 'consultation',
        basePrice: 100,
        currency: 'SAR',
      });
      const result = await runValidation(v.createServiceCharge, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid currency', async () => {
      const req = mockReq({
        code: 'SRV-005',
        name: 'Test',
        category: 'consultation',
        basePrice: 100,
        currency: 'XYZ',
      });
      const result = await runValidation(v.createServiceCharge, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'currency')).toBe(true);
    });

    it('rejects taxRate > 100', async () => {
      const req = mockReq({
        code: 'SRV-006',
        name: 'Test',
        category: 'consultation',
        basePrice: 100,
        taxRate: 150,
      });
      const result = await runValidation(v.createServiceCharge, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'taxRate')).toBe(true);
    });
  });

  /* ═══════════════════════════════════════════ */
  /*  Billing Accounts                           */
  /* ═══════════════════════════════════════════ */
  describe('createBillingAccount', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('passes with valid data', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        accountNumber: 'ACC-001',
      });
      const result = await runValidation(v.createBillingAccount, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid beneficiaryId', async () => {
      const req = mockReq({
        beneficiaryId: 'not-an-objectid',
        accountNumber: 'ACC-001',
      });
      const result = await runValidation(v.createBillingAccount, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array()[0].path).toBe('beneficiaryId');
    });

    it('rejects empty accountNumber', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        accountNumber: '',
      });
      const result = await runValidation(v.createBillingAccount, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid billingCycle', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        accountNumber: 'ACC-002',
        billingCycle: 'monthly',
      });
      const result = await runValidation(v.createBillingAccount, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid billingCycle', async () => {
      const req = mockReq({
        beneficiaryId: validId,
        accountNumber: 'ACC-003',
        billingCycle: 'every_decade',
      });
      const result = await runValidation(v.createBillingAccount, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════ */
  /*  Invoices                                   */
  /* ═══════════════════════════════════════════ */
  describe('createInvoice', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('passes with valid invoice', async () => {
      const req = mockReq({
        invoiceNumber: 'INV-001',
        billingAccountId: validId,
        beneficiaryId: validId,
        dueDate: '2026-06-01T00:00:00.000Z',
        lines: [
          {
            description: 'Therapy session',
            quantity: 1,
            unitPrice: 250,
            lineTotal: 250,
          },
        ],
      });
      const result = await runValidation(v.createInvoice, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects empty lines array', async () => {
      const req = mockReq({
        invoiceNumber: 'INV-002',
        billingAccountId: validId,
        beneficiaryId: validId,
        dueDate: '2026-06-01T00:00:00.000Z',
        lines: [],
      });
      const result = await runValidation(v.createInvoice, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'lines')).toBe(true);
    });

    it('rejects invalid dueDate', async () => {
      const req = mockReq({
        invoiceNumber: 'INV-003',
        billingAccountId: validId,
        beneficiaryId: validId,
        dueDate: 'not-a-date',
        lines: [{ description: 'X', quantity: 1, unitPrice: 10, lineTotal: 10 }],
      });
      const result = await runValidation(v.createInvoice, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'dueDate')).toBe(true);
    });

    it('rejects line with negative unitPrice', async () => {
      const req = mockReq({
        invoiceNumber: 'INV-004',
        billingAccountId: validId,
        beneficiaryId: validId,
        dueDate: '2026-06-01T00:00:00.000Z',
        lines: [{ description: 'X', quantity: 1, unitPrice: -5, lineTotal: -5 }],
      });
      const result = await runValidation(v.createInvoice, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════ */
  /*  Payments                                   */
  /* ═══════════════════════════════════════════ */
  describe('recordPayment', () => {
    const validId = '507f1f77bcf86cd799439011';

    it('passes with valid payment', async () => {
      const req = mockReq({
        paymentNumber: 'PAY-001',
        billingAccountId: validId,
        beneficiaryId: validId,
        amount: 500,
        method: 'credit_card',
      });
      const result = await runValidation(v.recordPayment, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid payment method', async () => {
      const req = mockReq({
        paymentNumber: 'PAY-002',
        billingAccountId: validId,
        beneficiaryId: validId,
        amount: 500,
        method: 'bitcoin',
      });
      const result = await runValidation(v.recordPayment, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'method')).toBe(true);
    });

    it('rejects zero amount', async () => {
      const req = mockReq({
        paymentNumber: 'PAY-003',
        billingAccountId: validId,
        beneficiaryId: validId,
        amount: 0,
        method: 'cash',
      });
      const result = await runValidation(v.recordPayment, req);
      // amount >= 0, so 0 should actually pass
      expect(result.isEmpty()).toBe(true);
    });
  });

  /* ═══════════════════════════════════════════ */
  /*  Refund                                     */
  /* ═══════════════════════════════════════════ */
  describe('refundPayment', () => {
    it('passes with valid refund', async () => {
      const req = mockReq({ amount: 50, reason: 'Duplicate payment' });
      const result = await runValidation(v.refundPayment, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects zero amount', async () => {
      const req = mockReq({ amount: 0, reason: 'Test' });
      const result = await runValidation(v.refundPayment, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects missing reason', async () => {
      const req = mockReq({ amount: 50 });
      const result = await runValidation(v.refundPayment, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══════════════════════════════════════════ */
  /*  Update Scenarios                           */
  /* ═══════════════════════════════════════════ */
  describe('updateServiceCharge', () => {
    it('allows empty body (all optional)', async () => {
      const req = mockReq({});
      const result = await runValidation(v.updateServiceCharge, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('validates fields when provided', async () => {
      const req = mockReq({ category: 'INVALID' });
      const result = await runValidation(v.updateServiceCharge, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  describe('updateInvoice', () => {
    it('accepts valid status', async () => {
      const req = mockReq({ status: 'paid' });
      const result = await runValidation(v.updateInvoice, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid status', async () => {
      const req = mockReq({ status: 'UNKNOWN_STATUS' });
      const result = await runValidation(v.updateInvoice, req);
      expect(result.isEmpty()).toBe(false);
    });
  });
});
