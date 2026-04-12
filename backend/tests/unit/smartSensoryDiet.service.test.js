/**
 * Unit Tests — SmartSensoryDietService
 * P#71 - Batch 32
 *
 * Class export (not singleton). Uses in-memory Map + activities dictionary + logger.
 * Covers: constructor, generateDailyDiet, suggestRegulation
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartSensoryDietService = require('../../services/smartSensoryDiet.service');

describe('SmartSensoryDietService', () => {
  let svc;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new SmartSensoryDietService();
  });

  /* ================================================================ */
  /*  Constructor & built-in activities                                */
  /* ================================================================ */
  describe('constructor', () => {
    it('initialises diets as empty Map', () => {
      expect(svc.diets).toBeInstanceOf(Map);
      expect(svc.diets.size).toBe(0);
    });

    it('has PROPRIOCEPTIVE activities', () => {
      expect(svc.activities.PROPRIOCEPTIVE).toHaveLength(2);
    });

    it('has VESTIBULAR activities', () => {
      expect(svc.activities.VESTIBULAR).toHaveLength(2);
    });

    it('has TACTILE activities', () => {
      expect(svc.activities.TACTILE).toHaveLength(1);
      expect(svc.activities.TACTILE[0].name).toBe('Bin of Rice');
    });
  });

  /* ================================================================ */
  /*  generateDailyDiet                                                */
  /* ================================================================ */
  describe('generateDailyDiet', () => {
    it('returns diet object with required fields', async () => {
      const res = await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(res).toHaveProperty('dietId');
      expect(res).toHaveProperty('patientId', 'PT-1');
      expect(res).toHaveProperty('profile', 'SENSORY_SEEKER');
      expect(res).toHaveProperty('schedule');
      expect(res).toHaveProperty('instructions');
    });

    it('dietId starts with DIET-', async () => {
      const res = await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(res.dietId).toMatch(/^DIET-\d+$/);
    });

    it('SENSORY_SEEKER schedule has 3 entries', async () => {
      const res = await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(res.schedule).toHaveLength(3);
    });

    it('SENSORY_SEEKER starts with Wall Push-ups at 08:00', async () => {
      const res = await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(res.schedule[0].time).toBe('08:00');
      expect(res.schedule[0].activity.name).toBe('Wall Push-ups');
    });

    it('SENSORY_SEEKER includes Spinning at 10:00', async () => {
      const res = await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(res.schedule[1].time).toBe('10:00');
      expect(res.schedule[1].activity.name).toBe('Spinning');
    });

    it('SENSORY_SEEKER includes Weighted Vest at 12:00', async () => {
      const res = await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(res.schedule[2].time).toBe('12:00');
      expect(res.schedule[2].activity.name).toBe('Weighted Vest');
    });

    it('SENSORY_AVOIDER schedule has 2 entries', async () => {
      const res = await svc.generateDailyDiet('PT-2', 'SENSORY_AVOIDER');
      expect(res.schedule).toHaveLength(2);
    });

    it('SENSORY_AVOIDER starts with Weighted Vest (calming)', async () => {
      const res = await svc.generateDailyDiet('PT-2', 'SENSORY_AVOIDER');
      expect(res.schedule[0].activity.name).toBe('Weighted Vest');
      expect(res.schedule[0].activity.type).toBe('Calming');
    });

    it('SENSORY_AVOIDER includes Linear Swinging at 10:00', async () => {
      const res = await svc.generateDailyDiet('PT-2', 'SENSORY_AVOIDER');
      expect(res.schedule[1].activity.name).toBe('Linear Swinging');
    });

    it('unknown profile returns empty schedule', async () => {
      const res = await svc.generateDailyDiet('PT-3', 'UNKNOWN');
      expect(res.schedule).toHaveLength(0);
    });

    it('instructions mention over-stimulation', async () => {
      const res = await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(res.instructions).toContain('over-stimulation');
    });

    it('logs generation', async () => {
      const logger = require('../../utils/logger');
      await svc.generateDailyDiet('PT-1', 'SENSORY_SEEKER');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('PT-1'));
    });
  });

  /* ================================================================ */
  /*  suggestRegulation                                                */
  /* ================================================================ */
  describe('suggestRegulation', () => {
    it('returns SEEKING_PROPRIOCEPTION for Climbing', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Child is Climbing on furniture');
      expect(res.state).toBe('SEEKING_PROPRIOCEPTION');
    });

    it('suggests Wall Push-ups for Climbing', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Climbing');
      expect(res.suggestion.name).toBe('Wall Push-ups');
    });

    it('returns rationale about heavy work for proprioception', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Crashing into walls');
      expect(res.rationale).toContain('heavy work');
    });

    it('returns OVERWHELMED_AUDITORY for Covering Ears', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Covering Ears and crying');
      expect(res.state).toBe('OVERWHELMED_AUDITORY');
    });

    it('suggests Noise Cancelling Headphones for auditory overload', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Covering Ears');
      expect(res.suggestion.name).toContain('Noise Cancelling');
    });

    it('returns OVERWHELMED_AUDITORY for Hiding', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Hiding under desk');
      expect(res.state).toBe('OVERWHELMED_AUDITORY');
      expect(res.rationale).toContain('sensory load');
    });

    it('returns null for unrecognised behavior', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Sitting quietly');
      expect(res).toBeNull();
    });

    it('handles Crashing behavior', async () => {
      const res = await svc.suggestRegulation('PT-1', 'Crashing');
      expect(res.state).toBe('SEEKING_PROPRIOCEPTION');
    });
  });
});
