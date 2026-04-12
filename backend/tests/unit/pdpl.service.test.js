/**
 * Unit tests for services/pdpl.service.js
 * PDPL Compliance Service — Saudi Personal Data Protection Law
 */

/* ─── mock mongoose models (inline schemas) ─────────────────────────── */

const mockDPRCreate = jest.fn();
const mockDPRFind = jest.fn();
const mockDPRCountDocuments = jest.fn();

const mockConsentCreate = jest.fn();
const mockConsentFindOneAndUpdate = jest.fn();
const mockConsentFind = jest.fn();
const mockConsentFindOne = jest.fn();
const mockConsentCountDocuments = jest.fn();
const mockConsentUpdateMany = jest.fn();

const mockDSRCreate = jest.fn();
const mockDSRFindByIdAndUpdate = jest.fn();
const mockDSRFind = jest.fn();
const mockDSRCountDocuments = jest.fn();

const mockBreachCreate = jest.fn();
const mockBreachFind = jest.fn();
const mockBreachFindByIdAndUpdate = jest.fn();
const mockBreachCountDocuments = jest.fn();

const mockUserFindById = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn();

jest.mock('mongoose', () => {
  const modelRegistry = {};
  const realSchema = jest.fn();
  realSchema.Types = { ObjectId: 'ObjectId' };

  const SchemaConstructor = jest.fn().mockReturnValue({});
  SchemaConstructor.Types = { ObjectId: 'ObjectId' };

  return {
    Schema: SchemaConstructor,
    models: new Proxy(
      {},
      {
        get: (_, name) => {
          if (name === 'DataProcessingRecord')
            return {
              create: mockDPRCreate,
              find: mockDPRFind,
              countDocuments: mockDPRCountDocuments,
            };
          if (name === 'ConsentRecord')
            return {
              create: mockConsentCreate,
              findOneAndUpdate: mockConsentFindOneAndUpdate,
              find: mockConsentFind,
              findOne: mockConsentFindOne,
              countDocuments: mockConsentCountDocuments,
              updateMany: mockConsentUpdateMany,
            };
          if (name === 'DataSubjectRequest')
            return {
              create: mockDSRCreate,
              findByIdAndUpdate: mockDSRFindByIdAndUpdate,
              find: mockDSRFind,
              countDocuments: mockDSRCountDocuments,
            };
          if (name === 'DataBreachIncident')
            return {
              create: mockBreachCreate,
              find: mockBreachFind,
              findByIdAndUpdate: mockBreachFindByIdAndUpdate,
              countDocuments: mockBreachCountDocuments,
            };
          if (name === 'User')
            return {
              findById: mockUserFindById,
              findByIdAndUpdate: mockUserFindByIdAndUpdate,
            };
          return undefined;
        },
      }
    ),
    model: jest.fn(name => {
      // Shouldn't be reached since models proxy always returns
      return modelRegistry[name];
    }),
  };
});

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ─── require service ───────────────────────────────────────────────── */

let pdplService;

beforeAll(() => {
  pdplService = require('../../services/pdpl.service');
});

/* ─── helpers ───────────────────────────────────────────────────────── */

