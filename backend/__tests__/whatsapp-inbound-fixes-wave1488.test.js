/**
 * W1488 — the two latent bugs that blocked WhatsApp inbound (found during the
 * live activation, after creds + webhook registration were all correct):
 *
 *  1. WhatsAppConversation `pre('findOneAndUpdate')` used a callback hook
 *     `function (next) { … next() }`. Under this codebase's Mongoose setup that
 *     throws "next is not a function" (W954/W483 class), so the webhook's
 *     conversation upsert threw on every inbound message → the menu bot never
 *     replied. Fixed by making the hook async (no `next`).
 *
 *  2. The WhatsApp webhook POST was subject to CSRF protection. Meta's inbound
 *     POSTs carry an HMAC signature, not a CSRF token, so every delivery was
 *     403'd. Fixed by excluding the webhook path from CSRF.
 */
'use strict';

jest.unmock('mongoose');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

describe('W1488 — WhatsAppConversation findOneAndUpdate hook is async (no "next is not a function")', () => {
  let mongod;
  let Conversation;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    Conversation = require('../models/WhatsAppConversation');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  test('upsert via findOneAndUpdate succeeds and the hook syncs urgencyRank', async () => {
    // Pre-fix this rejected with "next is not a function".
    const doc = await Conversation.findOneAndUpdate(
      { phone: '966500000001' },
      { $setOnInsert: { phone: '966500000001' }, $set: { urgencyLevel: 'high' } },
      { upsert: true, returnDocument: 'after'}
    );
    expect(doc).toBeTruthy();
    expect(doc.phone).toBe('966500000001');
    expect(doc.urgencyLevel).toBe('high');
    expect(doc.urgencyRank).toBeDefined(); // hook ran
  });

  test('updateOne with an urgencyLevel change also runs the hook without throwing', async () => {
    await Conversation.create({ phone: '966500000002', urgencyLevel: 'low' });
    await expect(
      Conversation.updateOne({ phone: '966500000002' }, { $set: { urgencyLevel: 'critical' } })
    ).resolves.toBeDefined();
    const after = await Conversation.findOne({ phone: '966500000002' });
    expect(after.urgencyLevel).toBe('critical');
  });
});

describe('W1488 — CSRF exempts the WhatsApp webhook (HMAC-authed, no CSRF token)', () => {
  const csrf = require('../middleware/csrfProtection');
  let savedDisable;

  // The test env sets CSRF_DISABLE=true (so the middleware short-circuits). Force
  // CSRF ON here so the path-exemption is actually exercised, not bypassed.
  beforeAll(() => {
    savedDisable = process.env.CSRF_DISABLE;
    delete process.env.CSRF_DISABLE;
  });
  afterAll(() => {
    if (savedDisable === undefined) delete process.env.CSRF_DISABLE;
    else process.env.CSRF_DISABLE = savedDisable;
  });

  function run(path, method) {
    const req = { path, method, headers: {} };
    const out = { status: null, nexted: false, ended: false };
    const res = {
      cookie() {},
      setHeader() {},
      status(c) {
        out.status = c;
        return this;
      },
      json() {
        out.ended = true;
        return this;
      },
    };
    csrf(req, res, () => {
      out.nexted = true;
    });
    return out;
  }

  test('POST /api/whatsapp/webhook passes (next called, no 403)', () => {
    const r = run('/api/whatsapp/webhook', 'POST');
    expect(r.nexted).toBe(true);
    expect(r.status).toBeNull();
  });

  test('POST /api/v1/whatsapp/webhook passes too', () => {
    expect(run('/api/v1/whatsapp/webhook', 'POST').nexted).toBe(true);
  });

  test('a non-webhook POST with no token is still blocked (403) — CSRF still works', () => {
    const r = run('/api/secure/thing', 'POST');
    expect(r.nexted).toBe(false);
    expect(r.status).toBe(403);
  });
});
