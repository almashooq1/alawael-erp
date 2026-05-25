'use strict';

/**
 * W375 — heatmap respite.upcomingBookings metric (W363 bridge).
 *
 * 13th heatmap metric. Counts RespiteBooking entries scheduled
 * (status='approved' OR 'confirmed') with startAt in the next 7 days.
 * Forward-looking operational signal — moderate thresholds (not strict).
 */

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W375 — respite.upcomingBookings threshold', () => {
  it('THRESHOLDS contains the new metric key', () => {
    expect(Object.keys(THRESHOLDS)).toContain('respite.upcomingBookings');
  });

  it('warning >10, critical >25 (moderate — forward-looking load signal, not safety risk)', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('respite.upcomingBookings', 10)).toBe('ok');
    expect(_severityFor('respite.upcomingBookings', 11)).toBe('warning');
    expect(_severityFor('respite.upcomingBookings', 25)).toBe('warning');
    expect(_severityFor('respite.upcomingBookings', 26)).toBe('critical');
  });
});

describe('W375 — aggregation pipeline shape', () => {
  it('filters by approved|confirmed status AND startAt in next 7 days', async () => {
    let capturedMatch = null;
    const respiteModel = {
      aggregate: async pipeline => {
        capturedMatch = pipeline.find(s => s.$match).$match;
        return [{ _id: 'b1', upcomingCount: 12 }];
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
      respiteModel,
    });
    await svc.buildHeatmap();
    expect(capturedMatch.status.$in).toEqual(['approved', 'confirmed']);
    expect(capturedMatch.startAt.$gte).toBeInstanceOf(Date);
    expect(capturedMatch.startAt.$lte).toBeInstanceOf(Date);
    const span = capturedMatch.startAt.$lte - capturedMatch.startAt.$gte;
    expect(span).toBe(7 * 24 * 60 * 60 * 1000);
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
      respiteModel: makeStubModel([
        { _id: 'b1', upcomingCount: 30 },
        { _id: 'b2', upcomingCount: 15 },
        { _id: 'b3', upcomingCount: 8 },
      ]),
    });
    const r = await svc.buildHeatmap();
    const b1 = r.branches.find(b => String(b.branchId) === 'b1');
    const b2 = r.branches.find(b => String(b.branchId) === 'b2');
    const b3 = r.branches.find(b => String(b.branchId) === 'b3');
    expect(b1.cells['respite.upcomingBookings'].severity).toBe('critical'); // 30>25
    expect(b2.cells['respite.upcomingBookings'].severity).toBe('warning'); // 15 in (10,25]
    expect(b3.cells['respite.upcomingBookings'].severity).toBe('ok'); // 8 ≤ 10
  });

  it('aggregation failure isolated (other 9 sources still populate)', async () => {
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
      respiteModel: {
        aggregate: async () => {
          throw new Error('simulated respite failure');
        },
      },
      logger: { warn: () => {} },
    });
    const r = await svc.buildHeatmap();
    expect(r.branches[0].cells['capa.open'].value).toBe(5);
    expect(r.branches[0].cells['respite.upcomingBookings']).toBeNull();
  });

  it('branchIds filter + status/date clauses preserved', async () => {
    let captured = null;
    const respiteModel = {
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
      respiteModel,
    });
    await svc.buildHeatmap({ branchIds: ['b1', 'b2'] });
    expect(captured.branchId).toEqual({ $in: ['b1', 'b2'] });
    expect(captured.status.$in).toEqual(['approved', 'confirmed']);
    expect(captured.startAt.$gte).toBeInstanceOf(Date);
  });

  it('full-merge: all 10 sources / 13 cells per branch', async () => {
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
      respiteModel: makeStubModel([{ _id: bid, upcomingCount: 5 }]),
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
    ]) {
      expect(r.branches[0].cells[key]).not.toBeNull();
    }
    expect(r.branches[0].cells['respite.upcomingBookings'].value).toBe(5);
    // 5 upcoming respite + everything else 0 → branch ok
    expect(r.branches[0].severity).toBe('ok');
  });
});
