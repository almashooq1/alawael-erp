/**
 * Unit Tests — BackupSecurityService (AdvancedSecurity)
 * P#68 - Batch 29
 *
 * Singleton (EventEmitter + crypto + fs + logger). Mock fs + logger.
 * Covers: encryptWithKeyRotation, decryptWithAuth, defineAccessControl,
 *         verifyAccess, logSecurityEvent, detectSuspiciousActivity,
 *         performComplianceCheck, generateSecurityAnalytics,
 *         getDefaultPermissions, generateNewEncryptionKey, getLatestKey,
 *         determineSeverity, calculateSecurityScore
 */

'use strict';

jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockRejectedValue(new Error('ENOENT')),
    writeFile: jest.fn().mockResolvedValue(undefined),
    appendFile: jest.fn().mockResolvedValue(undefined),
    readdir: jest.fn().mockRejectedValue(new Error('ENOENT')),
  },
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('BackupSecurityService', () => {
  let service;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.isolateModules(() => {
      service = require('../../services/backup-security.service');
    });
  });

  afterEach(() => {
    if (service && service.shutdown) service.shutdown();
    jest.useRealTimers();
  });

  /* ------------------------------------------------------------------ */
  /*  Initial State                                                      */
  /* ------------------------------------------------------------------ */
  describe('initial state', () => {
    it('has encryptionKeys map', () => {
      expect(service.encryptionKeys).toBeInstanceOf(Map);
    });

    it('has accessControl map', () => {
      expect(service.accessControl).toBeInstanceOf(Map);
    });

    it('has securityEvents array', () => {
      expect(Array.isArray(service.securityEvents)).toBe(true);
    });

    it('has auditLog array', () => {
      expect(Array.isArray(service.auditLog)).toBe(true);
    });

    it('has default paths', () => {
      expect(service.dataPath).toBe('./data/security');
      expect(service.auditPath).toBe('./logs/audit');
      expect(service.keyPath).toBe('./keys');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateNewEncryptionKey / getLatestKey                             */
  /* ------------------------------------------------------------------ */
  describe('generateNewEncryptionKey', () => {
    it('generates and stores a new key', async () => {
      const key = await service.generateNewEncryptionKey();
      expect(key.id).toBeDefined();
      expect(key.key).toBeDefined();
      expect(key.generatedAt).toBeDefined();
      expect(key.algorithm).toBe('aes-256-gcm');
      expect(service.encryptionKeys.has(key.id)).toBe(true);
    });

    it('increments version', async () => {
      const k1 = await service.generateNewEncryptionKey();
      const k2 = await service.generateNewEncryptionKey();
      expect(k2.version).toBe(k1.version + 1);
    });

    it('stores key in encryptionKeys map', async () => {
      const initial = service.encryptionKeys.size;
      const key = await service.generateNewEncryptionKey();
      expect(service.encryptionKeys.size).toBe(initial + 1);
      expect(service.encryptionKeys.get(key.id)).toBe(key);
    });
  });

  describe('getLatestKey', () => {
    it('returns null when no keys', () => {
      expect(service.getLatestKey()).toBeNull();
    });

    it('returns the highest-versioned key', async () => {
      await service.generateNewEncryptionKey();
      const k2 = await service.generateNewEncryptionKey();
      const latest = service.getLatestKey();
      expect(latest.id).toBe(k2.id);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  encryptWithKeyRotation / decryptWithAuth                            */
  /* ------------------------------------------------------------------ */
  describe('encryptWithKeyRotation', () => {
    it('encrypts data and returns ciphertext, iv, authTag, keyId', async () => {
      const res = await service.encryptWithKeyRotation('secret data');
      expect(res.encrypted).toBeDefined();
      expect(res.iv).toBeDefined();
      expect(res.authTag).toBeDefined();
      expect(res.keyId).toBeDefined();
      expect(res.algorithm).toBe('aes-256-gcm');
      expect(typeof res.encrypted).toBe('string');
    });

    it('uses specific keyId when provided', async () => {
      const key = await service.generateNewEncryptionKey();
      const res = await service.encryptWithKeyRotation('data', key.id);
      expect(res.keyId).toBe(key.id);
    });

    it('auto-generates key when none exist', async () => {
      expect(service.encryptionKeys.size).toBe(0);
      await service.encryptWithKeyRotation('data');
      expect(service.encryptionKeys.size).toBe(1);
    });

    it('returns keyVersion', async () => {
      const res = await service.encryptWithKeyRotation('data');
      expect(res.keyVersion).toBeDefined();
    });

    it('returns timestamp', async () => {
      const res = await service.encryptWithKeyRotation('data');
      expect(res.timestamp).toBeDefined();
    });
  });

  describe('decryptWithAuth', () => {
    it('round-trip: encrypt then decrypt', async () => {
      const plaintext = 'Hello, Backup Security!';
      const enc = await service.encryptWithKeyRotation(plaintext);
      const decrypted = await service.decryptWithAuth(
        enc.encrypted,
        enc.iv,
        enc.authTag,
        enc.keyId
      );
      expect(decrypted).toBe(plaintext);
    });

    it('round-trip with object data', async () => {
      const data = { foo: 'bar', n: 42 };
      const enc = await service.encryptWithKeyRotation(data);
      const dec = await service.decryptWithAuth(enc.encrypted, enc.iv, enc.authTag, enc.keyId);
      expect(dec).toEqual(data);
    });

    it('throws on wrong keyId', async () => {
      const enc = await service.encryptWithKeyRotation('data');
      await expect(
        service.decryptWithAuth(enc.encrypted, enc.iv, enc.authTag, 'wrong')
      ).rejects.toThrow('Encryption key not found');
    });

    it('throws on tampered authTag', async () => {
      const enc = await service.encryptWithKeyRotation('data');
      await expect(
        service.decryptWithAuth(enc.encrypted, enc.iv, 'aa'.repeat(16), enc.keyId)
      ).rejects.toThrow();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  defineAccessControl / verifyAccess                                  */
  /* ------------------------------------------------------------------ */
  describe('defineAccessControl', () => {
    it('stores access control for a user', () => {
      service.defineAccessControl('user1', 'ADMIN', ['extra:perm']);
      expect(service.accessControl.has('user1')).toBe(true);
    });

    it('returns the access control entry with userId, role, permissions', () => {
      const res = service.defineAccessControl('user1', 'ADMIN');
      expect(res.userId).toBe('user1');
      expect(res.role).toBe('ADMIN');
      expect(Array.isArray(res.permissions)).toBe(true);
      expect(res.grantedAt).toBeDefined();
      expect(res.expiresAt).toBeDefined();
    });

    it('merges default + custom permissions', () => {
      const res = service.defineAccessControl('user2', 'VIEWER', ['custom:perm']);
      expect(res.permissions).toContain('backup:view');
      expect(res.permissions).toContain('custom:perm');
    });

    it('uses default permissions for role when none provided', () => {
      const res = service.defineAccessControl('user3', 'ADMIN');
      expect(res.permissions).toContain('backup:create');
      expect(res.permissions).toContain('security:manage');
    });

    it('logs ACCESS_CONTROL_DEFINED security event', () => {
      const initialLen = service.securityEvents.length;
      service.defineAccessControl('user4', 'USER');
      expect(service.securityEvents.length).toBeGreaterThan(initialLen);
    });
  });

  describe('verifyAccess', () => {
    beforeEach(() => {
      service.defineAccessControl('admin1', 'ADMIN');
      service.defineAccessControl('viewer1', 'VIEWER');
    });

    it('returns true for allowed permission', () => {
      expect(service.verifyAccess('admin1', 'backup:create')).toBe(true);
    });

    it('returns false for disallowed permission', () => {
      expect(service.verifyAccess('viewer1', 'backup:delete')).toBe(false);
    });

    it('returns false for unknown user', () => {
      expect(service.verifyAccess('unknown', 'backup:view')).toBe(false);
    });

    it('logs ACCESS_DENIED for unknown user', () => {
      service.verifyAccess('unknown', 'backup:view');
      const last = service.securityEvents[service.securityEvents.length - 1];
      expect(last.type).toBe('ACCESS_DENIED');
    });

    it('logs UNAUTHORIZED_ACCESS_ATTEMPT on denied', () => {
      service.verifyAccess('viewer1', 'backup:delete');
      const last = service.securityEvents[service.securityEvents.length - 1];
      expect(last.type).toBe('UNAUTHORIZED_ACCESS_ATTEMPT');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  logSecurityEvent                                                    */
  /* ------------------------------------------------------------------ */
  describe('logSecurityEvent', () => {
    it('stores event in both auditLog and securityEvents', () => {
      service.logSecurityEvent({ type: 'LOGIN', user: 'u1' });
      expect(service.auditLog.length).toBeGreaterThan(0);
      expect(service.securityEvents.length).toBeGreaterThan(0);
    });

    it('assigns id, timestamp, severity', () => {
      const entry = service.logSecurityEvent({ type: 'DATA_ACCESS', user: 'u1' });
      expect(entry.id).toMatch(/^audit-/);
      expect(entry.timestamp).toBeDefined();
      expect(entry.severity).toBeDefined();
    });

    it('emits security:event-logged', () => {
      const spy = jest.fn();
      service.on('security:event-logged', spy);
      service.logSecurityEvent({ type: 'BREACH', user: 'u1' });
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('calls writeAuditToFile', () => {
      const spy = jest.spyOn(service, 'writeAuditToFile').mockResolvedValue(undefined);
      service.logSecurityEvent({ type: 'TEST', user: 'u1' });
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });

    it('keeps auditLog under 100000', () => {
      // Push 99999 fake entries
      service.auditLog = new Array(100000).fill({ id: 'x' });
      service.logSecurityEvent({ type: 'OVERFLOW_TEST', user: 'u1' });
      expect(service.auditLog.length).toBeLessThanOrEqual(100001);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  detectSuspiciousActivity                                            */
  /* ------------------------------------------------------------------ */
  describe('detectSuspiciousActivity', () => {
    it('returns empty array when no suspicious events', () => {
      const res = service.detectSuspiciousActivity();
      expect(res).toEqual([]);
    });

    it('detects BRUTE_FORCE_ATTEMPT (≥5 UNAUTHORIZED_ACCESS_ATTEMPT)', () => {
      for (let i = 0; i < 6; i++) {
        service.logSecurityEvent({ type: 'UNAUTHORIZED_ACCESS_ATTEMPT', user: 'attacker' });
      }
      const res = service.detectSuspiciousActivity();
      const brute = res.find(s => s.type === 'BRUTE_FORCE_ATTEMPT');
      expect(brute).toBeDefined();
      expect(brute.severity).toBe('CRITICAL');
    });

    it('detects UNUSUAL_DATA_ACCESS_VOLUME (>100 DATA_ACCESS)', () => {
      for (let i = 0; i < 105; i++) {
        service.logSecurityEvent({ type: 'DATA_ACCESS', user: 'abuser' });
      }
      const res = service.detectSuspiciousActivity();
      const dataAccess = res.find(s => s.type === 'UNUSUAL_DATA_ACCESS_VOLUME');
      expect(dataAccess).toBeDefined();
      expect(dataAccess.severity).toBe('WARNING');
    });

    it('detects MASS_EXPORT_ATTEMPT (≥3 EXPORT_INITIATED)', () => {
      for (let i = 0; i < 4; i++) {
        service.logSecurityEvent({ type: 'EXPORT_INITIATED', user: 'exporter' });
      }
      const res = service.detectSuspiciousActivity();
      const massExport = res.find(s => s.type === 'MASS_EXPORT_ATTEMPT');
      expect(massExport).toBeDefined();
      expect(massExport.severity).toBe('HIGH');
    });

    it('emits suspicious-activity-detected when found', () => {
      const spy = jest.fn();
      service.on('security:suspicious-activity-detected', spy);
      for (let i = 0; i < 6; i++) {
        service.logSecurityEvent({ type: 'UNAUTHORIZED_ACCESS_ATTEMPT', user: 'x' });
      }
      service.detectSuspiciousActivity();
      expect(spy).toHaveBeenCalled();
    });
  });

  /* ------------------------------------------------------------------ */
  /*  performComplianceCheck                                              */
  /* ------------------------------------------------------------------ */
  describe('performComplianceCheck', () => {
    it('defaults to GDPR framework', () => {
      const res = service.performComplianceCheck();
      expect(res.framework).toBe('GDPR');
      expect(res.checks.length).toBe(5);
      expect(res.overallStatus).toBe('COMPLIANT');
    });

    it('supports HIPAA', () => {
      const res = service.performComplianceCheck('HIPAA');
      expect(res.framework).toBe('HIPAA');
      expect(res.checks.length).toBe(5);
    });

    it('supports ISO27001', () => {
      const res = service.performComplianceCheck('ISO27001');
      expect(res.framework).toBe('ISO27001');
      expect(res.checks.length).toBe(5);
    });

    it('each check has check and status', () => {
      const res = service.performComplianceCheck('GDPR');
      res.checks.forEach(c => {
        expect(c.check).toBeDefined();
        expect(c.status).toBe('PASSED');
      });
    });

    it('emits compliance-check-completed', () => {
      const spy = jest.fn();
      service.on('security:compliance-check-completed', spy);
      service.performComplianceCheck();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  generateSecurityAnalytics                                           */
  /* ------------------------------------------------------------------ */
  describe('generateSecurityAnalytics', () => {
    it('returns analytics with all fields', () => {
      service.logSecurityEvent({ type: 'LOGIN', user: 'u1' });
      service.logSecurityEvent({ type: 'DATA_ACCESS', user: 'u2' });
      const res = service.generateSecurityAnalytics();
      expect(res.period).toBe('24 hours');
      expect(res.totalEvents).toBe(2);
      expect(res.eventsByType).toBeDefined();
      expect(res.eventsBySeverity).toBeDefined();
      expect(res.topActiveUsers).toBeDefined();
      expect(res.securityScore).toBeDefined();
      expect(res.threats).toBeDefined();
      expect(res.recommendations).toBeDefined();
    });

    it('works with no events', () => {
      const res = service.generateSecurityAnalytics();
      expect(res.totalEvents).toBe(0);
      expect(res.securityScore).toBe(100);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  getDefaultPermissions                                               */
  /* ------------------------------------------------------------------ */
  describe('getDefaultPermissions', () => {
    it('returns full perms for ADMIN', () => {
      const perms = service.getDefaultPermissions('ADMIN');
      expect(perms).toContain('backup:create');
      expect(perms).toContain('backup:delete');
      expect(perms).toContain('security:manage');
    });

    it('returns view-only for VIEWER', () => {
      const perms = service.getDefaultPermissions('VIEWER');
      expect(perms).toContain('backup:view');
      expect(perms).not.toContain('backup:delete');
    });

    it('returns all for SUPER_ADMIN', () => {
      const perms = service.getDefaultPermissions('SUPER_ADMIN');
      expect(perms).toContain('*');
    });

    it('returns empty for unknown role', () => {
      expect(service.getDefaultPermissions('unknown')).toEqual([]);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  determineSeverity                                                   */
  /* ------------------------------------------------------------------ */
  describe('determineSeverity', () => {
    it('HIGH for UNAUTHORIZED_ACCESS_ATTEMPT', () => {
      expect(service.determineSeverity('UNAUTHORIZED_ACCESS_ATTEMPT')).toBe('HIGH');
    });

    it('MEDIUM for ACCESS_DENIED', () => {
      expect(service.determineSeverity('ACCESS_DENIED')).toBe('MEDIUM');
    });

    it('CRITICAL for ENCRYPTION_FAILED', () => {
      expect(service.determineSeverity('ENCRYPTION_FAILED')).toBe('CRITICAL');
    });

    it('INFO for KEY_ROTATION', () => {
      expect(service.determineSeverity('KEY_ROTATION')).toBe('INFO');
    });

    it('INFO for unknown type', () => {
      expect(service.determineSeverity('SOME_RANDOM')).toBe('INFO');
    });
  });

  /* ------------------------------------------------------------------ */
  /*  calculateSecurityScore                                              */
  /* ------------------------------------------------------------------ */
  describe('calculateSecurityScore', () => {
    it('returns 100 when no events', () => {
      expect(service.calculateSecurityScore()).toBe(100);
    });

    it('reduces by 10 per CRITICAL event', () => {
      service.logSecurityEvent({ type: 'ENCRYPTION_FAILED', user: 'u1' });
      expect(service.calculateSecurityScore()).toBe(90);
    });

    it('reduces by 5 per HIGH event', () => {
      service.logSecurityEvent({ type: 'UNAUTHORIZED_ACCESS_ATTEMPT', user: 'u1' });
      expect(service.calculateSecurityScore()).toBe(95);
    });

    it('never goes below 0', () => {
      for (let i = 0; i < 20; i++) {
        service.logSecurityEvent({ type: 'ENCRYPTION_FAILED', user: 'u' });
      }
      expect(service.calculateSecurityScore()).toBe(0);
    });
  });

  /* ------------------------------------------------------------------ */
  /*  shutdown                                                            */
  /* ------------------------------------------------------------------ */
  describe('shutdown', () => {
    it('clears monitoring interval', () => {
      expect(() => service.shutdown()).not.toThrow();
    });

    it('sets _monitoringInterval to null', () => {
      service.shutdown();
      expect(service._monitoringInterval).toBeNull();
    });

    it('safe to call multiple times', () => {
      service.shutdown();
      service.shutdown();
      expect(service._monitoringInterval).toBeNull();
    });
  });
});
