'use strict';

/**
 * W1251 — RehabAdvanced(snake) → BehaviorIncident(camel) projection.
 *
 * Closes the REAL behavior split (DDD_VS_LEGACY_MODEL_SPLIT §2c): the UI writes
 * 'AggregatedBehaviorIncident' (snake), the escalation predictor reads
 * 'BehaviorIncident' (camel). Three layers:
 *   1. PURE MAPPING — category/severity tables, faithful-or-null fields.
 *   2. BEHAVIORAL (MMS) — a real .create() on the snake model produces exactly
 *      one camel incident (hook-driven), idempotently, with mapped fields —
 *      i.e. the spike rule's aggregation NOW sees UI-logged aggression.
 *   3. FAIL-SAFE — projection failures never break the source write.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  CATEGORY_TO_TYPE,
  mapBehaviorType,
  mapSeverity,
  mapRehabIncident,
  projectRehabAdvancedIncident,
} = require('../services/rehabAdvancedBehaviorProjection');

describe('W1251 pure mapping', () => {
  test('aggression family rolls up correctly (verbal IS aggression per taxonomy)', () => {
    expect(mapBehaviorType('aggression')).toBe('aggression');
    expect(mapBehaviorType('verbal_aggression')).toBe('aggression');
  });

  test('conservative roll-ups never inflate the aggression count', () => {
    expect(mapBehaviorType('stereotypy')).toBe('other');
    expect(mapBehaviorType('non_compliance')).toBe('disruption');
    expect(mapBehaviorType('tantrum')).toBe('disruption');
    expect(mapBehaviorType(undefined)).toBe('other');
  });

  test('every mapped target is a valid BehaviorIncident enum value', () => {
    const { BEHAVIOR_TYPES } = require('../models/BehaviorIncident');
    for (const v of Object.values(CATEGORY_TO_TYPE)) {
      expect(BEHAVIOR_TYPES).toContain(v);
    }
  });

  test('intensity → severity scale map', () => {
    expect(mapSeverity('mild')).toBe('minor');
    expect(mapSeverity('moderate')).toBe('moderate');
    expect(mapSeverity('severe')).toBe('major');
    expect(mapSeverity('crisis')).toBe('major');
    expect(mapSeverity('weird')).toBeUndefined();
  });

  test('mapRehabIncident is faithful-or-null', () => {
    const id = new mongoose.Types.ObjectId();
    const ben = new mongoose.Types.ObjectId();
    const out = mapRehabIncident({
      _id: id,
      beneficiary_id: ben,
      incident_info: { date: new Date('2026-06-01'), intensity: 'crisis', duration: 7 },
      behavior_type: {
        category: 'self_injury',
        description: 'وصف',
        antecedent: 'قبل',
        consequence: 'بعد',
      },
    });
    expect(out.sourceRehabAdvancedIncidentId).toBe(id);
    expect(out.beneficiaryId).toBe(ben);
    expect(out.behaviorType).toBe('self_injury');
    expect(out.severity).toBe('major');
    expect(out.durationMinutes).toBe(7);
    expect(out.behaviorDescription).toBe('وصف');
    expect(out.antecedent).toBe('قبل');
    expect(out.consequence).toBe('بعد');
    expect(out.observedAt).toEqual(new Date('2026-06-01'));
  });
});

describe('W1251 behavioral (MMS) — the escalation engine now sees UI writes', () => {
  let mongod;
  let SnakeIncident;
  let BehaviorIncident;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    // Loading the module registers the snake model + the W1251 hooks.
    SnakeIncident = require('../models/rehabilitation-advanced.model').BehaviorIncident;
    BehaviorIncident = require('../models/BehaviorIncident').BehaviorIncident;
    expect(SnakeIncident.modelName).toBe('AggregatedBehaviorIncident');
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  beforeEach(async () => {
    await SnakeIncident.deleteMany({});
    await BehaviorIncident.deleteMany({});
  });

  function snakePayload(overrides = {}) {
    return {
      beneficiary_id: new mongoose.Types.ObjectId(),
      reported_by: new mongoose.Types.ObjectId(),
      incident_info: { date: new Date('2026-06-10T08:00:00Z'), intensity: 'severe' },
      behavior_type: { category: 'aggression', description: 'ضرب زميل', antecedent: 'انتزاع لعبة' },
      ...overrides,
    };
  }

  test('UI-style create() projects exactly one camel incident with mapped fields', async () => {
    const src = await SnakeIncident.create(snakePayload());
    // post('save') is awaited by mongoose before create() resolves for async hooks
    const rows = await BehaviorIncident.find({ sourceRehabAdvancedIncidentId: src._id }).lean();
    expect(rows).toHaveLength(1);
    const inc = rows[0];
    expect(String(inc.beneficiaryId)).toBe(String(src.beneficiary_id));
    expect(inc.behaviorType).toBe('aggression');
    expect(inc.severity).toBe('major');
    expect(inc.observedAt).toEqual(new Date('2026-06-10T08:00:00Z'));
    expect(inc.behaviorDescription).toBe('ضرب زميل');
    expect(inc.antecedent).toBe('انتزاع لعبة');
  });

  test('idempotent — re-projecting the same source row never duplicates', async () => {
    const src = await SnakeIncident.create(snakePayload());
    await projectRehabAdvancedIncident(src);
    await projectRehabAdvancedIncident(src);
    const count = await BehaviorIncident.countDocuments({
      sourceRehabAdvancedIncidentId: src._id,
    });
    expect(count).toBe(1);
  });

  test('the spike-rule aggregation query now counts the UI-logged aggression', async () => {
    const ben = new mongoose.Types.ObjectId();
    await SnakeIncident.create(snakePayload({ beneficiary_id: ben }));
    await SnakeIncident.create(
      snakePayload({
        beneficiary_id: ben,
        behavior_type: { category: 'verbal_aggression' },
      })
    );
    await SnakeIncident.create(
      snakePayload({ beneficiary_id: ben, behavior_type: { category: 'stereotypy' } })
    );
    // The escalation predictor counts aggression rows per beneficiary window:
    const aggressionCount = await BehaviorIncident.countDocuments({
      beneficiaryId: ben,
      behaviorType: 'aggression',
    });
    expect(aggressionCount).toBe(2); // physical + verbal; stereotypy excluded
  });

  test('FAIL-SAFE — a broken source object cannot throw out of the projector', async () => {
    const res = await projectRehabAdvancedIncident({ _id: null });
    expect(res.ok).toBe(false);
  });
});
