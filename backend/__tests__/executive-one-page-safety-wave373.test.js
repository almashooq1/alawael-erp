'use strict';

/**
 * W373 — executive 1-page safety KPI panel (extends W353).
 *
 * Rolls up the 4 safety-relevant heatmap cells (W350 capa.critical + W371
 * seizures.openEvents + W371 safeguarding.openConcerns + W372
 * assistiveDevice.maintenanceOverdue) into a single executive KPI panel.
 * Derived from heatmap.branches[] — no extra DB call required.
 */

const { createExecutiveOnePageService } = require('../services/quality/executiveOnePage.service');

function makeHeatmap(branches = []) {
  return {
    buildHeatmap: async () => ({
      branches,
      summary: {
        totalBranches: branches.length,
        criticalBranches: branches.filter(b => b.severity === 'critical').length,
        warningBranches: branches.filter(b => b.severity === 'warning').length,
        okBranches: branches.filter(b => b.severity === 'ok').length,
      },
    }),
  };
}

function makeWorkload() {
  return {
    buildWorkload: async () => ({
      therapists: [],
      summary: {
        totalTherapists: 0,
        criticalTherapists: 0,
        warningTherapists: 0,
        okTherapists: 0,
      },
    }),
  };
}

function makeBeneficiaryModel() {
  return {
    aggregate: async () => [],
    countDocuments: async () => 0,
  };
}

describe('W373 — SAFETY_CELL_KEYS + _safetyKpis purity', () => {
  const svc = createExecutiveOnePageService({});
  const { SAFETY_CELL_KEYS, _safetyKpis } = svc._internals;

  it('SAFETY_CELL_KEYS exposes the 4 expected metrics', () => {
    expect([...SAFETY_CELL_KEYS].sort()).toEqual([
      'assistiveDevice.maintenanceOverdue',
      'capa.critical',
      'safeguarding.openConcerns',
      'seizures.openEvents',
    ]);
  });

  it('_safetyKpis on empty branches returns zeroed-out shape', () => {
    const r = _safetyKpis([]);
    expect(r.totalEvents).toBe(0);
    expect(r.branchesScanned).toBe(0);
    expect(r.branchesWithSafetyWarning).toBe(0);
    for (const k of SAFETY_CELL_KEYS) {
      expect(r.perMetric[k]).toBe(0);
    }
  });

  it('_safetyKpis sums cell.value across branches, only counting non-zero cells', () => {
    const branches = [
      {
        branchId: 'b1',
        severity: 'warning',
        cells: {
          'seizures.openEvents': { value: 2, severity: 'warning' },
          'safeguarding.openConcerns': { value: 0, severity: 'ok' },
          'assistiveDevice.maintenanceOverdue': { value: 1, severity: 'warning' },
          'capa.critical': { value: 0, severity: 'ok' },
          'capa.open': { value: 30, severity: 'warning' }, // NOT a safety cell — should be ignored
        },
      },
      {
        branchId: 'b2',
        severity: 'critical',
        cells: {
          'seizures.openEvents': { value: 6, severity: 'critical' },
          'safeguarding.openConcerns': { value: 4, severity: 'critical' },
          'assistiveDevice.maintenanceOverdue': { value: 0, severity: 'ok' },
          'capa.critical': { value: 5, severity: 'critical' },
        },
      },
    ];
    const r = _safetyKpis(branches);
    expect(r.perMetric['seizures.openEvents']).toBe(8); // 2 + 6
    expect(r.perMetric['safeguarding.openConcerns']).toBe(4); // 0 + 4
    expect(r.perMetric['assistiveDevice.maintenanceOverdue']).toBe(1); // 1 + 0
    expect(r.perMetric['capa.critical']).toBe(5); // 0 + 5
    expect(r.totalEvents).toBe(8 + 4 + 1 + 5);
  });

  it('_safetyKpis counts branchesWithSafetyWarning (any non-ok safety cell)', () => {
    const branches = [
      {
        branchId: 'b1',
        cells: { 'seizures.openEvents': { value: 1, severity: 'warning' } },
      }, // has safety warning
      {
        branchId: 'b2',
        cells: { 'capa.open': { value: 30, severity: 'warning' } },
      }, // warning but NOT safety
      {
        branchId: 'b3',
        cells: { 'capa.critical': { value: 0, severity: 'ok' } },
      }, // safety cell but value=0
      {
        branchId: 'b4',
        cells: { 'safeguarding.openConcerns': { value: 4, severity: 'critical' } },
      }, // safety
    ];
    const r = _safetyKpis(branches);
    expect(r.branchesScanned).toBe(4);
    expect(r.branchesWithSafetyWarning).toBe(2); // only b1 + b4
  });

  it('_safetyKpis tolerates null cells + missing cells map gracefully', () => {
    const branches = [
      { branchId: 'b1' }, // no cells map at all
      { branchId: 'b2', cells: null },
      {
        branchId: 'b3',
        cells: {
          'seizures.openEvents': null, // null cell
          'safeguarding.openConcerns': { value: 2, severity: 'warning' },
        },
      },
    ];
    const r = _safetyKpis(branches);
    expect(r.branchesScanned).toBe(3);
    expect(r.perMetric['safeguarding.openConcerns']).toBe(2);
    expect(r.totalEvents).toBe(2);
    expect(r.branchesWithSafetyWarning).toBe(1);
  });
});

