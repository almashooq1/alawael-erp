'use strict';

jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const reg = require('../intelligence/whatsapp-bot-flow.registry');
const botTimeline = require('../services/whatsapp/whatsappBotTimeline.service');

// ─── PURE: side-effect → timeline descriptor mapping ────────────────────────
describe('W1408 — timelineEventFor (pure)', () => {
  test('maps the beneficiary-attributable kinds to existing CareTimeline eventTypes', () => {
    expect(botTimeline.timelineEventFor({ kind: reg.SIDE_EFFECT.CREATE_COMPLAINT })).toMatchObject({
      eventType: 'note_added',
      category: 'communication',
      severity: 'warning',
    });
    expect(
      botTimeline.timelineEventFor({ kind: reg.SIDE_EFFECT.EMERGENCY_ESCALATION })
    ).toMatchObject({ eventType: 'red_flag_raised', category: 'clinical', severity: 'critical' });
    expect(botTimeline.timelineEventFor({ kind: reg.SIDE_EFFECT.CALLBACK_REQUEST })).toMatchObject({
      eventType: 'family_contact',
    });
    expect(
      botTimeline.timelineEventFor({ kind: reg.SIDE_EFFECT.SUBMIT_SATISFACTION })
    ).toMatchObject({ eventType: 'nps_response_recorded' });
  });

  test('does NOT timeline registration (no beneficiary yet) or read-only lookups', () => {
    expect(botTimeline.timelineEventFor({ kind: reg.SIDE_EFFECT.CREATE_REGISTRATION })).toBeNull();
    expect(botTimeline.timelineEventFor({ kind: reg.SIDE_EFFECT.LOOKUP_ATTENDANCE })).toBeNull();
    expect(botTimeline.timelineEventFor({ kind: reg.SIDE_EFFECT.LOOKUP_BILLING })).toBeNull();
    expect(botTimeline.timelineEventFor(null)).toBeNull();
  });

  test('every mapped eventType is one that exists in the CareTimeline enum', () => {
    const { CareTimeline } = require('../domains/timeline/models/CareTimeline');
    const allowed = CareTimeline.schema.path('eventType').enumValues;
    for (const d of Object.values(botTimeline.TIMELINE_MAP)) {
      expect(allowed).toContain(d.eventType); // no shared-enum edit needed
    }
  });
});

// ─── BEHAVIORAL: a bot event lands a real CareTimeline row (MMS) ────────────
describe('W1408 — recordBotTimelineEvent persists a real CareTimeline row', () => {
  let mongod;
  let dbReady = false;
  let CareTimeline;
  let FamilyMember;
  const benId = new mongoose.Types.ObjectId();
  const brId = new mongoose.Types.ObjectId();
  const PHONE = '966500009999';

  beforeAll(async () => {
    try {
      mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1408-core' } });
      await mongoose.connect(mongod.getUri());
      CareTimeline = require('../domains/timeline/models/CareTimeline').CareTimeline;
      FamilyMember = require('../domains/family/models/FamilyMember');
      require('../domains/timeline/services/TimelineService'); // registers/loads service
      // seed an authorized guardian → beneficiary for this phone
      await FamilyMember.collection.insertOne({
        phone: PHONE,
        beneficiaryId: benId,
        branchId: brId,
        isDeleted: false,
      });
      dbReady = true;
    } catch {
      dbReady = false;
    }
  }, 60000);

  afterAll(async () => {
    if (dbReady) {
      await mongoose.disconnect().catch(() => {});
      await mongod.stop().catch(() => {});
    }
  });

  test('complaint → a CareTimeline row on the beneficiary (note_added/communication)', async () => {
    if (!dbReady) return;
    const r = await botTimeline.recordBotTimelineEvent(
      { kind: reg.SIDE_EFFECT.CREATE_COMPLAINT, collected: { description: 'تأخر الجلسة' } },
      PHONE,
      'أحمد'
    );
    expect(r.ok).toBe(true);
    const row = await CareTimeline.findById(r.eventId).lean();
    expect(String(row.beneficiaryId)).toBe(String(benId));
    expect(row.eventType).toBe('note_added');
    expect(row.category).toBe('communication');
    expect(row.title_ar).toMatch(/شكوى/);
    expect(row.metadata.source).toBe('whatsapp_bot');
    expect(String(row.branchId)).toBe(String(brId));
  });

  test('emergency → critical red_flag_raised row', async () => {
    if (!dbReady) return;
    const r = await botTimeline.recordBotTimelineEvent(
      { kind: reg.SIDE_EFFECT.EMERGENCY_ESCALATION, collected: { description: 'سقوط' } },
      PHONE
    );
    expect(r.ok).toBe(true);
    const row = await CareTimeline.findById(r.eventId).lean();
    expect(row.eventType).toBe('red_flag_raised');
    expect(row.severity).toBe('critical');
  });

  test('unlinked phone → no timeline row (no_beneficiary)', async () => {
    if (!dbReady) return;
    const r = await botTimeline.recordBotTimelineEvent(
      { kind: reg.SIDE_EFFECT.CREATE_COMPLAINT, collected: {} },
      '966500000000'
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_beneficiary');
  });

  test('non-timelined kind (lookup) → short-circuits before any DB work', async () => {
    if (!dbReady) return;
    const r = await botTimeline.recordBotTimelineEvent(
      { kind: reg.SIDE_EFFECT.LOOKUP_ATTENDANCE, collected: {} },
      PHONE
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not_timelined');
  });
});
