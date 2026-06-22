'use strict';

/**
 * W1443 — AI scheduler actual-progress regression guard.
 *
 * BUG (pre-fix): `calculateActualProgress()` queried the Goal collection by
 * `plan_id` + `deleted_at` — fields the Goal schema never declares — and then read
 * `g.progress_percentage` (wrong case; the field is `progressPercentage`). The
 * query matched ZERO documents, so the function always returned null. Downstream,
 * every progress prediction was marked `expired` without an actual value, so
 * `updateModelAccuracy()` never reached its ≥10 validated-sample threshold and the
 * AI accuracy feedback loop was silently dead.
 *
 * FIX: Goal links to a beneficiary via `participantId` (ref: Beneficiary), and the
 * prediction carries `beneficiary_id` (which may be populated upstream). Query by
 * `participantId` and average `progressPercentage`.
 */

const mongoose = require('mongoose');
const { calculateActualProgress } = require('../services/ai/aiScheduler');

describe('W1443 AI scheduler calculateActualProgress', () => {
  afterEach(() => {
    delete mongoose.models.Goal;
    jest.clearAllMocks();
  });

  function stubGoal(rows) {
    const find = jest.fn().mockResolvedValue(rows);
    mongoose.models.Goal = { find };
    return find;
  }

  test('queries Goal by participantId (not the non-existent plan_id/deleted_at) and averages progressPercentage', async () => {
    const find = stubGoal([{ progressPercentage: 40 }, { progressPercentage: 60 }]);

    const result = await calculateActualProgress({
      prediction_type: 'progress',
      beneficiary_id: 'bnf-1',
      plan_id: 'plan-should-be-ignored',
    });

    // avg(40, 60) = 50% → 0.5
    expect(result).toBeCloseTo(0.5, 4);

    expect(find).toHaveBeenCalledTimes(1);
    const filter = find.mock.calls[0][0];
    expect(filter).toHaveProperty('participantId', 'bnf-1');
    expect(filter).not.toHaveProperty('plan_id');
    expect(filter).not.toHaveProperty('deleted_at');
    expect(filter).not.toHaveProperty('progress_percentage');
  });

  test('normalizes a populated beneficiary_id to its _id', async () => {
    const find = stubGoal([{ progressPercentage: 100 }]);

    await calculateActualProgress({
      prediction_type: 'progress',
      beneficiary_id: { _id: 'bnf-42', branch_id: 'b1' }, // populated upstream
    });

    expect(find.mock.calls[0][0]).toHaveProperty('participantId', 'bnf-42');
  });

  test('returns null for non-progress predictions without touching the DB', async () => {
    const find = stubGoal([{ progressPercentage: 50 }]);
    const result = await calculateActualProgress({ prediction_type: 'risk', beneficiary_id: 'x' });
    expect(result).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  test('returns null when the beneficiary has no goals', async () => {
    stubGoal([]);
    const result = await calculateActualProgress({
      prediction_type: 'progress',
      beneficiary_id: 'bnf-none',
    });
    expect(result).toBeNull();
  });
});
