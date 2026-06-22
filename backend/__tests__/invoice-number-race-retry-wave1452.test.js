'use strict';

/**
 * W1452 — invoice-number concurrency retry guard.
 *
 * BUG: createInvoice derived invoiceNumber from `countDocuments()+1` against a unique
 * index. Two concurrent creates read the same count, built the same number, and the
 * second Invoice.create threw E11000 → unhandled → 500 + lost invoice.
 *
 * FIX: retry on the duplicate-key error with a freshly recomputed number (bounded),
 * so the colliding request succeeds instead of 500ing. Non-E11000 errors still throw.
 */

const svc = require('../services/financeOperations.service');
const Invoice = require('../models/Invoice');

describe('W1452 createInvoice number-race retry', () => {
  afterEach(() => jest.restoreAllMocks());

  test('retries on E11000 and succeeds with the next number', async () => {
    jest.spyOn(Invoice, 'countDocuments').mockResolvedValue(4); // existing INV-...-0004
    let attempts = 0;
    jest.spyOn(Invoice, 'create').mockImplementation(async data => {
      attempts += 1;
      if (attempts === 1) {
        const e = new Error('E11000 duplicate key');
        e.code = 11000;
        throw e;
      }
      return { invoiceNumber: data.invoiceNumber };
    });

    const doc = await svc.createInvoice({ items: [] }, 'user-1');

    expect(attempts).toBe(2); // first threw, second succeeded
    expect(doc.invoiceNumber).toMatch(/^INV-\d{4}-\d{4}$/);
  });

  test('rethrows a non-duplicate-key error without retrying', async () => {
    jest.spyOn(Invoice, 'countDocuments').mockResolvedValue(0);
    let attempts = 0;
    jest.spyOn(Invoice, 'create').mockImplementation(async () => {
      attempts += 1;
      throw new Error('validation failed');
    });

    await expect(svc.createInvoice({ items: [] }, 'user-1')).rejects.toThrow('validation failed');
    expect(attempts).toBe(1); // no retry on a non-E11000 error
  });

  test('gives up after MAX_ATTEMPTS of persistent E11000', async () => {
    jest.spyOn(Invoice, 'countDocuments').mockResolvedValue(0);
    let attempts = 0;
    jest.spyOn(Invoice, 'create').mockImplementation(async () => {
      attempts += 1;
      const e = new Error('E11000 duplicate key');
      e.code = 11000;
      throw e;
    });

    await expect(svc.createInvoice({ items: [] }, 'user-1')).rejects.toMatchObject({ code: 11000 });
    expect(attempts).toBe(5); // bounded
  });
});
