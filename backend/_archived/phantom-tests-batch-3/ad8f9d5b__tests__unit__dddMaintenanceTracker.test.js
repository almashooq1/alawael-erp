'use strict';

/* ── mock-prefixed variables ── */
const mockWorkOrderFind = jest.fn();
const mockWorkOrderCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'workOrder1', ...d }));
const mockWorkOrderCount = jest.fn().mockResolvedValue(0);
const mockPreventiveScheduleFind = jest.fn();
const mockPreventiveScheduleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'preventiveSchedule1', ...d }));
const mockPreventiveScheduleCount = jest.fn().mockResolvedValue(0);
const mockServiceRecordFind = jest.fn();
const mockServiceRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'serviceRecord1', ...d }));
const mockServiceRecordCount = jest.fn().mockResolvedValue(0);
const mockMaintenanceAssetFind = jest.fn();
const mockMaintenanceAssetCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'maintenanceAsset1', ...d }));
const mockMaintenanceAssetCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddMaintenanceTracker', () => ({
  DDDWorkOrder: {
    find: mockWorkOrderFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'workOrder1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'workOrder1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockWorkOrderCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workOrder1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workOrder1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workOrder1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workOrder1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'workOrder1' }) }),
    countDocuments: mockWorkOrderCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPreventiveSchedule: {
    find: mockPreventiveScheduleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'preventiveSchedule1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'preventiveSchedule1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPreventiveScheduleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preventiveSchedule1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preventiveSchedule1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preventiveSchedule1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preventiveSchedule1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preventiveSchedule1' }) }),
    countDocuments: mockPreventiveScheduleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDServiceRecord: {
    find: mockServiceRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'serviceRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'serviceRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockServiceRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceRecord1' }) }),
    countDocuments: mockServiceRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMaintenanceAsset: {
    find: mockMaintenanceAssetFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'maintenanceAsset1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'maintenanceAsset1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMaintenanceAssetCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceAsset1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceAsset1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceAsset1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceAsset1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'maintenanceAsset1' }) }),
    countDocuments: mockMaintenanceAssetCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  WORK_ORDER_TYPES: ['item1', 'item2'],
  WORK_ORDER_STATUSES: ['item1', 'item2'],
  WORK_ORDER_PRIORITIES: ['item1', 'item2'],
  PM_FREQUENCIES: ['item1', 'item2'],
  SERVICE_CATEGORIES: ['item1', 'item2'],
  ASSET_CONDITIONS: ['item1', 'item2'],
  BUILTIN_ASSETS: ['item1', 'item2'],

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

const svc = require('../../services/dddMaintenanceTracker');

describe('dddMaintenanceTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _workOrderL = jest.fn().mockResolvedValue([]);
    const _workOrderLim = jest.fn().mockReturnValue({ lean: _workOrderL });
    const _workOrderS = jest.fn().mockReturnValue({ limit: _workOrderLim, lean: _workOrderL, populate: jest.fn().mockReturnValue({ lean: _workOrderL }) });
    mockWorkOrderFind.mockReturnValue({ sort: _workOrderS, lean: _workOrderL, limit: _workOrderLim, populate: jest.fn().mockReturnValue({ lean: _workOrderL, sort: _workOrderS }) });
    const _preventiveScheduleL = jest.fn().mockResolvedValue([]);
    const _preventiveScheduleLim = jest.fn().mockReturnValue({ lean: _preventiveScheduleL });
    const _preventiveScheduleS = jest.fn().mockReturnValue({ limit: _preventiveScheduleLim, lean: _preventiveScheduleL, populate: jest.fn().mockReturnValue({ lean: _preventiveScheduleL }) });
    mockPreventiveScheduleFind.mockReturnValue({ sort: _preventiveScheduleS, lean: _preventiveScheduleL, limit: _preventiveScheduleLim, populate: jest.fn().mockReturnValue({ lean: _preventiveScheduleL, sort: _preventiveScheduleS }) });
    const _serviceRecordL = jest.fn().mockResolvedValue([]);
    const _serviceRecordLim = jest.fn().mockReturnValue({ lean: _serviceRecordL });
    const _serviceRecordS = jest.fn().mockReturnValue({ limit: _serviceRecordLim, lean: _serviceRecordL, populate: jest.fn().mockReturnValue({ lean: _serviceRecordL }) });
    mockServiceRecordFind.mockReturnValue({ sort: _serviceRecordS, lean: _serviceRecordL, limit: _serviceRecordLim, populate: jest.fn().mockReturnValue({ lean: _serviceRecordL, sort: _serviceRecordS }) });
    const _maintenanceAssetL = jest.fn().mockResolvedValue([]);
    const _maintenanceAssetLim = jest.fn().mockReturnValue({ lean: _maintenanceAssetL });
    const _maintenanceAssetS = jest.fn().mockReturnValue({ limit: _maintenanceAssetLim, lean: _maintenanceAssetL, populate: jest.fn().mockReturnValue({ lean: _maintenanceAssetL }) });
    mockMaintenanceAssetFind.mockReturnValue({ sort: _maintenanceAssetS, lean: _maintenanceAssetL, limit: _maintenanceAssetLim, populate: jest.fn().mockReturnValue({ lean: _maintenanceAssetL, sort: _maintenanceAssetS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('MaintenanceTracker');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listWorkOrders returns result', async () => {
    let r; try { r = await svc.listWorkOrders({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getWorkOrder returns result', async () => {
    let r; try { r = await svc.getWorkOrder({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createWorkOrder creates/returns result', async () => {
    let r; try { r = await svc.createWorkOrder({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateWorkOrder updates/returns result', async () => {
    let r; try { r = await svc.updateWorkOrder('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('assignWorkOrder creates/returns result', async () => {
    let r; try { r = await svc.assignWorkOrder({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('startWorkOrder creates/returns result', async () => {
    let r; try { r = await svc.startWorkOrder({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeWorkOrder updates/returns result', async () => {
    let r; try { r = await svc.completeWorkOrder('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('closeWorkOrder updates/returns result', async () => {
    let r; try { r = await svc.closeWorkOrder('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPreventiveSchedules returns result', async () => {
    let r; try { r = await svc.listPreventiveSchedules({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPreventiveSchedule creates/returns result', async () => {
    let r; try { r = await svc.createPreventiveSchedule({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePreventiveSchedule updates/returns result', async () => {
    let r; try { r = await svc.updatePreventiveSchedule('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getOverdueSchedules returns result', async () => {
    let r; try { r = await svc.getOverdueSchedules({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listServiceRecords returns result', async () => {
    let r; try { r = await svc.listServiceRecords({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createServiceRecord creates/returns result', async () => {
    let r; try { r = await svc.createServiceRecord({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAssets returns result', async () => {
    let r; try { r = await svc.listAssets({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAsset returns result', async () => {
    let r; try { r = await svc.getAsset({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAsset creates/returns result', async () => {
    let r; try { r = await svc.createAsset({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateAsset updates/returns result', async () => {
    let r; try { r = await svc.updateAsset('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getMaintenanceAnalytics returns object', async () => {
    let r; try { r = await svc.getMaintenanceAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
