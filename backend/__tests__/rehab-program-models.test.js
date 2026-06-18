/**
 * Behavioral model tests for RehabilitationProgram.
 */

'use strict';

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let RehabilitationProgram;

const OID = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  RehabilitationProgram = require('../models/rehab-program/RehabilitationProgram.model');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 60000);

beforeEach(async () => {
  await RehabilitationProgram.collection.deleteMany({});
}, 20000);

function baseDoc(overrides = {}) {
  return {
    code: `PROG-${Date.now()}`,
    nameAr: 'برنامج اختبار',
    nameEn: 'Test Program',
    categoryId: OID(),
    targetDisabilities: ['AUTISM', 'DEVELOPMENTAL'],
    suitableSeverityLevels: ['MILD', 'MODERATE'],
    status: 'DRAFT',
    interventions: [
      {
        title: 'تدخل اختبار',
        type: 'DIRECT_THERAPY',
      },
    ],
    ...overrides,
  };
}

describe('RehabilitationProgram model — persistence', () => {
  it('persists a valid program', async () => {
    const doc = await RehabilitationProgram.create(baseDoc());
    expect(doc._id).toBeDefined();
    expect(doc.code).toMatch(/^PROG-/);
  });

  it('rejects duplicate code', async () => {
    const code = `PROG-DUP-${Date.now()}`;
    await RehabilitationProgram.create(baseDoc({ code }));
    await expect(RehabilitationProgram.create(baseDoc({ code }))).rejects.toThrow();
  });

  it('rejects missing required fields', async () => {
    await expect(
      RehabilitationProgram.create({
        nameAr: 'برنامج اختبار',
        nameEn: 'Test Program',
      })
    ).rejects.toThrow(/code|categoryId/);
  });

  it('rejects invalid target disability', async () => {
    await expect(
      RehabilitationProgram.create({
        ...baseDoc(),
        targetDisabilities: ['UNKNOWN'],
      })
    ).rejects.toThrow();
  });

  it('rejects invalid severity level', async () => {
    await expect(
      RehabilitationProgram.create({
        ...baseDoc(),
        suitableSeverityLevels: ['MINIMAL'],
      })
    ).rejects.toThrow();
  });

  it('rejects invalid intervention type', async () => {
    await expect(
      RehabilitationProgram.create({
        ...baseDoc(),
        interventions: [{ title: 'x', type: 'INVALID' }],
      })
    ).rejects.toThrow(/type/);
  });

  it('rejects invalid status enum', async () => {
    await expect(
      RehabilitationProgram.create({
        ...baseDoc(),
        status: 'PENDING',
      })
    ).rejects.toThrow(/status/);
  });

  it('stores nested sessionConfig and phases', async () => {
    const doc = await RehabilitationProgram.create({
      ...baseDoc(),
      sessionConfig: {
        standardDuration: 45,
        recommendedFrequency: { sessionsPerWeek: 2, totalSessions: 24 },
      },
      phases: [
        {
          phaseNumber: 1,
          phaseNameAr: 'المرحلة الأولى',
          phaseNameEn: 'Phase 1',
          duration: 4,
        },
      ],
    });
    expect(doc.sessionConfig.standardDuration).toBe(45);
    expect(doc.phases.length).toBe(1);
  });

  it('stores linked measurements', async () => {
    const doc = await RehabilitationProgram.create({
      ...baseDoc(),
      linkedMeasurements: [
        {
          measurementTypeId: OID(),
          activationRules: { minScore: 0, maxScore: 50, mandatory: true },
          assessmentFrequency: 'every_3_months',
        },
      ],
    });
    expect(doc.linkedMeasurements.length).toBe(1);
    expect(doc.linkedMeasurements[0].activationRules.mandatory).toBe(true);
  });
});
