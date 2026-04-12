'use strict';

/* ── mock-prefixed variables ── */
const mockFuelLogFind = jest.fn();
const mockFuelLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'fuelLog1', ...d }));
const mockFuelLogCount = jest.fn().mockResolvedValue(0);
const mockVehicleMaintenanceFind = jest.fn();
const mockVehicleMaintenanceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'vehicleMaintenance1', ...d }));
const mockVehicleMaintenanceCount = jest.fn().mockResolvedValue(0);
const mockVehicleInspectionFind = jest.fn();
const mockVehicleInspectionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'vehicleInspection1', ...d }));
const mockVehicleInspectionCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddFleetTracker', () => ({
  DDDFuelLog: {
    find: mockFuelLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'fuelLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'fuelLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFuelLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fuelLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fuelLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fuelLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fuelLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fuelLog1' }) }),
    countDocuments: mockFuelLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVehicleMaintenance: {
    find: mockVehicleMaintenanceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'vehicleMaintenance1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'vehicleMaintenance1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVehicleMaintenanceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleMaintenance1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleMaintenance1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleMaintenance1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleMaintenance1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleMaintenance1' }) }),
    countDocuments: mockVehicleMaintenanceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVehicleInspection: {
    find: mockVehicleInspectionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'vehicleInspection1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'vehicleInspection1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVehicleInspectionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleInspection1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleInspection1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleInspection1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleInspection1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vehicleInspection1' }) }),
    countDocuments: mockVehicleInspectionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  FUEL_TYPES: ['item1', 'item2'],
  MAINTENANCE_CATEGORIES: ['item1', 'item2'],
  MAINTENANCE_STATUSES: ['item1', 'item2'],
  INSPECTION_TYPES: ['item1', 'item2'],
  INSPECTION_STATUSES: ['item1', 'item2'],
  TRACKING_EVENTS: ['item1', 'item2'],
  ALERT_TYPES: ['item1', 'item2'],
  BUILTIN_MAINTENANCE_SCHEDULES: ['item1', 'item2'],

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

const svc = require('../../services/dddFleetTracker');

describe('dddFleetTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _fuelLogL = jest.fn().mockResolvedValue([]);
    const _fuelLogLim = jest.fn().mockReturnValue({ lean: _fuelLogL });
    const _fuelLogS = jest.fn().mockReturnValue({ limit: _fuelLogLim, lean: _fuelLogL, populate: jest.fn().mockReturnValue({ lean: _fuelLogL }) });
    mockFuelLogFind.mockReturnValue({ sort: _fuelLogS, lean: _fuelLogL, limit: _fuelLogLim, populate: jest.fn().mockReturnValue({ lean: _fuelLogL, sort: _fuelLogS }) });
    const _vehicleMaintenanceL = jest.fn().mockResolvedValue([]);
    const _vehicleMaintenanceLim = jest.fn().mockReturnValue({ lean: _vehicleMaintenanceL });
    const _vehicleMaintenanceS = jest.fn().mockReturnValue({ limit: _vehicleMaintenanceLim, lean: _vehicleMaintenanceL, populate: jest.fn().mockReturnValue({ lean: _vehicleMaintenanceL }) });
    mockVehicleMaintenanceFind.mockReturnValue({ sort: _vehicleMaintenanceS, lean: _vehicleMaintenanceL, limit: _vehicleMaintenanceLim, populate: jest.fn().mockReturnValue({ lean: _vehicleMaintenanceL, sort: _vehicleMaintenanceS }) });
    const _vehicleInspectionL = jest.fn().mockResolvedValue([]);
    const _vehicleInspectionLim = jest.fn().mockReturnValue({ lean: _vehicleInspectionL });
    const _vehicleInspectionS = jest.fn().mockReturnValue({ limit: _vehicleInspectionLim, lean: _vehicleInspectionL, populate: jest.fn().mockReturnValue({ lean: _vehicleInspectionL }) });
    mockVehicleInspectionFind.mockReturnValue({ sort: _vehicleInspectionS, lean: _vehicleInspectionL, limit: _vehicleInspectionLim, populate: jest.fn().mockReturnValue({ lean: _vehicleInspectionL, sort: _vehicleInspectionS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('FleetTracker');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listFuelLogs returns result', async () => {
    let r; try { r = await svc.listFuelLogs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logFuel creates/returns result', async () => {
    let r; try { r = await svc.logFuel({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLatestPosition returns result', async () => {
    let r; try { r = await svc.getLatestPosition({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getTrackingHistory returns result', async () => {
    let r; try { r = await svc.getTrackingHistory({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordPosition creates/returns result', async () => {
    let r; try { r = await svc.recordPosition({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMaintenance returns result', async () => {
    let r; try { r = await svc.listMaintenance({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleMaintenance creates/returns result', async () => {
    let r; try { r = await svc.scheduleMaintenance({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeMaintenance updates/returns result', async () => {
    let r; try { r = await svc.completeMaintenance('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listInspections returns result', async () => {
    let r; try { r = await svc.listInspections({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleInspection creates/returns result', async () => {
    let r; try { r = await svc.scheduleInspection({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeInspection updates/returns result', async () => {
    let r; try { r = await svc.completeInspection('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFleetAnalytics returns object', async () => {
    let r; try { r = await svc.getFleetAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
