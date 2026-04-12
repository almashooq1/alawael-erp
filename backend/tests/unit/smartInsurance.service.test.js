/**
 * Unit tests for services/smartInsurance.service.js
 * Smart Insurance Service — NPHIES Integration (singleton)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockPolicyFindOne = jest.fn();
const mockPolicyFind = jest.fn();
const mockPolicyAggregate = jest.fn();
const mockPolicyCountDocuments = jest.fn();

const mockClaimCreate = jest.fn();
const mockClaimFindById = jest.fn();
const mockClaimFindByIdAndUpdate = jest.fn();
const mockClaimAggregate = jest.fn();
const mockClaimCountDocuments = jest.fn();
const mockClaimFind = jest.fn();

const mockAuthCreate = jest.fn();
const mockAuthFindById = jest.fn();
const mockAuthFindByIdAndUpdate = jest.fn();
const mockAuthCountDocuments = jest.fn();

const mockEligCreate = jest.fn();
const mockEligFindByIdAndUpdate = jest.fn();

const mockCompanyFindOne = jest.fn();

jest.mock('../../models/InsurancePolicy', () => ({
  findOne: (...a) => mockPolicyFindOne(...a),
  find: (...a) => mockPolicyFind(...a),
  aggregate: (...a) => mockPolicyAggregate(...a),
  countDocuments: (...a) => mockPolicyCountDocuments(...a),
}));

jest.mock('../../models/InsuranceClaim', () => ({
  create: (...a) => mockClaimCreate(...a),
  findById: (...a) => mockClaimFindById(...a),
  findByIdAndUpdate: (...a) => mockClaimFindByIdAndUpdate(...a),
  aggregate: (...a) => mockClaimAggregate(...a),
  countDocuments: (...a) => mockClaimCountDocuments(...a),
  find: (...a) => mockClaimFind(...a),
}));

jest.mock('../../models/PriorAuthorization', () => ({
  create: (...a) => mockAuthCreate(...a),
  findById: (...a) => mockAuthFindById(...a),
  findByIdAndUpdate: (...a) => mockAuthFindByIdAndUpdate(...a),
  countDocuments: (...a) => mockAuthCountDocuments(...a),
  aggregate: (...a) => jest.fn().mockResolvedValue([])(...a),
  find: jest.fn(),
}));

jest.mock('../../models/InsuranceCompany', () => ({
  findOne: (...a) => mockCompanyFindOne(...a),
}));

jest.mock('../../models/InsuranceEligibilityCheck', () => ({
  create: (...a) => mockEligCreate(...a),
  findByIdAndUpdate: (...a) => mockEligFindByIdAndUpdate(...a),
}));

jest.mock('axios', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('uuid', () => ({ v4: jest.fn(() => 'mock-uuid') }));

jest.mock('../../utils/escapeRegex', () => jest.fn(s => s));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const smartInsurance = require('../../services/smartInsurance.service');

/* ─── helpers ───────────────────────────────────────────────────────── */

