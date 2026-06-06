'use strict';
/**
 * W975 — measure application records the canonical `measure_applied`
 * CareTimeline event (was mislabeled `assessment_completed`).
 *
 * Doctrine: every timeline event type must be distinct and actionable. A
 * measure administration is NOT an assessment completion; conflating them on
 * the unified CareTimeline hides the Measures-Library signal. This locks the
 * applyMeasure → _recordTimeline wire to `measure_applied`, linked to the
 * beneficiary + episode (the unified core).
 *
 * Harness: mock mongoose models + ScoringEngine, drive applyMeasure for real,
 * assert the CareTimeline.create payload (mirrors the W974 lifecycle test).
 */

const path = require('path');
const fs = require('fs');

// ── mongoose model stubs (defined inside factory; exposed for per-test config) ──
jest.mock('mongoose', () => {
  const stubs = {
    Measure: { findById: jest.fn() },
    MeasureApplication: { getMeasureHistory: jest.fn(), create: jest.fn() },
    CareTimeline: { create: jest.fn() },
  };
  return {
    __stubs: stubs,
    model: jest.fn(name => stubs[name] || {}),
  };
});

// ── ScoringEngine stub (path resolves to the service's `./ScoringEngine`) ──
jest.mock('../domains/goals/services/ScoringEngine', () => ({
  scoringEngine: {
    scoreApplication: jest.fn(() => ({
      domainScores: [],
      totalRawScore: 14,
      totalStandardScore: 90,
      compositeScore: 90,
      overallInterpretation: 'moderate',
      overallInterpretation_ar: 'متوسط',
      overallSeverity: 'moderate',
      matchedRule: null,
      isAutoScored: true,
    })),
    computeComparison: jest.fn(() => ({ trend: 'stable' })),
    calculateNextApplicationDate: jest.fn(() => ({ nextDate: null })),
  },
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mongoose = require('mongoose');
const { measuresLibraryService } = require('../domains/goals/services/MeasuresLibraryService');

const BENE = '64b000000000000000000001';
const EPISODE = '64b000000000000000000099';

beforeEach(() => {
  jest.clearAllMocks();
  mongoose.__stubs.Measure.findById.mockResolvedValue({
    _id: '64b0000000000000000000aa',
    name: 'Growth Scale',
    name_ar: 'مقياس النمو',
    code: 'GRW',
  });
  mongoose.__stubs.MeasureApplication.getMeasureHistory.mockResolvedValue([]);
  mongoose.__stubs.MeasureApplication.create.mockResolvedValue({ _id: '64b0000000000000000000bb' });
  mongoose.__stubs.CareTimeline.create.mockResolvedValue({});
});

async function applyOnce(overrides = {}) {
  return measuresLibraryService.applyMeasure({
    beneficiaryId: BENE,
    episodeId: EPISODE,
    measureId: '64b0000000000000000000aa',
    domainScores: [{ domainCode: 'd1', rawScore: 14 }],
    purpose: 'baseline',
    assessorId: '64b00000000000000000000f',
    setting: 'clinic',
    ...overrides,
  });
}

describe('W975 — measure application → CareTimeline measure_applied', () => {
  test('records a CareTimeline event with eventType "measure_applied"', async () => {
    await applyOnce();
    expect(mongoose.__stubs.CareTimeline.create).toHaveBeenCalledTimes(1);
    const payload = mongoose.__stubs.CareTimeline.create.mock.calls[0][0];
    expect(payload.eventType).toBe('measure_applied');
  });

  test('does NOT record the timeline event as assessment_completed', async () => {
    await applyOnce();
    const payload = mongoose.__stubs.CareTimeline.create.mock.calls[0][0];
    expect(payload.eventType).not.toBe('assessment_completed');
  });

  test('links the timeline event to the beneficiary and the episode', async () => {
    await applyOnce();
    const payload = mongoose.__stubs.CareTimeline.create.mock.calls[0][0];
    expect(String(payload.beneficiaryId)).toBe(BENE);
    expect(String(payload.episodeId)).toBe(EPISODE);
  });

  test('carries measure linkage + score in metadata', async () => {
    await applyOnce();
    const payload = mongoose.__stubs.CareTimeline.create.mock.calls[0][0];
    expect(payload.metadata).toMatchObject({
      measureCode: 'GRW',
      score: 14,
      applicationNumber: 1,
    });
    expect(payload.metadata.applicationId).toBeDefined();
  });

  test('files the event under the clinical category with an Arabic title', async () => {
    await applyOnce();
    const payload = mongoose.__stubs.CareTimeline.create.mock.calls[0][0];
    expect(payload.category).toBe('clinical');
    expect(payload.title).toContain('تطبيق مقياس');
  });

  test('source uses the canonical enum value (static drift guard)', () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, '../domains/goals/services/MeasuresLibraryService.js'),
      'utf8'
    );
    expect(src).toMatch(/eventType:\s*'measure_applied'/);
    // the old, conflated label must not reappear in the measure-apply path
    expect(src).not.toMatch(/eventType:\s*'assessment_completed'/);
  });
});
