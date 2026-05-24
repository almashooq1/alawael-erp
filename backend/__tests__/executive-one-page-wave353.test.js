'use strict';

/**
 * W353 — executive 1-page composite drift guard.
 *
 * Tests composition with stub services + stub beneficiary model, plus
 * source-shape assertions on routes + bootstrap.
 */

const fs = require('fs');
const path = require('path');

const { createExecutiveOnePageService } = require('../services/quality/executiveOnePage.service');

const ROUTES_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'routes', 'quality', 'executiveOnePage.routes.js'),
  'utf8'
);
const BOOTSTRAP_SRC = fs.readFileSync(
  path.join(__dirname, '..', 'startup', 'capaBootstrap.js'),
  'utf8'
);

function makeHeatmap(
  branches = [],
  summary = { totalBranches: 0, criticalBranches: 0, warningBranches: 0, okBranches: 0 }
) {
  return {
    buildHeatmap: async () => ({ branches, summary }),
  };
}

function makeWorkload(
  therapists = [],
  summary = { totalTherapists: 0, criticalTherapists: 0, warningTherapists: 0, okTherapists: 0 }
) {
  return {
    buildWorkload: async () => ({ therapists, summary }),
  };
}

function makeBeneficiaryModel(statusRows = [], intakeCount = 0) {
  return {
    aggregate: async () => statusRows,
    countDocuments: async () => intakeCount,
  };
}

describe('W353 — internals', () => {
  const svc = createExecutiveOnePageService({});
  const { _severityRank, _worstMetricInCells, _topAttention } = svc._internals;

  it('_severityRank: ok<warning<critical, unknown→0', () => {
    expect(_severityRank('ok')).toBe(0);
    expect(_severityRank('warning')).toBe(1);
    expect(_severityRank('critical')).toBe(2);
    expect(_severityRank('made-up')).toBe(0);
  });

  it('_worstMetricInCells returns the key with the highest severity', () => {
    const cells = {
      'a.x': { severity: 'ok' },
      'a.y': { severity: 'warning' },
      'a.z': { severity: 'critical' },
    };
    expect(_worstMetricInCells(cells)).toBe('a.z');
  });

  it('_worstMetricInCells handles null cells gracefully', () => {
    const cells = { 'a.x': null, 'a.y': { severity: 'warning' } };
    expect(_worstMetricInCells(cells)).toBe('a.y');
  });

  it('_topAttention filters out ok severity + sorts by rank descending + slices to topN', () => {
    const items = [
      { branchId: 'b1', severity: 'ok', cells: {} },
      { branchId: 'b2', severity: 'warning', cells: { x: { severity: 'warning' } } },
      { branchId: 'b3', severity: 'critical', cells: { x: { severity: 'critical' } } },
      { branchId: 'b4', severity: 'warning', cells: { x: { severity: 'warning' } } },
    ];
    const out = _topAttention(items, 'branchId', 2);
    expect(out).toHaveLength(2);
    expect(out[0].branchId).toBe('b3'); // critical first
    expect(out[0].severity).toBe('critical');
    expect(out[0].worstMetric).toBe('x');
    expect(out[1].severity).toBe('warning');
  });
});

