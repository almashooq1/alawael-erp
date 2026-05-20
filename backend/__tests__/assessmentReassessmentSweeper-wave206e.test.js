'use strict';

/**
 * Wave 206e — reassessment sweeper tests.
 *
 * Pure unit tests against the factory contract. Models mocked.
 */

const createSweeper = require('../services/assessmentReassessmentSweeper.service');

function makeSmartGoalMock(goals = []) {
  return {
    find: jest.fn().mockImplementation(() => ({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(goals),
    })),
  };
}

function makeBundleMock(latestByBene = []) {
  return {
    aggregate: jest.fn().mockResolvedValue(latestByBene),
  };
}

const NOW = new Date('2026-06-01T10:00:00Z');

describe('Wave 206e — assessmentReassessmentSweeper', () => {
  test('factory rejects missing SmartGoal model', () => {
    expect(() => createSweeper({ AssessmentRecommendationBundle: makeBundleMock() })).toThrow(
      /SmartGoal model is required/
    );
  });

  test('factory rejects missing bundle model', () => {
    expect(() => createSweeper({ SmartGoal: makeSmartGoalMock() })).toThrow(/bundle/i);
  });

  test('listOverdueGoals returns mapped overdue items', async () => {
    const goalsFromDb = [
      {
        _id: 'g1',
        beneficiary: 'b1',
        therapist: 't1',
        title: 'هدف منتهي',
        timeBoundDate: new Date('2026-05-01T00:00:00Z'),
        overallProgress: 30,
        branch: null,
      },
    ];
    const sweeper = createSweeper({
      SmartGoal: makeSmartGoalMock(goalsFromDb),
      AssessmentRecommendationBundle: makeBundleMock(),
    });
    const overdue = await sweeper.listOverdueGoals({ now: NOW });
    expect(overdue).toHaveLength(1);
    expect(overdue[0].kind).toBe('GOAL_OVERDUE_REASSESS');
    expect(overdue[0].goalId).toBe('g1');
    expect(overdue[0].daysOverdue).toBeGreaterThan(20);
  });

  test('listBundleReviewsDue returns stale bundles', async () => {
    const stale = [
      {
        _id: 'b1',
        lastBundleAt: new Date('2026-01-01T00:00:00Z'),
        lastBundleId: 'bundle1',
        lastEngineVersion: 'w206.1',
        totalBundles: 3,
      },
    ];
    const sweeper = createSweeper({
      SmartGoal: makeSmartGoalMock(),
      AssessmentRecommendationBundle: makeBundleMock(stale),
    });
    const due = await sweeper.listBundleReviewsDue({ now: NOW });
    expect(due).toHaveLength(1);
    expect(due[0].kind).toBe('BUNDLE_REVIEW_DUE');
    expect(due[0].daysSinceLastBundle).toBeGreaterThan(120);
  });

  test('runOnce groups findings by beneficiary', async () => {
    const goals = [
      {
        _id: 'g1',
        beneficiary: 'b1',
        therapist: null,
        title: 'A',
        timeBoundDate: new Date('2026-05-15T00:00:00Z'),
        overallProgress: 50,
        branch: null,
      },
      {
        _id: 'g2',
        beneficiary: 'b1',
        therapist: null,
        title: 'B',
        timeBoundDate: new Date('2026-05-10T00:00:00Z'),
        overallProgress: 70,
        branch: null,
      },
      {
        _id: 'g3',
        beneficiary: 'b2',
        therapist: null,
        title: 'C',
        timeBoundDate: new Date('2026-05-20T00:00:00Z'),
        overallProgress: 0,
        branch: null,
      },
    ];
    const stale = [
      {
        _id: 'b2',
        lastBundleAt: new Date('2026-01-01T00:00:00Z'),
        lastBundleId: 'bundle_b2',
        lastEngineVersion: 'w206.1',
        totalBundles: 1,
      },
    ];
    const sweeper = createSweeper({
      SmartGoal: makeSmartGoalMock(goals),
      AssessmentRecommendationBundle: makeBundleMock(stale),
    });
    const result = await sweeper.runOnce({ now: NOW });
    expect(result.summary.overdueGoalsTotal).toBe(3);
    expect(result.summary.bundleReviewsDue).toBe(1);
    expect(result.summary.beneficiariesAffected).toBe(2);
    // b1 sorts ahead (2 overdue goals > 1)
    expect(result.findingsByBeneficiary[0].beneficiaryId).toBe('b1');
    expect(result.findingsByBeneficiary[0].overdueGoalCount).toBe(2);
    expect(result.findingsByBeneficiary[0].bundleReviewDue).toBe(false);
    expect(result.findingsByBeneficiary[1].beneficiaryId).toBe('b2');
    expect(result.findingsByBeneficiary[1].overdueGoalCount).toBe(1);
    expect(result.findingsByBeneficiary[1].bundleReviewDue).toBe(true);
  });

  test('notifier is invoked when notify=true and findings exist', async () => {
    const sweeper = createSweeper({
      SmartGoal: makeSmartGoalMock([]),
      AssessmentRecommendationBundle: makeBundleMock([]),
      notifier: jest.fn().mockResolvedValue(undefined),
    });
    const result = await sweeper.runOnce({ now: NOW, notify: true });
    expect(result.summary.beneficiariesAffected).toBe(0);
  });

  test('notifier failure does NOT throw the sweep', async () => {
    const notifier = jest.fn().mockRejectedValue(new Error('webhook down'));
    const sweeper = createSweeper({
      SmartGoal: makeSmartGoalMock([
        {
          _id: 'g1',
          beneficiary: 'b1',
          therapist: null,
          title: 'A',
          timeBoundDate: new Date('2026-05-01T00:00:00Z'),
          overallProgress: 10,
          branch: null,
        },
      ]),
      AssessmentRecommendationBundle: makeBundleMock(),
      notifier,
    });
    await expect(sweeper.runOnce({ now: NOW, notify: true })).resolves.toBeTruthy();
    expect(notifier).toHaveBeenCalledTimes(1);
  });

  test('start requires a cron impl', () => {
    const sweeper = createSweeper({
      SmartGoal: makeSmartGoalMock(),
      AssessmentRecommendationBundle: makeBundleMock(),
    });
    expect(() => sweeper.start({})).toThrow(/node-cron/);
  });

  test('start accepts a cron and returns a stop handle', () => {
    const cron = { schedule: jest.fn().mockReturnValue({ stop: jest.fn() }) };
    const sweeper = createSweeper({
      SmartGoal: makeSmartGoalMock(),
      AssessmentRecommendationBundle: makeBundleMock(),
    });
    const handle = sweeper.start({ cron });
    expect(cron.schedule).toHaveBeenCalledTimes(1);
    expect(typeof handle.stop).toBe('function');
  });
});
