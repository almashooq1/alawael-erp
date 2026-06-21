/**
 * W1417 — WhatsApp bot unmatched-intent capture (keyword-tuning feedback loop).
 *
 * When the FSM can't route idle free-text to a unit it re-shows the menu; W1417
 * also flags the plan (plan.unmatched + unmatchedText) so the dispatcher can
 * record the phrase. An admin reviews the top misses (GET /bot/unmatched-intents)
 * and extends UNIT_KEYWORDS — closing the loop W1416 opened.
 *
 * Pure: shouldRecord + the service marker. Behavioral (MongoMemoryServer): the
 * recorder upsert/increment/order + skip rules + the 30-day TTL index.
 */
'use strict';

jest.unmock('mongoose');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const insights = require('../services/whatsapp/whatsappBotInsights.service');
const flow = require('../intelligence/whatsapp-bot-flow.service');

describe('W1417 — shouldRecord (pure)', () => {
  test('records real intent phrases', () => {
    expect(insights.shouldRecord('ابغى اعرف نتيجه التقييم')).toBe(true);
    expect(insights.shouldRecord('متى يفتح المركز في رمضان')).toBe(true);
  });
  test('skips empties, ultra-short, and trivial greetings', () => {
    expect(insights.shouldRecord('')).toBe(false);
    expect(insights.shouldRecord('ok')).toBe(false);
    expect(insights.shouldRecord('شكرا')).toBe(false);
    expect(insights.shouldRecord('هلا')).toBe(false);
    expect(insights.shouldRecord(null)).toBe(false);
  });
});

describe('W1417 — service marks unmatched idle free-text (pure)', () => {
  const ctx = { lang: 'ar' };
  test('an idle free-text that matches NO unit is flagged unmatched', () => {
    const plan = flow.handleTurn(
      { unit: null, step: 0, phase: 'idle' },
      'هل عندكم سباحه علاجيه',
      ctx
    );
    expect(plan.menu).toBe(true);
    expect(plan.unmatched).toBe(true);
    expect(typeof plan.unmatchedText).toBe('string');
  });
  test('a matched intent is NOT flagged unmatched', () => {
    const plan = flow.handleTurn({ unit: null, step: 0, phase: 'idle' }, 'احجز موعد', ctx);
    expect(plan.unmatched).toBeUndefined();
  });
  test('an explicit menu request is NOT flagged unmatched', () => {
    const plan = flow.handleTurn({ unit: null, step: 0, phase: 'idle' }, 'القائمة', ctx);
    expect(plan.menu).toBe(true);
    expect(plan.unmatched).toBeUndefined();
  });
});

describe('W1417 — recorder + model (MongoMemoryServer)', () => {
  let mongod;
  let Model;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    Model = require('../models/WhatsAppBotUnmatchedIntent');
    await Model.syncIndexes();
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });
  beforeEach(async () => {
    await Model.deleteMany({});
  });

  test('upserts a new phrase then increments its count on repeat', async () => {
    await insights.recordUnmatched('هل يوجد علاج بالموسيقى');
    let doc = await Model.findOne({ phrase: 'هل يوجد علاج بالموسيقي' }).lean();
    expect(doc).toBeTruthy();
    expect(doc.count).toBe(1);
    expect(doc.sample).toContain('علاج');

    await insights.recordUnmatched('هل يوجد علاج بالموسيقى');
    doc = await Model.findOne({ phrase: 'هل يوجد علاج بالموسيقي' }).lean();
    expect(doc.count).toBe(2);
  });

  test('skips trivial phrases (no row written)', async () => {
    const r = await insights.recordUnmatched('شكرا');
    expect(r.ok).toBe(false);
    expect(await Model.countDocuments({})).toBe(0);
  });

  test('topUnmatched returns phrases ordered by frequency', async () => {
    await insights.recordUnmatched('استفسار نادر هنا');
    await insights.recordUnmatched('استفسار متكرر جدا');
    await insights.recordUnmatched('استفسار متكرر جدا');
    await insights.recordUnmatched('استفسار متكرر جدا');
    const top = await insights.topUnmatched(10);
    expect(top[0].phrase).toBe('استفسار متكرر جدا'); // highest count first
    expect(top[0].count).toBe(3);
    expect(top.length).toBe(2);
  });

  test('declares a 30-day TTL index on lastSeen (PDPL auto-expiry)', async () => {
    const idx = await Model.collection.indexes();
    const ttl = idx.find(i => i.expireAfterSeconds !== undefined);
    expect(ttl).toBeTruthy();
    expect(ttl.expireAfterSeconds).toBe(60 * 60 * 24 * 30);
  });
});
