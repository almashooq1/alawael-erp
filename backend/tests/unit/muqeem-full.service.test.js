/**
 * Unit tests for MuqeemFullService
 * @module tests/unit/muqeem-full.service.test
 */
'use strict';

// ── Mock dependencies BEFORE requiring service ─────────────────────────────
const mockAxiosInstance = {
  get: jest.fn(),
  post: jest.fn(),
  delete: jest.fn(),
  defaults: { headers: { common: {} } },
};
jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// ── Mock Mongoose models ───────────────────────────────────────────────────
const mockMakeModel = () => ({
  find: jest.fn().mockReturnThis(),
  findOne: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  countDocuments: jest.fn().mockResolvedValue(0),
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([]),
  lean: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
});

const mockEmployeeResidency = mockMakeModel();
const mockVisaRequest = mockMakeModel();
const mockMuqeemTransaction = mockMakeModel();
const mockTransferRequest = mockMakeModel();

jest.mock('../../models/muqeem.models', () => ({
  EmployeeResidency: mockEmployeeResidency,
  VisaRequest: mockVisaRequest,
  MuqeemTransaction: mockMuqeemTransaction,
  TransferRequest: mockTransferRequest,
}));

const service = require('../../services/muqeem-full.service');
const logger = require('../../utils/logger');

// ── Helpers ────────────────────────────────────────────────────────────────
const resetModelChain = model => {
  model.find.mockReturnThis();
  model.populate.mockReturnThis();
  model.sort.mockReturnThis();
  model.limit.mockReturnThis();
  model.skip.mockResolvedValue([]);
  model.lean.mockReturnThis();
  model.select.mockReturnThis();
};

const CTX = { userId: 'user-1', organizationId: 'org-1', ip: '127.0.0.1' };

