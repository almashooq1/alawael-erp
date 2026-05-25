'use strict';

/**
 * W371 — heatmap clinical-safety metrics (extends W350+W351).
 *
 * Bridges the W356 (SeizureEvent) + W357 (SafeguardingConcern) clinical-event
 * surfaces onto the operational heatmap. Same aggregation pattern as the
 * prior 5 sources; both new metrics use STRICT thresholds (warning >0) because
 * an unreviewed seizure or an open safeguarding concern is a real-time safety
 * signal that supervisors should see immediately.
 */

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W371 — new thresholds (SeizureEvent + SafeguardingConcern)', () => {
  it('THRESHOLDS includes the 2 new W371 metric keys', () => {
    const keys = Object.keys(THRESHOLDS);
    expect(keys).toContain('seizures.openEvents');
    expect(keys).toContain('safeguarding.openConcerns');
  });

  it('seizures.openEvents thresholds (warning >0, critical >5)', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('seizures.openEvents', 0)).toBe('ok');
    expect(_severityFor('seizures.openEvents', 1)).toBe('warning');
    expect(_severityFor('seizures.openEvents', 5)).toBe('warning');
    expect(_severityFor('seizures.openEvents', 6)).toBe('critical');
  });

  it('safeguarding.openConcerns thresholds (warning >0, critical >3) — strict', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('safeguarding.openConcerns', 0)).toBe('ok');
    expect(_severityFor('safeguarding.openConcerns', 1)).toBe('warning');
    expect(_severityFor('safeguarding.openConcerns', 3)).toBe('warning');
    expect(_severityFor('safeguarding.openConcerns', 4)).toBe('critical');
  });
});

describe('W371 — Seizure + Safeguarding aggregations', () => {
  it('Seizure pipeline filters by status="recorded" (the OPEN state, mirrors W356 STATUSES enum)', async () => {
    let capturedMatch = null;
    const seizureModel = {
      aggregate: async pipeline => {
        capturedMatch = pipeline.find(s => s.$match).$match;
        return [{ _id: 'branch-1', openEvents: 2 }];
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel,
      safeguardingModel: makeStubModel([]),
    });
    const r = await svc.buildHeatmap();
    expect(capturedMatch.status).toBe('recorded');
    expect(r.branches[0].cells['seizures.openEvents'].value).toBe(2);
    expect(r.branches[0].cells['seizures.openEvents'].severity).toBe('warning');
  });

  it('Safeguarding pipeline excludes closed/unsubstantiated (the 2 terminal states)', async () => {
    let capturedMatch = null;
    const safeguardingModel = {
      aggregate: async pipeline => {
        capturedMatch = pipeline.find(s => s.$match).$match;
        return [{ _id: 'branch-1', openConcerns: 4 }];
      },
    };
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel,
    });
    const r = await svc.buildHeatmap();
    expect(capturedMatch.status).toEqual({ $nin: ['closed', 'unsubstantiated'] });
    expect(r.branches[0].cells['safeguarding.openConcerns'].value).toBe(4);
    expect(r.branches[0].cells['safeguarding.openConcerns'].severity).toBe('critical'); // 4 > 3
  });

  it('all 7 sources merged into a single per-branch cells map (10 cells)', async () => {
    const bid = 'branch-mix';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 10, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([{ _id: bid, openCount: 2, overdueCount: 0 }]),
      rcaModel: makeStubModel([{ _id: bid, openCount: 1 }]),
      fmeaModel: makeStubModel([{ _id: bid, activeCount: 3 }]),
      riskModel: makeStubModel([{ _id: bid, criticalCount: 0 }]),
      seizureModel: makeStubModel([{ _id: bid, openEvents: 0 }]),
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 0 }]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toHaveLength(1);
    const b = r.branches[0];
    // All 10 cells populated, none null
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
    ]) {
      expect(b.cells[key]).not.toBeNull();
    }
    // No critical/warning anywhere → branch severity is ok
    expect(b.severity).toBe('ok');
  });

  it('one open safeguarding concern raises branch severity to warning even when all other metrics are ok', async () => {
    const bid = 'branch-safety-warn';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 1 }]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches[0].severity).toBe('warning');
  });

  it('seizure aggregation failure does not break other 6 sources (isolation preserved)', async () => {
    const bid = 'branch-x';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 5, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: {
        aggregate: async () => {
          throw new Error('simulated seizure failure');
        },
      },
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 0 }]),
      logger: { warn: () => {} },
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toHaveLength(1);
    expect(r.branches[0].cells['capa.open'].value).toBe(5);
    expect(r.branches[0].cells['safeguarding.openConcerns'].value).toBe(0);
    expect(r.branches[0].cells['seizures.openEvents']).toBeNull(); // failed source
  });

  it('branchIds filter applied to seizure + safeguarding pipelines', async () => {
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
      seizureModel: make('seizure'),
      safeguardingModel: make('safeguarding'),
    });
    await svc.buildHeatmap({ branchIds: ['b1', 'b2'] });
    expect(captured.seizure.branchId).toEqual({ $in: ['b1', 'b2'] });
    expect(captured.safeguarding.branchId).toEqual({ $in: ['b1', 'b2'] });
    // Status filter preserved alongside branchId
    expect(captured.seizure.status).toBe('recorded');
  });
});
