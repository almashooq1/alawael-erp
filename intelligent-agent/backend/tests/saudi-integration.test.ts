/**
 * Saudi Integration Service Tests
 * اختبارات شاملة لخدمة التكامل مع الأنظمة السعودية
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import SaudiIntegrationService from '../services/saudi-integration.service';
import SaudiEmployee from '../models/saudi-employee.model';

describe('Saudi Integration Service Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.SAUDI_INTEGRATION_MOCK = 'true';

    mongoServer = await MongoMemoryServer.create();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await SaudiEmployee.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  // ============================================
  // National ID & Iqama Verification Tests
  // ============================================

  describe('National ID Verification', () => {
    it('should verify valid Saudi National ID', async () => {
      const nationalId = '1234567890';
      const result = await SaudiIntegrationService.verifySaudiNationalId(nationalId);

      expect(result).toBeDefined();
      expect(result.nationalId).toBe(nationalId);
      expect(result.fullNameArabic).toBeDefined();
    });

    it('should reject invalid National ID format', async () => {
      const invalidId = '9234567890'; // Should start with 1

      await expect(SaudiIntegrationService.verifySaudiNationalId(invalidId)).rejects.toThrow(
        'Invalid National ID format'
      );
    });

    it('should reject National ID with wrong length', async () => {
      const shortId = '123456789'; // Only 9 digits

      await expect(SaudiIntegrationService.verifySaudiNationalId(shortId)).rejects.toThrow(
        'Invalid National ID format'
      );
    });
  });

  describe('Iqama Verification', () => {
    it('should verify valid Iqama number', async () => {
      const iqamaNumber = '2345678901';
      const result = await SaudiIntegrationService.verifyIqama(iqamaNumber);

      expect(result).toBeDefined();
      expect(result.iqamaNumber).toBe(iqamaNumber);
      expect(result.fullNameArabic).toBeDefined();
    });

    it('should reject invalid Iqama format', async () => {
      const invalidIqama = '1345678901'; // Should start with 2

      await expect(SaudiIntegrationService.verifyIqama(invalidIqama)).rejects.toThrow(
        'Invalid Iqama format'
      );
    });

    it('should check Iqama expiry correctly', async () => {
      const iqamaNumber = '2345678901';
      const result = await SaudiIntegrationService.checkIqamaExpiry(iqamaNumber);

      expect(result).toHaveProperty('isExpired');
      expect(result).toHaveProperty('expiryDate');
      expect(result).toHaveProperty('daysRemaining');
      expect(typeof result.daysRemaining).toBe('number');
    });
  });

  // ============================================
  // Ministry of Labor Tests
  // ============================================

  describe('Ministry of Labor Integration', () => {
    it('should register employee contract', async () => {
      const contract = {
        contractId: 'CONTRACT-TMP-001',
        employeeIqama: '2345678901',
        employerEstablishmentId: 'EST12345',
        contractType: 'limited' as const,
        jobTitle: 'Software Engineer',
        basicSalary: 15000,
        housingAllowance: 5000,
        transportAllowance: 1000,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2027-02-01'),
        workingHours: 8,
        contractStatus: 'active' as const,
      };

      const result = await SaudiIntegrationService.registerEmployeeContract(contract);

      expect(result).toBeDefined();
      expect(result.contractId).toBeDefined();
      expect(result.status).toBe('registered');
    });

    it('should update employee contract', async () => {
      const contractId = 'CONTRACT123';
      const updates = {
        basicSalary: 16000,
        housingAllowance: 5500,
      };

      const result = await SaudiIntegrationService.updateEmployeeContract(contractId, updates);

      expect(result.success).toBe(true);
    });

    it('should terminate employee contract', async () => {
      const contractId = 'CONTRACT123';
      const reason = 'End of contract period';
      const terminationDate = new Date('2027-02-01');

      const result = await SaudiIntegrationService.terminateContract(
        contractId,
        reason,
        terminationDate
      );

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toBeDefined();
    });

    it('should get Nitaqat status', async () => {
      const establishmentId = 'EST12345';
      const result = await SaudiIntegrationService.getNitaqatStatus(establishmentId);

      expect(result).toBeDefined();
      expect(result.nitaqatColor).toMatch(/^(platinum|green|yellow|red)$/);
      expect(result.saudizationRate).toBeGreaterThanOrEqual(0);
    });

    it('should submit WPS file', async () => {
      const payments = [
        {
          molReferenceNumber: 'WPS123',
          establishmentId: 'EST12345',
          paymentMonth: '2026-02',
          employeeIqama: '2345678901',
          basicSalary: 15000,
          housingAllowance: 5000,
          otherAllowances: 1000,
          deductions: 500,
          netSalary: 20500,
          paymentDate: new Date('2026-02-01'),
          paymentStatus: 'paid' as const,
          bankName: 'Al Rajhi Bank',
          ibanNumber: 'SA0380000000608010167519',
        },
      ];

      const result = await SaudiIntegrationService.submitWageProtection(payments);

      expect(result.referenceNumber).toBeDefined();
      expect(result.status).toBe('accepted');
    });
  });

  // ============================================
  // GOSI Tests
  // ============================================

  describe('GOSI Integration', () => {
    it('should register Saudi employee with GOSI', async () => {
      const employee = {
        nationalId: '1234567890',
        fullName: 'أحمد محمد علي',
        dateOfBirth: new Date('1990-01-15'),
        basicSalary: 15000,
        startDate: new Date('2026-02-01'),
      };

      const result = await SaudiIntegrationService.registerEmployeeWithGOSI(employee);

      expect(result).toBeDefined();
      expect(result.gosiNumber).toBeDefined();
      expect(result.subscriptionStatus).toBe('active');
    });

    it('should calculate GOSI contributions for Saudi employee', () => {
      const basicSalary = 15000;
      const isSaudi = true;

      const result = SaudiIntegrationService.calculateGOSIContributions(basicSalary, isSaudi);

      // Saudi: 21.5% total (11.75% employer, 9.75% employee)
      expect(result.employerContribution).toBe(15000 * 0.1175); // 1762.5
      expect(result.employeeContribution).toBe(15000 * 0.0975); // 1462.5
      expect(result.total).toBe(15000 * 0.215); // 3225
    });

    it('should calculate GOSI contributions for foreign employee', () => {
      const basicSalary = 15000;
      const isSaudi = false;

      const result = SaudiIntegrationService.calculateGOSIContributions(basicSalary, isSaudi);

      // Foreign: 2% employer only
      expect(result.employerContribution).toBe(15000 * 0.02); // 300
      expect(result.employeeContribution).toBe(0);
      expect(result.total).toBe(15000 * 0.02); // 300
    });

    it('should update GOSI subscription', async () => {
      const gosiNumber = 'GOSI123456';
      const newWage = 16000;

      const result = await SaudiIntegrationService.updateGOSISubscription(gosiNumber, newWage);

      expect(result.success).toBe(true);
    });

    it('should cancel GOSI subscription', async () => {
      const gosiNumber = 'GOSI123456';
      const reason = 'Employee termination';
      const effectiveDate = new Date('2027-02-01');

      const result = await SaudiIntegrationService.cancelGOSISubscription(
        gosiNumber,
        reason,
        effectiveDate
      );

      expect(result.success).toBe(true);
      expect(result.certificateUrl).toBeDefined();
    });
  });

  // ============================================
  // Medical Insurance Tests
  // ============================================

  describe('Medical Insurance Integration', () => {
    it('should register medical insurance policy', async () => {
      const insurance = {
        insuranceCompany: 'Bupa Arabia',
        employeeId: 'EMP001',
        nationalId: '1234567890',
        coverageType: 'class-a' as const,
        coverageAmount: 500000,
        startDate: new Date('2026-02-01'),
        expiryDate: new Date('2027-02-01'),
        status: 'active' as const,
        dependents: 2,
        coPaymentPercentage: 10,
      };

      const result = await SaudiIntegrationService.registerMedicalInsurance(insurance);

      expect(result).toBeDefined();
      expect(result.policyNumber).toBeDefined();
      expect(result.insuranceCompany).toBe('Bupa Arabia');
    });

    it('should renew medical insurance', async () => {
      const policyNumber = 'POL123456';
      const newExpiryDate = new Date('2028-02-01');

      const result = await SaudiIntegrationService.renewMedicalInsurance(
        policyNumber,
        newExpiryDate
      );

      expect(result.success).toBe(true);
      expect(result.newPolicyNumber).toBeDefined();
    });

    it('should check medical insurance validity', async () => {
      const policyNumber = 'POL123456';
      const result = await SaudiIntegrationService.checkMedicalInsuranceValidity(policyNumber);

      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('expiryDate');
      expect(result).toHaveProperty('daysRemaining');
    });
  });

  // ============================================
  // Visa & Exit Re-Entry Tests
  // ============================================

  describe('Visa & Exit Re-Entry', () => {
    it('should request single exit re-entry', async () => {
      const iqamaNumber = '2345678901';
      const type = 'single';
      const duration = 90;

      const result = await SaudiIntegrationService.requestExitReEntry(iqamaNumber, type, duration);

      expect(result).toBeDefined();
      expect(result.requestId).toBeDefined();
      expect(result.requestType).toBe('single');
    });

    it('should request multiple exit re-entry', async () => {
      const iqamaNumber = '2345678901';
      const type = 'multiple';
      const duration = 180;

      const result = await SaudiIntegrationService.requestExitReEntry(iqamaNumber, type, duration);

      expect(result).toBeDefined();
      expect(result.requestType).toBe('multiple');
    });

    it('should check exit re-entry status', async () => {
      const requestId = 'ERE123456';
      const result = await SaudiIntegrationService.checkExitReEntryStatus(requestId);

      expect(result).toBeDefined();
      expect(result.status).toMatch(/^(active|used|expired|cancelled)$/);
    });

    it('should request final exit', async () => {
      const iqamaNumber = '2345678901';
      const reason = 'Contract completion';

      const result = await SaudiIntegrationService.requestFinalExit(iqamaNumber, reason);

      expect(result.requestId).toBeDefined();
      expect(result.status).toBeDefined();
    });
  });

  // ============================================
  // Validation Tests
  // ============================================

  describe('Validation Functions', () => {
    it('should validate Saudi phone numbers', () => {
      const validPhones = ['+966501234567', '0501234567'];
      const invalidPhones = ['+966401234567', '501234567', '+966'];

      validPhones.forEach(phone => {
        expect(SaudiIntegrationService.validateSaudiPhone(phone)).toBe(true);
      });

      invalidPhones.forEach(phone => {
        expect(SaudiIntegrationService.validateSaudiPhone(phone)).toBe(false);
      });
    });

    it('should validate Saudi IBAN', () => {
      const validIBAN = 'SA0380000000608010167519';
      const invalidIBANs = [
        'SA038000000060801016751', // Too short
        'AE0380000000608010167519', // Wrong country
        'SA03800000006080101675191', // Too long
      ];

      expect(SaudiIntegrationService.validateSaudiIBAN(validIBAN)).toBe(true);

      invalidIBANs.forEach(iban => {
        expect(SaudiIntegrationService.validateSaudiIBAN(iban)).toBe(false);
      });
    });
  });

  // ============================================
  // Compliance Tests
  // ============================================

  describe('Compliance Checks', () => {
    it('should run comprehensive compliance check', async () => {
      const employeeData = {
        iqamaNumber: '2345678901',
        medicalInsurancePolicyNumber: 'POL123456',
      };

      const result = await SaudiIntegrationService.runComplianceCheck(employeeData);

      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should detect expired Iqama', async () => {
      // Mock expired iqama
      const expiredIqama = '2999999999';

      const result = await SaudiIntegrationService.runComplianceCheck({
        iqamaNumber: expiredIqama,
      });

      // Should have compliance issues
      expect(result.compliant).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should warn about expiring documents', async () => {
      const soonExpiringIqama = '2888888888';

      const result = await SaudiIntegrationService.runComplianceCheck({
        iqamaNumber: soonExpiringIqama,
      });

      // Should have warnings
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Employee Model Tests
  // ============================================

  describe('Saudi Employee Model', () => {
    it('should create Saudi employee', async () => {
      const employeeData = {
        employeeCode: 'EMP001',
        fullNameArabic: 'أحمد محمد علي',
        fullNameEnglish: 'Ahmed Mohammed Ali',
        identificationType: 'national-id',
        nationalId: '1234567890',
        dateOfBirth: new Date('1990-01-15'),
        placeOfBirth: 'الرياض',
        gender: 'male',
        maritalStatus: 'married',
        nationality: 'Saudi',
        mobileNumber: '+966501234567',
        email: 'ahmed@example.com',
        address: {
          buildingNumber: '1234',
          streetName: 'شارع الملك فهد',
          district: 'العليا',
          city: 'الرياض',
          postalCode: '12345',
          additionalNumber: '5678',
          province: 'الرياض',
        },
        emergencyContact: {
          name: 'محمد علي',
          relationship: 'أب',
          phoneNumber: '+966501234568',
        },
        mol: {
          establishmentId: 'EST12345',
          laborOfficeId: 'LOF001',
          contractType: 'unlimited',
          jobTitle: 'Engineer',
          jobTitleArabic: 'مهندس',
          occupation: 'هندسة',
          startDate: new Date('2026-02-01'),
        },
        gosi: {
          subscriptionStatus: 'not-registered',
          subscriberWage: 15000,
        },
        medicalInsurance: {
          insuranceCompany: 'Bupa Arabia',
          insuranceClass: 'class-a',
          coverageAmount: 500000,
          startDate: new Date('2026-02-01'),
          expiryDate: new Date('2027-02-01'),
          dependents: 0,
          coPaymentPercentage: 10,
        },
        salary: {
          basicSalary: 15000,
          housingAllowance: 5000,
          transportAllowance: 1000,
          totalSalary: 21000,
          currency: 'SAR',
          paymentMethod: 'bank-transfer',
          iban: 'SA0380000000608010167519',
        },
        employment: {
          employmentType: 'full-time',
          department: 'IT',
          position: 'Senior Engineer',
          workLocation: 'الرياض',
          workSchedule: {
            workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
            workingHours: 8,
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60,
          },
        },
        saudization: {
          isSaudi: true,
          contributeToNitaqat: true,
          nitaqatImpact: 'green',
        },
        status: 'active',
      };

      const employee = new SaudiEmployee(employeeData);
      await employee.save();

      expect(employee._id).toBeDefined();
      expect(employee.employeeCode).toBe('EMP001');
      expect(employee.salary.totalSalary).toBe(21000);
    });

    it('should calculate total salary automatically', async () => {
      const employee = new SaudiEmployee({
        employeeCode: 'EMP002',
        fullNameArabic: 'محمد أحمد',
        fullNameEnglish: 'Mohammed Ahmed',
        identificationType: 'national-id',
        nationalId: '1234567891',
        dateOfBirth: new Date('1992-03-10'),
        placeOfBirth: 'جدة',
        gender: 'male',
        maritalStatus: 'single',
        nationality: 'Saudi',
        mobileNumber: '+966501234569',
        email: 'mohammed@example.com',
        address: {
          buildingNumber: '5678',
          streetName: 'شارع التحلية',
          district: 'الروضة',
          city: 'جدة',
          postalCode: '54321',
          additionalNumber: '9876',
          province: 'مكة المكرمة',
        },
        emergencyContact: {
          name: 'أحمد محمد',
          relationship: 'أب',
          phoneNumber: '+966501234570',
        },
        mol: {
          establishmentId: 'EST12345',
          laborOfficeId: 'LOF002',
          contractType: 'unlimited',
          jobTitle: 'Engineer',
          jobTitleArabic: 'مهندس',
          occupation: 'هندسة',
          startDate: new Date('2026-02-01'),
        },
        medicalInsurance: {
          insuranceCompany: 'Bupa Arabia',
          insuranceClass: 'class-a',
          coverageAmount: 500000,
          startDate: new Date('2026-02-01'),
          expiryDate: new Date('2027-02-01'),
          dependents: 0,
          coPaymentPercentage: 10,
        },
        salary: {
          basicSalary: 10000,
          housingAllowance: 3000,
          transportAllowance: 500,
          foodAllowance: 500,
          totalSalary: 0, // Will be calculated
          currency: 'SAR',
          paymentMethod: 'bank-transfer',
          iban: 'SA0380000000608010167519',
        },
        employment: {
          employmentType: 'full-time',
          department: 'IT',
          position: 'Engineer',
          workLocation: 'جدة',
          workSchedule: {
            workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
            workingHours: 8,
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60,
          },
        },
        saudization: {
          isSaudi: true,
          contributeToNitaqat: true,
          nitaqatImpact: 'green',
        },
        status: 'active',
      });

      await employee.save();

      // Total should be calculated: 10000 + 3000 + 500 + 500 = 14000
      expect(employee.salary.totalSalary).toBe(14000);
    });

    it('should validate National ID format', async () => {
      const employee = new SaudiEmployee({
        employeeCode: 'EMP003',
        nationalId: '9234567890', // Invalid: should start with 1
        // ... other fields
      });

      await expect(employee.save()).rejects.toThrow();
    });

    it('should validate Iqama format', async () => {
      const employee = new SaudiEmployee({
        employeeCode: 'EMP004',
        iqamaNumber: '1345678901', // Invalid: should start with 2
        // ... other fields
      });

      await expect(employee.save()).rejects.toThrow();
    });

    it('should validate IBAN format', async () => {
      const employee = new SaudiEmployee({
        employeeCode: 'EMP005',
        salary: {
          iban: 'AE0380000000608010167519', // Invalid: should start with SA
          // ... other fields
        },
        // ... other fields
      });

      await expect(employee.save()).rejects.toThrow();
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('End-to-End Integration', () => {
    it('should complete full employee onboarding process', async () => {
      // 1. Verify National ID
      const nationalId = '1234567890';
      const idVerification = await SaudiIntegrationService.verifySaudiNationalId(nationalId);
      expect(idVerification).toBeDefined();

      // 2. Create Employee Record
      const employee = new SaudiEmployee({
        employeeCode: 'EMP999',
        fullNameArabic: idVerification.fullNameArabic,
        fullNameEnglish: idVerification.fullNameEnglish,
        identificationType: 'national-id',
        nationalId: nationalId,
        dateOfBirth: new Date('1990-01-15'),
        placeOfBirth: 'الرياض',
        gender: 'male',
        maritalStatus: 'married',
        nationality: 'Saudi',
        mobileNumber: '+966501234567',
        email: 'ahmed999@example.com',
        address: {
          buildingNumber: '1234',
          streetName: 'شارع الملك فهد',
          district: 'العليا',
          city: 'الرياض',
          postalCode: '12345',
          additionalNumber: '5678',
          province: 'الرياض',
        },
        emergencyContact: {
          name: 'محمد علي',
          relationship: 'أب',
          phoneNumber: '+966501234568',
        },
        mol: {
          establishmentId: 'EST12345',
          laborOfficeId: 'LOF001',
          contractType: 'unlimited',
          jobTitle: 'Engineer',
          jobTitleArabic: 'مهندس',
          occupation: 'هندسة',
          startDate: new Date('2026-02-01'),
        },
        medicalInsurance: {
          insuranceCompany: 'Bupa Arabia',
          insuranceClass: 'class-a',
          coverageAmount: 500000,
          startDate: new Date('2026-02-01'),
          expiryDate: new Date('2027-02-01'),
          dependents: 0,
          coPaymentPercentage: 10,
        },
        salary: {
          basicSalary: 15000,
          housingAllowance: 5000,
          transportAllowance: 1000,
          totalSalary: 21000,
          currency: 'SAR',
          paymentMethod: 'bank-transfer',
          iban: 'SA0380000000608010167519',
        },
        employment: {
          employmentType: 'full-time',
          department: 'IT',
          position: 'Senior Engineer',
          workLocation: 'الرياض',
          workSchedule: {
            workingDays: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'],
            workingHours: 8,
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60,
          },
        },
        saudization: {
          isSaudi: true,
          contributeToNitaqat: true,
          nitaqatImpact: 'green',
        },
        status: 'active',
      });
      await employee.save();

      // 3. Register with MOL
      const contract = await SaudiIntegrationService.registerEmployeeContract({
        contractId: 'CONTRACT-TMP-999',
        employeeIqama: nationalId,
        employerEstablishmentId: 'EST12345',
        contractType: 'unlimited',
        jobTitle: 'Engineer',
        basicSalary: 15000,
        housingAllowance: 5000,
        transportAllowance: 1000,
        startDate: new Date('2026-02-01'),
        workingHours: 8,
        contractStatus: 'active',
      });
      expect(contract.contractId).toBeDefined();

      // 4. Register with GOSI
      const gosi = await SaudiIntegrationService.registerEmployeeWithGOSI({
        nationalId: nationalId,
        fullName: idVerification.fullNameArabic,
        dateOfBirth: new Date('1990-01-15'),
        basicSalary: 15000,
        startDate: new Date('2026-02-01'),
      });
      expect(gosi.gosiNumber).toBeDefined();

      // 5. Register Medical Insurance
      const insurance = await SaudiIntegrationService.registerMedicalInsurance({
        insuranceCompany: 'Bupa Arabia',
        employeeId: employee.id,
        nationalId: nationalId,
        coverageType: 'class-a',
        coverageAmount: 500000,
        startDate: new Date('2026-02-01'),
        expiryDate: new Date('2027-02-01'),
        status: 'active',
        dependents: 0,
        coPaymentPercentage: 10,
      });
      expect(insurance.policyNumber).toBeDefined();

      // 6. Run Compliance Check
      const compliance = await SaudiIntegrationService.runComplianceCheck({
        nationalId: nationalId,
        contractId: contract.contractId,
        gosiNumber: gosi.gosiNumber,
        medicalInsurancePolicyNumber: insurance.policyNumber,
      });
      expect(compliance.compliant).toBe(true);
    });
  });
});
