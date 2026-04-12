/**
 * Unit Tests — SmartQualityService
 * P#72 - Batch 33
 *
 * Static class. Depends on ComplianceLog, Employee, TherapySession, Vehicle (Mongoose)
 * + SmartNotificationService + logger.
 * Covers: runFullComplianceScan, scanHRCompliance, scanFleetCompliance,
 *         scanClinicalQuality, logIssue, getStats
 */

'use strict';

const mockComplianceLogFindOne = jest.fn();
const mockComplianceLogCreate = jest.fn();
const mockComplianceLogAggregate = jest.fn();
const mockEmployeeFind = jest.fn();
const mockSessionFind = jest.fn();
const mockVehicleFind = jest.fn();
const mockNotifSend = jest.fn().mockResolvedValue(true);

jest.mock('../../models/ComplianceLog', () => ({
  findOne: (...a) => mockComplianceLogFindOne(...a),
  create: (...a) => mockComplianceLogCreate(...a),
  aggregate: (...a) => mockComplianceLogAggregate(...a),
}));

jest.mock('../../models/Employee', () => ({
  find: (...a) => mockEmployeeFind(...a),
}));

jest.mock('../../models/TherapySession', () => ({
  find: (...a) => mockSessionFind(...a),
}));

jest.mock('../../models/Vehicle', () => ({
  find: (...a) => mockVehicleFind(...a),
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

const SmartQualityService = require('../../services/smartQuality.service');

describe('SmartQualityService', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ================================================================ */
  /*  scanHRCompliance                                                  */
  /* ================================================================ */
  describe('scanHRCompliance', () => {
    it('returns 0 when no active employees', async () => {
      mockEmployeeFind.mockResolvedValue([]);
      const count = await SmartQualityService.scanHRCompliance();
      expect(count).toBe(0);
    });

    it('flags expiring contract (within 30 days)', async () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 10);
      mockEmployeeFind.mockResolvedValue([
        {
          _id: 'EMP-1',
          fullName: 'Ahmad',
          contracts: [{ endDate: soonDate }],
        },
      ]);
      mockComplianceLogFindOne.mockResolvedValue(null);
      mockComplianceLogCreate.mockResolvedValue({});

      const count = await SmartQualityService.scanHRCompliance();
      expect(count).toBe(1);
    });

    it('flags missing contract', async () => {
      mockEmployeeFind.mockResolvedValue([{ _id: 'EMP-2', fullName: 'Sara', contracts: [] }]);
      mockComplianceLogFindOne.mockResolvedValue(null);
      mockComplianceLogCreate.mockResolvedValue({});

      const count = await SmartQualityService.scanHRCompliance();
      expect(count).toBe(1);
    });

    it('does not flag contract expiring after 30 days', async () => {
      const farDate = new Date();
      farDate.setDate(farDate.getDate() + 60);
      mockEmployeeFind.mockResolvedValue([
        {
          _id: 'EMP-3',
          fullName: 'Omar',
          contracts: [{ endDate: farDate }],
        },
      ]);

      const count = await SmartQualityService.scanHRCompliance();
      expect(count).toBe(0);
    });
  });

  /* ================================================================ */
  /*  scanFleetCompliance                                               */
  /* ================================================================ */
  describe('scanFleetCompliance', () => {
    it('returns 0 when no vehicles', async () => {
      mockVehicleFind.mockResolvedValue([]);
      const count = await SmartQualityService.scanFleetCompliance();
      expect(count).toBe(0);
    });

    it('flags expired insurance', async () => {
      const expired = new Date(Date.now() - 86400000);
      mockVehicleFind.mockResolvedValue([
        { _id: 'V-1', plateNumber: 'ABC-123', insuranceExpiry: expired },
      ]);
      mockComplianceLogFindOne.mockResolvedValue(null);
      mockComplianceLogCreate.mockResolvedValue({});

      const count = await SmartQualityService.scanFleetCompliance();
      expect(count).toBe(1);
    });

    it('does not flag valid insurance', async () => {
      const future = new Date(Date.now() + 30 * 86400000);
      mockVehicleFind.mockResolvedValue([
        { _id: 'V-2', plateNumber: 'XYZ-789', insuranceExpiry: future },
      ]);

      const count = await SmartQualityService.scanFleetCompliance();
      expect(count).toBe(0);
    });

    it('handles Vehicle.find error gracefully', async () => {
      mockVehicleFind.mockRejectedValue(new Error('Model error'));
      const count = await SmartQualityService.scanFleetCompliance();
      expect(count).toBe(0);
    });
  });

  /* ================================================================ */
  /*  scanClinicalQuality                                               */
  /* ================================================================ */
  describe('scanClinicalQuality', () => {
    it('returns 0 when no recent sessions', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });
      const count = await SmartQualityService.scanClinicalQuality();
      expect(count).toBe(0);
    });

    it('flags session with short notes', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'SESS-1',
            date: new Date(),
            therapist: { firstName: 'Ali', lastName: 'X' },
            notes: { subjective: 'OK', objective: 'Fine' },
          },
        ]),
      });
      mockComplianceLogFindOne.mockResolvedValue(null);
      mockComplianceLogCreate.mockResolvedValue({});

      const count = await SmartQualityService.scanClinicalQuality();
      expect(count).toBe(1);
    });

    it('does not flag session with proper notes', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'SESS-2',
            date: new Date(),
            therapist: { firstName: 'Ali', lastName: 'X' },
            notes: {
              subjective: 'Patient reports feeling much better after exercises.',
              objective: 'ROM improved by 15 degrees compared to last visit.',
            },
          },
        ]),
      });

      const count = await SmartQualityService.scanClinicalQuality();
      expect(count).toBe(0);
    });

    it('skips already-logged poor documentation', async () => {
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'SESS-3',
            date: new Date(),
            therapist: { firstName: 'Sara', lastName: 'Y' },
            notes: { subjective: 'ok', objective: 'ok' },
          },
        ]),
      });
      mockComplianceLogFindOne.mockResolvedValue({ _id: 'existing' }); // already logged

      const count = await SmartQualityService.scanClinicalQuality();
      expect(count).toBe(0);
    });
  });

  /* ================================================================ */
  /*  logIssue                                                          */
  /* ================================================================ */
  describe('logIssue', () => {
    it('creates log when no duplicate exists', async () => {
      mockComplianceLogFindOne.mockResolvedValue(null);
      mockComplianceLogCreate.mockResolvedValue({});

      await SmartQualityService.logIssue(
        'HR',
        'EXPIRING_CONTRACT',
        'desc',
        'REF-1',
        'Employee',
        'WARNING'
      );
      expect(mockComplianceLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'HR',
          issueType: 'EXPIRING_CONTRACT',
          severity: 'WARNING',
        })
      );
    });

    it('skips creation when duplicate exists', async () => {
      mockComplianceLogFindOne.mockResolvedValue({ _id: 'dup' });

      await SmartQualityService.logIssue(
        'HR',
        'EXPIRING_CONTRACT',
        'desc',
        'REF-1',
        'Employee',
        'WARNING'
      );
      expect(mockComplianceLogCreate).not.toHaveBeenCalled();
    });
  });

  /* ================================================================ */
  /*  runFullComplianceScan                                             */
  /* ================================================================ */
  describe('runFullComplianceScan', () => {
    it('returns aggregated results from all scans', async () => {
      // HR: 0 issues
      mockEmployeeFind.mockResolvedValue([]);
      // Fleet: 0 issues
      mockVehicleFind.mockResolvedValue([]);
      // Clinical: 0 issues
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const res = await SmartQualityService.runFullComplianceScan('ADMIN-1');
      expect(res.success).toBe(true);
      expect(res.issuesFound).toBe(0);
      expect(res.details).toHaveProperty('hr');
      expect(res.details).toHaveProperty('fleet');
      expect(res.details).toHaveProperty('clinical');
    });

    it('sends notification when issues found', async () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 5);
      mockEmployeeFind.mockResolvedValue([
        { _id: 'E-1', fullName: 'X', contracts: [{ endDate: soonDate }] },
      ]);
      mockComplianceLogFindOne.mockResolvedValue(null);
      mockComplianceLogCreate.mockResolvedValue({});
      mockVehicleFind.mockResolvedValue([]);
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      await SmartQualityService.runFullComplianceScan('ADMIN-1');
      expect(mockNotifSend).toHaveBeenCalledWith(
        'ADMIN-1',
        'Quality Scan Complete',
        expect.stringContaining('1 compliance issues'),
        'WARNING',
        '/quality/dashboard'
      );
    });

    it('does not send notification when 0 issues', async () => {
      mockEmployeeFind.mockResolvedValue([]);
      mockVehicleFind.mockResolvedValue([]);
      mockSessionFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      await SmartQualityService.runFullComplianceScan('ADMIN-1');
      expect(mockNotifSend).not.toHaveBeenCalled();
    });
  });

  /* ================================================================ */
  /*  getStats                                                          */
  /* ================================================================ */
  describe('getStats', () => {
    it('returns aggregated stats', async () => {
      mockComplianceLogAggregate.mockResolvedValue([
        { _id: 'HR', count: 3 },
        { _id: 'FLEET', count: 1 },
      ]);
      const res = await SmartQualityService.getStats();
      expect(res).toHaveLength(2);
      expect(res[0]._id).toBe('HR');
    });

    it('returns empty array when no open issues', async () => {
      mockComplianceLogAggregate.mockResolvedValue([]);
      const res = await SmartQualityService.getStats();
      expect(res).toEqual([]);
    });
  });
});
