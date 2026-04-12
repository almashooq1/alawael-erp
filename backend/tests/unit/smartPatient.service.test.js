/**
 * Unit Tests — SmartPatientService
 * P#71 - Batch 32
 *
 * Static class. Depends on 6 Mongoose models + SmartHomeCareService.
 * Covers: getUnifiedFile, updateGoalProgress, getGoalTrend
 */

'use strict';

/* --- Mongoose is globally mocked via jest.setup.js --- */

const mockBeneficiaryFindById = jest.fn();
const mockPlanFindOne = jest.fn();
const mockAssessmentFind = jest.fn();
const mockSessionFind = jest.fn();
const mockSessionCountDocuments = jest.fn();
const mockWalletFindOne = jest.fn();
const mockPlanFindById = jest.fn();
const mockGoalHistoryCreate = jest.fn();
const mockGoalHistoryFind = jest.fn();
const mockGetAdherenceReport = jest.fn();

jest.mock('../../models/Beneficiary', () => ({
  findById: (...a) => mockBeneficiaryFindById(...a),
}));

jest.mock('../../models/TherapeuticPlan', () => ({
  findOne: (...a) => mockPlanFindOne(...a),
  findById: (...a) => mockPlanFindById(...a),
}));

jest.mock('../../models/TherapySession', () => ({
  find: (...a) => mockSessionFind(...a),
  countDocuments: (...a) => mockSessionCountDocuments(...a),
}));

jest.mock('../../models/StandardizedAssessment', () => ({
  find: (...a) => mockAssessmentFind(...a),
}));

jest.mock('../../models/GoalProgressHistory', () => ({
  create: (...a) => mockGoalHistoryCreate(...a),
  find: (...a) => mockGoalHistoryFind(...a),
}));

jest.mock('../../models/Gamification', () => ({
  BeneficiaryWallet: {
    findOne: (...a) => mockWalletFindOne(...a),
  },
}));

