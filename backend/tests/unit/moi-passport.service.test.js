/**
 * Unit tests for moi-passport.service.js
 * Class extends EventEmitter, exported as class (must instantiate with `new`)
 * Dependencies: axios, crypto, Logger, config/secrets
 * Features: Map cache + TTL, rate limiter (100/hr), retry/backoff, encryption (aes-256-cbc)
 * 21 methods including verifyPassport, verifyNationalId, verifyIqama,
 * requestExitReentryVisa, getTravelerProfile, clearCache, getMetrics,
 * getAuditLog, healthCheck, destroy
 */

/* ─── mocks ─── */
jest.mock('axios', () => {
  const fn = jest.fn().mockResolvedValue({ status: 200, data: { data: {} } });
  fn.get = jest.fn().mockResolvedValue({ status: 200 });
  return fn;
});
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));
jest.mock('../../config/secrets', () => ({
  encryptionKey: 'abcdef0123456789abcdef0123456789',
}));

const axios = require('axios');
const MOIPassportService = require('../../services/moi-passport.service');

/* ─── helpers ─── */
const uid = 'user-test-001';
let service;

const defaultConfig = {
  apiBaseUrl: 'https://test.api/v1',
  apiKey: 'test-key',
  apiSecret: 'abcdef0123456789abcdef0123456789',
  timeout: 5000,
  retryAttempts: 1, // 1 retry to keep tests fast
  retryDelay: 10,
  maxCacheSize: 100,
  cacheTTL: 60000,
  enableEncryption: false,
};

const makeApiResponse = (data = {}) => ({
  status: 200,
  data: { data },
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({ legacyFakeTimers: true });
  service = new MOIPassportService(defaultConfig);
});

afterEach(() => {
  if (service) service.destroy();
  jest.useRealTimers();
});

