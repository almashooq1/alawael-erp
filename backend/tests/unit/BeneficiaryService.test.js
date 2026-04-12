/**
 * Unit Tests — BeneficiaryService.js
 * Batch 40 · P#79
 *
 * Singleton export + named class. Heavy DB deps mocked.
 * jest.isolateModules for fresh state.
 */

const mockBeneficiaryFindOne = jest.fn();
const mockBeneficiaryCountDocuments = jest.fn();
const mockBeneficiaryExists = jest.fn();
const mockBeneficiaryAggregate = jest.fn();
const mockBeneficiaryFindById = jest.fn();

jest.mock('../../models/Beneficiary', () => {
  const mock = jest.fn();
  mock.findOne = (...a) => mockBeneficiaryFindOne(...a);
  mock.countDocuments = (...a) => mockBeneficiaryCountDocuments(...a);
  mock.exists = (...a) => mockBeneficiaryExists(...a);
  mock.aggregate = (...a) => mockBeneficiaryAggregate(...a);
  mock.findById = (...a) => mockBeneficiaryFindById(...a);
  return mock;
});

jest.mock('../../models/Guardian', () => ({}));

const mockTransferCreate = jest.fn();
const mockTransferUpdateMany = jest.fn();
const mockTransferFind = jest.fn();
jest.mock('../../models/BeneficiaryTransfer', () => {
  const mock = {
    create: (...a) => mockTransferCreate(...a),
    updateMany: (...a) => mockTransferUpdateMany(...a),
    find: (...a) => mockTransferFind(...a),
  };
  return mock;
});

const mockWaitlistGetSmartWaitlist = jest.fn();
jest.mock('../../models/WaitlistEntry', () => ({
  getSmartWaitlist: (...a) => mockWaitlistGetSmartWaitlist(...a),
}));

jest.mock('../../constants/beneficiary.constants', () => ({
  BENEFICIARY_STATUSES: {
    ACTIVE: 'active',
    WAITING: 'waiting',
    SUSPENDED: 'suspended',
    DISCHARGED: 'discharged',
    TRANSFERRED: 'transferred',
  },
  DISABILITY_SEVERITY_LABELS: {},
  PRIORITY_LEVEL_SCORES: {},
}));

// Optional models — just provide empty defaults
const mockBranchFindById = jest.fn();
jest.mock(
  '../../models/Branch',
  () => {
    const mock = { findById: (...a) => mockBranchFindById(...a) };
    return mock;
  },
  { virtual: true }
);

jest.mock(
  '../../models/ActivityLog',
  () => ({
    create: jest.fn().mockResolvedValue({}),
  }),
  { virtual: true }
);

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Because singleton with optional try/catch requires, use isolateModules
function loadService() {
  let svc;
  jest.isolateModules(() => {
    svc = require('../../services/BeneficiaryService');
  });
  return svc;
}

