/**
 * Unit tests — AuthService.js
 * Static class with jwt + bcryptjs + config/secrets
 */
'use strict';

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('../../config/secrets', () => ({
  jwtSecret: 'test-secret-key-for-jwt',
}));

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AuthService = require('../../services/AuthService');

beforeEach(() => jest.clearAllMocks());

describe('AuthService', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('generateToken', () => {
    it('returns success with token', () => {
      jwt.sign.mockReturnValue('TOKEN_ABC');
      const res = AuthService.generateToken('U1', 'a@b.com', 'admin');
      expect(res.success).toBe(true);
      expect(res.token).toBe('TOKEN_ABC');
      expect(res.expiresIn).toBeDefined();
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'U1', email: 'a@b.com', role: 'admin', type: 'access' }),
        'test-secret-key-for-jwt',
        expect.objectContaining({ algorithm: 'HS256' })
      );
    });

    it('returns failure on sign error', () => {
      jwt.sign.mockImplementation(() => {
        throw new Error('bad');
      });
      const res = AuthService.generateToken('U1', 'a@b.com', 'admin');
      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('generateRefreshToken', () => {
    it('returns success with refresh token', () => {
      jwt.sign.mockReturnValue('REFRESH_ABC');
      const res = AuthService.generateRefreshToken('U1');
      expect(res.success).toBe(true);
      expect(res.token).toBe('REFRESH_ABC');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'U1', type: 'refresh' }),
        'test-secret-key-for-jwt',
        expect.any(Object)
      );
    });

    it('returns failure on error', () => {
      jwt.sign.mockImplementation(() => {
        throw new Error('fail');
      });
      const res = AuthService.generateRefreshToken('U1');
      expect(res.success).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('verifyToken', () => {
    it('returns valid decoded payload', () => {
      jwt.verify.mockReturnValue({ userId: 'U1', exp: Date.now() + 10000 });
      const res = AuthService.verifyToken('TOKEN');
      expect(res.valid).toBe(true);
      expect(res.decoded.userId).toBe('U1');
    });

    it('strips Bearer prefix', () => {
      jwt.verify.mockReturnValue({ userId: 'U1' });
      AuthService.verifyToken('Bearer TOKEN');
      expect(jwt.verify).toHaveBeenCalledWith(
        'TOKEN',
        'test-secret-key-for-jwt',
        expect.any(Object)
      );
    });

    it('returns invalid on verify error', () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('expired');
      });
      const res = AuthService.verifyToken('BAD');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('hashPassword', () => {
    it('returns hash on success', async () => {
      bcrypt.hash.mockResolvedValue('HASH_ABC');
      const res = await AuthService.hashPassword('secret');
      expect(res.success).toBe(true);
      expect(res.hash).toBe('HASH_ABC');
      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 12);
    });

    it('returns failure on error', async () => {
      bcrypt.hash.mockRejectedValue(new Error('fail'));
      const res = await AuthService.hashPassword('x');
      expect(res.success).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('comparePassword', () => {
    it('returns match=true', async () => {
      bcrypt.compare.mockResolvedValue(true);
      const res = await AuthService.comparePassword('pass', 'hash');
      expect(res.success).toBe(true);
      expect(res.match).toBe(true);
    });

    it('returns match=false', async () => {
      bcrypt.compare.mockResolvedValue(false);
      const res = await AuthService.comparePassword('wrong', 'hash');
      expect(res.match).toBe(false);
    });

    it('returns failure on error', async () => {
      bcrypt.compare.mockRejectedValue(new Error('fail'));
      const res = await AuthService.comparePassword('x', 'y');
      expect(res.success).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('decodeToken', () => {
    it('decodes without verification', () => {
      jwt.decode.mockReturnValue({ userId: 'U1', exp: 999999 });
      const res = AuthService.decodeToken('TOKEN');
      expect(res.success).toBe(true);
      expect(res.decoded.userId).toBe('U1');
    });

    it('strips Bearer prefix', () => {
      jwt.decode.mockReturnValue({});
      AuthService.decodeToken('Bearer TOKEN');
      expect(jwt.decode).toHaveBeenCalledWith('TOKEN');
    });

    it('returns failure on error', () => {
      jwt.decode.mockImplementation(() => {
        throw new Error('bad');
      });
      const res = AuthService.decodeToken('X');
      expect(res.success).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('isTokenExpired', () => {
    it('returns false when not expired', () => {
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(AuthService.isTokenExpired('TOKEN')).toBe(false);
    });

    it('returns true when expired', () => {
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 3600 });
      expect(AuthService.isTokenExpired('TOKEN')).toBe(true);
    });

    it('returns true when decode fails', () => {
      jwt.decode.mockImplementation(() => {
        throw new Error('fail');
      });
      expect(AuthService.isTokenExpired('BAD')).toBe(true);
    });

    it('returns false when no exp claim', () => {
      jwt.decode.mockReturnValue({ userId: 'U1' });
      expect(AuthService.isTokenExpired('TOKEN')).toBe(false);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getTokenTimeToExpire', () => {
    it('returns positive seconds when not expired', () => {
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });
      const ttl = AuthService.getTokenTimeToExpire('TOKEN');
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(3600);
    });

    it('returns -1 when expired', () => {
      jwt.decode.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 100 });
      expect(AuthService.getTokenTimeToExpire('TOKEN')).toBe(-1);
    });

    it('returns Infinity when no exp claim', () => {
      jwt.decode.mockReturnValue({ userId: 'U1' });
      expect(AuthService.getTokenTimeToExpire('TOKEN')).toBe(Infinity);
    });

    it('returns -1 when decode fails', () => {
      jwt.decode.mockImplementation(() => {
        throw new Error('bad');
      });
      expect(AuthService.getTokenTimeToExpire('BAD')).toBe(-1);
    });
  });
});
