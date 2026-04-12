/**
 * Unit Tests — SmartBehaviorService
 * P#67 - Batch 28
 *
 * Pure class (array-based, no DB). NOT singleton — new SmartBehaviorService().
 * Covers: logIncident, analyzePatterns, predictMeltdownRisk
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('SmartBehaviorService', () => {
  let SmartBehaviorService;
  let service;

  beforeEach(() => {
    SmartBehaviorService = require('../../services/smartBehavior.service');
    service = new SmartBehaviorService();
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty incidentLogs', () => {
      expect(service.incidentLogs).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  logIncident                                                         */
  /* ------------------------------------------------------------------ */
  describe('logIncident', () => {
    it('logs an incident and returns log id', async () => {
      const res = await service.logIncident('p1', {
        location: 'Cafeteria',
        time: '12:30',
        trigger: 'Loud Noise',
        behavior: 'Screaming',
        consequence: 'Removed from room',
      });
      expect(res.logId).toContain('INC-');
      expect(res.status).toBe('RECORDED');
    });

    it('stores incident in incidentLogs array', async () => {
      await service.logIncident('p1', { trigger: 'Change' });
      expect(service.incidentLogs.length).toBe(1);
      expect(service.incidentLogs[0].patientId).toBe('p1');
      expect(service.incidentLogs[0].trigger).toBe('Change');
    });

    it('returns immediateInsight with recurring trigger warning', async () => {
      const res = await service.logIncident('p1', { trigger: 'Noise' });
      // analyzePatterns mock always returns topTrigger
      expect(res.immediateInsight).toContain('Warning');
    });

    it('spreads data fields onto the log entry', async () => {
      await service.logIncident('p1', {
        location: 'Gym',
        time: '14:00',
        behavior: 'Hitting',
      });
      const log = service.incidentLogs[0];
      expect(log.location).toBe('Gym');
      expect(log.time).toBe('14:00');
      expect(log.behavior).toBe('Hitting');
    });

    it('assigns ID prefix INC- to each incident', async () => {
      const r1 = await service.logIncident('p1', { trigger: 'A' });
      const r2 = await service.logIncident('p1', { trigger: 'B' });
      expect(r1.logId).toContain('INC-');
      expect(r2.logId).toContain('INC-');
    });

    it('accumulates multiple incidents', async () => {
      await service.logIncident('p1', { trigger: 'A' });
      await service.logIncident('p1', { trigger: 'B' });
      await service.logIncident('p2', { trigger: 'C' });
      expect(service.incidentLogs.length).toBe(3);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  analyzePatterns                                                     */
  /* ------------------------------------------------------------------ */
  describe('analyzePatterns', () => {
    it('returns pattern analysis for patient', async () => {
      const res = await service.analyzePatterns('p1');
      expect(res.patientId).toBe('p1');
      expect(res.analysisDate).toBeInstanceOf(Date);
      expect(res.topTrigger).toBeDefined();
      expect(res.peakTime).toBeDefined();
      expect(res.suggestedFunction).toBeDefined();
      expect(res.interventionStrategy).toBeDefined();
    });

    it('returns "Escape/Avoidance" as suggested function', async () => {
      const res = await service.analyzePatterns('p1');
      expect(res.suggestedFunction).toBe('Escape/Avoidance');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  predictMeltdownRisk                                                 */
  /* ------------------------------------------------------------------ */
  describe('predictMeltdownRisk', () => {
    it('returns HIGH risk for noisy and crowded environment', async () => {
      const res = await service.predictMeltdownRisk('p1', {
        noiseLevel: '80dB',
        crowdDensity: 'High',
      });
      expect(res.riskLevel).toBe('HIGH');
      expect(parseInt(res.probability)).toBe(90); // 10 + 50 + 30
    });

    it('returns LOW risk for calm environment', async () => {
      const res = await service.predictMeltdownRisk('p1', {
        noiseLevel: '40dB',
        crowdDensity: 'Low',
      });
      expect(res.riskLevel).toBe('LOW');
      expect(parseInt(res.probability)).toBe(10); // base only
    });

    it('returns HIGH for noise only (score=60 → LOW)', async () => {
      const res = await service.predictMeltdownRisk('p1', {
        noiseLevel: '80dB',
        crowdDensity: 'Low',
      });
      // 10 + 50 = 60, not > 70
      expect(res.riskLevel).toBe('LOW');
      expect(parseInt(res.probability)).toBe(60);
    });

    it('returns LOW for crowd only (score=40)', async () => {
      const res = await service.predictMeltdownRisk('p1', {
        noiseLevel: '50dB',
        crowdDensity: 'High',
      });
      // 10 + 30 = 40
      expect(res.riskLevel).toBe('LOW');
      expect(parseInt(res.probability)).toBe(40);
    });

    it('always provides mitigation suggestion', async () => {
      const res = await service.predictMeltdownRisk('p1', {
        noiseLevel: '40dB',
        crowdDensity: 'Low',
      });
      expect(res.mitigation).toBeDefined();
    });
  });
});
