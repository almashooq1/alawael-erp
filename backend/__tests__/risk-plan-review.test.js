'use strict';
/**
 * risk-plan-review.test.js — Wave 290
 *
 * Verifies that on a risk escalation:
 *   1) When no active care plan exists → no review created, reason
 *      reported so an upstream dashboard can flag it.
 *   2) Idempotency: a CRITICAL review already created today is reused.
 *   3) Happy path: creates PlanReview with type=CRITICAL, summary
 *      includes tier + score + top factors, nextReviewDate is +7d.
 *   4) Create failures are isolated (returns CREATE_FAILED, never throws).
 *   5) Sweeper.onAlertRaised hook is invoked end-to-end once wired.
 */

const {
  RiskPlanReviewService,
  buildSummary,
  defaultNextReviewDate,
} = require('../services/risk-plan-review.service');
const { RiskSweeperService } = require('../services/risk-sweeper.service');

function makeService({ activePlan, existingReview, createImpl }) {
  const created = [];
  const CarePlanModel = {
    findOne: () => ({
      select: () => ({ lean: async () => activePlan }),
    }),
  };
  const PlanReviewModel = {
    findOne: () => ({
      select: () => ({ lean: async () => existingReview }),
    }),
    create:
      createImpl ||
      (async doc => {
        const saved = { _id: 'pr-' + (created.length + 1), ...doc };
        created.push(saved);
        return saved;
      }),
  };
  const service = new RiskPlanReviewService({
    CarePlanModel,
    PlanReviewModel,
    logger: { info() {}, warn() {}, error() {} },
  });
  return { service, created };
}

const sampleProfile = {
  overallScore: 78,
  overallTier: 'high',
  topFactors: [
    { code: 'WEEKLY_INCIDENTS', label: 'حوادث أسبوعية' },
    { code: 'ATTENDANCE_DROP', label: 'انخفاض الحضور' },
    { code: 'MED_NONADHERENCE', label: 'عدم التزام بالدواء' },
  ],
};

