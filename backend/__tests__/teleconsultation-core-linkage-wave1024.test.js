'use strict';

/**
 * teleconsultation-core-linkage-wave1024.test.js — W1024.
 *
 * Links tele-rehabilitation session COMPLETION into the unified core
 * (per-beneficiary CareTimeline), following the W994…W1023 pattern.
 * Teleconsultation is the remote-session record (beneficiary REQUIRED). When a
 * consultation reaches 'completed', the longitudinal record must carry it as a
 * clinical milestone:
 *   - Teleconsultation.status === 'completed'
 *       → teleconsultations.teleconsultation.completed
 *
 * RUNTIME end-to-end test (real in-memory Mongo, real integration bus, real
 * subscribers): asserts the OBSERVABLE EFFECT (a persisted CareTimeline row).
 */

jest.unmock('mongoose');
jest.setTimeout(90000);

const { waitForRows, waitForCount } = require('./helpers/waitForTimelineRows');

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Teleconsultation;
let CareTimeline;
let integrationBus;

let tcSeq = 0;
function baseTeleconsultation(overrides = {}) {
  tcSeq += 1;
  const stamp = `${Date.now()}-${tcSeq}`;
  return {
    uuid: `tc-w1024-${stamp}`,
    consultationNumber: `TC-W1024-${stamp}`,
    branch: new mongoose.Types.ObjectId(),
    beneficiary: new mongoose.Types.ObjectId(),
    provider: new mongoose.Types.ObjectId(),
    type: 'video',
    specialty: 'speech_therapy',
    scheduledAt: new Date(),
    ...overrides,
  };
}

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1024-teleconsult-core' } });
  await mongoose.connect(mongod.getUri());

  ({ Teleconsultation } = require('../models/Telehealth'));
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
  await Promise.all([Teleconsultation.deleteMany({}), CareTimeline.deleteMany({})]);
});

describe('W1024 — Tele-rehab consultation completion reaches the unified-core timeline', () => {
  it('completing a consultation lands a teleconsultation_completed row (clinical/success)', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const tc = await Teleconsultation.create(
      baseTeleconsultation({ beneficiary, status: 'in_progress' })
    );

    tc.status = 'completed';
    tc.endedAt = new Date();
    tc.durationMinutes = 32;
    await tc.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'teleconsultation_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();
    expect(tl.category).toBe('clinical');
    expect(tl.severity).toBe('success');
    expect(String(tl.metadata.teleconsultationId)).toBe(String(tc._id));
    expect(tl.metadata.consultationNumber).toBe(tc.consultationNumber);
    expect(tl.metadata.specialty).toBe('speech_therapy');
    expect(tl.metadata.type).toBe('video');
    expect(tl.metadata.durationMinutes).toBe(32);
  });

  it('a scheduled (not completed) consultation produces NO timeline row', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    await Teleconsultation.create(baseTeleconsultation({ beneficiary, status: 'scheduled' }));

    await waitForCount({ eventType: 'teleconsultation_completed' }, 0);
  });

  it('re-saving an already-completed consultation does not re-fire', async () => {
    const beneficiary = new mongoose.Types.ObjectId();
    const tc = await Teleconsultation.create(
      baseTeleconsultation({ beneficiary, status: 'in_progress' })
    );
    tc.status = 'completed';
    await tc.save();

    const tlRows = await waitForRows(
      {
        beneficiaryId: beneficiary,
        eventType: 'teleconsultation_completed',
      },
      1
    );
    const tl = tlRows[0];
    expect(tl).toBeTruthy();

    const again = await Teleconsultation.findById(tc._id);
    again.clinicalNotes = 'Remote session summary filed.';
    await again.save();
    await waitForCount(
      {
        beneficiaryId: beneficiary,
        eventType: 'teleconsultation_completed',
      },
      1
    );
  });
});