describe('W353 — build() composition', () => {
  it('composes all 3 sources into kpis + topAttention', async () => {
    const heatmapService = makeHeatmap(
      [
        {
          branchId: 'b1',
          severity: 'critical',
          cells: { 'capa.overdue': { severity: 'critical' } },
        },
        { branchId: 'b2', severity: 'warning', cells: { 'capa.open': { severity: 'warning' } } },
      ],
      { totalBranches: 2, criticalBranches: 1, warningBranches: 1, okBranches: 0 }
    );
    const workloadService = makeWorkload(
      [
        {
          therapistId: 't1',
          severity: 'critical',
          cells: { 'careplans.active': { severity: 'critical' } },
        },
      ],
      { totalTherapists: 1, criticalTherapists: 1, warningTherapists: 0, okTherapists: 0 }
    );
    const beneficiaryModel = makeBeneficiaryModel(
      [
        { _id: 'active', count: 120 },
        { _id: 'inactive', count: 8 },
      ],
      4
    );
    const svc = createExecutiveOnePageService({
      heatmapService,
      workloadService,
      beneficiaryModel,
    });
    const r = await svc.build();

    expect(r.kpis.beneficiaries.active).toBe(120);
    expect(r.kpis.beneficiaries.statusBreakdown).toEqual({ active: 120, inactive: 8 });
    expect(r.kpis.beneficiaries.intakeLast7Days).toBe(4);

    expect(r.kpis.quality.criticalBranches).toBe(1);
    expect(r.kpis.workload.criticalTherapists).toBe(1);

    expect(r.topAttention.branches).toHaveLength(2);
    expect(r.topAttention.branches[0].branchId).toBe('b1');
    expect(r.topAttention.branches[0].worstMetric).toBe('capa.overdue');
    expect(r.topAttention.therapists).toHaveLength(1);
    expect(r.topAttention.therapists[0].therapistId).toBe('t1');
  });

  it('beneficiary aggregation failure produces {error} but other KPIs survive', async () => {
    const failingBeneficiary = {
      aggregate: async () => {
        throw new Error('simulated beneficiary failure');
      },
      countDocuments: async () => 0,
    };
    const svc = createExecutiveOnePageService({
      heatmapService: makeHeatmap([], {
        totalBranches: 0,
        criticalBranches: 0,
        warningBranches: 0,
        okBranches: 0,
      }),
      workloadService: makeWorkload([], {
        totalTherapists: 0,
        criticalTherapists: 0,
        warningTherapists: 0,
        okTherapists: 0,
      }),
      beneficiaryModel: failingBeneficiary,
      logger: { warn: () => {} },
    });
    const r = await svc.build();
    expect(r.kpis.beneficiaries).toHaveProperty('error');
    expect(r.kpis.quality.totalBranches).toBe(0);
    expect(r.kpis.workload.totalTherapists).toBe(0);
  });

  it('heatmap failure produces {error} for quality + empty branches in topAttention', async () => {
    const failingHeatmap = {
      buildHeatmap: async () => {
        throw new Error('simulated heatmap failure');
      },
    };
    const svc = createExecutiveOnePageService({
      heatmapService: failingHeatmap,
      workloadService: makeWorkload(),
      beneficiaryModel: makeBeneficiaryModel(),
      logger: { warn: () => {} },
    });
    const r = await svc.build();
    expect(r.kpis.quality).toHaveProperty('error');
    expect(r.topAttention.branches).toEqual([]);
    expect(r.kpis.workload).not.toHaveProperty('error');
  });

  it('topN parameter limits topAttention slice', async () => {
    const heatmapService = makeHeatmap(
      [
        { branchId: 'b1', severity: 'critical', cells: {} },
        { branchId: 'b2', severity: 'critical', cells: {} },
        { branchId: 'b3', severity: 'warning', cells: {} },
      ],
      { totalBranches: 3, criticalBranches: 2, warningBranches: 1, okBranches: 0 }
    );
    const svc = createExecutiveOnePageService({
      heatmapService,
      workloadService: makeWorkload(),
      beneficiaryModel: makeBeneficiaryModel(),
    });
    const r = await svc.build({ topN: 1 });
    expect(r.topAttention.branches).toHaveLength(1);
    expect(r.topAttention.branches[0].severity).toBe('critical');
  });

  it('all-ok results in empty topAttention lists', async () => {
    const svc = createExecutiveOnePageService({
      heatmapService: makeHeatmap([{ branchId: 'b1', severity: 'ok', cells: {} }], {
        totalBranches: 1,
        criticalBranches: 0,
        warningBranches: 0,
        okBranches: 1,
      }),
      workloadService: makeWorkload([{ therapistId: 't1', severity: 'ok', cells: {} }], {
        totalTherapists: 1,
        criticalTherapists: 0,
        warningTherapists: 0,
        okTherapists: 1,
      }),
      beneficiaryModel: makeBeneficiaryModel(),
    });
    const r = await svc.build();
    expect(r.topAttention.branches).toEqual([]);
    expect(r.topAttention.therapists).toEqual([]);
  });

  it('generatedAt is an ISO string', async () => {
    const svc = createExecutiveOnePageService({
      heatmapService: makeHeatmap(),
      workloadService: makeWorkload(),
      beneficiaryModel: makeBeneficiaryModel(),
    });
    const r = await svc.build({ now: new Date('2026-05-24T12:00:00Z') });
    expect(r.generatedAt).toBe('2026-05-24T12:00:00.000Z');
  });
});

describe('W353 — REST + bootstrap', () => {
  it('GET /health enumerates the 3 composed sources (no auth)', () => {
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/health['"]/);
    expect(ROUTES_SRC).toMatch(/composes:\s*\[/);
    expect(ROUTES_SRC).toMatch(/beneficiary KPIs/);
    expect(ROUTES_SRC).toMatch(/branch quality heatmap/);
    expect(ROUTES_SRC).toMatch(/therapist workload/);
  });

  it('GET / requires authenticate + attachMfaActor + tier 1', () => {
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*authenticate\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.use\(\s*attachMfaActor\s*\)/);
    expect(ROUTES_SRC).toMatch(/router\.get\(\s*['"]\/['"]\s*,\s*requireMfaTier\(\s*1\s*\)/);
  });

  it('topN query param defensively clamped to 1-20', () => {
    expect(ROUTES_SRC).toMatch(/topN\s*=\s*5/);
    expect(ROUTES_SRC).toMatch(/topN\s*>\s*20/);
  });

  it('bootstrap mounts dual /api + /api/v1/quality/executive-1-page', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/quality\/executive-1-page['"]\s*,\s*execRouter\s*\)/
    );
    expect(BOOTSTRAP_SRC).toMatch(
      /app\.use\(\s*['"]\/api\/v1\/quality\/executive-1-page['"]\s*,\s*execRouter\s*\)/
    );
  });

  it('bootstrap requires the correct route file path', () => {
    expect(BOOTSTRAP_SRC).toMatch(
      /require\(\s*['"]\.\.\/routes\/quality\/executiveOnePage\.routes['"]\s*\)/
    );
  });
});
