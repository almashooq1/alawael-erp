/**
 * Unit Tests — EarlyInterventionService
 * backend/services/earlyIntervention.service.js
 */

// ── Mock models ──────────────────────────────────────────────────────────────

const mockModels = {};
[
  'EarlyInterventionChild',
  'DevelopmentalScreening',
  'DevelopmentalMilestone',
  'IFSP',
  'EarlyReferral',
].forEach(name => {
  const Model = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = 'mock_id_' + name;
    this.save = jest.fn().mockResolvedValue(this);
  });
  Model.findById = jest.fn();
  Model.find = jest.fn();
  Model.findByIdAndUpdate = jest.fn();
  Model.findByIdAndDelete = jest.fn();
  Model.countDocuments = jest.fn();
  Model.aggregate = jest.fn();
  Model.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
  Model.insertMany = jest.fn().mockImplementation(arr => Promise.resolve(arr));
  mockModels[name] = Model;
});

jest.mock('../../models/EarlyIntervention', () => mockModels);
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const service = require('../../services/earlyIntervention.service');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a chainable query mock (populate/sort/skip/limit/lean/select) */
const buildChain = resolvedValue => {
  const chain = {};
  ['populate', 'sort', 'skip', 'limit', 'lean', 'select'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.lean.mockResolvedValue(resolvedValue);
  return chain;
};

/** Shortcut: make Model.find return a chain and Model.countDocuments return total */
const mockFindAndCount = (Model, data, total) => {
  Model.find.mockReturnValue(buildChain(data));
  Model.countDocuments.mockResolvedValue(total);
};

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  Object.values(mockModels).forEach(M => {
    M.mockClear();
    Object.keys(M).forEach(k => {
      if (jest.isMockFunction(M[k])) M[k].mockReset();
    });
    // Restore defaults that were set during model creation
    M.deleteMany.mockResolvedValue({ deletedCount: 5 });
    M.insertMany.mockImplementation(arr => Promise.resolve(arr));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 1  MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Module exports', () => {
  it('should export a service object (singleton)', () => {
    expect(service).toBeDefined();
    expect(typeof service).toBe('object');
  });

  it('should expose all public methods', () => {
    const expected = [
      'createChild',
      'getChildren',
      'getChildById',
      'updateChild',
      'deleteChild',
      'getChildFullProfile',
      'createScreening',
      'getScreenings',
      'getScreeningById',
      'updateScreening',
      'deleteScreening',
      'getScreeningsByChild',
      'createMilestone',
      'getMilestones',
      'getMilestoneById',
      'updateMilestone',
      'deleteMilestone',
      'getMilestonesByChild',
      'getMilestoneReport',
      'createIFSP',
      'getIFSPs',
      'getIFSPById',
      'updateIFSP',
      'deleteIFSP',
      'getIFSPsByChild',
      'addIFSPReview',
      'updateIFSPGoalProgress',
      'createReferral',
      'getReferrals',
      'getReferralById',
      'updateReferral',
      'deleteReferral',
      'getReferralsByChild',
      'addReferralCommunication',
      'updateReferralStatus',
      'getDashboardStats',
      'initializeMilestonesForChild',
    ];
    expected.forEach(fn => {
      expect(typeof service[fn]).toBe('function');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2  CHILDREN CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe('Children CRUD', () => {
  // ── createChild ──
  describe('createChild', () => {
    it('should create a child with createdBy set', async () => {
      const data = { firstName: 'Ahmad', childNumber: 'C001' };
      const result = await service.createChild(data, 'user1');
      expect(data.createdBy).toBe('user1');
      expect(mockModels.EarlyInterventionChild).toHaveBeenCalledWith(data);
      expect(result.save).toHaveBeenCalled();
    });

    it('should return the saved child', async () => {
      const result = await service.createChild({ firstName: 'Sara' }, 'u1');
      expect(result).toBeDefined();
      expect(result._id).toBe('mock_id_EarlyInterventionChild');
    });
  });

  // ── getChildById ──
  describe('getChildById', () => {
    it('should return a child when found', async () => {
      const childObj = { _id: 'c1', firstName: 'Ali' };
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(childObj),
      };
      mockModels.EarlyInterventionChild.findById.mockReturnValue(chain);

      const result = await service.getChildById('c1');
      expect(result).toEqual(childObj);
      expect(chain.populate).toHaveBeenCalledTimes(4);
      expect(chain.lean).toHaveBeenCalled();
    });

    it('should throw Arabic error when child not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModels.EarlyInterventionChild.findById.mockReturnValue(chain);

      await expect(service.getChildById('bad_id')).rejects.toThrow('ملف الطفل غير موجود');
    });
  });

  // ── getChildren ──
  describe('getChildren', () => {
    it('should return paginated result', async () => {
      const items = [{ _id: '1' }, { _id: '2' }];
      mockFindAndCount(mockModels.EarlyInterventionChild, items, 30);

      const result = await service.getChildren({}, { page: 2, limit: 10 });
      expect(result.data).toEqual(items);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 30,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });
    });

    it('should use default pagination when none provided', async () => {
      mockFindAndCount(mockModels.EarlyInterventionChild, [], 0);
      const result = await service.getChildren();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('hasNextPage should be false on last page', async () => {
      mockFindAndCount(mockModels.EarlyInterventionChild, [{ _id: '1' }], 5);
      const result = await service.getChildren({}, { page: 1, limit: 5 });
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('hasPrevPage should be false on first page', async () => {
      mockFindAndCount(mockModels.EarlyInterventionChild, [], 10);
      const result = await service.getChildren({}, { page: 1, limit: 5 });
      expect(result.pagination.hasPrevPage).toBe(false);
    });
  });

  // ── updateChild ──
  describe('updateChild', () => {
    it('should update and return child', async () => {
      const updated = { _id: 'c1', childNumber: 'C001', firstName: 'Updated' };
      mockModels.EarlyInterventionChild.findByIdAndUpdate.mockResolvedValue(updated);

      const result = await service.updateChild('c1', { firstName: 'Updated' }, 'u1');
      expect(result).toEqual(updated);
      expect(mockModels.EarlyInterventionChild.findByIdAndUpdate).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ firstName: 'Updated', updatedBy: 'u1' }),
        { new: true, runValidators: true }
      );
    });

    it('should throw when child not found', async () => {
      mockModels.EarlyInterventionChild.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateChild('bad', {}, 'u1')).rejects.toThrow('ملف الطفل غير موجود');
    });
  });

  // ── deleteChild ──
  describe('deleteChild', () => {
    it('should delete child and cascade to 4 related models', async () => {
      mockModels.EarlyInterventionChild.findByIdAndDelete.mockResolvedValue({
        _id: 'c1',
        childNumber: 'C001',
      });

      await service.deleteChild('c1');

      expect(mockModels.DevelopmentalScreening.deleteMany).toHaveBeenCalledWith({ child: 'c1' });
      expect(mockModels.DevelopmentalMilestone.deleteMany).toHaveBeenCalledWith({ child: 'c1' });
      expect(mockModels.IFSP.deleteMany).toHaveBeenCalledWith({ child: 'c1' });
      expect(mockModels.EarlyReferral.deleteMany).toHaveBeenCalledWith({ child: 'c1' });
    });

    it('should throw when child not found', async () => {
      mockModels.EarlyInterventionChild.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.deleteChild('bad')).rejects.toThrow('ملف الطفل غير موجود');
    });
  });

  // ── getChildFullProfile ──
  describe('getChildFullProfile', () => {
    it('should return child + screenings + milestones + ifsps + referrals', async () => {
      const childObj = { _id: 'c1', firstName: 'Ali' };
      const childChain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(childObj),
      };
      mockModels.EarlyInterventionChild.findById.mockReturnValue(childChain);

      // 4 find chains
      const screenData = [{ _id: 's1' }];
      const mileData = [{ _id: 'm1' }];
      const ifspData = [{ _id: 'i1' }];
      const refData = [{ _id: 'r1' }];
      mockModels.DevelopmentalScreening.find.mockReturnValue(buildChain(screenData));
      mockModels.DevelopmentalMilestone.find.mockReturnValue(buildChain(mileData));
      mockModels.IFSP.find.mockReturnValue(buildChain(ifspData));
      mockModels.EarlyReferral.find.mockReturnValue(buildChain(refData));

      const result = await service.getChildFullProfile('c1');
      expect(result.child).toEqual(childObj);
      expect(result.screenings).toEqual(screenData);
      expect(result.milestones).toEqual(mileData);
      expect(result.ifsps).toEqual(ifspData);
      expect(result.referrals).toEqual(refData);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3  CHILD QUERY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe('_buildChildQuery', () => {
  it('should return empty object for no filters', () => {
    expect(service._buildChildQuery({})).toEqual({});
  });

  it('should handle status filter', () => {
    expect(service._buildChildQuery({ status: 'ACTIVE' })).toEqual({ status: 'ACTIVE' });
  });

  it('should handle eligibilityStatus', () => {
    expect(service._buildChildQuery({ eligibilityStatus: 'ELIGIBLE' })).toEqual({
      eligibilityStatus: 'ELIGIBLE',
    });
  });

  it('should handle gender + disabilityType + primaryCoordinator + organization + referralSource', () => {
    const q = service._buildChildQuery({
      gender: 'M',
      disabilityType: 'ASD',
      primaryCoordinator: 'u1',
      organization: 'org1',
      referralSource: 'HOSPITAL',
    });
    expect(q.gender).toBe('M');
    expect(q.disabilityType).toBe('ASD');
    expect(q.primaryCoordinator).toBe('u1');
    expect(q.organization).toBe('org1');
    expect(q.referralSource).toBe('HOSPITAL');
  });

  it('should build $or regex for search', () => {
    const q = service._buildChildQuery({ search: 'Ali' });
    expect(q.$or).toBeDefined();
    expect(q.$or).toHaveLength(6);
    expect(q.$or[0].firstName).toBeInstanceOf(RegExp);
    expect(q.$or[0].firstName.flags).toBe('i');
  });

  it('should escape special regex chars in search', () => {
    const q = service._buildChildQuery({ search: 'a+b' });
    // + should be escaped → a\+b
    expect(q.$or[0].firstName.source).toContain('\\+');
  });

  it('should handle ageMinMonths only', () => {
    const q = service._buildChildQuery({ ageMinMonths: 12 });
    expect(q['birthInfo.birthDate']).toBeDefined();
    expect(q['birthInfo.birthDate'].$lte).toBeInstanceOf(Date);
  });

  it('should handle ageMaxMonths only', () => {
    const q = service._buildChildQuery({ ageMaxMonths: 24 });
    expect(q['birthInfo.birthDate'].$gte).toBeInstanceOf(Date);
  });

  it('should handle both ageMinMonths and ageMaxMonths', () => {
    const q = service._buildChildQuery({ ageMinMonths: 6, ageMaxMonths: 36 });
    expect(q['birthInfo.birthDate'].$gte).toBeInstanceOf(Date);
    expect(q['birthInfo.birthDate'].$lte).toBeInstanceOf(Date);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4  SCREENINGS CRUD
// ═══════════════════════════════════════════════════════════════════════════════

describe('Screenings CRUD', () => {
  // ── createScreening ──
  describe('createScreening', () => {
    it('should create screening when child exists', async () => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue({
        _id: 'c1',
        childNumber: 'C001',
      });
      const data = { child: 'c1', screeningType: 'ASQ' };
      const result = await service.createScreening(data, 'u1');
      expect(data.createdBy).toBe('u1');
      expect(result.save).toHaveBeenCalled();
    });

    it('should throw when child does not exist', async () => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue(null);
      await expect(service.createScreening({ child: 'bad' }, 'u1')).rejects.toThrow(
        'ملف الطفل غير موجود'
      );
    });
  });

  // ── getScreenings ──
  describe('getScreenings', () => {
    it('should return paginated screenings', async () => {
      const items = [{ _id: 's1' }];
      mockFindAndCount(mockModels.DevelopmentalScreening, items, 1);
      const result = await service.getScreenings({}, { page: 1, limit: 20 });
      expect(result.data).toEqual(items);
      expect(result.pagination.total).toBe(1);
    });

    it('should use default pagination', async () => {
      mockFindAndCount(mockModels.DevelopmentalScreening, [], 0);
      const result = await service.getScreenings();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  // ── getScreeningById ──
  describe('getScreeningById', () => {
    it('should return screening when found', async () => {
      const obj = { _id: 's1', screeningNumber: 'S001' };
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(obj),
      };
      mockModels.DevelopmentalScreening.findById.mockReturnValue(chain);
      const result = await service.getScreeningById('s1');
      expect(result).toEqual(obj);
      expect(chain.populate).toHaveBeenCalledTimes(3);
    });

    it('should throw when not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModels.DevelopmentalScreening.findById.mockReturnValue(chain);
      await expect(service.getScreeningById('bad')).rejects.toThrow('سجل الفحص غير موجود');
    });
  });

  // ── updateScreening ──
  describe('updateScreening', () => {
    it('should update and return screening', async () => {
      const updated = { _id: 's1', screeningNumber: 'S001' };
      mockModels.DevelopmentalScreening.findByIdAndUpdate.mockResolvedValue(updated);
      const result = await service.updateScreening('s1', { status: 'COMPLETED' }, 'u1');
      expect(result).toEqual(updated);
      expect(mockModels.DevelopmentalScreening.findByIdAndUpdate).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ updatedBy: 'u1' }),
        { new: true, runValidators: true }
      );
    });

    it('should throw when not found', async () => {
      mockModels.DevelopmentalScreening.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateScreening('bad', {}, 'u1')).rejects.toThrow('سجل الفحص غير موجود');
    });
  });

  // ── deleteScreening ──
  describe('deleteScreening', () => {
    it('should delete and return screening', async () => {
      mockModels.DevelopmentalScreening.findByIdAndDelete.mockResolvedValue({ _id: 's1' });
      const result = await service.deleteScreening('s1');
      expect(result._id).toBe('s1');
    });

    it('should throw when not found', async () => {
      mockModels.DevelopmentalScreening.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.deleteScreening('bad')).rejects.toThrow('سجل الفحص غير موجود');
    });
  });

  // ── getScreeningsByChild ──
  describe('getScreeningsByChild', () => {
    it('should return paginated screenings for a child', async () => {
      mockFindAndCount(mockModels.DevelopmentalScreening, [{ _id: 's1' }], 1);
      const result = await service.getScreeningsByChild('c1', { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });

    it('should use default pagination', async () => {
      mockFindAndCount(mockModels.DevelopmentalScreening, [], 0);
      const result = await service.getScreeningsByChild('c1');
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5  SCREENING QUERY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe('_buildScreeningQuery', () => {
  it('should return empty object for no filters', () => {
    expect(service._buildScreeningQuery({})).toEqual({});
  });

  it('should handle child, status, overallResult, screener, screeningType, organization', () => {
    const q = service._buildScreeningQuery({
      child: 'c1',
      status: 'COMPLETED',
      overallResult: 'AT_RISK',
      screener: 'u1',
      screeningType: 'ASQ',
      organization: 'org1',
    });
    expect(q.child).toBe('c1');
    expect(q.status).toBe('COMPLETED');
    expect(q.overallResult).toBe('AT_RISK');
    expect(q.screener).toBe('u1');
    expect(q.screeningType).toBe('ASQ');
    expect(q.organization).toBe('org1');
  });

  it('should handle dateFrom only', () => {
    const q = service._buildScreeningQuery({ dateFrom: '2024-01-01' });
    expect(q.screeningDate.$gte).toBeInstanceOf(Date);
  });

  it('should handle dateTo only', () => {
    const q = service._buildScreeningQuery({ dateTo: '2024-12-31' });
    expect(q.screeningDate.$lte).toBeInstanceOf(Date);
  });

  it('should handle dateFrom and dateTo', () => {
    const q = service._buildScreeningQuery({ dateFrom: '2024-01-01', dateTo: '2024-12-31' });
    expect(q.screeningDate.$gte).toBeInstanceOf(Date);
    expect(q.screeningDate.$lte).toBeInstanceOf(Date);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6  MILESTONES
// ═══════════════════════════════════════════════════════════════════════════════

describe('Milestones', () => {
  // ── createMilestone ──
  describe('createMilestone', () => {
    beforeEach(() => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue({
        _id: 'c1',
        childNumber: 'C001',
      });
    });

    it('should verify child exists', async () => {
      await service.createMilestone({ child: 'c1', milestone: 'Walks' }, 'u1');
      expect(mockModels.EarlyInterventionChild.findById).toHaveBeenCalledWith('c1');
    });

    it('should throw when child not found', async () => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue(null);
      await expect(service.createMilestone({ child: 'bad' }, 'u1')).rejects.toThrow(
        'ملف الطفل غير موجود'
      );
    });

    it('should set delaySeverity NONE when delayMonths <= 0', async () => {
      const data = { child: 'c1', actualAgeMonths: 6, expectedAgeMonths: 8 };
      await service.createMilestone(data, 'u1');
      expect(data.delayMonths).toBe(-2);
      expect(data.isDelayed).toBe(false);
      expect(data.delaySeverity).toBe('NONE');
    });

    it('should set delaySeverity MILD when delayMonths 1-3', async () => {
      const data = { child: 'c1', actualAgeMonths: 9, expectedAgeMonths: 6 };
      await service.createMilestone(data, 'u1');
      expect(data.delayMonths).toBe(3);
      expect(data.isDelayed).toBe(true);
      expect(data.delaySeverity).toBe('MILD');
    });

    it('should set delaySeverity MODERATE when delayMonths 4-6', async () => {
      const data = { child: 'c1', actualAgeMonths: 12, expectedAgeMonths: 6 };
      await service.createMilestone(data, 'u1');
      expect(data.delayMonths).toBe(6);
      expect(data.delaySeverity).toBe('MODERATE');
    });

    it('should set delaySeverity SEVERE when delayMonths 7-12', async () => {
      const data = { child: 'c1', actualAgeMonths: 18, expectedAgeMonths: 6 };
      await service.createMilestone(data, 'u1');
      expect(data.delayMonths).toBe(12);
      expect(data.delaySeverity).toBe('SEVERE');
    });

    it('should set delaySeverity PROFOUND when delayMonths > 12', async () => {
      const data = { child: 'c1', actualAgeMonths: 25, expectedAgeMonths: 6 };
      await service.createMilestone(data, 'u1');
      expect(data.delayMonths).toBe(19);
      expect(data.delaySeverity).toBe('PROFOUND');
    });

    it('should NOT calculate delay when ages are missing', async () => {
      const data = { child: 'c1', milestone: 'Talks' };
      await service.createMilestone(data, 'u1');
      expect(data.delayMonths).toBeUndefined();
    });
  });

  // ── getMilestones ──
  describe('getMilestones', () => {
    it('should return paginated milestones with default limit=50 and ascending sort', async () => {
      mockFindAndCount(mockModels.DevelopmentalMilestone, [{ _id: 'm1' }], 1);
      const result = await service.getMilestones();
      expect(result.pagination.limit).toBe(50);
      expect(result.data).toHaveLength(1);
    });

    it('should support custom pagination', async () => {
      mockFindAndCount(mockModels.DevelopmentalMilestone, [], 100);
      const result = await service.getMilestones({}, { page: 3, limit: 10 });
      expect(result.pagination.totalPages).toBe(10);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });
  });

  // ── getMilestoneById ──
  describe('getMilestoneById', () => {
    it('should return milestone when found', async () => {
      const obj = { _id: 'm1', milestone: 'Walks' };
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(obj),
      };
      mockModels.DevelopmentalMilestone.findById.mockReturnValue(chain);
      const result = await service.getMilestoneById('m1');
      expect(result).toEqual(obj);
      expect(chain.populate).toHaveBeenCalledTimes(2);
    });

    it('should throw when not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModels.DevelopmentalMilestone.findById.mockReturnValue(chain);
      await expect(service.getMilestoneById('bad')).rejects.toThrow('المعلم التنموي غير موجود');
    });
  });

  // ── updateMilestone ──
  describe('updateMilestone', () => {
    it('should recalculate delay when actualAgeMonths is provided', async () => {
      mockModels.DevelopmentalMilestone.findById.mockResolvedValue({
        actualAgeMonths: 10,
        expectedAgeMonths: 6,
      });
      const updated = { _id: 'm1', delayMonths: 7, delaySeverity: 'SEVERE' };
      mockModels.DevelopmentalMilestone.findByIdAndUpdate.mockResolvedValue(updated);

      const data = { actualAgeMonths: 13 };
      const result = await service.updateMilestone('m1', data, 'u1');
      // 13 - 6 = 7
      expect(data.delayMonths).toBe(7);
      expect(data.delaySeverity).toBe('SEVERE');
      expect(result).toEqual(updated);
    });

    it('should recalculate delay when expectedAgeMonths is provided', async () => {
      mockModels.DevelopmentalMilestone.findById.mockResolvedValue({
        actualAgeMonths: 15,
        expectedAgeMonths: 6,
      });
      mockModels.DevelopmentalMilestone.findByIdAndUpdate.mockResolvedValue({ _id: 'm1' });

      const data = { expectedAgeMonths: 12 };
      await service.updateMilestone('m1', data, 'u1');
      // 15 - 12 = 3
      expect(data.delayMonths).toBe(3);
      expect(data.delaySeverity).toBe('MILD');
    });

    it('should throw when existing milestone not found during recalc', async () => {
      mockModels.DevelopmentalMilestone.findById.mockResolvedValue(null);
      await expect(service.updateMilestone('bad', { actualAgeMonths: 10 }, 'u1')).rejects.toThrow(
        'المعلم التنموي غير موجود'
      );
    });

    it('should NOT recalculate if neither age is changed', async () => {
      mockModels.DevelopmentalMilestone.findByIdAndUpdate.mockResolvedValue({ _id: 'm1' });
      const data = { status: 'ACHIEVED' };
      await service.updateMilestone('m1', data, 'u1');
      expect(mockModels.DevelopmentalMilestone.findById).not.toHaveBeenCalled();
      expect(data.delayMonths).toBeUndefined();
    });

    it('should throw when findByIdAndUpdate returns null', async () => {
      mockModels.DevelopmentalMilestone.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateMilestone('bad', { status: 'X' }, 'u1')).rejects.toThrow(
        'المعلم التنموي غير موجود'
      );
    });
  });

  // ── deleteMilestone ──
  describe('deleteMilestone', () => {
    it('should delete and return milestone', async () => {
      mockModels.DevelopmentalMilestone.findByIdAndDelete.mockResolvedValue({ _id: 'm1' });
      const result = await service.deleteMilestone('m1');
      expect(result._id).toBe('m1');
    });

    it('should throw when not found', async () => {
      mockModels.DevelopmentalMilestone.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.deleteMilestone('bad')).rejects.toThrow('المعلم التنموي غير موجود');
    });
  });

  // ── getMilestonesByChild ──
  describe('getMilestonesByChild', () => {
    it('should return milestones sorted by domain then expectedAgeMonths', async () => {
      const chain = buildChain([{ _id: 'm1' }]);
      mockModels.DevelopmentalMilestone.find.mockReturnValue(chain);
      const result = await service.getMilestonesByChild('c1');
      expect(mockModels.DevelopmentalMilestone.find).toHaveBeenCalledWith({ child: 'c1' });
      expect(chain.sort).toHaveBeenCalledWith({ domain: 1, expectedAgeMonths: 1 });
      expect(result).toEqual([{ _id: 'm1' }]);
    });
  });

  // ── getMilestoneReport ──
  describe('getMilestoneReport', () => {
    it('should compute report for all 7 domains', async () => {
      const milestones = [
        { domain: 'COGNITIVE', status: 'ACHIEVED', isDelayed: false, delayMonths: 0 },
        { domain: 'COGNITIVE', status: 'EMERGING', isDelayed: true, delayMonths: 2 },
        { domain: 'COMMUNICATION', status: 'NOT_YET', isDelayed: false, delayMonths: 0 },
        { domain: 'GROSS_MOTOR', status: 'ACHIEVED', isDelayed: false, delayMonths: 0 },
      ];
      const chain = { lean: jest.fn().mockResolvedValue(milestones) };
      mockModels.DevelopmentalMilestone.find.mockReturnValue(chain);

      const report = await service.getMilestoneReport('c1');

      // Check all 7 domains exist
      [
        'COGNITIVE',
        'COMMUNICATION',
        'GROSS_MOTOR',
        'FINE_MOTOR',
        'SOCIAL_EMOTIONAL',
        'ADAPTIVE',
        'SENSORY',
      ].forEach(d => expect(report[d]).toBeDefined());

      // COGNITIVE: 2 total, 1 achieved, 1 delayed, 1 emerging, 0 notYet
      expect(report.COGNITIVE.total).toBe(2);
      expect(report.COGNITIVE.achieved).toBe(1);
      expect(report.COGNITIVE.delayed).toBe(1);
      expect(report.COGNITIVE.emerging).toBe(1);
      expect(report.COGNITIVE.notYet).toBe(0);
      expect(report.COGNITIVE.achievementRate).toBe(50);
      expect(report.COGNITIVE.averageDelay).toBe(2);

      // COMMUNICATION: 1 total, 0 achieved, 0 delayed, 0 emerging, 1 notYet
      expect(report.COMMUNICATION.notYet).toBe(1);
      expect(report.COMMUNICATION.achievementRate).toBe(0);

      // Domains with no milestones
      expect(report.FINE_MOTOR.total).toBe(0);
      expect(report.FINE_MOTOR.achievementRate).toBe(0);
      expect(report.FINE_MOTOR.averageDelay).toBe(0);
    });

    it('should handle empty milestones', async () => {
      const chain = { lean: jest.fn().mockResolvedValue([]) };
      mockModels.DevelopmentalMilestone.find.mockReturnValue(chain);
      const report = await service.getMilestoneReport('c1');
      expect(report.COGNITIVE.total).toBe(0);
      expect(report.COGNITIVE.achievementRate).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7  MILESTONE QUERY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe('_buildMilestoneQuery', () => {
  it('should return empty object for no filters', () => {
    expect(service._buildMilestoneQuery({})).toEqual({});
  });

  it('should handle child and domain', () => {
    const q = service._buildMilestoneQuery({ child: 'c1', domain: 'COGNITIVE' });
    expect(q.child).toBe('c1');
    expect(q.domain).toBe('COGNITIVE');
  });

  it('should handle status and delaySeverity', () => {
    const q = service._buildMilestoneQuery({ status: 'ACHIEVED', delaySeverity: 'MILD' });
    expect(q.status).toBe('ACHIEVED');
    expect(q.delaySeverity).toBe('MILD');
  });

  it('should handle isDelayed boolean', () => {
    const q = service._buildMilestoneQuery({ isDelayed: true });
    expect(q.isDelayed).toBe(true);
    const q2 = service._buildMilestoneQuery({ isDelayed: false });
    expect(q2.isDelayed).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8  IFSP PLANS
// ═══════════════════════════════════════════════════════════════════════════════

describe('IFSP Plans', () => {
  // ── createIFSP ──
  describe('createIFSP', () => {
    it('should create IFSP when child exists', async () => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue({
        _id: 'c1',
        childNumber: 'C001',
      });
      const data = { child: 'c1', planType: 'INITIAL' };
      const result = await service.createIFSP(data, 'u1');
      expect(data.createdBy).toBe('u1');
      expect(result.save).toHaveBeenCalled();
    });

    it('should throw when child not found', async () => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue(null);
      await expect(service.createIFSP({ child: 'bad' }, 'u1')).rejects.toThrow(
        'ملف الطفل غير موجود'
      );
    });
  });

  // ── getIFSPs ──
  describe('getIFSPs', () => {
    it('should return paginated IFSPs', async () => {
      mockFindAndCount(mockModels.IFSP, [{ _id: 'i1' }], 5);
      const result = await service.getIFSPs({}, { page: 1, limit: 5 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(5);
      expect(result.pagination.hasNextPage).toBe(false);
    });

    it('should use defaults', async () => {
      mockFindAndCount(mockModels.IFSP, [], 0);
      const result = await service.getIFSPs();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  // ── getIFSPById ──
  describe('getIFSPById', () => {
    it('should return IFSP when found', async () => {
      const obj = { _id: 'i1', planNumber: 'IFSP001' };
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(obj),
      };
      mockModels.IFSP.findById.mockReturnValue(chain);
      const result = await service.getIFSPById('i1');
      expect(result).toEqual(obj);
      expect(chain.populate).toHaveBeenCalledTimes(5);
    });

    it('should throw when not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModels.IFSP.findById.mockReturnValue(chain);
      await expect(service.getIFSPById('bad')).rejects.toThrow('خطة IFSP غير موجودة');
    });
  });

  // ── updateIFSP ──
  describe('updateIFSP', () => {
    it('should update and return IFSP', async () => {
      const updated = { _id: 'i1', planNumber: 'IFSP001' };
      mockModels.IFSP.findByIdAndUpdate.mockResolvedValue(updated);
      const result = await service.updateIFSP('i1', { status: 'ACTIVE' }, 'u1');
      expect(result).toEqual(updated);
      expect(mockModels.IFSP.findByIdAndUpdate).toHaveBeenCalledWith(
        'i1',
        expect.objectContaining({ updatedBy: 'u1' }),
        { new: true, runValidators: true }
      );
    });

    it('should throw when not found', async () => {
      mockModels.IFSP.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateIFSP('bad', {}, 'u1')).rejects.toThrow('خطة IFSP غير موجودة');
    });
  });

  // ── deleteIFSP ──
  describe('deleteIFSP', () => {
    it('should delete and return IFSP', async () => {
      mockModels.IFSP.findByIdAndDelete.mockResolvedValue({ _id: 'i1' });
      const result = await service.deleteIFSP('i1');
      expect(result._id).toBe('i1');
    });

    it('should throw when not found', async () => {
      mockModels.IFSP.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.deleteIFSP('bad')).rejects.toThrow('خطة IFSP غير موجودة');
    });
  });

  // ── getIFSPsByChild ──
  describe('getIFSPsByChild', () => {
    it('should return IFSPs sorted by startDate desc', async () => {
      const chain = buildChain([{ _id: 'i1' }]);
      mockModels.IFSP.find.mockReturnValue(chain);
      const result = await service.getIFSPsByChild('c1');
      expect(mockModels.IFSP.find).toHaveBeenCalledWith({ child: 'c1' });
      expect(chain.sort).toHaveBeenCalledWith({ startDate: -1 });
      expect(result).toEqual([{ _id: 'i1' }]);
    });
  });

  // ── addIFSPReview ──
  describe('addIFSPReview', () => {
    it('should add review, set status to IN_REVIEW, and save', async () => {
      const mockIfsp = {
        _id: 'i1',
        planNumber: 'IFSP001',
        status: 'ACTIVE',
        reviews: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.IFSP.findById.mockResolvedValue(mockIfsp);

      const reviewData = { outcome: 'Progressing well', nextReviewDate: '2025-06-01' };
      const result = await service.addIFSPReview('i1', reviewData, 'u1');

      expect(reviewData.reviewer).toBe('u1');
      expect(mockIfsp.reviews).toHaveLength(1);
      expect(mockIfsp.status).toBe('IN_REVIEW');
      expect(mockIfsp.nextReviewDate).toBe('2025-06-01');
      expect(mockIfsp.save).toHaveBeenCalled();
      expect(result).toEqual(mockIfsp);
    });

    it('should not set nextReviewDate if not provided', async () => {
      const mockIfsp = {
        _id: 'i1',
        status: 'ACTIVE',
        reviews: [],
        nextReviewDate: 'old_date',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.IFSP.findById.mockResolvedValue(mockIfsp);

      await service.addIFSPReview('i1', { outcome: 'OK' }, 'u1');
      expect(mockIfsp.nextReviewDate).toBe('old_date');
    });

    it('should throw when IFSP not found', async () => {
      mockModels.IFSP.findById.mockResolvedValue(null);
      await expect(service.addIFSPReview('bad', {}, 'u1')).rejects.toThrow('خطة IFSP غير موجودة');
    });
  });

  // ── updateIFSPGoalProgress ──
  describe('updateIFSPGoalProgress', () => {
    it('should update goal progress and push note', async () => {
      const mockGoal = { progress: 0, status: 'NOT_STARTED', progressNotes: [] };
      const mockIfsp = {
        _id: 'i1',
        goals: { id: jest.fn().mockReturnValue(mockGoal) },
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.IFSP.findById.mockResolvedValue(mockIfsp);

      const progressData = { progress: 50, status: 'IN_PROGRESS', note: 'Great progress' };
      await service.updateIFSPGoalProgress('i1', 'g1', progressData, 'u1');

      expect(mockIfsp.goals.id).toHaveBeenCalledWith('g1');
      expect(mockGoal.progress).toBe(50);
      expect(mockGoal.status).toBe('IN_PROGRESS');
      expect(mockGoal.progressNotes).toHaveLength(1);
      expect(mockGoal.progressNotes[0]).toEqual(
        expect.objectContaining({
          note: 'Great progress',
          progressPercent: 50,
          recordedBy: 'u1',
        })
      );
      expect(mockIfsp.save).toHaveBeenCalled();
    });

    it('should update only progress when status not provided', async () => {
      const mockGoal = { progress: 0, status: 'NOT_STARTED', progressNotes: [] };
      const mockIfsp = {
        _id: 'i1',
        goals: { id: jest.fn().mockReturnValue(mockGoal) },
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.IFSP.findById.mockResolvedValue(mockIfsp);

      await service.updateIFSPGoalProgress('i1', 'g1', { progress: 75, note: 'Better' }, 'u1');
      expect(mockGoal.progress).toBe(75);
      expect(mockGoal.status).toBe('NOT_STARTED'); // unchanged
    });

    it('should throw when IFSP not found', async () => {
      mockModels.IFSP.findById.mockResolvedValue(null);
      await expect(service.updateIFSPGoalProgress('bad', 'g1', {}, 'u1')).rejects.toThrow(
        'خطة IFSP غير موجودة'
      );
    });

    it('should throw when goal not found', async () => {
      const mockIfsp = {
        _id: 'i1',
        goals: { id: jest.fn().mockReturnValue(null) },
        save: jest.fn(),
      };
      mockModels.IFSP.findById.mockResolvedValue(mockIfsp);
      await expect(service.updateIFSPGoalProgress('i1', 'g_bad', {}, 'u1')).rejects.toThrow(
        'الهدف غير موجود'
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9  IFSP QUERY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe('_buildIFSPQuery', () => {
  it('should return empty object for no filters', () => {
    expect(service._buildIFSPQuery({})).toEqual({});
  });

  it('should handle child, status, planType, serviceCoordinator, organization', () => {
    const q = service._buildIFSPQuery({
      child: 'c1',
      status: 'ACTIVE',
      planType: 'INITIAL',
      serviceCoordinator: 'u1',
      organization: 'org1',
    });
    expect(q.child).toBe('c1');
    expect(q.status).toBe('ACTIVE');
    expect(q.planType).toBe('INITIAL');
    expect(q.serviceCoordinator).toBe('u1');
    expect(q.organization).toBe('org1');
  });

  it('should handle dateFrom and dateTo', () => {
    const q = service._buildIFSPQuery({ dateFrom: '2024-01-01', dateTo: '2024-12-31' });
    expect(q.startDate.$gte).toBeInstanceOf(Date);
    expect(q.startDate.$lte).toBeInstanceOf(Date);
  });

  it('should handle dateFrom only', () => {
    const q = service._buildIFSPQuery({ dateFrom: '2024-01-01' });
    expect(q.startDate.$gte).toBeInstanceOf(Date);
    expect(q.startDate.$lte).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10  REFERRALS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Referrals', () => {
  // ── createReferral ──
  describe('createReferral', () => {
    it('should create referral when child exists', async () => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue({ _id: 'c1' });
      const data = { child: 'c1', reason: 'Hearing check' };
      const result = await service.createReferral(data, 'u1');
      expect(data.createdBy).toBe('u1');
      expect(result.save).toHaveBeenCalled();
    });

    it('should throw when child does not exist', async () => {
      mockModels.EarlyInterventionChild.findById.mockResolvedValue(null);
      await expect(service.createReferral({ child: 'bad' }, 'u1')).rejects.toThrow(
        'ملف الطفل غير موجود'
      );
    });

    it('should create referral without child', async () => {
      const data = { reason: 'General referral' };
      const result = await service.createReferral(data, 'u1');
      expect(mockModels.EarlyInterventionChild.findById).not.toHaveBeenCalled();
      expect(result.save).toHaveBeenCalled();
    });
  });

  // ── getReferrals ──
  describe('getReferrals', () => {
    it('should return paginated referrals', async () => {
      mockFindAndCount(mockModels.EarlyReferral, [{ _id: 'r1' }], 3);
      const result = await service.getReferrals({}, { page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(3);
    });

    it('should use defaults', async () => {
      mockFindAndCount(mockModels.EarlyReferral, [], 0);
      const result = await service.getReferrals();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });
  });

  // ── getReferralById ──
  describe('getReferralById', () => {
    it('should return referral when found', async () => {
      const obj = { _id: 'r1', referralNumber: 'R001' };
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(obj),
      };
      mockModels.EarlyReferral.findById.mockReturnValue(chain);
      const result = await service.getReferralById('r1');
      expect(result).toEqual(obj);
      expect(chain.populate).toHaveBeenCalledTimes(3);
    });

    it('should throw when not found', async () => {
      const chain = {
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(null),
      };
      mockModels.EarlyReferral.findById.mockReturnValue(chain);
      await expect(service.getReferralById('bad')).rejects.toThrow('الإحالة غير موجودة');
    });
  });

  // ── updateReferral ──
  describe('updateReferral', () => {
    it('should update and return referral', async () => {
      const updated = { _id: 'r1', referralNumber: 'R001' };
      mockModels.EarlyReferral.findByIdAndUpdate.mockResolvedValue(updated);
      const result = await service.updateReferral('r1', { status: 'ACCEPTED' }, 'u1');
      expect(result).toEqual(updated);
      expect(mockModels.EarlyReferral.findByIdAndUpdate).toHaveBeenCalledWith(
        'r1',
        expect.objectContaining({ updatedBy: 'u1' }),
        { new: true, runValidators: true }
      );
    });

    it('should throw when not found', async () => {
      mockModels.EarlyReferral.findByIdAndUpdate.mockResolvedValue(null);
      await expect(service.updateReferral('bad', {}, 'u1')).rejects.toThrow('الإحالة غير موجودة');
    });
  });

  // ── deleteReferral ──
  describe('deleteReferral', () => {
    it('should delete and return referral', async () => {
      mockModels.EarlyReferral.findByIdAndDelete.mockResolvedValue({ _id: 'r1' });
      const result = await service.deleteReferral('r1');
      expect(result._id).toBe('r1');
    });

    it('should throw when not found', async () => {
      mockModels.EarlyReferral.findByIdAndDelete.mockResolvedValue(null);
      await expect(service.deleteReferral('bad')).rejects.toThrow('الإحالة غير موجودة');
    });
  });

  // ── getReferralsByChild ──
  describe('getReferralsByChild', () => {
    it('should return referrals sorted by referralDate desc', async () => {
      const chain = buildChain([{ _id: 'r1' }]);
      mockModels.EarlyReferral.find.mockReturnValue(chain);
      const result = await service.getReferralsByChild('c1');
      expect(mockModels.EarlyReferral.find).toHaveBeenCalledWith({ child: 'c1' });
      expect(chain.sort).toHaveBeenCalledWith({ referralDate: -1 });
      expect(result).toEqual([{ _id: 'r1' }]);
    });
  });

  // ── addReferralCommunication ──
  describe('addReferralCommunication', () => {
    it('should add communication and save', async () => {
      const mockReferral = {
        _id: 'r1',
        communications: [],
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.EarlyReferral.findById.mockResolvedValue(mockReferral);

      const commData = { type: 'PHONE', summary: 'Called hospital' };
      const result = await service.addReferralCommunication('r1', commData, 'u1');

      expect(commData.recordedBy).toBe('u1');
      expect(mockReferral.communications).toHaveLength(1);
      expect(mockReferral.save).toHaveBeenCalled();
      expect(result).toEqual(mockReferral);
    });

    it('should throw when referral not found', async () => {
      mockModels.EarlyReferral.findById.mockResolvedValue(null);
      await expect(service.addReferralCommunication('bad', {}, 'u1')).rejects.toThrow(
        'الإحالة غير موجودة'
      );
    });
  });

  // ── updateReferralStatus ──
  describe('updateReferralStatus', () => {
    it('should set acceptedDate when status is ACCEPTED', async () => {
      const mockReferral = {
        _id: 'r1',
        referralNumber: 'R001',
        status: 'SUBMITTED',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.EarlyReferral.findById.mockResolvedValue(mockReferral);

      await service.updateReferralStatus('r1', 'ACCEPTED', 'u1');
      expect(mockReferral.status).toBe('ACCEPTED');
      expect(mockReferral.acceptedDate).toBeInstanceOf(Date);
      expect(mockReferral.updatedBy).toBe('u1');
      expect(mockReferral.save).toHaveBeenCalled();
    });

    it('should set completedDate when status is COMPLETED', async () => {
      const mockReferral = {
        _id: 'r1',
        referralNumber: 'R001',
        status: 'ACCEPTED',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.EarlyReferral.findById.mockResolvedValue(mockReferral);

      await service.updateReferralStatus('r1', 'COMPLETED', 'u1');
      expect(mockReferral.status).toBe('COMPLETED');
      expect(mockReferral.completedDate).toBeInstanceOf(Date);
    });

    it('should NOT set acceptedDate or completedDate for other statuses', async () => {
      const mockReferral = {
        _id: 'r1',
        referralNumber: 'R001',
        status: 'SUBMITTED',
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockModels.EarlyReferral.findById.mockResolvedValue(mockReferral);

      await service.updateReferralStatus('r1', 'REJECTED', 'u1');
      expect(mockReferral.status).toBe('REJECTED');
      expect(mockReferral.acceptedDate).toBeUndefined();
      expect(mockReferral.completedDate).toBeUndefined();
    });

    it('should throw when referral not found', async () => {
      mockModels.EarlyReferral.findById.mockResolvedValue(null);
      await expect(service.updateReferralStatus('bad', 'ACCEPTED', 'u1')).rejects.toThrow(
        'الإحالة غير موجودة'
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 11  REFERRAL QUERY BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

describe('_buildReferralQuery', () => {
  it('should return empty object for no filters', () => {
    expect(service._buildReferralQuery({})).toEqual({});
  });

  it('should handle child, status, referralDirection, sourceType, urgency, organization', () => {
    const q = service._buildReferralQuery({
      child: 'c1',
      status: 'ACCEPTED',
      referralDirection: 'OUTGOING',
      sourceType: 'HOSPITAL',
      urgency: 'HIGH',
      organization: 'org1',
    });
    expect(q.child).toBe('c1');
    expect(q.status).toBe('ACCEPTED');
    expect(q.referralDirection).toBe('OUTGOING');
    expect(q.sourceType).toBe('HOSPITAL');
    expect(q.urgency).toBe('HIGH');
    expect(q.organization).toBe('org1');
  });

  it('should build $or regex for search', () => {
    const q = service._buildReferralQuery({ search: 'King' });
    expect(q.$or).toBeDefined();
    expect(q.$or).toHaveLength(5);
    expect(q.$or[0].referralNumber).toBeInstanceOf(RegExp);
  });

  it('should escape special regex chars in search', () => {
    const q = service._buildReferralQuery({ search: 'a(b)' });
    expect(q.$or[0].referralNumber.source).toContain('\\(');
  });

  it('should handle dateFrom and dateTo', () => {
    const q = service._buildReferralQuery({ dateFrom: '2024-01-01', dateTo: '2024-12-31' });
    expect(q.referralDate.$gte).toBeInstanceOf(Date);
    expect(q.referralDate.$lte).toBeInstanceOf(Date);
  });

  it('should handle dateFrom only', () => {
    const q = service._buildReferralQuery({ dateFrom: '2024-01-01' });
    expect(q.referralDate.$gte).toBeInstanceOf(Date);
    expect(q.referralDate.$lte).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 12  DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

describe('getDashboardStats', () => {
  beforeEach(() => {
    // countDocuments: 9 calls from Child(3) + Screening(2) + IFSP(2) + Referral(2) + Milestone(1) = 10
    // But the service does 17 parallel queries. We need to mock countDocuments, aggregate, find chains.
    mockModels.EarlyInterventionChild.countDocuments
      .mockResolvedValueOnce(100) // totalChildren
      .mockResolvedValueOnce(60) // activeChildren
      .mockResolvedValueOnce(10); // waitlistedChildren
    mockModels.DevelopmentalScreening.countDocuments
      .mockResolvedValueOnce(200) // totalScreenings
      .mockResolvedValueOnce(30); // atRiskScreenings
    mockModels.IFSP.countDocuments
      .mockResolvedValueOnce(50) // totalIFSPs
      .mockResolvedValueOnce(25); // activeIFSPs
    mockModels.EarlyReferral.countDocuments
      .mockResolvedValueOnce(80) // totalReferrals
      .mockResolvedValueOnce(15); // pendingReferrals
    mockModels.DevelopmentalMilestone.countDocuments.mockResolvedValueOnce(7); // delayedMilestones

    // aggregates
    mockModels.EarlyInterventionChild.aggregate
      .mockResolvedValueOnce([{ _id: 'ASD', count: 40 }]) // childrenByDisabilityType
      .mockResolvedValueOnce([{ _id: 'ACTIVE', count: 60 }]); // childrenByStatus
    mockModels.DevelopmentalScreening.aggregate.mockResolvedValueOnce([
      { _id: 'NORMAL', count: 150 },
    ]); // screeningsByResult
    mockModels.EarlyReferral.aggregate
      .mockResolvedValueOnce([{ _id: 'HOSPITAL', count: 50 }]) // referralsBySource
      .mockResolvedValueOnce([{ _id: 'HIGH', count: 20 }]); // referralsByUrgency

    // recent find chains
    const screenChain = buildChain([{ _id: 's_recent' }]);
    const refChain = buildChain([{ _id: 'r_recent' }]);
    mockModels.DevelopmentalScreening.find.mockReturnValue(screenChain);
    mockModels.EarlyReferral.find.mockReturnValue(refChain);
  });

  it('should return summary with all 10 fields', async () => {
    const result = await service.getDashboardStats();
    expect(result.summary).toEqual({
      totalChildren: 100,
      activeChildren: 60,
      waitlistedChildren: 10,
      totalScreenings: 200,
      atRiskScreenings: 30,
      totalIFSPs: 50,
      activeIFSPs: 25,
      totalReferrals: 80,
      pendingReferrals: 15,
      delayedMilestones: 7,
    });
  });

  it('should return charts with 5 aggregates', async () => {
    const result = await service.getDashboardStats();
    expect(result.charts.childrenByDisabilityType).toEqual([{ _id: 'ASD', count: 40 }]);
    expect(result.charts.childrenByStatus).toBeDefined();
    expect(result.charts.screeningsByResult).toBeDefined();
    expect(result.charts.referralsBySource).toBeDefined();
    expect(result.charts.referralsByUrgency).toBeDefined();
  });

  it('should return recent screenings and referrals', async () => {
    const result = await service.getDashboardStats();
    expect(result.recent.screenings).toEqual([{ _id: 's_recent' }]);
    expect(result.recent.referrals).toEqual([{ _id: 'r_recent' }]);
  });

  it('should pass organization filter when provided', async () => {
    await service.getDashboardStats('org1');
    expect(mockModels.EarlyInterventionChild.countDocuments).toHaveBeenCalledWith(
      expect.objectContaining({ organization: 'org1' })
    );
  });

  it('should pass empty filter when no organizationId', async () => {
    await service.getDashboardStats();
    expect(mockModels.EarlyInterventionChild.countDocuments).toHaveBeenCalledWith({});
  });

  it('should call 17 parallel queries', async () => {
    await service.getDashboardStats();
    // 3 Child counts + 2 Screening counts + 2 IFSP counts + 2 Referral counts + 1 Milestone count = 10 countDocuments
    // 2 Child aggregates + 1 Screening aggregate + 2 Referral aggregates = 5 aggregates
    // 1 Screening find + 1 Referral find = 2 finds
    // Total = 17
    const totalCountCalls =
      mockModels.EarlyInterventionChild.countDocuments.mock.calls.length +
      mockModels.DevelopmentalScreening.countDocuments.mock.calls.length +
      mockModels.IFSP.countDocuments.mock.calls.length +
      mockModels.EarlyReferral.countDocuments.mock.calls.length +
      mockModels.DevelopmentalMilestone.countDocuments.mock.calls.length;
    expect(totalCountCalls).toBe(10);

    const totalAggregateCalls =
      mockModels.EarlyInterventionChild.aggregate.mock.calls.length +
      mockModels.DevelopmentalScreening.aggregate.mock.calls.length +
      mockModels.EarlyReferral.aggregate.mock.calls.length;
    expect(totalAggregateCalls).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 13  BULK MILESTONES
// ═══════════════════════════════════════════════════════════════════════════════

describe('initializeMilestonesForChild', () => {
  it('should initialize 43 milestones for a child', async () => {
    mockModels.EarlyInterventionChild.findById.mockResolvedValue({
      _id: 'c1',
      childNumber: 'C001',
      organization: 'org1',
    });
    const result = await service.initializeMilestonesForChild('c1', 'u1');
    expect(mockModels.DevelopmentalMilestone.insertMany).toHaveBeenCalledTimes(1);
    const arg = mockModels.DevelopmentalMilestone.insertMany.mock.calls[0][0];
    expect(arg).toHaveLength(42);
    expect(result).toHaveLength(42);
  });

  it('should throw when child not found', async () => {
    mockModels.EarlyInterventionChild.findById.mockResolvedValue(null);
    await expect(service.initializeMilestonesForChild('bad', 'u1')).rejects.toThrow(
      'ملف الطفل غير موجود'
    );
  });

  it('should set child, createdBy, organization, status on each milestone', async () => {
    mockModels.EarlyInterventionChild.findById.mockResolvedValue({
      _id: 'c1',
      childNumber: 'C001',
      organization: 'org1',
    });
    await service.initializeMilestonesForChild('c1', 'u1');
    const milestones = mockModels.DevelopmentalMilestone.insertMany.mock.calls[0][0];
    milestones.forEach(m => {
      expect(m.child).toBe('c1');
      expect(m.createdBy).toBe('u1');
      expect(m.organization).toBe('org1');
      expect(m.status).toBe('NOT_YET');
    });
  });

  it('should distribute milestones across correct domains', async () => {
    mockModels.EarlyInterventionChild.findById.mockResolvedValue({
      _id: 'c1',
      childNumber: 'C001',
      organization: 'org1',
    });
    await service.initializeMilestonesForChild('c1', 'u1');
    const milestones = mockModels.DevelopmentalMilestone.insertMany.mock.calls[0][0];

    const counts = {};
    milestones.forEach(m => {
      counts[m.domain] = (counts[m.domain] || 0) + 1;
    });

    expect(counts.GROSS_MOTOR).toBe(9);
    expect(counts.FINE_MOTOR).toBe(7);
    expect(counts.COMMUNICATION).toBe(7);
    expect(counts.COGNITIVE).toBe(6);
    expect(counts.SOCIAL_EMOTIONAL).toBe(7);
    expect(counts.ADAPTIVE).toBe(6);
    // SENSORY is not in the standard milestones list
    expect(counts.SENSORY).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 14  STANDARD MILESTONES
// ═══════════════════════════════════════════════════════════════════════════════

describe('_getStandardMilestones', () => {
  it('should return exactly 42 milestones', () => {
    const milestones = service._getStandardMilestones();
    expect(milestones).toHaveLength(42);
  });

  it('should have 6 domains', () => {
    const milestones = service._getStandardMilestones();
    const domains = [...new Set(milestones.map(m => m.domain))];
    expect(domains).toEqual(
      expect.arrayContaining([
        'GROSS_MOTOR',
        'FINE_MOTOR',
        'COMMUNICATION',
        'COGNITIVE',
        'SOCIAL_EMOTIONAL',
        'ADAPTIVE',
      ])
    );
    expect(domains).toHaveLength(6);
  });

  it('should have required fields on each milestone', () => {
    const milestones = service._getStandardMilestones();
    milestones.forEach(m => {
      expect(m.domain).toBeDefined();
      expect(m.expectedAgeMonths).toBeDefined();
      expect(typeof m.expectedAgeMonths).toBe('number');
      expect(m.milestone).toBeDefined();
      expect(m.milestoneAr).toBeDefined();
    });
  });

  it('should have correct per-domain counts', () => {
    const milestones = service._getStandardMilestones();
    const counts = {};
    milestones.forEach(m => {
      counts[m.domain] = (counts[m.domain] || 0) + 1;
    });
    expect(counts.GROSS_MOTOR).toBe(9);
    expect(counts.FINE_MOTOR).toBe(7);
    expect(counts.COMMUNICATION).toBe(7);
    expect(counts.COGNITIVE).toBe(6);
    expect(counts.SOCIAL_EMOTIONAL).toBe(7);
    expect(counts.ADAPTIVE).toBe(6);
  });
});