jest.mock('../../services/smartHomeCare.service', () => ({
  getAdherenceReport: (...a) => mockGetAdherenceReport(...a),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartPatientService = require('../../services/smartPatient.service');

describe('SmartPatientService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ================================================================ */
  /*  getUnifiedFile                                                    */
  /* ================================================================ */
  describe('getUnifiedFile', () => {
    const setupHappyPath = () => {
      // Beneficiary
      mockBeneficiaryFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'BEN-1',
            firstName: 'Ahmad',
            medicalRecord: { diagnosis: 'AUTISM' },
          }),
        }),
      });
      // Active plan
      mockPlanFindOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: 'PLAN-1',
          initialAssessment: 'ASD Level 2',
          assignedTherapists: [{ firstName: 'Dr', lastName: 'Ali', position: 'OT' }],
          goals: [{ description: 'Improve grip' }],
        }),
      });
      // Assessments
      mockAssessmentFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([{ _id: 'ASS-1', date: new Date() }]),
        }),
      });
      // Upcoming sessions
      mockSessionFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest
              .fn()
              .mockResolvedValue([
                {
                  _id: 'SESS-1',
                  date: new Date(),
                  therapist: { firstName: 'Dr', lastName: 'Ali' },
                },
              ]),
          }),
        }),
      });
      // Completed session count
      mockSessionCountDocuments.mockResolvedValue(15);
      // Adherence
      mockGetAdherenceReport.mockResolvedValue({ score: 80, level: 'GOOD', activeAssignments: 2 });
      // Wallet
      mockWalletFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ currentLevel: 3, totalPoints: 250 }),
      });
    };

    it('returns unified file with all sections', async () => {
      setupHappyPath();
      const res = await SmartPatientService.getUnifiedFile('BEN-1');
      expect(res).toHaveProperty('profile');
      expect(res).toHaveProperty('clinical');
      expect(res).toHaveProperty('history');
      expect(res).toHaveProperty('schedule');
      expect(res).toHaveProperty('engagement');
    });

    it('profile contains patient data', async () => {
      setupHappyPath();
      const res = await SmartPatientService.getUnifiedFile('BEN-1');
      expect(res.profile.firstName).toBe('Ahmad');
    });

    it('clinical contains diagnosis and team', async () => {
      setupHappyPath();
      const res = await SmartPatientService.getUnifiedFile('BEN-1');
      expect(res.clinical.activePlanId).toBe('PLAN-1');
      expect(res.clinical.diagnosis).toBe('ASD Level 2');
      expect(res.clinical.team).toHaveLength(1);
    });

    it('history contains assessments and session count', async () => {
      setupHappyPath();
      const res = await SmartPatientService.getUnifiedFile('BEN-1');
      expect(res.history.assessments).toHaveLength(1);
      expect(res.history.totalSessionsCompleted).toBe(15);
    });

    it('schedule contains upcoming sessions', async () => {
      setupHappyPath();
      const res = await SmartPatientService.getUnifiedFile('BEN-1');
      expect(res.schedule).toHaveLength(1);
    });

    it('engagement contains adherence + gamification level', async () => {
      setupHappyPath();
      const res = await SmartPatientService.getUnifiedFile('BEN-1');
      expect(res.engagement.homeAdherence.score).toBe(80);
      expect(res.engagement.gamification.level).toBe(3);
      expect(res.engagement.gamification.points).toBe(250);
    });

    it('throws when patient not found', async () => {
      mockBeneficiaryFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      await expect(SmartPatientService.getUnifiedFile('UNKNOWN')).rejects.toThrow(
        'Patient not found'
      );
    });

    it('uses fallback diagnosis from medicalRecord when no plan', async () => {
      mockBeneficiaryFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({
            _id: 'BEN-2',
            medicalRecord: { diagnosis: 'CP' },
          }),
        }),
      });
      mockPlanFindOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      mockAssessmentFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      mockSessionFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockSessionCountDocuments.mockResolvedValue(0);
      mockGetAdherenceReport.mockResolvedValue({ score: 0, level: 'NO_ASSIGNMENTS' });
      mockWalletFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await SmartPatientService.getUnifiedFile('BEN-2');
      expect(res.clinical.diagnosis).toBe('CP');
      expect(res.clinical.team).toEqual([]);
      expect(res.clinical.goals).toEqual([]);
    });

    it('defaults gamification to level 1, 0 points when no wallet', async () => {
      mockBeneficiaryFindById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue({ _id: 'BEN-3' }),
        }),
      });
      mockPlanFindOne.mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      });
      mockAssessmentFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) }),
      });
      mockSessionFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue([]) }),
        }),
      });
      mockSessionCountDocuments.mockResolvedValue(0);
      mockGetAdherenceReport.mockResolvedValue({ score: 0, level: 'NO_ASSIGNMENTS' });
      mockWalletFindOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const res = await SmartPatientService.getUnifiedFile('BEN-3');
      expect(res.engagement.gamification.level).toBe(1);
      expect(res.engagement.gamification.points).toBe(0);
    });
  });

  /* ================================================================ */
  /*  updateGoalProgress                                                */
  /* ================================================================ */
  describe('updateGoalProgress', () => {
    const makeGoal = (progress = 0, status = 'NOT_STARTED') => ({
      _id: 'GOAL-1',
      progress,
      status,
      description: 'Improve grip',
    });

    const makePlan = goal => ({
      _id: 'PLAN-1',
      goals: {
        id: jest.fn().mockReturnValue(goal),
      },
      save: jest.fn().mockResolvedValue(true),
    });

    it('updates goal progress percentage', async () => {
      const goal = makeGoal();
      const plan = makePlan(goal);
      mockPlanFindById.mockResolvedValue(plan);
      mockGoalHistoryCreate.mockResolvedValue({});

      const res = await SmartPatientService.updateGoalProgress(
        'PLAN-1',
        'GOAL-1',
        50,
        'Good progress',
        'USER-1',
        'SESS-1'
      );
      expect(res.progress).toBe(50);
    });

    it('sets status ACHIEVED when progress >= 100', async () => {
      const goal = makeGoal();
      const plan = makePlan(goal);
      mockPlanFindById.mockResolvedValue(plan);
      mockGoalHistoryCreate.mockResolvedValue({});

      const res = await SmartPatientService.updateGoalProgress(
        'PLAN-1',
        'GOAL-1',
        100,
        'Done!',
        'USER-1',
        'SESS-1'
      );
      expect(res.status).toBe('ACHIEVED');
    });

    it('sets status IN_PROGRESS when progress > 0 and < 100', async () => {
      const goal = makeGoal();
      const plan = makePlan(goal);
      mockPlanFindById.mockResolvedValue(plan);
      mockGoalHistoryCreate.mockResolvedValue({});

      const res = await SmartPatientService.updateGoalProgress(
        'PLAN-1',
        'GOAL-1',
        30,
        'Making progress',
        'USER-1',
        'SESS-1'
      );
      expect(res.status).toBe('IN_PROGRESS');
    });

    it('saves the plan', async () => {
      const goal = makeGoal();
      const plan = makePlan(goal);
      mockPlanFindById.mockResolvedValue(plan);
      mockGoalHistoryCreate.mockResolvedValue({});

      await SmartPatientService.updateGoalProgress(
        'PLAN-1',
        'GOAL-1',
        50,
        'Note',
        'USER-1',
        'SESS-1'
      );
      expect(plan.save).toHaveBeenCalledTimes(1);
    });

    it('creates GoalProgressHistory record', async () => {
      const goal = makeGoal();
      const plan = makePlan(goal);
      mockPlanFindById.mockResolvedValue(plan);
      mockGoalHistoryCreate.mockResolvedValue({});

      await SmartPatientService.updateGoalProgress(
        'PLAN-1',
        'GOAL-1',
        75,
        'Good',
        'USER-1',
        'SESS-1'
      );
      expect(mockGoalHistoryCreate).toHaveBeenCalledWith({
        planId: 'PLAN-1',
        goalId: 'GOAL-1',
        percentage: 75,
        note: 'Good',
        recordedBy: 'USER-1',
        sessionRef: 'SESS-1',
      });
    });

    it('throws when plan not found', async () => {
      mockPlanFindById.mockResolvedValue(null);
      await expect(
        SmartPatientService.updateGoalProgress('UNKNOWN', 'GOAL-1', 50, 'N', 'U', 'S')
      ).rejects.toThrow('Plan not found');
    });

    it('throws when goal not found in plan', async () => {
      const plan = {
        _id: 'PLAN-1',
        goals: { id: jest.fn().mockReturnValue(null) },
        save: jest.fn(),
      };
      mockPlanFindById.mockResolvedValue(plan);
      await expect(
        SmartPatientService.updateGoalProgress('PLAN-1', 'BAD', 50, 'N', 'U', 'S')
      ).rejects.toThrow('Goal not found in plan');
    });
  });

  /* ================================================================ */
  /*  getGoalTrend                                                      */
  /* ================================================================ */
  describe('getGoalTrend', () => {
    it('queries GoalProgressHistory sorted by recordedDate', async () => {
      mockGoalHistoryFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([
            { percentage: 20, recordedDate: '2025-01-01' },
            { percentage: 50, recordedDate: '2025-02-01' },
          ]),
        }),
      });

      const res = await SmartPatientService.getGoalTrend('GOAL-1');
      expect(res).toHaveLength(2);
      expect(res[0].percentage).toBe(20);
    });

    it('returns empty array when no history', async () => {
      mockGoalHistoryFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await SmartPatientService.getGoalTrend('GOAL-X');
      expect(res).toEqual([]);
    });
  });
});