describe('W373 — build() integration: kpis.safety populated from heatmap.branches[]', () => {
  it('kpis.safety appears in the build() output shape', async () => {
    const svc = createExecutiveOnePageService({
      heatmapService: makeHeatmap([
        {
          branchId: 'b1',
          severity: 'warning',
          cells: {
            'seizures.openEvents': { value: 3, severity: 'warning' },
            'safeguarding.openConcerns': { value: 0, severity: 'ok' },
            'assistiveDevice.maintenanceOverdue': { value: 2, severity: 'warning' },
            'capa.critical': { value: 1, severity: 'warning' },
          },
        },
      ]),
      workloadService: makeWorkload(),
      beneficiaryModel: makeBeneficiaryModel(),
    });
    const r = await svc.build();
    expect(r.kpis.safety).toMatchObject({
      totalEvents: 6, // 3 + 0 + 2 + 1
      branchesScanned: 1,
      branchesWithSafetyWarning: 1,
      perMetric: {
        'seizures.openEvents': 3,
        'safeguarding.openConcerns': 0,
        'assistiveDevice.maintenanceOverdue': 2,
        'capa.critical': 1,
      },
    });
  });

  it('heatmap failure → kpis.safety = {error} (mirrors kpis.quality error path)', async () => {
    const svc = createExecutiveOnePageService({
      heatmapService: {
        buildHeatmap: async () => {
          throw new Error('simulated heatmap failure');
        },
      },
      workloadService: makeWorkload(),
      beneficiaryModel: makeBeneficiaryModel(),
      logger: { warn: () => {} },
    });
    const r = await svc.build();
    expect(r.kpis.quality).toHaveProperty('error');
    expect(r.kpis.safety).toHaveProperty('error');
    expect(r.kpis.safety.error).toMatch(/simulated heatmap failure/);
  });

  it('all-ok branches → safety.totalEvents=0 + branchesWithSafetyWarning=0', async () => {
    const svc = createExecutiveOnePageService({
      heatmapService: makeHeatmap([
        {
          branchId: 'b1',
          severity: 'ok',
          cells: {
            'seizures.openEvents': { value: 0, severity: 'ok' },
            'safeguarding.openConcerns': { value: 0, severity: 'ok' },
            'assistiveDevice.maintenanceOverdue': { value: 0, severity: 'ok' },
            'capa.critical': { value: 0, severity: 'ok' },
          },
        },
      ]),
      workloadService: makeWorkload(),
      beneficiaryModel: makeBeneficiaryModel(),
    });
    const r = await svc.build();
    expect(r.kpis.safety.totalEvents).toBe(0);
    expect(r.kpis.safety.branchesWithSafetyWarning).toBe(0);
    expect(r.kpis.safety.branchesScanned).toBe(1);
  });

  it('no heatmap branches → safety is zero-shaped, not error', async () => {
    const svc = createExecutiveOnePageService({
      heatmapService: makeHeatmap([]),
      workloadService: makeWorkload(),
      beneficiaryModel: makeBeneficiaryModel(),
    });
    const r = await svc.build();
    expect(r.kpis.safety.totalEvents).toBe(0);
    expect(r.kpis.safety.branchesScanned).toBe(0);
  });
});
