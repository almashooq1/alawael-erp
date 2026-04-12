/**
 * Unit Tests — SmartClinicalCommandService
 * P#69 - Batch 30
 *
 * Class export (not singleton). Pure async logic + logger.
 * Covers: getPatientCommandSnapshot, _fetchWearableStats, _fetchRoboticsStats,
 *         _fetchCognitiveStats, _fetchEnvironmentStats, _determineOverallState,
 *         _generateAlerts, _generateAIInsight
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartClinicalCommandService = require('../../services/smartClinicalCommand.service');

describe('SmartClinicalCommandService', () => {
  let svc;

  beforeEach(() => {
    svc = new SmartClinicalCommandService();
  });

  /* ------------------------------------------------------------------ */
  /*  Constructor                                                         */
  /* ------------------------------------------------------------------ */
  describe('constructor', () => {
    it('logs initialization', () => {
      const logger = require('../../utils/logger');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Clinical Command Center'));
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _fetchWearableStats                                                 */
  /* ------------------------------------------------------------------ */
  describe('_fetchWearableStats', () => {
    it('returns wearable data structure', async () => {
      const res = await svc._fetchWearableStats('PT-123');
      expect(res.connectionStatus).toBe('CONNECTED');
      expect(res.liveHeartRate).toBe(75);
      expect(res.liveSpO2).toBe(98);
      expect(res.stressIndex).toBe(12);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _fetchRoboticsStats                                                 */
  /* ------------------------------------------------------------------ */
  describe('_fetchRoboticsStats', () => {
    it('returns robotics data structure', async () => {
      const res = await svc._fetchRoboticsStats('PT-123');
      expect(res.activeSession).toBe(false);
      expect(res.lastSafetyCheck).toBe('PASSED');
      expect(res.calibrationStatus).toBe('OPTIMAL');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _fetchCognitiveStats                                                */
  /* ------------------------------------------------------------------ */
  describe('_fetchCognitiveStats', () => {
    it('returns cognitive data structure', async () => {
      const res = await svc._fetchCognitiveStats('PT-123');
      expect(res.todaysProgress).toBe(85);
      expect(res.currentDifficultyLevel).toBe(5);
      expect(res.flaggedDeficits).toContain('Short-term Memory');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _fetchEnvironmentStats                                              */
  /* ------------------------------------------------------------------ */
  describe('_fetchEnvironmentStats', () => {
    it('returns environment data structure', async () => {
      const res = await svc._fetchEnvironmentStats();
      expect(res.roomTemp).toBe(22.5);
      expect(res.lighting).toBe('CALM_BLUE');
      expect(res.noiseLevel).toBe('LOW');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _determineOverallState                                              */
  /* ------------------------------------------------------------------ */
  describe('_determineOverallState', () => {
    it('returns UNSTABLE when HR > 110', () => {
      const physio = { liveHeartRate: 120, liveSpO2: 98, stressIndex: 10 };
      const cog = { todaysProgress: 85 };
      expect(svc._determineOverallState(physio, cog)).toBe('UNSTABLE');
    });

    it('returns UNSTABLE when SpO2 < 90', () => {
      const physio = { liveHeartRate: 75, liveSpO2: 85, stressIndex: 10 };
      const cog = { todaysProgress: 85 };
      expect(svc._determineOverallState(physio, cog)).toBe('UNSTABLE');
    });

    it('returns STRESSED when stress > 70', () => {
      const physio = { liveHeartRate: 75, liveSpO2: 98, stressIndex: 80 };
      const cog = { todaysProgress: 85 };
      expect(svc._determineOverallState(physio, cog)).toBe('STRESSED');
    });

    it('returns READY_FOR_THERAPY for normal values', () => {
      const physio = { liveHeartRate: 75, liveSpO2: 98, stressIndex: 12 };
      const cog = { todaysProgress: 85 };
      expect(svc._determineOverallState(physio, cog)).toBe('READY_FOR_THERAPY');
    });

    it('UNSTABLE takes priority over STRESSED', () => {
      const physio = { liveHeartRate: 120, liveSpO2: 85, stressIndex: 80 };
      const cog = { todaysProgress: 50 };
      expect(svc._determineOverallState(physio, cog)).toBe('UNSTABLE');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _generateAlerts                                                     */
  /* ------------------------------------------------------------------ */
  describe('_generateAlerts', () => {
    it('warns when stress > 50', () => {
      const physio = { stressIndex: 60 };
      const robotics = { calibrationStatus: 'OPTIMAL' };
      const alerts = svc._generateAlerts(physio, robotics);
      const warn = alerts.find(a => a.level === 'WARN');
      expect(warn).toBeDefined();
      expect(warn.msg).toContain('Stress');
    });

    it('critical alert when calibration != OPTIMAL', () => {
      const physio = { stressIndex: 10 };
      const robotics = { calibrationStatus: 'NEEDS_CALIBRATION' };
      const alerts = svc._generateAlerts(physio, robotics);
      const crit = alerts.find(a => a.level === 'CRITICAL');
      expect(crit).toBeDefined();
      expect(crit.msg).toContain('Calibration');
    });

    it('returns empty when all normal', () => {
      const physio = { stressIndex: 10 };
      const robotics = { calibrationStatus: 'OPTIMAL' };
      expect(svc._generateAlerts(physio, robotics)).toEqual([]);
    });

    it('returns both alerts simultaneously', () => {
      const physio = { stressIndex: 80 };
      const robotics = { calibrationStatus: 'DEGRADED' };
      expect(svc._generateAlerts(physio, robotics)).toHaveLength(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _generateAIInsight                                                  */
  /* ------------------------------------------------------------------ */
  describe('_generateAIInsight', () => {
    it('returns a string containing HR and difficulty level', () => {
      const physio = { liveHeartRate: 75 };
      const physical = { activeSession: false };
      const cognitive = { currentDifficultyLevel: 5 };
      const insight = svc._generateAIInsight(physio, physical, cognitive);
      expect(typeof insight).toBe('string');
      expect(insight).toContain('75');
      expect(insight).toContain('5');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getPatientCommandSnapshot (integration)                             */
  /* ------------------------------------------------------------------ */
  describe('getPatientCommandSnapshot', () => {
    it('returns full snapshot object', async () => {
      const snap = await svc.getPatientCommandSnapshot('PT-100');
      expect(snap.meta.patientId).toBe('PT-100');
      expect(snap.meta.timestamp).toBeDefined();
      expect(snap.meta.generatedBy).toBe('SmartClinicalCommand_v1.0');
    });

    it('has status with overallState and alerts', async () => {
      const snap = await svc.getPatientCommandSnapshot('PT-100');
      expect(snap.status.overallState).toBe('READY_FOR_THERAPY');
      expect(Array.isArray(snap.status.alerts)).toBe(true);
    });

    it('has all 4 modules', async () => {
      const snap = await svc.getPatientCommandSnapshot('PT-100');
      expect(snap.modules.wearable).toBeDefined();
      expect(snap.modules.robotics).toBeDefined();
      expect(snap.modules.cognitive).toBeDefined();
      expect(snap.modules.iot).toBeDefined();
    });

    it('includes clinicalInsight string', async () => {
      const snap = await svc.getPatientCommandSnapshot('PT-100');
      expect(typeof snap.clinicalInsight).toBe('string');
      expect(snap.clinicalInsight.length).toBeGreaterThan(5);
    });
  });
});
