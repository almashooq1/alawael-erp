/**
 * Unit Tests — QiwaService (backend/services/qiwa.service.js)
 * Comprehensive coverage: constructor, validation, normalization, verification,
 * contracts, wages, WPS, Nitaqat, batch ops, cache, metrics, events, errors.
 */

/* eslint-disable no-undef */

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
  isAxiosError: jest.fn(e => !!e.isAxiosError),
}));

jest.mock('crypto', () => ({
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash'),
  })),
  randomUUID: jest.fn(() => 'mock-uuid'),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ── Env vars ─────────────────────────────────────────────────────────────────

process.env.QIWA_API_BASE_URL = 'https://api.qiwa.test';
process.env.QIWA_API_KEY = 'test-key';
process.env.QIWA_API_SECRET = 'test-secret';
process.env.QIWA_ESTABLISHMENT_ID = 'EST001';
process.env.QIWA_LABOR_OFFICE_ID = 'LO001';

// ── Require service ──────────────────────────────────────────────────────────

const QiwaService = require('../../services/qiwa.service');
const { instance } = require('../../services/qiwa.service');
const EventEmitter = require('events');
const axios = require('axios');

// ── Helpers ──────────────────────────────────────────────────────────────────

const validIqama = '1234567890';
const validNationalId = '9876543210';
const validContractId = 'ABCD12345678';

const validContractData = {
  employeeIqama: validIqama,
  contractType: 'limited',
  jobTitle: 'Therapist',
  basicSalary: 5000,
  startDate: '2026-01-01',
};

const validWageData = {
  basicSalary: 5000,
  housingAllowance: 1000,
  transportAllowance: 500,
  otherAllowances: 200,
  effectiveDate: '2026-03-01',
};

function makeApiResponse(data = { id: 1 }, status = 200) {
  return { data, status, headers: {} };
}

function makeApiError(status = 500, message = 'Server error', extra = {}) {
  const err = new Error('Request failed');
  err.response = { status, data: { message, ...extra } };
  return err;
}

// ── Suite ────────────────────────────────────────────────────────────────────

