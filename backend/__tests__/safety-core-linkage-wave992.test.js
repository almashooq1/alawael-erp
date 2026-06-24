'use strict';

/**
 * safety-core-linkage-wave992.test.js — W992.
 *
 * Links the three Tier-1 clinical SAFETY ledgers into the unified core
 * (per-beneficiary CareTimeline + dashboards), following the W970 appointment
 * pattern. Pre-W992 these were standalone CRUD logs invisible to the
 * longitudinal beneficiary view:
 *   - SeizureEvent          (W356)  → safety.seizure.recorded
 *   - SafeguardingConcern   (W357)  → safety.safeguarding.concern_raised
 *   - RestraintSeclusionEvent (W193b) → safety.restraint.applied
 *
 * W992 adds, atomically, the THREE artifacts doctrine requires per event:
 *   1. SAFETY_EVENTS contracts (dddEventContracts),
 *   2. `seizure_event` / `safeguarding_concern` / `restraint_seclusion`
 *      CareTimeline enum values + CareTimeline subscribers,
 *   3. native pre-compile post-save PRODUCER hooks in each model file.
 *
 * This is a RUNTIME end-to-end test (real in-memory Mongo, real integration bus,
 * real subscribers) — the W349/W970 lesson: static drift guards see the
 * subscribers but never run a `.save()`, so they miss a missing producer or a
 * CareTimeline enum throw. We assert the OBSERVABLE EFFECT (a persisted
 * CareTimeline row), exercising produce → bus → subscribe → persist.
 *
 * The producer hooks live in the model files (pre-compile) because schema
 * middleware added AFTER mongoose.model() compilation never fires — which is
 * exactly why the generic modelEventBridge produced nothing here.
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let SeizureEvent;
let SafeguardingConcern;
let RestraintSeclusionEvent;
let CareTimeline;
let integrationBus;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w992-safety-core' } });
  await mongoose.connect(mongod.getUri());

  SeizureEvent = require('../models/SeizureEvent');
  SafeguardingConcern = require('../models/SafeguardingConcern');
  RestraintSeclusionEvent = require('../models/RestraintSeclusionEvent');
  ({ CareTimeline } = require('../domains/timeline/models/CareTimeline'));
  require('../models/Beneficiary');

  ({ integrationBus } = require('../integration/systemIntegrationBus'));
  const { initializeDDDSubscribers } = require('../integration/dddCrossModuleSubscribers');
  initializeDDDSubscribers(integrationBus);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

afterEach(async () => {
  await Promise.all([
    SeizureEvent.deleteMany({}),
    SafeguardingConcern.deleteMany({}),
    RestraintSeclusionEvent.deleteMany({}),
    CareTimeline.deleteMany({}),
  ]);
});

describe('W992 — Seizure events reach the unified-core timeline', () => {
  it('a recorded seizure lands a seizure_event CareTimeline row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await SeizureEvent.create({
      beneficiaryId,
      date: new Date('2026-06-10T09:00:00.000Z'),
      startTime: new Date('2026-06-10T09:00:00.000Z'),
      type: 'tonic_clonic',
      severity: 'moderate',
      durationSeconds: 90,
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'seizure_event' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('warning');
    expect(String(tl.metadata.seizureEventId)).toBe(String(ev._id));
    expect(tl.metadata.seizureType).toBe('tonic_clonic');
  });

  it('a status-epilepticus candidate (≥ 5 min) escalates to critical', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SeizureEvent.create({
      beneficiaryId,
      date: new Date(),
      startTime: new Date(),
      type: 'tonic_clonic',
      severity: 'severe',
      durationSeconds: 360, // 6 min → status-epilepticus candidate
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'seizure_event' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('critical');
    expect(tl.metadata.statusEpilepticus).toBe(true);
  });

  it('updating an existing seizure does NOT re-fire (new-doc-only producer)', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await SeizureEvent.create({
      beneficiaryId,
      date: new Date(),
      startTime: new Date(),
      type: 'absence',
    });
    await waitForRows({ beneficiaryId, eventType: 'seizure_event' }, 1);

    const reloaded = await SeizureEvent.findById(ev._id);
    reloaded.status = 'reviewed';
    reloaded.reviewedBy = new mongoose.Types.ObjectId();
    reloaded.reviewedAt = new Date();
    await reloaded.save();

    await waitForCount({ beneficiaryId, eventType: 'seizure_event' }, 1);
  });
});

describe('W992 — Safeguarding concerns reach the unified-core timeline', () => {
  it('a beneficiary-subject concern lands a safeguarding_concern row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await SafeguardingConcern.create({
      subjectKind: 'beneficiary',
      subjectBeneficiaryId: beneficiaryId,
      reportedBy: new mongoose.Types.ObjectId(),
      category: 'neglect',
      severity: 'high',
      description: 'Observed signs warranting a safeguarding review.',
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'safeguarding_concern' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('error'); // high → error
    expect(String(tl.metadata.concernId)).toBe(String(ev._id));
    expect(tl.metadata.category).toBe('neglect');
  });

  it('a critical concern escalates the timeline entry to critical', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    await SafeguardingConcern.create({
      subjectKind: 'beneficiary',
      subjectBeneficiaryId: beneficiaryId,
      reportedBy: new mongoose.Types.ObjectId(),
      category: 'physical',
      severity: 'critical',
      supervisorNotifiedAt: new Date(), // critical → 1h-SLA supervisor notification invariant
      description: 'Critical safeguarding concern requiring immediate escalation.',
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'safeguarding_concern' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.severity).toBe('critical');
  });

  it('a non-beneficiary (staff) subject produces NO timeline row', async () => {
    await SafeguardingConcern.create({
      subjectKind: 'staff',
      reportedBy: new mongoose.Types.ObjectId(),
      category: 'other',
      severity: 'low',
      description: 'Concern about a staff member — no beneficiary timeline applies.',
    });

    await waitForCount({ eventType: 'safeguarding_concern' }, 0);
  });
});

describe('W992 — Restraint/seclusion events reach the unified-core timeline', () => {
  it('a restraint application lands a restraint_seclusion row', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const ev = await RestraintSeclusionEvent.create({
      beneficiaryId,
      date: new Date('2026-06-11T11:00:00.000Z'),
      startTime: new Date('2026-06-11T11:00:00.000Z'),
      type: 'physical',
      techniqueUsed: 'two-person escort',
      triggerBehavior: 'Aggression toward peers escalating beyond verbal redirection.',
      durationMinutes: 4,
    });

    const tlRows = await waitForRows({ beneficiaryId, eventType: 'restraint_seclusion' }, 1);
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('warning');
    expect(String(tl.metadata.restraintEventId)).toBe(String(ev._id));
    expect(tl.metadata.restraintType).toBe('physical');
  });
});
