'use strict';

/**
 * W1259 — family version for UnifiedCarePlan (the W43 generator's unified
 * adapter) — closes the last product gap in the ADR-040 (b) family chain.
 *
 * Layers:
 *   1. PURE MAPPING — goals gathered across global + all section groups,
 *      type→domain + priority→score maps, string homeProgram → activity list,
 *      reviewCycle → cadence. Faithful-or-absent.
 *   2. GENERATION — a realistic Arabic UI plan passes the W43 deterministic
 *      safety floor (sections, readability, no forbidden terms).
 *   3. END-TO-END (MMS) — activatePlan stores familyVersion; the previously
 *      skipping notify_family handler NOW SENDS for a UI plan.
 */

jest.unmock('mongoose');
jest.setTimeout(120000);

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const famGen = require('../intelligence/family-version-generator.service');
const {
  createCarePlanSideEffectHandlers,
  HANDLER_NAMES,
} = require('../intelligence/care-plan-side-effects.service');
const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');

function richPlanData() {
  return {
    beneficiaryId: new mongoose.Types.ObjectId(),
    episodeId: new mongoose.Types.ObjectId(),
    startDate: new Date('2026-06-01'),
    status: 'pending_approval',
    reviewCycle: 'monthly',
    nextReviewDate: new Date('2026-07-15'),
    globalGoals: [
      {
        title: 'يطلب حاجته بجملة قصيرة',
        type: 'communication',
        priority: 'high',
        target: 'في البيت والمركز',
      },
      { title: 'يلبس قميصه بنفسه', type: 'life_skill', priority: 'medium' },
    ],
    therapeutic: {
      domains: {
        speech: {
          name: 'Speech',
          goals: [{ title: 'ينطق الأصوات الأولى بوضوح', type: 'speech', priority: 'high' }],
        },
      },
    },
    familyComponent: {
      homeProgram: 'تمرين تسمية الصور خمس دقائق كل مساء',
      parentTraining: ['جلسة تدريب شهرية للوالدين على أنشطة التواصل'],
    },
  };
}

describe('W1259 pure mapping', () => {
  test('gathers goals across global + section groups with faithful maps', () => {
    const body = famGen.mapUnifiedPlanToFamilyBody(richPlanData());
    expect(body.goals).toHaveLength(3);
    const comm = body.goals.find(g => g.domain === 'language');
    expect(comm.statement).toContain('يطلب حاجته');
    expect(comm.priorityScore).toBe(0.9);
    expect(body.goals.find(g => g.domain === 'adl').priorityScore).toBe(0.6);
    expect(body.familyRole.homeProgram).toEqual([
      { activity: 'تمرين تسمية الصور خمس دقائق كل مساء' },
    ]);
    expect(body.familyRole.coachingPlan).toContain('تدريب شهرية');
    expect(body.reviewSchedule.cadenceWeeks).toBe(4);
  });

  test('empty plan maps faithful-or-absent (no fabricated content)', () => {
    const body = famGen.mapUnifiedPlanToFamilyBody({});
    expect(body.goals).toEqual([]);
    expect(body.familyRole.homeProgram).toEqual([]);
    expect(body.familyRole.coachingPlan).toBeUndefined();
  });
});

describe('W1259 generation through the W43 safety floor', () => {
  test('realistic Arabic UI plan produces a family-ready markdown', () => {
    const res = famGen.generateForUnifiedPlan(richPlanData(), { centerName: 'مركز الأوائل' });
    expect(res.source).toBe('unified');
    expect(res.ok).toBe(true);
    expect(famGen.isFamilyReady(res)).toBe(true);
    expect(res.markdown).toContain('ما نعمل عليه');
    expect(res.markdown).toContain('تمارين البيت');
    expect(res.missingSections).toEqual([]);
    expect(res.forbiddenTermsFound).toEqual([]);
  });
});

describe('W1259 end-to-end (MMS): activation → family version → notify sends', () => {
  let mongod;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  test('the previously skipping notify_family handler NOW SENDS for a UI plan', async () => {
    const plan = await UnifiedCarePlan.create(richPlanData());
    const { carePlansService: svc } = require('../domains/care-plans/services/CarePlansService');

    await svc.activatePlan(String(plan._id), {
      actor: { id: new mongoose.Types.ObjectId(), role: 'clinical_lead' },
    });

    const after = await UnifiedCarePlan.findById(plan._id);
    expect(after.status).toBe('active');
    expect(after.familyVersion && after.familyVersion.body).toBeTruthy(); // stored
    expect(after.familyVersion.readabilityGrade).not.toBeNull();

    // The W1258-audited skip path is now a send path:
    const audit = [];
    const sent = [];
    const handlers = createCarePlanSideEffectHandlers({
      auditLogger: { log: async e => audit.push(e) },
      familyChannelClient: { dispatch: async msg => (sent.push(msg), { ok: true }) },
    });
    const res = await handlers[HANDLER_NAMES.NOTIFY_FAMILY]({
      planVersion: after,
      actor: { userId: 'sys', role: 'system' },
      metadata: { channel: 'sms', recipient: '+9665xxxxxxx' },
    });

    expect(res.ok).toBe(true); // was { ok:false, reason:'no_family_body' } pre-W1259
    expect(sent).toHaveLength(1);
    expect(sent[0].body).toContain('ما نعمل عليه');
    const main = audit.find(e => e.action === 'care-plan.notify_family.side-effect');
    expect(main.entityType).toBe('UnifiedCarePlan');
    expect(main.metadata.success).toBe(true);
  });
});
