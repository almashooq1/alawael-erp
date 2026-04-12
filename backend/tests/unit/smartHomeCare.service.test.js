/**
 * Unit Tests — SmartHomeCareService
 * P#71 - Batch 32
 *
 * Static class. Depends on HomeAssignment (Mongoose) + SmartNotificationService.
 * Covers: getAdherenceReport, checkDropoutRisk
 */

'use strict';

/* --- Mongoose is globally mocked via jest.setup.js --- */

const mockHAFind = jest.fn();
const mockNotifSend = jest.fn().mockResolvedValue(true);

jest.mock('../../models/HomeAssignment', () => ({
  find: (...a) => mockHAFind(...a),
}));

jest.mock('../../services/smartNotificationService', () => ({
  send: (...a) => mockNotifSend(...a),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const SmartHomeCareService = require('../../services/smartHomeCare.service');

describe('SmartHomeCareService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ================================================================ */
  /*  getAdherenceReport                                                */
  /* ================================================================ */
  describe('getAdherenceReport', () => {
    it('returns NO_ASSIGNMENTS when no active assignments', async () => {
      mockHAFind.mockResolvedValue([]);
      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      expect(res).toEqual({ score: 0, level: 'NO_ASSIGNMENTS' });
    });

    it('calculates score for DAILY frequency', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      mockHAFind.mockResolvedValue([
        {
          startDate: tenDaysAgo,
          frequency: 'DAILY',
          submissions: [
            { status: 'DONE' },
            { status: 'DONE' },
            { status: 'DONE' },
            { status: 'DONE' },
            { status: 'DONE' },
          ],
        },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      // ~10 days expected, 5 done → ~50%
      expect(res.score).toBeGreaterThanOrEqual(40);
      expect(res.score).toBeLessThanOrEqual(56);
    });

    it('calculates score for WEEKLY frequency', async () => {
      const fourWeeksAgo = new Date(Date.now() - 28 * 86400000).toISOString();
      mockHAFind.mockResolvedValue([
        {
          startDate: fourWeeksAgo,
          frequency: 'WEEKLY',
          submissions: [{ status: 'DONE' }, { status: 'DONE' }],
        },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      // ~4 expected (28/7), 2 done → ~50%
      expect(res.score).toBeGreaterThanOrEqual(40);
      expect(res.score).toBeLessThanOrEqual(67);
    });

    it('only counts DONE submissions', async () => {
      const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
      mockHAFind.mockResolvedValue([
        {
          startDate: fiveDaysAgo,
          frequency: 'DAILY',
          submissions: [
            { status: 'DONE' },
            { status: 'MISSED' },
            { status: 'DONE' },
            { status: 'PENDING' },
          ],
        },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      // ~5 expected, 2 done → ~40%
      expect(res.score).toBeGreaterThanOrEqual(30);
      expect(res.score).toBeLessThanOrEqual(50);
    });

    it('level = GOOD when score >= 80', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      mockHAFind.mockResolvedValue([
        {
          startDate: twoDaysAgo,
          frequency: 'DAILY',
          submissions: [{ status: 'DONE' }, { status: 'DONE' }],
        },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      expect(res.level).toBe('GOOD');
    });

    it('level = AVERAGE when score 50-79', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      mockHAFind.mockResolvedValue([
        {
          startDate: tenDaysAgo,
          frequency: 'DAILY',
          submissions: Array(6).fill({ status: 'DONE' }),
        },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      // ~10 expected, 6 done → ~60%
      expect(res.level).toBe('AVERAGE');
    });

    it('level = POOR when score < 50', async () => {
      const twentyDaysAgo = new Date(Date.now() - 20 * 86400000).toISOString();
      mockHAFind.mockResolvedValue([
        {
          startDate: twentyDaysAgo,
          frequency: 'DAILY',
          submissions: [{ status: 'DONE' }, { status: 'DONE' }],
        },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      expect(res.level).toBe('POOR');
    });

    it('returns activeAssignments count', async () => {
      const d = new Date(Date.now() - 3 * 86400000).toISOString();
      mockHAFind.mockResolvedValue([
        { startDate: d, frequency: 'DAILY', submissions: [{ status: 'DONE' }] },
        { startDate: d, frequency: 'DAILY', submissions: [{ status: 'DONE' }] },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      expect(res.activeAssignments).toBe(2);
    });

    it('returns 100 when totalExpected is 0', async () => {
      // Frequency not DAILY or WEEKLY → totalExpected stays 0
      mockHAFind.mockResolvedValue([
        { startDate: new Date().toISOString(), frequency: 'MONTHLY', submissions: [] },
      ]);

      const res = await SmartHomeCareService.getAdherenceReport('BEN-1');
      expect(res.score).toBe(100);
    });
  });

  /* ================================================================ */
  /*  checkDropoutRisk                                                  */
  /* ================================================================ */
  describe('checkDropoutRisk', () => {
    const makeChain = data => ({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue(data),
      }),
    });

    it('returns empty when no assignments', async () => {
      mockHAFind.mockReturnValue(makeChain([]));
      const res = await SmartHomeCareService.checkDropoutRisk('ADMIN-1');
      expect(res).toEqual({ count: 0, details: [] });
    });

    it('flags family inactive > 7 days', async () => {
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
      mockHAFind.mockReturnValue(
        makeChain([
          {
            _id: 'HA-1',
            beneficiary: { firstName: 'Ali', lastName: 'X' },
            assignedBy: { _id: 'THER-1' },
            startDate: tenDaysAgo,
            submissions: [], // no submission → last activity = startDate = 10 days ago
          },
        ])
      );

      const res = await SmartHomeCareService.checkDropoutRisk('ADMIN-1');
      expect(res.count).toBe(1);
      expect(res.details[0].beneficiary).toBe('Ali');
      expect(res.details[0].daysInactive).toBeGreaterThanOrEqual(10);
    });

    it('sends notification to therapist for inactive family', async () => {
      const fifteenDaysAgo = new Date(Date.now() - 15 * 86400000);
      mockHAFind.mockReturnValue(
        makeChain([
          {
            _id: 'HA-2',
            beneficiary: { firstName: 'Sara', lastName: 'Y' },
            assignedBy: { _id: 'THER-2' },
            startDate: fifteenDaysAgo,
            submissions: [],
          },
        ])
      );

      await SmartHomeCareService.checkDropoutRisk('ADMIN-1');
      expect(mockNotifSend).toHaveBeenCalledWith(
        'THER-2',
        'Home Care Alert: Family Inactive',
        expect.stringContaining('Sara'),
        'WARNING',
        expect.stringContaining('/rehab/home-care/')
      );
    });

    it('does not flag family active within 7 days', async () => {
      const recentSubmission = new Date(Date.now() - 2 * 86400000);
      mockHAFind.mockReturnValue(
        makeChain([
          {
            _id: 'HA-3',
            beneficiary: { firstName: 'Omar', lastName: 'Z' },
            assignedBy: { _id: 'THER-3' },
            startDate: new Date(Date.now() - 30 * 86400000),
            submissions: [{ date: recentSubmission, status: 'DONE' }],
          },
        ])
      );

      const res = await SmartHomeCareService.checkDropoutRisk('ADMIN-1');
      expect(res.count).toBe(0);
      expect(mockNotifSend).not.toHaveBeenCalled();
    });

    it('handles multiple assignments, flags only inactive', async () => {
      const recent = new Date(Date.now() - 1 * 86400000);
      const old = new Date(Date.now() - 20 * 86400000);
      mockHAFind.mockReturnValue(
        makeChain([
          {
            _id: 'HA-4',
            beneficiary: { firstName: 'Active', lastName: 'Kid' },
            assignedBy: { _id: 'THER-4' },
            startDate: old,
            submissions: [{ date: recent, status: 'DONE' }],
          },
          {
            _id: 'HA-5',
            beneficiary: { firstName: 'Inactive', lastName: 'Kid' },
            assignedBy: { _id: 'THER-5' },
            startDate: old,
            submissions: [],
          },
        ])
      );

      const res = await SmartHomeCareService.checkDropoutRisk('ADMIN-1');
      expect(res.count).toBe(1);
      expect(res.details[0].beneficiary).toBe('Inactive');
    });
  });
});
