/**
 * Tests for PasswordSecurityService
 * خدمة أمان كلمات المرور
 */

// Mock dependencies before require
jest.mock('../../models/User', () => ({}));
jest.mock('../../services/audit-logger', () => ({
  log: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('axios');

const axios = require('axios');

// Re-require after mocks
let PasswordSecurityService;
beforeAll(() => {
  PasswordSecurityService = require('../../services/passwordSecurity.service');
});

describe('PasswordSecurityService', () => {
  // ─── checkPasswordStrength ─────────────────────────────────────────
  describe('checkPasswordStrength', () => {
    it('should return very-weak for empty-ish password', () => {
      const result = PasswordSecurityService.checkPasswordStrength('abc');
      expect(result.score).toBeLessThanOrEqual(2);
      expect(result.strength).toMatch(/weak|very-weak/);
      expect(result.passed).toBe(false);
    });

    it('should return weak for lowercase-only 8-char password', () => {
      const result = PasswordSecurityService.checkPasswordStrength('abcdefgh');
      expect(result.strength).toMatch(/weak|medium/);
    });

    it('should return medium for mixed case + digits (8 chars)', () => {
      const result = PasswordSecurityService.checkPasswordStrength('Abcdef1x');
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.passed).toBe(true);
    });

    it('should return strong/very-strong for complex 12+ char password', () => {
      const result = PasswordSecurityService.checkPasswordStrength('Str0ng!Pass#12');
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(['strong', 'very-strong']).toContain(result.strength);
      expect(result.passed).toBe(true);
    });

    it('should penalise common patterns like "password"', () => {
      const result = PasswordSecurityService.checkPasswordStrength('Password123!');
      // common pattern penalty should reduce score
      expect(result.score).toBeLessThan(5);
      expect(result.feedback).toEqual(expect.arrayContaining([expect.stringContaining('common')]));
    });

    it('should penalise repeated characters', () => {
      const result = PasswordSecurityService.checkPasswordStrength('AAAbbbb1!');
      expect(result.feedback).toEqual(expect.arrayContaining([expect.stringContaining('repeated')]));
    });

    it('should give feedback for missing uppercase', () => {
      const result = PasswordSecurityService.checkPasswordStrength('alllower1!xy');
      // no uppercase → feedback should mention it
      expect(result.feedback).toEqual(expect.arrayContaining([expect.stringContaining('uppercase')]));
    });

    it('should give feedback for missing numbers', () => {
      const result = PasswordSecurityService.checkPasswordStrength('NoNumbersHere!');
      expect(result.feedback).toEqual(expect.arrayContaining([expect.stringContaining('number')]));
    });

    it('should give feedback for missing special characters', () => {
      const result = PasswordSecurityService.checkPasswordStrength('NoSpecial123');
      expect(result.feedback).toEqual(expect.arrayContaining([expect.stringContaining('special')]));
    });
  });

  // ─── isPasswordCompromised ─────────────────────────────────────────
  describe('isPasswordCompromised', () => {
    afterEach(() => jest.restoreAllMocks());

    it('should return compromised=true if suffix found in API response', async () => {
      // SHA-1 of "password" = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
      // prefix=5BAA6, suffix=1E4C9B93F3F0682250B6CF8331B7EE68FD8
      axios.get.mockResolvedValue({
        data: '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\nABCDEF1234567890ABCDEF1234567890ABC:5',
      });

      const result = await PasswordSecurityService.isPasswordCompromised('password');
      expect(result.compromised).toBe(true);
      expect(result.count).toBe(3861493);
    });

    it('should return compromised=false if suffix not in API response', async () => {
      axios.get.mockResolvedValue({
        data: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1:1\nBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB2:2',
      });

      const result = await PasswordSecurityService.isPasswordCompromised('super-unique-pass-xyz-42!');
      expect(result.compromised).toBe(false);
    });

    it('should return compromised=false on API error (graceful)', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await PasswordSecurityService.isPasswordCompromised('anything');
      expect(result.compromised).toBe(false);
    });
  });

  // ─── generateSecurePassword ────────────────────────────────────────
  describe('generateSecurePassword', () => {
    it('should generate password of requested length', () => {
      const pw = PasswordSecurityService.generateSecurePassword(20);
      expect(pw.length).toBe(20);
    });

    it('should include uppercase, lowercase, digits, and symbols', () => {
      const pw = PasswordSecurityService.generateSecurePassword(32);
      expect(/[a-z]/.test(pw)).toBe(true);
      expect(/[A-Z]/.test(pw)).toBe(true);
      expect(/[0-9]/.test(pw)).toBe(true);
      expect(/[^a-zA-Z0-9]/.test(pw)).toBe(true);
    });

    it('should default to 16 characters', () => {
      const pw = PasswordSecurityService.generateSecurePassword();
      expect(pw.length).toBe(16);
    });
  });

  // ─── needsPasswordRotation ────────────────────────────────────────
  describe('needsPasswordRotation', () => {
    const User = require('../../models/User');

    it('should return false when user has no passwordChangedAt', async () => {
      User.findById = jest.fn().mockResolvedValue({ passwordChangedAt: null });
      const result = await PasswordSecurityService.needsPasswordRotation('user123');
      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);
      const result = await PasswordSecurityService.needsPasswordRotation('missing');
      expect(result).toBe(false);
    });

    it('should return true when password was changed > 90 days ago', async () => {
      User.findById = jest.fn().mockResolvedValue({
        passwordChangedAt: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000),
      });
      const result = await PasswordSecurityService.needsPasswordRotation('user123');
      expect(result).toBe(true);
    });

    it('should return false when password was changed recently', async () => {
      User.findById = jest.fn().mockResolvedValue({
        passwordChangedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      });
      const result = await PasswordSecurityService.needsPasswordRotation('user123');
      expect(result).toBe(false);
    });
  });

  // ─── isPasswordReused ─────────────────────────────────────────────
  describe('isPasswordReused', () => {
    const User = require('../../models/User');
    const bcrypt = require('bcryptjs');

    it('should return false when user has no password history', async () => {
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ passwordHistory: [] }),
      });
      const result = await PasswordSecurityService.isPasswordReused('user123', 'newpass');
      expect(result).toBe(false);
    });

    it('should return true when new password matches a history entry', async () => {
      const hashed = await bcrypt.hash('oldPassword1!', 10);
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ passwordHistory: [hashed] }),
      });
      const result = await PasswordSecurityService.isPasswordReused('user123', 'oldPassword1!');
      expect(result).toBe(true);
    });

    it('should return false when new password does not match history', async () => {
      const hashed = await bcrypt.hash('differentPass!1', 10);
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ passwordHistory: [hashed] }),
      });
      const result = await PasswordSecurityService.isPasswordReused('user123', 'brandNewPass!2');
      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      const result = await PasswordSecurityService.isPasswordReused('missing', 'any');
      expect(result).toBe(false);
    });
  });

  // ─── getPasswordSecurityInfo ──────────────────────────────────────
  describe('getPasswordSecurityInfo', () => {
    const User = require('../../models/User');

    it('should return security info with days since change', async () => {
      const changedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      User.findById = jest.fn().mockResolvedValue({
        passwordChangedAt: changedAt,
        requirePasswordChange: false,
        passwordHistory: ['h1', 'h2'],
      });

      const info = await PasswordSecurityService.getPasswordSecurityInfo('user123');
      expect(info.daysSinceChange).toBe(30);
      expect(info.daysUntilExpiry).toBe(60);
      expect(info.requiresChange).toBe(false);
      expect(info.passwordHistoryCount).toBe(2);
    });

    it('should throw when user not found', async () => {
      User.findById = jest.fn().mockResolvedValue(null);
      await expect(PasswordSecurityService.getPasswordSecurityInfo('missing')).rejects.toThrow(
        'User not found'
      );
    });
  });
});