describe('BeneficiaryService', () => {
  let svc;
  beforeEach(() => {
    jest.clearAllMocks();
    svc = loadService();

    // Default: findOne returns null (chain .sort().select().lean())
    const chainFindOne = {
      sort: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    };
    mockBeneficiaryFindOne.mockReturnValue(chainFindOne);
    mockBeneficiaryCountDocuments.mockResolvedValue(0);
    mockBeneficiaryExists.mockResolvedValue(null);
    mockBeneficiaryAggregate.mockResolvedValue([]);
    mockTransferCreate.mockResolvedValue({ _id: 'tr1', status: 'pending' });
    mockTransferUpdateMany.mockResolvedValue({});
  });

  // ═══════════════════════════════════
  // generateFileNumber
  // ═══════════════════════════════════
  describe('generateFileNumber', () => {
    test('returns formatted file number with sequence 0001 when no previous', async () => {
      const r = await svc.generateFileNumber('branch-1', 'RYD');
      const year = new Date().getFullYear();
      expect(r).toBe(`BR-RYD-${year}-0001`);
    });

    test('increments sequence from last existing', async () => {
      const year = new Date().getFullYear();
      const chain = {
        sort: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ fileNumber: `BR-RYD-${year}-0005` }),
      };
      mockBeneficiaryFindOne.mockReturnValue(chain);
      const r = await svc.generateFileNumber('branch-1', 'RYD');
      expect(r).toBe(`BR-RYD-${year}-0006`);
    });

    test('defaults to GEN when no branchCode provided', async () => {
      mockBranchFindById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });
      const r = await svc.generateFileNumber('branch-1');
      expect(r).toMatch(/^BR-GEN-/);
    });
  });

  // ═══════════════════════════════════
  // checkBranchCapacity
  // ═══════════════════════════════════
  describe('checkBranchCapacity', () => {
    test('does not throw when under capacity', async () => {
      mockBranchFindById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ maxCapacity: 100, nameAr: 'الرياض' }),
      });
      mockBeneficiaryCountDocuments.mockResolvedValue(50);
      await expect(svc.checkBranchCapacity('b1')).resolves.not.toThrow();
    });

    test('throws BRANCH_CAPACITY_EXCEEDED when at capacity', async () => {
      mockBranchFindById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({ maxCapacity: 10, nameAr: 'الرياض' }),
      });
      mockBeneficiaryCountDocuments.mockResolvedValue(10);
      try {
        await svc.checkBranchCapacity('b1');
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.code).toBe('BRANCH_CAPACITY_EXCEEDED');
        expect(err.statusCode).toBe(422);
      }
    });
  });

  // ═══════════════════════════════════
  // checkDuplicateRegistration
  // ═══════════════════════════════════
  describe('checkDuplicateRegistration', () => {
    test('returns { inBranch: false, elsewhere: null } when no dups', async () => {
      mockBeneficiaryExists.mockResolvedValue(null);
      const populateChain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockBeneficiaryFindOne.mockReturnValue(populateChain);
      const r = await svc.checkDuplicateRegistration('1234567890', 'b1');
      expect(r.inBranch).toBe(false);
      expect(r.elsewhere).toBeNull();
    });

    test('throws DUPLICATE_REGISTRATION when exists in branch', async () => {
      mockBeneficiaryExists.mockResolvedValue({ _id: 'existing' });
      try {
        await svc.checkDuplicateRegistration('1234567890', 'b1');
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.code).toBe('DUPLICATE_REGISTRATION');
      }
    });

    test('returns elsewhere entry when exists in another branch', async () => {
      mockBeneficiaryExists.mockResolvedValue(null);
      const elsewhere = { fileNumber: 'BR-JED-2026-0001', branch: { nameAr: 'جدة', code: 'JED' } };
      const populateChain = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(elsewhere),
      };
      mockBeneficiaryFindOne.mockReturnValue(populateChain);
      const r = await svc.checkDuplicateRegistration('1234567890', 'b1');
      expect(r.elsewhere).toEqual(elsewhere);
    });
  });

  // ═══════════════════════════════════
  // changeStatus
  // ═══════════════════════════════════
  describe('changeStatus', () => {
    function makeBeneficiary(overrides = {}) {
      return {
        _id: 'ben1',
        status: 'active',
        save: jest.fn().mockResolvedValue(true),
        ...overrides,
      };
    }

    test('sets new status and saves', async () => {
      const ben = makeBeneficiary();
      const r = await svc.changeStatus(ben, 'suspended', 'test', 'u1');
      expect(r.status).toBe('suspended');
      expect(ben.save).toHaveBeenCalled();
    });

    test('sets dischargeDate when discharged', async () => {
      const ben = makeBeneficiary();
      await svc.changeStatus(ben, 'discharged', 'reason', 'u1');
      expect(ben.dischargeDate).toBeInstanceOf(Date);
      expect(ben.dischargeReason).toBe('reason');
    });

    test('sets enrollmentDate when activated and not yet set', async () => {
      const ben = makeBeneficiary({ status: 'waiting' });
      await svc.changeStatus(ben, 'active', null, 'u1');
      expect(ben.enrollmentDate).toBeInstanceOf(Date);
    });

    test('does not overwrite existing enrollmentDate', async () => {
      const existingDate = new Date('2025-01-01');
      const ben = makeBeneficiary({ enrollmentDate: existingDate });
      await svc.changeStatus(ben, 'active', null, 'u1');
      expect(ben.enrollmentDate).toBe(existingDate);
    });
  });

  // ═══════════════════════════════════
  // initiateTransfer
  // ═══════════════════════════════════
  describe('initiateTransfer', () => {
    test('creates transfer record', async () => {
      mockBranchFindById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const ben = { _id: 'ben1', branch: 'b1', fileNumber: 'BR-1' };
      const r = await svc.initiateTransfer(ben, 'b2', new Date(), 'test', 'u1');
      expect(mockTransferCreate).toHaveBeenCalled();
      expect(mockTransferUpdateMany).toHaveBeenCalled();
      expect(r.status).toBe('pending');
    });

    test('throws SAME_BRANCH_TRANSFER when same branch', async () => {
      mockBranchFindById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      });

      const ben = { _id: 'ben1', branch: 'b1' };
      try {
        await svc.initiateTransfer(ben, 'b1', new Date(), 'test', 'u1');
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.code).toBe('SAME_BRANCH_TRANSFER');
      }
    });
  });

  // ═══════════════════════════════════
  // completeTransfer
  // ═══════════════════════════════════
  describe('completeTransfer', () => {
    test('updates beneficiary branch and file number', async () => {
      const mockBen = {
        _id: 'ben1',
        branch: 'b1',
        fileNumber: 'BR-OLD',
        save: jest.fn().mockResolvedValue(true),
      };
      mockBeneficiaryFindById.mockResolvedValue(mockBen);

      const transfer = {
        beneficiary: 'ben1',
        toBranch: 'b2',
        save: jest.fn().mockResolvedValue(true),
      };

      const r = await svc.completeTransfer(transfer, 'u1', 'JED');
      expect(r.branch).toBe('b2');
      expect(r.fileNumber).toMatch(/^BR-JED-/);
      expect(transfer.status).toBe('completed');
    });

    test('throws when beneficiary not found', async () => {
      mockBeneficiaryFindById.mockResolvedValue(null);
      const transfer = { beneficiary: 'xxx', toBranch: 'b2', save: jest.fn() };
      await expect(svc.completeTransfer(transfer, 'u1', 'X')).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════
  // getSmartWaitlist
  // ═══════════════════════════════════
  describe('getSmartWaitlist', () => {
    test('delegates to WaitlistEntry.getSmartWaitlist', async () => {
      mockWaitlistGetSmartWaitlist.mockResolvedValue([{ id: 'w1' }]);
      const r = await svc.getSmartWaitlist('b1', { limit: 10 });
      expect(mockWaitlistGetSmartWaitlist).toHaveBeenCalledWith('b1', { limit: 10 });
      expect(r).toEqual([{ id: 'w1' }]);
    });
  });

  // ═══════════════════════════════════
  // getTimeline
  // ═══════════════════════════════════
  describe('getTimeline', () => {
    test('builds timeline with registration event', async () => {
      mockTransferFind.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const ben = {
        _id: 'ben1',
        createdAt: new Date('2025-01-01'),
        fileNumber: 'BR-RYD-2025-0001',
      };
      const tl = await svc.getTimeline(ben);
      expect(tl.length).toBeGreaterThanOrEqual(1);
      expect(tl.find(e => e.type === 'registration')).toBeDefined();
    });

    test('includes enrollment event if enrollmentDate exists', async () => {
      mockTransferFind.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const ben = {
        _id: 'ben1',
        createdAt: new Date('2025-01-01'),
        enrollmentDate: new Date('2025-01-10'),
      };
      const tl = await svc.getTimeline(ben);
      expect(tl.find(e => e.type === 'status_change')).toBeDefined();
    });

    test('includes discharge event if dischargeDate exists', async () => {
      mockTransferFind.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const ben = {
        _id: 'ben1',
        createdAt: new Date('2025-01-01'),
        dischargeDate: new Date('2025-06-01'),
        dischargeReason: 'Completed',
      };
      const tl = await svc.getTimeline(ben);
      expect(tl.find(e => e.type === 'discharge')).toBeDefined();
    });

    test('includes assessment events', async () => {
      mockTransferFind.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const ben = {
        _id: 'ben1',
        createdAt: new Date('2025-01-01'),
        disabilityAssessments: [{ assessmentDate: new Date('2025-02-01'), assessmentType: 'ICF' }],
      };
      const tl = await svc.getTimeline(ben);
      expect(tl.find(e => e.type === 'assessment')).toBeDefined();
    });

    test('includes transfer events', async () => {
      mockTransferFind.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest
          .fn()
          .mockResolvedValue([
            {
              transferDate: new Date('2025-03-01'),
              status: 'completed',
              fromBranch: { nameAr: 'الرياض' },
              toBranch: { nameAr: 'جدة' },
            },
          ]),
      });

      const ben = { _id: 'ben1', createdAt: new Date('2025-01-01') };
      const tl = await svc.getTimeline(ben);
      expect(tl.find(e => e.type === 'transfer')).toBeDefined();
    });

    test('sorts timeline descending by date', async () => {
      mockTransferFind.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });

      const ben = {
        _id: 'ben1',
        createdAt: new Date('2025-01-01'),
        enrollmentDate: new Date('2025-06-01'),
      };
      const tl = await svc.getTimeline(ben);
      for (let i = 1; i < tl.length; i++) {
        expect(new Date(tl[i - 1].date) >= new Date(tl[i].date)).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════
  // getQuickStats
  // ═══════════════════════════════════
  describe('getQuickStats', () => {
    test('returns stats object with all keys', async () => {
      mockBeneficiaryCountDocuments.mockResolvedValue(10);
      mockBeneficiaryAggregate.mockResolvedValue([{ _id: 'autism', count: 5 }]);
      const r = await svc.getQuickStats();
      expect(r).toHaveProperty('total');
      expect(r).toHaveProperty('active');
      expect(r).toHaveProperty('waiting');
      expect(r).toHaveProperty('byDisabilityType');
      expect(r).toHaveProperty('bySeverity');
      expect(r).toHaveProperty('insuranceExpiringSoon');
    });

    test('filters by branchId when provided', async () => {
      mockBeneficiaryCountDocuments.mockResolvedValue(3);
      mockBeneficiaryAggregate.mockResolvedValue([]);
      await svc.getQuickStats('branch-1');
      // First call should include branch filter
      const firstCallArg = mockBeneficiaryCountDocuments.mock.calls[0][0];
      expect(firstCallArg).toHaveProperty('branch', 'branch-1');
    });
  });

  // ═══════════════════════════════════
  // getBeneficiaryStats
  // ═══════════════════════════════════
  describe('getBeneficiaryStats', () => {
    test('returns stats with daysEnrolled', async () => {
      const ben = {
        enrollmentDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        fileNumber: 'BR-RYD-2025-0001',
        status: 'active',
        updatedAt: new Date(),
        dateOfBirth: '2015-01-01',
      };
      const r = await svc.getBeneficiaryStats(ben);
      expect(r.daysEnrolled).toBeGreaterThanOrEqual(10);
      expect(r.fileNumber).toBe('BR-RYD-2025-0001');
    });

    test('daysEnrolled is 0 when no enrollmentDate', async () => {
      const ben = { status: 'waiting', updatedAt: new Date() };
      const r = await svc.getBeneficiaryStats(ben);
      expect(r.daysEnrolled).toBe(0);
    });
  });

  // ═══════════════════════════════════
  // _calculateDevelopmentalAge
  // ═══════════════════════════════════
  describe('_calculateDevelopmentalAge', () => {
    test('returns null when no dateOfBirth', () => {
      expect(svc._calculateDevelopmentalAge({})).toBeNull();
    });

    test('returns null when no assessment', () => {
      expect(svc._calculateDevelopmentalAge({ dateOfBirth: '2015-01-01' })).toBeNull();
    });

    test('returns developmental age for valid data', () => {
      const ben = {
        dateOfBirth: '2015-01-01',
        disabilityAssessments: [
          {
            communicationLevel: 'moderate_support',
            mobilityLevel: 'minimal_support',
            selfCareLevel: 'moderate_support',
            cognitiveLevel: 'moderate_support',
          },
        ],
      };
      const r = svc._calculateDevelopmentalAge(ben);
      expect(r).not.toBeNull();
      expect(r).toHaveProperty('chronologicalMonths');
      expect(r).toHaveProperty('developmentalMonths');
      expect(r).toHaveProperty('ratio');
      expect(r).toHaveProperty('labelAr');
      expect(r.developmentalMonths).toBeLessThan(r.chronologicalMonths);
    });
  });
});
