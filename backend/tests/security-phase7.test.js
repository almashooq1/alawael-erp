/* eslint-disable no-undef, no-unused-vars */
const crypto = require('crypto');

// ── Mocks ───────────────────────────────────────────────────────────
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

const User = require('../models/User');
const SecurityLog = require('../models/securityLog.model');
const { securityService } = require('../services/securityService');

describe('SecurityService Phase 7', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
  });

  describe('generateMfaSecret (setupMfa)', () => {
    it('should generate a secret and return otpauth url', async () => {
      User.findById.mockResolvedValue({ email: 'test@example.com' });
      User.findByIdAndUpdate.mockResolvedValue({});

      const result = await securityService.generateMfaSecret('user123');

      expect(result.secret).toBeDefined();
      expect(result.otpauthUrl).toContain('secret=');
      expect(User.findById).toHaveBeenCalledWith('user123');
    });
  });

  describe('verifyMfaToken', () => {
    it('should return true for valid mock token (123456)', async () => {
      const result = await securityService.verifyMfaToken('u1', '123456', 'secret');
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const result = await securityService.verifyMfaToken('u1', 'wrong', 'secret');
      expect(result).toBe(false);
    });
  });

  describe('enableMfa', () => {
    it('should enable mfa on user and return backup codes', async () => {
      const mockUser = {
        _id: 'user123',
        mfa: { enabled: false, secret: 'secret123', backupCodes: [] },
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });
      User.findByIdAndUpdate.mockResolvedValue({});

      const result = await securityService.enableMfa('user123', '123456', 'secret123');

      expect(result.enabled).toBe(true);
      expect(result.backupCodes).toBeDefined();
      expect(result.backupCodes.length).toBeGreaterThan(0);
      expect(User.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('logSecurityEvent', () => {
    it('should save a security log entry', async () => {
      await securityService.logSecurityEvent({
        action: 'TEST_EVENT',
        userId: 'u1',
        description: 'test',
      });

      expect(SecurityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          action: 'TEST_EVENT',
        })
      );
    });
  });
});
