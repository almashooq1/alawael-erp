/**
 * Unit Tests — SmartPredictiveAIService
 * P#70 - Batch 31
 *
 * Class export. Pure async logic + logger.
 * Covers: generateForecast, _calculateVelocity, _estimateTime, _addWeeks
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartPredictiveAIService = require('../../services/smartPredictiveAI.service');

describe('SmartPredictiveAIService', () => {
  let svc;

  beforeEach(() => {
    svc = new SmartPredictiveAIService();
  });

  /* helper: build a minimal snapshot */
  function mkSnapshot(overrides = {}) {
    return {
      modules: {
        cognitive: {
          todaysProgress: overrides.todaysProgress ?? 85,
          currentDifficultyLevel: overrides.cogLevel ?? 5,
          flaggedDeficits: overrides.deficits || ['Short-term Memory'],
        },
        robotics: {
          activeSession: false,
          lastSafetyCheck: 'PASSED',
          calibrationStatus: 'OPTIMAL',
          complianceRate: overrides.complianceRate ?? 85,
        },
        wearable: {
          connectionStatus: 'CONNECTED',
          liveHeartRate: 75,
          liveSpO2: 98,
          stressIndex: 12,
        },
        iot: { roomTemp: 22.5, lighting: 'CALM_BLUE', noiseLevel: 'LOW' },
      },
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Constructor                                                         */
  /* ------------------------------------------------------------------ */
  describe('constructor', () => {
    it('logs initialization', () => {
      const logger = require('../../utils/logger');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Predictive AI Engine'));
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _calculateVelocity                                                  */
  /* ------------------------------------------------------------------ */
  describe('_calculateVelocity', () => {
    it('returns average of physical and cognitive factor', () => {
      const snap = mkSnapshot({ complianceRate: 80, todaysProgress: 50 });
      // phys = 80/100 = 0.8, cog = 50/100 = 0.5, avg = 0.65
      expect(svc._calculateVelocity(snap)).toBeCloseTo(0.65, 2);
    });

    it('returns 1.0 for perfect scores', () => {
      const snap = mkSnapshot({ complianceRate: 100, todaysProgress: 100 });
      expect(svc._calculateVelocity(snap)).toBe(1.0);
    });

    it('handles missing complianceRate (defaults 80)', () => {
      const snap = mkSnapshot({ todaysProgress: 50 });
      delete snap.modules.robotics.complianceRate;
      // phys = 80/100 = 0.8, cog = 50/100 = 0.5
      expect(svc._calculateVelocity(snap)).toBeCloseTo(0.65, 2);
    });

    it('handles missing todaysProgress (defaults 50)', () => {
      const snap = mkSnapshot({ complianceRate: 80 });
      delete snap.modules.cognitive.todaysProgress;
      // phys = 80/100 = 0.8, cog = 50/100 = 0.5
      expect(svc._calculateVelocity(snap)).toBeCloseTo(0.65, 2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _estimateTime                                                       */
  /* ------------------------------------------------------------------ */
  describe('_estimateTime', () => {
    it('returns 0 when already at target', () => {
      expect(svc._estimateTime(10, 10, 0.5)).toBe(0);
    });

    it('returns 0 when above target', () => {
      expect(svc._estimateTime(12, 10, 0.5)).toBe(0);
    });

    it('returns 999 when velocity yields rate 0', () => {
      expect(svc._estimateTime(5, 10, 0)).toBe(999);
    });

    it('calculates ceil(remaining / (0.5 * velocity))', () => {
      // remaining = 10 - 5 = 5, rate = 0.5 * 1.0 = 0.5, 5/0.5 = 10
      expect(svc._estimateTime(5, 10, 1.0)).toBe(10);
    });

    it('rounds up to ceiling', () => {
      // remaining = 3, rate = 0.5 * 0.8 = 0.4, 3/0.4 = 7.5 → ceil = 8
      expect(svc._estimateTime(7, 10, 0.8)).toBe(8);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  _addWeeks                                                           */
  /* ------------------------------------------------------------------ */
  describe('_addWeeks', () => {
    it('returns ISO date string (YYYY-MM-DD)', () => {
      const res = svc._addWeeks(new Date('2025-01-01'), 4);
      expect(res).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('adds correct number of weeks', () => {
      const res = svc._addWeeks(new Date('2025-01-01'), 2);
      expect(res).toBe('2025-01-15');
    });

    it('adds 0 weeks', () => {
      const res = svc._addWeeks(new Date('2025-06-15'), 0);
      expect(res).toBe('2025-06-15');
    });

    it('handles month rollover', () => {
      const res = svc._addWeeks(new Date('2025-01-25'), 2);
      expect(res).toBe('2025-02-08');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateForecast (integration)                                      */
  /* ------------------------------------------------------------------ */
  describe('generateForecast', () => {
    it('returns forecast object with all fields', async () => {
      const snap = mkSnapshot();
      const res = await svc.generateForecast('PT-100', snap);
      expect(res.patientId).toBe('PT-100');
      expect(res.predictionDate).toBeDefined();
      expect(res.modelUsed).toBe('EXPERIMENTAL_RECOVERY_NET_V4');
      expect(res.forecast.weeksToRecovery).toBeDefined();
      expect(res.forecast.projectedCompletionDate).toBeDefined();
      expect(res.forecast.confidenceScore).toBe(89.5);
    });

    it('has 2 scenarios', async () => {
      const snap = mkSnapshot();
      const res = await svc.generateForecast('PT-100', snap);
      expect(res.scenarios).toHaveLength(2);
      expect(res.scenarios[0].name).toBe('Standard Protocol');
      expect(res.scenarios[1].name).toContain('Intensive');
    });

    it('intensive scenario is ~70% of standard weeks', async () => {
      const snap = mkSnapshot({ cogLevel: 5 });
      const res = await svc.generateForecast('PT-100', snap);
      const stdWeeks = res.forecast.weeksToRecovery;
      const intensiveText = res.scenarios[1].outcome;
      const intensiveWeeks = parseInt(intensiveText.match(/(\d+) weeks/)[1]);
      expect(intensiveWeeks).toBe(Math.round(stdWeeks * 0.7));
    });

    it('weeksToRecovery is 0 when already at level 10', async () => {
      const snap = mkSnapshot({ cogLevel: 10 });
      const res = await svc.generateForecast('PT-100', snap);
      expect(res.forecast.weeksToRecovery).toBe(0);
    });

    it('higher velocity → fewer weeks', async () => {
      const slow = mkSnapshot({ complianceRate: 30, todaysProgress: 30, cogLevel: 5 });
      const fast = mkSnapshot({ complianceRate: 100, todaysProgress: 100, cogLevel: 5 });
      const resSlow = await svc.generateForecast('P1', slow);
      const resFast = await svc.generateForecast('P2', fast);
      expect(resFast.forecast.weeksToRecovery).toBeLessThan(resSlow.forecast.weeksToRecovery);
    });

    it('projectedCompletionDate is a valid date string', async () => {
      const snap = mkSnapshot();
      const res = await svc.generateForecast('PT-100', snap);
      expect(Date.parse(res.forecast.projectedCompletionDate)).not.toBeNaN();
    });
  });
});
