/**
 * Unit Tests — AuthenticationService.js
 * Batch 40 · P#79
 *
 * Class with all static methods. Deps: bcryptjs, jsonwebtoken, crypto, config/secrets, logger.
 */

const mockHash = jest.fn();
const mockCompare = jest.fn();
const mockHashSync = jest.fn().mockReturnValue('$hashed$');

jest.mock('bcryptjs', () => ({
  hash: (...a) => mockHash(...a),
  compare: (...a) => mockCompare(...a),
  hashSync: (...a) => mockHashSync(...a),
}));

const mockSign = jest.fn().mockReturnValue('jwt-token-xyz');
const mockVerify = jest.fn();
jest.mock('jsonwebtoken', () => ({
  sign: (...a) => mockSign(...a),
  verify: (...a) => mockVerify(...a),
}));

jest.mock('../../config/secrets', () => ({
  jwtSecret: 'test-secret-key',
  jwtRefreshSecret: 'test-refresh-secret',
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const AuthenticationService = require('../../services/AuthenticationService');

describe('AuthenticationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════
  // Validators
  // ═══════════════════════════════════════
  describe('isValidEmail', () => {
    test('returns true for valid email', () => {
      expect(AuthenticationService.isValidEmail('user@example.com')).toBe(true);
    });
    test('returns false for invalid email', () => {
      expect(AuthenticationService.isValidEmail('not-an-email')).toBe(false);
      expect(AuthenticationService.isValidEmail('')).toBe(false);
    });
  });

  describe('isValidPhoneNumber', () => {
    test('returns true for Saudi phone 05xxxxxxxx', () => {
      expect(AuthenticationService.isValidPhoneNumber('0501234567')).toBe(true);
    });
    test('returns true for +966 format', () => {
      expect(AuthenticationService.isValidPhoneNumber('+966501234567')).toBe(true);
    });
    test('returns false for short number', () => {
      expect(AuthenticationService.isValidPhoneNumber('12345')).toBe(false);
    });
  });

  describe('isValidIDNumber', () => {
    test('returns true for 10-digit number', () => {
      expect(AuthenticationService.isValidIDNumber('1234567890')).toBe(true);
    });
    test('returns false for short number', () => {
      expect(AuthenticationService.isValidIDNumber('123')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    test('returns true for valid username 3-20 chars', () => {
      expect(AuthenticationService.isValidUsername('testuser')).toBe(true);
    });
    test('returns false for too short', () => {
      expect(AuthenticationService.isValidUsername('ab')).toBe(false);
    });
  });

  describe('isValidPasswordStrength', () => {
    test('returns true for strong password', () => {
      expect(AuthenticationService.isValidPasswordStrength('Aa1!abcd')).toBe(true);
    });
    test('returns false for weak password', () => {
      expect(AuthenticationService.isValidPasswordStrength('abc')).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  // Normalizers
  // ═══════════════════════════════════════
  describe('normalizePhoneNumber', () => {
    test('normalises +966 to 05', () => {
      const r = AuthenticationService.normalizePhoneNumber('+966501234567');
      expect(r).toMatch(/^05/);
    });
    test('returns same for already-local format', () => {
      const r = AuthenticationService.normalizePhoneNumber('0501234567');
      expect(r).toBe('0501234567');
    });
  });

  describe('normalizeEmail', () => {
    test('lowercases email', () => {
      expect(AuthenticationService.normalizeEmail('USER@Example.COM')).toBe('user@example.com');
    });
  });

  describe('normalizeIDNumber', () => {
    test('trims whitespace', () => {
      expect(AuthenticationService.normalizeIDNumber('  1234567890  ')).toBe('1234567890');
    });
  });

  describe('normalizeUsername', () => {
    test('lowercases and trims', () => {
      expect(AuthenticationService.normalizeUsername('  TestUser  ')).toBe('testuser');
    });
  });

  // ═══════════════════════════════════════
  // Password Hashing
  // ═══════════════════════════════════════
  describe('hashPassword', () => {
    test('calls bcrypt.hash and returns hashed value', async () => {
      mockHash.mockResolvedValueOnce('$2a$hashed');
      const r = await AuthenticationService.hashPassword('myPassword');
      expect(r).toBe('$2a$hashed');
      expect(mockHash).toHaveBeenCalledWith('myPassword', 12);
    });
  });

  describe('comparePassword', () => {
    test('returns true when passwords match', async () => {
      mockCompare.mockResolvedValueOnce(true);
      const r = await AuthenticationService.comparePassword('plain', 'hashed');
      expect(r).toBe(true);
    });
    test('returns false when passwords differ', async () => {
      mockCompare.mockResolvedValueOnce(false);
      const r = await AuthenticationService.comparePassword('plain', 'hashed');
      expect(r).toBe(false);
    });
  });

  // ═══════════════════════════════════════
  // JWT
  // ═══════════════════════════════════════
  describe('generateToken', () => {
    test('returns object with token and expiresIn', () => {
      const r = AuthenticationService.generateToken({
        id: 'u1',
        username: 'usr',
        email: 'a@b.com',
        roles: ['admin'],
      });
      expect(r.token).toBe('jwt-token-xyz');
      expect(r.expiresIn).toBeDefined();
      expect(r.createdAt).toBeInstanceOf(Date);
      expect(mockSign).toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    test('returns decoded payload', () => {
      mockVerify.mockReturnValueOnce({ id: 'u1', roles: ['user'] });
      const r = AuthenticationService.verifyToken('tok');
      expect(r.id).toBe('u1');
    });
    test('throws on expired token', () => {
      const err = new Error('expired');
      err.name = 'TokenExpiredError';
      mockVerify.mockImplementationOnce(() => {
        throw err;
      });
      expect(() => AuthenticationService.verifyToken('tok')).toThrow();
    });
    test('throws on invalid token', () => {
      mockVerify.mockImplementationOnce(() => {
        throw new Error('bad');
      });
      expect(() => AuthenticationService.verifyToken('tok')).toThrow();
    });
  });

  describe('generateRefreshToken', () => {
    test('returns string token', () => {
      const r = AuthenticationService.generateRefreshToken({ id: 'u1' });
      expect(typeof r).toBe('string');
      expect(mockSign).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════
  // Registration
  // ═══════════════════════════════════════
  describe('registerUser', () => {
    test('returns success for valid data', async () => {
      mockHash.mockResolvedValueOnce('$2a$hashed');
      const r = await AuthenticationService.registerUser({
        username: 'newuser',
        email: 'new@example.com',
        phone: '0501234567',
        idNumber: '1234567890',
        password: 'Abc@1234',
        confirmPassword: 'Abc@1234',
        firstName: 'F',
        lastName: 'L',
      });
      expect(r.success).toBe(true);
      expect(r.user.username).toBe('newuser');
    });

    test('throws when required fields missing', async () => {
      await expect(AuthenticationService.registerUser({})).rejects.toThrow();
    });

    test('throws when passwords mismatch', async () => {
      await expect(
        AuthenticationService.registerUser({
          username: 'x',
          email: 'x@x.com',
          phone: '0501234567',
          idNumber: '1234567890',
          password: 'Abc@1234',
          confirmPassword: 'Different1!',
        })
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════
  // Session Management
  // ═══════════════════════════════════════
  describe('logout', () => {
    test('returns success', () => {
      const r = AuthenticationService.logout('u1');
      expect(r.success).toBe(true);
    });
  });

  describe('refreshToken', () => {
    test('returns new token for valid refresh token', async () => {
      mockVerify.mockReturnValueOnce({ id: 'u1', type: 'refresh' });
      const r = await AuthenticationService.refreshToken('refresh-tok');
      expect(r.success).toBe(true);
      expect(r.token).toBeDefined();
    });

    test('throws for invalid/non-refresh token', async () => {
      mockVerify.mockReturnValueOnce({ id: 'u1', type: 'access' });
      await expect(AuthenticationService.refreshToken('tok')).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════
  // Password Management
  // ═══════════════════════════════════════
  describe('requestPasswordReset', () => {
    test('returns success with resetToken', async () => {
      const r = await AuthenticationService.requestPasswordReset('user@example.com');
      expect(r.success).toBe(true);
      expect(r.resetToken).toBeDefined();
    });

    test('throws for invalid email', async () => {
      await expect(AuthenticationService.requestPasswordReset('invalid')).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    test('returns success for matching passwords', async () => {
      mockHash.mockResolvedValueOnce('$hashed');
      const r = await AuthenticationService.resetPassword('reset-tok', 'NewPass1!', 'NewPass1!');
      expect(r.success).toBe(true);
    });

    test('throws when passwords mismatch', async () => {
      await expect(
        AuthenticationService.resetPassword('tok', 'Pass1!aaa', 'Pass2!bbb')
      ).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    test('returns success when valid', async () => {
      mockHash.mockResolvedValueOnce('$hashed');
      const r = await AuthenticationService.changePassword(
        'u1',
        'OldPass1!',
        'NewPass1!',
        'NewPass1!'
      );
      expect(r.success).toBe(true);
    });

    test('throws when new password same as old', async () => {
      await expect(
        AuthenticationService.changePassword('u1', 'Same1!aa', 'Same1!aa', 'Same1!aa')
      ).rejects.toThrow();
    });

    test('throws when confirm does not match', async () => {
      await expect(
        AuthenticationService.changePassword('u1', 'Old1!aaa', 'New1!aaa', 'Diff1!aaa')
      ).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════
  // Advanced Security
  // ═══════════════════════════════════════
  describe('enableTwoFactor', () => {
    test('returns secret and qrCode', async () => {
      const r = await AuthenticationService.enableTwoFactor('u1');
      expect(r.success).toBe(true);
      expect(r.secret).toBeDefined();
      expect(r.qrCode).toContain('otpauth://totp/');
    });
  });

  describe('verifyTwoFactor', () => {
    test('succeeds with 6-digit token', async () => {
      const r = await AuthenticationService.verifyTwoFactor('u1', '123456');
      expect(r.success).toBe(true);
    });

    test('throws for short token', async () => {
      await expect(AuthenticationService.verifyTwoFactor('u1', '12')).rejects.toThrow();
    });
  });

  describe('logLoginActivity', () => {
    test('returns activity object', () => {
      const r = AuthenticationService.logLoginActivity('u1', 'email', '10.0.0.1', 'Jest');
      expect(r.userId).toBe('u1');
      expect(r.loginMethod).toBe('email');
      expect(r.status).toBe('success');
    });
  });
});
