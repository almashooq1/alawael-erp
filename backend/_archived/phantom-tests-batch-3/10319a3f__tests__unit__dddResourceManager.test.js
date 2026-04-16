'use strict';

/* ── mock-prefixed variables ── */
const mockResourceFind = jest.fn();
const mockResourceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'resource1', ...d }));
const mockResourceCount = jest.fn().mockResolvedValue(0);
const mockAvailabilitySlotFind = jest.fn();
const mockAvailabilitySlotCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'availabilitySlot1', ...d }));
const mockAvailabilitySlotCount = jest.fn().mockResolvedValue(0);
const mockResourceAllocationFind = jest.fn();
const mockResourceAllocationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'resourceAllocation1', ...d }));
const mockResourceAllocationCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddResourceManager', () => ({
  DDDResource: {
    find: mockResourceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'resource1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'resource1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResourceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resource1' }) }),
    countDocuments: mockResourceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAvailabilitySlot: {
    find: mockAvailabilitySlotFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'availabilitySlot1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAvailabilitySlotCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'availabilitySlot1' }) }),
    countDocuments: mockAvailabilitySlotCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDResourceAllocation: {
    find: mockResourceAllocationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'resourceAllocation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResourceAllocationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceAllocation1' }) }),
    countDocuments: mockResourceAllocationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  RESOURCE_TYPES: ['item1', 'item2'],
  RESOURCE_STATUSES: ['item1', 'item2'],
  AVAILABILITY_PATTERNS: ['item1', 'item2'],
  SKILL_CATEGORIES: ['item1', 'item2'],
  BUILTIN_RESOURCES: ['item1', 'item2'],

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

const svc = require('../../services/dddResourceManager');

describe('dddResourceManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _resourceL = jest.fn().mockResolvedValue([]);
    const _resourceLim = jest.fn().mockReturnValue({ lean: _resourceL });
    const _resourceS = jest.fn().mockReturnValue({ limit: _resourceLim, lean: _resourceL, populate: jest.fn().mockReturnValue({ lean: _resourceL }) });
    mockResourceFind.mockReturnValue({ sort: _resourceS, lean: _resourceL, limit: _resourceLim, populate: jest.fn().mockReturnValue({ lean: _resourceL, sort: _resourceS }) });
    const _availabilitySlotL = jest.fn().mockResolvedValue([]);
    const _availabilitySlotLim = jest.fn().mockReturnValue({ lean: _availabilitySlotL });
    const _availabilitySlotS = jest.fn().mockReturnValue({ limit: _availabilitySlotLim, lean: _availabilitySlotL, populate: jest.fn().mockReturnValue({ lean: _availabilitySlotL }) });
    mockAvailabilitySlotFind.mockReturnValue({ sort: _availabilitySlotS, lean: _availabilitySlotL, limit: _availabilitySlotLim, populate: jest.fn().mockReturnValue({ lean: _availabilitySlotL, sort: _availabilitySlotS }) });
    const _resourceAllocationL = jest.fn().mockResolvedValue([]);
    const _resourceAllocationLim = jest.fn().mockReturnValue({ lean: _resourceAllocationL });
    const _resourceAllocationS = jest.fn().mockReturnValue({ limit: _resourceAllocationLim, lean: _resourceAllocationL, populate: jest.fn().mockReturnValue({ lean: _resourceAllocationL }) });
    mockResourceAllocationFind.mockReturnValue({ sort: _resourceAllocationS, lean: _resourceAllocationL, limit: _resourceAllocationLim, populate: jest.fn().mockReturnValue({ lean: _resourceAllocationL, sort: _resourceAllocationS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc).not.toBeNull();
  });


  test('listResources is callable', () => {
    expect(typeof svc.listResources).toBe('function');
  });

  test('getResource is callable', () => {
    expect(typeof svc.getResource).toBe('function');
  });

  test('createResource is callable', () => {
    expect(typeof svc.createResource).toBe('function');
  });

  test('updateResource is callable', () => {
    expect(typeof svc.updateResource).toBe('function');
  });

  test('deleteResource is callable', () => {
    expect(typeof svc.deleteResource).toBe('function');
  });

  test('listAvailability is callable', () => {
    expect(typeof svc.listAvailability).toBe('function');
  });

  test('setAvailability is callable', () => {
    expect(typeof svc.setAvailability).toBe('function');
  });

  test('addOverride is callable', () => {
    expect(typeof svc.addOverride).toBe('function');
  });

  test('allocateResource is callable', () => {
    expect(typeof svc.allocateResource).toBe('function');
  });

  test('listAllocations is callable', () => {
    expect(typeof svc.listAllocations).toBe('function');
  });

  test('cancelAllocation is callable', () => {
    expect(typeof svc.cancelAllocation).toBe('function');
  });

  test('getUtilization is callable', () => {
    expect(typeof svc.getUtilization).toBe('function');
  });

  test('findAvailable is callable', () => {
    expect(typeof svc.findAvailable).toBe('function');
  });

  test('getStats is callable', () => {
    expect(typeof svc.getStats).toBe('function');
  });
});
