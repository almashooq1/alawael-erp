/**
 * Unit Tests — GOSIService (gosi.service)
 * P#70 - Batch 31
 *
 * Singleton + logger. Pure async in-memory (no mongoose).
 * Covers: verifyRegistration, getContributionDetails, calculateDeduction,
 *         reportEndOfService, getEmployeeHistory
 */

'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('GOSIService', () => {
  let service;

  beforeEach(() => {
    jest.isolateModules(() => {
      service = require('../../services/gosi.service');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  verifyRegistration                                                  */
  /* ------------------------------------------------------------------ */
  describe('verifyRegistration', () => {
    it('returns registered status', async () => {
      const res = await service.verifyRegistration('EMP-001', '1234567890');
      expect(res.registered).toBe(true);
      expect(res.employeeId).toBe('EMP-001');
      expect(res.nationalId).toBe('1234567890');
      expect(res.status).toBe('active');
    });

    it('has registrationDate', async () => {
      const res = await service.verifyRegistration('EMP-001', 'NAT-123');
      expect(res.registrationDate).toBeDefined();
    });

    it('handles different employee IDs', async () => {
      const a = await service.verifyRegistration('A', 'N-A');
      const b = await service.verifyRegistration('B', 'N-B');
      expect(a.employeeId).toBe('A');
      expect(b.employeeId).toBe('B');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getContributionDetails                                              */
  /* ------------------------------------------------------------------ */
  describe('getContributionDetails', () => {
    it('returns contribution breakdown', async () => {
      const res = await service.getContributionDetails('EMP-001');
      expect(res.employeeId).toBe('EMP-001');
      expect(res.monthlyContribution).toBe(0);
      expect(res.employerContribution).toBe(0);
      expect(res.totalContributions).toBe(0);
      expect(res.contributionMonths).toBe(0);
    });

    it('includes employeeId in result', async () => {
      const res = await service.getContributionDetails('EMP-999');
      expect(res.employeeId).toBe('EMP-999');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateDeduction                                                  */
  /* ------------------------------------------------------------------ */
  describe('calculateDeduction', () => {
    it('calculates correct GOSI deductions', async () => {
      const res = await service.calculateDeduction(10000, 2500);
      const total = 10000 + 2500;
      expect(res.baseSalary).toBe(10000);
      expect(res.housingAllowance).toBe(2500);
      expect(res.totalSalary).toBe(total);
      expect(res.employeeDeduction).toBeCloseTo(total * 0.0975, 2);
      expect(res.employerDeduction).toBeCloseTo(total * 0.1175, 2);
      expect(res.gosiRate).toBe(0.0975);
      expect(res.employerRate).toBe(0.1175);
    });

    it('defaults housingAllowance to 0', async () => {
      const res = await service.calculateDeduction(5000);
      expect(res.housingAllowance).toBe(0);
      expect(res.totalSalary).toBe(5000);
      expect(res.employeeDeduction).toBeCloseTo(5000 * 0.0975, 2);
    });

    it('handles zero salary', async () => {
      const res = await service.calculateDeduction(0, 0);
      expect(res.totalSalary).toBe(0);
      expect(res.employeeDeduction).toBe(0);
      expect(res.employerDeduction).toBe(0);
    });

    it('handles high salary', async () => {
      const res = await service.calculateDeduction(50000, 12500);
      expect(res.totalSalary).toBe(62500);
      expect(res.employeeDeduction).toBeCloseTo(62500 * 0.0975, 2);
      expect(res.employerDeduction).toBeCloseTo(62500 * 0.1175, 2);
    });

    it('employee deduction < employer deduction', async () => {
      const res = await service.calculateDeduction(10000);
      expect(res.employeeDeduction).toBeLessThan(res.employerDeduction);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  reportEndOfService                                                  */
  /* ------------------------------------------------------------------ */
  describe('reportEndOfService', () => {
    it('returns success with reference number', async () => {
      const res = await service.reportEndOfService('EMP-001', '2025-12-31', 'RESIGNATION');
      expect(res.success).toBe(true);
      expect(res.referenceNumber).toMatch(/^GOSI-/);
      expect(res.employeeId).toBe('EMP-001');
      expect(res.terminationDate).toBe('2025-12-31');
      expect(res.reason).toBe('RESIGNATION');
      expect(res.status).toBe('reported');
    });

    it('reference numbers contain GOSI- prefix and timestamp', async () => {
      const a = await service.reportEndOfService('A', '2025-01-01', 'R');
      expect(a.referenceNumber).toMatch(/^GOSI-\d+$/);
    });

    it('handles different reasons', async () => {
      for (const reason of ['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'END_OF_CONTRACT']) {
        const res = await service.reportEndOfService('EMP', '2025-01-01', reason);
        expect(res.reason).toBe(reason);
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getEmployeeHistory                                                  */
  /* ------------------------------------------------------------------ */
  describe('getEmployeeHistory', () => {
    it('returns empty history object', async () => {
      const res = await service.getEmployeeHistory('EMP-001');
      expect(res.employeeId).toBe('EMP-001');
      expect(res.history).toEqual([]);
      expect(res.totalMonths).toBe(0);
      expect(res.startDate).toBeNull();
      expect(res.endDate).toBeNull();
    });

    it('returns correct employeeId', async () => {
      const res = await service.getEmployeeHistory('EMP-XYZ');
      expect(res.employeeId).toBe('EMP-XYZ');
    });
  });
});
