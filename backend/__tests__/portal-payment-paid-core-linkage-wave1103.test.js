/**
 * W1103 — PortalPayment → core CareTimeline linkage.
 *
 * When a guardian portal invoice transitions to fully `paid`, the model
 * emits `portal-payment / portal_payment.paid` on the unified integration
 * bus, and the DDD cross-module subscriber records one `portal_payment_paid`
 * row on the beneficiary's CareTimeline (category `family`, severity
 * `success`).
 *
 * Doctrine: every milestone for a single beneficiary is linked to the
 * beneficiary + the unified timeline + time.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(90000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
require('../models/Beneficiary');
const { integrationBus } = require('../integration/systemIntegrationBus');
const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');

let PortalPayment;
let mongo;

/** Build a valid PortalPayment payload (all required fields). */
function payment(beneficiaryId, overrides = {}) {
  return {
    guardianId: new mongoose.Types.ObjectId(),
    beneficiaryId,
    amount: 500,
    currency: 'SAR',
    description: 'رسوم الجلسات الشهرية',
    invoiceNumber: `INV-${new mongoose.Types.ObjectId()}`,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    status: 'pending',
    ...overrides,
  };
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  PortalPayment = mongoose.models.PortalPayment || require('../models/PortalPayment');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});

afterEach(async () => {
  await CareTimeline.deleteMany({});
  await PortalPayment.deleteMany({});
});

describe('W1103 PortalPayment → CareTimeline (portal_payment.paid)', () => {
  it('records a family/success timeline row when an invoice is paid', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();

    // Created pending → no row yet.
    const doc = await PortalPayment.create(payment(beneficiaryId));
    let rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(0);

    // Transition to paid.
    doc.status = 'paid';
    doc.paidDate = new Date();
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.eventType).toBe('portal_payment_paid');
    expect(row.category).toBe('family');
    expect(row.severity).toBe('success');
    expect(String(row.metadata.paymentId)).toBe(String(doc._id));
    expect(row.metadata.invoiceNumber).toBe(doc.invoiceNumber);
    expect(row.title).toContain('500');
    expect(row.title).toContain('SAR');
  });

  it('does not fire while the invoice is still pending', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await PortalPayment.create(payment(beneficiaryId));
    doc.description = 'updated description';
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(0);
  });

  it('does not fire for a non-paid status (refunded/cancelled)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await PortalPayment.create(payment(beneficiaryId));
    doc.status = 'cancelled';
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(0);
  });

  it('does not duplicate the row on a later unrelated save', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const doc = await PortalPayment.create(payment(beneficiaryId));
    doc.status = 'paid';
    doc.paidDate = new Date();
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    // Unrelated mutation — status stays 'paid', not re-modified.
    doc.reminderSentAt = new Date();
    await doc.save();
    await new Promise(r => setTimeout(r, 30));

    const rows = await CareTimeline.find({ beneficiaryId });
    expect(rows).toHaveLength(1);
  });
});
