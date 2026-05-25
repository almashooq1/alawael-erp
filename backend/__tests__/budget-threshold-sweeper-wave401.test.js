'use strict';

/**
 * W401 — unit tests for the budget-threshold sweeper.
 *
 * Verifies the producer's behaviour without booting Mongo:
 *   - emits one publish per active budget at/over threshold
 *   - uses utilizationPercentage when present, else computes from spent/total
 *   - envelope matches SYSTEM_EVENTS.BUDGET_THRESHOLD_REACHED shape
 *   - graceful when deps missing
 *
 * Pairs with the W382 ratchet (KNOWN_DEAD_CONTRACTS:
 * `finance.BUDGET_THRESHOLD_REACHED` removed) + W392 ratchet
 * (`finance.budget.threshold_reached` no longer in
 * KNOWN_LIVE_ORPHAN_SUBSCRIBERS).
 */

const {
  sweepBudgetThresholds,
  computePercentage,
  DEFAULT_THRESHOLD_PERCENT,
} = require('../services/finance/budgetThresholdSweeper');

function mockBudgetModel(docs) {
  return {
    find: jest.fn().mockReturnValue({
      lean: () => Promise.resolve(docs),
    }),
  };
}

function mockBus() {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

describe('W401 budget-threshold sweeper', () => {
  it('exposes default threshold = 80', () => {
    expect(DEFAULT_THRESHOLD_PERCENT).toBe(80);
  });

  it('computePercentage handles zero/negative totals safely', () => {
    expect(computePercentage(50, 0)).toBe(0);
    expect(computePercentage(50, -10)).toBe(0);
    expect(computePercentage(50, 200)).toBe(25);
    expect(computePercentage(80, 100)).toBe(80);
  });

  it('returns { reason: missing_deps } when BudgetModel or bus is missing', async () => {
    const r1 = await sweepBudgetThresholds({});
    expect(r1).toEqual({ scanned: 0, emitted: 0, errors: 0, reason: 'missing_deps' });
    const r2 = await sweepBudgetThresholds({ BudgetModel: mockBudgetModel([]) });
    expect(r2.reason).toBe('missing_deps');
  });

  it('emits one publish per over-threshold budget', async () => {
    const budgets = [
      {
        _id: 'b1',
        department: 'd1',
        totalSpent: 90,
        totalBudgeted: 100,
        utilizationPercentage: 90,
      },
      {
        _id: 'b2',
        department: 'd2',
        totalSpent: 50,
        totalBudgeted: 100,
        utilizationPercentage: 50,
      },
      {
        _id: 'b3',
        department: 'd3',
        totalSpent: 80,
        totalBudgeted: 100,
        utilizationPercentage: 80,
      },
    ];
    const bus = mockBus();
    const res = await sweepBudgetThresholds({
      BudgetModel: mockBudgetModel(budgets),
      integrationBus: bus,
    });
    expect(res.scanned).toBe(3);
    expect(res.emitted).toBe(2);
    expect(bus.publish).toHaveBeenCalledTimes(2);
  });

  it('publishes the canonical envelope shape', async () => {
    const budgets = [
      {
        _id: 'b1',
        department: 'd1',
        totalSpent: 90,
        totalBudgeted: 100,
        utilizationPercentage: 90,
      },
    ];
    const bus = mockBus();
    await sweepBudgetThresholds({ BudgetModel: mockBudgetModel(budgets), integrationBus: bus });
    expect(bus.publish).toHaveBeenCalledWith(
      'finance',
      'budget.threshold_reached',
      expect.objectContaining({
        departmentId: 'd1',
        budgetId: 'b1',
        currentSpend: 90,
        budgetLimit: 100,
        percentage: 90,
      })
    );
  });

  it('falls back to computed percentage when utilizationPercentage is missing/zero', async () => {
    const budgets = [{ _id: 'b1', department: 'd1', totalSpent: 90, totalBudgeted: 100 }];
    const bus = mockBus();
    await sweepBudgetThresholds({ BudgetModel: mockBudgetModel(budgets), integrationBus: bus });
    expect(bus.publish).toHaveBeenCalledWith(
      'finance',
      'budget.threshold_reached',
      expect.objectContaining({ percentage: 90 })
    );
  });

  it('respects custom thresholdPercent', async () => {
    const budgets = [
      {
        _id: 'b1',
        department: 'd1',
        totalSpent: 70,
        totalBudgeted: 100,
        utilizationPercentage: 70,
      },
      {
        _id: 'b2',
        department: 'd2',
        totalSpent: 75,
        totalBudgeted: 100,
        utilizationPercentage: 75,
      },
    ];
    const bus = mockBus();
    const res = await sweepBudgetThresholds({
      BudgetModel: mockBudgetModel(budgets),
      integrationBus: bus,
      thresholdPercent: 75,
    });
    expect(res.emitted).toBe(1);
  });

  it('counts publish failures as errors without aborting the sweep', async () => {
    const budgets = [
      {
        _id: 'b1',
        department: 'd1',
        totalSpent: 90,
        totalBudgeted: 100,
        utilizationPercentage: 90,
      },
      {
        _id: 'b2',
        department: 'd2',
        totalSpent: 95,
        totalBudgeted: 100,
        utilizationPercentage: 95,
      },
    ];
    const bus = {
      publish: jest
        .fn()
        .mockRejectedValueOnce(new Error('bus down'))
        .mockResolvedValueOnce(undefined),
    };
    const res = await sweepBudgetThresholds({
      BudgetModel: mockBudgetModel(budgets),
      integrationBus: bus,
    });
    expect(res.scanned).toBe(2);
    expect(res.emitted).toBe(1);
    expect(res.errors).toBe(1);
  });
});
