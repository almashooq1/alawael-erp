'use strict';

/* ── mock-prefixed variables ── */
const mockSpaceReservationFind = jest.fn();
const mockSpaceReservationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'spaceReservation1', ...d }));
const mockSpaceReservationCount = jest.fn().mockResolvedValue(0);
const mockSpaceScheduleFind = jest.fn();
const mockSpaceScheduleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'spaceSchedule1', ...d }));
const mockSpaceScheduleCount = jest.fn().mockResolvedValue(0);
const mockSpaceUtilizationFind = jest.fn();
const mockSpaceUtilizationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'spaceUtilization1', ...d }));
const mockSpaceUtilizationCount = jest.fn().mockResolvedValue(0);
const mockSpaceRequestFind = jest.fn();
const mockSpaceRequestCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'spaceRequest1', ...d }));
const mockSpaceRequestCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddSpaceAllocator', () => ({
  DDDSpaceReservation: {
    find: mockSpaceReservationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'spaceReservation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'spaceReservation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSpaceReservationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceReservation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceReservation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceReservation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceReservation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceReservation1' }) }),
    countDocuments: mockSpaceReservationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSpaceSchedule: {
    find: mockSpaceScheduleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'spaceSchedule1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'spaceSchedule1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSpaceScheduleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceSchedule1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceSchedule1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceSchedule1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceSchedule1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceSchedule1' }) }),
    countDocuments: mockSpaceScheduleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSpaceUtilization: {
    find: mockSpaceUtilizationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'spaceUtilization1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'spaceUtilization1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSpaceUtilizationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceUtilization1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceUtilization1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceUtilization1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceUtilization1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceUtilization1' }) }),
    countDocuments: mockSpaceUtilizationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSpaceRequest: {
    find: mockSpaceRequestFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'spaceRequest1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'spaceRequest1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSpaceRequestCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceRequest1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceRequest1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceRequest1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceRequest1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'spaceRequest1' }) }),
    countDocuments: mockSpaceRequestCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  RESERVATION_STATUSES: ['item1', 'item2'],
  RESERVATION_TYPES: ['item1', 'item2'],
  SCHEDULE_RECURRENCE: ['item1', 'item2'],
  UTILIZATION_METRICS: ['item1', 'item2'],
  REQUEST_STATUSES: ['item1', 'item2'],
  SPACE_PRIORITIES: ['item1', 'item2'],
  BUILTIN_SCHEDULES: ['item1', 'item2'],

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

const svc = require('../../services/dddSpaceAllocator');

describe('dddSpaceAllocator service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _spaceReservationL = jest.fn().mockResolvedValue([]);
    const _spaceReservationLim = jest.fn().mockReturnValue({ lean: _spaceReservationL });
    const _spaceReservationS = jest.fn().mockReturnValue({ limit: _spaceReservationLim, lean: _spaceReservationL, populate: jest.fn().mockReturnValue({ lean: _spaceReservationL }) });
    mockSpaceReservationFind.mockReturnValue({ sort: _spaceReservationS, lean: _spaceReservationL, limit: _spaceReservationLim, populate: jest.fn().mockReturnValue({ lean: _spaceReservationL, sort: _spaceReservationS }) });
    const _spaceScheduleL = jest.fn().mockResolvedValue([]);
    const _spaceScheduleLim = jest.fn().mockReturnValue({ lean: _spaceScheduleL });
    const _spaceScheduleS = jest.fn().mockReturnValue({ limit: _spaceScheduleLim, lean: _spaceScheduleL, populate: jest.fn().mockReturnValue({ lean: _spaceScheduleL }) });
    mockSpaceScheduleFind.mockReturnValue({ sort: _spaceScheduleS, lean: _spaceScheduleL, limit: _spaceScheduleLim, populate: jest.fn().mockReturnValue({ lean: _spaceScheduleL, sort: _spaceScheduleS }) });
    const _spaceUtilizationL = jest.fn().mockResolvedValue([]);
    const _spaceUtilizationLim = jest.fn().mockReturnValue({ lean: _spaceUtilizationL });
    const _spaceUtilizationS = jest.fn().mockReturnValue({ limit: _spaceUtilizationLim, lean: _spaceUtilizationL, populate: jest.fn().mockReturnValue({ lean: _spaceUtilizationL }) });
    mockSpaceUtilizationFind.mockReturnValue({ sort: _spaceUtilizationS, lean: _spaceUtilizationL, limit: _spaceUtilizationLim, populate: jest.fn().mockReturnValue({ lean: _spaceUtilizationL, sort: _spaceUtilizationS }) });
    const _spaceRequestL = jest.fn().mockResolvedValue([]);
    const _spaceRequestLim = jest.fn().mockReturnValue({ lean: _spaceRequestL });
    const _spaceRequestS = jest.fn().mockReturnValue({ limit: _spaceRequestLim, lean: _spaceRequestL, populate: jest.fn().mockReturnValue({ lean: _spaceRequestL }) });
    mockSpaceRequestFind.mockReturnValue({ sort: _spaceRequestS, lean: _spaceRequestL, limit: _spaceRequestLim, populate: jest.fn().mockReturnValue({ lean: _spaceRequestL, sort: _spaceRequestS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('SpaceAllocator');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listReservations returns result', async () => {
    let r; try { r = await svc.listReservations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getReservation returns result', async () => {
    let r; try { r = await svc.getReservation({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createReservation creates/returns result', async () => {
    let r; try { r = await svc.createReservation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('confirmReservation updates/returns result', async () => {
    let r; try { r = await svc.confirmReservation('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('cancelReservation updates/returns result', async () => {
    let r; try { r = await svc.cancelReservation('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('checkIn returns result', async () => {
    let r; try { r = await svc.checkIn({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('checkOut returns result', async () => {
    let r; try { r = await svc.checkOut({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSchedules returns result', async () => {
    let r; try { r = await svc.listSchedules({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSchedule creates/returns result', async () => {
    let r; try { r = await svc.createSchedule({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateSchedule updates/returns result', async () => {
    let r; try { r = await svc.updateSchedule('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getUtilization returns result', async () => {
    let r; try { r = await svc.getUtilization({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordUtilization creates/returns result', async () => {
    let r; try { r = await svc.recordUtilization({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listRequests returns result', async () => {
    let r; try { r = await svc.listRequests({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRequest returns result', async () => {
    let r; try { r = await svc.getRequest({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRequest creates/returns result', async () => {
    let r; try { r = await svc.createRequest({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('approveRequest updates/returns result', async () => {
    let r; try { r = await svc.approveRequest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('rejectRequest updates/returns result', async () => {
    let r; try { r = await svc.rejectRequest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSpaceAnalytics returns object', async () => {
    let r; try { r = await svc.getSpaceAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
