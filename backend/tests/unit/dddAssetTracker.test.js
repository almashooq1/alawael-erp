'use strict';

/* ── mock-prefixed variables ── */
const mockAssetFind = jest.fn();
const mockAssetCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'asset1', ...d }));
const mockAssetCount = jest.fn().mockResolvedValue(0);
const mockAssetUsageLogFind = jest.fn();
const mockAssetUsageLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'assetUsageLog1', ...d }));
const mockAssetUsageLogCount = jest.fn().mockResolvedValue(0);
const mockAssetMaintenanceRecordFind = jest.fn();
const mockAssetMaintenanceRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'assetMaintenanceRecord1', ...d }));
const mockAssetMaintenanceRecordCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddAssetTracker', () => ({
  DDDAsset: {
    find: mockAssetFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'asset1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'asset1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAssetCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'asset1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'asset1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'asset1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'asset1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'asset1' }) }),
    countDocuments: mockAssetCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAssetUsageLog: {
    find: mockAssetUsageLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'assetUsageLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'assetUsageLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAssetUsageLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetUsageLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetUsageLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetUsageLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetUsageLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetUsageLog1' }) }),
    countDocuments: mockAssetUsageLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAssetMaintenanceRecord: {
    find: mockAssetMaintenanceRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'assetMaintenanceRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'assetMaintenanceRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAssetMaintenanceRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetMaintenanceRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetMaintenanceRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetMaintenanceRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetMaintenanceRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'assetMaintenanceRecord1' }) }),
    countDocuments: mockAssetMaintenanceRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ASSET_CATEGORIES: ['item1', 'item2'],
  ASSET_STATUSES: ['item1', 'item2'],
  MAINTENANCE_TYPES: ['item1', 'item2'],
  CONDITION_GRADES: ['item1', 'item2'],
  BUILTIN_ASSET_TYPES: ['item1', 'item2'],

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

const svc = require('../../services/dddAssetTracker');

describe('dddAssetTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _assetL = jest.fn().mockResolvedValue([]);
    const _assetLim = jest.fn().mockReturnValue({ lean: _assetL });
    const _assetS = jest.fn().mockReturnValue({ limit: _assetLim, lean: _assetL, populate: jest.fn().mockReturnValue({ lean: _assetL }) });
    mockAssetFind.mockReturnValue({ sort: _assetS, lean: _assetL, limit: _assetLim, populate: jest.fn().mockReturnValue({ lean: _assetL, sort: _assetS }) });
    const _assetUsageLogL = jest.fn().mockResolvedValue([]);
    const _assetUsageLogLim = jest.fn().mockReturnValue({ lean: _assetUsageLogL });
    const _assetUsageLogS = jest.fn().mockReturnValue({ limit: _assetUsageLogLim, lean: _assetUsageLogL, populate: jest.fn().mockReturnValue({ lean: _assetUsageLogL }) });
    mockAssetUsageLogFind.mockReturnValue({ sort: _assetUsageLogS, lean: _assetUsageLogL, limit: _assetUsageLogLim, populate: jest.fn().mockReturnValue({ lean: _assetUsageLogL, sort: _assetUsageLogS }) });
    const _assetMaintenanceRecordL = jest.fn().mockResolvedValue([]);
    const _assetMaintenanceRecordLim = jest.fn().mockReturnValue({ lean: _assetMaintenanceRecordL });
    const _assetMaintenanceRecordS = jest.fn().mockReturnValue({ limit: _assetMaintenanceRecordLim, lean: _assetMaintenanceRecordL, populate: jest.fn().mockReturnValue({ lean: _assetMaintenanceRecordL }) });
    mockAssetMaintenanceRecordFind.mockReturnValue({ sort: _assetMaintenanceRecordS, lean: _assetMaintenanceRecordL, limit: _assetMaintenanceRecordLim, populate: jest.fn().mockReturnValue({ lean: _assetMaintenanceRecordL, sort: _assetMaintenanceRecordS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc).not.toBeNull();
  });


  test('listAssets is callable', () => {
    expect(typeof svc.listAssets).toBe('function');
  });

  test('getAsset is callable', () => {
    expect(typeof svc.getAsset).toBe('function');
  });

  test('createAsset is callable', () => {
    expect(typeof svc.createAsset).toBe('function');
  });

  test('updateAsset is callable', () => {
    expect(typeof svc.updateAsset).toBe('function');
  });

  test('retireAsset is callable', () => {
    expect(typeof svc.retireAsset).toBe('function');
  });

  test('checkOut is callable', () => {
    expect(typeof svc.checkOut).toBe('function');
  });

  test('checkIn is callable', () => {
    expect(typeof svc.checkIn).toBe('function');
  });

  test('scheduleMaintenance is callable', () => {
    expect(typeof svc.scheduleMaintenance).toBe('function');
  });

  test('completeMaintenance is callable', () => {
    expect(typeof svc.completeMaintenance).toBe('function');
  });

  test('listMaintenanceRecords is callable', () => {
    expect(typeof svc.listMaintenanceRecords).toBe('function');
  });

  test('getOverdueMaintenance is callable', () => {
    expect(typeof svc.getOverdueMaintenance).toBe('function');
  });

  test('getUsageHistory is callable', () => {
    expect(typeof svc.getUsageHistory).toBe('function');
  });

  test('getUtilizationReport is callable', () => {
    expect(typeof svc.getUtilizationReport).toBe('function');
  });

  test('getStats is callable', () => {
    expect(typeof svc.getStats).toBe('function');
  });
});
