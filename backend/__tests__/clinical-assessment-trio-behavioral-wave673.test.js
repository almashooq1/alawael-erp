'use strict';

/**
 * W673 behavioral — the W670–W672 clinical-assessment trio against a real
 * MongoMemoryServer (jest.unmock mongoose). Complements the 3 static drift
 * guards (wave670/671/672): those read source text; THIS instantiates docs,
 * persists them, exercises every Wave-18 invariant (reject bad / accept good),
 * and verifies the virtuals compute on round-trip.
 *
 * Doctrine: "static drift guards catch shape but only RUNNING catches behaviour"
 * (W358 'speech_natural' enum-mismatch lesson). For each model: one valid save,
 * one rejected save PER invariant, and the model's virtual on a persisted doc.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Dysphagia;
let Pain;
let Physio;

const OID = () => new mongoose.Types.ObjectId();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  Dysphagia = require('../models/DysphagiaAssessment');
  Pain = require('../models/PainAssessment');
  Physio = require('../models/PhysiotherapyAssessment');
}, 60000);

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}, 60000);

beforeEach(async () => {
  for (const M of [Dysphagia, Pain, Physio]) {
    if (M && M.collection) await M.collection.deleteMany({});
  }
}, 20000);

// ════════════════════════════════════════════════════════════════════════
// W670 DysphagiaAssessment
// ════════════════════════════════════════════════════════════════════════
describe('W673 — DysphagiaAssessment persistence + invariants', () => {
  const base = () => ({
    beneficiaryId: OID(),
    branchId: OID(),
    date: new Date(),
    screeningTool: 'bedside_swallow_exam',
    aspirationRisk: 'low',
  });

  it('persists a minimal valid draft', async () => {
    const doc = await Dysphagia.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.status).toBe('draft');
    expect(doc.aspirationRisk).toBe('low');
  });

  it('rejects an invalid screeningTool', async () => {
    await expect(Dysphagia.create({ ...base(), screeningTool: 'crystal_ball' })).rejects.toThrow(
      /screeningTool/
    );
  });

  it('npoRecommended=true requires npoReason', async () => {
    await expect(Dysphagia.create({ ...base(), npoRecommended: true })).rejects.toThrow(
      /npoReason/
    );
    const ok = await Dysphagia.create({
      ...base(),
      npoRecommended: true,
      npoReason: 'pending VFSS — unsafe oral trial',
    });
    expect(ok._id).toBeDefined();
  });

  it('aspirationRisk=high requires slpReferral', async () => {
    await expect(Dysphagia.create({ ...base(), aspirationRisk: 'high' })).rejects.toThrow(
      /slpReferral/
    );
    const ok = await Dysphagia.create({ ...base(), aspirationRisk: 'high', slpReferral: true });
    expect(ok._id).toBeDefined();
  });

  it('silentAspirationSuspected forces instrumentalAssessmentRecommended', async () => {
    await expect(Dysphagia.create({ ...base(), silentAspirationSuspected: true })).rejects.toThrow(
      /instrumental/i
    );
  });

  it('finalized requires assessor + assessedAt', async () => {
    await expect(Dysphagia.create({ ...base(), status: 'finalized' })).rejects.toThrow(
      /assess(edBy|edAt)/
    );
  });

  it('isUnsafeSwallow virtual computes on a persisted doc', async () => {
    const safe = await Dysphagia.create(base());
    expect(safe.isUnsafeSwallow).toBe(false);
    const unsafe = await Dysphagia.create({
      ...base(),
      npoRecommended: true,
      npoReason: 'aspiration on thin fluids',
    });
    expect(unsafe.isUnsafeSwallow).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════════════
// W671 PainAssessment
// ════════════════════════════════════════════════════════════════════════
describe('W673 — PainAssessment persistence + invariants', () => {
  const base = () => ({
    beneficiaryId: OID(),
    branchId: OID(),
    date: new Date(),
    scale: 'numeric_0_10',
    painPresent: false,
    score: 0,
  });

  it('persists a minimal valid no-pain draft', async () => {
    const doc = await Pain.create(base());
    expect(doc._id).toBeDefined();
    expect(doc.painPresent).toBe(false);
  });

  it('enforces the per-scale score range (numeric 0–10)', async () => {
    await expect(
      Pain.create({ ...base(), painPresent: true, score: 42, bodyLocations: ['knee'] })
    ).rejects.toThrow(/score/);
  });

  it('allows the wider NCCPC-R range (0–90)', async () => {
    const ok = await Pain.create({
      ...base(),
      scale: 'nccpc_r',
      observerType: 'observed',
      painPresent: true,
      score: 55,
      bodyLocations: ['generalized'],
    });
    expect(ok._id).toBeDefined();
  });

  it('painPresent=true requires a body location', async () => {
    await expect(Pain.create({ ...base(), painPresent: true, score: 5 })).rejects.toThrow(
      /bodyLocations/
    );
  });

  it('painPresent=false forces score=0', async () => {
    await expect(Pain.create({ ...base(), score: 4 })).rejects.toThrow(/score/);
  });

  it('observational scale (flacc) cannot be self_report', async () => {
    await expect(
      Pain.create({
        ...base(),
        scale: 'flacc',
        observerType: 'self_report',
        painPresent: true,
        score: 3,
        bodyLocations: ['legs'],
      })
    ).rejects.toThrow(/observerType/);
  });

  it('isSignificantPain + painReduction virtuals compute', async () => {
    const sig = await Pain.create({
      ...base(),
      painPresent: true,
      score: 7,
      bodyLocations: ['back'],
    });
    expect(sig.isSignificantPain).toBe(true); // 7/10 = 0.7 ≥ 0.4
    sig.reassessmentScore = 2;
    sig.reassessmentAt = new Date();
    await sig.save();
    expect(sig.painReduction).toBe(5); // 7 − 2
  });
});

// ════════════════════════════════════════════════════════════════════════
// W672 PhysiotherapyAssessment
// ════════════════════════════════════════════════════════════════════════
describe('W673 — PhysiotherapyAssessment persistence + invariants', () => {
  const base = () => ({
    beneficiaryId: OID(),
    branchId: OID(),
    date: new Date(),
    assessmentType: 'initial',
    mobilityStatus: 'independent_with_aid',
  });

  it('persists a valid initial assessment with embedded ROM + strength', async () => {
    const doc = await Physio.create({
      ...base(),
      romMeasurements: [
        {
          joint: 'knee_R',
          movement: 'flexion',
          activeRomDeg: 110,
          passiveRomDeg: 120,
          ashworth: '1+',
        },
      ],
      strength: [{ muscleGroup: 'quadriceps', side: 'R', grade: '4' }],
    });
    expect(doc._id).toBeDefined();
    expect(doc.romMeasurements).toHaveLength(1);
    expect(doc.jointsMeasured).toBe(1);
  });

  it('rejects an invalid Ashworth grade in an embedded ROM row', async () => {
    await expect(
      Physio.create({
        ...base(),
        romMeasurements: [{ joint: 'elbow_L', movement: 'flexion', ashworth: '9' }],
      })
    ).rejects.toThrow(/ashworth/i);
  });

  it('rejects an invalid MRC strength grade', async () => {
    await expect(
      Physio.create({ ...base(), strength: [{ muscleGroup: 'biceps', grade: '11' }] })
    ).rejects.toThrow(/strength/i);
  });

  it('gaitAssessed=true requires a gaitPattern', async () => {
    await expect(Physio.create({ ...base(), gaitAssessed: true })).rejects.toThrow(/gaitPattern/);
    const ok = await Physio.create({
      ...base(),
      gaitAssessed: true,
      gaitPattern: 'spastic_diplegic',
    });
    expect(ok._id).toBeDefined();
  });

  it('a discharge assessment requires a goalsSummary', async () => {
    await expect(Physio.create({ ...base(), assessmentType: 'discharge' })).rejects.toThrow(
      /goalsSummary/
    );
    const ok = await Physio.create({
      ...base(),
      assessmentType: 'discharge',
      goalsSummary: 'Achieved 10m unaided gait; ROM WNL; discharged to home programme.',
    });
    expect(ok._id).toBeDefined();
  });

  it('finalized requires assessor + assessedAt', async () => {
    await expect(Physio.create({ ...base(), status: 'finalized' })).rejects.toThrow(
      /assess(edBy|edAt)/
    );
  });
});
