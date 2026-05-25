'use strict';

/**
 * W372 — heatmap assistiveDevice.maintenanceOverdue metric (W359 bridge).
 *
 * 11th heatmap metric. Counts active (non-retired) assistive devices whose
 * nextMaintenanceDue is in the past. Devices without a scheduled maintenance
 * date are EXCLUDED (separate "untracked" signal, not modeled here).
 */

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W372 — assistiveDevice.maintenanceOverdue threshold', () => {
  it('THRESHOLDS contains the new metric key', () => {
    expect(Object.keys(THRESHOLDS)).toContain('assistiveDevice.maintenanceOverdue');
  });

  it('warning >0, critical >5 (strict — overdue device may be unsafe)', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('assistiveDevice.maintenanceOverdue', 0)).toBe('ok');
    expect(_severityFor('assistiveDevice.maintenanceOverdue', 1)).toBe('warning');
    expect(_severityFor('assistiveDevice.maintenanceOverdue', 5)).toBe('warning');
    expect(_severityFor('assistiveDevice.maintenanceOverdue', 6)).toBe('critical');
  });
});

describe('W372 — aggregation pipeline shape', () => {
  it('pipeline filters by nextMaintenanceDue<now AND retiredAt=null (active+overdue)', async () => {
    let capturedMatch = null;
    const assistiveDeviceModel = {
      aggregate: async pipeline => {
        capturedMatch = pipeline.find(s => s.$match).$match;
        return [{ _id: 'branch-1', overdueCount: 3 }];
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
    });
    await svc.buildHeatmap();
    // retiredAt must be null (excludes retired devices)
    expect(capturedMatch.retiredAt).toBeNull();
    // nextMaintenanceDue must be both non-null AND < now (excludes unscheduled + future)
    expect(capturedMatch.nextMaintenanceDue.$ne).toBeNull();
    expect(capturedMatch.nextMaintenanceDue.$lt).toBeInstanceOf(Date);
  });

  it('cell populated with severity per threshold', async () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([
        { _id: 'b1', overdueCount: 7 },
        { _id: 'b2', overdueCount: 2 },
        { _id: 'b3', overdueCount: 0 },
      ]),
    });
    const r = await svc.buildHeatmap();
    const b1 = r.branches.find(b => String(b.branchId) === 'b1');
    const b2 = r.branches.find(b => String(b.branchId) === 'b2');
    const b3 = r.branches.find(b => String(b.branchId) === 'b3');
    expect(b1.cells['assistiveDevice.maintenanceOverdue'].severity).toBe('critical'); // 7>5
    expect(b2.cells['assistiveDevice.maintenanceOverdue'].severity).toBe('warning'); // 2 in (0,5]
    expect(b3.cells['assistiveDevice.maintenanceOverdue'].severity).toBe('ok'); // 0
  });

  it('a single overdue device raises branch severity to warning even when all 10 other metrics are ok', async () => {
    const bid = 'branch-device-warn';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([{ _id: bid, overdueCount: 1 }]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches[0].severity).toBe('warning');
  });

  it('aggregation failure does not break other 7 sources (isolation preserved)', async () => {
    const bid = 'branch-x';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 5, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([{ _id: bid, openEvents: 0 }]),
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 0 }]),
      assistiveDeviceModel: {
        aggregate: async () => {
          throw new Error('simulated device failure');
        },
      },
      logger: { warn: () => {} },
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toHaveLength(1);
    expect(r.branches[0].cells['capa.open'].value).toBe(5);
    expect(r.branches[0].cells['seizures.openEvents'].value).toBe(0);
    expect(r.branches[0].cells['assistiveDevice.maintenanceOverdue']).toBeNull();
  });

  it('branchIds filter applied to assistive-device pipeline', async () => {
    let capturedMatch = null;
    const assistiveDeviceModel = {
      aggregate: async pipeline => {
        capturedMatch = pipeline[0].$match;
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
    });
    await svc.buildHeatmap({ branchIds: ['b1', 'b2'] });
    expect(capturedMatch.branchId).toEqual({ $in: ['b1', 'b2'] });
    // The maintenance + retiredAt clauses must be preserved alongside branchId
    expect(capturedMatch.retiredAt).toBeNull();
    expect(capturedMatch.nextMaintenanceDue.$ne).toBeNull();
  });

  it('full-merge: all 8 sources / 11 cells per branch', async () => {
    const bid = 'b-all';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 10, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([{ _id: bid, openCount: 2, overdueCount: 0 }]),
      rcaModel: makeStubModel([{ _id: bid, openCount: 1 }]),
      fmeaModel: makeStubModel([{ _id: bid, activeCount: 3 }]),
      riskModel: makeStubModel([{ _id: bid, criticalCount: 0 }]),
      seizureModel: makeStubModel([{ _id: bid, openEvents: 0 }]),
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 0 }]),
      assistiveDeviceModel: makeStubModel([{ _id: bid, overdueCount: 2 }]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toHaveLength(1);
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
    ]) {
      expect(r.branches[0].cells[key]).not.toBeNull();
    }
  });
});
