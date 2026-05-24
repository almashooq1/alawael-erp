'use strict';

/**
 * W350 — branch quality heatmap drift guard.
 *
 * Tests the aggregation service with stub models that return fixed rows, so we
 * never need a real DB. Static source-shape assertions on the route file.
 */

const fs = require('fs');
const path = require('path');

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'branchQualityHeatmap.routes.js'),
  'utf8'
);
const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'capaBootstrap.js'),
  'utf8'
);

function makeStubModel(rows) {
  return {
    aggregate: async () => rows,
  };
}

describe('W350 — thresholds + severity classification', () => {
  it('exports THRESHOLDS with the 5 W350-baseline metrics (additional W351+ metrics asserted in their own test)', () => {
    const keys = Object.keys(THRESHOLDS);
    expect(keys).toEqual(
      expect.arrayContaining([
        'capa.open',
        'capa.overdue',
        'capa.critical',
        'audit.open',
        'audit.overdue',
      ])
    );
  });

  it('classifies value > critical as critical, > warning as warning, else ok', () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
    });
    const { _severityFor } = svc._internals;
    // capa.overdue: warning=0, critical=10
    expect(_severityFor('capa.overdue', 0)).toBe('ok');
    expect(_severityFor('capa.overdue', 1)).toBe('warning');
    expect(_severityFor('capa.overdue', 10)).toBe('warning');
    expect(_severityFor('capa.overdue', 11)).toBe('critical');
    // capa.open: warning=20, critical=50
    expect(_severityFor('capa.open', 5)).toBe('ok');
    expect(_severityFor('capa.open', 21)).toBe('warning');
    expect(_severityFor('capa.open', 51)).toBe('critical');
  });

  it('unknown metricKey returns ok (defensive)', () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
    });
    expect(svc._internals._severityFor('made.up.metric', 9999)).toBe('ok');
  });

  it('branch severity = MAX of its cell severities', () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
    });
    const { _maxSeverity } = svc._internals;
    expect(_maxSeverity(['ok', 'ok'])).toBe('ok');
    expect(_maxSeverity(['ok', 'warning'])).toBe('warning');
    expect(_maxSeverity(['warning', 'critical', 'ok'])).toBe('critical');
    expect(_maxSeverity([])).toBe('ok');
  });
});