describe('QiwaService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.delete.mockReset();
    service = new QiwaService();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 1. Module exports
  // ════════════════════════════════════════════════════════════════════════════

  describe('Module exports', () => {
    it('should export QiwaService class', () => {
      expect(typeof QiwaService).toBe('function');
    });

    it('should export a singleton instance', () => {
      expect(instance).toBeDefined();
    });

    it('singleton should be an instance of QiwaService', () => {
      expect(instance).toBeInstanceOf(QiwaService);
    });

    it('should be an instance of EventEmitter', () => {
      expect(instance).toBeInstanceOf(EventEmitter);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 2. Constructor
  // ════════════════════════════════════════════════════════════════════════════

  describe('Constructor', () => {
    it('should load baseUrl from env', () => {
      expect(service.baseUrl).toBe('https://api.qiwa.test');
    });

    it('should load apiKey from env', () => {
      expect(service.apiKey).toBe('test-key');
    });

    it('should load apiSecret from env', () => {
      expect(service.apiSecret).toBe('test-secret');
    });

    it('should load establishmentId from env', () => {
      expect(service.establishmentId).toBe('EST001');
    });

    it('should load laborOfficeId from env', () => {
      expect(service.laborOfficeId).toBe('LO001');
    });

    it('should initialise cache as Map', () => {
      expect(service.cache).toBeInstanceOf(Map);
      expect(service.cache.size).toBe(0);
    });

    it('should initialise cacheExpiry as Map', () => {
      expect(service.cacheExpiry).toBeInstanceOf(Map);
    });

    it('should initialise requestQueue as empty array', () => {
      expect(service.requestQueue).toEqual([]);
    });

    it('should initialise rateLimitData as Map', () => {
      expect(service.rateLimitData).toBeInstanceOf(Map);
    });

    it('should initialise requestHistory as empty array', () => {
      expect(service.requestHistory).toEqual([]);
    });

    it('should set default retryConfig', () => {
      expect(service.retryConfig).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2,
      });
    });

    it('should accept custom retryConfig', () => {
      const custom = new QiwaService({
        retryConfig: { maxRetries: 5, retryDelay: 500, backoffMultiplier: 3 },
      });
      expect(custom.retryConfig.maxRetries).toBe(5);
    });

    it('should initialise metrics with zeros', () => {
      expect(service.metrics.totalRequests).toBe(0);
      expect(service.metrics.failedRequests).toBe(0);
      expect(service.metrics.successfulRequests).toBe(0);
      expect(service.metrics.cachedResponses).toBe(0);
      expect(service.metrics.averageResponseTime).toBe(0);
      expect(service.metrics.requestTimes).toEqual([]);
    });

    it('should define validationRules', () => {
      expect(service.validationRules.iqama).toBeInstanceOf(RegExp);
      expect(service.validationRules.nationalId).toBeInstanceOf(RegExp);
      expect(service.validationRules.phoneNumber).toBeInstanceOf(RegExp);
      expect(service.validationRules.establishmentId).toBeInstanceOf(RegExp);
      expect(service.validationRules.contractId).toBeInstanceOf(RegExp);
    });

    it('should call axios.create during construction', () => {
      expect(axios.create).toHaveBeenCalled();
    });

    it('should register request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 3. Validation
  // ════════════════════════════════════════════════════════════════════════════

  describe('_validate', () => {
    it('should pass for valid iqama', () => {
      expect(() => service._validate('iqama', validIqama)).not.toThrow();
    });

    it('should throw for invalid iqama', () => {
      expect(() => service._validate('iqama', '123', 'Invalid Iqama number')).toThrow(
        'Invalid Iqama number'
      );
    });

    it('should throw for short iqama', () => {
      expect(() => service._validate('iqama', '12345')).toThrow();
    });

    it('should throw for alpha iqama', () => {
      expect(() => service._validate('iqama', 'ABCDEFGHIJ')).toThrow();
    });

    it('should pass for valid nationalId', () => {
      expect(() => service._validate('nationalId', validNationalId)).not.toThrow();
    });

    it('should throw for invalid nationalId', () => {
      expect(() => service._validate('nationalId', 'abc')).toThrow();
    });

    it('should pass for valid phoneNumber (+966 format)', () => {
      expect(() => service._validate('phoneNumber', '+966512345678')).not.toThrow();
    });

    it('should pass for valid phoneNumber (0 format)', () => {
      expect(() => service._validate('phoneNumber', '0512345678')).not.toThrow();
    });

    it('should throw for invalid phoneNumber', () => {
      expect(() => service._validate('phoneNumber', '1234567890')).toThrow();
    });

    it('should pass for valid contractId', () => {
      expect(() => service._validate('contractId', validContractId)).not.toThrow();
    });

    it('should throw for invalid contractId (contains dash)', () => {
      expect(() => service._validate('contractId', 'abc-def-1234')).toThrow();
    });

    it('should not throw for unknown rule field', () => {
      expect(() => service._validate('unknownField', 'anything')).not.toThrow();
    });

    it('should use default error message when custom is empty', () => {
      expect(() => service._validate('iqama', 'X')).toThrow(/Invalid iqama/);
    });
  });

  describe('_validateContract', () => {
    it('should pass for a valid contract', () => {
      expect(() => service._validateContract(validContractData)).not.toThrow();
    });

    it('should throw when employeeIqama is missing', () => {
      const data = { ...validContractData, employeeIqama: undefined };
      expect(() => service._validateContract(data)).toThrow(
        'Missing required field: employeeIqama'
      );
    });

    it('should throw when contractType is missing', () => {
      const data = { ...validContractData, contractType: undefined };
      expect(() => service._validateContract(data)).toThrow('Missing required field: contractType');
    });

    it('should throw when jobTitle is missing', () => {
      const data = { ...validContractData, jobTitle: undefined };
      expect(() => service._validateContract(data)).toThrow('Missing required field: jobTitle');
    });

    it('should throw when basicSalary is missing', () => {
      const data = { ...validContractData, basicSalary: undefined };
      expect(() => service._validateContract(data)).toThrow('Missing required field: basicSalary');
    });

    it('should throw when startDate is missing', () => {
      const data = { ...validContractData, startDate: undefined };
      expect(() => service._validateContract(data)).toThrow('Missing required field: startDate');
    });

    it('should throw for invalid iqama in contract', () => {
      const data = { ...validContractData, employeeIqama: '123' };
      expect(() => service._validateContract(data)).toThrow();
    });

    it('should throw for negative salary', () => {
      const data = { ...validContractData, basicSalary: -100 };
      expect(() => service._validateContract(data)).toThrow('Salary cannot be negative');
    });

    it('should throw for invalid contractType', () => {
      const data = { ...validContractData, contractType: 'part-time' };
      expect(() => service._validateContract(data)).toThrow('Invalid contract type');
    });

    it('should accept unlimited contractType', () => {
      const data = { ...validContractData, contractType: 'unlimited' };
      expect(() => service._validateContract(data)).not.toThrow();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 4. Normalization
  // ════════════════════════════════════════════════════════════════════════════

  describe('_normalizeContractData', () => {
    it('should normalize basic contract data', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.employeeIqama).toBe(validIqama);
      expect(result.contractType).toBe('limited');
      expect(result.jobTitle).toBe('Therapist');
    });

    it('should round basicSalary to 2 decimals', () => {
      const result = service._normalizeContractData({
        ...validContractData,
        basicSalary: 5000.555,
      });
      expect(result.basicSalary).toBe(5000.56);
    });

    it('should default housingAllowance to 0', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.housingAllowance).toBe(0);
    });

    it('should default transportAllowance to 0', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.transportAllowance).toBe(0);
    });

    it('should default workingHours to 8', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.workingHours).toBe(8);
    });

    it('should format startDate as YYYY-MM-DD', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should set endDate to null when not provided', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.endDate).toBeNull();
    });

    it('should format endDate when provided', () => {
      const result = service._normalizeContractData({
        ...validContractData,
        endDate: '2027-01-01',
      });
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should default jobTitleArabic to empty string', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.jobTitleArabic).toBe('');
    });

    it('should default workingDays when not provided', () => {
      const result = service._normalizeContractData(validContractData);
      expect(result.workingDays).toEqual(['sun', 'mon', 'tue', 'wed', 'thu']);
    });
  });

  describe('_normalizeWageData', () => {
    it('should round basicSalary', () => {
      const result = service._normalizeWageData({ ...validWageData, basicSalary: 5000.999 });
      expect(result.basicSalary).toBe(5001);
    });

    it('should default housingAllowance to 0', () => {
      const result = service._normalizeWageData({ basicSalary: 5000 });
      expect(result.housingAllowance).toBe(0);
    });

    it('should compute totalSalary as sum of all components', () => {
      const result = service._normalizeWageData(validWageData);
      expect(result.totalSalary).toBe(5000 + 1000 + 500 + 200);
    });

    it('should format effectiveDate as YYYY-MM-DD', () => {
      const result = service._normalizeWageData(validWageData);
      expect(result.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should default effectiveDate to today when not provided', () => {
      const result = service._normalizeWageData({ basicSalary: 5000 });
      expect(result.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('_normalizePayrollData', () => {
    it('should normalize period and submissionType', () => {
      const result = service._normalizePayrollData({ period: '2026-03', employees: [] });
      expect(result.period).toBe('2026-03');
      expect(result.submissionType).toBe('regular');
    });

    it('should round employee basicSalary and netSalary', () => {
      const result = service._normalizePayrollData({
        period: '2026-03',
        employees: [{ iqamaNumber: validIqama, basicSalary: 5000.555, netSalary: 4500.777 }],
      });
      expect(result.employees[0].basicSalary).toBe(5000.56);
      expect(result.employees[0].netSalary).toBe(4500.78);
    });

    it('should default employees to empty array when missing', () => {
      const result = service._normalizePayrollData({ period: '2026-03' });
      expect(result.employees).toEqual([]);
    });

    it('should default employee allowances and deductions', () => {
      const result = service._normalizePayrollData({
        period: '2026-03',
        employees: [{ iqamaNumber: validIqama, basicSalary: 5000, netSalary: 4500 }],
      });
      expect(result.employees[0].allowances).toEqual({});
      expect(result.employees[0].deductions).toEqual({});
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 5. _transformResponse
  // ════════════════════════════════════════════════════════════════════════════

  describe('_transformResponse', () => {
    it('should transform a successful response', () => {
      const resp = { data: { id: 1 }, statusCode: 200, cached: false };
      const result = service._transformResponse(resp, 'test');
      expect(result.success).toBe(true);
      expect(result.type).toBe('test');
      expect(result.data).toEqual({ id: 1 });
      expect(result.statusCode).toBe(200);
      expect(result.cached).toBe(false);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should throw when response.data is missing', () => {
      expect(() => service._transformResponse({ statusCode: 200 }, 'test')).toThrow(
        'Invalid API response'
      );
    });

    it('should throw when response.data is null', () => {
      expect(() => service._transformResponse({ data: null, statusCode: 200 }, 'test')).toThrow(
        'Invalid API response'
      );
    });

    it('should reflect cached:true when provided', () => {
      const resp = { data: { id: 1 }, statusCode: 200, cached: true };
      const result = service._transformResponse(resp, 'cached');
      expect(result.cached).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 6. _formatError
  // ════════════════════════════════════════════════════════════════════════════

  describe('_formatError', () => {
    it('should format error with response data message', () => {
      const apiErr = makeApiError(400, 'Bad request');
      const formatted = service._formatError(apiErr);
      expect(formatted).toBeInstanceOf(Error);
      expect(formatted.message).toBe('Bad request');
      expect(formatted.statusCode).toBe(400);
      expect(formatted.data).toEqual({ message: 'Bad request' });
    });

    it('should default statusCode to 500 when no response', () => {
      const err = new Error('Network error');
      const formatted = service._formatError(err);
      expect(formatted.statusCode).toBe(500);
    });

    it('should default data to empty object when no response', () => {
      const err = new Error('fail');
      const formatted = service._formatError(err);
      expect(formatted.data).toEqual({});
    });

    it('should set originalError reference', () => {
      const err = new Error('original');
      const formatted = service._formatError(err);
      expect(formatted.originalError).toBe(err);
    });

    it('should use fallback message when response has no message', () => {
      const err = { response: { status: 502, data: {} }, message: 'Gateway error' };
      const formatted = service._formatError(err);
      // data.message is undefined → falls back to 'حدث خطأ داخلي'
      expect(formatted.message).toBeTruthy();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 7. Cache helpers
  // ════════════════════════════════════════════════════════════════════════════

  describe('Cache (_getCache / _setCache / clearCache)', () => {
    it('_setCache should store value and expiry', () => {
      service._setCache('key1', { a: 1 }, 60);
      expect(service.cache.get('key1')).toEqual({ a: 1 });
      expect(service.cacheExpiry.get('key1')).toBeGreaterThan(Date.now());
    });

    it('_getCache should return stored value when not expired', () => {
      service._setCache('key2', 'hello', 60);
      expect(service._getCache('key2')).toBe('hello');
    });

    it('_getCache should return null/undefined for missing key', () => {
      expect(service._getCache('nope')).toBeUndefined();
    });

    it('_getCache should return null for expired key', () => {
      service.cache.set('exp', 'data');
      service.cacheExpiry.set('exp', Date.now() - 1000);
      expect(service._getCache('exp')).toBeNull();
      expect(service.cache.has('exp')).toBe(false);
    });

    it('clearCache() with no pattern should clear all', () => {
      service._setCache('a', 1, 60);
      service._setCache('b', 2, 60);
      const result = service.clearCache();
      expect(result).toEqual({ cleared: 'all' });
      expect(service.cache.size).toBe(0);
      expect(service.cacheExpiry.size).toBe(0);
    });

    it('clearCache(pattern) should clear matching keys', () => {
      service._setCache('contract:1', 'c1', 60);
      service._setCache('contract:2', 'c2', 60);
      service._setCache('wage:1', 'w1', 60);
      const result = service.clearCache('contract');
      expect(result.cleared).toBe(2);
      expect(service.cache.has('wage:1')).toBe(true);
    });

    it('clearCache(pattern) should return 0 when nothing matches', () => {
      service._setCache('key', 'val', 60);
      const result = service.clearCache('zzz');
      expect(result.cleared).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 8. _trackMetrics
  // ════════════════════════════════════════════════════════════════════════════

  describe('_trackMetrics', () => {
    it('should push response time to requestTimes', () => {
      service._trackMetrics(150);
      expect(service.metrics.requestTimes).toContain(150);
    });

    it('should update averageResponseTime', () => {
      service._trackMetrics(100);
      service._trackMetrics(200);
      expect(service.metrics.averageResponseTime).toBe(150);
    });

    it('should cap requestTimes at 1000 entries', () => {
      for (let i = 0; i < 1005; i++) {
        service._trackMetrics(10);
      }
      expect(service.metrics.requestTimes.length).toBe(1000);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 9. _makeRequest
  // ════════════════════════════════════════════════════════════════════════════

  describe('_makeRequest', () => {
    it('should call client.get for GET requests', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ ok: true }));
      const result = await service._makeRequest('GET', '/test');
      expect(mockAxiosInstance.get).toHaveBeenCalled();
      expect(result.data).toEqual({ ok: true });
      expect(result.cached).toBe(false);
    });

    it('should call client.post for POST requests', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ created: true }, 201));
      const result = await service._makeRequest('POST', '/test', { foo: 'bar' });
      expect(mockAxiosInstance.post).toHaveBeenCalled();
      expect(result.statusCode).toBe(201);
    });

    it('should call client.put for PUT requests', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      await service._makeRequest('PUT', '/test', { a: 1 });
      expect(mockAxiosInstance.put).toHaveBeenCalled();
    });

    it('should call client.delete for DELETE requests', async () => {
      mockAxiosInstance.delete.mockResolvedValue(makeApiResponse({ deleted: true }));
      await service._makeRequest('DELETE', '/test');
      expect(mockAxiosInstance.delete).toHaveBeenCalled();
    });

    it('should throw for unsupported method', async () => {
      await expect(service._makeRequest('PATCH', '/test')).rejects.toThrow();
    });

    it('should return cached data for repeated GET', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ cached: 'yes' }));
      await service._makeRequest('GET', '/cache-test');
      const second = await service._makeRequest('GET', '/cache-test');
      expect(second.cached).toBe(true);
      expect(second.data).toEqual({ cached: 'yes' });
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    });

    it('should skip cache when options.skipCache is true', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ fresh: true }));
      await service._makeRequest('GET', '/skip', null, { skipCache: true });
      await service._makeRequest('GET', '/skip', null, { skipCache: true });
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should increment totalRequests on each call', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse());
      await service._makeRequest('GET', '/m1', null, { skipCache: true });
      await service._makeRequest('GET', '/m1', null, { skipCache: true });
      expect(service.metrics.totalRequests).toBe(2);
    });

    it('should increment failedRequests on error', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      await expect(service._makeRequest('GET', '/fail')).rejects.toThrow();
      expect(service.metrics.failedRequests).toBe(1);
    });

    it('should increment successfulRequests on success', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse());
      await service._makeRequest('GET', '/ok', null, { skipCache: true });
      expect(service.metrics.successfulRequests).toBe(1);
    });

    it('should increment cachedResponses on cache hit', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ d: 1 }));
      await service._makeRequest('GET', '/ch');
      await service._makeRequest('GET', '/ch');
      expect(service.metrics.cachedResponses).toBe(1);
    });

    it('should throw formatted error on failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(422, 'Validation failed'));
      await expect(service._makeRequest('POST', '/err', {})).rejects.toThrow('Validation failed');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 10. Employee verification
  // ════════════════════════════════════════════════════════════════════════════

  describe('verifyEmployeeByIqama', () => {
    it('should verify a valid iqama and return transformed response', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ verified: true }));
      const result = await service.verifyEmployeeByIqama(validIqama);
      expect(result.success).toBe(true);
      expect(result.type).toBe('verification');
      expect(result.data).toEqual({ verified: true });
    });

    it('should throw for invalid iqama format', async () => {
      await expect(service.verifyEmployeeByIqama('123')).rejects.toThrow('Invalid Iqama number');
    });

    it('should emit verification:error on API failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('verification:error', spy);
      await expect(service.verifyEmployeeByIqama(validIqama)).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ iqamaNumber: validIqama }));
    });

    it('should pass establishmentId in request params', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ verified: true }));
      await service.verifyEmployeeByIqama(validIqama);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/employees/verify/iqama',
        expect.objectContaining({
          params: expect.objectContaining({ establishmentId: 'EST001' }),
        })
      );
    });
  });

  describe('verifyEmployeeByNationalId', () => {
    it('should verify a valid national ID', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ verified: true }));
      const result = await service.verifyEmployeeByNationalId(validNationalId);
      expect(result.success).toBe(true);
      expect(result.type).toBe('verification');
    });

    it('should throw for invalid national ID format', async () => {
      await expect(service.verifyEmployeeByNationalId('abc')).rejects.toThrow(
        'Invalid National ID'
      );
    });

    it('should emit verification:error on API failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('verification:error', spy);
      await expect(service.verifyEmployeeByNationalId(validNationalId)).rejects.toThrow();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ nationalId: validNationalId }));
    });
  });

  describe('getEmployeeLaborRecord', () => {
    it('should fetch labor record for valid iqama', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ record: 'data' }));
      const result = await service.getEmployeeLaborRecord(validIqama);
      expect(result.success).toBe(true);
      expect(result.type).toBe('laborRecord');
    });

    it('should throw for invalid iqama', async () => {
      await expect(service.getEmployeeLaborRecord('bad')).rejects.toThrow('Invalid Iqama number');
    });

    it('should emit laborRecord:error on API failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('laborRecord:error', spy);
      await expect(service.getEmployeeLaborRecord(validIqama)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });

    it('should pass cacheDuration of 7200', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ r: 1 }));
      await service.getEmployeeLaborRecord(validIqama);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/labor-record'),
        expect.objectContaining({ cacheDuration: 7200 })
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 11. Contract management
  // ════════════════════════════════════════════════════════════════════════════

  describe('registerContract', () => {
    it('should register a valid contract', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ contractId: 'C001' }, 201));
      const result = await service.registerContract(validContractData);
      expect(result.success).toBe(true);
      expect(result.type).toBe('contractRegistration');
    });

    it('should throw on validation failure (missing field)', async () => {
      await expect(
        service.registerContract({ ...validContractData, employeeIqama: undefined })
      ).rejects.toThrow('Missing required field');
    });

    it('should emit contract:registered on success', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ contractId: 'C002' }));
      const spy = jest.fn();
      service.on('contract:registered', spy);
      await service.registerContract(validContractData);
      expect(spy).toHaveBeenCalled();
    });

    it('should emit contract:error on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('contract:error', spy);
      await expect(service.registerContract(validContractData)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });

    it('should send normalised data with establishmentId and laborOfficeId', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ contractId: 'C003' }));
      await service.registerContract(validContractData);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/contracts/register',
        expect.objectContaining({
          establishmentId: 'EST001',
          laborOfficeId: 'LO001',
          employeeIqama: validIqama,
        }),
        expect.any(Object)
      );
    });
  });

  describe('updateContract', () => {
    it('should update an existing contract', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const result = await service.updateContract(validContractId, validContractData);
      expect(result.success).toBe(true);
      expect(result.type).toBe('contractUpdate');
    });

    it('should throw for invalid contractId', async () => {
      await expect(service.updateContract('bad-id', validContractData)).rejects.toThrow(
        'Invalid Contract ID'
      );
    });

    it('should emit contract:updated on success', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const spy = jest.fn();
      service.on('contract:updated', spy);
      await service.updateContract(validContractId, validContractData);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ contractId: validContractId }));
    });

    it('should emit contract:updateError on API failure', async () => {
      mockAxiosInstance.put.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('contract:updateError', spy);
      await expect(service.updateContract(validContractId, validContractData)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('terminateContract', () => {
    it('should terminate a contract with valid reason', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ terminated: true }));
      const result = await service.terminateContract(validContractId, 'End of term', '2026-12-31');
      expect(result.success).toBe(true);
      expect(result.type).toBe('contractTermination');
    });

    it('should throw for invalid contractId', async () => {
      await expect(service.terminateContract('bad', 'reason')).rejects.toThrow(
        'Invalid Contract ID'
      );
    });

    it('should throw when reason is missing', async () => {
      await expect(service.terminateContract(validContractId, null)).rejects.toThrow(
        'Termination reason is required'
      );
    });

    it('should throw when reason is empty string', async () => {
      await expect(service.terminateContract(validContractId, '')).rejects.toThrow(
        'Termination reason is required'
      );
    });

    it('should throw when reason is whitespace only', async () => {
      await expect(service.terminateContract(validContractId, '   ')).rejects.toThrow(
        'Termination reason is required'
      );
    });

    it('should emit contract:terminated on success', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ terminated: true }));
      const spy = jest.fn();
      service.on('contract:terminated', spy);
      await service.terminateContract(validContractId, 'Resignation');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ contractId: validContractId, reason: 'Resignation' })
      );
    });

    it('should emit contract:terminationError on API failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('contract:terminationError', spy);
      await expect(service.terminateContract(validContractId, 'reason')).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getContract', () => {
    it('should fetch contract details', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ contract: 'data' }));
      const result = await service.getContract(validContractId);
      expect(result.success).toBe(true);
      expect(result.type).toBe('contractDetails');
    });

    it('should throw for invalid contractId', async () => {
      await expect(service.getContract('bad')).rejects.toThrow('Invalid Contract ID');
    });

    it('should use cacheDuration 7200', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ c: 1 }));
      await service.getContract(validContractId);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining(`/contracts/${validContractId}`),
        expect.objectContaining({ cacheDuration: 7200 })
      );
    });

    it('should emit contract:fetchError on failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(404));
      const spy = jest.fn();
      service.on('contract:fetchError', spy);
      await expect(service.getContract(validContractId)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('listContracts', () => {
    it('should list contracts with default filters', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ contracts: [] }));
      const result = await service.listContracts();
      expect(result.success).toBe(true);
      expect(result.type).toBe('contractList');
    });

    it('should pass filters as query params', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ contracts: [] }));
      await service.listContracts({ status: 'active', limit: 10 });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/contracts',
        expect.objectContaining({
          params: expect.objectContaining({ status: 'active', limit: 10 }),
        })
      );
    });

    it('should default limit to 50 and offset to 0', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ contracts: [] }));
      await service.listContracts({});
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/contracts',
        expect.objectContaining({
          params: expect.objectContaining({ limit: 50, offset: 0 }),
        })
      );
    });

    it('should emit contracts:listError on failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('contracts:listError', spy);
      await expect(service.listContracts()).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 12. Wage management
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateEmployeeWage', () => {
    it('should update wage for valid iqama', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const result = await service.updateEmployeeWage(validIqama, validWageData);
      expect(result.success).toBe(true);
      expect(result.type).toBe('wageUpdate');
    });

    it('should throw for invalid iqama', async () => {
      await expect(service.updateEmployeeWage('bad', validWageData)).rejects.toThrow(
        'Invalid Iqama number'
      );
    });

    it('should emit wage:updated on success', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const spy = jest.fn();
      service.on('wage:updated', spy);
      await service.updateEmployeeWage(validIqama, validWageData);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ iqama: validIqama }));
    });

    it('should emit wage:error on failure', async () => {
      mockAxiosInstance.put.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('wage:error', spy);
      await expect(service.updateEmployeeWage(validIqama, validWageData)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getWageHistory', () => {
    it('should fetch wage history with default months=12', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ history: [] }));
      const result = await service.getWageHistory(validIqama);
      expect(result.success).toBe(true);
      expect(result.type).toBe('wageHistory');
    });

    it('should pass months parameter', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ history: [] }));
      await service.getWageHistory(validIqama, 6);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/wage-history'),
        expect.objectContaining({
          params: expect.objectContaining({ months: 6 }),
        })
      );
    });

    it('should throw for invalid iqama', async () => {
      await expect(service.getWageHistory('bad')).rejects.toThrow('Invalid Iqama number');
    });

    it('should emit wageHistory:error on failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('wageHistory:error', spy);
      await expect(service.getWageHistory(validIqama)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('calculateWageCompliance', () => {
    it('should calculate compliance successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ compliant: true }));
      const result = await service.calculateWageCompliance(validIqama, 5500);
      expect(result.success).toBe(true);
      expect(result.type).toBe('wageCompliance');
    });

    it('should throw for invalid iqama', async () => {
      await expect(service.calculateWageCompliance('bad', 5500)).rejects.toThrow(
        'Invalid Iqama number'
      );
    });

    it('should emit wageCompliance:error on failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('wageCompliance:error', spy);
      await expect(service.calculateWageCompliance(validIqama, 5500)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 13. WPS (Wage Protection System)
  // ════════════════════════════════════════════════════════════════════════════

  describe('submitPayrollToWPS', () => {
    const payrollData = {
      period: '2026-03',
      employees: [{ iqamaNumber: validIqama, basicSalary: 5000, netSalary: 4500 }],
    };

    it('should submit payroll successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ submissionId: 'WPS001' }, 201));
      const result = await service.submitPayrollToWPS(payrollData);
      expect(result.success).toBe(true);
      expect(result.type).toBe('wpsSubmission');
    });

    it('should emit wps:submitted on success', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ submissionId: 'WPS002' }));
      const spy = jest.fn();
      service.on('wps:submitted', spy);
      await service.submitPayrollToWPS(payrollData);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ submittedEmployees: 1 }));
    });

    it('should emit wps:error on failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('wps:error', spy);
      await expect(service.submitPayrollToWPS(payrollData)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });

    it('should normalise payroll data before sending', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ submissionId: 'WPS003' }));
      await service.submitPayrollToWPS(payrollData);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/wps/submit',
        expect.objectContaining({
          period: '2026-03',
          submissionType: 'regular',
          establishmentId: 'EST001',
        }),
        expect.any(Object)
      );
    });
  });

  describe('getWPSStatus', () => {
    it('should fetch WPS status', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ status: 'processed' }));
      const result = await service.getWPSStatus('WPS001');
      expect(result.success).toBe(true);
      expect(result.type).toBe('wpsStatus');
    });

    it('should use cacheDuration 1800', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ s: 1 }));
      await service.getWPSStatus('WPS001');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/wps/WPS001/status'),
        expect.objectContaining({ cacheDuration: 1800 })
      );
    });

    it('should emit wpsStatus:error on failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('wpsStatus:error', spy);
      await expect(service.getWPSStatus('WPS001')).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getWPSComplianceReport', () => {
    it('should fetch compliance report', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ report: 'data' }));
      const result = await service.getWPSComplianceReport('2026-03');
      expect(result.success).toBe(true);
      expect(result.type).toBe('wpsComplianceReport');
    });

    it('should use cacheDuration 86400', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ r: 1 }));
      await service.getWPSComplianceReport('2026-03');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/wps/compliance-report',
        expect.objectContaining({ cacheDuration: 86400 })
      );
    });

    it('should emit wpsReport:error on failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('wpsReport:error', spy);
      await expect(service.getWPSComplianceReport('2026-03')).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 14. Nitaqat
  // ════════════════════════════════════════════════════════════════════════════

  describe('getNitaqatStatus', () => {
    it('should fetch Nitaqat status', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ zone: 'green' }));
      const result = await service.getNitaqatStatus();
      expect(result.success).toBe(true);
      expect(result.type).toBe('nitaqatStatus');
    });

    it('should use cacheDuration 3600', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ z: 1 }));
      await service.getNitaqatStatus();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/nitaqat'),
        expect.objectContaining({ cacheDuration: 3600 })
      );
    });

    it('should emit nitaqat:error on failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('nitaqat:error', spy);
      await expect(service.getNitaqatStatus()).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('getNitaqatCompliance', () => {
    it('should fetch Nitaqat compliance', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ compliant: true }));
      const result = await service.getNitaqatCompliance();
      expect(result.success).toBe(true);
      expect(result.type).toBe('nitaqatCompliance');
    });

    it('should use cacheDuration 3600', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ c: 1 }));
      await service.getNitaqatCompliance();
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        expect.stringContaining('/nitaqat/compliance'),
        expect.objectContaining({ cacheDuration: 3600 })
      );
    });

    it('should emit nitaqatCompliance:error on failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('nitaqatCompliance:error', spy);
      await expect(service.getNitaqatCompliance()).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('calculateNitaqatPoints', () => {
    const workforce = { saudi: 10, nonSaudi: 5 };

    it('should calculate Nitaqat points', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ points: 85 }));
      const result = await service.calculateNitaqatPoints(workforce);
      expect(result.success).toBe(true);
      expect(result.type).toBe('nitaqatPoints');
    });

    it('should send workforce and establishmentId', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ points: 85 }));
      await service.calculateNitaqatPoints(workforce);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/nitaqat/calculate-points',
        expect.objectContaining({ workforce, establishmentId: 'EST001' }),
        expect.any(Object)
      );
    });

    it('should emit nitaqat:calculationError on failure', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('nitaqat:calculationError', spy);
      await expect(service.calculateNitaqatPoints(workforce)).rejects.toThrow();
      expect(spy).toHaveBeenCalled();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 15. Batch operations
  // ════════════════════════════════════════════════════════════════════════════

  describe('batchRegisterContracts', () => {
    const contracts = [validContractData, { ...validContractData, employeeIqama: '0987654321' }];

    it('should register all contracts successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ contractId: 'C1' }));
      const result = await service.batchRegisterContracts(contracts);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce(makeApiResponse({ contractId: 'C1' }))
        .mockRejectedValueOnce(makeApiError(500));
      const result = await service.batchRegisterContracts(contracts);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });

    it('should handle all failures', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(500));
      const result = await service.batchRegisterContracts(contracts);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(2);
    });

    it('should emit batchOperation:completed', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ contractId: 'C1' }));
      const spy = jest.fn();
      service.on('batchOperation:completed', spy);
      await service.batchRegisterContracts(contracts);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }));
    });

    it('should return results array with success/failure items', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce(makeApiResponse({ contractId: 'C1' }))
        .mockRejectedValueOnce(makeApiError(500));
      const result = await service.batchRegisterContracts(contracts);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });

    it('should return errors array with iqama references', async () => {
      mockAxiosInstance.post.mockRejectedValue(makeApiError(500));
      const result = await service.batchRegisterContracts(contracts);
      expect(result.summary.errors.length).toBe(2);
      expect(result.summary.errors[0].iqama).toBe(validIqama);
    });

    it('should handle empty list', async () => {
      const result = await service.batchRegisterContracts([]);
      expect(result.summary.total).toBe(0);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(0);
    });
  });

  describe('batchUpdateWages', () => {
    const wageUpdates = [
      { iqamaNumber: validIqama, wageData: validWageData },
      { iqamaNumber: '0987654321', wageData: validWageData },
    ];

    it('should update all wages successfully', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const result = await service.batchUpdateWages(wageUpdates);
      expect(result.summary.total).toBe(2);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(0);
    });

    it('should handle partial failures', async () => {
      mockAxiosInstance.put
        .mockResolvedValueOnce(makeApiResponse({ updated: true }))
        .mockRejectedValueOnce(makeApiError(500));
      const result = await service.batchUpdateWages(wageUpdates);
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
    });

    it('should handle all failures', async () => {
      mockAxiosInstance.put.mockRejectedValue(makeApiError(500));
      const result = await service.batchUpdateWages(wageUpdates);
      expect(result.summary.failed).toBe(2);
    });

    it('should emit batchWageUpdate:completed', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const spy = jest.fn();
      service.on('batchWageUpdate:completed', spy);
      await service.batchUpdateWages(wageUpdates);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ total: 2 }));
    });

    it('should return results array', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const result = await service.batchUpdateWages(wageUpdates);
      expect(result.results).toHaveLength(2);
      expect(result.results.every(r => r.success)).toBe(true);
    });

    it('should handle empty list', async () => {
      const result = await service.batchUpdateWages([]);
      expect(result.summary.total).toBe(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 16. Metrics & health
  // ════════════════════════════════════════════════════════════════════════════

  describe('getMetrics', () => {
    it('should return metrics with successRate = 0 when no requests', () => {
      const m = service.getMetrics();
      expect(m.successRate).toBe(0);
      expect(m.cacheHitRate).toBe(0);
    });

    it('should compute correct successRate', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse());
      await service._makeRequest('GET', '/s1', null, { skipCache: true });
      await service._makeRequest('GET', '/s2', null, { skipCache: true });
      const m = service.getMetrics();
      expect(m.successRate).toBe(100);
    });

    it('should compute successRate with failures', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce(makeApiResponse())
        .mockRejectedValueOnce(makeApiError(500));
      await service._makeRequest('GET', '/ok', null, { skipCache: true });
      try {
        await service._makeRequest('GET', '/fail', null, { skipCache: true });
      } catch {
        /* expected */
      }
      const m = service.getMetrics();
      expect(m.successRate).toBe(50);
    });

    it('should compute cacheHitRate', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ x: 1 }));
      await service._makeRequest('GET', '/cached-m');
      await service._makeRequest('GET', '/cached-m'); // cache hit
      const m = service.getMetrics();
      expect(m.cacheHitRate).toBeGreaterThan(0);
    });

    it('should include recentRequests', () => {
      service.requestHistory.push({ level: 'info', message: 'test' });
      const m = service.getMetrics();
      expect(m.recentRequests.length).toBe(1);
    });

    it('should include all metric fields', () => {
      const m = service.getMetrics();
      expect(m).toHaveProperty('totalRequests');
      expect(m).toHaveProperty('successfulRequests');
      expect(m).toHaveProperty('failedRequests');
      expect(m).toHaveProperty('cachedResponses');
      expect(m).toHaveProperty('averageResponseTime');
      expect(m).toHaveProperty('requestTimes');
      expect(m).toHaveProperty('successRate');
      expect(m).toHaveProperty('cacheHitRate');
      expect(m).toHaveProperty('recentRequests');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when API responds', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ status: 'ok' }));
      const result = await service.healthCheck();
      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.metrics).toBeDefined();
    });

    it('should return unhealthy when API fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(503));
      const result = await service.healthCheck();
      expect(result.status).toBe('unhealthy');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.error).toBeTruthy();
    });

    it('should skip cache for health check', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ status: 'ok' }));
      await service.healthCheck();
      await service.healthCheck();
      // Both calls should hit the API (no caching)
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
    });

    it('should include metrics in healthy response', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ status: 'ok' }));
      const result = await service.healthCheck();
      expect(result.metrics).toHaveProperty('totalRequests');
      expect(result.metrics).toHaveProperty('successRate');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 17. Request history
  // ════════════════════════════════════════════════════════════════════════════

  describe('getRequestHistory', () => {
    beforeEach(() => {
      service.requestHistory = [
        { level: 'info', message: 'a', timestamp: new Date() },
        { level: 'error', message: 'b', timestamp: new Date() },
        { level: 'info', message: 'c', timestamp: new Date() },
        { level: 'error', message: 'd', timestamp: new Date() },
        { level: 'info', message: 'e', timestamp: new Date() },
      ];
    });

    it('should return all history when no filter', () => {
      expect(service.getRequestHistory()).toHaveLength(5);
    });

    it('should filter by level', () => {
      const errors = service.getRequestHistory({ level: 'error' });
      expect(errors).toHaveLength(2);
      expect(errors.every(h => h.level === 'error')).toBe(true);
    });

    it('should apply limit', () => {
      const limited = service.getRequestHistory({ limit: 2 });
      expect(limited).toHaveLength(2);
    });

    it('should apply both level and limit', () => {
      const result = service.getRequestHistory({ level: 'info', limit: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].level).toBe('info');
    });

    it('should return last N entries for limit', () => {
      const limited = service.getRequestHistory({ limit: 3 });
      expect(limited[limited.length - 1].message).toBe('e');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 18. _log
  // ════════════════════════════════════════════════════════════════════════════

  describe('_log', () => {
    it('should push entry to requestHistory', () => {
      service._log('info', 'test message', { key: 'val' });
      expect(service.requestHistory).toHaveLength(1);
      expect(service.requestHistory[0].message).toBe('test message');
      expect(service.requestHistory[0].level).toBe('info');
    });

    it('should call logger.error for error level', () => {
      const logger = require('../../utils/logger');
      service._log('error', 'oops');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('oops'),
        expect.any(Object)
      );
    });

    it('should call logger.info for non-error levels', () => {
      const logger = require('../../utils/logger');
      service._log('info', 'ok');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('ok'), expect.any(Object));
    });

    it('should cap requestHistory at 1000', () => {
      for (let i = 0; i < 1005; i++) {
        service._log('info', `msg-${i}`);
      }
      expect(service.requestHistory.length).toBe(1000);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 19. _generateSignature
  // ════════════════════════════════════════════════════════════════════════════

  describe('_generateSignature', () => {
    it('should return a hash string', () => {
      const sig = service._generateSignature({ foo: 'bar' });
      expect(sig).toBe('mock-hash');
    });

    it('should call crypto.createHash with sha256', () => {
      const crypto = require('crypto');
      service._generateSignature({});
      expect(crypto.createHash).toHaveBeenCalledWith('sha256');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 20. _isRetryableError
  // ════════════════════════════════════════════════════════════════════════════

  describe('_isRetryableError', () => {
    it('should return true for network error (no response)', () => {
      expect(service._isRetryableError(new Error('ECONNRESET'))).toBe(true);
    });

    it('should return true for 429 (rate limit)', () => {
      expect(service._isRetryableError({ response: { status: 429 } })).toBe(true);
    });

    it('should return true for 503 (service unavailable)', () => {
      expect(service._isRetryableError({ response: { status: 503 } })).toBe(true);
    });

    it('should return true for 504 (gateway timeout)', () => {
      expect(service._isRetryableError({ response: { status: 504 } })).toBe(true);
    });

    it('should return false for 400', () => {
      expect(service._isRetryableError({ response: { status: 400 } })).toBe(false);
    });

    it('should return false for 404', () => {
      expect(service._isRetryableError({ response: { status: 404 } })).toBe(false);
    });

    it('should return false for 500', () => {
      expect(service._isRetryableError({ response: { status: 500 } })).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 21. Event emission integration
  // ════════════════════════════════════════════════════════════════════════════

  describe('Event emission', () => {
    it('should emit contract:registered with contractId and iqama', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ contractId: 'EVT1' }));
      const spy = jest.fn();
      service.on('contract:registered', spy);
      await service.registerContract(validContractData);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ iqama: validIqama, timestamp: expect.any(Date) })
      );
    });

    it('should emit contract:terminated with reason', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ terminated: true }));
      const spy = jest.fn();
      service.on('contract:terminated', spy);
      await service.terminateContract(validContractId, 'Resigned');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ contractId: validContractId, reason: 'Resigned' })
      );
    });

    it('should emit wage:updated with iqama', async () => {
      mockAxiosInstance.put.mockResolvedValue(makeApiResponse({ updated: true }));
      const spy = jest.fn();
      service.on('wage:updated', spy);
      await service.updateEmployeeWage(validIqama, validWageData);
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ iqama: validIqama }));
    });

    it('should emit wps:submitted with submittedEmployees count', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ submissionId: 'W1' }));
      const spy = jest.fn();
      service.on('wps:submitted', spy);
      await service.submitPayrollToWPS({
        period: '2026-03',
        employees: [
          { iqamaNumber: validIqama, basicSalary: 5000, netSalary: 4500 },
          { iqamaNumber: '0987654321', basicSalary: 6000, netSalary: 5400 },
        ],
      });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ submittedEmployees: 2 }));
    });

    it('should emit verification:error when verifyByIqama fails', async () => {
      mockAxiosInstance.get.mockRejectedValue(makeApiError(500));
      const spy = jest.fn();
      service.on('verification:error', spy);
      await expect(service.verifyEmployeeByIqama(validIqama)).rejects.toThrow();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should emit batchOperation:completed with summary', async () => {
      mockAxiosInstance.post
        .mockResolvedValueOnce(makeApiResponse({ contractId: 'B1' }))
        .mockRejectedValueOnce(makeApiError(500));
      const spy = jest.fn();
      service.on('batchOperation:completed', spy);
      await service.batchRegisterContracts([
        validContractData,
        { ...validContractData, employeeIqama: '0987654321' },
      ]);
      expect(spy).toHaveBeenCalledWith({ total: 2, successful: 1, failed: 1 });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // 22. Edge cases
  // ════════════════════════════════════════════════════════════════════════════

  describe('Edge cases', () => {
    it('should handle concurrent _makeRequest calls', async () => {
      mockAxiosInstance.get.mockResolvedValue(makeApiResponse({ ok: true }));
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ ok: true }));
      const [r1, r2] = await Promise.all([
        service._makeRequest('GET', '/a', null, { skipCache: true }),
        service._makeRequest('POST', '/b', { x: 1 }),
      ]);
      expect(r1.data).toEqual({ ok: true });
      expect(r2.data).toEqual({ ok: true });
    });

    it('should handle service instantiation without env vars', () => {
      const origBase = process.env.QIWA_API_BASE_URL;
      delete process.env.QIWA_API_BASE_URL;
      const s = new QiwaService();
      expect(s.baseUrl).toBe('https://api.qiwa.sa/v1');
      process.env.QIWA_API_BASE_URL = origBase;
    });

    it('clearCache should not throw on empty cache', () => {
      expect(() => service.clearCache()).not.toThrow();
      expect(() => service.clearCache('pattern')).not.toThrow();
    });

    it('getRequestHistory should handle empty history', () => {
      service.requestHistory = [];
      expect(service.getRequestHistory()).toEqual([]);
      expect(service.getRequestHistory({ level: 'error' })).toEqual([]);
      expect(service.getRequestHistory({ limit: 10 })).toEqual([]);
    });

    it('_normalizeWageData should handle zero values', () => {
      const result = service._normalizeWageData({ basicSalary: 0 });
      expect(result.basicSalary).toBe(0);
      expect(result.totalSalary).toBe(0);
    });

    it('batchRegisterContracts with single item', async () => {
      mockAxiosInstance.post.mockResolvedValue(makeApiResponse({ contractId: 'S1' }));
      const result = await service.batchRegisterContracts([validContractData]);
      expect(result.summary.total).toBe(1);
      expect(result.summary.successful).toBe(1);
    });

    it('_normalizeContractData should handle custom workingHours', () => {
      const result = service._normalizeContractData({ ...validContractData, workingHours: 6 });
      expect(result.workingHours).toBe(6);
    });

    it('_normalizePayrollData should handle custom submissionType', () => {
      const result = service._normalizePayrollData({
        period: '2026-03',
        submissionType: 'correction',
        employees: [],
      });
      expect(result.submissionType).toBe('correction');
    });
  });
});
