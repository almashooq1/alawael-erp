const securityService = require('../services/securityService');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const crypto = require('crypto');

jest.mock('../models/User');
jest.mock('../models/AuditLog');

describe('SecurityService Phase 7', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMfaSecret', () => {
    it('should generate a secret and return otpauth url', async () => {
      User.findById.mockResolvedValue({ email: 'test@example.com' });

      const result = await securityService.generateMfaSecret('user123');

      expect(result.secret).toBeDefined();
      expect(result.otpauth_url).toContain('secret=');
      expect(User.findById).toHaveBeenCalledWith('user123');
    });
  });

  describe('verifyMfaToken', () => {
    it('should return true for valid mock token', async () => {
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
        mfa: { enabled: false, secret: null, backupCodes: [] },
        save: jest.fn().mockResolvedValue(true),
      };
      User.findById.mockResolvedValue(mockUser);
      AuditLog.mockImplementation(() => ({ save: jest.fn() }));

      const result = await securityService.enableMfa('user123', 'secret123');

      expect(mockUser.mfa.enabled).toBe(true);
      expect(mockUser.mfa.secret).toBe('secret123');
      expect(mockUser.mfa.backupCodes).toHaveLength(6);
      expect(mockUser.save).toHaveBeenCalled();
    });
  });

  describe('logSecurityEvent', () => {
    it('should save an audit log', async () => {
      const saveMock = jest.fn();
      AuditLog.mockImplementation(() => ({ save: saveMock }));

      await securityService.logSecurityEvent({
        action: 'TEST_EVENT',
        userId: 'u1',
        description: 'test',
      });

      expect(AuditLog).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
    });
  });
});
