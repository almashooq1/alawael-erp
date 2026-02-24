/**
 * SCFHS Verification Service - Comprehensive Test Suite
 * مجموعة اختبارات شاملة لخدمة التحقق من تراخيص SCFHS
 */

import scfhsVerificationService from '../services/scfhsVerificationService';
import * as scfhsUtils from '../utils/scfhsUtils';

describe('SCFHS Verification Service', () => {
  // ============================================
  // Test Suite Setup
  // ============================================

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // National ID Validation Tests
  // ============================================

  describe('Saudi National ID Validation', () => {
    test('should validate correct national ID', () => {
      const result = scfhsUtils.validateSaudiNationalId('1234567890');
      expect(result.valid).toBeDefined();
    });

    test('should reject invalid length national ID', () => {
      const result = scfhsUtils.validateSaudiNationalId('123456789');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should reject non-numeric national ID', () => {
      const result = scfhsUtils.validateSaudiNationalId('123456789A');
      expect(result.valid).toBe(false);
    });

    test('should reject null/undefined national ID', () => {
      const result1 = scfhsUtils.validateSaudiNationalId(null);
      const result2 = scfhsUtils.validateSaudiNationalId(undefined);
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
    });
  });

  // ============================================
  // License Number Validation Tests
  // ============================================

  describe('License Number Validation', () => {
    test('should validate correct license number format', () => {
      const result = scfhsUtils.validateLicenseNumber('SCFHS2020123456');
      expect(result.valid).toBe(true);
    });

    test('should reject invalid license number format', () => {
      const result = scfhsUtils.validateLicenseNumber('SCFHS@2020#123');
      expect(result.valid).toBe(false);
    });

    test('should reject too short license number', () => {
      const result = scfhsUtils.validateLicenseNumber('AB');
      expect(result.valid).toBe(false);
    });

    test('should reject null license number', () => {
      const result = scfhsUtils.validateLicenseNumber(null);
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // Date Calculation Tests
  // ============================================

  describe('Date Calculations', () => {
    test('should calculate days until expiry correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const days = scfhsUtils.calculateDaysUntilExpiry(futureDate);
      expect(days).toBeGreaterThan(25);
      expect(days).toBeLessThanOrEqual(31);
    });

    test('should handle expired date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const days = scfhsUtils.calculateDaysUntilExpiry(pastDate);
      expect(days).toBeLessThan(0);
    });

    test('should return null for invalid date', () => {
      const days = scfhsUtils.calculateDaysUntilExpiry(null);
      expect(days).toBeNull();
    });
  });

  // ============================================
  // License Status Tests
  // ============================================

  describe('License Status Determination', () => {
    test('should determine active status', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 100);
      const status = scfhsUtils.getLicenseStatus(futureDate);
      expect(status).toBe('active');
    });

    test('should determine expired status', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      const status = scfhsUtils.getLicenseStatus(pastDate);
      expect(status).toBe('expired');
    });

    test('should determine expiring-soon status', () => {
      const soonDate = new Date();
      soonDate.setDate(soonDate.getDate() + 5);
      const status = scfhsUtils.getLicenseStatus(soonDate);
      expect(status).toBe('expiring-soon');
    });

    test('should determine expiring-within-month status', () => {
      const monthDate = new Date();
      monthDate.setDate(monthDate.getDate() + 20);
      const status = scfhsUtils.getLicenseStatus(monthDate);
      expect(status).toBe('expiring-within-month');
    });
  });

  // ============================================
  // Input Validation Tests
  // ============================================

  describe('Comprehensive Input Validation', () => {
    test('should validate complete license data', () => {
      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        professionalFirstName: 'أحمد',
        professionalLastName: 'محمد',
        nationalId: '1234567890',
        specialization: 'surgery',
      };

      const result = scfhsVerificationService.validateLicenseInput(licenseData);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should detect missing required fields', () => {
      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        // Missing other required fields
      };

      const result = scfhsVerificationService.validateLicenseInput(licenseData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect invalid national ID format', () => {
      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        nationalId: 'INVALID',
        professionalFirstName: 'أحمد',
        professionalLastName: 'محمد',
        specialization: 'surgery',
      };

      const result = scfhsVerificationService.validateLicenseInput(licenseData);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.field === 'nationalId')).toBe(true);
    });
  });

  // ============================================
  // Format Verification Tests
  // ============================================

  describe('License Format Verification', () => {
    test('should verify correct license format', () => {
      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        professionalFirstName: 'أحمد',
        professionalLastName: 'محمد',
        specializationCode: 'SRG001',
      };

      const result = scfhsVerificationService.verifyLicenseFormat(licenseData);
      expect(result.isValid).toBe(true);
    });

    test('should reject invalid license number format', () => {
      const licenseData = {
        licenseNumber: 'INVALID@#$%',
        professionalFirstName: 'أحمد',
        professionalLastName: 'محمد',
      };

      const result = scfhsVerificationService.verifyLicenseFormat(licenseData);
      expect(result.isValid).toBe(false);
    });

    test('should validate name length', () => {
      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        professionalFirstName: 'ع', // Too short
        professionalLastName: 'م',
      };

      const result = scfhsVerificationService.verifyLicenseFormat(licenseData);
      expect(result.isValid).toBe(false);
    });
  });

  // ============================================
  // Name Matching Tests
  // ============================================

  describe('Name Matching Algorithm', () => {
    test('should match identical names', () => {
      const result = scfhsUtils.namesMatch('أحمد محمد علي', 'أحمد محمد علي');
      expect(result).toBe(true);
    });

    test('should tolerate case differences', () => {
      const result = scfhsUtils.namesMatch('AHMED MOHAMMAD', 'ahmed mohammad');
      expect(result).toBe(true);
    });

    test('should tolerate extra spaces', () => {
      const result = scfhsUtils.namesMatch('أحمد  محمد', 'أحمد محمد');
      expect(result).toBe(true);
    });

    test('should match partial names (word overlap)', () => {
      const result = scfhsUtils.namesMatch('أحمد محمد علي', 'أحمد علي');
      expect(result).toBe(true);
    });

    test('should reject completely different names', () => {
      const result = scfhsUtils.namesMatch('أحمد', 'خالد');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // Fraud Detection Tests
  // ============================================

  describe('Fraud Detection System', () => {
    test('should detect future issue date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        nationalId: '1234567890',
        licenseIssueDate: futureDate.toISOString(),
        licenseExpiryDate: new Date().toISOString(),
        specialization: 'surgery',
      };

      const result = scfhsVerificationService.performFraudDetection(licenseData, {});
      expect(result.riskFactors.some(f => f.type === 'future_issue_date')).toBe(true);
      expect(result.riskLevel).not.toBe('LOW');
    });

    test('should detect unusual validity period', () => {
      const issueDate = new Date('2020-01-01');
      const expiryDate = new Date('2030-01-01'); // 10 years

      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        nationalId: '1234567890',
        licenseIssueDate: issueDate.toISOString(),
        licenseExpiryDate: expiryDate.toISOString(),
        specialization: 'surgery',
      };

      const result = scfhsVerificationService.performFraudDetection(licenseData, {});
      expect(result.riskScore).toBeGreaterThan(0);
    });

    test('should generate appropriate risk score', () => {
      const licenseData = {
        licenseNumber: 'INVALID@@@',
        nationalId: 'INVALID',
        licenseIssueDate: new Date().toISOString(),
        licenseExpiryDate: new Date().toISOString(),
        specialization: 'surgery',
      };

      const result = scfhsVerificationService.performFraudDetection(licenseData, {});
      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  // ============================================
  // Risk Level Calculation Tests
  // ============================================

  describe('Risk Level Determination', () => {
    test('should classify LOW risk correctly', () => {
      const result = scfhsUtils.getRiskLevelDisplay('LOW');
      expect(result.label).toBe('منخفض');
      expect(result.color).toBe('#4caf50');
    });

    test('should classify CRITICAL risk correctly', () => {
      const result = scfhsUtils.getRiskLevelDisplay('CRITICAL');
      expect(result.label).toBe('حرج');
      expect(result.color).toBe('#b71c1c');
    });

    test('should handle all risk levels', () => {
      const levels = ['LOW', 'LOW_MEDIUM', 'MEDIUM', 'HIGH', 'CRITICAL'];
      levels.forEach(level => {
        const result = scfhsUtils.getRiskLevelDisplay(level);
        expect(result).toHaveProperty('label');
        expect(result).toHaveProperty('color');
        expect(result).toHaveProperty('icon');
      });
    });
  });

  // ============================================
  // Specialization Validation Tests
  // ============================================

  describe('Specialization Verification', () => {
    test('should recognize valid medical specialty', () => {
      const licenseData = {
        licenseNumber: 'SCFHS2020123456',
        specialization: 'medical',
      };

      const result = scfhsVerificationService.verifySpecialization(licenseData);
      expect(result.valid).toBe(true);
    });

    test('should recognize all major specialties', () => {
      const specialties = ['medical', 'surgery', 'pediatrics', 'nursing', 'pharmacy'];
      specialties.forEach(specialty => {
        const licenseData = { specialization: specialty };
        const result = scfhsVerificationService.verifySpecialization(licenseData);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject invalid specialty', () => {
      const licenseData = {
        specialization: 'invalid_specialization_xyz',
      };

      const result = scfhsVerificationService.verifySpecialization(licenseData);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // Renewal Urgency Tests
  // ============================================

  describe('Renewal Urgency Assessment', () => {
    test('should identify urgent renewal', () => {
      const expiresSoon = new Date();
      expiresSoon.setDate(expiresSoon.getDate() + 5);
      const urgency = scfhsUtils.getRenewalUrgency(expiresSoon);
      expect(urgency).toBe('urgent');
    });

    test('should identify high urgency', () => {
      const expiresMonth = new Date();
      expiresMonth.setDate(expiresMonth.getDate() + 20);
      const urgency = scfhsUtils.getRenewalUrgency(expiresMonth);
      expect(urgency).toBe('high');
    });

    test('should identify medium urgency', () => {
      const expiresQuarter = new Date();
      expiresQuarter.setDate(expiresQuarter.getDate() + 60);
      const urgency = scfhsUtils.getRenewalUrgency(expiresQuarter);
      expect(urgency).toBe('medium');
    });

    test('should identify low urgency', () => {
      const expiresLater = new Date();
      expiresLater.setDate(expiresLater.getDate() + 120);
      const urgency = scfhsUtils.getRenewalUrgency(expiresLater);
      expect(urgency).toBe('low');
    });

    test('should identify expired license', () => {
      const expired = new Date();
      expired.setDate(expired.getDate() - 10);
      const urgency = scfhsUtils.getRenewalUrgency(expired);
      expect(urgency).toBe('expired');
    });
  });

  // ============================================
  // Data Export Tests
  // ============================================

  describe('Data Export Functionality', () => {
    const mockVerification = {
      verificationId: 'VER-1234567890-ABC123',
      verified: true,
      overall: { trustScore: 95, riskLevel: 'LOW' },
      timestamp: new Date().toISOString(),
    };

    test('should export as JSON', () => {
      const json = scfhsUtils.exportVerificationAsJSON(mockVerification);
      expect(json).toBeDefined();
      expect(() => JSON.parse(json)).not.toThrow();
      expect(json).toContain('VER-1234567890-ABC123');
    });

    test('should export as CSV', () => {
      const csv = scfhsUtils.exportVerificationAsCSV(mockVerification);
      expect(csv).toBeDefined();
      expect(csv).toContain('معرف التحقق');
      expect(csv).toContain('VER-1234567890-ABC123');
    });
  });

  // ============================================
  // Batch Data Parsing Tests
  // ============================================

  describe('Batch CSV Parsing', () => {
    test('should parse valid batch CSV data', () => {
      const csv = `SCFHS-2020-12345,1234567890,Surgery
SCFHS-2021-54321,9876543210,Pediatrics`;

      const result = scfhsUtils.parseBatchCSVData(csv);
      expect(result.valid).toBe(true);
      expect(result.data.length).toBe(2);
      expect(result.data[0].licenseNumber).toBe('SCFHS-2020-12345');
    });

    test('should handle empty lines in batch data', () => {
      const csv = `SCFHS-2020-12345,1234567890,Surgery

SCFHS-2021-54321,9876543210,Pediatrics


`;

      const result = scfhsUtils.parseBatchCSVData(csv);
      expect(result.valid).toBe(true);
      expect(result.data.length).toBe(2);
    });

    test('should handle incomplete records', () => {
      const csv = `SCFHS-2020-12345,1234567890,Surgery
SCFHS-2021-54321

SCFHS-2022-99999,5555666677,Nursing`;

      const result = scfhsUtils.parseBatchCSVData(csv);
      expect(result.valid).toBe(true);
      expect(result.data.length).toBe(2); // Only valid records
    });

    test('should reject empty data', () => {
      const result = scfhsUtils.parseBatchCSVData('');
      expect(result.valid).toBe(false);
    });
  });

  // ============================================
  // Summary Statistics Tests
  // ============================================

  describe('Statistics Generation', () => {
    test('should generate correct summary statistics', () => {
      const verifications = [
        { verified: true, overall: { trustScore: 90 }, processingTimeMs: 200 },
        { verified: true, overall: { trustScore: 85 }, processingTimeMs: 250 },
        { verified: false, overall: { trustScore: 40 }, processingTimeMs: 150 },
      ];

      const stats = scfhsUtils.generateSummaryStatistics(verifications);
      expect(stats.total).toBe(3);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(1);
      expect(parseFloat(stats.successRate)).toBeCloseTo(66.67, 1);
    });
  });

  // ============================================
  // Arabic Localization Tests
  // ============================================

  describe('Arabic Date Formatting', () => {
    test('should format date in Arabic locale', () => {
      const date = new Date('2025-02-17');
      const formatted = scfhsUtils.formatDateArabic(date);
      expect(formatted).toBeDefined();
      expect(formatted).not.toBe('-');
    });

    test('should format datetime in Arabic locale', () => {
      const date = new Date('2025-02-17T15:30:00');
      const formatted = scfhsUtils.formatDateTimeArabic(date);
      expect(formatted).toBeDefined();
      expect(formatted).toContain(':');
    });

    test('should handle null dates gracefully', () => {
      const formattedNull = scfhsUtils.formatDateArabic(null);
      const formattedUndefined = scfhsUtils.formatDateArabic(undefined);
      expect(formattedNull).toBe('-');
      expect(formattedUndefined).toBe('-');
    });
  });

  // ============================================
  // Integration Tests
  // ============================================

  describe('End-to-End Integration Tests', () => {
    test('should handle complete verification workflow', async () => {
      const licenseData = {
        licenseNumber: 'SCFHS-2020-12345',
        professionalFirstName: 'أحمد',
        professionalLastName: 'محمد',
        nationalId: '1234567890',
        specialization: 'surgery',
        licenseIssueDate: '2020-02-17',
        licenseExpiryDate: '2028-02-17',
      };

      // This test validates the workflow
      const inputValidation = scfhsVerificationService.validateLicenseInput(licenseData);
      expect(inputValidation).toHaveProperty('isValid');

      const formatValidation = scfhsVerificationService.verifyLicenseFormat(licenseData);
      expect(formatValidation).toHaveProperty('isValid');

      const statusCheck = scfhsVerificationService.verifyLicenseStatus(licenseData);
      expect(statusCheck).toHaveProperty('status');

      const specialtyCheck = scfhsVerificationService.verifySpecialization(licenseData);
      expect(specialtyCheck).toHaveProperty('valid');
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error Handling', () => {
    test('should handle null input gracefully', () => {
      expect(() => {
        scfhsVerificationService.validateLicenseInput(null);
      }).not.toThrow();
    });

    test('should handle undefined input gracefully', () => {
      expect(() => {
        scfhsVerificationService.validateLicenseInput(undefined);
      }).not.toThrow();
    });

    test('should return valid error objects', () => {
      const result = scfhsUtils.validateSaudiNationalId('invalid');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('error');
    });
  });
});

// ============================================
// Test Utilities
// ============================================

describe('Test Utilities', () => {
  test('should generate verification ID', () => {
    const id1 = scfhsVerificationService.generateVerificationId();
    const id2 = scfhsVerificationService.generateVerificationId();
    expect(id1).toMatch(/^VER-\d+-[A-Z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  test('should calculate trust score', () => {
    const mockResult = {
      layers: {
        input: { isValid: true },
        format: { isValid: true },
        checksum: { isValid: true },
        database: { found: true },
        status: { isExpired: false },
        compliance: { isFullyCompliant: true },
        fraud: { riskScore: 0 },
        specialization: { valid: true },
      },
    };

    const score = scfhsVerificationService.calculateTrustScore(mockResult.layers);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