describe('Wave 290 — RiskPlanReviewService', () => {
  describe('pure helpers', () => {
    test('buildSummary names tier, score, factors, and sweepRunId', () => {
      const s = buildSummary({
        profile: sampleProfile,
        tierDelta: 'escalated',
        sweepRunId: 'sweep-2026-05-23',
      });
      expect(s).toMatch(/مرتفع/);
      expect(s).toMatch(/78\/100/);
      expect(s).toMatch(/حوادث أسبوعية/);
      expect(s).toMatch(/sweep-2026-05-23/);
    });

    test('buildSummary handles first-critical wording', () => {
      const s = buildSummary({
        profile: { ...sampleProfile, overallTier: 'critical', overallScore: 95 },
        tierDelta: 'first',
        sweepRunId: 'sweep-x',
      });
      expect(s).toMatch(/أول درجة خطورة حرجة/);
      expect(s).toMatch(/95\/100/);
    });

    test('defaultNextReviewDate is +7d UTC', () => {
      const base = new Date('2026-05-23T10:00:00Z');
      const next = defaultNextReviewDate(base);
      expect(next.toISOString().slice(0, 10)).toBe('2026-05-30');
    });
  });

  describe('triggerOnEscalation', () => {
    const ben = { _id: 'b1', branchId: 'br1' };
    const ctx = {
      ben,
      profile: sampleProfile,
      tierDelta: 'escalated',
      code: 'RISK_TIER_ESCALATED',
      sweepRunId: 'sweep-2026-05-23',
      alertId: 'alert-1',
      now: new Date('2026-05-23T10:00:00Z'),
    };

    test('no active care plan → NO_ACTIVE_CARE_PLAN, no create', async () => {
      const { service, created } = makeService({ activePlan: null, existingReview: null });
      const res = await service.triggerOnEscalation(ctx);
      expect(res.created).toBe(false);
      expect(res.reason).toBe('NO_ACTIVE_CARE_PLAN');
      expect(created).toHaveLength(0);
    });

    test('existing CRITICAL review today → idempotent skip', async () => {
      const { service, created } = makeService({
        activePlan: { _id: 'cp1', beneficiary: 'b1', status: 'ACTIVE' },
        existingReview: { _id: 'pr-existing' },
      });
      const res = await service.triggerOnEscalation(ctx);
      expect(res.created).toBe(false);
      expect(res.reason).toBe('ALREADY_TRIGGERED_TODAY');
      expect(res.planReviewId).toBe('pr-existing');
      expect(created).toHaveLength(0);
    });

    test('happy path creates CRITICAL review with linkage', async () => {
      const { service, created } = makeService({
        activePlan: { _id: 'cp1', beneficiary: 'b1', status: 'ACTIVE' },
        existingReview: null,
      });
      const res = await service.triggerOnEscalation(ctx);
      expect(res.created).toBe(true);
      expect(res.reason).toBe('PLAN_REVIEW_TRIGGERED_BY_RISK');
      expect(res.carePlanId).toBe('cp1');
      expect(created).toHaveLength(1);
      const doc = created[0];
      expect(doc.reviewType).toBe('CRITICAL');
      expect(doc.carePlan).toBe('cp1');
      expect(doc.beneficiary).toBe('b1');
      expect(doc.summary).toMatch(/مرتفع/);
      // nextReviewDate must be +7d.
      expect(doc.nextReviewDate.toISOString().slice(0, 10)).toBe('2026-05-30');
    });

    test('create failure is isolated, returns CREATE_FAILED', async () => {
      const { service } = makeService({
        activePlan: { _id: 'cp1', beneficiary: 'b1', status: 'ACTIVE' },
        existingReview: null,
        createImpl: async () => {
          throw new Error('mongo down');
        },
      });
      const res = await service.triggerOnEscalation(ctx);
      expect(res.created).toBe(false);
      expect(res.reason).toBe('CREATE_FAILED');
      expect(res.error).toMatch(/mongo down/);
    });
  });

  describe('end-to-end: sweeper invokes onAlertRaised', () => {
    test('escalation alert fires the hook with full context', async () => {
      const ben = { _id: 'b1', branchId: 'br1' };
      const profile = {
        beneficiaryId: 'b1',
        episodeId: null,
        overallScore: 70,
        overallTier: 'high',
        overallTierAr: 'مرتفع',
        sources: {},
        topFactors: [{ code: 'X', label: 'x' }],
        composite: { weightUsed: 0.4, sourceCount: 1, sourcesContributing: ['clinical'] },
        computedAt: new Date().toISOString(),
        reason: 'RISK_SCORE_COMPUTED',
        explanation: 'x',
      };

      const cursor = (async function* () {
        yield ben;
      })();
      const BeneficiaryModel = {
        find: () => ({
          select: () => ({ limit: () => ({ cursor: () => cursor }) }),
        }),
      };
      const RiskSnapshotModel = {
        findOne: () => ({
          sort: () => ({ select: () => ({ lean: async () => ({ overallTier: 'low' }) }) }),
        }),
        updateOne: async () => ({ acknowledged: true }),
      };
      const AiAlertModel = {
        create: async doc => ({ _id: 'alert-1', ...doc }),
      };

      const hookCalls = [];
      const onAlertRaised = async ctx => {
        hookCalls.push(ctx);
        return { created: true, reason: 'PLAN_REVIEW_TRIGGERED_BY_RISK' };
      };

      const service = new RiskSweeperService({
        getProfile: async () => profile,
        BeneficiaryModel,
        RiskSnapshotModel,
        AiAlertModel,
        onAlertRaised,
        logger: { info() {}, warn() {}, error() {} },
      });

      const res = await service.runSweepForBranch({ branchId: 'br1' });
      expect(res.alertsRaised).toBe(1);
      expect(hookCalls).toHaveLength(1);
      expect(hookCalls[0].alertId).toBe('alert-1');
      expect(hookCalls[0].code).toBe('RISK_TIER_ESCALATED');
      expect(hookCalls[0].sweepRunId).toMatch(/^sweep-\d{4}-\d{2}-\d{2}$/);
      expect(hookCalls[0].ben._id).toBe('b1');
    });

    test('hook failure does not break the sweep (alert still counted)', async () => {
      const ben = { _id: 'b1', branchId: 'br1' };
      const profile = {
        beneficiaryId: 'b1',
        overallScore: 95,
        overallTier: 'critical',
        sources: {},
        topFactors: [],
        composite: { sourcesContributing: ['cdss'] },
        computedAt: new Date().toISOString(),
        reason: 'RISK_SCORE_COMPUTED',
        explanation: 'x',
      };
      const cursor = (async function* () {
        yield ben;
      })();
      const service = new RiskSweeperService({
        getProfile: async () => profile,
        BeneficiaryModel: {
          find: () => ({ select: () => ({ limit: () => ({ cursor: () => cursor }) }) }),
        },
        RiskSnapshotModel: {
          findOne: () => ({
            sort: () => ({ select: () => ({ lean: async () => null }) }),
          }),
          updateOne: async () => ({ acknowledged: true }),
        },
        AiAlertModel: { create: async doc => ({ _id: 'a1', ...doc }) },
        onAlertRaised: async () => {
          throw new Error('hook boom');
        },
        logger: { info() {}, warn() {}, error() {} },
      });
      const res = await service.runSweepForBranch({ branchId: 'br1' });
      expect(res.alertsRaised).toBe(1);
      expect(res.errors).toHaveLength(0);
    });
  });
});
