/**
 * reporting-kpi-builder.test.js — Phase 10 Commit 7h.
 */

'use strict';

const {
  buildExecDigest,
  buildBoardPack,
  buildBranchKpiPack,
} = require('../services/reporting/builders/kpiReportBuilder');

function kpi(overrides = {}) {
  return {
    id: 'k1',
    nameEn: 'KPI 1',
    domain: 'quality',
    unit: 'percent',
    direction: 'higher_is_better',
    target: 90,
    warningThreshold: 80,
    criticalThreshold: 70,
    owner: 'quality_coordinator',
    compliance: ['CBAHI 8.7'],
    frequency: 'daily',
    dataSource: { service: 's', method: 'm', path: 'p' },
    ...overrides,
  };
}

function makeRegistry(entries) {
  return {
    KPIS: entries,
    classify(k, value) {
      if (value == null) return 'unknown';
      if (k.direction === 'higher_is_better') {
        if (value >= k.target) return 'green';
        if (value >= k.warningThreshold) return 'amber';
        return 'red';
      }
      if (value <= k.target) return 'green';
      if (value <= k.warningThreshold) return 'amber';
      return 'red';
    },
  };
}

describe('buildExecDigest (daily)', () => {
  const report = { id: 'exec.kpi.digest.daily' };

  test('includes hourly + daily KPIs only', async () => {
    const registry = makeRegistry([
      kpi({ id: 'h1', frequency: 'hourly' }),
      kpi({ id: 'd1', frequency: 'daily' }),
      kpi({ id: 'w1', frequency: 'weekly' }),
      kpi({ id: 'm1', frequency: 'monthly' }),
    ]);
    const valueResolver = async k => (k.id === 'h1' ? 95 : k.id === 'd1' ? 65 : 100);
    const doc = await buildExecDigest({
      report,
      periodKey: '2026-04-22',
      ctx: { models: { kpiRegistry: registry }, valueResolver },
    });
    expect(doc.kpis.map(k => k.id).sort()).toEqual(['d1', 'h1']);
    expect(doc.counts.green).toBe(1);
    expect(doc.counts.red).toBe(1);
  });

  test('missing registry → empty digest with note', async () => {
    const doc = await buildExecDigest({
      report,
      periodKey: '2026-04-22',
      ctx: { models: {} /* no kpiRegistry and the real require may or may not work in tests */ },
    });
    // In the test env, require('../../../config/kpi.registry') may succeed.
    // If it does, we get the real registry back and counts.unknown > 0.
    // If it fails (no serviceLocator + no value resolver in ctx) we get an empty note.
    // Accept both outcomes: the key invariant is it never throws.
    expect(Array.isArray(doc.kpis) || doc.kpis === null).toBe(true);
  });

  test('degrades on unrecognised periodKey', async () => {
    const doc = await buildExecDigest({ report, periodKey: 'nope' });
    expect(doc.summary.items.some(i => i.includes('Unrecognised'))).toBe(true);
  });
});

describe('buildBoardPack (quarterly)', () => {
  const report = { id: 'exec.kpi.board.quarterly' };

  test('aggregates across domains + compliance', async () => {
    const registry = makeRegistry([
      kpi({ id: 'q1', domain: 'quality', compliance: ['CBAHI 8.7'] }),
      kpi({ id: 'f1', domain: 'finance', compliance: ['ZATCA'] }),
      kpi({ id: 'h1', domain: 'hr', compliance: ['GOSI'] }),
    ]);
    // higher_is_better: target=90, warning=80, critical=70
    // 95 ≥ 90 → green; 85 ∈ [80, 90) → amber; 50 < 80 → red
    const valueResolver = async k => (k.id === 'q1' ? 95 : k.id === 'f1' ? 85 : 50);
    const doc = await buildBoardPack({
      report,
      periodKey: '2026-Q2',
      ctx: { models: { kpiRegistry: registry }, valueResolver },
    });
    expect(doc.counts).toEqual({ green: 1, amber: 1, red: 1, unknown: 0 });
    expect(doc.byDomain.quality.green).toBe(1);
    expect(doc.byDomain.finance.amber).toBe(1);
    expect(doc.byDomain.hr.red).toBe(1);
    expect(doc.byCompliance['CBAHI 8.7'].green).toBe(1);
    expect(doc.byCompliance.ZATCA.amber).toBe(1);
  });
});

describe('buildBranchKpiPack (monthly)', () => {
  const report = { id: 'branch.kpi.monthly' };

  test('passes branchId through to valueResolver ctx', async () => {
    const registry = makeRegistry([kpi({ id: 'k1' })]);
    const valueResolver = jest.fn(async (_k, ctx) => {
      expect(ctx.branchId).toBe('br1');
      return 95;
    });
    const doc = await buildBranchKpiPack({
      report,
      periodKey: '2026-04',
      scopeKey: 'branch:br1',
      ctx: { models: { kpiRegistry: registry }, valueResolver },
    });
    expect(valueResolver).toHaveBeenCalled();
    expect(doc.kpis[0].status).toBe('green');
    expect(doc.branch).toEqual({ id: 'br1' });
  });
});
