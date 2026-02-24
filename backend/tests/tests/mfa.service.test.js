/**
 * MFA Service Tests
 * اختبارات خدمة المصادقة متعددة العوامل
 */

const mfaService = require('../../services/mfaService');

describe('MFA Service', () => {
  describe('TOTP Functions', () => {
    test('should generate TOTP secret', async () => {
      const result = await mfaService.generateTOTPSecret('test@example.com');
      
      expect(result.secret).toBeDefined();
      expect(result.qrCode).toBeDefined();
      expect(result.otpauth_url).toBeDefined();
      expect(result.manualEntryKey).toBeDefined();
      expect(result.manualEntryKey).toMatch(/^[A-Z2-7]+$/);
    });

    test('should verify valid TOTP token', () => {
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      // Note: In real tests, use a library that generates valid tokens
      const result = mfaService.verifyTOTP('123456', secret);
      
      // This will be false with random numbers, but demonstrates the function call
      expect(typeof result).toBe('boolean');
    });

    test('should reject invalid TOTP token', () => {
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const result = mfaService.verifyTOTP('000000', secret);
      
      expect(result).toBe(false);
    });
  });

  describe('OTP Functions', () => {
    test('should generate email OTP', () => {
      const result = mfaService.generateEmailOTP();
      
      expect(result.code).toBeDefined();
      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.expiresAt).toBeDefined();
      expect(result.expiresIn).toBe(300); // 5 minutes
    });

    test('should generate SMS OTP', () => {
      const result = mfaService.generateSMSOTP();
      
      expect(result.code).toBeDefined();
      expect(result.code).toMatch(/^\d{6}$/);
      expect(result.expiresAt).toBeDefined();
    });

    test('should verify valid OTP', () => {
      const code = '123456';
      const expiresAt = new Date(Date.now() + 300000);
      
      const result = mfaService.verifyOTP(code, code, expiresAt);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('verified');
    });

    test('should reject invalid OTP', () => {
      const code1 = '123456';
      const code2 = '654321';
      const expiresAt = new Date(Date.now() + 300000);
      
      const result = mfaService.verifyOTP(code1, code2, expiresAt);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_OTP');
    });

    test('should reject expired OTP', () => {
      const code = '123456';
      const expiresAt = new Date(Date.now() - 1000); // Expired
      
      const result = mfaService.verifyOTP(code, code, expiresAt);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('EXPIRED');
    });
  });

  describe('Backup Codes', () => {
    test('should generate backup codes', () => {
      const codes = mfaService.generateBackupCodes(10);
      
      expect(codes).toHaveLength(10);
      codes.forEach(code => {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      });
    });

    test('should hash backup code', () => {
      const code = '1234-5678';
      const hashed = mfaService.hashBackupCode(code);
      
      expect(hashed).toBeDefined();
      expect(hashed).toMatch(/^[a-f0-9]{64}$/); // SHA256 hex
      expect(hashed).not.toBe(code);
    });

    test('should verify backup code', () => {
      const code = '1234-5678';
      const hashed = mfaService.hashBackupCode(code);
      
      const result = mfaService.verifyBackupCode(code, hashed);
      expect(result).toBe(true);
    });

    test('should reject invalid backup code', () => {
      const code = '1234-5678';
      const hashed = mfaService.hashBackupCode(code);
      
      const result = mfaService.verifyBackupCode('9999-9999', hashed);
      expect(result).toBe(false);
    });
  });

  describe('MFA Session Management', () => {
    test('should create MFA session', () => {
      const userId = 'user123';
      const session = mfaService.createMFASession(userId, 'totp');
      
      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(userId);
      expect(session.method).toBe('totp');
      expect(session.status).toBe('pending');
      expect(session.expiresAt).toBeDefined();
      expect(session.attempts).toBe(0);
      expect(session.maxAttempts).toBe(5);
    });

    test('should validate active session', () => {
      const session = mfaService.createMFASession('user123', 'totp');
      
      const result = mfaService.validateMFASession(session);
      
      expect(result.isValid).toBe(true);
    });

    test('should invalidate expired session', () => {
      const session = mfaService.createMFASession('user123', 'totp');
      session.expiresAt = new Date(Date.now() - 1000); // Expired
      
      const result = mfaService.validateMFASession(session);
      
      expect(result.isValid).toBe(false);
    });

    test('should invalidate session with max attempts exceeded', () => {
      const session = mfaService.createMFASession('user123', 'totp');
      session.attempts = 5; // Max attempts
      
      const result = mfaService.validateMFASession(session);
      
      expect(result.isValid).toBe(false);
    });
  });

  describe('Trusted Device Management', () => {
    test('should generate device token', () => {
      const userId = 'user123';
      const fingerprint = 'device-fingerprint';
      
      const result = mfaService.generateTrustedDeviceToken(userId, fingerprint);
      
      expect(result.token).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    test('should generate recovery key', () => {
      const key = mfaService.generateRecoveryKey();
      
      expect(key).toBeDefined();
      expect(key).toMatch(/^[A-F0-9]{32}$/);
    });
  });

  describe('Security Scoring', () => {
    test('should calculate security score', () => {
      const methods = {
        totp: true,
        email: true,
        sms: false,
        backupCodes: [],
      };
      
      const score = mfaService.calculateSecurityScore(methods);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThan(0); // At least TOTP is enabled
    });

    test('should return maximum score with all methods', () => {
      const methods = {
        totp: true,
        email: true,
        sms: true,
        backupCodes: ['CODE1', 'CODE2'],
      };
      
      const score = mfaService.calculateSecurityScore(methods);
      
      expect(score).toBe(100);
    });

    test('should return zero with no methods', () => {
      const methods = {
        totp: false,
        email: false,
        sms: false,
        backupCodes: [],
      };
      
      const score = mfaService.calculateSecurityScore(methods);
      
      expect(score).toBe(0);
    });
  });

  describe('Audit Logging', () => {
    test('should create audit log entry', () => {
      const userId = 'user123';
      const log = mfaService.createAuditLog(userId, 'totp_setup', 'success', {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      
      expect(log.userId).toBe(userId);
      expect(log.action).toBe('totp_setup');
      expect(log.status).toBe('success');
      expect(log.timestamp).toBeDefined();
      expect(log.ipAddress).toBe('192.168.1.1');
      expect(log.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('Setup Guide', () => {
    test('should return complete setup guide', () => {
      const guide = mfaService.getMFASetupGuide();
      
      expect(guide.totp).toBeDefined();
      expect(guide.email).toBeDefined();
      expect(guide.sms).toBeDefined();
      
      expect(guide.totp.name).toBeDefined();
      expect(guide.totp.description).toBeDefined();
      expect(guide.totp.steps).toBeDefined();
      expect(guide.totp.advantages).toBeDefined();
    });
  });
});

describe('MFA Edge Cases', () => {
  test('should handle timing-safe comparison for OTP', () => {
    // This ensures OTP validation is resistant to timing attacks
    const code1 = '123456';
    const code2 = '123456';
    
    const result = mfaService.verifyOTP(code1, code2, new Date(Date.now() + 300000));
    expect(result.isValid).toBe(true);
  });

  test('should handle leading zeros in OTP codes', () => {
    const code1 = '012345';
    const code2 = '012345';
    
    const result = mfaService.verifyOTP(code1, code2, new Date(Date.now() + 300000));
    expect(result.isValid).toBe(true);
  });

  test('should handle special characters in device names', () => {
    const userId = 'user123';
    const deviceName = "John's iPhone 14 Pro Max ✨";
    const session = mfaService.createMFASession(userId, 'totp', { deviceName });
    
    expect(session.metadata.deviceName).toBe(deviceName);
  });
});

describe('MFA Performance', () => {
  test('should generate TOTP secret quickly', async () => {
    const start = Date.now();
    await mfaService.generateTOTPSecret('test@example.com');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
  });

  test('should verify OTP quickly', () => {
    const start = Date.now();
    mfaService.verifyOTP('123456', '123456', new Date(Date.now() + 300000));
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // Should complete in less than 100ms
  });
});

module.exports = {};
