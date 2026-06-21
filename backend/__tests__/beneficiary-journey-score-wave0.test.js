/**
 * beneficiary-journey-score-wave0.test.js
 *
 * W0-LifecycleAlign: tests for the BeneficiaryJourneyScore computation and
 * persistence service.
 */

'use strict';

const mongoose = require('mongoose');
const {
  computeScoreFromSignals,
  computeAndSaveJourneyScore,
  previewJourneyScore,
  RECOMMENDATIONS,
} = require('../services/beneficiaryJourneyScore.service');

describe('BeneficiaryJourneyScore — computation', () => {
  test('high progress + achieved goals recommends discharge', () => {
    const res = computeScoreFromSignals({
      progress: 90,
      sessionsCount: 40,
      openGoalsCount: 1,
      achievedGoalsCount: 9,
      daysSinceLastAssessment: 15,
      riskFlagsCount: 0,
      icfScore: 85,
      gasTScore: 90,
    });

    expect(res.score).toBeGreaterThanOrEqual(85);
    expect(res.recommendation).toBe(RECOMMENDATIONS.DISCHARGE);
    expect(res.confidence).toBe(1);
  });

  test('risk flags recommend intensive support', () => {
    const res = computeScoreFromSignals({
      progress: 70,
      sessionsCount: 20,
      riskFlagsCount: 2,
    });

    expect(res.recommendation).toBe(RECOMMENDATIONS.INTENSIVE_SUPPORT);
  });

  test('low score after many sessions recommends review', () => {
    const res = computeScoreFromSignals({
      progress: 20,
      sessionsCount: 20,
      openGoalsCount: 5,
      achievedGoalsCount: 0,
    });

    expect(res.recommendation).toBe(RECOMMENDATIONS.REVIEW);
  });

  test('score is clamped between 0 and 100', () => {
    // progress alone contributes up to 40 points.
    expect(computeScoreFromSignals({ progress: 999 }).score).toBe(40);
    expect(computeScoreFromSignals({ progress: -50 }).score).toBe(0);
    // with all positive signals maxed out, score caps near the theoretical max.
    expect(
      computeScoreFromSignals({
        progress: 100,
        sessionsCount: 100,
        openGoalsCount: 0,
        achievedGoalsCount: 10,
        daysSinceLastAssessment: 10,
        icfScore: 100,
        gasTScore: 100,
      }).score
    ).toBe(95);
  });
});

describe('BeneficiaryJourneyScore — persistence', () => {
  function makeBeneficiaryModel(doc) {
    const chain = {
      lean: jest.fn().mockResolvedValue(doc),
    };
    return {
      findById: jest.fn().mockReturnValue(chain),
    };
  }

  function makeJourneyScoreModel() {
    return {
      findOneAndUpdate: jest.fn(async (_filter, update) => ({
        ...update,
        _id: new mongoose.Types.ObjectId(),
      })),
    };
  }

  test('computeAndSaveJourneyScore upserts a score doc', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const beneficiary = {
      _id: beneficiaryId,
      branchId: new mongoose.Types.ObjectId(),
      progress: 80,
      sessions: 30,
      riskFlags: [],
    };

    const doc = await computeAndSaveJourneyScore({
      beneficiaryId,
      deps: {
        beneficiaryModel: makeBeneficiaryModel(beneficiary),
        journeyScoreModel: makeJourneyScoreModel(),
      },
      computedBy: 'test',
    });

    expect(doc.score).toBeGreaterThan(0);
    expect(doc.computedBy).toBe('test');
    expect(doc.signals.progress).toBe(80);
  });

  test('previewJourneyScore returns score without persisting', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const beneficiary = {
      _id: beneficiaryId,
      progress: 60,
      sessions: 10,
      riskFlags: [],
    };

    const res = await previewJourneyScore({
      beneficiaryId,
      deps: { beneficiaryModel: makeBeneficiaryModel(beneficiary) },
    });

    expect(res.score).toBeGreaterThan(0);
  });

  test('computeAndSaveJourneyScore enriches signals from optional clinical models', async () => {
    const beneficiaryId = new mongoose.Types.ObjectId();
    const branchId = new mongoose.Types.ObjectId();
    const now = new Date('2026-06-01T00:00:00.000Z');

    const beneficiary = {
      _id: beneficiaryId,
      branchId,
      progress: 80,
      sessions: 30,
      riskFlags: [],
    };

    const beneficiaryModel = {
      findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(beneficiary) }),
    };

    const journeyScoreModel = {
      findOneAndUpdate: jest.fn(async (_filter, update) => ({
        ...update,
        _id: new mongoose.Types.ObjectId(),
      })),
    };

    const clinicalAssessment = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest
              .fn()
              .mockResolvedValue({ assessmentDate: new Date('2026-05-28T00:00:00.000Z') }),
          }),
        }),
      }),
    };

    const therapeuticGoal = {
      countDocuments: jest.fn(async query => {
        if (query.status === 'achieved') return 3;
        return 2;
      }),
    };

    const icfAssessment = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest
              .fn()
              .mockResolvedValue({
                overallFunctioningScore: 78,
                assessmentDate: new Date('2026-05-15T00:00:00.000Z'),
              }),
          }),
        }),
      }),
    };

    const gasScoreSnapshot = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest
              .fn()
              .mockResolvedValue({
                tScore: 62,
                snapshotDate: new Date('2026-05-20T00:00:00.000Z'),
              }),
          }),
        }),
      }),
    };

    const episodeOfCare = {
      findOne: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue({ completedSessions: 24, expectedTotalSessions: 30 }),
          }),
        }),
      }),
    };

    const doc = await computeAndSaveJourneyScore({
      beneficiaryId,
      deps: {
        beneficiaryModel,
        journeyScoreModel,
        clinicalAssessmentModel: clinicalAssessment,
        therapeuticGoalModel: therapeuticGoal,
        icfAssessmentModel: icfAssessment,
        gasScoreSnapshotModel: gasScoreSnapshot,
        episodeModel: episodeOfCare,
      },
      computedBy: 'test',
      now: () => now,
    });

    expect(doc.signals.daysSinceLastAssessment).toBe(4);
    expect(doc.signals.openGoalsCount).toBe(2);
    expect(doc.signals.achievedGoalsCount).toBe(3);
    expect(doc.signals.icfScore).toBe(78);
    expect(doc.signals.gasTScore).toBe(62);
    expect(doc.signals.sessionAttendanceRate).toBe(80);
    expect(doc.confidenceDimensions).toBe(5);
    expect(doc.rationaleEn).toContain('attendance 80%');
  });
});
