/**
 * W1242 — behavioral test for the BehaviorRecord → BehaviorIncident CQRS projection
 * (behaviorIncidentProjection.js). Verifies the root fix for the behavior write/read
 * split: a behavior logged through the UI model (BehaviorRecord, domains/behavior) is
 * faithfully projected into the legacy BehaviorIncident that the risk/escalation engine
 * reads — so UI-logged aggression reaches the `behavioral.aggression.frequency.spike_200`
 * detector instead of being silently missed (patient-safety relevant).
 *
 * Asserts: faithful topography→type roll-up (incl. hitting/kicking/biting → aggression)
 * · severity mapping · idempotent upsert · FAIL-SAFE (never throws).
 */

jest.unmock('mongoose');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  mapBehaviorType,
  mapSeverity,
  mapRecordToIncident,
  projectBehaviorRecord,
} = require('../domains/behavior/services/behaviorIncidentProjection');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  require('../models/BehaviorIncident'); // real analytics/risk model + the new field
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await mongoose.model('BehaviorIncident').deleteMany({});
});

function recordStub(overrides = {}) {
  const { behavior, ...rest } = overrides;
  return {
    _id: new mongoose.Types.ObjectId(),
    beneficiaryId: new mongoose.Types.ObjectId(),
    occurredAt: new Date('2026-06-12T09:00:00Z'),
    antecedent: { description: 'demand placed' },
    consequence: { description: 'redirected' },
    behavior: { topography: 'aggression', severity: 'severe', description: 'hit peer', ...behavior },
    ...rest,
  };
}

describe('W1242 — pure mappers (faithful clinical roll-up)', () => {
  test('topography → BehaviorIncident.behaviorType taxonomy', () => {
    expect(mapBehaviorType('aggression')).toBe('aggression');
    // safety-critical: physical aggression sub-types roll up to aggression
    expect(mapBehaviorType('hitting')).toBe('aggression');
    expect(mapBehaviorType('kicking')).toBe('aggression');
    expect(mapBehaviorType('biting')).toBe('aggression');
    expect(mapBehaviorType('self_injury')).toBe('self_injury');
    expect(mapBehaviorType('elopement')).toBe('elopement');
    expect(mapBehaviorType('throwing')).toBe('property_destruction');
    expect(mapBehaviorType('tantrums')).toBe('disruption');
    // conservative: ambiguous/internalizing → other (don't inflate aggression count)
    expect(mapBehaviorType('stereotypy')).toBe('other');
    expect(mapBehaviorType('withdrawal')).toBe('other');
    expect(mapBehaviorType(undefined)).toBe('other');
  });

  test('severity mild/moderate/severe/crisis → minor/moderate/major', () => {
    expect(mapSeverity('mild')).toBe('minor');
    expect(mapSeverity('moderate')).toBe('moderate');
    expect(mapSeverity('severe')).toBe('major');
    expect(mapSeverity('crisis')).toBe('major');
    expect(mapSeverity('weird')).toBeUndefined();
  });
});

describe('W1242 — projection (faithful, escalation-visible)', () => {
  test('UI-logged hitting becomes an aggression BehaviorIncident the predictor can see', async () => {
    const record = recordStub({ behavior: { topography: 'hitting', severity: 'crisis' } });
    const res = await projectBehaviorRecord(record);
    expect(res.ok).toBe(true);

    const BehaviorIncident = mongoose.model('BehaviorIncident');
    // the exact query the escalation source runs: by beneficiary + recent + type
    const found = await BehaviorIncident.findOne({
      beneficiaryId: record.beneficiaryId,
      behaviorType: 'aggression',
    }).lean();
    expect(found).toBeTruthy();
    expect(found.severity).toBe('major');
    expect(new Date(found.observedAt).toISOString()).toBe(record.occurredAt.toISOString());
    expect(found.antecedent).toBe('demand placed');
    expect(String(found.sourceBehaviorRecordId)).toBe(String(record._id));
  });

  test('mapRecordToIncident always yields a valid observedAt', () => {
    const fields = mapRecordToIncident(recordStub({ occurredAt: undefined }));
    expect(fields.observedAt instanceof Date).toBe(true);
    expect(fields.behaviorType).toBe('aggression');
  });
});

describe('W1242 — idempotency', () => {
  test('re-projecting updates the SAME incident, no duplicate', async () => {
    const record = recordStub();
    const r1 = await projectBehaviorRecord(record);
    const r2 = await projectBehaviorRecord({
      ...record,
      behavior: { ...record.behavior, severity: 'mild' },
    });
    expect(String(r1.id)).toBe(String(r2.id));
    const count = await mongoose
      .model('BehaviorIncident')
      .countDocuments({ sourceBehaviorRecordId: record._id });
    expect(count).toBe(1);
    const doc = await mongoose.model('BehaviorIncident').findById(r1.id).lean();
    expect(doc.severity).toBe('minor'); // updated in place
  });
});

describe('W1242 — FAIL-SAFE', () => {
  test('returns {ok:false} for null / id-less / beneficiary-less source, never throws', async () => {
    await expect(projectBehaviorRecord(null)).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
    await expect(projectBehaviorRecord({ _id: new mongoose.Types.ObjectId() })).resolves.toEqual(
      expect.objectContaining({ ok: false })
    );
  });
});
