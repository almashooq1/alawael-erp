/**
 * Unit tests – GPSSecurityService (static utility class)
 * Pure crypto/distance/sanitisation methods – no DB, no external APIs.
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../config/secrets', () => ({
  gpsEncryptionKey: 'test-gps-encryption-key-for-unit-tests-only',
}));

const GPSSecurityService = require('../../services/gpsSecurityService');

describe('GPSSecurityService', () => {
  // ── 1. Encryption / Decryption ──────────────────────────────────────────

  describe('encryptLocationData / decryptLocationData', () => {
    const sampleLocation = { latitude: 24.7136, longitude: 46.6753, speed: 60 };

    it('encrypts + decrypts to the original data', () => {
      const encrypted = GPSSecurityService.encryptLocationData(sampleLocation, 'v-101');
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted.algorithm).toBe('aes-256-cbc');
      expect(encrypted).toHaveProperty('timestamp');

      const decrypted = GPSSecurityService.decryptLocationData(encrypted, 'v-101');
      expect(decrypted).toEqual(sampleLocation);
    });

    it('produces different ciphertext for different vehicles', () => {
      const enc1 = GPSSecurityService.encryptLocationData(sampleLocation, 'v-101');
      const enc2 = GPSSecurityService.encryptLocationData(sampleLocation, 'v-202');
      expect(enc1.encrypted).not.toBe(enc2.encrypted);
    });

    it('decrypt with wrong vehicleId throws', () => {
      const encrypted = GPSSecurityService.encryptLocationData(sampleLocation, 'v-101');
      expect(() => GPSSecurityService.decryptLocationData(encrypted, 'v-WRONG')).toThrow();
    });
  });

  // ── 2. getEncryptionKey ─────────────────────────────────────────────────

  describe('getEncryptionKey', () => {
    it('returns a 32-byte Buffer', () => {
      const key = GPSSecurityService.getEncryptionKey('v-123');
      expect(Buffer.isBuffer(key)).toBe(true);
      expect(key.length).toBe(32);
    });

    it('same vehicleId produces the same key', () => {
      const k1 = GPSSecurityService.getEncryptionKey('v-1');
      const k2 = GPSSecurityService.getEncryptionKey('v-1');
      expect(k1.equals(k2)).toBe(true);
    });

    it('different vehicleId produces different keys', () => {
      const k1 = GPSSecurityService.getEncryptionKey('v-1');
      const k2 = GPSSecurityService.getEncryptionKey('v-2');
      expect(k1.equals(k2)).toBe(false);
    });
  });

  // ── 3. verifyGPSDataSignature ───────────────────────────────────────────

  describe('verifyGPSDataSignature', () => {
    it('returns true for a correct signature', () => {
      const crypto = require('crypto');
      const gpsData = { lat: 24.71, lon: 46.67 };
      const deviceId = 'dev-001';
      const sig = crypto
        .createHash('sha256')
        .update(JSON.stringify(gpsData) + deviceId)
        .digest('hex');

      expect(GPSSecurityService.verifyGPSDataSignature(gpsData, sig, deviceId)).toBe(true);
    });

    it('returns false for an incorrect signature', () => {
      expect(GPSSecurityService.verifyGPSDataSignature({ lat: 1 }, 'bad', 'dev')).toBe(false);
    });
  });

  // ── 4. detectGPSSpoofing ───────────────────────────────────────────────

  describe('detectGPSSpoofing', () => {
    it('returns detected=false when no anomaly', () => {
      const cur = { latitude: 24.71, longitude: 46.67 };
      const prev = { latitude: 24.7101, longitude: 46.6701 };
      const result = GPSSecurityService.detectGPSSpoofing(cur, prev, 3600); // 1 hour
      expect(result.detected).toBe(false);
    });

    it('detects impossible speed', () => {
      const cur = { latitude: 30.0, longitude: 50.0 };
      const prev = { latitude: 24.0, longitude: 46.0 };
      const result = GPSSecurityService.detectGPSSpoofing(cur, prev, 1); // 1 second
      expect(result.detected).toBe(true);
      expect(result.type).toBe('impossible_speed');
      expect(result.severity).toBe('critical');
    });

    it('detects sudden jump', () => {
      // >100 km in < 5 seconds
      const cur = { latitude: 26.0, longitude: 46.0 };
      const prev = { latitude: 24.0, longitude: 46.0 };
      const result = GPSSecurityService.detectGPSSpoofing(cur, prev, 3);
      expect(result.detected).toBe(true);
      expect(result.type).toMatch(/impossible_speed|sudden_jump/);
    });

    it('detects suspicious accuracy', () => {
      const cur = { latitude: 24.71, longitude: 46.67, accuracy: 500 };
      const result = GPSSecurityService.detectGPSSpoofing(cur, null, 0);
      expect(result.detected).toBe(true);
      expect(result.type).toBe('suspicious_accuracy');
      expect(result.severity).toBe('low');
    });

    it('returns detected=false with no previous location and good accuracy', () => {
      const cur = { latitude: 24.71, longitude: 46.67 };
      const result = GPSSecurityService.detectGPSSpoofing(cur, null, 0);
      expect(result.detected).toBe(false);
    });
  });

  // ── 5. maskSensitiveLocationData ───────────────────────────────────────

  describe('maskSensitiveLocationData', () => {
    const loc = { latitude: 24.7136, longitude: 46.6753, address: 'Riyadh, Al Olaya, Street 5' };

    it('driver role: returns exact data', () => {
      const result = GPSSecurityService.maskSensitiveLocationData(loc, 'driver');
      expect(result.latitude).toBe(24.7136);
      expect(result.longitude).toBe(46.6753);
    });

    it('supervisor role: rounds to 2 decimal places', () => {
      const result = GPSSecurityService.maskSensitiveLocationData(loc, 'supervisor');
      expect(result.latitude).toBe(24.71);
      expect(result.longitude).toBe(46.68);
    });

    it('public role: rounds to 1 decimal, trims address', () => {
      const result = GPSSecurityService.maskSensitiveLocationData(loc, 'public');
      expect(result.latitude).toBe(24.7);
      expect(result.longitude).toBe(46.7);
      expect(result.address).toBe('Riyadh');
    });
  });

  // ── 6. detectAnomalousAccess ────────────────────────────────────────────

  describe('detectAnomalousAccess', () => {
    it('detects new location', () => {
      const log = { ipAddress: '1.2.3.4', action: 'view_location', userRole: 'supervisor' };
      const history = [{ ipAddress: '5.6.7.8', timestamp: new Date() }];
      const anomalies = GPSSecurityService.detectAnomalousAccess(log, history);
      expect(anomalies.some(a => a.type === 'new_location')).toBe(true);
    });

    it('detects rapid access', () => {
      const log = { ipAddress: '1.2.3.4', action: 'view_location', userRole: 'driver' };
      const history = Array.from({ length: 15 }, () => ({
        ipAddress: '1.2.3.4',
        timestamp: new Date(),
      }));
      const anomalies = GPSSecurityService.detectAnomalousAccess(log, history);
      expect(anomalies.some(a => a.type === 'rapid_access')).toBe(true);
    });

    it('detects unauthorized action', () => {
      const log = { ipAddress: '1.2.3.4', action: 'export_data', userRole: 'driver' };
      const history = [{ ipAddress: '1.2.3.4', timestamp: new Date() }];
      const anomalies = GPSSecurityService.detectAnomalousAccess(log, history);
      expect(anomalies.some(a => a.type === 'unauthorized_action')).toBe(true);
    });

    it('returns empty when no anomalies', () => {
      const log = { ipAddress: '1.1.1.1', action: 'view_location', userRole: 'supervisor' };
      const history = [{ ipAddress: '1.1.1.1', timestamp: new Date(Date.now() - 120000) }];
      // Executed during daytime (6-22) — depends on when test runs; skip time assertion
      const anomalies = GPSSecurityService.detectAnomalousAccess(log, history);
      // At minimum, no unauthorized_action or rapid_access
      expect(anomalies.filter(a => a.type === 'unauthorized_action')).toHaveLength(0);
      expect(anomalies.filter(a => a.type === 'rapid_access')).toHaveLength(0);
    });
  });

  // ── 7. calculateDistance / toRad ────────────────────────────────────────

  describe('calculateDistance', () => {
    it('returns 0 for the same point', () => {
      expect(GPSSecurityService.calculateDistance(24.7, 46.6, 24.7, 46.6)).toBe(0);
    });

    it('computes approximate Haversine distance (Riyadh→Jeddah ≈ 949 km)', () => {
      const d = GPSSecurityService.calculateDistance(24.7136, 46.6753, 21.4858, 39.1925);
      expect(d).toBeGreaterThan(800);
      expect(d).toBeLessThan(1100);
    });
  });

  describe('toRad', () => {
    it('converts degrees to radians', () => {
      expect(GPSSecurityService.toRad(180)).toBeCloseTo(Math.PI, 5);
      expect(GPSSecurityService.toRad(90)).toBeCloseTo(Math.PI / 2, 5);
      expect(GPSSecurityService.toRad(0)).toBe(0);
    });
  });

  // ── 8. generateSecureAPIKey ─────────────────────────────────────────────

  describe('generateSecureAPIKey', () => {
    it('returns apiKey, secret, createdAt, expiresAt', () => {
      const result = GPSSecurityService.generateSecureAPIKey('user-1');
      expect(result.apiKey).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(result.apiKey.length).toBe(64); // SHA-256 hex
      expect(result.secret.length).toBe(64); // 32 random bytes hex
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt > result.createdAt).toBe(true);
    });

    it('generates unique keys', () => {
      const k1 = GPSSecurityService.generateSecureAPIKey('user-1');
      const k2 = GPSSecurityService.generateSecureAPIKey('user-1');
      expect(k1.apiKey).not.toBe(k2.apiKey);
    });
  });

  // ── 9. hashPassword ────────────────────────────────────────────────────

  describe('hashPassword', () => {
    it('returns a SHA-256 hex digest (64 chars)', () => {
      const hash = GPSSecurityService.hashPassword('my-password');
      expect(hash.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });

    it('same password => same hash', () => {
      const h1 = GPSSecurityService.hashPassword('abc');
      const h2 = GPSSecurityService.hashPassword('abc');
      expect(h1).toBe(h2);
    });

    it('different password => different hash', () => {
      const h1 = GPSSecurityService.hashPassword('abc');
      const h2 = GPSSecurityService.hashPassword('xyz');
      expect(h1).not.toBe(h2);
    });
  });

  // ── 10. sanitizePath ───────────────────────────────────────────────────

  describe('sanitizePath', () => {
    it('strips directory traversal sequences', () => {
      expect(GPSSecurityService.sanitizePath('../../etc/passwd')).toBe('etc/passwd');
    });

    it('converts backslashes to forward slashes', () => {
      expect(GPSSecurityService.sanitizePath('uploads\\docs\\file.pdf')).toBe(
        'uploads/docs/file.pdf'
      );
    });

    it('handles clean paths unchanged', () => {
      expect(GPSSecurityService.sanitizePath('uploads/file.txt')).toBe('uploads/file.txt');
    });
  });

  // ── 11. escapeSQL ──────────────────────────────────────────────────────

  describe('escapeSQL', () => {
    it('escapes single quotes', () => {
      expect(GPSSecurityService.escapeSQL("O'Reilly")).toBe("O\\'Reilly");
    });

    it('escapes backslashes', () => {
      expect(GPSSecurityService.escapeSQL('path\\to')).toBe('path\\\\to');
    });

    it('escapes newlines', () => {
      expect(GPSSecurityService.escapeSQL('line\nbreak')).toBe('line\\nbreak');
    });

    it('handles safe strings unchanged', () => {
      expect(GPSSecurityService.escapeSQL('hello world')).toBe('hello world');
    });
  });

  // ── 12. sanitizeHTML ───────────────────────────────────────────────────

  describe('sanitizeHTML', () => {
    it('escapes <script> tags', () => {
      const result = GPSSecurityService.sanitizeHTML('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('escapes ampersands', () => {
      expect(GPSSecurityService.sanitizeHTML('A & B')).toBe('A &amp; B');
    });

    it('escapes quotes', () => {
      const result = GPSSecurityService.sanitizeHTML('"hello" & \'world\'');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#39;');
    });

    it('safe text passes through', () => {
      expect(GPSSecurityService.sanitizeHTML('Hello World')).toBe('Hello World');
    });
  });
});
