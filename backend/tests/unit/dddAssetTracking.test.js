'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDTrackedAsset = makeModel();
const mockDDDAssetCheckout = makeModel();
const mockDDDInventoryAudit = makeModel();
const mockDDDDepreciationLog = makeModel();

jest.mock('../../models/DddAssetTracking', () => ({
  DDDTrackedAsset: mockDDDTrackedAsset,
  DDDAssetCheckout: mockDDDAssetCheckout,
  DDDInventoryAudit: mockDDDInventoryAudit,
  DDDDepreciationLog: mockDDDDepreciationLog,
  ASSET_CATEGORIES: ['equipment', 'furniture', 'vehicle'],
  ASSET_CONDITIONS: ['new', 'good', 'fair', 'poor'],
  TRACKING_METHODS: ['barcode', 'rfid', 'gps'],
  CHECKOUT_STATUSES: ['checked_out', 'returned'],
  DEPRECIATION_METHODS: ['straight_line', 'declining_balance'],
  AUDIT_TYPES: ['full', 'spot_check'],
  BUILTIN_ASSET_TAGS: [{ code: 'DEFAULT' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const service = require('../../services/dddAssetTracking');

beforeEach(() => {
  [
    mockDDDTrackedAsset,
    mockDDDAssetCheckout,
    mockDDDInventoryAudit,
    mockDDDDepreciationLog,
  ].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddAssetTracking', () => {
  /* ── Assets ── */
  describe('createAsset', () => {
    it('creates via _create', async () => {
      mockDDDTrackedAsset.create.mockResolvedValue({ _id: 'a1' });
      expect(await service.createAsset({ name: 'Wheelchair' })).toHaveProperty('_id');
    });
  });

  describe('listAssets', () => {
    it('returns list sorted by createdAt desc', async () => {
      mockDDDTrackedAsset.find.mockReturnThis();
      mockDDDTrackedAsset.sort.mockReturnThis();
      mockDDDTrackedAsset.lean.mockResolvedValue([{ _id: 'a1' }]);
      expect(await service.listAssets({})).toHaveLength(1);
      expect(mockDDDTrackedAsset.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('updateAsset', () => {
    it('updates via _update', async () => {
      mockDDDTrackedAsset.findByIdAndUpdate.mockReturnThis();
      mockDDDTrackedAsset.lean.mockResolvedValue({ _id: 'a1', condition: 'good' });
      expect((await service.updateAsset('a1', { condition: 'good' })).condition).toBe('good');
    });
  });

  /* ── Checkouts ── */
  describe('checkoutAsset', () => {
    it('creates checkout via _create', async () => {
      mockDDDAssetCheckout.create.mockResolvedValue({ _id: 'co1' });
      expect(await service.checkoutAsset({ assetId: 'a1' })).toHaveProperty('_id');
    });
  });

  describe('listCheckouts', () => {
    it('returns checkouts sorted by checkedOutAt desc', async () => {
      mockDDDAssetCheckout.find.mockReturnThis();
      mockDDDAssetCheckout.sort.mockReturnThis();
      mockDDDAssetCheckout.lean.mockResolvedValue([{ _id: 'co1' }]);
      expect(await service.listCheckouts({})).toHaveLength(1);
      expect(mockDDDAssetCheckout.sort).toHaveBeenCalledWith({ checkedOutAt: -1 });
    });
  });

  /* ── Audits ── */
  describe('createAudit', () => {
    it('creates audit via _create', async () => {
      mockDDDInventoryAudit.create.mockResolvedValue({ _id: 'au1' });
      expect(await service.createAudit({ type: 'full' })).toHaveProperty('_id');
    });
  });

  describe('listAudits', () => {
    it('returns audits sorted by startDate desc', async () => {
      mockDDDInventoryAudit.find.mockReturnThis();
      mockDDDInventoryAudit.sort.mockReturnThis();
      mockDDDInventoryAudit.lean.mockResolvedValue([]);
      expect(await service.listAudits({})).toEqual([]);
      expect(mockDDDInventoryAudit.sort).toHaveBeenCalledWith({ startDate: -1 });
    });
  });

  /* ── Depreciation ── */
  describe('logDepreciation', () => {
    it('creates depreciation log via _create', async () => {
      mockDDDDepreciationLog.create.mockResolvedValue({ _id: 'd1' });
      expect(await service.logDepreciation({ assetId: 'a1' })).toHaveProperty('_id');
    });
  });

  describe('listDepreciation', () => {
    it('returns logs sorted by period desc', async () => {
      mockDDDDepreciationLog.find.mockReturnThis();
      mockDDDDepreciationLog.sort.mockReturnThis();
      mockDDDDepreciationLog.lean.mockResolvedValue([{ _id: 'd1' }]);
      expect(await service.listDepreciation({})).toHaveLength(1);
      expect(mockDDDDepreciationLog.sort).toHaveBeenCalledWith({ period: -1 });
    });
  });

  /* ── Stats ── */
  describe('getAssetStats', () => {
    it('returns totalAssets, activeAssets, currentlyCheckedOut, completedAudits', async () => {
      mockDDDTrackedAsset.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(85); // active
      mockDDDAssetCheckout.countDocuments.mockResolvedValue(12);
      mockDDDInventoryAudit.countDocuments.mockResolvedValue(8);
      const r = await service.getAssetStats();
      expect(r).toEqual({
        totalAssets: 100,
        activeAssets: 85,
        currentlyCheckedOut: 12,
        completedAudits: 8,
      });
    });
  });
});
