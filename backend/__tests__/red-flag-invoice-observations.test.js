/**
 * red-flag-invoice-observations.test.js — Beneficiary-360 Commit 11b.
 *
 * Integration: real Invoice model against mongodb-memory-server.
 * Proves the financial.invoice.overdue.60d flag fires with live data.
 */

'use strict';

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createInvoiceObservations,
} = require('../services/redFlagObservations/invoiceObservations');
const { createLocator } = require('../services/redFlagServiceLocator');
const { createEngine } = require('../services/redFlagEngine');

let mongoServer;
let Invoice;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'invoice-obs-test' });
  Invoice = require('../models/Invoice');
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await Invoice.deleteMany({});
});

// ─── Helpers ────────────────────────────────────────────────────

let invoiceCounter = 1;
function invoice({ bId, status, dueDaysAgo, now = new Date() }) {
  return {
    invoiceNumber: `INV-TEST-${String(invoiceCounter++).padStart(4, '0')}`,
    beneficiary: bId,
    dueDate: dueDaysAgo == null ? null : new Date(now.getTime() - dueDaysAgo * 24 * 3600 * 1000),
    subTotal: 100,
    totalAmount: 100,
    status,
  };
}

// ─── overdueForBeneficiary ─────────────────────────────────────

describe('overdueForBeneficiary', () => {
  it('returns 0 days overdue for a beneficiary with no invoices', async () => {
    const obs = createInvoiceObservations({ model: Invoice });
    const { maxDaysOverdue } = await obs.overdueForBeneficiary(new mongoose.Types.ObjectId());
    expect(maxDaysOverdue).toBe(0);
  });

  it('returns 0 for a PAID invoice regardless of dueDate', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await Invoice.insertMany([invoice({ bId, status: 'PAID', dueDaysAgo: 90, now })]);
    const obs = createInvoiceObservations({ model: Invoice });
    const { maxDaysOverdue } = await obs.overdueForBeneficiary(bId, { now });
    expect(maxDaysOverdue).toBe(0);
  });

  it('returns the max days overdue across open unpaid invoices', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await Invoice.insertMany([
      invoice({ bId, status: 'ISSUED', dueDaysAgo: 65, now }),
      invoice({ bId, status: 'PARTIALLY_PAID', dueDaysAgo: 30, now }),
      invoice({ bId, status: 'OVERDUE', dueDaysAgo: 120, now }), // oldest
      invoice({ bId, status: 'PAID', dueDaysAgo: 200, now }), // excluded
      invoice({ bId, status: 'CANCELLED', dueDaysAgo: 300, now }), // excluded
    ]);
    const obs = createInvoiceObservations({ model: Invoice });
    const { maxDaysOverdue } = await obs.overdueForBeneficiary(bId, { now });
    expect(maxDaysOverdue).toBe(120);
  });

  it('returns 0 for DRAFT invoices (not yet owed)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await Invoice.insertMany([invoice({ bId, status: 'DRAFT', dueDaysAgo: 90, now })]);
    const obs = createInvoiceObservations({ model: Invoice });
    const { maxDaysOverdue } = await obs.overdueForBeneficiary(bId, { now });
    expect(maxDaysOverdue).toBe(0);
  });

  it('ignores future-dueDate invoices (not yet overdue)', async () => {
    const bId = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await Invoice.insertMany([invoice({ bId, status: 'ISSUED', dueDaysAgo: -10, now })]);
    const obs = createInvoiceObservations({ model: Invoice });
    const { maxDaysOverdue } = await obs.overdueForBeneficiary(bId, { now });
    expect(maxDaysOverdue).toBe(0);
  });

  it('does not leak across beneficiaries', async () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await Invoice.insertMany([
      invoice({ bId: a, status: 'ISSUED', dueDaysAgo: 90, now }),
      invoice({ bId: b, status: 'PAID', dueDaysAgo: 90, now }),
    ]);
    const obs = createInvoiceObservations({ model: Invoice });
    expect((await obs.overdueForBeneficiary(a, { now })).maxDaysOverdue).toBe(90);
    expect((await obs.overdueForBeneficiary(b, { now })).maxDaysOverdue).toBe(0);
  });
});

// ─── End-to-end via engine ─────────────────────────────────────

describe('financial.invoice.overdue.60d fires end-to-end', () => {
  it('raises when an open invoice is > 60 days past due', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await Invoice.insertMany([invoice({ bId, status: 'OVERDUE', dueDaysAgo: 90, now })]);

    const locator = createLocator();
    locator.register('invoiceService', createInvoiceObservations({ model: Invoice }));
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['financial.invoice.overdue.60d'],
      now,
    });
    expect(result.raisedCount).toBe(1);
    // Math.floor((now - dueDate)/day) — allow ±1 for millisecond
    // rounding quirks from the Mongo driver.
    expect(result.verdicts[0].observedValue).toBeGreaterThanOrEqual(89);
    expect(result.verdicts[0].observedValue).toBeLessThanOrEqual(90);
  });

  it('does NOT raise at exactly 60 days (threshold is strict >)', async () => {
    const bId = new mongoose.Types.ObjectId().toString();
    const now = new Date('2026-04-22T12:00:00.000Z');
    await Invoice.insertMany([invoice({ bId, status: 'OVERDUE', dueDaysAgo: 60, now })]);

    const locator = createLocator();
    locator.register('invoiceService', createInvoiceObservations({ model: Invoice }));
    const engine = createEngine({ locator });

    const result = await engine.evaluateBeneficiary(bId, {
      flagIds: ['financial.invoice.overdue.60d'],
      now,
    });
    expect(result.raisedCount).toBe(0);
  });
});
