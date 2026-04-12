/* eslint-disable no-undef */
'use strict';
/**
 * Unit Tests — Payment Gateway Validation
 * ════════════════════════════════════════
 * Tests the express-validator chains for payment gateway endpoints.
 */

const { validationResult } = require('express-validator');
const v = require('../../validations/payment-gateway.validation');

function mockReq(body = {}, params = {}) {
  return { body, params, query: {}, headers: {} };
}

async function runValidation(chains, req) {
  await Promise.all(chains.map(c => c.run(req)));
  return validationResult(req);
}

const validId = '507f1f77bcf86cd799439011';

describe('payment-gateway.validation', () => {
  /* ═══ Gateway Config ═══ */
  describe('createGateway', () => {
    it('passes with valid gateway', async () => {
      const req = mockReq({
        code: 'GW-001',
        name: 'Mada Gateway',
        provider: 'mada',
      });
      const result = await runValidation(v.createGateway, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid provider', async () => {
      const req = mockReq({
        code: 'GW-002',
        name: 'Test',
        provider: 'paypal',
      });
      const result = await runValidation(v.createGateway, req);
      expect(result.isEmpty()).toBe(false);
      expect(result.array().some(e => e.path === 'provider')).toBe(true);
    });

    it('rejects missing code', async () => {
      const req = mockReq({ name: 'Test', provider: 'visa' });
      const result = await runValidation(v.createGateway, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid supportedCurrencies', async () => {
      const req = mockReq({
        code: 'GW-003',
        name: 'Test',
        provider: 'visa',
        supportedCurrencies: ['SAR', 'USD'],
      });
      const result = await runValidation(v.createGateway, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid currency in supportedCurrencies', async () => {
      const req = mockReq({
        code: 'GW-004',
        name: 'Test',
        provider: 'visa',
        supportedCurrencies: ['SAR', 'DOGE'],
      });
      const result = await runValidation(v.createGateway, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('validates fee ranges', async () => {
      const req = mockReq({
        code: 'GW-005',
        name: 'Test',
        provider: 'visa',
        fees: { percentageFee: 150 },
      });
      const result = await runValidation(v.createGateway, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Transactions ═══ */
  describe('initiateTransaction', () => {
    it('passes with valid transaction', async () => {
      const req = mockReq({
        transactionNumber: 'TXN-001',
        type: 'payment',
        amount: 100.5,
      });
      const result = await runValidation(v.initiateTransaction, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid type', async () => {
      const req = mockReq({
        transactionNumber: 'TXN-002',
        type: 'barter',
        amount: 100,
      });
      const result = await runValidation(v.initiateTransaction, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects zero amount', async () => {
      const req = mockReq({
        transactionNumber: 'TXN-003',
        type: 'payment',
        amount: 0,
      });
      const result = await runValidation(v.initiateTransaction, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts optional valid gatewayId', async () => {
      const req = mockReq({
        transactionNumber: 'TXN-004',
        type: 'refund',
        amount: 50,
        gatewayId: validId,
      });
      const result = await runValidation(v.initiateTransaction, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid gatewayId', async () => {
      const req = mockReq({
        transactionNumber: 'TXN-005',
        type: 'refund',
        amount: 50,
        gatewayId: 'not-valid',
      });
      const result = await runValidation(v.initiateTransaction, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Refund ═══ */
  describe('refundTransaction', () => {
    it('passes with valid refund', async () => {
      const req = mockReq({ amount: 25, reason: 'Service not provided' });
      const result = await runValidation(v.refundTransaction, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing reason', async () => {
      const req = mockReq({ amount: 25 });
      const result = await runValidation(v.refundTransaction, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Payment Plans ═══ */
  describe('createPaymentPlan', () => {
    it('passes with valid plan', async () => {
      const req = mockReq({
        planNumber: 'PLAN-001',
        beneficiaryId: validId,
        totalAmount: 5000,
        numberOfInstallments: 6,
        startDate: '2026-06-01T00:00:00.000Z',
      });
      const result = await runValidation(v.createPaymentPlan, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects 1 installment (min 2)', async () => {
      const req = mockReq({
        planNumber: 'PLAN-002',
        beneficiaryId: validId,
        totalAmount: 5000,
        numberOfInstallments: 1,
        startDate: '2026-06-01T00:00:00.000Z',
      });
      const result = await runValidation(v.createPaymentPlan, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects invalid startDate', async () => {
      const req = mockReq({
        planNumber: 'PLAN-003',
        beneficiaryId: validId,
        totalAmount: 5000,
        numberOfInstallments: 3,
        startDate: 'tomorrow',
      });
      const result = await runValidation(v.createPaymentPlan, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('accepts valid frequency', async () => {
      const req = mockReq({
        planNumber: 'PLAN-004',
        beneficiaryId: validId,
        totalAmount: 5000,
        numberOfInstallments: 4,
        startDate: '2026-06-01T00:00:00.000Z',
        frequency: 'monthly',
      });
      const result = await runValidation(v.createPaymentPlan, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid frequency', async () => {
      const req = mockReq({
        planNumber: 'PLAN-005',
        beneficiaryId: validId,
        totalAmount: 5000,
        numberOfInstallments: 4,
        startDate: '2026-06-01T00:00:00.000Z',
        frequency: 'annually',
      });
      const result = await runValidation(v.createPaymentPlan, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Installment Payment ═══ */
  describe('recordInstallmentPayment', () => {
    it('passes with valid installment', async () => {
      const req = mockReq({
        installmentNumber: 1,
        transactionId: validId,
        amount: 833.33,
      });
      const result = await runValidation(v.recordInstallmentPayment, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects installmentNumber < 1', async () => {
      const req = mockReq({
        installmentNumber: 0,
        transactionId: validId,
        amount: 100,
      });
      const result = await runValidation(v.recordInstallmentPayment, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Reconciliation ═══ */
  describe('createReconciliation', () => {
    it('passes with valid reconciliation', async () => {
      const req = mockReq({
        batchNumber: 'REC-001',
        periodFrom: '2026-03-01T00:00:00.000Z',
        periodTo: '2026-03-31T23:59:59.000Z',
      });
      const result = await runValidation(v.createReconciliation, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects invalid periodFrom', async () => {
      const req = mockReq({
        batchNumber: 'REC-002',
        periodFrom: 'march',
        periodTo: '2026-03-31T23:59:59.000Z',
      });
      const result = await runValidation(v.createReconciliation, req);
      expect(result.isEmpty()).toBe(false);
    });
  });

  /* ═══ Resolve Discrepancy ═══ */
  describe('resolveDiscrepancy', () => {
    it('passes with valid resolution', async () => {
      const req = mockReq({
        index: 0,
        resolution: 'Manual adjustment applied',
        userId: validId,
      });
      const result = await runValidation(v.resolveDiscrepancy, req);
      expect(result.isEmpty()).toBe(true);
    });

    it('rejects missing resolution', async () => {
      const req = mockReq({ index: 0, userId: validId });
      const result = await runValidation(v.resolveDiscrepancy, req);
      expect(result.isEmpty()).toBe(false);
    });

    it('rejects invalid userId', async () => {
      const req = mockReq({ index: 0, resolution: 'Fixed', userId: 'bad' });
      const result = await runValidation(v.resolveDiscrepancy, req);
      expect(result.isEmpty()).toBe(false);
    });
  });
});
