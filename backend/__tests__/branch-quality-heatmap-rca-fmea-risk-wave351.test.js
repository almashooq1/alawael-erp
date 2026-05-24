'use strict';

/**
 * W351 — heatmap RCA + FMEA + Risk metrics (extends W350).
 *
 * Asserts the 3 new aggregation pipelines, their threshold mappings, and that
 * the merge logic places them in the same per-branch cells map.
 */

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W351 — new thresholds (RCA + FMEA + Risk)', () => {
  it('THRESHOLDS includes the 3 new W351 metric keys', () => {
    // Jest's toHaveProperty interprets dots as path separators; use Object.keys instead.
    const keys = Object.keys(THRESHOLDS);
    expect(keys).toContain('rca.open');
    expect(keys).toContain('fmea.active');
    expect(keys).toContain('risk.critical');
  });

  it('rca.open thresholds (warning >3, critical >10) classify correctly', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('rca.open', 3)).toBe('ok');
    expect(_severityFor('rca.open', 4)).toBe('warning');
    expect(_severityFor('rca.open', 10)).toBe('warning');
    expect(_severityFor('rca.open', 11)).toBe('critical');
  });

  it('fmea.active thresholds (warning >5, critical >15) classify correctly', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('fmea.active', 5)).toBe('ok');
    expect(_severityFor('fmea.active', 6)).toBe('warning');
    expect(_severityFor('fmea.active', 15)).toBe('warning');
    expect(_severityFor('fmea.active', 16)).toBe('critical');
  });

  it('risk.critical (strict: warning >0, critical >2) — any critical risk is warning', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('risk.critical', 0)).toBe('ok');
    expect(_severityFor('risk.critical', 1)).toBe('warning');
    expect(_severityFor('risk.critical', 2)).toBe('warning');
    expect(_severityFor('risk.critical', 3)).toBe('critical');
  });
});

describe('W351 — RCA/FMEA/Risk aggregation merge', () => {
  it('RCA $group counts non-terminal status into openCount per branch', async () => {
    let capturedPipeline = null;
    const rcaModel = {
      aggregate: async pipeline => {
        capturedPipeline = pipeline;
        return [{ _id: 'branch-1', openCount: 4 }];
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel,
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
    });
    const r = await svc.buildHeatmap();
    // Verify the pipeline excludes terminal statuses via $nin / $not + $in pattern
    const groupStage = capturedPipeline.find(s => s.$group);
    expect(groupStage.$group.openCount.$sum.$cond[0].$not[0].$in[1]).toEqual([
      'verified',
      'archived',
      'cancelled',
    ]);
    // Branch cell populated
    expect(r.branches[0].cells['rca.open'].value).toBe(4);
    expect(r.branches[0].cells['rca.open'].severity).toBe('warning'); // 4 > 3
  });

  it('FMEA $group counts non-terminal status into activeCount per branch', async () => {
    let capturedPipeline = null;
    const fmeaModel = {
      aggregate: async pipeline => {
        capturedPipeline = pipeline;
        return [{ _id: 'branch-1', activeCount: 8 }];
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel,
      riskModel: makeStubModel([]),
    });
    const r = await svc.buildHeatmap();
    const groupStage = capturedPipeline.find(s => s.$group);
    expect(groupStage.$group.activeCount.$sum.$cond[0].$not[0].$in[1]).toEqual([
      'verified',
      'archived',
      'cancelled',
    ]);
    expect(r.branches[0].cells['fmea.active'].value).toBe(8);
    expect(r.branches[0].cells['fmea.active'].severity).toBe('warning'); // 8 > 5
  });

  it('Risk $group counts riskLevel="critical" into criticalCount per branch', async () => {
    let capturedPipeline = null;
    const riskModel = {
      aggregate: async pipeline => {
        capturedPipeline = pipeline;
        return [{ _id: 'branch-1', criticalCount: 5 }];
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel,
    });
    const r = await svc.buildHeatmap();
    const groupStage = capturedPipeline.find(s => s.$group);
    expect(groupStage.$group.criticalCount.$sum.$cond[0]).toEqual({
      $eq: ['$riskLevel', 'critical'],
    });
    expect(r.branches[0].cells['risk.critical'].value).toBe(5);
    expect(r.branches[0].cells['risk.critical'].severity).toBe('critical'); // 5 > 2
  });

  it('all 5 sources merged into a single per-branch cells map (no overlap collisions)', async () => {
    const branchId = 'branch-mixed';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([
        { _id: branchId, openCount: 25, overdueCount: 2, criticalCount: 0 },
      ]),
      auditModel: makeStubModel([{ _id: branchId, openCount: 3, overdueCount: 0 }]),
      rcaModel: makeStubModel([{ _id: branchId, openCount: 1 }]),
      fmeaModel: makeStubModel([{ _id: branchId, activeCount: 4 }]),
      riskModel: makeStubModel([{ _id: branchId, criticalCount: 1 }]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toHaveLength(1);
    const b = r.branches[0];
    // All 8 cells populated, none null
    for (const key of [
      'capa.open',
      'capa.overdue',
      'capa.critical',
      'audit.open',
      'audit.overdue',
      'rca.open',
      'fmea.active',
      'risk.critical',
    ]) {
      expect(b.cells[key]).not.toBeNull();
      expect(b.cells[key].value).toBeGreaterThanOrEqual(0);
    }
    // Branch severity = max — risk.critical=1 → warning, capa.open=25 → warning, all others ≤ warning
    expect(b.severity).toBe('warning');
  });

  it('a partial source failure (e.g. RCA) leaves other sources intact', async () => {
    const branchId = 'branch-partial';
    const rcaModel = {
      aggregate: async () => {
        throw new Error('simulated rca failure');
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([
        { _id: branchId, openCount: 5, overdueCount: 0, criticalCount: 0 },
      ]),
      auditModel: makeStubModel([]),
      rcaModel,
      fmeaModel: makeStubModel([{ _id: branchId, activeCount: 3 }]),
      riskModel: makeStubModel([]),
      logger: { warn: () => {} },
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toHaveLength(1);
    expect(r.branches[0].cells['capa.open'].value).toBe(5);
    expect(r.branches[0].cells['fmea.active'].value).toBe(3);
    expect(r.branches[0].cells['rca.open']).toBeNull(); // failed source
  });

  it('branchIds filter is applied to RCA/FMEA/Risk pipelines just like CAPA/Audit', async () => {
    const captured = {};
    const make = key => ({
      aggregate: async pipeline => {
        captured[key] = pipeline[0].$match;
        return [];
      },
    });
    const svc = createBranchQualityHeatmapService({
      capaModel: make('capa'),
      auditModel: make('audit'),
      rcaModel: make('rca'),
      fmeaModel: make('fmea'),
      riskModel: make('risk'),
    });
    await svc.buildHeatmap({ branchIds: ['b-1', 'b-2'] });
    for (const key of ['capa', 'audit', 'rca', 'fmea', 'risk']) {
      expect(captured[key].branchId).toEqual({ $in: ['b-1', 'b-2'] });
    }
  });
});
