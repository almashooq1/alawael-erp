/* eslint-disable no-unused-vars */
/**
 * GOSI Service Stub - خدمة التأمينات الاجتماعية
 * General Organization for Social Insurance integration
 *
 * @version 1.0.0
 */

const logger = require('../utils/logger');

class GOSIService {
  constructor() {
    this.baseUrl = process.env.GOSI_API_URL || 'https://api.gosi.gov.sa';
    this.apiKey = process.env.GOSI_API_KEY || '';
  }

  /**
   * Verify employee GOSI registration
   */
  async verifyRegistration(employeeId, nationalId) {
    logger.info(`[GOSI] Verifying registration for employee: ${employeeId}`);
    return {
      registered: true,
      employeeId,
      nationalId,
      registrationDate: new Date(),
      status: 'active',
    };
  }

  /**
   * Get contribution details
   */
  async getContributionDetails(employeeId) {
    logger.info(`[GOSI] Getting contribution details for: ${employeeId}`);
    return {
      employeeId,
      monthlyContribution: 0,
      employerContribution: 0,
      totalContributions: 0,
      contributionMonths: 0,
    };
  }

  /**
   * Calculate GOSI deduction
   */
  async calculateDeduction(basicSalary, housingAllowance = 0) {
    const gosiRate = 0.0975; // 9.75% employee share
    const employerRate = 0.1175; // 11.75% employer share
    const totalSalary = basicSalary + housingAllowance;

    return {
      baseSalary: basicSalary,
      housingAllowance,
      totalSalary,
      employeeDeduction: totalSalary * gosiRate,
      employerDeduction: totalSalary * employerRate,
      gosiRate,
      employerRate,
    };
  }

  /**
   * Report end of service to GOSI
   */
  async reportEndOfService(employeeId, terminationDate, reason) {
    logger.info(`[GOSI] Reporting end of service for: ${employeeId}`);
    return {
      success: true,
      referenceNumber: `GOSI-${Date.now()}`,
      employeeId,
      terminationDate,
      reason,
      status: 'reported',
    };
  }

  /**
   * Get employee GOSI history
   */
  async getEmployeeHistory(employeeId) {
    return {
      employeeId,
      history: [],
      totalMonths: 0,
      startDate: null,
      endDate: null,
    };
  }
}

module.exports = new GOSIService();
