/**
 * W1419 — WhatsApp bot usage funnel (per-unit entered / completed counts).
 *
 * Complements W1417 (unmatched capture): records how many conversations ENTER
 * each unit vs COMPLETE its flow, so an admin sees engagement + abandonment
 * (entered ≫ completed = a flow to shorten). The dispatcher maps deriveBotEvent
 * enter→entered, complete→completed. Admin GET /bot/usage.
 *
 * Pure: the event mapping + ignored paths. Behavioral (MongoMemoryServer): the
 * upsert/increment + usageSummary ordering + completion-rate math.
 */
'use strict';

jest.unmock('mongoose');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const insights = require('../services/whatsapp/whatsappBotInsights.service');

describe('W1419 — recordUnitEvent mapping (pure paths)', () => {
  test('USAGE_EVENTS maps deriveBotEvent events to counters', () => {
    expect(insights.USAGE_EVENTS.enter).toBe('entered');
    expect(insights.USAGE_EVENTS.complete).toBe('completed');
  });
  test('ignores missing unit or non-funnel events (no DB needed)', async () => {
    expect((await insights.recordUnitEvent('', 'enter')).ok).toBe(false);
    expect((await insights.recordUnitEvent('appointment', 'step')).ok).toBe(false);
    expect((await insights.recordUnitEvent('appointment', 'menu')).ok).toBe(false);
  });
});

describe('W1419 — usage funnel (MongoMemoryServer)', () => {
  let mongod;
  let Model;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    Model = require('../models/WhatsAppBotUnitUsage');
  });
  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });
  beforeEach(async () => {
    await Model.deleteMany({});
  });

  test('enter then complete increments the per-unit counters', async () => {
    await insights.recordUnitEvent('appointment', 'enter');
    await insights.recordUnitEvent('appointment', 'enter');
    await insights.recordUnitEvent('appointment', 'complete');
    const doc = await Model.findOne({ unitId: 'appointment' }).lean();
    expect(doc.entered).toBe(2);
    expect(doc.completed).toBe(1);
  });

  test('usageSummary returns the funnel ordered by entries + completion rate', async () => {
    await insights.recordUnitEvent('appointment', 'enter'); // 2 entered, 1 completed → 50%
    await insights.recordUnitEvent('appointment', 'enter');
    await insights.recordUnitEvent('appointment', 'complete');
    await insights.recordUnitEvent('complaint', 'enter'); // 1 entered, 0 completed → 0%
    const summary = await insights.usageSummary();
    expect(summary[0].unitId).toBe('appointment'); // most entries first
    expect(summary[0]).toMatchObject({ entered: 2, completed: 1, completionRate: 50 });
    expect(summary[1]).toMatchObject({ unitId: 'complaint', entered: 1, completionRate: 0 });
  });
});
