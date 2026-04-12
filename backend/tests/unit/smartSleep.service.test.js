/**
 * Unit Tests — SmartSleepService
 * P#67 - Batch 28
 *
 * Pure class (Map-based, no DB). NOT singleton — new SmartSleepService().
 * Covers: logSleep, predictAlertnessWindow
 */

'use strict';

describe('SmartSleepService', () => {
  let SmartSleepService;
  let service;

  beforeEach(() => {
    SmartSleepService = require('../../services/smartSleep.service');
    service = new SmartSleepService();
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('starts with empty sleepLogs', () => {
      expect(service.sleepLogs).toBeInstanceOf(Map);
      expect(service.sleepLogs.size).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  logSleep                                                            */
  /* ------------------------------------------------------------------ */
  describe('logSleep', () => {
    it('stores a sleep log and returns it', async () => {
      const res = await service.logSleep('p1', '2025-01-15', 8, 'GOOD');
      expect(res.log).toBeDefined();
      expect(res.log.id).toContain('SLP-');
      expect(res.log.patientId).toBe('p1');
      expect(res.log.date).toBe('2025-01-15');
      expect(res.log.hours).toBe(8);
      expect(res.log.quality).toBe('GOOD');
      expect(res.log.timestamp).toBeInstanceOf(Date);
    });

    it('stores log in the Map with patientId_date key', async () => {
      await service.logSleep('p1', '2025-01-15', 7, 'FAIR');
      expect(service.sleepLogs.has('p1_2025-01-15')).toBe(true);
    });

    it('returns no alert for good sleep (>=5h and not POOR)', async () => {
      const res = await service.logSleep('p1', '2025-01-15', 8, 'GOOD');
      expect(res.alert).toBeNull();
    });

    it('returns alert for sleep < 5 hours', async () => {
      const res = await service.logSleep('p1', '2025-01-15', 4, 'FAIR');
      expect(res.alert).not.toBeNull();
      expect(res.alert.type).toBe('SLEEP_DEPRIVATION');
      expect(res.alert.severity).toBe('HIGH');
      expect(res.alert.action).toBe('ADJUST_SCHEDULE');
    });

    it('returns alert for POOR quality regardless of hours', async () => {
      const res = await service.logSleep('p1', '2025-01-15', 8, 'POOR');
      expect(res.alert).not.toBeNull();
      expect(res.alert.type).toBe('SLEEP_DEPRIVATION');
    });

    it('returns alert for both < 5h AND POOR', async () => {
      const res = await service.logSleep('p1', '2025-01-15', 3, 'POOR');
      expect(res.alert).not.toBeNull();
    });

    it('no alert for exactly 5 hours FAIR quality', async () => {
      const res = await service.logSleep('p1', '2025-01-15', 5, 'FAIR');
      expect(res.alert).toBeNull();
    });

    it('overwrites same patientId + date', async () => {
      await service.logSleep('p1', '2025-01-15', 7, 'GOOD');
      await service.logSleep('p1', '2025-01-15', 4, 'POOR');
      expect(service.sleepLogs.size).toBe(1);
      const entry = service.sleepLogs.get('p1_2025-01-15');
      expect(entry.hours).toBe(4);
    });

    it('stores multiple patients independently', async () => {
      await service.logSleep('p1', '2025-01-15', 7, 'GOOD');
      await service.logSleep('p2', '2025-01-15', 6, 'FAIR');
      expect(service.sleepLogs.size).toBe(2);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  predictAlertnessWindow                                              */
  /* ------------------------------------------------------------------ */
  describe('predictAlertnessWindow', () => {
    it('returns alertness prediction for patient', async () => {
      const res = await service.predictAlertnessWindow('p1');
      expect(res.patientId).toBe('p1');
      expect(res.chronotype).toBeDefined();
      expect(res.peakWindow).toBeDefined();
      expect(res.peakWindow.start).toBeDefined();
      expect(res.peakWindow.end).toBeDefined();
      expect(res.slumpWindow).toBeDefined();
      expect(res.recommendation).toBeDefined();
    });

    it('peakWindow start is before end', async () => {
      const res = await service.predictAlertnessWindow('p1');
      expect(res.peakWindow.start < res.peakWindow.end).toBe(true);
    });

    it('slumpWindow start is before end', async () => {
      const res = await service.predictAlertnessWindow('p1');
      expect(res.slumpWindow.start < res.slumpWindow.end).toBe(true);
    });
  });
});
