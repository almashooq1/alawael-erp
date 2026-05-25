'use strict';

/**
 * W376 — heatmap transitionPlan.overdueReviews metric (W361 bridge).
 *
 * 14th heatmap metric. Counts TransitionPlan entries in an active status
 * (readiness_assessed / in_progress / paused) where nextReviewDate has passed.
 * Strict thresholds — an overdue review means a beneficiary may miss a
 * life-stage transition milestone.
 */

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W376 — transitionPlan.overdueReviews threshold', () => {
  it('THRESHOLDS contains the new metric key', () => {
    expect(Object.keys(THRESHOLDS)).toContain('transitionPlan.overdueReviews');
  });

  it('warning >0, critical >5 (strict — overdue review may cost a milestone)', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('transitionPlan.overdueReviews', 0)).toBe('ok');
    expect(_severityFor('transitionPlan.overdueReviews', 1)).toBe('warning');
    expect(_severityFor('transitionPlan.overdueReviews', 5)).toBe('warning');
    expect(_severityFor('transitionPlan.overdueReviews', 6)).toBe('critical');
  });
});

describe('W376 — aggregation pipeline shape', () => {
  it('filters by active status + nextReviewDate non-null AND in past', async () => {
    let capturedMatch = null;
    const transitionPlanModel = {
      aggregate: async pipeline => {
        capturedMatch = pipeline.find(s => s.$match).$match;
        return [{ _id: 'b1', overdueReviewCount: 3 }];
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([]),
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel,
    });
    await svc.buildHeatmap();
    // Active subset — excludes draft / completed / cancelled
    expect(capturedMatch.status.$in).toEqual(['readiness_assessed', 'in_progress', 'paused']);
    // nextReviewDate must be non-null AND < now
    expect(capturedMatch.nextReviewDate.$ne).toBeNull();
    expect(capturedMatch.nextReviewDate.$lt).toBeInstanceOf(Date);
  });

  it('cell populated + severity per threshold', async () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([]),
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel: makeStubModel([
        { _id: 'b1', overdueReviewCount: 8 },
        { _id: 'b2', overdueReviewCount: 2 },
        { _id: 'b3', overdueReviewCount: 0 },
      ]),
    });
    const r = await svc.buildHeatmap();
    const b1 = r.branches.find(b => String(b.branchId) === 'b1');
    const b2 = r.branches.find(b => String(b.branchId) === 'b2');
    const b3 = r.branches.find(b => String(b.branchId) === 'b3');
    expect(b1.cells['transitionPlan.overdueReviews'].severity).toBe('critical'); // 8>5
    expect(b2.cells['transitionPlan.overdueReviews'].severity).toBe('warning'); // 2 in (0,5]
    expect(b3.cells['transitionPlan.overdueReviews'].severity).toBe('ok'); // 0
  });

  it('single overdue review raises branch to warning even with 13 other ok', async () => {
    const bid = 'branch-tp-warn';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([]),
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel: makeStubModel([{ _id: bid, overdueReviewCount: 1 }]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches[0].severity).toBe('warning');
  });

  it('aggregation failure isolated', async () => {
    const bid = 'branch-x';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 5, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([]),
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel: {
        aggregate: async () => {
          throw new Error('simulated transition-plan failure');
        },
      },
      logger: { warn: () => {} },
    });
    const r = await svc.buildHeatmap();
    expect(r.branches[0].cells['capa.open'].value).toBe(5);
    expect(r.branches[0].cells['transitionPlan.overdueReviews']).toBeNull();
  });

  it('branchIds filter + status/date clauses preserved', async () => {
    let captured = null;
    const transitionPlanModel = {
      aggregate: async pipeline => {
        captured = pipeline[0].$match;
        return [];
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([]),
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel,
    });
    await svc.buildHeatmap({ branchIds: ['b1', 'b2'] });
    expect(captured.branchId).toEqual({ $in: ['b1', 'b2'] });
    expect(captured.status.$in).toEqual(['readiness_assessed', 'in_progress', 'paused']);
    expect(captured.nextReviewDate.$ne).toBeNull();
  });

  it('full-merge: all 11 sources / 14 cells per branch', async () => {
    const bid = 'b-all';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0 }]),
      rcaModel: makeStubModel([{ _id: bid, openCount: 0 }]),
      fmeaModel: makeStubModel([{ _id: bid, activeCount: 0 }]),
      riskModel: makeStubModel([{ _id: bid, criticalCount: 0 }]),
      seizureModel: makeStubModel([{ _id: bid, openEvents: 0 }]),
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 0 }]),
      assistiveDeviceModel: makeStubModel([{ _id: bid, overdueCount: 0 }]),
      cbahiModel: makeStubModel([{ _id: bid, expiringCount: 0 }]),
      respiteModel: makeStubModel([{ _id: bid, upcomingCount: 0 }]),
      transitionPlanModel: makeStubModel([{ _id: bid, overdueReviewCount: 2 }]),
    });
    const r = await svc.buildHeatmap();
    for (const key of [
      'capa.open',
      'capa.overdue',
      'capa.critical',
      'audit.open',
      'audit.overdue',
      'rca.open',
      'fmea.active',
      'risk.critical',
      'seizures.openEvents',
      'safeguarding.openConcerns',
      'assistiveDevice.maintenanceOverdue',
      'cbahi.attestationsExpiringSoon',
      'respite.upcomingBookings',
      'transitionPlan.overdueReviews',
    ]) {
      expect(r.branches[0].cells[key]).not.toBeNull();
    }
    expect(r.branches[0].cells['transitionPlan.overdueReviews'].value).toBe(2);
    expect(r.branches[0].severity).toBe('warning'); // 2 overdue reviews → warning
  });
});
