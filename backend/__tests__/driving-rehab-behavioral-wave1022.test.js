'use strict';

/**
 * driving-rehab-behavioral-wave1022.test.js — behavioral counterpart to
 * `driving-rehab-wave1022.test.js` (static drift guard).
 * MongoMemoryServer-based: real docs, real .create()/.save(), asserts
 * Wave-18 invariants fire + computeReadiness logic + virtuals + round-trip.
 */

jest.unmock('mongoose');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let DR;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w1022-behavioral-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  DR = require('../models/DrivingRehabAssessment');
  await DR.init();
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await DR.deleteMany({});
});

function baseDoc(overrides = {}) {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    branchId: new mongoose.Types.ObjectId(),
    date: new Date('2026-06-01T08:00:00Z'),
    recommendation: 'fit_to_drive',
    readinessLevel: 'ready',
    ...overrides,
  };
}

describe('W1022 behavioral — base save + enum gating', () => {
  it('SAVES a minimal fit-to-drive draft', async () => {
    const doc = await DR.create(baseDoc());
    expect(doc.status).toBe('draft');
    expect(doc.recommendation).toBe('fit_to_drive');
  });

  it('REJECTS an invalid recommendation', async () => {
    await expect(DR.create(baseDoc({ recommendation: 'race_car' }))).rejects.toThrow(
      /recommendation/
    );
  });

  it('REJECTS an invalid readinessLevel', async () => {
    await expect(DR.create(baseDoc({ readinessLevel: 'turbo' }))).rejects.toThrow(/readinessLevel/);
  });

  it('REJECTS an invalid onRoadAssessment', async () => {
    await expect(DR.create(baseDoc({ onRoadAssessment: 'crashed' }))).rejects.toThrow(
      /onRoadAssessment/
    );
  });
});

describe('W1022 behavioral — recommendation gates plan + review', () => {
  it('REJECTS fit_with_adaptations with no equipment', async () => {
    await expect(DR.create(baseDoc({ recommendation: 'fit_with_adaptations' }))).rejects.toThrow(
      /adaptiveEquipmentNeeded/
    );
  });

  it('SAVES fit_with_adaptations with equipment', async () => {
    const doc = await DR.create(
      baseDoc({
        recommendation: 'fit_with_adaptations',
        readinessLevel: 'ready_with_adaptation',
        adaptiveEquipmentNeeded: ['hand_controls', 'steering_knob'],
      })
    );
    expect(doc.isFitToDrive).toBe(true);
  });

  it('REJECTS not_fit_currently with no nextReviewDue', async () => {
    await expect(
      DR.create(baseDoc({ recommendation: 'not_fit_currently', readinessLevel: 'not_ready' }))
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('REJECTS further_training with no nextReviewDue', async () => {
    await expect(
      DR.create(
        baseDoc({ recommendation: 'further_training', readinessLevel: 'further_assessment' })
      )
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('SAVES further_training with a review date', async () => {
    const doc = await DR.create(
      baseDoc({
        recommendation: 'further_training',
        readinessLevel: 'further_assessment',
        nextReviewDue: new Date('2026-09-01'),
      })
    );
    expect(doc.recommendation).toBe('further_training');
  });
});

describe('W1022 behavioral — finalize gating + date sanity', () => {
  it('REJECTS finalized with no finalizer', async () => {
    await expect(
      DR.create(baseDoc({ status: 'finalized', finalizedAt: new Date() }))
    ).rejects.toThrow(/finalizedBy/);
  });

  it('REJECTS nextReviewDue earlier than date', async () => {
    await expect(
      DR.create(baseDoc({ nextReviewDue: new Date('2026-05-01'), date: new Date('2026-06-01') }))
    ).rejects.toThrow(/nextReviewDue/);
  });

  it('SAVES a finalized assessment with finalizer + time', async () => {
    const doc = await DR.create(
      baseDoc({
        status: 'finalized',
        finalizedByName: 'أخصائي تأهيل القيادة',
        finalizedAt: new Date('2026-06-01T09:00:00Z'),
      })
    );
    expect(doc.status).toBe('finalized');
  });
});

describe('W1022 behavioral — computeReadiness logic', () => {
  it('blocks readiness when vision inadequate', () => {
    expect(DR.computeReadiness({})).toBe('not_ready');
    expect(DR.computeReadiness({ visionAdequate: false, cognitiveScreenLevel: 'pass' })).toBe(
      'not_ready'
    );
  });

  it('blocks readiness on a cognitive or physical fail', () => {
    expect(DR.computeReadiness({ visionAdequate: true, cognitiveScreenLevel: 'fail' })).toBe(
      'not_ready'
    );
    expect(
      DR.computeReadiness({
        visionAdequate: true,
        cognitiveScreenLevel: 'pass',
        physicalControlLevel: 'inadequate',
      })
    ).toBe('not_ready');
  });

  it('further_assessment when clinical data incomplete', () => {
    expect(DR.computeReadiness({ visionAdequate: true })).toBe('further_assessment');
  });

  it('ready_with_adaptation on borderline cognition or needed adaptation', () => {
    expect(
      DR.computeReadiness({
        visionAdequate: true,
        cognitiveScreenLevel: 'borderline',
        physicalControlLevel: 'adequate',
      })
    ).toBe('ready_with_adaptation');
    expect(
      DR.computeReadiness({
        visionAdequate: true,
        cognitiveScreenLevel: 'pass',
        physicalControlLevel: 'needs_adaptation',
      })
    ).toBe('ready_with_adaptation');
  });

  it('ready when all clear', () => {
    expect(
      DR.computeReadiness({
        visionAdequate: true,
        cognitiveScreenLevel: 'pass',
        physicalControlLevel: 'adequate',
        seatingTransfersLevel: 'independent',
      })
    ).toBe('ready');
  });
});

describe('W1022 behavioral — virtuals + round-trip persistence', () => {
  it('isFitToDrive true for fit_to_drive', async () => {
    const doc = await DR.create(baseDoc());
    expect(doc.isFitToDrive).toBe(true);
  });

  it('isReassessmentOverdue true for finalized + past due', async () => {
    const doc = await DR.create(
      baseDoc({
        date: new Date('2019-12-01'),
        recommendation: 'not_fit_currently',
        readinessLevel: 'not_ready',
        nextReviewDue: new Date('2020-01-01'),
        status: 'finalized',
        finalizedByName: 'أخصائي',
        finalizedAt: new Date('2019-12-01'),
      })
    );
    const reloaded = await DR.findById(doc._id);
    expect(reloaded.isReassessmentOverdue).toBe(true);
  });

  it('round-trips the clinical screen + computed readiness', async () => {
    const screen = {
      visionAdequate: true,
      cognitiveScreenLevel: 'pass',
      physicalControlLevel: 'needs_adaptation',
      seatingTransfersLevel: 'needs_aid',
    };
    const readiness = DR.computeReadiness(screen);
    const doc = await DR.create(
      baseDoc({
        ...screen,
        readinessLevel: readiness,
        recommendation: 'fit_with_adaptations',
        adaptiveEquipmentNeeded: ['hand_controls'],
        restrictions: ['automatic_transmission_only', 'adaptive_equipment_required'],
      })
    );
    const reloaded = await DR.findById(doc._id).lean();
    expect(reloaded.physicalControlLevel).toBe('needs_adaptation');
    expect(reloaded.readinessLevel).toBe('ready_with_adaptation');
    expect(reloaded.adaptiveEquipmentNeeded).toContain('hand_controls');
    expect(reloaded.restrictions).toHaveLength(2);
  });
});
