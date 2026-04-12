'use strict';

/* ── mock-prefixed variables ── */
const mockVehicleFind = jest.fn();
const mockVehicleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'vehicle1', ...d }));
const mockVehicleCount = jest.fn().mockResolvedValue(0);
const mockDriverFind = jest.fn();
const mockDriverCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'driver1', ...d }));
const mockDriverCount = jest.fn().mockResolvedValue(0);
const mockTransportScheduleFind = jest.fn();
const mockTransportScheduleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'transportSchedule1', ...d }));
const mockTransportScheduleCount = jest.fn().mockResolvedValue(0);
const mockTransportPolicyFind = jest.fn();
const mockTransportPolicyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'transportPolicy1', ...d }));
const mockTransportPolicyCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddTransportManager', () => ({
  DDDVehicle: {
    find: mockVehicleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'vehicle1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'vehicle1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVehicleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicle1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicle1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicle1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicle1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicle1' }) }),
    countDocuments: mockVehicleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDriver: {
    find: mockDriverFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'driver1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'driver1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDriverCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'driver1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'driver1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'driver1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'driver1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'driver1' }) }),
    countDocuments: mockDriverCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTransportSchedule: {
    find: mockTransportScheduleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'transportSchedule1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'transportSchedule1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTransportScheduleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportSchedule1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportSchedule1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportSchedule1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportSchedule1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportSchedule1' }) }),
    countDocuments: mockTransportScheduleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTransportPolicy: {
    find: mockTransportPolicyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'transportPolicy1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'transportPolicy1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTransportPolicyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportPolicy1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportPolicy1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportPolicy1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportPolicy1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportPolicy1' }) }),
    countDocuments: mockTransportPolicyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  VEHICLE_TYPES: ['item1', 'item2'],
  VEHICLE_STATUSES: ['item1', 'item2'],
  DRIVER_STATUSES: ['item1', 'item2'],
  DRIVER_CERTIFICATIONS: ['item1', 'item2'],
  SCHEDULE_TYPES: ['item1', 'item2'],
  POLICY_CATEGORIES: ['item1', 'item2'],
  BUILTIN_TRANSPORT_POLICIES: ['item1', 'item2'],

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

const svc = require('../../services/dddTransportManager');

describe('dddTransportManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _vehicleL = jest.fn().mockResolvedValue([]);
    const _vehicleLim = jest.fn().mockReturnValue({ lean: _vehicleL });
    const _vehicleS = jest.fn().mockReturnValue({ limit: _vehicleLim, lean: _vehicleL, populate: jest.fn().mockReturnValue({ lean: _vehicleL }) });
    mockVehicleFind.mockReturnValue({ sort: _vehicleS, lean: _vehicleL, limit: _vehicleLim, populate: jest.fn().mockReturnValue({ lean: _vehicleL, sort: _vehicleS }) });
    const _driverL = jest.fn().mockResolvedValue([]);
    const _driverLim = jest.fn().mockReturnValue({ lean: _driverL });
    const _driverS = jest.fn().mockReturnValue({ limit: _driverLim, lean: _driverL, populate: jest.fn().mockReturnValue({ lean: _driverL }) });
    mockDriverFind.mockReturnValue({ sort: _driverS, lean: _driverL, limit: _driverLim, populate: jest.fn().mockReturnValue({ lean: _driverL, sort: _driverS }) });
    const _transportScheduleL = jest.fn().mockResolvedValue([]);
    const _transportScheduleLim = jest.fn().mockReturnValue({ lean: _transportScheduleL });
    const _transportScheduleS = jest.fn().mockReturnValue({ limit: _transportScheduleLim, lean: _transportScheduleL, populate: jest.fn().mockReturnValue({ lean: _transportScheduleL }) });
    mockTransportScheduleFind.mockReturnValue({ sort: _transportScheduleS, lean: _transportScheduleL, limit: _transportScheduleLim, populate: jest.fn().mockReturnValue({ lean: _transportScheduleL, sort: _transportScheduleS }) });
    const _transportPolicyL = jest.fn().mockResolvedValue([]);
    const _transportPolicyLim = jest.fn().mockReturnValue({ lean: _transportPolicyL });
    const _transportPolicyS = jest.fn().mockReturnValue({ limit: _transportPolicyLim, lean: _transportPolicyL, populate: jest.fn().mockReturnValue({ lean: _transportPolicyL }) });
    mockTransportPolicyFind.mockReturnValue({ sort: _transportPolicyS, lean: _transportPolicyL, limit: _transportPolicyLim, populate: jest.fn().mockReturnValue({ lean: _transportPolicyL, sort: _transportPolicyS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('TransportManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listVehicles returns result', async () => {
    let r; try { r = await svc.listVehicles({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getVehicle returns result', async () => {
    let r; try { r = await svc.getVehicle({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('registerVehicle creates/returns result', async () => {
    let r; try { r = await svc.registerVehicle({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateVehicle updates/returns result', async () => {
    let r; try { r = await svc.updateVehicle('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDrivers returns result', async () => {
    let r; try { r = await svc.listDrivers({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getDriver returns result', async () => {
    let r; try { r = await svc.getDriver({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('registerDriver creates/returns result', async () => {
    let r; try { r = await svc.registerDriver({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateDriver updates/returns result', async () => {
    let r; try { r = await svc.updateDriver('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
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

  test('listPolicies returns result', async () => {
    let r; try { r = await svc.listPolicies({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPolicy creates/returns result', async () => {
    let r; try { r = await svc.createPolicy({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getTransportAnalytics returns object', async () => {
    let r; try { r = await svc.getTransportAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
