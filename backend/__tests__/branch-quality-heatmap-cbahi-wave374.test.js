'use strict';

/**
 * W374 — heatmap cbahi.attestationsExpiringSoon metric (W360 bridge).
 *
 * 12th heatmap metric. Counts CbahiAttestation entries in an active status
 * (met / partially_met / not_met) where nextReassessmentDue falls in the
 * next 30 days. Draft + not_applicable attestations are EXCLUDED (no expiry
 * yet to track). Null nextReassessmentDue also excluded (not scheduled).
 */

const {
  createBranchQualityHeatmapService,
  THRESHOLDS,
} = require('../services/quality/branchQualityHeatmap.service');

function makeStubModel(rows) {
  return { aggregate: async () => rows };
}

describe('W374 — cbahi.attestationsExpiringSoon threshold', () => {
  it('THRESHOLDS contains the new metric key', () => {
    expect(Object.keys(THRESHOLDS)).toContain('cbahi.attestationsExpiringSoon');
  });

  it('warning >0, critical >5 (strict — expiring attestation = compliance risk)', () => {
    const svc = createBranchQualityHeatmapService({});
    const { _severityFor } = svc._internals;
    expect(_severityFor('cbahi.attestationsExpiringSoon', 0)).toBe('ok');
    expect(_severityFor('cbahi.attestationsExpiringSoon', 1)).toBe('warning');
    expect(_severityFor('cbahi.attestationsExpiringSoon', 5)).toBe('warning');
    expect(_severityFor('cbahi.attestationsExpiringSoon', 6)).toBe('critical');
  });
});

describe('W374 — aggregation pipeline shape', () => {
  it('pipeline filters by active status + 30d expiry window', async () => {
    let capturedMatch = null;
    const cbahiModel = {
      aggregate: async pipeline => {
        capturedMatch = pipeline.find(s => s.$match).$match;
        return [{ _id: 'branch-1', expiringCount: 2 }];
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
      cbahiModel,
    });
    await svc.buildHeatmap();
    // Status must be in active subset (excludes draft + not_applicable)
    expect(capturedMatch.status.$in).toEqual(['met', 'partially_met', 'not_met']);
    // Window: now ≤ nextReassessmentDue ≤ now+30d, AND non-null
    expect(capturedMatch.nextReassessmentDue.$ne).toBeNull();
    expect(capturedMatch.nextReassessmentDue.$gte).toBeInstanceOf(Date);
    expect(capturedMatch.nextReassessmentDue.$lte).toBeInstanceOf(Date);
    const span = capturedMatch.nextReassessmentDue.$lte - capturedMatch.nextReassessmentDue.$gte;
    expect(span).toBe(30 * 24 * 60 * 60 * 1000);
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
      cbahiModel: makeStubModel([
        { _id: 'b1', expiringCount: 8 },
        { _id: 'b2', expiringCount: 3 },
        { _id: 'b3', expiringCount: 0 },
      ]),
    });
    const r = await svc.buildHeatmap();
    const b1 = r.branches.find(b => String(b.branchId) === 'b1');
    const b2 = r.branches.find(b => String(b.branchId) === 'b2');
    const b3 = r.branches.find(b => String(b.branchId) === 'b3');
    expect(b1.cells['cbahi.attestationsExpiringSoon'].severity).toBe('critical'); // 8>5
    expect(b2.cells['cbahi.attestationsExpiringSoon'].severity).toBe('warning'); // 3 in (0,5]
    expect(b3.cells['cbahi.attestationsExpiringSoon'].severity).toBe('ok'); // 0
  });

  it('one expiring attestation raises branch severity to warning even when 11 others are ok', async () => {
    const bid = 'branch-cbahi-warn';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 0, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([]),
      rcaModel: makeStubModel([]),
      fmeaModel: makeStubModel([]),
      riskModel: makeStubModel([]),
      seizureModel: makeStubModel([]),
      safeguardingModel: makeStubModel([]),
      assistiveDeviceModel: makeStubModel([]),
      cbahiModel: makeStubModel([{ _id: bid, expiringCount: 1 }]),
    });
    const r = await svc.buildHeatmap();
    expect(r.branches[0].severity).toBe('warning');
  });

  it('aggregation failure isolated (other 8 sources still produce data)', async () => {
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
      cbahiModel: {
        aggregate: async () => {
          throw new Error('simulated cbahi failure');
        },
      },
      logger: { warn: () => {} },
    });
    const r = await svc.buildHeatmap();
    expect(r.branches[0].cells['capa.open'].value).toBe(5);
    expect(r.branches[0].cells['cbahi.attestationsExpiringSoon']).toBeNull();
  });

  it('branchIds filter applied + status/expiry clauses preserved', async () => {
    let captured = null;
    const cbahiModel = {
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
      cbahiModel,
    });
    await svc.buildHeatmap({ branchIds: ['b1', 'b2'] });
    expect(captured.branchId).toEqual({ $in: ['b1', 'b2'] });
    expect(captured.status.$in).toEqual(['met', 'partially_met', 'not_met']);
    expect(captured.nextReassessmentDue.$ne).toBeNull();
  });

  it('full-merge: all 9 sources / 12 cells per branch', async () => {
    const bid = 'b-all';
    const svc = createBranchQualityHeatmapService({
      capaModel: makeStubModel([{ _id: bid, openCount: 10, overdueCount: 0, criticalCount: 0 }]),
      auditModel: makeStubModel([{ _id: bid, openCount: 2, overdueCount: 0 }]),
      rcaModel: makeStubModel([{ _id: bid, openCount: 1 }]),
      fmeaModel: makeStubModel([{ _id: bid, activeCount: 3 }]),
      riskModel: makeStubModel([{ _id: bid, criticalCount: 0 }]),
      seizureModel: makeStubModel([{ _id: bid, openEvents: 0 }]),
      safeguardingModel: makeStubModel([{ _id: bid, openConcerns: 0 }]),
      assistiveDeviceModel: makeStubModel([{ _id: bid, overdueCount: 0 }]),
      cbahiModel: makeStubModel([{ _id: bid, expiringCount: 2 }]),
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
    ]) {
      expect(r.branches[0].cells[key]).not.toBeNull();
    }
  });
});