// ════════════════════════════════════════════════════════════════════════════
describe('MuqeemFullService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.token = null;
    service.tokenExpiry = null;

    // Default: mockMuqeemTransaction.create succeeds, findByIdAndUpdate succeeds
    mockMuqeemTransaction.create.mockResolvedValue({ _id: 'tx-1' });
    mockMuqeemTransaction.findByIdAndUpdate.mockResolvedValue({});

    // Reset chainable helpers
    resetModelChain(mockEmployeeResidency);
    resetModelChain(mockVisaRequest);
    resetModelChain(mockMuqeemTransaction);
    resetModelChain(mockTransferRequest);
  });

  // ========================================================================
  // 1. Module exports
  // ========================================================================
  describe('Module exports', () => {
    it('should export an object (singleton)', () => {
      expect(typeof service).toBe('object');
      expect(service).not.toBeNull();
    });

    it('should expose authenticate method', () => {
      expect(typeof service.authenticate).toBe('function');
    });

    it('should expose _buildHeaders method', () => {
      expect(typeof service._buildHeaders).toBe('function');
    });

    it('should expose _makeRequest method', () => {
      expect(typeof service._makeRequest).toBe('function');
    });

    it('should expose queryIqama method', () => {
      expect(typeof service.queryIqama).toBe('function');
    });

    it('should expose issueIqama method', () => {
      expect(typeof service.issueIqama).toBe('function');
    });

    it('should expose renewIqama method', () => {
      expect(typeof service.renewIqama).toBe('function');
    });

    it('should expose issueExitReentryVisa method', () => {
      expect(typeof service.issueExitReentryVisa).toBe('function');
    });

    it('should expose issueFinalExitVisa method', () => {
      expect(typeof service.issueFinalExitVisa).toBe('function');
    });

    it('should expose cancelVisa method', () => {
      expect(typeof service.cancelVisa).toBe('function');
    });

    it('should expose extendVisa method', () => {
      expect(typeof service.extendVisa).toBe('function');
    });

    it('should expose requestTransfer method', () => {
      expect(typeof service.requestTransfer).toBe('function');
    });

    it('should expose approveTransfer method', () => {
      expect(typeof service.approveTransfer).toBe('function');
    });

    it('should expose rejectTransfer method', () => {
      expect(typeof service.rejectTransfer).toBe('function');
    });

    it('should expose getExpiringFromMuqeem method', () => {
      expect(typeof service.getExpiringFromMuqeem).toBe('function');
    });

    it('should expose getTransferStatus method', () => {
      expect(typeof service.getTransferStatus).toBe('function');
    });

    it('should expose queryByPassport method', () => {
      expect(typeof service.queryByPassport).toBe('function');
    });

    it('should expose getPendingTransfers method', () => {
      expect(typeof service.getPendingTransfers).toBe('function');
    });

    it('should expose getVisaStatusReport method', () => {
      expect(typeof service.getVisaStatusReport).toBe('function');
    });

    it('should expose checkAndSendExpiryAlerts method', () => {
      expect(typeof service.checkAndSendExpiryAlerts).toBe('function');
    });

    it('should expose getLocalResidencies method', () => {
      expect(typeof service.getLocalResidencies).toBe('function');
    });

    it('should expose getEmployeeTransactions method', () => {
      expect(typeof service.getEmployeeTransactions).toBe('function');
    });

    it('should expose getDashboardStats method', () => {
      expect(typeof service.getDashboardStats).toBe('function');
    });

    it('should expose _mapIqamaStatus helper', () => {
      expect(typeof service._mapIqamaStatus).toBe('function');
    });

    it('should expose _generateMockResponse helper', () => {
      expect(typeof service._generateMockResponse).toBe('function');
    });
  });

  // ========================================================================
  // 2. Authentication
  // ========================================================================
  describe('authenticate()', () => {
    it('should return MOCK_TOKEN in mock mode', async () => {
      const token = await service.authenticate();
      expect(token).toBe('MOCK_TOKEN');
    });

    it('should set tokenExpiry ~55 minutes in the future', async () => {
      const before = Date.now();
      await service.authenticate();
      const after = Date.now();
      const fiftyFiveMin = 55 * 60 * 1000;
      expect(service.tokenExpiry).toBeGreaterThanOrEqual(before + fiftyFiveMin);
      expect(service.tokenExpiry).toBeLessThanOrEqual(after + fiftyFiveMin);
    });

    it('should cache token on subsequent calls', async () => {
      await service.authenticate();
      const first = service.token;
      const firstExpiry = service.tokenExpiry;

      const token2 = await service.authenticate();
      expect(token2).toBe(first);
      expect(service.tokenExpiry).toBe(firstExpiry);
    });

    it('should refresh token when expired', async () => {
      await service.authenticate();
      // Simulate expired token
      service.tokenExpiry = Date.now() - 1000;

      const token = await service.authenticate();
      expect(token).toBe('MOCK_TOKEN');
      expect(service.tokenExpiry).toBeGreaterThan(Date.now());
    });

    it('should set token to MOCK_TOKEN (not null)', async () => {
      await service.authenticate();
      expect(service.token).toBe('MOCK_TOKEN');
      expect(service.token).not.toBeNull();
    });
  });

  // ========================================================================
  // 3. _buildHeaders
  // ========================================================================
  describe('_buildHeaders()', () => {
    it('should return object with Authorization header', async () => {
      const headers = await service._buildHeaders();
      expect(headers.Authorization).toBe('Bearer MOCK_TOKEN');
    });

    it('should contain Content-Type application/json', async () => {
      const headers = await service._buildHeaders();
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should contain Accept-Language ar', async () => {
      const headers = await service._buildHeaders();
      expect(headers['Accept-Language']).toBe('ar');
    });

    it('should contain X-Establishment-Number', async () => {
      const headers = await service._buildHeaders();
      expect(headers).toHaveProperty('X-Establishment-Number');
    });

    it('should call authenticate internally', async () => {
      const spy = jest.spyOn(service, 'authenticate');
      await service._buildHeaders();
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  // ========================================================================
  // 4. _makeRequest
  // ========================================================================
  describe('_makeRequest()', () => {
    it('should create a mockMuqeemTransaction record', async () => {
      await service._makeRequest('get', '/iqama/123', {}, 'emp-1', CTX);
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'iqama_query',
          status: 'pending',
        })
      );
    });

    it('should return mock response in mock mode', async () => {
      const result = await service._makeRequest('get', '/iqama/123', {});
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('reference_number');
    });

    it('should update transaction to success after mock response', async () => {
      await service._makeRequest('get', '/iqama/123');
      expect(mockMuqeemTransaction.findByIdAndUpdate).toHaveBeenCalledWith(
        'tx-1',
        expect.objectContaining({ status: 'success', httpStatusCode: 200 })
      );
    });

    it('should store processingTimeMs in transaction', async () => {
      await service._makeRequest('get', '/iqama/123');
      const updateCall = mockMuqeemTransaction.findByIdAndUpdate.mock.calls[0];
      expect(updateCall[1]).toHaveProperty('processingTimeMs');
      expect(typeof updateCall[1].processingTimeMs).toBe('number');
    });

    it('should set employeeId when provided', async () => {
      await service._makeRequest('get', '/iqama/123', {}, 'emp-99', CTX);
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ employee: 'emp-99' })
      );
    });

    it('should set initiatedBy from context', async () => {
      await service._makeRequest('get', '/iqama/123', {}, null, { userId: 'u-5' });
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ initiatedBy: 'u-5' })
      );
    });

    it('should handle transaction creation failure gracefully', async () => {
      mockMuqeemTransaction.create.mockRejectedValueOnce(new Error('DB fail'));
      // Should not throw — just logs a warning
      const result = await service._makeRequest('get', '/iqama/123');
      expect(result).toHaveProperty('success', true);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should resolve correct transactionType for /iqama/issue', async () => {
      await service._makeRequest('post', '/iqama/issue', {});
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ transactionType: 'iqama_issue' })
      );
    });

    it('should resolve correct transactionType for /iqama/renew', async () => {
      await service._makeRequest('post', '/iqama/renew', {});
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ transactionType: 'iqama_renew' })
      );
    });

    it('should resolve correct transactionType for /visa/exit-reentry', async () => {
      await service._makeRequest('post', '/visa/exit-reentry', {});
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ transactionType: 'visa_exit_reentry' })
      );
    });

    it('should resolve correct transactionType for /visa/final-exit', async () => {
      await service._makeRequest('post', '/visa/final-exit', {});
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ transactionType: 'visa_final_exit' })
      );
    });

    it('should resolve correct transactionType for /transfer/request', async () => {
      await service._makeRequest('post', '/transfer/request', {});
      expect(mockMuqeemTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ transactionType: 'transfer_request' })
      );
    });
  });

  // ========================================================================
  // 5. Iqama operations
  // ========================================================================
  describe('queryIqama()', () => {
    it('should call _makeRequest with GET and iqama endpoint', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(null);
      const spy = jest.spyOn(service, '_makeRequest');
      await service.queryIqama('2123456789', CTX);
      expect(spy).toHaveBeenCalledWith('get', '/iqama/2123456789', {}, null, CTX);
      spy.mockRestore();
    });

    it('should return the mock response', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(null);
      const result = await service.queryIqama('2123456789');
      expect(result).toHaveProperty('success', true);
    });

    it('should update local residency when found', async () => {
      const mockRes = { _id: 'res-1', iqamaNumber: '2123456789' };
      mockEmployeeResidency.findOne.mockResolvedValue(mockRes);
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});

      await service.queryIqama('2123456789', CTX);

      expect(mockEmployeeResidency.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({ muqeemData: expect.any(Object) })
      );
    });

    it('should NOT update residency when not found locally', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(null);
      await service.queryIqama('9999999999');
      expect(mockEmployeeResidency.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should map status from response when present', async () => {
      const mockRes = { _id: 'res-1', iqamaNumber: '2123456789' };
      mockEmployeeResidency.findOne.mockResolvedValue(mockRes);
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});

      // The mock response includes status: 'valid' for /iqama/ endpoint
      await service.queryIqama('2123456789', CTX);

      expect(mockEmployeeResidency.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({ status: 'active' }) // 'valid' → 'active'
      );
    });
  });

  describe('issueIqama()', () => {
    const issueData = {
      borderNumber: 'B123',
      passportNumber: 'P456',
      passportCountryCode: 'PK',
      occupationCode: '1234',
      durationYears: 2,
    };

    it('should call _makeRequest with POST /iqama/issue', async () => {
      mockEmployeeResidency.create.mockResolvedValue({ _id: 'new-res', employee: 'emp-1' });
      const spy = jest.spyOn(service, '_makeRequest');
      await service.issueIqama('emp-1', issueData, CTX);
      expect(spy).toHaveBeenCalledWith(
        'post',
        '/iqama/issue',
        expect.objectContaining({ border_number: 'B123' }),
        'emp-1',
        CTX
      );
      spy.mockRestore();
    });

    it('should create mockEmployeeResidency in database', async () => {
      mockEmployeeResidency.create.mockResolvedValue({ _id: 'new-res', employee: 'emp-1' });
      await service.issueIqama('emp-1', issueData, CTX);
      expect(mockEmployeeResidency.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: 'emp-1',
          borderNumber: 'B123',
          passportNumber: 'P456',
          status: 'active',
        })
      );
    });

    it('should return the created residency document', async () => {
      const doc = { _id: 'new-res', employee: 'emp-1', iqamaNumber: '2999' };
      mockEmployeeResidency.create.mockResolvedValue(doc);
      const result = await service.issueIqama('emp-1', issueData, CTX);
      expect(result).toEqual(doc);
    });

    it('should log success message', async () => {
      mockEmployeeResidency.create.mockResolvedValue({ _id: 'r1' });
      await service.issueIqama('emp-1', issueData, CTX);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Iqama issued'));
    });

    it('should include passportIssueDate when provided', async () => {
      mockEmployeeResidency.create.mockResolvedValue({ _id: 'r1' });
      await service.issueIqama('emp-1', { ...issueData, passportIssueDate: '2024-01-01' }, CTX);
      expect(mockEmployeeResidency.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passportIssueDate: expect.any(Date),
        })
      );
    });

    it('should set organizationId from context', async () => {
      mockEmployeeResidency.create.mockResolvedValue({ _id: 'r1' });
      await service.issueIqama('emp-1', issueData, CTX);
      expect(mockEmployeeResidency.create).toHaveBeenCalledWith(
        expect.objectContaining({ organization: 'org-1' })
      );
    });
  });

  describe('renewIqama()', () => {
    const makeResidency = () => ({
      _id: 'res-1',
      iqamaNumber: '2123456789',
      status: 'active',
      employee: { toString: () => 'emp-1' },
      muqeemData: {},
      save: jest.fn(),
    });

    it('should throw if residency not found', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(null);
      await expect(service.renewIqama('9999999999')).rejects.toThrow('لم يتم العثور على إقامة');
    });

    it('should call _makeRequest with POST /iqama/renew', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(makeResidency());
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockEmployeeResidency.findById.mockResolvedValue({ _id: 'res-1', status: 'active' });

      const spy = jest.spyOn(service, '_makeRequest');
      await service.renewIqama('2123456789', 2, CTX);

      expect(spy).toHaveBeenCalledWith(
        'post',
        '/iqama/renew',
        expect.objectContaining({ iqama_number: '2123456789', duration_years: 2 }),
        'emp-1',
        CTX
      );
      spy.mockRestore();
    });

    it('should update iqamaExpiryDate from response', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(makeResidency());
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockEmployeeResidency.findById.mockResolvedValue({ _id: 'res-1' });

      await service.renewIqama('2123456789', 1, CTX);

      expect(mockEmployeeResidency.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({
          iqamaExpiryDate: expect.any(Date),
          status: 'active',
          alertLevel: 'none',
        })
      );
    });

    it('should record sadad_number when present in response', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(makeResidency());
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockEmployeeResidency.findById.mockResolvedValue({ _id: 'res-1' });
      mockMuqeemTransaction.findOneAndUpdate.mockResolvedValue({});

      await service.renewIqama('2123456789', 1, CTX);

      // Mock response for /iqama/renew always includes sadad_number
      expect(mockMuqeemTransaction.findOneAndUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'iqama_renew',
          status: 'success',
        }),
        expect.objectContaining({
          $set: expect.objectContaining({ sadadNumber: expect.any(String) }),
        }),
        expect.objectContaining({ sort: { createdAt: -1 } })
      );
    });

    it('should return updated residency from findById', async () => {
      const updated = { _id: 'res-1', status: 'active', iqamaExpiryDate: new Date() };
      mockEmployeeResidency.findOne.mockResolvedValue(makeResidency());
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockEmployeeResidency.findById.mockResolvedValue(updated);

      const result = await service.renewIqama('2123456789');
      expect(result).toEqual(updated);
    });

    it('should log renewal info', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(makeResidency());
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockEmployeeResidency.findById.mockResolvedValue({});

      await service.renewIqama('2123456789');
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Iqama renewed'));
    });
  });

  // ========================================================================
  // 6. Visa operations
  // ========================================================================
  describe('issueExitReentryVisa()', () => {
    const visaData = { type: 'single', durationDays: 60, destination: 'PK', purpose: 'vacation' };
    const activeResidency = {
      _id: 'res-1',
      employee: 'emp-1',
      iqamaNumber: '2123456789',
      status: 'active',
    };

    it('should throw if no active residency', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(null);
      await expect(service.issueExitReentryVisa('emp-1', visaData, CTX)).rejects.toThrow(
        'لا يوجد إقامة سارية'
      );
    });

    it('should create a mockVisaRequest record', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-1' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({ _id: 'visa-1', status: 'issued' });

      await service.issueExitReentryVisa('emp-1', visaData, CTX);

      expect(mockVisaRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: 'emp-1',
          visaType: 'exit_reentry_single',
          status: 'pending',
        })
      );
    });

    it('should set visaType to exit_reentry_multiple for type=multiple', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-1' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({ _id: 'visa-1' });

      await service.issueExitReentryVisa('emp-1', { ...visaData, type: 'multiple' }, CTX);

      expect(mockVisaRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ visaType: 'exit_reentry_multiple' })
      );
    });

    it('should update visa to issued on success', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-1' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({ _id: 'visa-1', status: 'issued' });

      await service.issueExitReentryVisa('emp-1', visaData, CTX);

      expect(mockVisaRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        'visa-1',
        expect.objectContaining({ status: 'issued' })
      );
    });

    it('should return the visa request document', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-1' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      const expected = { _id: 'visa-1', status: 'issued', visaNumber: 'ER-123' };
      mockVisaRequest.findById.mockResolvedValue(expected);

      const result = await service.issueExitReentryVisa('emp-1', visaData, CTX);
      expect(result).toEqual(expected);
    });
  });

  describe('issueFinalExitVisa()', () => {
    const activeResidency = {
      _id: 'res-1',
      employee: 'emp-1',
      iqamaNumber: '2123456789',
      status: 'active',
    };

    it('should throw if no active residency', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(null);
      await expect(service.issueFinalExitVisa('emp-1', 'end of contract', CTX)).rejects.toThrow(
        'لا يوجد إقامة سارية'
      );
    });

    it('should create a mockVisaRequest with visaType final_exit', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-2' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({ _id: 'visa-2' });

      await service.issueFinalExitVisa('emp-1', 'resignation', CTX);

      expect(mockVisaRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({ visaType: 'final_exit', purpose: 'resignation' })
      );
    });

    it('should update residency status to final_exit', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-2' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({ _id: 'visa-2' });

      await service.issueFinalExitVisa('emp-1', 'resignation', CTX);

      expect(mockEmployeeResidency.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({ status: 'final_exit' })
      );
    });

    it('should return the visa request document', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-2' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      const expected = { _id: 'visa-2', visaType: 'final_exit' };
      mockVisaRequest.findById.mockResolvedValue(expected);

      const result = await service.issueFinalExitVisa('emp-1', null, CTX);
      expect(result).toEqual(expected);
    });

    it('should log final exit info', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockVisaRequest.create.mockResolvedValue({ _id: 'visa-2' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({});

      await service.issueFinalExitVisa('emp-1', null, CTX);
      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Final exit visa'));
    });
  });

  describe('cancelVisa()', () => {
    it('should throw if visa not found', async () => {
      mockVisaRequest.findById.mockResolvedValue(null);
      await expect(service.cancelVisa('bad-id', CTX)).rejects.toThrow('التأشيرة غير موجودة');
    });

    it('should throw if visa status is pending', async () => {
      mockVisaRequest.findById.mockResolvedValue({
        _id: 'v-1',
        status: 'pending',
        visaNumber: 'VN-1',
        employee: { toString: () => 'emp-1' },
      });
      await expect(service.cancelVisa('v-1', CTX)).rejects.toThrow('لا يمكن إلغاء تأشيرة');
    });

    it('should throw if visa status is cancelled', async () => {
      mockVisaRequest.findById.mockResolvedValue({
        _id: 'v-1',
        status: 'cancelled',
        visaNumber: 'VN-1',
        employee: { toString: () => 'emp-1' },
      });
      await expect(service.cancelVisa('v-1', CTX)).rejects.toThrow('لا يمكن إلغاء تأشيرة');
    });

    it('should throw if visa status is rejected', async () => {
      mockVisaRequest.findById.mockResolvedValue({
        _id: 'v-1',
        status: 'rejected',
        visaNumber: 'VN-1',
        employee: { toString: () => 'emp-1' },
      });
      await expect(service.cancelVisa('v-1', CTX)).rejects.toThrow('لا يمكن إلغاء تأشيرة');
    });

    it('should succeed for issued visa', async () => {
      mockVisaRequest.findById
        .mockResolvedValueOnce({
          _id: 'v-1',
          status: 'issued',
          visaNumber: 'VN-1',
          employee: { toString: () => 'emp-1' },
        })
        .mockResolvedValue({ _id: 'v-1', status: 'cancelled' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.cancelVisa('v-1', CTX);
      expect(mockVisaRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({ status: 'cancelled' })
      );
      expect(result).toEqual(expect.objectContaining({ status: 'cancelled' }));
    });

    it('should succeed for approved visa', async () => {
      mockVisaRequest.findById
        .mockResolvedValueOnce({
          _id: 'v-1',
          status: 'approved',
          visaNumber: 'VN-2',
          employee: { toString: () => 'emp-2' },
        })
        .mockResolvedValue({ _id: 'v-1', status: 'cancelled' });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});

      await service.cancelVisa('v-1', CTX);
      expect(mockVisaRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({ status: 'cancelled' })
      );
    });
  });

  describe('extendVisa()', () => {
    it('should throw if visa not found with status issued', async () => {
      mockVisaRequest.findOne.mockResolvedValue(null);
      await expect(service.extendVisa('VN-999', 30, CTX)).rejects.toThrow(
        'غير موجودة أو ليست سارية'
      );
    });

    it('should call _makeRequest with POST /visa/exit-reentry/extend', async () => {
      const visa = {
        _id: 'v-1',
        visaNumber: 'ER-123',
        status: 'issued',
        employee: { toString: () => 'emp-1' },
        visaEndDate: new Date(),
      };
      mockVisaRequest.findOne.mockResolvedValue(visa);
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({ _id: 'v-1' });

      const spy = jest.spyOn(service, '_makeRequest');
      await service.extendVisa('ER-123', 30, CTX);

      expect(spy).toHaveBeenCalledWith(
        'post',
        '/visa/exit-reentry/extend',
        expect.objectContaining({ visa_number: 'ER-123', additional_days: 30 }),
        'emp-1',
        CTX
      );
      spy.mockRestore();
    });

    it('should update visaEndDate in database', async () => {
      const visa = {
        _id: 'v-1',
        visaNumber: 'ER-123',
        status: 'issued',
        employee: { toString: () => 'emp-1' },
        visaEndDate: new Date(),
      };
      mockVisaRequest.findOne.mockResolvedValue(visa);
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.findById.mockResolvedValue({ _id: 'v-1' });

      await service.extendVisa('ER-123', 30, CTX);
      expect(mockVisaRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        'v-1',
        expect.objectContaining({ muqeemResponse: expect.any(Object) })
      );
    });

    it('should return updated visa document', async () => {
      const visa = {
        _id: 'v-1',
        visaNumber: 'ER-123',
        status: 'issued',
        employee: { toString: () => 'emp-1' },
        visaEndDate: new Date(),
      };
      mockVisaRequest.findOne.mockResolvedValue(visa);
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});
      const expected = { _id: 'v-1', visaNumber: 'ER-123' };
      mockVisaRequest.findById.mockResolvedValue(expected);

      const result = await service.extendVisa('ER-123', 30, CTX);
      expect(result).toEqual(expected);
    });
  });

  // ========================================================================
  // 7. Transfer operations
  // ========================================================================
  describe('requestTransfer()', () => {
    const activeResidency = {
      _id: 'res-1',
      employee: 'emp-1',
      iqamaNumber: '2123456789',
      status: 'active',
    };

    it('should throw if no active residency', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(null);
      await expect(service.requestTransfer('emp-1', 'EST-99', CTX)).rejects.toThrow(
        'لا يوجد إقامة سارية'
      );
    });

    it('should create a mockTransferRequest record', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockTransferRequest.create.mockResolvedValue({ _id: 'tr-1' });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});
      mockTransferRequest.findById.mockResolvedValue({ _id: 'tr-1' });

      await service.requestTransfer('emp-1', 'EST-99', CTX);

      expect(mockTransferRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          employee: 'emp-1',
          fromEstablishment: 'EST-99',
          direction: 'incoming',
          status: 'pending_request',
        })
      );
    });

    it('should update transfer to pending_approval after API', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockTransferRequest.create.mockResolvedValue({ _id: 'tr-1' });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});
      mockTransferRequest.findById.mockResolvedValue({ _id: 'tr-1', status: 'pending_approval' });

      await service.requestTransfer('emp-1', 'EST-99', CTX);

      expect(mockTransferRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        'tr-1',
        expect.objectContaining({ status: 'pending_approval' })
      );
    });

    it('should update residency to pending_transfer', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockTransferRequest.create.mockResolvedValue({ _id: 'tr-1' });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});
      mockTransferRequest.findById.mockResolvedValue({ _id: 'tr-1' });

      await service.requestTransfer('emp-1', 'EST-99', CTX);

      expect(mockEmployeeResidency.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({ status: 'pending_transfer' })
      );
    });

    it('should set responseDeadline ~15 days in future', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockTransferRequest.create.mockResolvedValue({ _id: 'tr-1' });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});
      mockTransferRequest.findById.mockResolvedValue({ _id: 'tr-1' });

      await service.requestTransfer('emp-1', 'EST-99', CTX);

      const createCall = mockTransferRequest.create.mock.calls[0][0];
      const deadlineDays = (createCall.responseDeadline - new Date()) / (1000 * 60 * 60 * 24);
      expect(deadlineDays).toBeCloseTo(15, 0);
    });

    it('should return the transfer document', async () => {
      mockEmployeeResidency.findOne.mockResolvedValue(activeResidency);
      mockTransferRequest.create.mockResolvedValue({ _id: 'tr-1' });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});
      const expected = { _id: 'tr-1', status: 'pending_approval' };
      mockTransferRequest.findById.mockResolvedValue(expected);

      const result = await service.requestTransfer('emp-1', 'EST-99', CTX);
      expect(result).toEqual(expected);
    });
  });

  describe('approveTransfer()', () => {
    it('should throw if transfer not found', async () => {
      mockTransferRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      await expect(service.approveTransfer('bad-id', CTX)).rejects.toThrow('طلب النقل غير موجود');
    });

    it('should update transfer to approved', async () => {
      const transfer = {
        _id: 'tr-1',
        muqeemRequestId: 'MR-1',
        employee: { toString: () => 'emp-1' },
        residency: { _id: 'res-1' },
      };
      mockTransferRequest.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(transfer),
      });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});
      mockTransferRequest.findById.mockReturnValueOnce({
        populate: jest.fn().mockResolvedValue(transfer),
      });
      // Second call (return after update)
      mockTransferRequest.findById.mockResolvedValue({ _id: 'tr-1', status: 'approved' });

      await service.approveTransfer('tr-1', CTX);

      expect(mockTransferRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        'tr-1',
        expect.objectContaining({ status: 'approved', approvedBy: 'user-1' })
      );
    });

    it('should update residency to transferred', async () => {
      const transfer = {
        _id: 'tr-1',
        muqeemRequestId: 'MR-1',
        employee: { toString: () => 'emp-1' },
        residency: { _id: 'res-1' },
      };
      mockTransferRequest.findById.mockReturnValue({
        populate: jest.fn().mockResolvedValue(transfer),
      });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});

      // after the main findById().populate(), the service also calls findById for return
      // We need to handle the second findById call
      mockTransferRequest.findById
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(transfer) })
        .mockResolvedValueOnce({ _id: 'tr-1', status: 'approved' });

      await service.approveTransfer('tr-1', CTX);

      expect(mockEmployeeResidency.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({ status: 'transferred' })
      );
    });
  });

  describe('rejectTransfer()', () => {
    it('should throw if transfer not found', async () => {
      mockTransferRequest.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      await expect(service.rejectTransfer('bad-id', 'no reason', CTX)).rejects.toThrow(
        'طلب النقل غير موجود'
      );
    });

    it('should update transfer to rejected with reason', async () => {
      const transfer = {
        _id: 'tr-1',
        muqeemRequestId: 'MR-1',
        employee: { toString: () => 'emp-1' },
        residency: { _id: 'res-1' },
      };
      mockTransferRequest.findById
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(transfer) })
        .mockResolvedValueOnce({ _id: 'tr-1', status: 'rejected' });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});

      await service.rejectTransfer('tr-1', 'not eligible', CTX);

      expect(mockTransferRequest.findByIdAndUpdate).toHaveBeenCalledWith(
        'tr-1',
        expect.objectContaining({ status: 'rejected', rejectionReason: 'not eligible' })
      );
    });

    it('should restore residency status to active', async () => {
      const transfer = {
        _id: 'tr-1',
        muqeemRequestId: 'MR-1',
        employee: { toString: () => 'emp-1' },
        residency: { _id: 'res-1' },
      };
      mockTransferRequest.findById
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(transfer) })
        .mockResolvedValueOnce({ _id: 'tr-1', status: 'rejected' });
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});

      await service.rejectTransfer('tr-1', 'reason', CTX);

      expect(mockEmployeeResidency.findByIdAndUpdate).toHaveBeenCalledWith(
        'res-1',
        expect.objectContaining({ status: 'active' })
      );
    });

    it('should return the updated transfer document', async () => {
      const transfer = {
        _id: 'tr-1',
        muqeemRequestId: 'MR-1',
        employee: { toString: () => 'emp-1' },
        residency: { _id: 'res-1' },
      };
      const returned = { _id: 'tr-1', status: 'rejected', rejectionReason: 'reason' };
      mockTransferRequest.findById
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(transfer) })
        .mockResolvedValueOnce(returned);
      mockTransferRequest.findByIdAndUpdate.mockResolvedValue({});

      const result = await service.rejectTransfer('tr-1', 'reason', CTX);
      expect(result).toEqual(returned);
    });
  });

  describe('getTransferStatus()', () => {
    it('should call _makeRequest with GET /transfer/status/:id', async () => {
      const spy = jest.spyOn(service, '_makeRequest');
      await service.getTransferStatus('MR-123', CTX);
      expect(spy).toHaveBeenCalledWith('get', '/transfer/status/MR-123', {}, null, CTX);
      spy.mockRestore();
    });

    it('should return a response object', async () => {
      const result = await service.getTransferStatus('MR-123', CTX);
      expect(result).toHaveProperty('success', true);
    });
  });

  // ========================================================================
  // 8. Report queries
  // ========================================================================
  describe('getExpiringFromMuqeem()', () => {
    it('should call _makeRequest with GET /reports/iqama-expiry', async () => {
      const spy = jest.spyOn(service, '_makeRequest');
      await service.getExpiringFromMuqeem(60, CTX);
      expect(spy).toHaveBeenCalledWith(
        'get',
        '/reports/iqama-expiry',
        { within_days: 60 },
        null,
        CTX
      );
      spy.mockRestore();
    });

    it('should default to 90 days', async () => {
      const spy = jest.spyOn(service, '_makeRequest');
      await service.getExpiringFromMuqeem();
      expect(spy).toHaveBeenCalledWith(
        'get',
        '/reports/iqama-expiry',
        { within_days: 90 },
        null,
        {}
      );
      spy.mockRestore();
    });

    it('should return mock response', async () => {
      const result = await service.getExpiringFromMuqeem(30);
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('queryByPassport()', () => {
    it('should call _makeRequest with GET /passport/:number', async () => {
      const spy = jest.spyOn(service, '_makeRequest');
      await service.queryByPassport('AB1234567', CTX);
      expect(spy).toHaveBeenCalledWith('get', '/passport/AB1234567', {}, null, CTX);
      spy.mockRestore();
    });

    it('should return mock response', async () => {
      const result = await service.queryByPassport('AB1234567');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('getPendingTransfers()', () => {
    it('should call _makeRequest with GET /transfer/pending', async () => {
      const spy = jest.spyOn(service, '_makeRequest');
      await service.getPendingTransfers(CTX);
      expect(spy).toHaveBeenCalledWith('get', '/transfer/pending', {}, null, CTX);
      spy.mockRestore();
    });

    it('should return mock response', async () => {
      const result = await service.getPendingTransfers();
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('getVisaStatusReport()', () => {
    it('should call _makeRequest with GET /reports/visa-status', async () => {
      const spy = jest.spyOn(service, '_makeRequest');
      await service.getVisaStatusReport(CTX);
      expect(spy).toHaveBeenCalledWith('get', '/reports/visa-status', {}, null, CTX);
      spy.mockRestore();
    });

    it('should return mock response', async () => {
      const result = await service.getVisaStatusReport();
      expect(result).toHaveProperty('success', true);
    });
  });

  // ========================================================================
  // 9. Alert checking
  // ========================================================================
  describe('checkAndSendExpiryAlerts()', () => {
    const futureDate = days => new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const pastDate = days => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const makeChain = data => {
      const chain = {
        find: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(data),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(data),
      };
      return chain;
    };

    it('should return stats object with all expected keys', async () => {
      // No expiring items
      mockEmployeeResidency.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();

      expect(stats).toHaveProperty('iqamaAlerts');
      expect(stats).toHaveProperty('passportAlerts');
      expect(stats).toHaveProperty('visaAlerts');
      expect(stats).toHaveProperty('errors');
      expect(stats).toHaveProperty('details');
    });

    it('should return zero alerts when no expiring items', async () => {
      mockEmployeeResidency.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();

      expect(stats.iqamaAlerts).toBe(0);
      expect(stats.passportAlerts).toBe(0);
      expect(stats.visaAlerts).toBe(0);
    });

    it('should detect iqama expiry alerts', async () => {
      const expiringResidency = {
        _id: 'res-1',
        iqamaNumber: '2123456789',
        iqamaExpiryDate: futureDate(15), // 15 days out → 'critical'
        status: 'active',
        alertLevel: 'none',
        lastAlertSent: null,
        employee: { _id: 'emp-1', name: 'Test Employee' },
      };

      // First find call = iqama expiring
      // Second find call = passport expiring
      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([expiringResidency]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.iqamaAlerts).toBe(1);
      expect(stats.details[0]).toEqual(
        expect.objectContaining({ type: 'iqama_expiry', iqamaNumber: '2123456789' })
      );
    });

    it('should detect passport expiry alerts', async () => {
      const expiringPassport = {
        _id: 'res-2',
        passportNumber: 'P123',
        passportExpiryDate: futureDate(60), // 60 days → 'warning'
        status: 'active',
        employee: { _id: 'emp-2', name: 'Passport Employee' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([expiringPassport]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.passportAlerts).toBe(1);
      expect(stats.details[0]).toEqual(
        expect.objectContaining({ type: 'passport_expiry', passportNumber: 'P123' })
      );
    });

    it('should detect visa expiry alerts', async () => {
      const expiringVisa = {
        _id: 'v-1',
        visaNumber: 'ER-1',
        visaType: 'exit_reentry_single',
        visaEndDate: futureDate(10), // 10 days → 'warning'
        status: 'issued',
        employee: { _id: 'emp-3', name: 'Visa Employee' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([expiringVisa]),
      });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.visaAlerts).toBe(1);
      expect(stats.details[0]).toEqual(
        expect.objectContaining({ type: 'visa_expiry', visaNumber: 'ER-1' })
      );
    });

    it('should auto-expire visa with daysLeft <= 0', async () => {
      const expiredVisa = {
        _id: 'v-exp',
        visaNumber: 'ER-EXPIRED',
        visaType: 'exit_reentry_single',
        visaEndDate: pastDate(1), // expired yesterday
        status: 'issued',
        employee: { _id: 'emp-4', name: 'Expired Visa Employee' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([expiredVisa]),
      });
      mockVisaRequest.findByIdAndUpdate.mockResolvedValue({});

      await service.checkAndSendExpiryAlerts();

      expect(mockVisaRequest.findByIdAndUpdate).toHaveBeenCalledWith('v-exp', {
        status: 'expired',
      });
    });

    it('should skip iqama alert if level is none', async () => {
      // A residency whose daysLeft > 90 won't trigger alert (resolveAlertLevel returns 'none')
      // But the service only queries iqamaExpiryDate <= now + 90d, so it won't be returned.
      // Test with a residency that is already expired but alertLevel matches
      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.iqamaAlerts).toBe(0);
    });

    it('should skip duplicate iqama alert if same level sent recently', async () => {
      const residency = {
        _id: 'res-dup',
        iqamaNumber: '2222222222',
        iqamaExpiryDate: futureDate(45), // level = 'warning' (<=60)
        status: 'active',
        alertLevel: 'warning', // same level
        lastAlertSent: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago (< 48h for 30+ days)
        employee: { _id: 'emp-dup', name: 'Dup Employee' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([residency]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      // shouldSend = alertLevel !== level (false) || (daysLeft<=7 && lastAlertAge>24) (false)
      //   || (daysLeft<=30 && lastAlertAge>48) (false) || lastAlertAge>72 (false)
      expect(stats.iqamaAlerts).toBe(0);
    });

    it('should send alert if lastAlertAge > 72 hours', async () => {
      const residency = {
        _id: 'res-old',
        iqamaNumber: '3333333333',
        iqamaExpiryDate: futureDate(45),
        status: 'active',
        alertLevel: 'warning',
        lastAlertSent: new Date(Date.now() - 73 * 60 * 60 * 1000), // 73 hours ago
        employee: { _id: 'emp-old', name: 'Old Alert' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([residency]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.iqamaAlerts).toBe(1);
    });

    it('should send alert if level changed', async () => {
      const residency = {
        _id: 'res-changed',
        iqamaNumber: '4444444444',
        iqamaExpiryDate: futureDate(25), // level = 'urgent' (<=30)
        status: 'active',
        alertLevel: 'warning', // different level → shouldSend
        lastAlertSent: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        employee: { _id: 'emp-ch', name: 'Changed Level' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([residency]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.iqamaAlerts).toBe(1);
    });

    it('should handle errors in iqama alert processing', async () => {
      // Use a getter that throws to force the catch block
      const badResidency = {
        _id: 'res-bad',
        iqamaNumber: '5555555555',
        get iqamaExpiryDate() {
          throw new Error('corrupt field');
        },
        status: 'active',
        alertLevel: 'none',
        lastAlertSent: null,
        employee: { _id: 'emp-bad', name: 'Bad' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([badResidency]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.errors).toBeGreaterThanOrEqual(1);
    });

    it('should handle errors in passport alert processing', async () => {
      const badPassport = {
        _id: 'res-bad-p',
        passportNumber: 'PBAD',
        get passportExpiryDate() {
          throw new Error('corrupt passport field');
        },
        status: 'active',
        employee: { _id: 'emp-badp', name: 'BadPassport' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([badPassport]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.errors).toBeGreaterThanOrEqual(1);
    });

    it('should handle errors in visa alert processing', async () => {
      const badVisa = {
        _id: 'v-bad',
        visaNumber: 'VBAD',
        visaType: 'exit_reentry_single',
        get visaEndDate() {
          throw new Error('corrupt visa field');
        },
        status: 'issued',
        employee: { _id: 'emp-badv', name: 'BadVisa' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([badVisa]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.errors).toBeGreaterThanOrEqual(1);
    });

    it('should set visa level to critical when daysLeft <= 7', async () => {
      const visa = {
        _id: 'v-crit',
        visaNumber: 'ER-CRIT',
        visaType: 'exit_reentry_single',
        visaEndDate: futureDate(5), // 5 days
        status: 'issued',
        employee: { _id: 'emp-crit', name: 'Critical Visa' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([visa]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.details[0].level).toBe('critical');
    });

    it('should set visa level to warning when daysLeft > 7', async () => {
      const visa = {
        _id: 'v-warn',
        visaNumber: 'ER-WARN',
        visaType: 'exit_reentry_single',
        visaEndDate: futureDate(20),
        status: 'issued',
        employee: { _id: 'emp-warn', name: 'Warning Visa' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([visa]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.details[0].level).toBe('warning');
    });

    it('should process multiple iqama alerts', async () => {
      const residencies = [
        {
          _id: 'res-a',
          iqamaNumber: '1111111111',
          iqamaExpiryDate: futureDate(10),
          status: 'active',
          alertLevel: 'none',
          lastAlertSent: null,
          employee: { _id: 'e1', name: 'E1' },
        },
        {
          _id: 'res-b',
          iqamaNumber: '2222222222',
          iqamaExpiryDate: futureDate(50),
          status: 'active',
          alertLevel: 'none',
          lastAlertSent: null,
          employee: { _id: 'e2', name: 'E2' },
        },
      ];

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue(residencies) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.iqamaAlerts).toBe(2);
    });

    it('should log summary at the end', async () => {
      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      await service.checkAndSendExpiryAlerts();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Expiry alerts check completed')
      );
    });

    it('should send alert for critical iqama (daysLeft <=7) even if sent within 24h', async () => {
      const residency = {
        _id: 'res-crit',
        iqamaNumber: '6666666666',
        iqamaExpiryDate: futureDate(5), // <=7 days → critical
        status: 'active',
        alertLevel: 'warning', // different level → triggers anyway
        lastAlertSent: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        employee: { _id: 'emp-crit', name: 'Critical' },
      };

      mockEmployeeResidency.find
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([residency]) })
        .mockReturnValueOnce({ populate: jest.fn().mockResolvedValue([]) });
      mockEmployeeResidency.findByIdAndUpdate.mockResolvedValue({});
      mockVisaRequest.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      const stats = await service.checkAndSendExpiryAlerts();
      expect(stats.iqamaAlerts).toBe(1);
    });
  });

  // ========================================================================
  // 10. Local DB operations
  // ========================================================================
  describe('getLocalResidencies()', () => {
    it('should call find with empty query when no filters', async () => {
      await service.getLocalResidencies();
      expect(mockEmployeeResidency.find).toHaveBeenCalledWith({});
    });

    it('should add status filter', async () => {
      await service.getLocalResidencies({ status: 'active' });
      expect(mockEmployeeResidency.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
    });

    it('should add employeeId filter', async () => {
      await service.getLocalResidencies({ employeeId: 'emp-1' });
      expect(mockEmployeeResidency.find).toHaveBeenCalledWith(
        expect.objectContaining({ employee: 'emp-1' })
      );
    });

    it('should add organizationId filter', async () => {
      await service.getLocalResidencies({ organizationId: 'org-1' });
      expect(mockEmployeeResidency.find).toHaveBeenCalledWith(
        expect.objectContaining({ organization: 'org-1' })
      );
    });

    it('should add expiringDays filter', async () => {
      await service.getLocalResidencies({ expiringDays: 30 });
      expect(mockEmployeeResidency.find).toHaveBeenCalledWith(
        expect.objectContaining({
          iqamaExpiryDate: expect.objectContaining({ $lte: expect.any(Date) }),
        })
      );
    });

    it('should populate employee fields', async () => {
      await service.getLocalResidencies();
      expect(mockEmployeeResidency.populate).toHaveBeenCalledWith(
        'employee',
        'name email nationalId iqamaNumber'
      );
    });

    it('should sort by iqamaExpiryDate ascending', async () => {
      await service.getLocalResidencies();
      expect(mockEmployeeResidency.sort).toHaveBeenCalledWith({ iqamaExpiryDate: 1 });
    });

    it('should default limit to 100', async () => {
      await service.getLocalResidencies();
      expect(mockEmployeeResidency.limit).toHaveBeenCalledWith(100);
    });

    it('should use custom limit', async () => {
      await service.getLocalResidencies({ limit: 25 });
      expect(mockEmployeeResidency.limit).toHaveBeenCalledWith(25);
    });

    it('should default skip to 0', async () => {
      await service.getLocalResidencies();
      expect(mockEmployeeResidency.skip).toHaveBeenCalledWith(0);
    });

    it('should use custom skip', async () => {
      await service.getLocalResidencies({ skip: 50 });
      expect(mockEmployeeResidency.skip).toHaveBeenCalledWith(50);
    });
  });

  describe('getEmployeeTransactions()', () => {
    it('should query by employee ID', async () => {
      mockMuqeemTransaction.find.mockReturnThis();
      mockMuqeemTransaction.sort.mockReturnThis();
      mockMuqeemTransaction.limit.mockResolvedValue([]);

      await service.getEmployeeTransactions('emp-1');
      expect(mockMuqeemTransaction.find).toHaveBeenCalledWith({ employee: 'emp-1' });
    });

    it('should sort by createdAt descending', async () => {
      mockMuqeemTransaction.find.mockReturnThis();
      mockMuqeemTransaction.sort.mockReturnThis();
      mockMuqeemTransaction.limit.mockResolvedValue([]);

      await service.getEmployeeTransactions('emp-1');
      expect(mockMuqeemTransaction.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    it('should limit to 50 records', async () => {
      mockMuqeemTransaction.find.mockReturnThis();
      mockMuqeemTransaction.sort.mockReturnThis();
      mockMuqeemTransaction.limit.mockResolvedValue([]);

      await service.getEmployeeTransactions('emp-1');
      expect(mockMuqeemTransaction.limit).toHaveBeenCalledWith(50);
    });

    it('should return array of transactions', async () => {
      const txList = [{ _id: 'tx-1' }, { _id: 'tx-2' }];
      mockMuqeemTransaction.find.mockReturnThis();
      mockMuqeemTransaction.sort.mockReturnThis();
      mockMuqeemTransaction.limit.mockResolvedValue(txList);

      const result = await service.getEmployeeTransactions('emp-1');
      expect(result).toEqual(txList);
    });
  });

  describe('getDashboardStats()', () => {
    it('should return all expected stat fields', async () => {
      mockEmployeeResidency.countDocuments.mockResolvedValue(10);
      mockVisaRequest.countDocuments.mockResolvedValue(3);
      mockTransferRequest.countDocuments.mockResolvedValue(1);

      const stats = await service.getDashboardStats();

      expect(stats).toHaveProperty('totalResidencies');
      expect(stats).toHaveProperty('activeResidencies');
      expect(stats).toHaveProperty('expiredResidencies');
      expect(stats).toHaveProperty('expiringIn30');
      expect(stats).toHaveProperty('expiringIn90');
      expect(stats).toHaveProperty('pendingTransfers');
      expect(stats).toHaveProperty('activeVisas');
      expect(stats).toHaveProperty('complianceRate');
    });

    it('should call countDocuments 7 times (parallel)', async () => {
      mockEmployeeResidency.countDocuments.mockResolvedValue(0);
      mockVisaRequest.countDocuments.mockResolvedValue(0);
      mockTransferRequest.countDocuments.mockResolvedValue(0);

      await service.getDashboardStats();

      // 5 for mockEmployeeResidency + 1 mockTransferRequest + 1 mockVisaRequest = 7
      const totalCalls =
        mockEmployeeResidency.countDocuments.mock.calls.length +
        mockTransferRequest.countDocuments.mock.calls.length +
        mockVisaRequest.countDocuments.mock.calls.length;
      expect(totalCalls).toBe(7);
    });

    it('should calculate complianceRate correctly', async () => {
      // total=100, active=80
      mockEmployeeResidency.countDocuments
        .mockResolvedValueOnce(100) // totalResidencies
        .mockResolvedValueOnce(80) // activeResidencies
        .mockResolvedValueOnce(5) // expiredResidencies
        .mockResolvedValueOnce(3) // expiringIn30
        .mockResolvedValueOnce(10); // expiringIn90
      mockTransferRequest.countDocuments.mockResolvedValue(2);
      mockVisaRequest.countDocuments.mockResolvedValue(4);

      const stats = await service.getDashboardStats();
      expect(stats.complianceRate).toBe(80);
    });

    it('should return complianceRate 100 when no residencies', async () => {
      mockEmployeeResidency.countDocuments.mockResolvedValue(0);
      mockVisaRequest.countDocuments.mockResolvedValue(0);
      mockTransferRequest.countDocuments.mockResolvedValue(0);

      const stats = await service.getDashboardStats();
      expect(stats.complianceRate).toBe(100);
    });

    it('should filter by organizationId when provided', async () => {
      mockEmployeeResidency.countDocuments.mockResolvedValue(0);
      mockVisaRequest.countDocuments.mockResolvedValue(0);
      mockTransferRequest.countDocuments.mockResolvedValue(0);

      await service.getDashboardStats('org-123');

      // Every countDocuments call should include organization: 'org-123'
      for (const call of mockEmployeeResidency.countDocuments.mock.calls) {
        expect(call[0]).toEqual(expect.objectContaining({ organization: 'org-123' }));
      }
    });

    it('should NOT filter by organizationId when null', async () => {
      mockEmployeeResidency.countDocuments.mockResolvedValue(0);
      mockVisaRequest.countDocuments.mockResolvedValue(0);
      mockTransferRequest.countDocuments.mockResolvedValue(0);

      await service.getDashboardStats(null);

      // First call (totalResidencies) should be called with {}
      expect(mockEmployeeResidency.countDocuments.mock.calls[0][0]).toEqual({});
    });

    it('should return numeric values for all stat fields', async () => {
      mockEmployeeResidency.countDocuments.mockResolvedValue(5);
      mockVisaRequest.countDocuments.mockResolvedValue(2);
      mockTransferRequest.countDocuments.mockResolvedValue(1);

      const stats = await service.getDashboardStats();

      expect(typeof stats.totalResidencies).toBe('number');
      expect(typeof stats.activeResidencies).toBe('number');
      expect(typeof stats.expiredResidencies).toBe('number');
      expect(typeof stats.expiringIn30).toBe('number');
      expect(typeof stats.expiringIn90).toBe('number');
      expect(typeof stats.pendingTransfers).toBe('number');
      expect(typeof stats.activeVisas).toBe('number');
      expect(typeof stats.complianceRate).toBe('number');
    });
  });

  // ========================================================================
  // 11. Sync helpers
  // ========================================================================
  describe('_mapIqamaStatus()', () => {
    it('should map "valid" to "active"', () => {
      expect(service._mapIqamaStatus('valid')).toBe('active');
    });

    it('should map "active" to "active"', () => {
      expect(service._mapIqamaStatus('active')).toBe('active');
    });

    it('should map "expired" to "expired"', () => {
      expect(service._mapIqamaStatus('expired')).toBe('expired');
    });

    it('should map "cancelled" to "cancelled"', () => {
      expect(service._mapIqamaStatus('cancelled')).toBe('cancelled');
    });

    it('should map "transferred" to "transferred"', () => {
      expect(service._mapIqamaStatus('transferred')).toBe('transferred');
    });

    it('should map "VALID" (uppercase) to "active"', () => {
      expect(service._mapIqamaStatus('VALID')).toBe('active');
    });

    it('should map "Active" (mixed case) to "active"', () => {
      expect(service._mapIqamaStatus('Active')).toBe('active');
    });

    it('should return "active" for unknown status', () => {
      expect(service._mapIqamaStatus('foobar')).toBe('active');
    });

    it('should return "active" for null', () => {
      expect(service._mapIqamaStatus(null)).toBe('active');
    });

    it('should return "active" for undefined', () => {
      expect(service._mapIqamaStatus(undefined)).toBe('active');
    });
  });

  describe('_generateMockResponse()', () => {
    it('should return success for any endpoint', () => {
      const response = service._generateMockResponse('/unknown', 'get', {});
      expect(response.success).toBe(true);
    });

    it('should return reference_number for any endpoint', () => {
      const response = service._generateMockResponse('/unknown', 'get', {});
      expect(response.reference_number).toBeDefined();
      expect(response.reference_number).toMatch(/^MOCK-/);
    });

    it('should generate iqama_number for /iqama/issue', () => {
      const response = service._generateMockResponse('/iqama/issue', 'post', {});
      expect(response).toHaveProperty('iqama_number');
      expect(response.iqama_number).toMatch(/^2\d{10}$/);
    });

    it('should return issue_date and expiry_date for /iqama/issue', () => {
      const response = service._generateMockResponse('/iqama/issue', 'post', {});
      expect(response).toHaveProperty('issue_date');
      expect(response).toHaveProperty('expiry_date');
    });

    it('should return fee for /iqama/issue', () => {
      const response = service._generateMockResponse('/iqama/issue', 'post', {});
      expect(response.fee).toBe(650);
    });

    it('should return occupation_name_ar for /iqama/issue', () => {
      const response = service._generateMockResponse('/iqama/issue', 'post', {});
      expect(response).toHaveProperty('occupation_name_ar');
    });

    it('should return sadad_number for /iqama/issue', () => {
      const response = service._generateMockResponse('/iqama/issue', 'post', {});
      expect(response.sadad_number).toBeDefined();
      expect(response.sadad_number).toMatch(/^SADAD-/);
    });

    it('should return new_expiry_date for /iqama/renew', () => {
      const response = service._generateMockResponse('/iqama/renew', 'post', {});
      expect(response).toHaveProperty('new_expiry_date');
    });

    it('should return fee and sadad_number for /iqama/renew', () => {
      const response = service._generateMockResponse('/iqama/renew', 'post', {});
      expect(response.fee).toBe(650);
      expect(response.sadad_number).toBeDefined();
    });

    it('should generate visa_number for /visa/exit-reentry', () => {
      const response = service._generateMockResponse('/visa/exit-reentry', 'post', {});
      expect(response.visa_number).toMatch(/^ER-/);
    });

    it('should return start_date and end_date for /visa/exit-reentry', () => {
      const response = service._generateMockResponse('/visa/exit-reentry', 'post', {
        duration_days: 60,
      });
      expect(response).toHaveProperty('start_date');
      expect(response).toHaveProperty('end_date');
    });

    it('should generate visa_number for /visa/final-exit', () => {
      const response = service._generateMockResponse('/visa/final-exit', 'post', {});
      expect(response.visa_number).toMatch(/^FX-/);
    });

    it('should return request_id for /transfer/request', () => {
      const response = service._generateMockResponse('/transfer/request', 'post', {});
      expect(response.request_id).toMatch(/^TR-/);
    });

    it('should return status pending for /transfer/request', () => {
      const response = service._generateMockResponse('/transfer/request', 'post', {});
      expect(response.status).toBe('pending');
    });

    it('should return status approved for /transfer/release', () => {
      const response = service._generateMockResponse('/transfer/release', 'post', {});
      expect(response.status).toBe('approved');
    });

    it('should return iqama query data for /iqama/:number', () => {
      const response = service._generateMockResponse('/iqama/2123456789', 'get', {});
      expect(response).toHaveProperty('iqama_number', '2123456789');
      expect(response).toHaveProperty('status', 'valid');
      expect(response).toHaveProperty('expiry_date');
      expect(response).toHaveProperty('is_inside_kingdom', true);
    });

    it('should return fallback response for unmatched endpoint', () => {
      const response = service._generateMockResponse('/some/other/endpoint', 'get', {});
      expect(response.success).toBe(true);
      expect(response).toHaveProperty('data');
    });

    it('should include fee=200 for /visa/exit-reentry', () => {
      const response = service._generateMockResponse('/visa/exit-reentry', 'post', {});
      expect(response.fee).toBe(200);
    });

    it('/visa/exit-reentry end_date ~90 days out by default', () => {
      const response = service._generateMockResponse('/visa/exit-reentry', 'post', {});
      const endDate = new Date(response.end_date);
      const now = new Date();
      const diffDays = (endDate - now) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(88);
      expect(diffDays).toBeLessThanOrEqual(91);
    });

    it('/visa/exit-reentry uses data.duration_days if provided', () => {
      const response = service._generateMockResponse('/visa/exit-reentry', 'post', {
        duration_days: 45,
      });
      const endDate = new Date(response.end_date);
      const now = new Date();
      const diffDays = (endDate - now) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(43);
      expect(diffDays).toBeLessThanOrEqual(46);
    });
  });
});
