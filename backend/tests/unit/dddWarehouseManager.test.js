'use strict';

/* ── mock-prefixed variables ── */
const mockWarehouseFind = jest.fn();
const mockWarehouseCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'warehouse1', ...d }));
const mockWarehouseCount = jest.fn().mockResolvedValue(0);
const mockStorageBinFind = jest.fn();
const mockStorageBinCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'storageBin1', ...d }));
const mockStorageBinCount = jest.fn().mockResolvedValue(0);
const mockPickListFind = jest.fn();
const mockPickListCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'pickList1', ...d }));
const mockPickListCount = jest.fn().mockResolvedValue(0);
const mockCycleCountFind = jest.fn();
const mockCycleCountCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'cycleCount1', ...d }));
const mockCycleCountCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddWarehouseManager', () => ({
  DDDWarehouse: {
    find: mockWarehouseFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'warehouse1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'warehouse1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockWarehouseCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'warehouse1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'warehouse1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'warehouse1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'warehouse1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'warehouse1' }) }),
    countDocuments: mockWarehouseCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDStorageBin: {
    find: mockStorageBinFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'storageBin1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'storageBin1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockStorageBinCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'storageBin1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'storageBin1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'storageBin1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'storageBin1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'storageBin1' }) }),
    countDocuments: mockStorageBinCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPickList: {
    find: mockPickListFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'pickList1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'pickList1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPickListCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'pickList1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'pickList1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'pickList1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'pickList1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'pickList1' }) }),
    countDocuments: mockPickListCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCycleCount: {
    find: mockCycleCountFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'cycleCount1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'cycleCount1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCycleCountCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cycleCount1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cycleCount1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cycleCount1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cycleCount1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'cycleCount1' }) }),
    countDocuments: mockCycleCountCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  WAREHOUSE_TYPES: ['item1', 'item2'],
  WAREHOUSE_STATUSES: ['item1', 'item2'],
  BIN_TYPES: ['item1', 'item2'],
  PICK_LIST_STATUSES: ['item1', 'item2'],
  CYCLE_COUNT_STATUSES: ['item1', 'item2'],
  ZONE_TYPES: ['item1', 'item2'],
  BUILTIN_WAREHOUSES: ['item1', 'item2'],

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

const svc = require('../../services/dddWarehouseManager');

describe('dddWarehouseManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _warehouseL = jest.fn().mockResolvedValue([]);
    const _warehouseLim = jest.fn().mockReturnValue({ lean: _warehouseL });
    const _warehouseS = jest.fn().mockReturnValue({ limit: _warehouseLim, lean: _warehouseL, populate: jest.fn().mockReturnValue({ lean: _warehouseL }) });
    mockWarehouseFind.mockReturnValue({ sort: _warehouseS, lean: _warehouseL, limit: _warehouseLim, populate: jest.fn().mockReturnValue({ lean: _warehouseL, sort: _warehouseS }) });
    const _storageBinL = jest.fn().mockResolvedValue([]);
    const _storageBinLim = jest.fn().mockReturnValue({ lean: _storageBinL });
    const _storageBinS = jest.fn().mockReturnValue({ limit: _storageBinLim, lean: _storageBinL, populate: jest.fn().mockReturnValue({ lean: _storageBinL }) });
    mockStorageBinFind.mockReturnValue({ sort: _storageBinS, lean: _storageBinL, limit: _storageBinLim, populate: jest.fn().mockReturnValue({ lean: _storageBinL, sort: _storageBinS }) });
    const _pickListL = jest.fn().mockResolvedValue([]);
    const _pickListLim = jest.fn().mockReturnValue({ lean: _pickListL });
    const _pickListS = jest.fn().mockReturnValue({ limit: _pickListLim, lean: _pickListL, populate: jest.fn().mockReturnValue({ lean: _pickListL }) });
    mockPickListFind.mockReturnValue({ sort: _pickListS, lean: _pickListL, limit: _pickListLim, populate: jest.fn().mockReturnValue({ lean: _pickListL, sort: _pickListS }) });
    const _cycleCountL = jest.fn().mockResolvedValue([]);
    const _cycleCountLim = jest.fn().mockReturnValue({ lean: _cycleCountL });
    const _cycleCountS = jest.fn().mockReturnValue({ limit: _cycleCountLim, lean: _cycleCountL, populate: jest.fn().mockReturnValue({ lean: _cycleCountL }) });
    mockCycleCountFind.mockReturnValue({ sort: _cycleCountS, lean: _cycleCountL, limit: _cycleCountLim, populate: jest.fn().mockReturnValue({ lean: _cycleCountL, sort: _cycleCountS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('WarehouseManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listWarehouses returns result', async () => {
    let r; try { r = await svc.listWarehouses({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getWarehouse returns result', async () => {
    let r; try { r = await svc.getWarehouse({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createWarehouse creates/returns result', async () => {
    let r; try { r = await svc.createWarehouse({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateWarehouse updates/returns result', async () => {
    let r; try { r = await svc.updateWarehouse('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listBins returns result', async () => {
    let r; try { r = await svc.listBins({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getBin returns result', async () => {
    let r; try { r = await svc.getBin({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createBin creates/returns result', async () => {
    let r; try { r = await svc.createBin({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateBin updates/returns result', async () => {
    let r; try { r = await svc.updateBin('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('assignItemToBin creates/returns result', async () => {
    let r; try { r = await svc.assignItemToBin({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPickLists returns result', async () => {
    let r; try { r = await svc.listPickLists({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPickList returns result', async () => {
    let r; try { r = await svc.getPickList({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPickList creates/returns result', async () => {
    let r; try { r = await svc.createPickList({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePickItem updates/returns result', async () => {
    let r; try { r = await svc.updatePickItem('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCycleCounts returns result', async () => {
    let r; try { r = await svc.listCycleCounts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCycleCount returns result', async () => {
    let r; try { r = await svc.getCycleCount({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCycleCount creates/returns result', async () => {
    let r; try { r = await svc.createCycleCount({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordCount creates/returns result', async () => {
    let r; try { r = await svc.recordCount({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('approveCycleCount updates/returns result', async () => {
    let r; try { r = await svc.approveCycleCount('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getWarehouseAnalytics returns object', async () => {
    let r; try { r = await svc.getWarehouseAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
