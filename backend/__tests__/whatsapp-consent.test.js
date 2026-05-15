'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;
let WhatsAppConsent;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
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

describe('WhatsAppConsent.setConsent()', () => {
  test('creates a doc on first opt-in and stamps optedInAt', async () => {
    const doc = await WhatsAppConsent.setConsent(PHONE, true, { reason: 'user_request' });
    expect(doc.optedIn).toBe(true);
    expect(doc.optedInAt).toBeInstanceOf(Date);
    expect(doc.history).toHaveLength(1);
    expect(doc.history[0].reason).toBe('user_request');
  });

  test('opt-out flips state and stamps optedOutAt + keeps history', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    const after = await WhatsAppConsent.setConsent(PHONE, false, { reason: 'user_request' });
    expect(after.optedIn).toBe(false);
    expect(after.optedOutAt).toBeInstanceOf(Date);
    expect(after.history).toHaveLength(2);
    expect(after.history.map(h => h.optedIn)).toEqual([true, false]);
  });

  test('repeated opt-in pushes a new history entry (audit trail)', async () => {
    await WhatsAppConsent.setConsent(PHONE, true, { reason: 'first_inbound' });
    await WhatsAppConsent.setConsent(PHONE, false, { reason: 'user_request' });
    const after = await WhatsAppConsent.setConsent(PHONE, true, { reason: 'admin_action' });
    expect(after.history).toHaveLength(3);
  });
});

describe('WhatsAppConsent.recordInbound()', () => {
  test('first inbound auto-creates an opted-in doc', async () => {
    const doc = await WhatsAppConsent.recordInbound(PHONE);
    expect(doc.optedIn).toBe(true);
    expect(doc.lastInboundAt).toBeInstanceOf(Date);
    expect(doc.history[0].reason).toBe('first_inbound');
  });

  test('subsequent inbounds just update lastInboundAt (no new history)', async () => {
    const t1 = await WhatsAppConsent.recordInbound(PHONE);
    await new Promise(r => setTimeout(r, 10));
    const t2 = await WhatsAppConsent.recordInbound(PHONE);
    expect(t2.lastInboundAt.getTime()).toBeGreaterThan(t1.lastInboundAt.getTime());
    expect(t2.history).toHaveLength(1);
  });

  test('does NOT re-opt-in an explicitly opted-out user', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    await WhatsAppConsent.setConsent(PHONE, false);
    const after = await WhatsAppConsent.recordInbound(PHONE);
    expect(after.optedIn).toBe(false);
    expect(after.lastInboundAt).toBeInstanceOf(Date);
  });
});

describe('WhatsAppConsent.canMessage()', () => {
  test('false when there is no record at all', async () => {
    const r = await WhatsAppConsent.canMessage(PHONE);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('no_consent_record');
  });

  test('true when opted in', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    expect((await WhatsAppConsent.canMessage(PHONE)).allowed).toBe(true);
  });

  test('false when opted out (even if previously opted in)', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    await WhatsAppConsent.setConsent(PHONE, false);
    const r = await WhatsAppConsent.canMessage(PHONE);
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('opted_out');
  });

  test('TRUE within 24-hour service window even when opted-out', async () => {
    await WhatsAppConsent.setConsent(PHONE, false);
    // Manually inject a recent inbound timestamp
    await WhatsAppConsent.updateOne({ phone: PHONE }, { lastInboundAt: new Date() });
    const r = await WhatsAppConsent.canMessage(PHONE);
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe('in_service_window');
  });

  test('false when inbound was >24h ago', async () => {
    await WhatsAppConsent.setConsent(PHONE, false);
    const stale = new Date(Date.now() - 25 * 3600 * 1000);
    await WhatsAppConsent.updateOne({ phone: PHONE }, { lastInboundAt: stale });
    const r = await WhatsAppConsent.canMessage(PHONE);
    expect(r.allowed).toBe(false);
  });
});

describe('WhatsAppConsent.canReply()', () => {
  test('false when never received a message', async () => {
    await WhatsAppConsent.setConsent(PHONE, true);
    expect(await WhatsAppConsent.canReply(PHONE)).toBe(false);
  });

  test('true within 24h of last inbound', async () => {
    await WhatsAppConsent.recordInbound(PHONE);
    expect(await WhatsAppConsent.canReply(PHONE)).toBe(true);
  });

  test('false when last inbound is older than 24h', async () => {
    await WhatsAppConsent.recordInbound(PHONE);
    const stale = new Date(Date.now() - 25 * 3600 * 1000);
    await WhatsAppConsent.updateOne({ phone: PHONE }, { lastInboundAt: stale });
    expect(await WhatsAppConsent.canReply(PHONE)).toBe(false);
  });
});
