'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let whatsappService;
let WhatsAppConsent;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  // Stub-mode (no token = disabled) so we don't actually hit Meta.
  delete process.env.WHATSAPP_API_TOKEN;
  delete process.env.WHATSAPP_ENABLED;
  whatsappService = require('../services/whatsapp/whatsappService');
  WhatsAppConsent = require('../models/WhatsAppConsent');
});
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});
afterEach(async () => {
  await WhatsAppConsent.deleteMany({});
});

const PHONE = '966512345678';
const LOCAL = '0512345678';

describe('assertCanMessage gate', () => {
  test('throws 403 when phone has no consent record (mode=any)', async () => {
    await expect(whatsappService.assertCanMessage(PHONE, 'any')).rejects.toMatchObject({
      statusCode: 403,
      code: 'CONSENT_REQUIRED',
    });
  });

  test('passes when explicitly opted in', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    await expect(whatsappService.assertCanMessage(PHONE, 'any')).resolves.toBe('opted_in');
  });

  test('passes when inside the 24h service window even without prior opt-in', async () => {
    // recordInbound auto opts-in the first contact; resolves with 'opted_in'.
    // The service-window path matters once consent is explicitly revoked
    // but the user replies again — covered by next test.
    await WhatsAppConsent.recordInbound(PHONE);
    await expect(whatsappService.assertCanMessage(PHONE, 'any')).resolves.toMatch(
      /opted_in|in_service_window/
    );
  });

  test('opted-out user with a recent inbound passes via the service window', async () => {
    await WhatsAppConsent.setConsent(PHONE, false);
    // Inject a fresh inbound on top of the opt-out
    await WhatsAppConsent.updateOne({ phone: PHONE }, { lastInboundAt: new Date() });
    await expect(whatsappService.assertCanMessage(PHONE, 'any')).resolves.toBe('in_service_window');
  });

  test('throws 403 when opted-out + outside window', async () => {
    await WhatsAppConsent.setConsent(PHONE, false);
    await expect(whatsappService.assertCanMessage(PHONE, 'any')).rejects.toMatchObject({
      statusCode: 403,
      code: 'CONSENT_REQUIRED',
      details: { reason: 'opted_out' },
    });
  });

  test('normalizes the input phone (local Saudi → E.164) before lookup', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    // Caller passes local format — should still find the E.164 record.
    await expect(whatsappService.assertCanMessage(LOCAL, 'any')).resolves.toBe('opted_in');
  });

  test('mode=reply requires the service window even with opt-in', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    // No inbound recorded — service window is closed.
    await expect(whatsappService.assertCanMessage(PHONE, 'reply')).rejects.toMatchObject({
      statusCode: 403,
      code: 'CONSENT_REQUIRED',
    });
  });

  test('mode=reply passes after a recent inbound', async () => {
    await WhatsAppConsent.recordInbound(PHONE);
    await expect(whatsappService.assertCanMessage(PHONE, 'reply')).resolves.toBe(
      'in_service_window'
    );
  });

  test('error includes a MASKED phone (no raw PII in error.details)', async () => {
    try {
      await whatsappService.assertCanMessage(PHONE, 'any');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.details.phone).toMatch(/^\d{4}\*+\d{3}$/); // masked
      expect(err.details.phone).not.toContain('5123456'); // raw middle digits absent
    }
  });
});
