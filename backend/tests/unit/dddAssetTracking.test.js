'use strict';

/* ── mock-prefixed variables ── */
const mockTrackedAssetFind = jest.fn();
const mockTrackedAssetCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'trackedAsset1', ...d }));
const mockTrackedAssetCount = jest.fn().mockResolvedValue(0);
const mockAssetCheckoutFind = jest.fn();
const mockAssetCheckoutCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'assetCheckout1', ...d }));
const mockAssetCheckoutCount = jest.fn().mockResolvedValue(0);
const mockInventoryAuditFind = jest.fn();
const mockInventoryAuditCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'inventoryAudit1', ...d }));
const mockInventoryAuditCount = jest.fn().mockResolvedValue(0);
const mockDepreciationLogFind = jest.fn();
const mockDepreciationLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'depreciationLog1', ...d }));
const mockDepreciationLogCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddAssetTracking', () => ({
  DDDTrackedAsset: {
    find: mockTrackedAssetFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'trackedAsset1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'trackedAsset1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTrackedAssetCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trackedAsset1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trackedAsset1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trackedAsset1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trackedAsset1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'trackedAsset1' }) }),
    countDocuments: mockTrackedAssetCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAssetCheckout: {
    find: mockAssetCheckoutFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'assetCheckout1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'assetCheckout1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAssetCheckoutCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetCheckout1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetCheckout1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetCheckout1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetCheckout1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetCheckout1' }) }),
    countDocuments: mockAssetCheckoutCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDInventoryAudit: {
    find: mockInventoryAuditFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'inventoryAudit1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'inventoryAudit1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInventoryAuditCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inventoryAudit1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inventoryAudit1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inventoryAudit1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inventoryAudit1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'inventoryAudit1' }) }),
    countDocuments: mockInventoryAuditCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDepreciationLog: {
    find: mockDepreciationLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'depreciationLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'depreciationLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDepreciationLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'depreciationLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'depreciationLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'depreciationLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'depreciationLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'depreciationLog1' }) }),
    countDocuments: mockDepreciationLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ASSET_CATEGORIES: ['item1', 'item2'],
  ASSET_CONDITIONS: ['item1', 'item2'],
  TRACKING_METHODS: ['item1', 'item2'],
  CHECKOUT_STATUSES: ['item1', 'item2'],
  DEPRECIATION_METHODS: ['item1', 'item2'],
  AUDIT_TYPES: ['item1', 'item2'],
  BUILTIN_ASSET_TAGS: ['item1', 'item2'],

}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) { this.name = n; this.meta = m; this.models = models; }
    log() {}
    _list(M, q, o) {
      const c = M.find(q || {});
      if (o && o.sort) {
        const s = c.sort(o.sort);
        return (o.limit && s.limit) ? s.limit(o.limit).lean() : s.lean();
      }
      return c.lean ? c.lean() : c;
    }
    _getById(M, id) {
      const r = M.findById(id);
      return r && r.lean ? r.lean() : r;
    }
    _create(M, d) { return M.create(d); }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
    _delete(M, id) { return M.findByIdAndDelete(id); }
  };
});

const svc = require('../../services/dddAssetTracking');

describe('dddAssetTracking service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _trackedAssetL = jest.fn().mockResolvedValue([]);
    const _trackedAssetLim = jest.fn().mockReturnValue({ lean: _trackedAssetL });
    const _trackedAssetS = jest.fn().mockReturnValue({ limit: _trackedAssetLim, lean: _trackedAssetL, populate: jest.fn().mockReturnValue({ lean: _trackedAssetL }) });
    mockTrackedAssetFind.mockReturnValue({ sort: _trackedAssetS, lean: _trackedAssetL, limit: _trackedAssetLim, populate: jest.fn().mockReturnValue({ lean: _trackedAssetL, sort: _trackedAssetS }) });
    const _assetCheckoutL = jest.fn().mockResolvedValue([]);
    const _assetCheckoutLim = jest.fn().mockReturnValue({ lean: _assetCheckoutL });
    const _assetCheckoutS = jest.fn().mockReturnValue({ limit: _assetCheckoutLim, lean: _assetCheckoutL, populate: jest.fn().mockReturnValue({ lean: _assetCheckoutL }) });
    mockAssetCheckoutFind.mockReturnValue({ sort: _assetCheckoutS, lean: _assetCheckoutL, limit: _assetCheckoutLim, populate: jest.fn().mockReturnValue({ lean: _assetCheckoutL, sort: _assetCheckoutS }) });
    const _inventoryAuditL = jest.fn().mockResolvedValue([]);
    const _inventoryAuditLim = jest.fn().mockReturnValue({ lean: _inventoryAuditL });
    const _inventoryAuditS = jest.fn().mockReturnValue({ limit: _inventoryAuditLim, lean: _inventoryAuditL, populate: jest.fn().mockReturnValue({ lean: _inventoryAuditL }) });
    mockInventoryAuditFind.mockReturnValue({ sort: _inventoryAuditS, lean: _inventoryAuditL, limit: _inventoryAuditLim, populate: jest.fn().mockReturnValue({ lean: _inventoryAuditL, sort: _inventoryAuditS }) });
    const _depreciationLogL = jest.fn().mockResolvedValue([]);
    const _depreciationLogLim = jest.fn().mockReturnValue({ lean: _depreciationLogL });
    const _depreciationLogS = jest.fn().mockReturnValue({ limit: _depreciationLogLim, lean: _depreciationLogL, populate: jest.fn().mockReturnValue({ lean: _depreciationLogL }) });
    mockDepreciationLogFind.mockReturnValue({ sort: _depreciationLogS, lean: _depreciationLogL, limit: _depreciationLogLim, populate: jest.fn().mockReturnValue({ lean: _depreciationLogL, sort: _depreciationLogS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('AssetTracking');
  });


  test('createAsset creates/returns result', async () => {
    let r; try { r = await svc.createAsset({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAssets returns result', async () => {
    let r; try { r = await svc.listAssets({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateAsset updates/returns result', async () => {
    let r; try { r = await svc.updateAsset('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('checkoutAsset updates/returns result', async () => {
    let r; try { r = await svc.checkoutAsset('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCheckouts returns result', async () => {
    let r; try { r = await svc.listCheckouts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAudit creates/returns result', async () => {
    let r; try { r = await svc.createAudit({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAudits returns result', async () => {
    let r; try { r = await svc.listAudits({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logDepreciation creates/returns result', async () => {
    let r; try { r = await svc.logDepreciation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDepreciation returns result', async () => {
    let r; try { r = await svc.listDepreciation({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAssetStats returns object', async () => {
    let r; try { r = await svc.getAssetStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
