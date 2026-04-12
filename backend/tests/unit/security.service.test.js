'use strict';

/* ── Global mocks for jest.mock scope ── */
global.__secUser = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
};
global.__secSession = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  updateMany: jest.fn(),
};
global.__secLog = {
  find: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
};
global.__secPolicy = {
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
};
global.__secLoginAttempt = {
  find: jest.fn(),
  countDocuments: jest.fn(),
};

/* Override mongoose for inline SecurityPolicy / LoginAttempt schemas */
jest.mock('mongoose', () => {
  function Schema() {}
  Schema.prototype.index = jest.fn();
  Schema.Types = { ObjectId: 'ObjectId' };

  return {
    Schema,
    model: jest.fn(name => {
      if (name === 'SecurityPolicy') return global.__secPolicy;
      if (name === 'LoginAttempt') return global.__secLoginAttempt;
      return {};
    }),
    models: {},
    Types: { ObjectId: { isValid: jest.fn(() => true) } },
  };
});

jest.mock('../../models/User', () => global.__secUser);
jest.mock('../../models/Session', () => global.__secSession);
jest.mock('../../models/securityLog.model', () => global.__secLog);
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../utils/sanitize', () => ({ escapeRegex: jest.fn(s => s) }));
jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashedPassword'),
}));
jest.mock('speakeasy', () => ({
  totp: { verify: jest.fn() },
}));

const {
  securityService: svc,
  SecurityPolicy,
  LoginAttempt,
} = require('../../services/securityService');
const User = require('../../models/User');
const Session = require('../../models/Session');
const SecurityLog = require('../../models/securityLog.model');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');

/* ── Helpers ── */
function CQ(data) {
  const c = {};
  'sort skip limit populate lean select'.split(' ').forEach(m => {
    c[m] = jest.fn(() => c);
  });
  c.then = (res, rej) => Promise.resolve(data).then(res, rej);
  c.catch = fn => Promise.resolve(data).catch(fn);
  return c;
}

beforeEach(() => {
  jest.clearAllMocks();
  SecurityLog.create.mockResolvedValue({}); // logEvent dependency
});

