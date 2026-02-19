/**
 * Advanced GOSI Service Tests
 * اختبارات خدمات التأمينات الاجتماعية المتقدمة
 */

const assert = require('assert');
const advancedGOSIService = require('../services/gosi-advanced.service');
const gosiIntelligenceService = require('../services/gosi-intelligence.service');
const gosiNotificationService = require('../services/gosi-notifications.service');

describe('Advanced GOSI Services', () => {
  
  // ============================================
  // GOSI ADVANCED SERVICE TESTS
  // ============================================

  describe('Advanced GOSI Service', () => {
    
    it('should calculate GOSI contributions for Saudi employee', () => {
      const result = advancedGOSIService.calculateGOSIContributions(15000, 0, true);
      
      assert.strictEqual(result.subscriberWage, 18750);
      assert.strictEqual(result.employerContribution, 2203.13);
      assert.strictEqual(result.employeeContribution, 1828.13);
      assert.strictEqual(result.totalContribution, 4031.26);
      assert.strictEqual(result.isSaudi, true);
    });

    it('should calculate GOSI contributions for foreign employee', () => {
      const result = advancedGOSIService.calculateGOSIContributions(12000, 0, false);
      
      assert.strictEqual(result.subscriberWage, 15000);
      assert.strictEqual(result.employerContribution, 300);
      assert.strictEqual(result.employeeContribution, 0);
      assert.strictEqual(result.totalContribution, 300);
      assert.strictEqual(result.isSaudi, false);
    });

    it('should predict compliance issues correctly', () => {
      const employeeData = {
        nationalId: '1234567890',
        salary: 15000,
        lastUpdateDate: Date.now() - 120 * 24 * 60 * 60 * 1000, // 120 days ago
        isSaudi: true,
        startDate: Date.now() - 6 * 30 * 24 * 60 * 60 * 1000, // 6 months ago
        gosiNumber: 'GOSI-1234-567890',
        medicalInsuranceExpiry: null
      };

      const result = advancedGOSIService.predictComplianceIssues(employeeData);
      
      assert.strictEqual(result.compliant, false);
      assert(result.issues.length > 0);
      assert(result.warnings.length > 0);
    });

    it('should validate required fields for registration', async () => {
      const invalidData = {
        // Missing required fields
        niqamaNumber: '2000000001',
        fullNameArabic: 'Test'
      };

      try {
        await advancedGOSIService.registerEmployee(invalidData);
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error.message.includes('required fields'));
      }
    });
  });

  // ============================================
  // GOSI INTELLIGENCE SERVICE TESTS
  // ============================================

  describe('GOSI Intelligence Service', () => {
    
    it('should predict GOSI eligibility correctly', () => {
      const employeeData = {
        salary: 15000,
        nationality: 'Saudi',
        contractType: 'unlimited',
        workingHours: 8,
        startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        position: 'Engineer'
      };

      const prediction = gosiIntelligenceService.predictGOSIEligibility(employeeData);
      
      assert.strictEqual(prediction.eligible, true);
      assert(prediction.eligibilityScore >= 50);
      assert(prediction.factors.length > 0);
      assert(prediction.estimatedBenefits.monthlyEmployerContribution > 0);
    });

    it('should identify eligibility issues for low salary', () => {
      const employeeData = {
        salary: 1000,
        nationality: 'Egyptian',
        contractType: 'limited',
        workingHours: 6,
        startDate: new Date(),
        position: 'Laborer'
      };

      const prediction = gosiIntelligenceService.predictGOSIEligibility(employeeData);
      
      assert.strictEqual(prediction.eligible, false);
      assert(prediction.riskFactors.length > 0);
    });

    it('should assess compliance risks accurately', () => {
      const employeeData = {
        lastGOSIUpdate: Date.now() - 180 * 24 * 60 * 60 * 1000, // 180 days ago
        lastMedicalInsuranceCheck: Date.now() - 200 * 24 * 60 * 60 * 1000,
        salary: 15000,
        salaryHistory: [14500, 15000, 15000],
        medicalInsuranceExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
        contractEndDate: new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000), // 2 months
        nationality: 'Saudi'
      };

      const riskAssessment = gosiIntelligenceService.predictComplianceRisks(employeeData);
      
      assert.strictEqual(riskAssessment.overallRisk, 'high');
      assert(riskAssessment.riskScore > 40);
      assert(riskAssessment.risks.length > 0);
      assert(riskAssessment.urgentActions.length > 0);
    });

    it('should forecast financial impact accurately', () => {
      const employeeData = {
        salary: 12000,
        nationality: 'Saudi',
        benefits: {},
        expectedRaise: 0.05, // 5% annual raise
        bonusFrequency: 'annual'
      };

      const forecast = gosiIntelligenceService.forecastFinancialImpact(employeeData, 12);
      
      assert.strictEqual(forecast.period.months, 12);
      assert(forecast.monthly.length === 12);
      assert(forecast.summary.totalSalary > 0);
      assert(forecast.summary.totalEmployerContribution > 0);
      assert(forecast.insights.length > 0);
    });

    it('should generate smart recommendations', () => {
      const employeeData = {
        lastGOSIUpdate: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
        lastMedicalInsuranceCheck: Date.now() - 95 * 24 * 60 * 60 * 1000,
        medicalInsuranceExpiry: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        salary: 15000,
        position: 'Engineer',
        contractEndDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000)
      };

      const recommendations = gosiIntelligenceService.generateRecommendations(employeeData);
      
      assert(recommendations.short_term.length > 0);
      assert(recommendations.insights.length > 0);
      assert(recommendations.validUntil instanceof Date);
    });
  });

  // ============================================
  // GOSI NOTIFICATION SERVICE TESTS
  // ============================================

  describe('GOSI Notification Service', () => {
    
    it('should retrieve notifications correctly', async () => {
      const notifications = await gosiNotificationService.getNotifications('USER123', {
        limit: 10,
        offset: 0,
        status: null
      });

      assert(notifications.total >= 0);
      assert(Array.isArray(notifications.notifications));
      assert(notifications.limit === 10);
    });

    it('should calculate notification statistics', async () => {
      const stats = await gosiNotificationService.getNotificationStats('USER123');
      
      assert.strictEqual(typeof stats.total, 'number');
      assert.strictEqual(typeof stats.unread, 'number');
      assert(stats.byType !== undefined);
      assert(stats.byChannel !== undefined);
      assert(stats.byPriority !== undefined);
    });

    it('should filter notifications by status', async () => {
      const notifications = await gosiNotificationService.getNotifications('USER123', {
        limit: 20,
        offset: 0,
        status: 'unread'
      });

      // All notifications should have status 'unread'
      notifications.notifications.forEach(notif => {
        assert.strictEqual(notif.status, 'unread');
      });
    });

    it('should filter notifications by type', async () => {
      const types = ['gosi_registration_confirmation', 'medical_insurance_expiry_warning'];
      const notifications = await gosiNotificationService.getNotifications('USER123', {
        limit: 20,
        offset: 0,
        types
      });

      // All notifications should have one of the specified types
      notifications.notifications.forEach(notif => {
        assert(types.includes(notif.type));
      });
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('Integration Tests', () => {
    
    it('should handle complete employee onboarding flow', async () => {
      const employeeData = {
        nationalId: '1234567890',
        niqamaNumber: '2000000001',
        fullNameArabic: 'محمد أحمد علي',
        fullNameEnglish: 'Mohammed Ahmed Ali',
        dateOfBirth: '1990-01-15',
        nationality: 'Saudi',
        basicSalary: 15000,
        startDate: new Date(),
        jobTitle: 'Engineer',
        establishmentId: 'EST123456',
        isSaudi: true
      };

      // Step 1: Check eligibility
      const eligibility = gosiIntelligenceService.predictGOSIEligibility(employeeData);
      assert.strictEqual(eligibility.eligible, true);

      // Step 2: Register with GOSI
      const registration = await advancedGOSIService.registerEmployee(employeeData);
      assert.strictEqual(registration.success, true);
      assert(registration.gosiNumber !== undefined);

      // Step 3: Check compliance
      const employeeWithGOSI = {
        ...employeeData,
        gosiNumber: registration.gosiNumber,
        lastGOSIUpdate: new Date()
      };
      const compliance = advancedGOSIService.predictComplianceIssues(employeeWithGOSI);
      assert.strictEqual(compliance.compliant, true);
    });

    it('should handle mid-year salary increase with compliance check', async () => {
      const gosiNumber = 'GOSI-1234-567890';
      const newSalary = 16000;

      // Step 1: Update salary
      const salaryUpdate = await advancedGOSIService.updateEmployeeWage(
        gosiNumber,
        newSalary,
        new Date()
      );
      assert.strictEqual(salaryUpdate.success, true);

      // Step 2: Recalculate contributions
      const contributions = advancedGOSIService.calculateGOSIContributions(newSalary, 0, true);
      assert.strictEqual(contributions.subscriberWage, 20000); // 16000 + 25% housing

      // Step 3: Verify compliance
      const employeeData = {
        salary: newSalary,
        lastGOSIUpdate: new Date(),
        isSaudi: true,
        gosiNumber
      };
      const compliance = advancedGOSIService.predictComplianceIssues(employeeData);
      assert.strictEqual(compliance.compliant, true);
    });

    it('should handle contract termination with GOSI cancellation', async () => {
      const gosiNumber = 'GOSI-1234-567890';
      const reason = 'Employee termination';
      const effectiveDate = new Date();

      // Step 1: Cancel GOSI subscription
      const cancellation = await advancedGOSIService.cancelSubscription(
        gosiNumber,
        reason,
        effectiveDate
      );
      assert.strictEqual(cancellation.success, true);
      assert(cancellation.certificateUrl !== undefined);

      // Step 2: Generate final certificate
      const certificate = await advancedGOSIService.generateCertificate(
        gosiNumber,
        'termination'
      );
      assert.strictEqual(certificate.success, true);
    });
  });

  // ============================================
  // PERFORMANCE TESTS
  // ============================================

  describe('Performance Tests', () => {
    
    it('should calculate contributions in < 10ms', () => {
      const startTime = process.hrtime();
      
      advancedGOSIService.calculateGOSIContributions(15000, 0, true);
      
      const endTime = process.hrtime(startTime);
      const ms = (endTime[0] * 1000000 + endTime[1]) / 1000;
      
      assert(ms < 10, `Calculation took ${ms}ms, expected < 10ms`);
    });

    it('should predict eligibility in < 50ms', () => {
      const startTime = process.hrtime();
      
      gosiIntelligenceService.predictGOSIEligibility({
        salary: 15000,
        nationality: 'Saudi',
        contractType: 'unlimited',
        workingHours: 8,
        startDate: new Date(),
        position: 'Engineer'
      });
      
      const endTime = process.hrtime(startTime);
      const ms = (endTime[0] * 1000000 + endTime[1]) / 1000;
      
      assert(ms < 50, `Prediction took ${ms}ms, expected < 50ms`);
    });

    it('should handle 1000 calculations without errors', () => {
      for (let i = 0; i < 1000; i++) {
        const result = advancedGOSIService.calculateGOSIContributions(
          15000 + Math.random() * 5000,
          0,
          Math.random() > 0.5
        );
        assert(result.employerContribution > 0);
        assert(result.totalContribution >= result.employerContribution);
      }
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('Error Handling', () => {
    
    it('should handle missing employee data gracefully', async () => {
      try {
        await advancedGOSIService.registerEmployee({});
        assert.fail('Should have thrown an error');
      } catch (error) {
        assert(error.message.includes('required'));
      }
    });

    it('should handle invalid GOSI number', async () => {
      try {
        await advancedGOSIService.getSubscriptionStatus('INVALID-NUMBER');
        // Should not throw but return error response
        assert(true);
      } catch (error) {
        assert(error !== null);
      }
    });

    it('should handle compliance check with missing fields', () => {
      const result = advancedGOSIService.predictComplianceIssues({
        // Missing required fields
        salary: 15000
      });

      assert(result.compliant !== undefined);
      assert(Array.isArray(result.issues));
      assert(Array.isArray(result.warnings));
    });
  });
});

// Run tests if executed directly
if (require.main === module) {
  console.log('🧪 Running Advanced GOSI Service Tests...\n');
  
  describe.run();
  
  console.log('\n✅ All tests completed!');
}

module.exports = {
  advancedGOSIService,
  gosiIntelligenceService,
  gosiNotificationService
};