describe('MOIPassportService', () => {
  // ═══════════════════════════════════════════════════════════
  // Constructor & Lifecycle
  // ═══════════════════════════════════════════════════════════

  describe('Constructor & Lifecycle', () => {
    it('initializes with default config', () => {
      const svc = new MOIPassportService();
      expect(svc.config.apiBaseUrl).toContain('api.gdp.gov.sa');
      expect(svc.cache).toBeInstanceOf(Map);
      expect(svc.metrics.totalRequests).toBe(0);
      svc.destroy();
    });

    it('merges custom config', () => {
      expect(service.config.apiBaseUrl).toBe('https://test.api/v1');
      expect(service.config.retryAttempts).toBe(1);
    });

    it('destroy clears all state', () => {
      service.cache.set('k', 'v');
      service.rateLimiter.set('x', []);
      service.destroy();
      expect(service.cache.size).toBe(0);
      expect(service.rateLimiter.size).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Validation
  // ═══════════════════════════════════════════════════════════

  describe('Input Validation (_validateInput)', () => {
    it('validates passport — 6-10 uppercase alphanum', () => {
      expect(service._validateInput('AB1234', 'passport')).toBe('AB1234');
      expect(service._validateInput('ABCDEF1234', 'passport')).toBe('ABCDEF1234');
    });

    it('rejects short passport', () => {
      expect(() => service._validateInput('AB12', 'passport')).toThrow('must be between');
    });

    it('rejects long passport', () => {
      expect(() => service._validateInput('ABCDEFGHIJK', 'passport')).toThrow('must be between');
    });

    it('rejects lowercase passport', () => {
      expect(() => service._validateInput('abcdef', 'passport')).toThrow('format is invalid');
    });

    it('validates nationalId — exactly 10 digits', () => {
      expect(service._validateInput('1234567890', 'nationalId')).toBe('1234567890');
    });

    it('rejects non-10-digit nationalId', () => {
      expect(() => service._validateInput('12345', 'nationalId')).toThrow('must be between');
    });

    it('validates iqama — 10 digits', () => {
      expect(service._validateInput('2345678901', 'iqama')).toBe('2345678901');
    });

    it('validates visaNumber — 10-15 digits', () => {
      expect(service._validateInput('1234567890', 'visaNumber')).toBe('1234567890');
      expect(service._validateInput('123456789012345', 'visaNumber')).toBe('123456789012345');
    });

    it('rejects null input', () => {
      expect(() => service._validateInput(null, 'passport')).toThrow('is required');
    });

    it('rejects unknown validation type', () => {
      expect(() => service._validateInput('data', 'unknown')).toThrow('Unknown validation type');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Rate Limiting
  // ═══════════════════════════════════════════════════════════

  describe('Rate Limiting (_checkRateLimit)', () => {
    it('allows first request', () => {
      expect(service._checkRateLimit(uid)).toBe(true);
    });

    it('tracks requests per user', () => {
      for (let i = 0; i < 99; i++) {
        service._checkRateLimit(uid);
      }
      expect(service._checkRateLimit(uid)).toBe(true); // 100th
    });

    it('throws at 101st request within 1 hour', () => {
      const baseNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(baseNow);
      for (let i = 0; i < 100; i++) {
        service._checkRateLimit(uid);
      }
      expect(() => service._checkRateLimit(uid)).toThrow('Rate limit exceeded');
      Date.now.mockRestore();
    });

    it('resets after 1 hour', () => {
      const baseNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(baseNow);
      for (let i = 0; i < 100; i++) {
        service._checkRateLimit(uid);
      }
      // Advance Date.now by 1 hour + 1ms
      Date.now.mockReturnValue(baseNow + 3600001);
      expect(service._checkRateLimit(uid)).toBe(true);
      Date.now.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Cache
  // ═══════════════════════════════════════════════════════════

  describe('Cache', () => {
    it('_setCache + _getFromCache — stores and retrieves data', () => {
      service._setCache('key1', { test: true });
      const result = service._getFromCache('key1');
      expect(result).toEqual({ test: true });
    });

    it('_getFromCache — returns null for expired items', () => {
      const baseNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(baseNow);
      service._setCache('key1', { test: true }, 100);
      Date.now.mockReturnValue(baseNow + 200);
      const result = service._getFromCache('key1');
      expect(result).toBeNull();
      Date.now.mockRestore();
    });

    it('_getFromCache — returns null for missing keys', () => {
      expect(service._getFromCache('nonexistent')).toBeNull();
    });

    it('_setCache — evicts oldest when full', () => {
      service.config.maxCacheSize = 2;
      service._setCache('k1', 'v1');
      service._setCache('k2', 'v2');
      service._setCache('k3', 'v3'); // should evict k1
      expect(service._getFromCache('k1')).toBeNull();
      expect(service._getFromCache('k3')).toEqual('v3');
    });

    it('_setCache — emits cache:set event', () => {
      const spy = jest.fn();
      service.on('cache:set', spy);
      service._setCache('key1', 'data');
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ key: 'key1' }));
    });

    it('_getFromCache — emits cache:hit on hit', () => {
      service._setCache('key1', 'data');
      const spy = jest.fn();
      service.on('cache:hit', spy);
      service._getFromCache('key1');
      expect(spy).toHaveBeenCalledWith({ key: 'key1' });
    });

    it('clearCache — clears all when no pattern', () => {
      service._setCache('a', 1);
      service._setCache('b', 2);
      const r = service.clearCache();
      expect(r.success).toBe(true);
      expect(service.cache.size).toBe(0);
    });

    it('clearCache — clears matching pattern', () => {
      service._setCache('passport:abc', 1);
      service._setCache('iqama:xyz', 2);
      const r = service.clearCache('passport');
      expect(r.cleared).toBe(1);
      expect(service.cache.size).toBe(1);
    });

    it('_generateCacheKey — produces consistent hash', () => {
      const k1 = service._generateCacheKey('/endpoint', { id: '1' });
      const k2 = service._generateCacheKey('/endpoint', { id: '1' });
      expect(k1).toBe(k2);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Encryption
  // ═══════════════════════════════════════════════════════════

  describe('Encryption', () => {
    it('_encryptData — returns raw data when encryption disabled', () => {
      service.config.enableEncryption = false;
      const data = { passportNumber: 'AB1234' };
      expect(service._encryptData(data)).toEqual(data);
    });

    it('_decryptData — returns raw data when encryption disabled', () => {
      service.config.enableEncryption = false;
      const data = { passportNumber: 'AB1234' };
      expect(service._decryptData(data)).toEqual(data);
    });

    it('_decryptData — returns raw data when not encrypted object', () => {
      service.config.enableEncryption = true;
      const data = { notEncrypted: true };
      expect(service._decryptData(data)).toEqual(data);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // API Requests (_makeRequest)
  // ═══════════════════════════════════════════════════════════

  describe('API Requests', () => {
    it('_makeRequest — successful request updates metrics', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: { result: 'ok' } });

      const result = await service._makeRequest('/test', 'GET');
      expect(result).toEqual({ result: 'ok' });
      expect(service.metrics.totalRequests).toBe(1);
      expect(service.metrics.successfulRequests).toBe(1);
    });

    it('_makeRequest — includes API key header', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: {} });

      await service._makeRequest('/test', 'GET');
      const config = axios.mock.calls[0][0];
      expect(config.headers['X-API-Key']).toBe('test-key');
    });

    it('_makeRequest — sends data for POST', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: {} });

      await service._makeRequest('/test', 'POST', { key: 'val' });
      const config = axios.mock.calls[0][0];
      expect(config.data).toEqual({ key: 'val' });
    });

    it('_makeRequest — increments failedRequests on failure', async () => {
      axios.mockRejectedValue(new Error('Network fail'));

      await expect(service._makeRequest('/fail')).rejects.toThrow('Network fail');
      expect(service.metrics.failedRequests).toBe(1);
    });

    it('_makeRequest — emits request:failure on all retries exhausted', async () => {
      axios.mockRejectedValue(new Error('fail'));
      const spy = jest.fn();
      service.on('request:failure', spy);

      await expect(service._makeRequest('/fail')).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ endpoint: '/fail' }));
    });

    it('_makeRequest — emits request:success on success', async () => {
      axios.mockResolvedValueOnce({ status: 200, data: {} });
      const spy = jest.fn();
      service.on('request:success', spy);

      await service._makeRequest('/ok');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ endpoint: '/ok', statusCode: 200 })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Verification Methods
  // ═══════════════════════════════════════════════════════════

  describe('verifyPassport', () => {
    it('returns cached result if available', async () => {
      // Pre-populate cache
      const cacheKey = service._generateCacheKey('verify-passport', { passportNumber: 'AB1234' });
      service._setCache(cacheKey, { passportNumber: 'AB1234', status: 'valid' });

      const r = await service.verifyPassport('AB1234', uid);
      expect(r.success).toBe(true);
      expect(r.source).toBe('cache');
      expect(axios).not.toHaveBeenCalled();
    });

    it('calls API and caches on cache miss', async () => {
      axios.mockResolvedValueOnce(
        makeApiResponse({
          passportNumber: 'AB1234',
          fullNameAr: 'اسم',
          fullNameEn: 'Name',
          nationality: 'SA',
          dateOfBirth: '1990-01-01',
          gender: 'male',
          issueDate: '2020-01-01',
          expiryDate: '2030-01-01',
          status: 'valid',
        })
      );

      const r = await service.verifyPassport('AB1234', uid);
      expect(r.success).toBe(true);
      expect(r.source).toBe('api');
      expect(r.data.passportNumber).toBe('AB1234');
    });

    it('emits passport:verified on success', async () => {
      axios.mockResolvedValueOnce(
        makeApiResponse({
          passportNumber: 'AB1234',
          status: 'valid',
        })
      );
      const spy = jest.fn();
      service.on('passport:verified', spy);

      await service.verifyPassport('AB1234', uid);
      expect(spy).toHaveBeenCalled();
    });

    it('throws enriched error on API failure', async () => {
      axios.mockRejectedValue(new Error('API down'));
      try {
        await service.verifyPassport('AB1234', uid);
        fail('Should have thrown');
      } catch (e) {
        expect(e.message).toBe('حدث خطأ داخلي');
        expect(e.type).toBe('PASSPORT_VERIFICATION_ERROR');
        expect(e.success).toBe(false);
      }
    });

    it('throws on invalid passport number', async () => {
      await expect(service.verifyPassport('x', uid)).rejects.toThrow();
    });

    it('adds audit log entries', async () => {
      axios.mockResolvedValueOnce(makeApiResponse({ passportNumber: 'AB1234', status: 'valid' }));
      await service.verifyPassport('AB1234', uid);
      expect(service.auditLog.length).toBeGreaterThan(0);
      expect(service.auditLog[0].action).toBe('PASSPORT_VERIFY');
    });
  });

  describe('verifyNationalId', () => {
    it('returns result on success', async () => {
      axios.mockResolvedValueOnce(
        makeApiResponse({
          nationalId: '1234567890',
          fullNameAr: 'اسم',
          fullNameEn: 'Name',
          birthDate: '1990-01-01',
          gender: 'male',
          issueDate: '2020-01-01',
          expiryDate: '2030-01-01',
          status: 'valid',
        })
      );

      const r = await service.verifyNationalId('1234567890', uid);
      expect(r.success).toBe(true);
      expect(r.data.nationalId).toBe('1234567890');
      expect(r.data.nationality).toBe('Saudi Arabia');
    });

    it('emits national-id:verified', async () => {
      axios.mockResolvedValueOnce(makeApiResponse({ nationalId: '1234567890', status: 'valid' }));
      const spy = jest.fn();
      service.on('national-id:verified', spy);

      await service.verifyNationalId('1234567890', uid);
      expect(spy).toHaveBeenCalled();
    });

    it('throws enriched NATIONAL_ID_VERIFICATION_ERROR on failure', async () => {
      axios.mockRejectedValue(new Error('fail'));
      try {
        await service.verifyNationalId('1234567890', uid);
        fail('Should have thrown');
      } catch (e) {
        expect(e.type).toBe('NATIONAL_ID_VERIFICATION_ERROR');
      }
    });
  });

  describe('verifyIqama', () => {
    it('returns iqama data on success', async () => {
      axios.mockResolvedValueOnce(
        makeApiResponse({
          iqamaNumber: '2345678901',
          fullNameAr: 'اسم',
          fullNameEn: 'Name',
          nationality: 'EG',
          birthDate: '1985-03-15',
          sponsorName: 'Company',
          sponsorNumber: '12345',
          sponsorNationality: 'SA',
          issueDate: '2022-01-01',
          expiryDate: '2025-01-01',
          status: 'valid',
          occupationCode: '001',
          occupationName: 'Engineer',
        })
      );

      const r = await service.verifyIqama('2345678901', uid);
      expect(r.success).toBe(true);
      expect(r.data.sponsorName).toBe('Company');
    });

    it('emits iqama:verified', async () => {
      axios.mockResolvedValueOnce(makeApiResponse({ iqamaNumber: '2345678901', status: 'valid' }));
      const spy = jest.fn();
      service.on('iqama:verified', spy);

      await service.verifyIqama('2345678901', uid);
      expect(spy).toHaveBeenCalled();
    });

    it('uses cache when available', async () => {
      const key = service._generateCacheKey('verify-iqama', { iqamaNumber: '2345678901' });
      service._setCache(key, { iqamaNumber: '2345678901' });

      const r = await service.verifyIqama('2345678901', uid);
      expect(r.source).toBe('cache');
      expect(axios).not.toHaveBeenCalled();
    });
  });

  describe('requestExitReentryVisa', () => {
    it('returns visa request data', async () => {
      axios.mockResolvedValueOnce(makeApiResponse({ requestId: 'REQ-001' }));

      const r = await service.requestExitReentryVisa('2345678901', 'multiple', 90, uid);
      expect(r.success).toBe(true);
      expect(r.data.visaType).toBe('multiple');
      expect(r.data.duration).toBe(90);
    });

    it('emits exit-reentry:requested', async () => {
      axios.mockResolvedValueOnce(makeApiResponse({ requestId: 'REQ-001' }));
      const spy = jest.fn();
      service.on('exit-reentry:requested', spy);

      await service.requestExitReentryVisa('2345678901', 'single', 30, uid);
      expect(spy).toHaveBeenCalled();
    });

    it('rejects invalid visa type', async () => {
      await expect(
        service.requestExitReentryVisa('2345678901', 'invalid', 90, uid)
      ).rejects.toThrow();
    });

    it('rejects out-of-range duration', async () => {
      await expect(
        service.requestExitReentryVisa('2345678901', 'single', 0, uid)
      ).rejects.toThrow();
      await expect(
        service.requestExitReentryVisa('2345678901', 'single', 366, uid)
      ).rejects.toThrow();
    });

    it('throws enriched EXIT_REENTRY_REQUEST_ERROR', async () => {
      axios.mockRejectedValue(new Error('fail'));
      try {
        await service.requestExitReentryVisa('2345678901', 'single', 30, uid);
        fail('Should have thrown');
      } catch (e) {
        expect(e.type).toBe('EXIT_REENTRY_REQUEST_ERROR');
      }
    });
  });

  describe('getTravelerProfile', () => {
    it('returns traveler profile', async () => {
      axios.mockResolvedValueOnce(
        makeApiResponse({
          iqamaNumber: '2345678901',
          fullNameAr: 'اسم',
          fullNameEn: 'Name',
          dateOfBirth: '1985-01-01',
          gender: 'male',
          nationality: 'EG',
          passportNumber: 'AB1234',
          passportExpiry: '2030-01-01',
          iqamaExpiry: '2025-01-01',
          nationalId: '9876543210',
          travelHistory: [{ date: '2024-01-01' }],
          currentVisa: null,
          exitBans: [],
          flagged: false,
        })
      );

      const r = await service.getTravelerProfile('2345678901', uid);
      expect(r.success).toBe(true);
      expect(r.data.personalInfo.fullNameAr).toBe('اسم');
      expect(r.data.travelHistory).toHaveLength(1);
    });

    it('uses cache for profile', async () => {
      const key = service._generateCacheKey('traveler-profile', { iqamaNumber: '2345678901' });
      service._setCache(key, { personalInfo: {} });

      const r = await service.getTravelerProfile('2345678901', uid);
      expect(r.source).toBe('cache');
    });

    it('throws enriched TRAVELER_PROFILE_ERROR', async () => {
      axios.mockRejectedValue(new Error('fail'));
      try {
        await service.getTravelerProfile('2345678901', uid);
        fail('Should have thrown');
      } catch (e) {
        expect(e.type).toBe('TRAVELER_PROFILE_ERROR');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Metrics & Audit
  // ═══════════════════════════════════════════════════════════

  describe('Metrics & Audit', () => {
    it('getMetrics — returns all metric fields', () => {
      const m = service.getMetrics();
      expect(m.totalRequests).toBe(0);
      expect(m.successRate).toBe('0%');
      expect(m.cacheSize).toBe(0);
      expect(m.averageResponseTime).toContain('ms');
    });

    it('getMetrics — calculates success rate', () => {
      service.metrics.totalRequests = 10;
      service.metrics.successfulRequests = 8;
      const m = service.getMetrics();
      expect(m.successRate).toBe('80.00%');
    });

    it('_addAuditLog — adds entry', () => {
      service._addAuditLog('TEST_ACTION', uid, { detail: 'x' });
      expect(service.auditLog).toHaveLength(1);
      expect(service.auditLog[0].action).toBe('TEST_ACTION');
      expect(service.auditLog[0].userId).toBe(uid);
    });

    it('_addAuditLog — emits audit:logged', () => {
      const spy = jest.fn();
      service.on('audit:logged', spy);
      service._addAuditLog('ACTION', uid, {});
      expect(spy).toHaveBeenCalled();
    });

    it('_addAuditLog — trims to 10000 entries', () => {
      for (let i = 0; i < 10005; i++) {
        service._addAuditLog('ACTION', uid, { i });
      }
      expect(service.auditLog.length).toBeLessThanOrEqual(10000);
    });

    it('getAuditLog — filters by action', () => {
      service._addAuditLog('A', uid, {});
      service._addAuditLog('B', uid, {});
      const logs = service.getAuditLog({ action: 'A' });
      expect(logs).toHaveLength(1);
    });

    it('getAuditLog — filters by userId', () => {
      service._addAuditLog('A', 'u1', {});
      service._addAuditLog('A', 'u2', {});
      const logs = service.getAuditLog({ userId: 'u1' });
      expect(logs).toHaveLength(1);
    });

    it('getAuditLog — limits results', () => {
      for (let i = 0; i < 50; i++) {
        service._addAuditLog('A', uid, {});
      }
      const logs = service.getAuditLog({ limit: 10 });
      expect(logs).toHaveLength(10);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // Health Check
  // ═══════════════════════════════════════════════════════════

  describe('healthCheck', () => {
    it('returns healthy when API responds', async () => {
      axios.get.mockResolvedValueOnce({ status: 200 });
      const r = await service.healthCheck();
      expect(r.status).toBe('healthy');
      expect(r.apiResponse).toBe(true);
      expect(r.responseTime).toBeDefined();
    });

    it('returns unhealthy on error', async () => {
      axios.get.mockRejectedValueOnce(new Error('timeout'));
      const r = await service.healthCheck();
      expect(r.status).toBe('unhealthy');
      expect(r.error).toBe('حدث خطأ داخلي');
    });
  });

  // ═══════════════════════════════════════════════════════════
  // _sleep utility
  // ═══════════════════════════════════════════════════════════

  describe('_sleep', () => {
    it('resolves after given ms', async () => {
      const p = service._sleep(1000);
      jest.advanceTimersByTime(1000);
      await expect(p).resolves.toBeUndefined();
    });
  });
});
