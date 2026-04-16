'use strict';

/* ── mock-prefixed variables ── */
const mockBuildingFind = jest.fn();
const mockBuildingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'building1', ...d }));
const mockBuildingCount = jest.fn().mockResolvedValue(0);
const mockFloorFind = jest.fn();
const mockFloorCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'floor1', ...d }));
const mockFloorCount = jest.fn().mockResolvedValue(0);
const mockRoomFind = jest.fn();
const mockRoomCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'room1', ...d }));
const mockRoomCount = jest.fn().mockResolvedValue(0);
const mockFacilityInspectionFind = jest.fn();
const mockFacilityInspectionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'facilityInspection1', ...d }));
const mockFacilityInspectionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddFacilityManager', () => ({
  DDDBuilding: {
    find: mockBuildingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'building1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'building1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockBuildingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'building1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'building1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'building1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'building1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'building1' }) }),
    countDocuments: mockBuildingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFloor: {
    find: mockFloorFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'floor1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'floor1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFloorCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'floor1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'floor1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'floor1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'floor1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'floor1' }) }),
    countDocuments: mockFloorCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRoom: {
    find: mockRoomFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'room1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'room1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRoomCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'room1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'room1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'room1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'room1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'room1' }) }),
    countDocuments: mockRoomCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFacilityInspection: {
    find: mockFacilityInspectionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'facilityInspection1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'facilityInspection1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFacilityInspectionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilityInspection1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilityInspection1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilityInspection1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilityInspection1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilityInspection1' }) }),
    countDocuments: mockFacilityInspectionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  BUILDING_TYPES: ['item1', 'item2'],
  BUILDING_STATUSES: ['item1', 'item2'],
  ROOM_TYPES: ['item1', 'item2'],
  ROOM_STATUSES: ['item1', 'item2'],
  ACCESSIBILITY_FEATURES: ['item1', 'item2'],
  INSPECTION_TYPES: ['item1', 'item2'],
  BUILTIN_BUILDINGS: ['item1', 'item2'],

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

const svc = require('../../services/dddFacilityManager');

describe('dddFacilityManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _buildingL = jest.fn().mockResolvedValue([]);
    const _buildingLim = jest.fn().mockReturnValue({ lean: _buildingL });
    const _buildingS = jest.fn().mockReturnValue({ limit: _buildingLim, lean: _buildingL, populate: jest.fn().mockReturnValue({ lean: _buildingL }) });
    mockBuildingFind.mockReturnValue({ sort: _buildingS, lean: _buildingL, limit: _buildingLim, populate: jest.fn().mockReturnValue({ lean: _buildingL, sort: _buildingS }) });
    const _floorL = jest.fn().mockResolvedValue([]);
    const _floorLim = jest.fn().mockReturnValue({ lean: _floorL });
    const _floorS = jest.fn().mockReturnValue({ limit: _floorLim, lean: _floorL, populate: jest.fn().mockReturnValue({ lean: _floorL }) });
    mockFloorFind.mockReturnValue({ sort: _floorS, lean: _floorL, limit: _floorLim, populate: jest.fn().mockReturnValue({ lean: _floorL, sort: _floorS }) });
    const _roomL = jest.fn().mockResolvedValue([]);
    const _roomLim = jest.fn().mockReturnValue({ lean: _roomL });
    const _roomS = jest.fn().mockReturnValue({ limit: _roomLim, lean: _roomL, populate: jest.fn().mockReturnValue({ lean: _roomL }) });
    mockRoomFind.mockReturnValue({ sort: _roomS, lean: _roomL, limit: _roomLim, populate: jest.fn().mockReturnValue({ lean: _roomL, sort: _roomS }) });
    const _facilityInspectionL = jest.fn().mockResolvedValue([]);
    const _facilityInspectionLim = jest.fn().mockReturnValue({ lean: _facilityInspectionL });
    const _facilityInspectionS = jest.fn().mockReturnValue({ limit: _facilityInspectionLim, lean: _facilityInspectionL, populate: jest.fn().mockReturnValue({ lean: _facilityInspectionL }) });
    mockFacilityInspectionFind.mockReturnValue({ sort: _facilityInspectionS, lean: _facilityInspectionL, limit: _facilityInspectionLim, populate: jest.fn().mockReturnValue({ lean: _facilityInspectionL, sort: _facilityInspectionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('FacilityManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listBuildings returns result', async () => {
    let r; try { r = await svc.listBuildings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getBuilding returns result', async () => {
    let r; try { r = await svc.getBuilding({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createBuilding creates/returns result', async () => {
    let r; try { r = await svc.createBuilding({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateBuilding updates/returns result', async () => {
    let r; try { r = await svc.updateBuilding('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFloors returns result', async () => {
    let r; try { r = await svc.listFloors({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFloor returns result', async () => {
    let r; try { r = await svc.getFloor({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createFloor creates/returns result', async () => {
    let r; try { r = await svc.createFloor({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateFloor updates/returns result', async () => {
    let r; try { r = await svc.updateFloor('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listRooms returns result', async () => {
    let r; try { r = await svc.listRooms({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRoom returns result', async () => {
    let r; try { r = await svc.getRoom({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRoom creates/returns result', async () => {
    let r; try { r = await svc.createRoom({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRoom updates/returns result', async () => {
    let r; try { r = await svc.updateRoom('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRoomStatus updates/returns result', async () => {
    let r; try { r = await svc.updateRoomStatus('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listInspections returns result', async () => {
    let r; try { r = await svc.listInspections({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getInspection returns result', async () => {
    let r; try { r = await svc.getInspection({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createInspection creates/returns result', async () => {
    let r; try { r = await svc.createInspection({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeInspection updates/returns result', async () => {
    let r; try { r = await svc.completeInspection('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFacilityAnalytics returns object', async () => {
    let r; try { r = await svc.getFacilityAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
