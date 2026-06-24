'use strict';

/**
 * invoice-core-linkage-wave1023.test.js — W1023.
 *
 * Links invoice PAYMENT into the unified core (per-beneficiary CareTimeline),
 * following the W994…W1022 pattern. Invoice is the billing record (beneficiary
 * REQUIRED). When an invoice reaches 'PAID', the billing loop is closed and the
 * longitudinal record must carry it as a financial milestone:
 *   - Invoice.status === 'PAID' → invoices.invoice.paid
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Invoice;
let CareTimeline;
let integrationBus;

let invSeq = 0;
function baseInvoice(overrides = {}) {
  invSeq += 1;
  return {
    invoiceNumber: `INV-W1023-${Date.now()}-${invSeq}`,
    beneficiary: new mongoose.Types.ObjectId(),
    subTotal: 800,
    totalAmount: 800,
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1023-invoice-core' } });
  await mongoose.connect(mongod.getUri());

  Invoice = require('../models/Invoice');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([Invoice.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1023 — Invoice payment reaches the unified-core timeline', () => {
  it('paying an invoice lands an invoice_paid row (administrative/success)', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const invoice = await Invoice.create(baseInvoice({ beneficiary, status: 'ISSUED' }));

    invoice.status = 'PAID';
    invoice.paymentMethod = 'TRANSFER';
    await invoice.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'invoice_paid',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('administrative');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.invoiceId)).toBe(String(invoice._id));
    expect(tl.metadata.invoiceNumber).toBe(invoice.invoiceNumber);
    expect(tl.metadata.totalAmount).toBe(800);
    expect(tl.metadata.paymentMethod).toBe('TRANSFER');
  });

  it('an unpaid (issued) invoice produces NO timeline row', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    await Invoice.create(baseInvoice({ beneficiary, status: 'ISSUED' }));

    await waitForCount({ eventType: 'invoice_paid' }, 0);
  });

  it('re-saving an already-paid invoice does not re-fire', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const invoice = await Invoice.create(baseInvoice({ beneficiary, status: 'ISSUED' }));
    invoice.status = 'PAID';
    await invoice.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'invoice_paid',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await Invoice.findById(invoice._id);
    again.notes = 'Receipt filed.';
    await again.save();
    await waitForCount(
      {
        beneficiaryId: beneficiary,
        eventType: 'invoice_paid',
      },
      1
    );
  });
});
