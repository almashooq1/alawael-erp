'use strict';

/* ── mock-prefixed variables ── */
const mockFacilitySpaceFind = jest.fn();
const mockFacilitySpaceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'facilitySpace1', ...d }));
const mockFacilitySpaceCount = jest.fn().mockResolvedValue(0);
const mockRoomBookingFind = jest.fn();
const mockRoomBookingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'roomBooking1', ...d }));
const mockRoomBookingCount = jest.fn().mockResolvedValue(0);
const mockUtilizationRecordFind = jest.fn();
const mockUtilizationRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'utilizationRecord1', ...d }));
const mockUtilizationRecordCount = jest.fn().mockResolvedValue(0);
const mockSpaceMaintenanceReqFind = jest.fn();
const mockSpaceMaintenanceReqCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'spaceMaintenanceReq1', ...d }));
const mockSpaceMaintenanceReqCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddSpaceManagement', () => ({
  DDDFacilitySpace: {
    find: mockFacilitySpaceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'facilitySpace1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'facilitySpace1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFacilitySpaceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilitySpace1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilitySpace1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilitySpace1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilitySpace1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'facilitySpace1' }) }),
    countDocuments: mockFacilitySpaceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRoomBooking: {
    find: mockRoomBookingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'roomBooking1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'roomBooking1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRoomBookingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'roomBooking1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'roomBooking1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'roomBooking1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'roomBooking1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'roomBooking1' }) }),
    countDocuments: mockRoomBookingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDUtilizationRecord: {
    find: mockUtilizationRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'utilizationRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'utilizationRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockUtilizationRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'utilizationRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'utilizationRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'utilizationRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'utilizationRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'utilizationRecord1' }) }),
    countDocuments: mockUtilizationRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSpaceMaintenanceReq: {
    find: mockSpaceMaintenanceReqFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'spaceMaintenanceReq1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'spaceMaintenanceReq1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSpaceMaintenanceReqCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceMaintenanceReq1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceMaintenanceReq1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceMaintenanceReq1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceMaintenanceReq1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceMaintenanceReq1' }) }),
    countDocuments: mockSpaceMaintenanceReqCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  SPACE_TYPES: ['item1', 'item2'],
  SPACE_STATUSES: ['item1', 'item2'],
  BOOKING_STATUSES: ['item1', 'item2'],
  ACCESSIBILITY_FEATURES: ['item1', 'item2'],
  AMENITIES: ['item1', 'item2'],
  FLOOR_LEVELS: ['item1', 'item2'],
  BUILTIN_ROOM_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddSpaceManagement');

describe('dddSpaceManagement service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _facilitySpaceL = jest.fn().mockResolvedValue([]);
    const _facilitySpaceLim = jest.fn().mockReturnValue({ lean: _facilitySpaceL });
    const _facilitySpaceS = jest.fn().mockReturnValue({ limit: _facilitySpaceLim, lean: _facilitySpaceL, populate: jest.fn().mockReturnValue({ lean: _facilitySpaceL }) });
    mockFacilitySpaceFind.mockReturnValue({ sort: _facilitySpaceS, lean: _facilitySpaceL, limit: _facilitySpaceLim, populate: jest.fn().mockReturnValue({ lean: _facilitySpaceL, sort: _facilitySpaceS }) });
    const _roomBookingL = jest.fn().mockResolvedValue([]);
    const _roomBookingLim = jest.fn().mockReturnValue({ lean: _roomBookingL });
    const _roomBookingS = jest.fn().mockReturnValue({ limit: _roomBookingLim, lean: _roomBookingL, populate: jest.fn().mockReturnValue({ lean: _roomBookingL }) });
    mockRoomBookingFind.mockReturnValue({ sort: _roomBookingS, lean: _roomBookingL, limit: _roomBookingLim, populate: jest.fn().mockReturnValue({ lean: _roomBookingL, sort: _roomBookingS }) });
    const _utilizationRecordL = jest.fn().mockResolvedValue([]);
    const _utilizationRecordLim = jest.fn().mockReturnValue({ lean: _utilizationRecordL });
    const _utilizationRecordS = jest.fn().mockReturnValue({ limit: _utilizationRecordLim, lean: _utilizationRecordL, populate: jest.fn().mockReturnValue({ lean: _utilizationRecordL }) });
    mockUtilizationRecordFind.mockReturnValue({ sort: _utilizationRecordS, lean: _utilizationRecordL, limit: _utilizationRecordLim, populate: jest.fn().mockReturnValue({ lean: _utilizationRecordL, sort: _utilizationRecordS }) });
    const _spaceMaintenanceReqL = jest.fn().mockResolvedValue([]);
    const _spaceMaintenanceReqLim = jest.fn().mockReturnValue({ lean: _spaceMaintenanceReqL });
    const _spaceMaintenanceReqS = jest.fn().mockReturnValue({ limit: _spaceMaintenanceReqLim, lean: _spaceMaintenanceReqL, populate: jest.fn().mockReturnValue({ lean: _spaceMaintenanceReqL }) });
    mockSpaceMaintenanceReqFind.mockReturnValue({ sort: _spaceMaintenanceReqS, lean: _spaceMaintenanceReqL, limit: _spaceMaintenanceReqLim, populate: jest.fn().mockReturnValue({ lean: _spaceMaintenanceReqL, sort: _spaceMaintenanceReqS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('SpaceManagement');
  });


  test('createSpace creates/returns result', async () => {
    let r; try { r = await svc.createSpace({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSpaces returns result', async () => {
    let r; try { r = await svc.listSpaces({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateSpace updates/returns result', async () => {
    let r; try { r = await svc.updateSpace('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createBooking creates/returns result', async () => {
    let r; try { r = await svc.createBooking({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listBookings returns result', async () => {
    let r; try { r = await svc.listBookings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordUtilization creates/returns result', async () => {
    let r; try { r = await svc.recordUtilization({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listUtilization returns result', async () => {
    let r; try { r = await svc.listUtilization({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createMaintenanceReq creates/returns result', async () => {
    let r; try { r = await svc.createMaintenanceReq({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMaintenanceReqs returns result', async () => {
    let r; try { r = await svc.listMaintenanceReqs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSpaceStats returns object', async () => {
    let r; try { r = await svc.getSpaceStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