describe('W350 — buildHeatmap end-to-end with stub aggregations', () => {
  it('merges CAPA + audit rows by branchId into a single cell grid', async () => {
    const capaModel = makeStubModel([
      { _id: 'branch-1', openCount: 30, overdueCount: 5, criticalCount: 1 },
      { _id: 'branch-2', openCount: 100, overdueCount: 15, criticalCount: 5 },
    ]);
    const auditModel = makeStubModel([
      { _id: 'branch-1', openCount: 4, overdueCount: 0 },
      { _id: 'branch-2', openCount: 20, overdueCount: 5 },
    ]);
    const svc = createBranchQualityHeatmapService({ capaModel, auditModel });
    const r = await svc.buildHeatmap();

    expect(r.branches).toHaveLength(2);
    const b1 = r.branches.find(b => String(b.branchId) === 'branch-1');
    const b2 = r.branches.find(b => String(b.branchId) === 'branch-2');

    expect(b1.cells['capa.open'].value).toBe(30);
    expect(b1.cells['capa.open'].severity).toBe('warning'); // 30 > 20
    expect(b1.cells['capa.overdue'].severity).toBe('warning'); // 5 in (0, 10]
    expect(b1.cells['capa.critical'].severity).toBe('warning'); // 1 in (0, 3]
    expect(b1.cells['audit.open'].severity).toBe('ok'); // 4 ≤ 5
    expect(b1.cells['audit.overdue'].severity).toBe('ok'); // 0
    expect(b1.severity).toBe('warning'); // max of cells

    expect(b2.cells['capa.open'].severity).toBe('critical'); // 100 > 50
    expect(b2.cells['capa.overdue'].severity).toBe('critical'); // 15 > 10
    expect(b2.cells['audit.overdue'].severity).toBe('critical'); // 5 > 3
    expect(b2.severity).toBe('critical');
  });

  it('summary tally matches branch severities', async () => {
    const capaModel = makeStubModel([
      { _id: 'b-ok', openCount: 0, overdueCount: 0, criticalCount: 0 },
      { _id: 'b-warn', openCount: 25, overdueCount: 0, criticalCount: 0 },
      { _id: 'b-crit', openCount: 60, overdueCount: 0, criticalCount: 0 },
    ]);
    const auditModel = makeStubModel([]);
    const svc = createBranchQualityHeatmapService({ capaModel, auditModel });
    const r = await svc.buildHeatmap();
    expect(r.summary).toEqual({
      totalBranches: 3,
      criticalBranches: 1,
      warningBranches: 1,
      okBranches: 1,
    });
  });

  it('respects branchIds filter (only requested branches considered)', async () => {
    let capaMatchPassed = null;
    const capaModel = {
      aggregate: async pipeline => {
        capaMatchPassed = pipeline[0].$match;
        return [];
      },
    };
    const auditModel = makeStubModel([]);
    const svc = createBranchQualityHeatmapService({ capaModel, auditModel });
    await svc.buildHeatmap({ branchIds: ['b1', 'b2'] });
    expect(capaMatchPassed.branchId).toEqual({ $in: ['b1', 'b2'] });
  });

  it('aggregation failure in CAPA does not break audit aggregation', async () => {
    const capaModel = {
      aggregate: async () => {
        throw new Error('simulated capa failure');
      },
    };
    const auditModel = makeStubModel([{ _id: 'branch-x', openCount: 2, overdueCount: 0 }]);
    const svc = createBranchQualityHeatmapService({
      capaModel,
      auditModel,
      logger: { warn: () => {} },
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toHaveLength(1);
    expect(String(r.branches[0].branchId)).toBe('branch-x');
    // CAPA cells should be null since aggregation failed
    expect(r.branches[0].cells['capa.open']).toBeNull();
  });

  it('returns empty branches when both aggregations return nothing', async () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches).toEqual([]);
    expect(r.summary.totalBranches).toBe(0);
  });

  it('generatedAt is an ISO timestamp + includes thresholds', async () => {
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([]),
      auditModel: makeStubModel([]),
    });
    const r = await svc.buildHeatmap({ now: new Date('2026-05-24T10:00:00Z') });
    expect(r.generatedAt).toBe('2026-05-24T10:00:00.000Z');
    expect(r.thresholds).toEqual(THRESHOLDS);
  });
});

describe('W350 — REST surface contract', () => {
  it('GET /health (no auth) returns thresholds + metric list', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/health['"]/);
    expect(ROUTES_SRC).toMatch(/thresholds:\s*THRESHOLDS/);
    expect(ROUTES_SRC).toMatch(/metrics:\s*Object\.keys\(THRESHOLDS\)/);
  });

  it('GET / requires tier 1 + auth', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*authenticate\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*attachMfaActor\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
  });

  it('parses comma-separated branchIds query param into array', () => {
    // Allows either branchIdsStr.split or String(branchIdsStr).split — both work.
    expect(ROUTES_SRC).toMatch(/\.split\(\s*['"],['"]\s*\)/);
  });

  it('uses single-instance service (read-only aggregations)', () => {
    expect(ROUTES_SRC).toMatch(/const service\s*=\s*createBranchQualityHeatmapService/);
  });
});

describe('W350 — bootstrap mounts heatmap routes dual /api + /api/v1', () => {
  it('mounts at /api/quality/branch-heatmap', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/quality\/branch-heatmap['"]\s*,\s*heatmapRouter\s*\)/
    );
  });

  it('mounts at /api/v1/quality/branch-heatmap (versioned dual-mount)', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/v1\/quality\/branch-heatmap['"]\s*,\s*heatmapRouter\s*\)/
    );
  });

  it('require path is ../routes/quality/branchQualityHeatmap.routes', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /require\(\s*['"]\.\.\/routes\/quality\/branchQualityHeatmap\.routes['"]\s*\)/
    );
  });
});
