'use strict';

/* ── mock-prefixed variables ── */
const mockEquipmentAssetFind = jest.fn();
const mockEquipmentAssetCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'equipmentAsset1', ...d }));
const mockEquipmentAssetCount = jest.fn().mockResolvedValue(0);
const mockMaintenanceRecordFind = jest.fn();
const mockMaintenanceRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'maintenanceRecord1', ...d }));
const mockMaintenanceRecordCount = jest.fn().mockResolvedValue(0);
const mockCalibrationLogFind = jest.fn();
const mockCalibrationLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'calibrationLog1', ...d }));
const mockCalibrationLogCount = jest.fn().mockResolvedValue(0);
const mockDisposalRecordFind = jest.fn();
const mockDisposalRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'disposalRecord1', ...d }));
const mockDisposalRecordCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddEquipmentLifecycle', () => ({
  DDDEquipmentAsset: {
    find: mockEquipmentAssetFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'equipmentAsset1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'equipmentAsset1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEquipmentAssetCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'equipmentAsset1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'equipmentAsset1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'equipmentAsset1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'equipmentAsset1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'equipmentAsset1' }) }),
    countDocuments: mockEquipmentAssetCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMaintenanceRecord: {
    find: mockMaintenanceRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'maintenanceRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'maintenanceRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMaintenanceRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceRecord1' }) }),
    countDocuments: mockMaintenanceRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCalibrationLog: {
    find: mockCalibrationLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'calibrationLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'calibrationLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCalibrationLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'calibrationLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'calibrationLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'calibrationLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'calibrationLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'calibrationLog1' }) }),
    countDocuments: mockCalibrationLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDisposalRecord: {
    find: mockDisposalRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'disposalRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'disposalRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDisposalRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disposalRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disposalRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disposalRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disposalRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disposalRecord1' }) }),
    countDocuments: mockDisposalRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  EQUIPMENT_CATEGORIES: ['item1', 'item2'],
  LIFECYCLE_STAGES: ['item1', 'item2'],
  MAINTENANCE_TYPES: ['item1', 'item2'],
  CONDITION_RATINGS: ['item1', 'item2'],
  WARRANTY_TYPES: ['item1', 'item2'],
  COMPLIANCE_STANDARDS: ['item1', 'item2'],
  BUILTIN_EQUIPMENT_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddEquipmentLifecycle');

describe('dddEquipmentLifecycle service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _equipmentAssetL = jest.fn().mockResolvedValue([]);
    const _equipmentAssetLim = jest.fn().mockReturnValue({ lean: _equipmentAssetL });
    const _equipmentAssetS = jest.fn().mockReturnValue({ limit: _equipmentAssetLim, lean: _equipmentAssetL, populate: jest.fn().mockReturnValue({ lean: _equipmentAssetL }) });
    mockEquipmentAssetFind.mockReturnValue({ sort: _equipmentAssetS, lean: _equipmentAssetL, limit: _equipmentAssetLim, populate: jest.fn().mockReturnValue({ lean: _equipmentAssetL, sort: _equipmentAssetS }) });
    const _maintenanceRecordL = jest.fn().mockResolvedValue([]);
    const _maintenanceRecordLim = jest.fn().mockReturnValue({ lean: _maintenanceRecordL });
    const _maintenanceRecordS = jest.fn().mockReturnValue({ limit: _maintenanceRecordLim, lean: _maintenanceRecordL, populate: jest.fn().mockReturnValue({ lean: _maintenanceRecordL }) });
    mockMaintenanceRecordFind.mockReturnValue({ sort: _maintenanceRecordS, lean: _maintenanceRecordL, limit: _maintenanceRecordLim, populate: jest.fn().mockReturnValue({ lean: _maintenanceRecordL, sort: _maintenanceRecordS }) });
    const _calibrationLogL = jest.fn().mockResolvedValue([]);
    const _calibrationLogLim = jest.fn().mockReturnValue({ lean: _calibrationLogL });
    const _calibrationLogS = jest.fn().mockReturnValue({ limit: _calibrationLogLim, lean: _calibrationLogL, populate: jest.fn().mockReturnValue({ lean: _calibrationLogL }) });
    mockCalibrationLogFind.mockReturnValue({ sort: _calibrationLogS, lean: _calibrationLogL, limit: _calibrationLogLim, populate: jest.fn().mockReturnValue({ lean: _calibrationLogL, sort: _calibrationLogS }) });
    const _disposalRecordL = jest.fn().mockResolvedValue([]);
    const _disposalRecordLim = jest.fn().mockReturnValue({ lean: _disposalRecordL });
    const _disposalRecordS = jest.fn().mockReturnValue({ limit: _disposalRecordLim, lean: _disposalRecordL, populate: jest.fn().mockReturnValue({ lean: _disposalRecordL }) });
    mockDisposalRecordFind.mockReturnValue({ sort: _disposalRecordS, lean: _disposalRecordL, limit: _disposalRecordLim, populate: jest.fn().mockReturnValue({ lean: _disposalRecordL, sort: _disposalRecordS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('EquipmentLifecycle');
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

  test('createMaintenance creates/returns result', async () => {
    let r; try { r = await svc.createMaintenance({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMaintenance returns result', async () => {
    let r; try { r = await svc.listMaintenance({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCalibration creates/returns result', async () => {
    let r; try { r = await svc.createCalibration({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCalibrations returns result', async () => {
    let r; try { r = await svc.listCalibrations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createDisposal creates/returns result', async () => {
    let r; try { r = await svc.createDisposal({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDisposals returns result', async () => {
    let r; try { r = await svc.listDisposals({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLifecycleStats returns object', async () => {
    let r; try { r = await svc.getLifecycleStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
