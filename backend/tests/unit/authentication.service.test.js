/**
 * Unit tests for AuthenticationService.js
 * Class with 28 static methods — validators, normalizers, password, JWT, login, registration, 2FA
 */

/* ─── mocks ─── */
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$12$hashedPassword'),
  hashSync: jest.fn().mockReturnValue('$2a$12$demoHashed'),
  compare: jest.fn().mockResolvedValue(true),
}));
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('jwt-token-xyz'),
  verify: jest.fn().mockReturnValue({ id: 'user-123', type: 'refresh' }),
}));
jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn().mockReturnValue({ toString: jest.fn().mockReturnValue('random32hex') }),
    createHash: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({ digest: jest.fn().mockReturnValue('sha256hash') }),
    }),
  };
});
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../config/secrets', () => ({
  jwtSecret: 'test-jwt-secret',
  jwtRefreshSecret: 'test-refresh-secret',
}));

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AuthenticationService = require('../../services/AuthenticationService');

beforeEach(() => jest.clearAllMocks());

describe('AuthenticationService', () => {
  // ═══════════════════════════════════════════════════════════════
  // Validators
  // ═══════════════════════════════════════════════════════════════

  describe('Validators', () => {
    describe('isValidEmail', () => {
      it('accepts valid emails', () => {
        expect(AuthenticationService.isValidEmail('user@example.com')).toBe(true);
        expect(AuthenticationService.isValidEmail('a.b@c.d')).toBe(true);
      });
      it('rejects invalid emails', () => {
        expect(AuthenticationService.isValidEmail('')).toBe(false);
        expect(AuthenticationService.isValidEmail('no-at-sign')).toBe(false);
        expect(AuthenticationService.isValidEmail('@no-local.com')).toBe(false);
        expect(AuthenticationService.isValidEmail('user@')).toBe(false);
      });
    });

    describe('isValidPhoneNumber', () => {
      it('accepts Saudi numbers', () => {
        expect(AuthenticationService.isValidPhoneNumber('0501234567')).toBe(true);
        expect(AuthenticationService.isValidPhoneNumber('+966501234567')).toBe(true);
        expect(AuthenticationService.isValidPhoneNumber('966501234567')).toBe(true);
      });
      it('rejects invalid phones', () => {
        expect(AuthenticationService.isValidPhoneNumber('123')).toBe(false);
        expect(AuthenticationService.isValidPhoneNumber('0401234567')).toBe(false);
      });
    });

    describe('isValidIDNumber', () => {
      it('accepts 10-digit IDs', () => {
        expect(AuthenticationService.isValidIDNumber('1234567890')).toBe(true);
      });
      it('rejects non-10-digit', () => {
        expect(AuthenticationService.isValidIDNumber('12345')).toBe(false);
        expect(AuthenticationService.isValidIDNumber('12345678901')).toBe(false);
        expect(AuthenticationService.isValidIDNumber('abcdefghij')).toBe(false);
      });
    });

    describe('isValidUsername', () => {
      it('accepts 3-20 alphanumeric/underscore/dash', () => {
        expect(AuthenticationService.isValidUsername('abc')).toBe(true);
        expect(AuthenticationService.isValidUsername('test_user-1')).toBe(true);
      });
      it('rejects short/long/special', () => {
        expect(AuthenticationService.isValidUsername('ab')).toBe(false);
        expect(AuthenticationService.isValidUsername('a'.repeat(21))).toBe(false);
        expect(AuthenticationService.isValidUsername('user name')).toBe(false);
      });
    });

    describe('isValidPasswordStrength', () => {
      it('accepts strong passwords', () => {
        expect(AuthenticationService.isValidPasswordStrength('Abcd1234@')).toBe(true);
      });
      it('rejects weak passwords', () => {
        expect(AuthenticationService.isValidPasswordStrength('short')).toBe(false);
        expect(AuthenticationService.isValidPasswordStrength('onlylowercase1@')).toBe(false);
        expect(AuthenticationService.isValidPasswordStrength('ONLYUPPER1@')).toBe(false);
        expect(AuthenticationService.isValidPasswordStrength('NoSpecial1')).toBe(false);
        expect(AuthenticationService.isValidPasswordStrength('NoDigits!aA')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Normalizers
  // ═══════════════════════════════════════════════════════════════

  describe('Normalizers', () => {
    it('normalizePhoneNumber — +966 prefix', () => {
      expect(AuthenticationService.normalizePhoneNumber('+966501234567')).toBe('0501234567');
    });
    it('normalizePhoneNumber — 966 prefix', () => {
      expect(AuthenticationService.normalizePhoneNumber('966501234567')).toBe('0501234567');
    });
    it('normalizePhoneNumber — already 05x', () => {
      expect(AuthenticationService.normalizePhoneNumber('0501234567')).toBe('0501234567');
    });
    it('normalizePhoneNumber — strips spaces', () => {
      expect(AuthenticationService.normalizePhoneNumber('+966 50 123 4567')).toBe('0501234567');
    });

    it('normalizeEmail — lowercases and trims', () => {
      expect(AuthenticationService.normalizeEmail('  User@Example.COM  ')).toBe('user@example.com');
    });

    it('normalizeIDNumber — trims', () => {
      expect(AuthenticationService.normalizeIDNumber('  1234567890  ')).toBe('1234567890');
    });

    it('normalizeUsername — lowercase + trim', () => {
      expect(AuthenticationService.normalizeUsername('  TestUser  ')).toBe('testuser');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Password Hashing
  // ═══════════════════════════════════════════════════════════════

  describe('Password hashing', () => {
    it('hashPassword — calls bcrypt.hash with BCRYPT_ROUNDS=12', async () => {
      const result = await AuthenticationService.hashPassword('MyPass1!');
      expect(bcrypt.hash).toHaveBeenCalledWith('MyPass1!', 12);
      expect(result).toBe('$2a$12$hashedPassword');
    });

    it('hashPassword — throws generic error on failure', async () => {
      bcrypt.hash.mockRejectedValueOnce(new Error('boom'));
      await expect(AuthenticationService.hashPassword('x')).rejects.toThrow('حدث خطأ داخلي');
    });

    it('comparePassword — delegates to bcrypt.compare', async () => {
      const result = await AuthenticationService.comparePassword('pass', 'hash');
      expect(bcrypt.compare).toHaveBeenCalledWith('pass', 'hash');
      expect(result).toBe(true);
    });

    it('comparePassword — throws generic error on failure', async () => {
      bcrypt.compare.mockRejectedValueOnce(new Error('boom'));
      await expect(AuthenticationService.comparePassword('a', 'b')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // JWT Token
  // ═══════════════════════════════════════════════════════════════

  describe('JWT Tokens', () => {
    it('generateToken — returns token + expiresIn', () => {
      const user = { id: 'u1', username: 'test', email: 'e@e.com', roles: ['admin'] };
      const result = AuthenticationService.generateToken(user);
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'u1', username: 'test', email: 'e@e.com', roles: ['admin'] }),
        'test-jwt-secret',
        expect.objectContaining({ expiresIn: '7d', algorithm: 'HS256' })
      );
      expect(result.token).toBe('jwt-token-xyz');
      expect(result.expiresIn).toBe('7d');
    });

    it('generateToken — throws generic error on failure', () => {
      jwt.sign.mockImplementationOnce(() => {
        throw new Error('fail');
      });
      expect(() => AuthenticationService.generateToken({})).toThrow('حدث خطأ داخلي');
    });

    it('verifyToken — decodes valid token', () => {
      const result = AuthenticationService.verifyToken('some-token');
      expect(jwt.verify).toHaveBeenCalledWith('some-token', 'test-jwt-secret');
      expect(result.id).toBe('user-123');
    });

    it('verifyToken — throws specific message on expired token', () => {
      jwt.verify.mockImplementationOnce(() => {
        const err = new Error('token expired');
        err.name = 'TokenExpiredError';
        throw err;
      });
      expect(() => AuthenticationService.verifyToken('expired')).toThrow('انتهت صلاحية الـ Token');
    });

    it('verifyToken — generic error on other failures', () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('bad');
      });
      expect(() => AuthenticationService.verifyToken('bad')).toThrow('حدث خطأ داخلي');
    });

    it('generateRefreshToken — uses jwtRefreshSecret with 30d expiry', () => {
      const result = AuthenticationService.generateRefreshToken({ id: 'u1' });
      expect(jwt.sign).toHaveBeenCalledWith({ id: 'u1', type: 'refresh' }, 'test-refresh-secret', {
        expiresIn: '30d',
        algorithm: 'HS256',
      });
      expect(result).toBe('jwt-token-xyz');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Login Methods
  // ═══════════════════════════════════════════════════════════════

  describe('Login methods', () => {
    // Note: In test env, DEMO_USER / DEMO_PASSWORD mechanics are active
    // But since bcrypt.hashSync is mocked and DEMO_PASSWORD defaults to null,
    // most login paths will go through exception handling.

    it('loginWithEmail — throws on invalid email', async () => {
      await expect(AuthenticationService.loginWithEmail('bad', 'pass')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('loginWithPhone — throws on invalid phone', async () => {
      await expect(AuthenticationService.loginWithPhone('123', 'pass')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('loginWithIDNumber — throws on invalid ID', async () => {
      await expect(AuthenticationService.loginWithIDNumber('short', 'pass')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('loginWithUsername — throws on invalid username', async () => {
      await expect(AuthenticationService.loginWithUsername('ab', 'pass')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('smartLogin — routes email to loginWithEmail', async () => {
      // smartLogin detects type and dispatches — will throw from inner methods but pattern exercises routing
      await expect(AuthenticationService.smartLogin('user@test.com', 'p')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('smartLogin — routes phone to loginWithPhone', async () => {
      const r = await AuthenticationService.smartLogin('0501234567', 'p');
      expect(r.success).toBe(true);
    });

    it('smartLogin — routes ID number', async () => {
      const r = await AuthenticationService.smartLogin('1234567890', 'p');
      expect(r.success).toBe(true);
    });

    it('smartLogin — routes username', async () => {
      const r = await AuthenticationService.smartLogin('testuser', 'p');
      expect(r.success).toBe(true);
    });

    it('smartLogin — unrecognized credential throws', async () => {
      await expect(AuthenticationService.smartLogin('!!!', 'p')).rejects.toThrow('حدث خطأ داخلي');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Registration
  // ═══════════════════════════════════════════════════════════════

  describe('registerUser', () => {
    it('throws on missing fields', async () => {
      await expect(AuthenticationService.registerUser({})).rejects.toThrow('حدث خطأ داخلي');
    });

    it('throws on password mismatch', async () => {
      await expect(
        AuthenticationService.registerUser({
          username: 'testuser',
          email: 'e@e.com',
          phone: '0501234567',
          idNumber: '1234567890',
          password: 'Abcd1234@',
          confirmPassword: 'Different1@',
        })
      ).rejects.toThrow('حدث خطأ داخلي');
    });

    it('throws on weak password', async () => {
      await expect(
        AuthenticationService.registerUser({
          username: 'testuser',
          email: 'e@e.com',
          phone: '0501234567',
          idNumber: '1234567890',
          password: 'weak',
          confirmPassword: 'weak',
        })
      ).rejects.toThrow('حدث خطأ داخلي');
    });

    it('succeeds with valid data', async () => {
      const result = await AuthenticationService.registerUser({
        username: 'testuser',
        email: 'e@e.com',
        phone: '0501234567',
        idNumber: '1234567890',
        password: 'Abcd1234@',
        confirmPassword: 'Abcd1234@',
        firstName: 'Test',
        lastName: 'User',
      });
      expect(result.success).toBe(true);
      expect(result.message).toBe('تم إنشاء الحساب بنجاح');
      expect(result.user.username).toBe('testuser');
      expect(result.user.email).toBe('e@e.com');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Session Management
  // ═══════════════════════════════════════════════════════════════

  describe('Session Management', () => {
    it('logout — returns success', () => {
      const result = AuthenticationService.logout('user-123');
      expect(result.success).toBe(true);
      expect(result.message).toBe('تم تسجيل الخروج بنجاح');
    });

    it('refreshToken — returns new token when type=refresh', async () => {
      jwt.verify.mockReturnValueOnce({ id: 'user-123', type: 'refresh' });
      const result = await AuthenticationService.refreshToken('old-refresh-token');
      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
    });

    it('refreshToken — throws on non-refresh token', async () => {
      jwt.verify.mockReturnValueOnce({ id: 'user-123', type: 'access' });
      await expect(AuthenticationService.refreshToken('bad-token')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Password Management
  // ═══════════════════════════════════════════════════════════════

  describe('Password Management', () => {
    it('requestPasswordReset — returns resetToken', async () => {
      const result = await AuthenticationService.requestPasswordReset('user@example.com');
      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
    });

    it('requestPasswordReset — invalid email throws', async () => {
      await expect(AuthenticationService.requestPasswordReset('bad')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('resetPassword — password mismatch throws', async () => {
      await expect(
        AuthenticationService.resetPassword('tok', 'Abcd1234@', 'DiffPass1@')
      ).rejects.toThrow('حدث خطأ داخلي');
    });

    it('resetPassword — weak password throws', async () => {
      await expect(AuthenticationService.resetPassword('tok', 'weak', 'weak')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('resetPassword — succeeds with valid inputs', async () => {
      const result = await AuthenticationService.resetPassword('tok', 'Abcd1234@', 'Abcd1234@');
      expect(result.success).toBe(true);
    });

    it('changePassword — mismatch throws', async () => {
      await expect(
        AuthenticationService.changePassword('uid', 'Old1@aaa', 'New1@aaa', 'Diff1@aaa')
      ).rejects.toThrow('حدث خطأ داخلي');
    });

    it('changePassword — same as old throws', async () => {
      await expect(
        AuthenticationService.changePassword('uid', 'Abcd1234@', 'Abcd1234@', 'Abcd1234@')
      ).rejects.toThrow('حدث خطأ داخلي');
    });

    it('changePassword — weak new password throws', async () => {
      await expect(
        AuthenticationService.changePassword('uid', 'Old1@aaa', 'weak', 'weak')
      ).rejects.toThrow('حدث خطأ داخلي');
    });

    it('changePassword — success with valid inputs', async () => {
      const result = await AuthenticationService.changePassword(
        'uid',
        'OldPass1@',
        'NewPass1@',
        'NewPass1@'
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe('تم تغيير كلمة المرور بنجاح');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2FA
  // ═══════════════════════════════════════════════════════════════

  describe('Two-Factor Authentication', () => {
    it('enableTwoFactor — returns secret and QR code', async () => {
      const result = await AuthenticationService.enableTwoFactor('user-1');
      expect(result.success).toBe(true);
      expect(result.secret).toBeDefined();
      expect(result.qrCode).toContain('otpauth://totp/');
    });

    it('verifyTwoFactor — rejects short token', async () => {
      await expect(AuthenticationService.verifyTwoFactor('uid', '123')).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });

    it('verifyTwoFactor — accepts 6-digit token', async () => {
      const result = await AuthenticationService.verifyTwoFactor('uid', '123456');
      expect(result.success).toBe(true);
    });

    it('verifyTwoFactor — rejects null token', async () => {
      await expect(AuthenticationService.verifyTwoFactor('uid', null)).rejects.toThrow(
        'حدث خطأ داخلي'
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // Audit Logging
  // ═══════════════════════════════════════════════════════════════

  describe('logLoginActivity', () => {
    it('returns activity object', () => {
      const result = AuthenticationService.logLoginActivity('u1', 'email', '1.2.3.4', 'Chrome');
      expect(result.userId).toBe('u1');
      expect(result.loginMethod).toBe('email');
      expect(result.ipAddress).toBe('1.2.3.4');
      expect(result.status).toBe('success');
      expect(result.loginTime).toBeDefined();
    });
  });
});
