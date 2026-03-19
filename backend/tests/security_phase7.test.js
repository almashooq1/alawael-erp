/* eslint-disable no-undef, no-unused-vars */
const { securityService } = require('../services/securityService');
const _saudiComplianceService = require('../services/saudiComplianceService');

// Mocks
jest.mock('../models/User', () => {
  const mock = jest.fn();
  mock.find = jest.fn();
  mock.findOne = jest.fn();
  mock.findById = jest.fn().mockReturnValue({
    select: jest.fn(),
  });
  mock.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  return mock;
});
jest.mock('../models/securityLog.model', () => ({
  create: jest.fn().mockResolvedValue({}),
}));
jest.mock('../models/Session', () => ({
  find: jest.fn(),
  findById: jest.fn(),
}));
jest.mock('../models/AuditLog');
jest.mock('../models/Vehicle');
jest.mock('../models/Driver');

const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const _AuditLog = require('../models/AuditLog');

// Initialize services
const security = securityService;
const compliance = new (require('../services/saudiComplianceService'))();

describe('Phase 7: Security & Compliance', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Biometric & MFA Security', () => {
    test('generateMfaSecret should return secret and otpauthUrl', async () => {
      const mockUser = { _id: 'user123', email: 'test@alaweal.com' };
      User.findById.mockResolvedValue(mockUser);
      User.findByIdAndUpdate.mockResolvedValue({});

      const result = await security.generateMfaSecret('user123');

      expect(User.findById).toHaveBeenCalledWith('user123');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('otpauthUrl');
      expect(result.otpauthUrl).toContain('test@alaweal.com');
    });

    test('verifyMfaToken should validate master code for testing', async () => {
      const isValid = await security.verifyMfaToken('user123', '123456', 'anySecret');
      expect(isValid).toBe(true);
    });

    test('verifyMfaToken should reject invalid code in production mode (mock)', async () => {
      const isValid = await security.verifyMfaToken('user123', '999999', 'anySecret');
      expect(isValid).toBe(false);
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
      const _mockDriver = { _id: 'd123', trafficPoints: 0, save: jest.fn() };
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

      await expect(
        compliance.recordSaudiViolation('v123', { violationCode: '999' })
      ).rejects.toThrow('كود المخالفة غير صحيح');
    });
  });
});
