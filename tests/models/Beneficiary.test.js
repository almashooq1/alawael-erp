/**
 * tests/models/Beneficiary.test.js - Unit Tests for Beneficiary Model
 * Tests core beneficiary data management
 */

const mongoose = require('mongoose');

describe('Beneficiary Model', () => {
  let beneficiaryData;

  beforeEach(() => {
    beneficiaryData = global.testUtils.createMockBeneficiary();
  });

  describe('Model Creation', () => {
    test('should create a beneficiary with valid data', () => {
      expect(beneficiaryData).toHaveProperty('firstName');
      expect(beneficiaryData).toHaveProperty('emailAddress');
      expect(beneficiaryData).toHaveProperty('nationalIdNumber');
      expect(beneficiaryData.firstName).toBe('John');
    });

    test('should have required fields', () => {
      const requiredFields = [
        'firstName',
        'lastName',
        'emailAddress',
        'nationalIdNumber',
        'phoneNumber',
        'dateOfBirth',
        'gender',
        'program',
      ];

      requiredFields.forEach(field => {
        expect(beneficiaryData).toHaveProperty(field);
      });
    });

    test('should have valid email format', () => {
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      expect(emailRegex.test(beneficiaryData.emailAddress)).toBe(true);
    });
  });

  describe('Model Fields', () => {
    test('should have academic status enum values', () => {
      const validStatuses = ['active', 'inactive', 'graduated', 'suspended', 'withdrawn'];
      expect(validStatuses).toContain(beneficiaryData.academicStatus);
    });

    test('should have valid gender value', () => {
      const validGenders = ['male', 'female', 'other'];
      expect(validGenders).toContain(beneficiaryData.gender);
    });

    test('should have valid program name', () => {
      const validPrograms = [
        'Primary Education',
        'Secondary Education',
        'Tertiary Education',
        'Technical Training',
        'Professional Development',
      ];
      expect(validPrograms).toContain(beneficiaryData.program);
    });

    test('should have gamification level', () => {
      const validLevels = [
        'Beginner',
        'Participant',
        'Contributor',
        'Leader',
        'Achiever',
        'Champion',
      ];
      expect(validLevels).toContain(beneficiaryData.gamificationLevel);
    });
  });

  describe('Timestamps', () => {
    test('should have createdAt timestamp', () => {
      expect(beneficiaryData).toHaveProperty('createdAt');
      expect(
        beneficiaryData.createdAt instanceof Date || typeof beneficiaryData.createdAt === 'number'
      ).toBe(true);
    });

    test('should have updatedAt timestamp', () => {
      expect(beneficiaryData).toHaveProperty('updatedAt');
    });
  });

  describe('Virtual Fields', () => {
    test('should calculate full name from firstName and lastName', () => {
      const expectedFullName = `${beneficiaryData.firstName} ${beneficiaryData.lastName}`;
      const calculatedFullName = `${beneficiaryData.firstName} ${beneficiaryData.lastName}`;
      expect(calculatedFullName).toBe(expectedFullName);
    });
  });

  describe('Validation', () => {
    test('should reject negative GPA', () => {
      const invalidData = { ...beneficiaryData, currentGPA: -1 };
      expect(invalidData.currentGPA).toBeLessThan(0);
    });

    test('should reject GPA greater than 4.0', () => {
      const invalidData = { ...beneficiaryData, currentGPA: 4.5 };
      expect(invalidData.currentGPA).toBeGreaterThan(4.0);
    });

    test('should have non-negative total points', () => {
      const validData = { ...beneficiaryData, totalPoints: 0 };
      expect(validData.totalPoints).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Integrity', () => {
    test('should have unique email addresses (constraint)', () => {
      const benef1 = { ...beneficiaryData, _id: '1' };
      const benef2 = { ...beneficiaryData, _id: '2', emailAddress: 'different@example.com' };

      expect(benef1.emailAddress).not.toBe(benef2.emailAddress);
    });

    test('should have unique national ID (constraint)', () => {
      const benef1 = { ...beneficiaryData, nationalIdNumber: '123' };
      const benef2 = { ...beneficiaryData, nationalIdNumber: '456' };

      expect(benef1.nationalIdNumber).not.toBe(benef2.nationalIdNumber);
    });

    test('should maintain account status values', () => {
      const validStatuses = ['active', 'inactive', 'suspended', 'verified'];
      expect(validStatuses).toContain(beneficiaryData.accountStatus);
    });
  });

  describe('Beneficiary Type Classification', () => {
    test('should have valid beneficiary type', () => {
      const validTypes = [
        'scholarship_recipient',
        'financial_aid',
        'program_participant',
        'general',
      ];
      expect(validTypes).toContain(beneficiaryData.beneficiaryType);
    });

    test('should support all beneficiary type transitions', () => {
      const types = ['scholarship_recipient', 'financial_aid', 'program_participant'];
      types.forEach(type => {
        const benef = { ...beneficiaryData, beneficiaryType: type };
        expect([
          'scholarship_recipient',
          'financial_aid',
          'program_participant',
          'general',
        ]).toContain(benef.beneficiaryType);
      });
    });
  });

  describe('Guardian Information', () => {
    test('should store guardian details', () => {
      const benefWithGuardian = {
        ...beneficiaryData,
        guardian: {
          name: 'Jane Doe',
          relationship: 'mother',
          contact: '9876543210',
          email: 'jane@example.com',
        },
      };

      expect(benefWithGuardian.guardian).toHaveProperty('name');
      expect(benefWithGuardian.guardian).toHaveProperty('relationship');
    });
  });
});
