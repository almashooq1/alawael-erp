'use strict';

/**
 * Behavioral counterpart for SeatingPosturalAssessment (W675).
 *
 * Boots a real in-memory Mongo via mongodb-memory-server, unmocks mongoose, and
 * asserts the Wave-18 __invariants ACTUALLY FIRE — reject bad saves, accept good
 * ones — plus that virtuals compute on persisted docs and defaults round-trip.
 *
 * Pattern reference: clinical-assessment-trio-behavioral-wave673.
 */

const mongoose = require('mongoose');

// W675: unmock mongoose so we hit a real in-memory Mongo (jest.setup mocks it).
jest.unmock('mongoose');

let mongod;
let Seating;

beforeAll(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  Seating = require('../models/SeatingPosturalAssessment');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

describe('SeatingPosturalAssessment behavioral (W675)', () => {
  test('rejects moderate/high pressure risk without a mitigation plan', async () => {
    const doc = new Seating({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      pressureInjuryRisk: 'high',
    });
    await expect(doc.save()).rejects.toThrow();
  });

  test('rejects an existing injury without stage + site', async () => {
    const doc = new Seating({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      existingPressureInjury: true,
    });
    await expect(doc.save()).rejects.toThrow();
  });

  test('rejects an invalid postural-support segment', async () => {
    const doc = new Seating({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      posturalSupports: [{ segment: 'tail', support: 'moderate' }],
    });
    await expect(doc.save()).rejects.toThrow();
  });

  test('rejects a discharge without an outcome summary', async () => {
    const doc = new Seating({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      assessmentType: 'discharge',
    });
    await expect(doc.save()).rejects.toThrow();
  });

  test('accepts a valid at-risk assessment + computes virtuals', async () => {
    const doc = await Seating.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      assessmentType: 'initial',
      gmfcsLevel: 'V',
      pressureInjuryRisk: 'high',
      mitigationPlan: 'Reposition every 2h; air-cell cushion; daily skin check.',
      repositioningIntervalMinutes: 120,
      posturalSupports: [
        { segment: 'trunk', support: 'moderate', device: 'lateral supports' },
        { segment: 'head_neck', support: 'total', device: 'headrest' },
        { segment: 'feet', support: 'none' },
      ],
    });
    expect(doc.isPressureAtRisk).toBe(true);
    expect(doc.segmentsSupported).toBe(2); // 'none' not counted
  });

  test('accepts a clean low-risk assessment (no mitigation plan required)', async () => {
    const doc = await Seating.create({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date(),
      assessmentType: 'initial',
      pressureInjuryRisk: 'low',
    });
    expect(doc.isPressureAtRisk).toBe(false);
    expect(doc.status).toBe('draft');
  });

  test('rejects reassessmentDue earlier than the assessment date', async () => {
    const doc = new Seating({
      beneficiaryId: new mongoose.Types.ObjectId(),
      date: new Date('2026-05-30'),
      reassessmentDue: new Date('2026-05-01'),
    });
    await expect(doc.save()).rejects.toThrow();
  });
});
