/**
 * stagnantGoalScheduler — pure-core tests with injected mock models.
 * No DB, no cron — just the verdict logic.
 */
'use strict';

const createScheduler = require('../../services/stagnantGoalScheduler');

function chain(value) {
  return {
    sort: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(value),
  };
}

function makeDeps({ plans = [], lastProgressByGoal = {}, createImpl } = {}) {
  const RedFlagState = {
    create: jest.fn(createImpl || (async () => ({ _id: 'rf-' + Math.random() }))),
  };
  const CarePlan = {
    find: jest.fn(() => ({ lean: jest.fn().mockResolvedValue(plans) })),
  };
  const GoalProgressEntry = {
    findOne: jest.fn(query => chain(lastProgressByGoal[query.goalId] ?? null)),
  };
  return { CarePlan, GoalProgressEntry, RedFlagState };
}

const oneDayMs = 24 * 3600 * 1000;
const NOW = new Date('2026-05-03T12:00:00Z');

describe('stagnantGoalScheduler.runOnce', () => {
  test('flags a goal with no progress entries', async () => {
    const plans = [
      {
        _id: 'cp-1',
        beneficiary: 'b-1',
        therapeutic: {
          domains: { speech: { goals: [{ _id: 'g-1', status: 'IN_PROGRESS', title: 'نطق /ر/' }] } },
        },
      },
    ];
    const deps = makeDeps({ plans });
    const sched = createScheduler(deps);
    const summary = await sched.runOnce({ now: NOW });

    expect(summary).toMatchObject({
      scanned: 1,
      stagnant: 1,
      flagged: 1,
      alreadyActive: 0,
      errors: 0,
    });
    expect(deps.RedFlagState.create).toHaveBeenCalledTimes(1);
    const arg = deps.RedFlagState.create.mock.calls[0][0];
    expect(arg.beneficiaryId).toBe('b-1');
    expect(arg.flagId).toBe('auto:GOAL_STAGNANT');
    expect(arg.observedValue.detectedBy).toBe('scheduler');
  });

  test('does not flag a goal with recent progress', async () => {
    const plans = [
      {
        _id: 'cp-1',
        beneficiary: 'b-1',
        therapeutic: {
          domains: { speech: { goals: [{ _id: 'g-1', status: 'IN_PROGRESS', title: '...' }] } },
        },
      },
    ];
    const recent = new Date(NOW.getTime() - 10 * oneDayMs);
    const deps = makeDeps({ plans, lastProgressByGoal: { 'g-1': { recordedAt: recent } } });
    const sched = createScheduler(deps);
    const summary = await sched.runOnce({ now: NOW });

    expect(summary).toMatchObject({ scanned: 1, stagnant: 0, flagged: 0 });
    expect(deps.RedFlagState.create).not.toHaveBeenCalled();
  });

  test('flags a goal whose last progress is older than 28 days', async () => {
    const plans = [
      {
        _id: 'cp-1',
        beneficiary: 'b-2',
        lifeSkills: { domains: { social: { goals: [{ _id: 'g-2', status: 'IN_PROGRESS' }] } } },
      },
    ];
    const old = new Date(NOW.getTime() - 40 * oneDayMs);
    const deps = makeDeps({ plans, lastProgressByGoal: { 'g-2': { recordedAt: old } } });
    const sched = createScheduler(deps);
    const summary = await sched.runOnce({ now: NOW });

    expect(summary.flagged).toBe(1);
    expect(deps.RedFlagState.create.mock.calls[0][0].observedValue.lastProgressAt).toBe(
      old.toISOString()
    );
  });

  test('counts duplicate-key (already-active) raises separately and does not throw', async () => {
    const plans = [
      {
        _id: 'cp-1',
        beneficiary: 'b-3',
        therapeutic: {
          domains: { occupational: { goals: [{ _id: 'g-3', status: 'IN_PROGRESS' }] } },
        },
      },
    ];
    const deps = makeDeps({
      plans,
      createImpl: async () => {
        const e = new Error('dup');
        e.code = 11000;
        throw e;
      },
    });
    const sched = createScheduler(deps);
    const summary = await sched.runOnce({ now: NOW });
    expect(summary).toMatchObject({ stagnant: 1, flagged: 0, alreadyActive: 1, errors: 0 });
  });

  test('skips non-IN_PROGRESS goals (achieved, discontinued, etc.)', async () => {
    const plans = [
      {
        _id: 'cp-1',
        beneficiary: 'b-4',
        therapeutic: {
          domains: {
            speech: {
              goals: [
                { _id: 'g-a', status: 'ACHIEVED' },
                { _id: 'g-d', status: 'DISCONTINUED' },
                { _id: 'g-i', status: 'IN_PROGRESS' },
              ],
            },
          },
        },
      },
    ];
    const deps = makeDeps({ plans });
    const sched = createScheduler(deps);
    const summary = await sched.runOnce({ now: NOW });
    expect(summary.scanned).toBe(1);
    expect(summary.flagged).toBe(1);
  });
});

describe('factory validation', () => {
  test('throws when CarePlan is missing', () => {
    expect(() =>
      createScheduler({
        GoalProgressEntry: { findOne: () => ({}) },
        RedFlagState: { create: () => ({}) },
      })
    ).toThrow('CarePlan model is required');
  });
  test('throws when GoalProgressEntry is missing', () => {
    expect(() =>
      createScheduler({ CarePlan: { find: () => ({}) }, RedFlagState: { create: () => ({}) } })
    ).toThrow('GoalProgressEntry model is required');
  });
  test('throws when RedFlagState is missing', () => {
    expect(() =>
      createScheduler({
        CarePlan: { find: () => ({}) },
        GoalProgressEntry: { findOne: () => ({}) },
      })
    ).toThrow('RedFlagState model is required');
  });
});