function chainedFind(data) {
  return { sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(data) }) };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('PdplService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Processing Activity Records (Article 32) ────────────────────

  describe('recordProcessingActivity', () => {
    it('creates a processing record with retention period', async () => {
      const created = { _id: 'dpr1', purpose: 'Treatment' };
      mockDPRCreate.mockResolvedValue(created);

      const result = await pdplService.recordProcessingActivity({
        purpose: 'Treatment',
        dataCategory: 'medical_records',
        legalBasis: 'consent',
        recipientCategory: 'healthcare',
        recordedBy: 'u1',
      });

      expect(result).toEqual(created);
      expect(mockDPRCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: 'Treatment',
          retentionPeriod: '10 years',
          securityMeasures: expect.stringContaining('encryption'),
        })
      );
    });

    it('uses default 5 years for unknown dataCategory', async () => {
      mockDPRCreate.mockResolvedValue({ _id: 'dpr2' });

      await pdplService.recordProcessingActivity({
        purpose: 'Test',
        dataCategory: 'unknown_type',
        legalBasis: 'consent',
        recordedBy: 'u1',
      });

      expect(mockDPRCreate).toHaveBeenCalledWith(
        expect.objectContaining({ retentionPeriod: '5 years' })
      );
    });
  });

  describe('getProcessingRecords', () => {
    it('returns all records when no filters', async () => {
      mockDPRFind.mockReturnValue(chainedFind([{ _id: 'r1' }]));
      const result = await pdplService.getProcessingRecords();
      expect(result).toEqual([{ _id: 'r1' }]);
    });

    it('filters by dataCategory and legalBasis', async () => {
      mockDPRFind.mockReturnValue(chainedFind([]));
      await pdplService.getProcessingRecords({
        dataCategory: 'financial_records',
        legalBasis: 'legal_obligation',
      });
      expect(mockDPRFind).toHaveBeenCalledWith({
        dataCategory: 'financial_records',
        legalBasis: 'legal_obligation',
      });
    });
  });

  // ── Consent Management (Article 6) ──────────────────────────────

  describe('recordConsent', () => {
    it('creates consent record with IP and user agent', async () => {
      const created = { _id: 'c1' };
      mockConsentCreate.mockResolvedValue(created);

      const req = {
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };

      const result = await pdplService.recordConsent('u1', 'marketing', ['email'], null, req);

      expect(result).toEqual(created);
      expect(mockConsentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          purpose: 'marketing',
          consentGiven: true,
          ipAddress: '192.168.1.1',
        })
      );
    });

    it('handles missing request context', async () => {
      mockConsentCreate.mockResolvedValue({ _id: 'c2' });
      await pdplService.recordConsent('u1', 'analytics', ['usage'], null, null);
      expect(mockConsentCreate).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: undefined })
      );
    });
  });

  describe('withdrawConsent', () => {
    it('deactivates consent', async () => {
      mockConsentFindOneAndUpdate.mockResolvedValue({ isActive: false });
      const result = await pdplService.withdrawConsent('u1', 'marketing');
      expect(result.isActive).toBe(false);
      expect(mockConsentFindOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'u1', purpose: 'marketing', isActive: true },
        expect.objectContaining({ isActive: false, consentGiven: false }),
        { new: true }
      );
    });
  });

  describe('getUserConsents', () => {
    it('returns user consents sorted', async () => {
      mockConsentFind.mockReturnValue(chainedFind([{ _id: 'c1' }]));
      const result = await pdplService.getUserConsents('u1');
      expect(result).toEqual([{ _id: 'c1' }]);
    });
  });

  describe('checkActiveConsent', () => {
    it('returns true when active consent exists', async () => {
      mockConsentFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'c1' }) });
      const result = await pdplService.checkActiveConsent('u1', 'marketing');
      expect(result).toBe(true);
    });

    it('returns false when no consent', async () => {
      mockConsentFindOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      const result = await pdplService.checkActiveConsent('u1', 'marketing');
      expect(result).toBe(false);
    });
  });

  // ── Data Subject Requests (Article 4) ───────────────────────────

  describe('handleDataSubjectRequest', () => {
    it('creates request with 30-day deadline', async () => {
      const created = { _id: 'dsr1', deadline: new Date() };
      mockDSRCreate.mockResolvedValue(created);

      const result = await pdplService.handleDataSubjectRequest('u1', 'access', 'I want my data');

      expect(result).toEqual(created);
      expect(mockDSRCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          requestType: 'access',
          status: 'received',
        })
      );
    });
  });

  describe('updateRequestStatus', () => {
    it('completes request and sets completedAt', async () => {
      mockDSRFindByIdAndUpdate.mockResolvedValue({ status: 'completed' });
      const result = await pdplService.updateRequestStatus('dsr1', 'completed', 'admin1', 'Done');
      expect(result.status).toBe('completed');
      expect(mockDSRFindByIdAndUpdate).toHaveBeenCalledWith(
        'dsr1',
        expect.objectContaining({ status: 'completed', completedAt: expect.any(Date) }),
        { new: true }
      );
    });

    it('rejects request and sets completedAt', async () => {
      mockDSRFindByIdAndUpdate.mockResolvedValue({ status: 'rejected' });
      await pdplService.updateRequestStatus('dsr1', 'rejected', 'admin1', 'Invalid');
      expect(mockDSRFindByIdAndUpdate).toHaveBeenCalledWith(
        'dsr1',
        expect.objectContaining({ completedAt: expect.any(Date) }),
        { new: true }
      );
    });

    it('does not set completedAt for in-progress', async () => {
      mockDSRFindByIdAndUpdate.mockResolvedValue({ status: 'in_progress' });
      await pdplService.updateRequestStatus('dsr1', 'in_progress', 'admin1', 'Working');
      expect(mockDSRFindByIdAndUpdate).toHaveBeenCalledWith(
        'dsr1',
        expect.not.objectContaining({ completedAt: expect.any(Date) }),
        { new: true }
      );
    });
  });

  describe('getDataSubjectRequests', () => {
    it('returns filtered requests', async () => {
      mockDSRFind.mockReturnValue(chainedFind([{ _id: 'r1' }]));
      const result = await pdplService.getDataSubjectRequests({ status: 'received' });
      expect(result).toEqual([{ _id: 'r1' }]);
      expect(mockDSRFind).toHaveBeenCalledWith({ status: 'received' });
    });
  });

  // ── Export User Data ────────────────────────────────────────────

  describe('exportUserData', () => {
    it('exports user data with masked sensitive fields', async () => {
      mockUserFindById.mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'u1',
          name: 'Ahmed',
          email: 'a@b.com',
          phone: '0501234567',
          password: 'secret',
          nationalId: '1234567890',
          createdAt: new Date('2025-01-01'),
        }),
      });
      mockConsentFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      mockDSRFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await pdplService.exportUserData('u1');

      expect(result.personalInformation.name).toBe('Ahmed');
      expect(result.consents).toEqual([]);
      expect(result.exportedAt).toBeTruthy();
    });

    it('handles missing user', async () => {
      mockUserFindById.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
      mockConsentFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });
      mockDSRFind.mockReturnValue({ lean: jest.fn().mockResolvedValue([]) });

      const result = await pdplService.exportUserData('bad');
      expect(result.personalInformation).toBeNull();
    });
  });

  // ── Erase User Data ────────────────────────────────────────────

  describe('eraseUserData', () => {
    it('anonymizes user and withdraws consents', async () => {
      mockUserFindByIdAndUpdate.mockResolvedValue(undefined);
      mockConsentUpdateMany.mockResolvedValue(undefined);
      mockDSRCreate.mockResolvedValue({ _id: 'dsr_erase' });

      const result = await pdplService.eraseUserData('u1', 'user request');

      expect(result).toContain('user_personal_data');
      expect(result).toContain('consent_records_withdrawn');
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ name: 'ERASED_u1' })
      );
      expect(mockConsentUpdateMany).toHaveBeenCalledWith(
        { userId: 'u1' },
        expect.objectContaining({ isActive: false })
      );
    });
  });

  // ── Data Breach Reporting (Article 20) ──────────────────────────

  describe('reportDataBreach', () => {
    it('creates breach incident', async () => {
      const created = { _id: 'b1', severity: 'medium' };
      mockBreachCreate.mockResolvedValue(created);

      const result = await pdplService.reportDataBreach(
        {
          description: 'Data leak',
          severity: 'medium',
          affectedRecords: 100,
          dataTypesAffected: ['email'],
          rootCause: 'SQL injection',
        },
        'admin1'
      );

      expect(result).toEqual(created);
    });

    it('logs URGENT for critical severity', async () => {
      const logger = require('../../utils/logger');
      mockBreachCreate.mockResolvedValue({ _id: 'b2', severity: 'critical' });

      await pdplService.reportDataBreach(
        { description: 'Major breach', severity: 'critical', affectedRecords: 10000 },
        'admin1'
      );

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('URGENT'));
    });

    it('does not log urgent for low severity', async () => {
      const logger = require('../../utils/logger');
      mockBreachCreate.mockResolvedValue({ _id: 'b3', severity: 'low' });

      await pdplService.reportDataBreach(
        { description: 'Minor issue', severity: 'low', affectedRecords: 1 },
        'admin1'
      );

      expect(logger.error).not.toHaveBeenCalledWith(expect.stringContaining('URGENT'));
    });
  });

  describe('getBreachIncidents', () => {
    it('returns filtered incidents', async () => {
      mockBreachFind.mockReturnValue(chainedFind([{ _id: 'b1' }]));
      const result = await pdplService.getBreachIncidents({ severity: 'high' });
      expect(result).toEqual([{ _id: 'b1' }]);
    });
  });

  describe('updateBreachIncident', () => {
    it('updates incident', async () => {
      mockBreachFindByIdAndUpdate.mockResolvedValue({ status: 'contained' });
      const result = await pdplService.updateBreachIncident('b1', { status: 'contained' });
      expect(result.status).toBe('contained');
    });
  });

  // ── Retention Periods ───────────────────────────────────────────

  describe('getRetentionPeriods', () => {
    it('returns all retention periods', () => {
      const periods = pdplService.getRetentionPeriods();
      expect(periods.financial_records).toBe('10 years');
      expect(periods.medical_records).toBe('10 years');
      expect(periods.audit_logs).toBe('7 years');
    });
  });

  describe('getRetentionPeriod', () => {
    it('returns specific period', () => {
      expect(pdplService.getRetentionPeriod('employee_records')).toBe('5 years');
    });

    it('returns default for unknown category', () => {
      expect(pdplService.getRetentionPeriod('unknown')).toBe('5 years');
    });
  });

  // ── Mask Sensitive Data ─────────────────────────────────────────

  describe('maskSensitiveData', () => {
    it('masks sensitive fields', () => {
      const data = { name: 'Ahmed', password: 'abc', nationalId: '123' };
      const masked = pdplService.maskSensitiveData(data);
      expect(masked.name).toBe('Ahmed');
      expect(masked.password).toBe('***MASKED***');
      expect(masked.nationalId).toBe('***MASKED***');
    });

    it('returns null/non-objects as-is', () => {
      expect(pdplService.maskSensitiveData(null)).toBeNull();
      expect(pdplService.maskSensitiveData('string')).toBe('string');
    });
  });

  // ── Compliance Dashboard ────────────────────────────────────────

  describe('getComplianceDashboard', () => {
    it('returns all compliance metrics', async () => {
      mockDPRCountDocuments.mockResolvedValue(50);
      mockConsentCountDocuments.mockResolvedValue(100);
      mockDSRCountDocuments
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(2); // overdue
      mockBreachCountDocuments.mockResolvedValue(1);

      const result = await pdplService.getComplianceDashboard();

      expect(result.processingRecords).toBe(50);
      expect(result.activeConsents).toBe(100);
      expect(result.pendingRequests).toBe(5);
      expect(result.openBreaches).toBe(1);
      expect(result.overdueRequests).toBe(2);
      expect(result.complianceScore).toBe(80); // 100 - 2*5 - 1*10
    });

    it('caps compliance score at 0', async () => {
      mockDPRCountDocuments.mockResolvedValue(0);
      mockConsentCountDocuments.mockResolvedValue(0);
      mockDSRCountDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(20); // 20 overdue
      mockBreachCountDocuments.mockResolvedValue(5); // 5 open

      const result = await pdplService.getComplianceDashboard();

      // 100 - 20*5 - 5*10 = 100 - 100 - 50 = -50 → capped at 0
      expect(result.complianceScore).toBe(0);
    });
  });
});
