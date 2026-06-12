'use strict';

/**
 * W1266 — proposal → real draft plan (+ createPlan W1217-class root fix).
 *
 * Layers:
 *   1. ROOT FIX — the old createPlan wrote undeclared keys (goals/
 *      interventions silently dropped), an invalid enum type
 *      ('rehabilitation'), and omitted the REQUIRED startDate. Proven
 *      fixed: minimal create succeeds; legacy key names map to the real
 *      schema fields.
 *   2. BRIDGE (MMS) — createFromProposal resolves the OPEN episode,
 *      applies clinician selections, strips screen-only `why`, keeps
 *      provenance/evidence, creates a DRAFT (never active).
 *   3. GUARDRAILS — 409 without an open episode; 422 on a failed proposal.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');
require('../domains/episodes/models/EpisodeOfCare');
const { carePlansService } = require('../domains/care-plans/services/CarePlansService');
const { createFromProposal } = require('../services/carePlanComposer.service');

function fixtureProposal() {
  return {
    ok: true,
    proposal: {
      type: 'comprehensive',
      reviewCycle: 'monthly',
      title_ar: 'خطة مقترحة — حزمة التوحد',
      globalGoals: [
        {
          title: 'هدف نطق',
          type: 'speech',
          criteria: '4 من 5',
          priority: 'medium',
          status: 'pending',
          notes: 'من بنك الأهداف',
          why: 'شاشة فقط',
        },
        {
          title: 'هدف حياتي',
          type: 'life_skill',
          criteria: '3 من 4',
          priority: 'medium',
          status: 'pending',
          notes: 'من بنك الأهداف',
          why: 'شاشة فقط',
        },
        {
          title: 'هدف سلوكي',
          type: 'behavioral',
          criteria: null,
          priority: 'medium',
          status: 'pending',
          notes: 'من بنك الأهداف',
          why: 'شاشة فقط',
        },
      ],
      globalInterventions: [
        {
          title: 'DTT',
          title_ar: 'محاولات منفصلة',
          domain: 'behavioral_therapy',
          frequency: '2–10 جلسة/أسبوع',
          status: 'planned',
          evidence: 'دليل قوي — Lovaas 1987',
          why: 'شاشة فقط',
        },
      ],
      suggestedAssessments: { guidance: [], liveMeasures: [] },
      bundleInterventionsAr: [],
    },
    beneficiary: { id: 'x', branchId: null, age: 5, disabilityType: 'autism' },
    bundle: { key: 'autism', titleAr: 'حزمة التوحد' },
    counts: { goals: 3, interventions: 1, measures: 0 },
    disclaimerAr: 'مراجعة',
    notes: [],
  };
}

describe('W1266 createPlan root fix', () => {
  let mongod;
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });
  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });
  beforeEach(async () => {
    await UnifiedCarePlan.deleteMany({});
    await mongoose.model('EpisodeOfCare').deleteMany({});
  });

  test('minimal create now succeeds (startDate defaulted, type valid)', async () => {
    const plan = await carePlansService.createPlan({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
    });
    expect(plan.status).toBe('draft');
    expect(plan.type).toBe('comprehensive'); // was invalid 'rehabilitation'
    expect(plan.startDate).toBeInstanceOf(Date); // was missing-required
  });

  test('legacy key names map to the real schema fields (no more silent drop)', async () => {
    const plan = await carePlansService.createPlan({
      beneficiaryId: new mongoose.Types.ObjectId(),
      episodeId: new mongoose.Types.ObjectId(),
      type: 'rehabilitation', // invalid → coerced to a valid default
      goals: [{ title: 'هدف قديم الشكل', type: 'speech' }],
      interventions: [{ title: 'Old-shape intervention', domain: 'speech_therapy' }],
    });
    const saved = await UnifiedCarePlan.findById(plan._id).lean();
    expect(saved.globalGoals).toHaveLength(1); // was dropped silently
    expect(saved.globalGoals[0].title).toBe('هدف قديم الشكل');
    expect(saved.globalInterventions).toHaveLength(1);
    expect(saved.type).toBe('comprehensive');
  });

  describe('the bridge (createFromProposal)', () => {
    test('409 when no open episode exists', async () => {
      await expect(
        createFromProposal({
          beneficiaryId: new mongoose.Types.ObjectId(),
          proposal: fixtureProposal(),
        })
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    test('creates a DRAFT from the proposal: selections honored, why stripped, evidence kept', async () => {
      const benId = new mongoose.Types.ObjectId();
      const actorId = new mongoose.Types.ObjectId();
      const Episode = mongoose.model('EpisodeOfCare');
      const ep = await Episode.create({
        beneficiaryId: benId,
        branchId: new mongoose.Types.ObjectId(),
        status: 'active',
        startDate: new Date('2026-06-01'),
      });

      const res = await createFromProposal({
        beneficiaryId: benId,
        actorId,
        selections: { goalIndexes: [0, 2] }, // clinician kept 2 of 3 goals
        proposal: fixtureProposal(),
      });

      expect(res.counts).toEqual({ goals: 2, interventions: 1 });
      const saved = await UnifiedCarePlan.findById(res.plan._id).lean();
      expect(saved.status).toBe('draft'); // never auto-activates
      expect(String(saved.episodeId)).toBe(String(ep._id));
      expect(String(saved.createdBy)).toBe(String(actorId));
      expect(saved.title_ar).toContain('حزمة التوحد');
      expect(saved.globalGoals.map(g => g.title)).toEqual(['هدف نطق', 'هدف سلوكي']);
      expect(saved.globalGoals[0].notes).toBe('من بنك الأهداف'); // provenance kept
      expect(saved.globalGoals[0].why).toBeUndefined(); // screen-only stripped
      expect(saved.globalInterventions[0].evidence).toContain('Lovaas');
      expect(saved.signatureChain).toHaveLength(0); // draft — no signatures yet
    });

    test('422 on a failed/invalid proposal', async () => {
      await expect(
        createFromProposal({
          beneficiaryId: new mongoose.Types.ObjectId(),
          proposal: { ok: false },
        })
      ).rejects.toMatchObject({ statusCode: 422 });
    });
  });
});
