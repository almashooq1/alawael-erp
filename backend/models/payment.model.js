/**
 * payment.model.js — Compatibility Proxy
 * ═══════════════════════════════════════
 * CANONICAL MODEL: Payment.js (100L, accounting focus: invoiceId,
 *   reference, paymentMethod, accountId, checkNumber, processedBy)
 *
 * This file re-exports the canonical Payment model for production,
 * and provides a mock class for test environments.
 */
/* eslint-disable no-unused-vars */

const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

if (!useMock) {
  // Delegate to canonical Payment.js
  module.exports = require('./Payment');
} else {
  // Mock Model
  class MockPayment {
    constructor(data) {
      Object.assign(this, data);
    }
    static find() {
      return { sort: () => ({ limit: () => [] }) };
    }
    save() {
      return Promise.resolve(this);
    }
    static findById(id) {
      return Promise.resolve(null);
    }
  }
  module.exports = MockPayment;
}
