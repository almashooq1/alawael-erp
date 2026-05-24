'use strict';

/**
 * W337 — adapter tests: PLATEAU_DETECTED alert → AiRecommendationBundle draft.
 *
 * Pure-function tests (scoreEvidence + buildSignals + plateauAlertToDraftArgs)
 * + thin orchestrator tests (createBundlesFromOpenPlateauAlerts with mocked
 * model + service).
 */

const adapter = require('../services/aiRecommendation-plateau-adapter.service');

// ═══════════════════════════════════════════════════════════════════════
// scoreEvidence — heuristic confidence per ADR-011
// ═══════════════════════════════════════════════════════════════════════

describe('W337 scoreEvidence', () => {
  it('full-strength evidence → 1.0', () => {
    const conf = adapter.scoreEvidence({ n: 8, spanDays: 120, slopePerMonth: 0.2, r2: 0.85 });
    expect(conf).toBe(1);
  });

  it('zero / undefined evidence → 0', () => {
    expect(adapter.scoreEvidence()).toBe(0);
    expect(adapter.scoreEvidence({})).toBe(0);
  });

  it('only n + spanDays → 0.6 (in DRAFT tuning band per lib)', () => {
    const conf = adapter.scoreEvidence({ n: 6, spanDays: 95 });
    expect(conf).toBeCloseTo(0.6, 5);
    // Sanity: 0.6 maps to DRAFT (tuning band), not PENDING_REVIEW
    const lib = require('../intelligence/ai-recommendation-lifecycle.lib');
    expect(lib.classifyByConfidence(conf)).toBe('DRAFT');
  });

  it('strong slope + r2 alone (n=2, spanDays=15) → 0.4 → DISCARDED', () => {
    const conf = adapter.scoreEvidence({ n: 2, spanDays: 15, slopePerMonth: 0.1, r2: 0.9 });
    expect(conf).toBeCloseTo(0.4, 5);
    const lib = require('../intelligence/ai-recommendation-lifecycle.lib');
    expect(lib.classifyByConfidence(conf)).toBe('DISCARDED');
  });

  it('clamps to [0, 1] — never exceeds', () => {
    const conf = adapter.scoreEvidence({ n: 1000, spanDays: 9999, slopePerMonth: 0, r2: 1 });
    expect(conf).toBeLessThanOrEqual(1);
  });

  it('slope of exactly 1 does NOT count (strict <)', () => {
    const conf = adapter.scoreEvidence({ n: 5, spanDays: 90, slopePerMonth: 1, r2: 0.5 });
    // n + span + r2 = 0.30 + 0.30 + 0.15 = 0.75; slope NOT credited
    expect(conf).toBeCloseTo(0.75, 5);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// buildSignals — explainability payload
// ═══════════════════════════════════════════════════════════════════════

describe('W337 buildSignals', () => {
  it('full-strength evidence produces 4 signals', () => {
    const signals = adapter.buildSignals({ n: 8, spanDays: 120, slopePerMonth: 0.2, r2: 0.85 });
    expect(signals).toHaveLength(4);
    const names = signals.map(s => s.name).sort();
    expect(names).toEqual([
      'measurement_count_sufficient',
      'observation_span_long',
      'slope_flat',
      'trend_well_fit',
    ]);
  });

  it('weights sum to 1.0 when all 4 fire', () => {
    const signals = adapter.buildSignals({ n: 8, spanDays: 120, slopePerMonth: 0.2, r2: 0.85 });
    const sum = signals.reduce((a, s) => a + s.weight, 0);
    expect(sum).toBeCloseTo(1, 5);
  });

  it('empty evidence → empty array', () => {
    expect(adapter.buildSignals()).toEqual([]);
    expect(adapter.buildSignals({})).toEqual([]);
  });

  it('every emitted signal carries an evidence string for explainability', () => {
    const signals = adapter.buildSignals({ n: 8, spanDays: 120, slopePerMonth: 0.2, r2: 0.85 });
    for (const s of signals) {
      expect(typeof s.evidence).toBe('string');
      expect(s.evidence.length).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// plateauAlertToDraftArgs — converter
// ═══════════════════════════════════════════════════════════════════════

describe('W337 plateauAlertToDraftArgs', () => {
  it('returns null for null / non-plateau alerts', () => {
    expect(adapter.plateauAlertToDraftArgs(null)).toBeNull();
    expect(adapter.plateauAlertToDraftArgs({ alertType: 'REGRESSION_DETECTED' })).toBeNull();
    expect(adapter.plateauAlertToDraftArgs({ alertType: 'MCID_NOT_MET' })).toBeNull();
  });

  it('returns null when beneficiaryId is missing', () => {
    expect(adapter.plateauAlertToDraftArgs({ alertType: 'PLATEAU_DETECTED' })).toBeNull();
  });

  it('builds INCREASE_DOSAGE_AND_REASSESS args for a full-strength alert', () => {
    const alert = {
      _id: 'alert-123',
      alertType: 'PLATEAU_DETECTED',
      beneficiaryId: 'ben-1',
      branchId: 'br-1',
      episodeId: 'ep-1',
      measureRef: { code: 'WISC-V', name: 'Wechsler IQ' },
      evidence: { n: 8, spanDays: 120, slopePerMonth: 0.2, r2: 0.85, message_ar: 'ثبات قوي' },
    };
    const args = adapter.plateauAlertToDraftArgs(alert);
    expect(args.beneficiaryId).toBe('ben-1');
    expect(args.branchId).toBe('br-1');
    expect(args.episodeId).toBe('ep-1');
    expect(args.type).toBe('INCREASE_DOSAGE_AND_REASSESS');
    expect(args.confidence).toBe(1);
    expect(args.signals).toHaveLength(4);
    expect(args.draftAction.basis).toBe('plateau-alert');
    expect(args.draftAction.sourceAlertId).toBe('alert-123');
    expect(args.draftAction.measureRef).toEqual({ code: 'WISC-V', name: 'Wechsler IQ' });
    expect(args.reviewerHint).toBe('ثبات قوي'); // Arabic message preserved when present
    expect(args.llmTelemetryCallId).toBeNull(); // no LLM call yet
  });

  it('synthesizes a reviewerHint when alert lacks message_ar', () => {
    const alert = {
      _id: 'alert-x',
      alertType: 'PLATEAU_DETECTED',
      beneficiaryId: 'ben-1',
      measureRef: 'CARS-2',
      evidence: { n: 6, spanDays: 95, slopePerMonth: 0.3 },
    };
    const args = adapter.plateauAlertToDraftArgs(alert);
    expect(args.reviewerHint).toMatch(/Plateau detected on CARS-2/);
    expect(args.reviewerHint).toMatch(/6 measurements/);
    expect(args.reviewerHint).toMatch(/95 days/);
  });

  it('handles missing branchId/episodeId gracefully (sets null)', () => {
    const args = adapter.plateauAlertToDraftArgs({
      alertType: 'PLATEAU_DETECTED',
      beneficiaryId: 'ben-1',
      evidence: { n: 5, spanDays: 90 },
    });
    expect(args.branchId).toBeNull();
    expect(args.episodeId).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// createBundlesFromOpenPlateauAlerts — orchestrator with mocked deps
// ═══════════════════════════════════════════════════════════════════════

describe('W337 createBundlesFromOpenPlateauAlerts', () => {
  function makeMockAlertModel(alerts) {
    return {
      find(_query) {
        return {
          limit(_n) {
            return Promise.resolve(alerts);
          },
        };
      },
      updateOne: jest.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 }),
    };
  }

  it('throws when alertModel is missing or invalid', async () => {
    await expect(
      adapter.createBundlesFromOpenPlateauAlerts({
        alertModel: null,
        aiRecService: { createDraft: jest.fn() },
      })
    ).rejects.toThrow(/alertModel/);
  });

  it('throws when aiRecService.createDraft is missing', async () => {
    await expect(
      adapter.createBundlesFromOpenPlateauAlerts({
        alertModel: makeMockAlertModel([]),
        aiRecService: {},
      })
    ).rejects.toThrow(/createDraft/);
  });

  it('handles an empty alert batch (scanned=0)', async () => {
    const result = await adapter.createBundlesFromOpenPlateauAlerts({
      alertModel: makeMockAlertModel([]),
      aiRecService: { createDraft: jest.fn() },
    });
    expect(result).toEqual({ scanned: 0, converted: 0, skipped: 0, errors: [] });
  });

  it('converts open plateau alerts and stamps each with linkedRecommendationBundleId', async () => {
    const alerts = [
      {
        _id: 'a1',
        alertType: 'PLATEAU_DETECTED',
        beneficiaryId: 'b1',
        evidence: { n: 6, spanDays: 100, slopePerMonth: 0.2, r2: 0.7 },
      },
      {
        _id: 'a2',
        alertType: 'PLATEAU_DETECTED',
        beneficiaryId: 'b2',
        evidence: { n: 8, spanDays: 120, slopePerMonth: 0.1, r2: 0.9 },
      },
    ];
    const alertModel = makeMockAlertModel(alerts);
    const createDraft = jest
      .fn()
      .mockResolvedValueOnce({ _id: 'bundle-1' })
      .mockResolvedValueOnce({ _id: 'bundle-2' });
    const result = await adapter.createBundlesFromOpenPlateauAlerts({
      alertModel,
      aiRecService: { createDraft },
    });
    expect(result.scanned).toBe(2);
    expect(result.converted).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toEqual([]);
    expect(createDraft).toHaveBeenCalledTimes(2);
    expect(alertModel.updateOne).toHaveBeenCalledTimes(2);
    expect(alertModel.updateOne.mock.calls[0][1]).toEqual({
      $set: { linkedRecommendationBundleId: 'bundle-1' },
    });
  });

  it('captures per-alert errors without aborting the batch', async () => {
    const alerts = [
      {
        _id: 'good',
        alertType: 'PLATEAU_DETECTED',
        beneficiaryId: 'b1',
        evidence: { n: 6, spanDays: 100 },
      },
      {
        _id: 'bad',
        alertType: 'PLATEAU_DETECTED',
        beneficiaryId: 'b2',
        evidence: { n: 5, spanDays: 90 },
      },
    ];
    const alertModel = makeMockAlertModel(alerts);
    const createDraft = jest
      .fn()
      .mockResolvedValueOnce({ _id: 'bundle-good' })
      .mockRejectedValueOnce(
        Object.assign(new Error('save failed'), { code: 'INVALID_TRANSITION' })
      );
    const result = await adapter.createBundlesFromOpenPlateauAlerts({
      alertModel,
      aiRecService: { createDraft },
    });
    expect(result.scanned).toBe(2);
    expect(result.converted).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].alertId).toBe('bad');
    expect(result.errors[0].code).toBe('INVALID_TRANSITION');
  });
});
