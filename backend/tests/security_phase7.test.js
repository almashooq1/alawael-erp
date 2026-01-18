const securityService = require('../services/securityService');
const saudiComplianceService = require('../services/saudiComplianceService');

// Just instantiate classes if they are exported as classes, or use direct object if exported as new instance
// securityService export style: "new SecurityService()" or "class SecurityService"
// saudiComplianceService export style: "class SaudiComplianceService"
// Based on file reads:
// securityService.js: class SecurityService { ... } module.exports = new SecurityService(); (Inferred from usage usually, but let's check file)
// saudiComplianceService.js: class SaudiComplianceService { ... } module.exports = SaudiComplianceService; (Inferred from routes usage "new SaudiComplianceService()")

// Let's re-verify exports if verification fails, but for now assuming typical patterns seen in routes.

// Mocks
jest.mock('../models/User');
jest.mock('../models/AuditLog');
jest.mock('../models/Vehicle');
jest.mock('../models/Driver');

const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const AuditLog = require('../models/AuditLog');

// Initialize services (adjust based on export type)
const security = securityService; // Assuming instance exported
const compliance = new (require('../services/saudiComplianceService'))();

describe('Phase 7: Security & Compliance', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Biometric & MFA Security', () => {
    test('generateMfaSecret should return secret and otpauth_url', async () => {
      const mockUser = { _id: 'user123', email: 'test@alaweal.com' };
      User.findById.mockResolvedValue(mockUser);

      const result = await security.generateMfaSecret('user123');

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpauth_url');
      expect(result.otpauth_url).toContain('test@alaweal.com');
    });

    test('verifyMfaToken should validate master code for testing', async () => {
      const isValid = await security.verifyMfaToken('user123', '123456', 'anySecret');
      expect(isValid).toBe(true);
    });

    test('verifyMfaToken should reject invalid code in production mode (mock)', async () => {
      const isValid = await security.verifyMfaToken('user123', '999999', 'anySecret');
      expect(isValid).toBe(false); // As per current implementation for testing
    });
  });

  describe('Saudi Compliance System', () => {
    test('recordSaudiViolation should calculate fine and points correctly', async () => {
      const mockVehicle = {
        _id: 'v123',
        plateNumber: 'ABC-1234',
        drivers: [],
        violations: [], // Added violations array
        assignedDriver: { driverId: 'd123' }, // Partially mock assignedDriver structure if accessed
        save: jest.fn(),
      };
      Vehicle.findById.mockResolvedValue(mockVehicle);
      // Mock driver if service accesses it for points
      const mockDriver = { _id: 'd123', trafficPoints: 0, save: jest.fn() };
      // Ensure Driver.findOne or Driver.findById is mocked if used.
      // Reading service code implies checking assignedDriver. Let's start with just vehicle fix.

      const violationData = {
        violationCode: '301',
        location: { lat: 24.7136, lng: 46.6753 },
        officer: 'Officer Ahmed',
      };

      const result = await compliance.recordSaudiViolation('v123', violationData);

      expect(Vehicle.findById).toHaveBeenCalledWith('v123');
      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Check specific logic from code 301
      // Result structure is { success, message, violation: { fine, ... }, totalFines }
      expect(result.violation.fine).toBe(600);
      expect(result.violation.demeritPoints).toBe(4);
      expect(result.violation.description).toContain('السرعة الزائدة');
      expect(mockVehicle.save).toHaveBeenCalled();
    });

    test('recordSaudiViolation should throw error for invalid code', async () => {
      Vehicle.findById.mockResolvedValue({ _id: 'v123' });

      await expect(compliance.recordSaudiViolation('v123', { violationCode: '999' })).rejects.toThrow('كود المخالفة غير صحيح');
    });
  });
});
