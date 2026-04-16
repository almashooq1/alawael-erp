/**
 * Unit Tests — SmartAutoPrescriptionService
 * P#70 - Batch 31
 *
 * Class export. Depends on SmartClinicalCommandService + SmartPredictiveAIService.
 * Both dependencies are mocked.
 * Covers: generateAutoPlan, _buildSchedule
 */

'use strict';

/* --- Mock dependencies before require --- */

const mockGetSnapshot = jest.fn().mockResolvedValue({
  modules: {
    cognitive: {
      todaysProgress: 85,
      currentDifficultyLevel: 5,
      flaggedDeficits: ['Short-term Memory'],
    },
    robotics: {
      activeSession: false,
      lastSafetyCheck: 'PASSED',
      calibrationStatus: 'OPTIMAL',
      complianceRate: 80,
    },
    wearable: {
      connectionStatus: 'CONNECTED',
      liveHeartRate: 75,
      liveSpO2: 98,
      stressIndex: 12,
    },
    iot: { roomTemp: 22.5, lighting: 'CALM_BLUE', noiseLevel: 'LOW' },
  },
});

const mockGenerateForecast = jest.fn().mockResolvedValue({
  patientId: 'PT-100',
  forecast: { weeksToRecovery: 8, projectedCompletionDate: '2026-06-01' },
  scenarios: [
    { name: 'Standard Protocol', outcome: '8 weeks to target level 10' },
    { name: 'Intensive + Robotics', outcome: '6 weeks to target level 10' },
  ],
});

jest.mock('../../services/smartClinicalCommand.service', () => ({
  getPatientCommandSnapshot: mockGetSnapshot,
}));

jest.mock('../../services/smartPredictiveAI.service', () => ({
  generateForecast: mockGenerateForecast,
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartAutoPrescriptionService = require('../../services/smartAutoPrescription.service');

describe('SmartAutoPrescriptionService', () => {
  let svc;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new SmartAutoPrescriptionService();
  });

  /* ------------------------------------------------------------------ */
  /*  Constructor                                                         */
  /* ------------------------------------------------------------------ */
  describe('constructor', () => {
    it('logs initialization', () => {
      const logger = require('../../utils/logger');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Auto-Prescription'));
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _buildSchedule                                                      */
  /* ------------------------------------------------------------------ */
  describe('_buildSchedule', () => {
    const snapshotWithMemory = {
      modules: {
        cognitive: { flaggedDeficits: ['Short-term Memory'] },
      },
    };

    const snapshotNoMemory = {
      modules: {
        cognitive: { flaggedDeficits: ['Attention'] },
      },
    };

    it('intensive: 5 days/week', () => {
      const sched = svc._buildSchedule(true, snapshotWithMemory);
      expect(sched.frequency).toBe('5 days/week');
    });

    it('non-intensive: 3 days/week', () => {
      const sched = svc._buildSchedule(false, snapshotNoMemory);
      expect(sched.frequency).toBe('3 days/week');
    });

    it('includes ROBOTICS in daily routine', () => {
      const sched = svc._buildSchedule(true, snapshotWithMemory);
      expect(sched.dailyRoutine[0].type).toBe('ROBOTICS');
      expect(sched.dailyRoutine[0].device).toBe('ARM_REHAB_V2');
    });

    it('includes COGNITIVE in daily routine', () => {
      const sched = svc._buildSchedule(true, snapshotWithMemory);
      const cog = sched.dailyRoutine.find(r => r.type === 'COGNITIVE');
      expect(cog).toBeDefined();
    });

    it('MEMORY priority when Short-term Memory in deficits', () => {
      const sched = svc._buildSchedule(true, snapshotWithMemory);
      const cog = sched.dailyRoutine.find(r => r.type === 'COGNITIVE');
      expect(cog.priorityDomain).toBe('MEMORY');
    });

    it('ATTENTION priority when no Short-term Memory deficit', () => {
      const sched = svc._buildSchedule(true, snapshotNoMemory);
      const cog = sched.dailyRoutine.find(r => r.type === 'COGNITIVE');
      expect(cog.priorityDomain).toBe('ATTENTION');
    });

    it('homeExercises includes Sleep Tracking and Voice Journaling', () => {
      const sched = svc._buildSchedule(false, snapshotNoMemory);
      expect(sched.homeExercises).toContain('Sleep Tracking (Wearable)');
      expect(sched.homeExercises).toContain('Voice Journaling (Assistant)');
    });

    it('intensity is ADAPTIVE for robotics', () => {
      const hi = svc._buildSchedule(true, snapshotWithMemory);
      const lo = svc._buildSchedule(false, snapshotNoMemory);
      expect(hi.dailyRoutine[0].intensity).toBe('ADAPTIVE');
      expect(lo.dailyRoutine[0].intensity).toBe('ADAPTIVE');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateAutoPlan                                                    */
  /* ------------------------------------------------------------------ */
  describe('generateAutoPlan', () => {
    it('returns plan with status DRAFT_PENDING_APPROVAL', async () => {
      const plan = await svc.generateAutoPlan('PT-100');
      expect(plan.status).toBe('DRAFT_PENDING_APPROVAL');
      expect(plan.patientId).toBe('PT-100');
    });

    it('calls getPatientCommandSnapshot', async () => {
      await svc.generateAutoPlan('PT-200');
      expect(mockGetSnapshot).toHaveBeenCalledWith('PT-200');
    });

    it('calls generateForecast with patientId and snapshot', async () => {
      await svc.generateAutoPlan('PT-300');
      expect(mockGenerateForecast).toHaveBeenCalledWith('PT-300', expect.any(Object));
    });

    it('returns generatedDate as ISO string', async () => {
      const plan = await svc.generateAutoPlan('PT-100');
      expect(plan.generatedDate).toBeDefined();
      expect(Date.parse(plan.generatedDate)).not.toBeNaN();
    });

    it('includes targetRecoveryDate from forecast', async () => {
      const plan = await svc.generateAutoPlan('PT-100');
      expect(plan.targetRecoveryDate).toBeDefined();
    });

    it('includes rationale from Intensive scenario', async () => {
      const plan = await svc.generateAutoPlan('PT-100');
      expect(plan.rationale).toContain('Intensive');
    });

    it('includes schedule with frequency and dailyRoutine', async () => {
      const plan = await svc.generateAutoPlan('PT-100');
      expect(plan.schedule.frequency).toBeDefined();
      expect(Array.isArray(plan.schedule.dailyRoutine)).toBe(true);
    });

    it('includes homeExercises in schedule', async () => {
      const plan = await svc.generateAutoPlan('PT-100');
      expect(Array.isArray(plan.schedule.homeExercises)).toBe(true);
    });
  });
});