function mockPopulatedPolicy(overrides = {}) {
  return {
    _id: 'pol1',
    beneficiaryId: 'ben1',
    memberId: 'MEM-001',
    status: 'active',
    endDate: new Date(Date.now() + 86400000),
    coverageLimit: 100000,
    usedCoverage: 20000,
    planType: 'gold',
    deductibleAmount: 500,
    copayPercentage: 20,
    coveredServices: ['rehab'],
    excludedServices: ['cosmetic'],
    nphiesPolicyId: 'nphies-pol1',
    insuranceCompanyId: {
      _id: 'comp1',
      supportsNphies: false,
      nphiesId: null,
      supportsElectronicClaims: false,
      supportsPriorAuth: false,
    },
    ...overrides,
  };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('SmartInsuranceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── checkEligibility ─────────────────────────────────────────────

  describe('checkEligibility', () => {
    it('performs local eligibility check when NPHIES not supported', async () => {
      const policy = mockPopulatedPolicy();
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(policy) });
      mockEligCreate.mockResolvedValue({ _id: 'chk1' });
      mockEligFindByIdAndUpdate.mockResolvedValue(undefined);

      const result = await smartInsurance.checkEligibility('pol1', { userId: 'u1' });

      expect(result.isEligible).toBe(true);
      expect(result.remainingCoverage).toBe(80000);
      expect(result.checkId).toBe('chk1');
    });

    it('returns not eligible for expired policy', async () => {
      const policy = mockPopulatedPolicy({
        endDate: new Date('2020-01-01'),
      });
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(policy) });
      mockEligCreate.mockResolvedValue({ _id: 'chk2' });
      mockEligFindByIdAndUpdate.mockResolvedValue(undefined);

      const result = await smartInsurance.checkEligibility('pol1');

      expect(result.isEligible).toBe(false);
    });

    it('throws when policy not found', async () => {
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await expect(smartInsurance.checkEligibility('bad')).rejects.toThrow(
        'وثيقة التأمين غير موجودة'
      );
    });

    it('records failure when check throws', async () => {
      const policy = mockPopulatedPolicy({
        insuranceCompanyId: { supportsNphies: true, nphiesId: 'N1' },
      });
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(policy) });
      mockEligCreate.mockResolvedValue({ _id: 'chk3' });

      // _callNphiesApi will fail
      const axios = require('axios');
      axios.default.mockRejectedValue(new Error('Network error'));

      await expect(smartInsurance.checkEligibility('pol1')).rejects.toThrow();
      expect(mockEligFindByIdAndUpdate).toHaveBeenCalledWith(
        'chk3',
        expect.objectContaining({ status: 'failed' })
      );
    });
  });

  // ── submitClaim ──────────────────────────────────────────────────

  describe('submitClaim', () => {
    it('creates claim with pending status when NPHIES not supported', async () => {
      const policy = mockPopulatedPolicy();
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(policy) });
      mockClaimCreate.mockResolvedValue({ _id: 'clm1' });
      mockClaimCountDocuments.mockResolvedValue(5);
      mockClaimFindByIdAndUpdate.mockResolvedValue(undefined);
      mockClaimFindById.mockResolvedValue({ _id: 'clm1', status: 'pending' });

      const result = await smartInsurance.submitClaim({
        policyId: 'pol1',
        billedAmount: 5000,
        claimType: 'professional',
        userId: 'u1',
      });

      expect(result.status).toBe('pending');
    });

    it('throws when policy not found', async () => {
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await expect(
        smartInsurance.submitClaim({ policyId: 'bad', billedAmount: 100 })
      ).rejects.toThrow('وثيقة التأمين غير موجودة');
    });

    it('throws when policy inactive', async () => {
      const policy = mockPopulatedPolicy({ status: 'expired' });
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(policy) });

      await expect(
        smartInsurance.submitClaim({ policyId: 'pol1', billedAmount: 100 })
      ).rejects.toThrow('وثيقة التأمين غير فعالة');
    });
  });

  // ── requestPriorAuth ─────────────────────────────────────────────

  describe('requestPriorAuth', () => {
    it('creates auth request with pending status', async () => {
      const policy = mockPopulatedPolicy();
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(policy) });
      mockAuthCreate.mockResolvedValue({ _id: 'auth1' });
      mockAuthCountDocuments.mockResolvedValue(3);
      mockAuthFindById.mockResolvedValue({ _id: 'auth1', status: 'pending' });

      const result = await smartInsurance.requestPriorAuth({
        policyId: 'pol1',
        serviceType: 'rehab',
        clinicalJustification: 'Need therapy',
        userId: 'u1',
      });

      expect(result.status).toBe('pending');
    });

    it('throws when policy not found', async () => {
      mockPolicyFindOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await expect(smartInsurance.requestPriorAuth({ policyId: 'bad' })).rejects.toThrow(
        'وثيقة التأمين غير موجودة'
      );
    });
  });

  // ── getNphiesStatus ──────────────────────────────────────────────

  describe('getNphiesStatus', () => {
    it('throws when company not found', async () => {
      mockCompanyFindOne.mockResolvedValue(null);

      await expect(smartInsurance.getNphiesStatus('Claim', 'nid1', 'comp99')).rejects.toThrow(
        'شركة التأمين غير موجودة'
      );
    });
  });

  // ── reconcileInsuranceClaims ─────────────────────────────────────

  describe('reconcileInsuranceClaims', () => {
    it('aggregates claim stats with recovery rate', async () => {
      mockClaimAggregate.mockResolvedValue([
        {
          _id: 'comp1',
          statuses: [{ status: 'approved', count: 10, totalBilled: 50000, totalApproved: 40000 }],
          totalBilled: 50000,
          totalApproved: 40000,
          totalPatientShare: 5000,
          totalInsuranceShare: 35000,
          company: { name: 'TestCo' },
        },
      ]);

      const result = await smartInsurance.reconcileInsuranceClaims(
        'b1',
        '2025-01-01',
        '2025-12-31'
      );

      expect(result.totalClaims).toBe(10);
      expect(result.totalBilled).toBe(50000);
      expect(result.totalApproved).toBe(40000);
      expect(result.recoveryRate).toBe('80.00');
    });

    it('returns 0 recovery rate when no claims', async () => {
      mockClaimAggregate.mockResolvedValue([]);

      const result = await smartInsurance.reconcileInsuranceClaims(
        'b1',
        '2025-01-01',
        '2025-12-31'
      );

      expect(result.totalClaims).toBe(0);
      expect(result.recoveryRate).toBe(0);
    });
  });

  // ── getStats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    it('returns combined policy/claim/auth stats', async () => {
      mockPolicyAggregate.mockResolvedValue([
        { _id: 'active', count: 20 },
        { _id: 'expired', count: 5 },
      ]);
      mockClaimAggregate.mockResolvedValue([
        { _id: 'approved', count: 15, totalBilled: 100000, totalApproved: 80000 },
        { _id: 'rejected', count: 3, totalBilled: 20000, totalApproved: 0 },
      ]);
      mockAuthCountDocuments.mockResolvedValue(0); // Not used directly
      // PriorAuthorization.aggregate mock
      const PriorAuth = require('../../models/PriorAuthorization');
      PriorAuth.aggregate = jest.fn().mockResolvedValue([
        { _id: 'approved', count: 8 },
        { _id: 'pending', count: 2 },
      ]);

      const result = await smartInsurance.getStats('b1');

      expect(result.policies.active).toBe(20);
      expect(result.policies.expired).toBe(5);
      expect(result.claims.totalCount).toBe(18);
      expect(result.claims.approvalRate).toBe('66.67');
      expect(result.priorAuths.approved).toBe(8);
    });
  });

  // ── list ─────────────────────────────────────────────────────────

  describe('list', () => {
    it('throws for invalid model type', async () => {
      await expect(smartInsurance.list('invalid')).rejects.toThrow('نوع السجل غير صحيح');
    });

    it('returns paginated results for claims', async () => {
      mockClaimFind.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ _id: 'c1' }]),
          }),
        }),
      });
      mockClaimCountDocuments.mockResolvedValue(1);

      const result = await smartInsurance.list('claims', { page: 1, per_page: 10 });

      expect(result.docs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  // ── sendExpiryAlerts ─────────────────────────────────────────────

  describe('sendExpiryAlerts', () => {
    it('returns alerts for expiring policies', async () => {
      mockPolicyFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([
          {
            _id: 'pol1',
            beneficiaryId: 'ben1',
            endDate: new Date(Date.now() + 10 * 86400000),
          },
        ]),
      });

      const alerts = await smartInsurance.sendExpiryAlerts(30);

      expect(alerts).toHaveLength(1);
      expect(alerts[0].daysLeft).toBeGreaterThan(0);
    });

    it('returns empty when no expiring policies', async () => {
      mockPolicyFind.mockReturnValue({
        populate: jest.fn().mockResolvedValue([]),
      });

      const alerts = await smartInsurance.sendExpiryAlerts();
      expect(alerts).toHaveLength(0);
    });
  });

  // ── _generateClaimNumber & _generateAuthNumber ───────────────────

  describe('_generateClaimNumber', () => {
    it('generates sequential claim number', async () => {
      mockClaimCountDocuments.mockResolvedValue(42);
      const num = await smartInsurance._generateClaimNumber();
      expect(num).toMatch(/^CLM-\d{4}-000043$/);
    });
  });

  describe('_generateAuthNumber', () => {
    it('generates sequential auth number', async () => {
      mockAuthCountDocuments.mockResolvedValue(7);
      const num = await smartInsurance._generateAuthNumber();
      expect(num).toMatch(/^AUTH-\d{4}-000008$/);
    });
  });
});
