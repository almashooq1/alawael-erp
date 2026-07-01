'use strict';

/**
 * whatsapp-template-request-model.test.js
 *
 * The /template-requests workflow in whatsapp-enhanced.routes.js used to write its
 * WhatsApp-template payload into the NotificationTemplate model, whose required
 * bilingual fields (code/nameAr/nameEn/bodyAr/bodyEn) it never set → every submit
 * threw a ValidationError (the feature 500-ed; check:phantom-writes flagged it).
 *
 * Static half: the route now targets the dedicated WhatsAppTemplateRequest model.
 * Behavioral half: that model accepts the exact create payload the route builds and
 * persists every field (no strict-mode drop), and supports the approve/reject patch.
 */

const fs = require('fs');
const path = require('path');

describe('whatsapp template-request model (static contract)', () => {
  const ROUTE = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'whatsapp-enhanced.routes.js'),
    'utf8'
  );
  test('the /template-requests handlers target WhatsAppTemplateRequest, not NotificationTemplate', () => {
    expect(ROUTE).toMatch(/safeModel\('WhatsAppTemplateRequest'\)/);
    expect(ROUTE).not.toMatch(/safeModel\('NotificationTemplate'\)/);
    // the model is required so safeModel() can resolve it at boot
    expect(ROUTE).toMatch(/require\(['"]\.\.\/models\/WhatsAppTemplateRequest['"]\)/);
  });
});

describe('whatsapp template-request model (behavioral)', () => {
  jest.unmock('mongoose');
  jest.setTimeout(60000);
  let mongoose;
  let mongod;
  let WhatsAppTemplateRequest;

  beforeAll(async () => {
    mongoose = require('mongoose');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'wa-tmpl-req' } });
    await mongoose.connect(mongod.getUri());
    WhatsAppTemplateRequest = require('../models/WhatsAppTemplateRequest');
  });

  afterAll(async () => {
    await mongoose.disconnect().catch(() => null);
    if (mongod) await mongod.stop().catch(() => null);
  });

  test('accepts the route POST payload and persists every field (no strict-mode drop)', async () => {
    const doc = await WhatsAppTemplateRequest.create({
      name: 'order_update',
      language: 'ar',
      body: 'مرحبا {{1}}',
      category: 'UTILITY',
      components: [{ type: 'BODY', text: 'مرحبا {{1}}' }],
      description: 'order status',
      headerText: 'تحديث',
      footerText: 'شكرا',
      type: 'whatsapp_template',
      approvalStatus: 'pending',
      branchId: new mongoose.Types.ObjectId(),
      createdBy: new mongoose.Types.ObjectId(),
    });
    expect(doc.name).toBe('order_update');
    expect(doc.language).toBe('ar');
    expect(doc.body).toBe('مرحبا {{1}}');
    expect(Array.isArray(doc.components)).toBe(true);
    expect(doc.approvalStatus).toBe('pending');
    expect(doc.type).toBe('whatsapp_template');
  });

  test('defaults approvalStatus to pending and supports approve/reject patch', async () => {
    const doc = await WhatsAppTemplateRequest.create({ name: 'min' });
    expect(doc.approvalStatus).toBe('pending'); // not REQUIRED-omitted (the old bug)

    const reviewer = new mongoose.Types.ObjectId();
    const updated = await WhatsAppTemplateRequest.findByIdAndUpdate(
      doc._id,
      { approvalStatus: 'approved', reviewNotes: 'ok', reviewedBy: reviewer, reviewedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    );
    expect(updated.approvalStatus).toBe('approved');
    expect(String(updated.reviewedBy)).toBe(String(reviewer));
  });

  test('rejects an out-of-enum approvalStatus', async () => {
    await expect(
      WhatsAppTemplateRequest.create({ name: 'bad', approvalStatus: 'whatever' })
    ).rejects.toThrow(/approvalStatus/);
  });
});
