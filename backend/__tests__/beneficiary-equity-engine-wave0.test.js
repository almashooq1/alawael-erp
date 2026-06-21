/**
 * beneficiary-equity-engine-wave0.test.js
 *
 * W0-LifecycleAlign: tests for the Beneficiary Equity Engine disparity analyzer.
 */

'use strict';

const {
  analyzeEquity,
  runEquityAnalysis,
  DIMENSIONS,
} = require('../services/beneficiaryEquityEngine.service');

describe('BeneficiaryEquityEngine — disparity analysis', () => {
  test('detects progress disparity across categories', () => {
    const beneficiaries = [
      { category: 'physical', progress: 90, sessions: 20, status: 'active' },
      { category: 'physical', progress: 85, sessions: 18, status: 'active' },
      { category: 'mental', progress: 30, sessions: 5, status: 'active' },
      { category: 'mental', progress: 20, sessions: 4, status: 'active' },
    ];

    const results = analyzeEquity({ beneficiaries, dimensions: ['category'] });

    expect(results).toHaveLength(2);
    const mental = results.find(r => r.segment === 'mental');
    const physical = results.find(r => r.segment === 'physical');

    expect(mental.avgProgress).toBe(25);
    expect(physical.avgProgress).toBe(87.5);
    expect(mental.disparityScore).toBeGreaterThan(physical.disparityScore);
  });

  test('returns empty for single segment', () => {
    const beneficiaries = [{ category: 'physical', progress: 50, sessions: 10, status: 'active' }];
    const results = analyzeEquity({ beneficiaries, dimensions: ['category'] });
    expect(results).toHaveLength(0);
  });

  test('runEquityAnalysis queries model and analyzes', async () => {
    const docs = [
      { category: 'physical', progress: 80, sessions: 20, status: 'active', gender: 'male' },
      { category: 'mental', progress: 40, sessions: 8, status: 'active', gender: 'female' },
    ];
    const beneficiaryModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(docs),
      }),
    };

    const results = await runEquityAnalysis({ beneficiaryModel, dimensions: ['category'] });

    expect(results.length).toBeGreaterThan(0);
    expect(beneficiaryModel.find).toHaveBeenCalled();
  });

  test('filters by branchId when provided', async () => {
    const beneficiaryModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      }),
    };

    await runEquityAnalysis({ beneficiaryModel, branchId: 'branch-1' });

    expect(beneficiaryModel.find).toHaveBeenCalledWith({ branchId: 'branch-1' });
  });
});