// ═══════════════════════════════════════════════════════════════
describe('SecurityService', () => {
  // ─────── MFA ───────
  describe('setupMfa', () => {
    it('returns secret + otpauth URL', async () => {
      User.findById.mockReturnValue(CQ({ _id: 'u1', email: 'a@t.com', mfa: {} }));
      User.findByIdAndUpdate.mockResolvedValue({});

      const r = await svc.setupMfa('u1');
      expect(r.secret).toBeDefined();
      expect(r.otpauthUrl).toContain('otpauth://totp/');
      expect(r.email).toBe('a@t.com');
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ 'mfa.secret': expect.any(String) })
      );
    });

    it('throws if user not found', async () => {
      User.findById.mockReturnValue(CQ(null));
      await expect(svc.setupMfa('bad')).rejects.toThrow('المستخدم غير موجود');
    });

    it('throws if MFA already enabled', async () => {
      User.findById.mockReturnValue(CQ({ _id: 'u1', mfa: { enabled: true } }));
      await expect(svc.setupMfa('u1')).rejects.toThrow('المصادقة الثنائية مفعّلة بالفعل');
    });
  });

  describe('enableMfa', () => {
    it('enables and returns backup codes', async () => {
      speakeasy.totp.verify.mockReturnValue(true);
      User.findById.mockReturnValue(CQ({ _id: 'u1', mfa: { secret: 'sec' } }));
      User.findByIdAndUpdate.mockResolvedValue({});

      const r = await svc.enableMfa('u1', '123456');
      expect(r.enabled).toBe(true);
      expect(r.backupCodes).toHaveLength(8);
    });

    it('throws on invalid token', async () => {
      speakeasy.totp.verify.mockReturnValue(false);
      User.findById.mockReturnValue(CQ({ _id: 'u1', mfa: { secret: 'sec' } }));

      await expect(svc.enableMfa('u1', 'bad')).rejects.toThrow('رمز التحقق غير صحيح');
    });
  });

  describe('disableMfa', () => {
    it('disables MFA after password check', async () => {
      bcrypt.compare.mockResolvedValue(true);
      User.findById.mockReturnValue(CQ({ _id: 'u1', password: 'hash', mfa: { enabled: true } }));
      User.findByIdAndUpdate.mockResolvedValue({});

      const r = await svc.disableMfa('u1', 'pass123');
      expect(r.enabled).toBe(false);
    });

    it('throws on wrong password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      User.findById.mockReturnValue(CQ({ _id: 'u1', password: 'hash' }));
      await expect(svc.disableMfa('u1', 'wrong')).rejects.toThrow('كلمة المرور غير صحيحة');
    });
  });

  describe('getMfaStatus', () => {
    it('returns status object', async () => {
      User.findById.mockReturnValue(
        CQ({
          _id: 'u1',
          mfa: { enabled: true, enabledAt: new Date(), trustedDevices: [] },
        })
      );

      const r = await svc.getMfaStatus('u1');
      expect(r.enabled).toBe(true);
      expect(r.trustedDevices).toBe(0);
    });
  });

  describe('regenerateBackupCodes', () => {
    it('returns new codes', async () => {
      User.findById.mockReturnValue(CQ({ _id: 'u1', mfa: { enabled: true } }));
      User.findByIdAndUpdate.mockResolvedValue({});

      const r = await svc.regenerateBackupCodes('u1');
      expect(r.backupCodes).toHaveLength(8);
    });

    it('throws if MFA not enabled', async () => {
      User.findById.mockReturnValue(CQ({ _id: 'u1', mfa: { enabled: false } }));
      await expect(svc.regenerateBackupCodes('u1')).rejects.toThrow('المصادقة الثنائية غير مفعّلة');
    });
  });

  // ─────── Sessions ───────
  describe('getActiveSessions', () => {
    it('returns mapped sessions', async () => {
      Session.find.mockReturnValue(
        CQ([
          {
            _id: 's1',
            ipAddress: '1.2.3.4',
            userAgent: 'Chrome',
            lastActivity: new Date(),
            createdAt: new Date(),
          },
        ])
      );

      const r = await svc.getActiveSessions('u1');
      expect(r).toHaveLength(1);
      expect(r[0].ipAddress).toBe('1.2.3.4');
    });
  });

  describe('terminateSession', () => {
    it('deactivates session', async () => {
      Session.findOne.mockResolvedValue({
        _id: 's1',
        userId: 'u1',
        save: jest.fn().mockResolvedValue({}),
      });

      const r = await svc.terminateSession('s1', 'u1');
      expect(r.terminated).toBe(true);
    });

    it('throws for non-existent session', async () => {
      Session.findOne.mockResolvedValue(null);
      await expect(svc.terminateSession('bad', 'u1')).rejects.toThrow();
    });
  });

  describe('terminateAllOtherSessions', () => {
    it('deactivates other sessions', async () => {
      Session.updateMany.mockResolvedValue({ modifiedCount: 3 });

      const r = await svc.terminateAllOtherSessions('u1', 'current-session');
      expect(r.terminated).toBe(3);
    });
  });

  // ─────── Password ───────
  describe('changePassword', () => {
    it('changes password after verification', async () => {
      bcrypt.compare.mockResolvedValue(true);
      SecurityPolicy.findOne.mockReturnValue(
        CQ({
          passwordMinLength: 8,
          passwordRequireUppercase: false,
          passwordRequireLowercase: false,
          passwordRequireNumbers: false,
          passwordRequireSpecial: false,
          passwordHistoryCount: 0,
        })
      );
      User.findById.mockReturnValue(
        CQ({
          _id: 'u1',
          password: 'oldHash',
          passwordHistory: [],
        })
      );
      User.findByIdAndUpdate.mockResolvedValue({});

      const r = await svc.changePassword('u1', 'oldPass', 'newPassword123');
      expect(r.changed).toBe(true);
    });

    it('throws on wrong current password', async () => {
      bcrypt.compare.mockResolvedValue(false);
      User.findById.mockReturnValue(CQ({ _id: 'u1', password: 'hash', passwordHistory: [] }));

      await expect(svc.changePassword('u1', 'wrong', 'newPass')).rejects.toThrow(
        'كلمة المرور الحالية غير صحيحة'
      );
    });
  });

  // ─────── Security Policy ───────
  describe('getSecurityPolicy', () => {
    it('returns existing policy', async () => {
      SecurityPolicy.findOne.mockReturnValue(CQ({ sessionTimeout: 480 }));

      const r = await svc.getSecurityPolicy();
      expect(r.sessionTimeout).toBe(480);
    });

    it('creates default when none exists', async () => {
      SecurityPolicy.findOne.mockReturnValue(CQ(null));
      SecurityPolicy.create.mockResolvedValue({
        sessionTimeout: 480,
        toObject: () => ({ sessionTimeout: 480 }),
      });

      const r = await svc.getSecurityPolicy();
      expect(r.sessionTimeout).toBe(480);
    });
  });

  describe('updateSecurityPolicy', () => {
    it('updates and returns policy', async () => {
      SecurityPolicy.findOneAndUpdate.mockReturnValue(CQ({ sessionTimeout: 240 }));

      const r = await svc.updateSecurityPolicy({ sessionTimeout: 240 });
      expect(r.sessionTimeout).toBe(240);
    });
  });

  // ─────── IP lists ───────
  describe('addIpToWhitelist', () => {
    it('updates policy', async () => {
      SecurityPolicy.findOne.mockResolvedValue({
        ipWhitelist: [],
        ipBlacklist: [],
        save: jest.fn().mockResolvedValue({}),
      });
      const r = await svc.addIpToWhitelist('1.2.3.4', 'u1');
      expect(r).toContain('1.2.3.4');
    });
  });

  describe('removeIpFromWhitelist', () => {
    it('removes IP', async () => {
      SecurityPolicy.findOne.mockResolvedValue({
        ipWhitelist: ['1.2.3.4', '5.5.5.5'],
        ipBlacklist: [],
        save: jest.fn().mockResolvedValue({}),
      });
      const r = await svc.removeIpFromWhitelist('1.2.3.4', 'u1');
      expect(r).not.toContain('1.2.3.4');
    });
  });

  describe('addIpToBlacklist', () => {
    it('updates policy', async () => {
      SecurityPolicy.findOne.mockResolvedValue({
        ipWhitelist: [],
        ipBlacklist: [],
        save: jest.fn().mockResolvedValue({}),
      });
      const r = await svc.addIpToBlacklist('5.6.7.8', 'u1');
      expect(r).toContain('5.6.7.8');
    });
  });

  describe('removeIpFromBlacklist', () => {
    it('removes IP', async () => {
      SecurityPolicy.findOne.mockResolvedValue({
        ipWhitelist: [],
        ipBlacklist: ['5.6.7.8', '9.9.9.9'],
        save: jest.fn().mockResolvedValue({}),
      });
      const r = await svc.removeIpFromBlacklist('5.6.7.8', 'u1');
      expect(r).not.toContain('5.6.7.8');
    });
  });

  // ─────── Logs ───────
  describe('getUserLogs', () => {
    it('paginates user logs', async () => {
      SecurityLog.find.mockReturnValue(CQ([{ _id: 'l1' }]));
      SecurityLog.countDocuments.mockResolvedValue(1);

      const r = await svc.getUserLogs('u1', { page: 1, limit: 10 });
      expect(r.logs).toHaveLength(1);
      expect(r.pagination.total).toBe(1);
    });
  });

  describe('getAllLogs', () => {
    it('paginates with optional filters', async () => {
      SecurityLog.find.mockReturnValue(CQ([{ _id: 'l1' }]));
      SecurityLog.countDocuments.mockResolvedValue(1);

      const r = await svc.getAllLogs({ page: 1, limit: 10, severity: 'high' });
      expect(r.logs).toHaveLength(1);
    });
  });

  describe('logEvent', () => {
    it('creates security log entry', async () => {
      SecurityLog.create.mockResolvedValue({ _id: 'l1' });
      await svc.logEvent('u1', 'login', 'low', 'deets');
      expect(SecurityLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          action: 'login',
          severity: 'low',
        })
      );
    });

    it('catches create errors gracefully', async () => {
      SecurityLog.create.mockRejectedValue(new Error('DB'));
      await expect(svc.logEvent('u1', 'login')).resolves.not.toThrow();
    });
  });

  // ─────── Login Attempts ───────
  describe('getLoginAttempts', () => {
    it('paginates login attempts', async () => {
      LoginAttempt.find.mockReturnValue(CQ([{ _id: 'la1' }]));
      LoginAttempt.countDocuments.mockResolvedValue(1);

      const r = await svc.getLoginAttempts({ page: 1, limit: 10 });
      expect(r.attempts).toHaveLength(1);
      expect(r.pagination.total).toBe(1);
    });
  });

  // ─────── Overview / Stats ───────
  describe('getSecurityOverview', () => {
    it('returns aggregated overview', async () => {
      User.countDocuments.mockResolvedValue(50);
      Session.countDocuments.mockResolvedValue(10);
      SecurityLog.countDocuments.mockResolvedValue(100);
      SecurityLog.aggregate.mockResolvedValue([]);
      SecurityLog.find.mockReturnValue(CQ([]));
      LoginAttempt.countDocuments.mockResolvedValue(5);

      const r = await svc.getSecurityOverview();
      expect(r.totalUsers).toBe(50);
      expect(r.activeSessions).toBe(10);
    });
  });

  describe('getSecurityStats', () => {
    it('returns stats object', async () => {
      User.countDocuments.mockResolvedValue(100);
      Session.countDocuments.mockResolvedValue(20);
      SecurityLog.countDocuments.mockResolvedValueOnce(500).mockResolvedValueOnce(10);
      LoginAttempt.countDocuments.mockResolvedValue(30);

      const r = await svc.getSecurityStats();
      expect(r.totalUsers).toBe(100);
      expect(r.activeSessions).toBe(20);
    });
  });

  describe('getUserSecurityProfile', () => {
    it('returns user profile with sessions and recent logs', async () => {
      User.findById.mockReturnValue(
        CQ({ _id: 'u1', email: 'a@t.com', name: 'Ali', mfa: { enabled: true }, role: 'admin' })
      );
      Session.countDocuments.mockResolvedValue(2);
      SecurityLog.find.mockReturnValue(CQ([{ _id: 'l1' }]));

      const r = await svc.getUserSecurityProfile('u1');
      expect(r.email).toBe('a@t.com');
      expect(r.activeSessions).toBe(2);
    });
  });

  // ─────── Helpers ───────
  describe('_verifyTotp', () => {
    it('delegates to speakeasy', () => {
      speakeasy.totp.verify.mockReturnValue(true);
      expect(svc._verifyTotp('secret', '123456')).toBe(true);
    });
  });

  describe('_generateBackupCodes', () => {
    it('returns array of hex codes', () => {
      const codes = svc._generateBackupCodes(4);
      expect(codes).toHaveLength(4);
      codes.forEach(c => expect(typeof c).toBe('string'));
    });
  });

  describe('_validatePasswordPolicy', () => {
    it('passes with conforming password', () => {
      expect(() =>
        svc._validatePasswordPolicy('StrongP@ss1', { passwordMinLength: 8 })
      ).not.toThrow();
    });

    it('throws for short password', () => {
      expect(() => svc._validatePasswordPolicy('abc', { passwordMinLength: 8 })).toThrow();
    });
  });

  describe('_mapActionToEventType', () => {
    it('maps known action', () => {
      expect(svc._mapActionToEventType('login')).toBeDefined();
    });

    it('returns default for unknown action', () => {
      expect(svc._mapActionToEventType('xyz_unknown')).toBeDefined();
    });
  });

  describe('_calculateSecurityScore', () => {
    it('returns score 0-100', () => {
      const score = svc._calculateSecurityScore({
        totalUsers: 100,
        mfaEnabledUsers: 80,
        failedLogins24h: 2,
        criticalEvents: 0,
      });
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('penalizes low MFA adoption', () => {
      const high = svc._calculateSecurityScore({
        totalUsers: 100,
        mfaEnabledUsers: 100,
        failedLogins24h: 0,
        criticalEvents: 0,
      });
      const low = svc._calculateSecurityScore({
        totalUsers: 100,
        mfaEnabledUsers: 10,
        failedLogins24h: 0,
        criticalEvents: 0,
      });
      expect(high).toBeGreaterThan(low);
    });
  });

  // ─────── Aliases ───────
  describe('compatibility aliases', () => {
    it('generateMfaSecret ≡ setupMfa', () => {
      expect(svc.generateMfaSecret).toBe(svc.setupMfa);
    });

    it('verifyMfaToken delegates to _verifyTotp', async () => {
      speakeasy.totp.verify.mockReturnValue(true);

      const r = await svc.verifyMfaToken('u1', '123456', 'secret');
      expect(r).toBe(true);
      expect(speakeasy.totp.verify).toHaveBeenCalled();
    });

    it('logSecurityEvent calls logEvent', async () => {
      await svc.logSecurityEvent({ action: 'test', userId: 'u1', description: 'desc' });
      expect(SecurityLog.create).toHaveBeenCalled();
    });
  });
});
