'use strict';

/**
 * W378 — heatmap assistiveDevice.untrackedDevices metric (complements W372).
 *
 * 15th heatmap metric. Counts active (non-retired) AssistiveDevices where
 * nextMaintenanceDue is NULL — i.e. no maintenance scheduled at all.
 * Moderate thresholds: untracked ≠ unsafe, but ≥5 suggests a scheduling-process gap.
 *
 * Implemented by extending the W372 _assistiveDeviceMetricsByBranch pipeline
 * to compute BOTH overdueCount AND untrackedCount in a single $group stage
 * (single DB call serves both metrics).
 */

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W378 — assistiveDevice.untrackedDevices threshold', () => {
  it('THRESHOLDS contains the new metric key', () => {
    expect(Object.keys(THRESHOLDS)).toContain('assistiveDevice.untrackedDevices');
  });

  it('warning >5, critical >15 (moderate — untracked ≠ unsafe but process gap)', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('assistiveDevice.untrackedDevices', 5)).toBe('ok');
    expect(_severityFor('assistiveDevice.untrackedDevices', 6)).toBe('warning');
    expect(_severityFor('assistiveDevice.untrackedDevices', 15)).toBe('warning');
    expect(_severityFor('assistiveDevice.untrackedDevices', 16)).toBe('critical');
  });
});

describe('W378 — dual-metric pipeline (overdue + untracked in single $group)', () => {
  it('single pipeline returns both overdueCount AND untrackedCount per branch', async () => {
    let capturedGroup = null;
    const assistiveDeviceModel = {
      aggregate: async pipeline => {
        capturedGroup = pipeline.find(s => s.$group).$group;
        return [{ _id: 'b1', overdueCount: 3, untrackedCount: 8 }];
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
      assistiveDeviceModel,
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel: makeStubModel([]),
    });
    const r = await svc.buildHeatmap();
    // Both metrics populated from one pipeline call
    expect(r.branches[0].cells['assistiveDevice.maintenanceOverdue'].value).toBe(3);
    expect(r.branches[0].cells['assistiveDevice.untrackedDevices'].value).toBe(8);
    // $group has both aggregations
    expect(capturedGroup.overdueCount.$sum).toBeDefined();
    expect(capturedGroup.untrackedCount.$sum).toBeDefined();
  });

  it('untracked $cond is $eq null (matches devices with NO scheduled maintenance)', async () => {
    let capturedGroup = null;
    const assistiveDeviceModel = {
      aggregate: async pipeline => {
        capturedGroup = pipeline.find(s => s.$group).$group;
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
      assistiveDeviceModel,
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel: makeStubModel([]),
    });
    await svc.buildHeatmap();
    expect(capturedGroup.untrackedCount.$sum.$cond[0]).toEqual({
      $eq: ['$nextMaintenanceDue', null],
    });
  });

  it('severity classification across the threshold table', async () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([
        { _id: 'b-ok', overdueCount: 0, untrackedCount: 3 }, // ok (3 ≤ 5)
        { _id: 'b-warn', overdueCount: 0, untrackedCount: 10 }, // warning (10 in 6-15)
        { _id: 'b-crit', overdueCount: 0, untrackedCount: 20 }, // critical (20 > 15)
      ]),
      cbahiModel: makeStubModel([]),
      respiteModel: makeStubModel([]),
      transitionPlanModel: makeStubModel([]),
    });
    const r = await svc.buildHeatmap();
    const bOk = r.branches.find(b => String(b.branchId) === 'b-ok');
    const bWarn = r.branches.find(b => String(b.branchId) === 'b-warn');
    const bCrit = r.branches.find(b => String(b.branchId) === 'b-crit');
    expect(bOk.cells['assistiveDevice.untrackedDevices'].severity).toBe('ok');
    expect(bWarn.cells['assistiveDevice.untrackedDevices'].severity).toBe('warning');
    expect(bCrit.cells['assistiveDevice.untrackedDevices'].severity).toBe('critical');
  });

  it('full-merge: all 11 sources / 15 cells per branch', async () => {
    const bid = 'b-all';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0 }]),
      rcaModel: makeStubModel([{ _id: bid, openCount: 0 }]),
      fmeaModel: makeStubModel([{ _id: bid, activeCount: 0 }]),
      riskModel: makeStubModel([{ _id: bid, criticalCount: 0 }]),
      seizureModel: makeStubModel([{ _id: bid, openEvents: 0 }]),
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 0 }]),
      assistiveDeviceModel: makeStubModel([{ _id: bid, overdueCount: 0, untrackedCount: 2 }]),
      cbahiModel: makeStubModel([{ _id: bid, expiringCount: 0 }]),
      respiteModel: makeStubModel([{ _id: bid, upcomingCount: 0 }]),
      transitionPlanModel: makeStubModel([{ _id: bid, overdueReviewCount: 0 }]),
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
      'assistiveDevice.untrackedDevices',
      'cbahi.attestationsExpiringSoon',
      'respite.upcomingBookings',
      'transitionPlan.overdueReviews',
    ]) {
      expect(r.branches[0].cells[key]).not.toBeNull();
    }
    // 2 untracked → ok (2 ≤ 5)
    expect(r.branches[0].cells['assistiveDevice.untrackedDevices'].value).toBe(2);
    expect(r.branches[0].severity).toBe('ok');
  });
});
