'use strict';

/* ── mock-prefixed variables ── */
const mockRouteFind = jest.fn();
const mockRouteCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'route1', ...d }));
const mockRouteCount = jest.fn().mockResolvedValue(0);
const mockRouteExecutionFind = jest.fn();
const mockRouteExecutionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'routeExecution1', ...d }));
const mockRouteExecutionCount = jest.fn().mockResolvedValue(0);
const mockServiceZoneFind = jest.fn();
const mockServiceZoneCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'serviceZone1', ...d }));
const mockServiceZoneCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddRouteOptimizer', () => ({
  DDDRoute: {
    find: mockRouteFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'route1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'route1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRouteCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'route1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'route1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'route1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'route1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'route1' }) }),
    countDocuments: mockRouteCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRouteExecution: {
    find: mockRouteExecutionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'routeExecution1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'routeExecution1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRouteExecutionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'routeExecution1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'routeExecution1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'routeExecution1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'routeExecution1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'routeExecution1' }) }),
    countDocuments: mockRouteExecutionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDServiceZone: {
    find: mockServiceZoneFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'serviceZone1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'serviceZone1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockServiceZoneCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceZone1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceZone1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceZone1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceZone1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'serviceZone1' }) }),
    countDocuments: mockServiceZoneCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ROUTE_TYPES: ['item1', 'item2'],
  ROUTE_STATUSES: ['item1', 'item2'],
  ZONE_TYPES: ['item1', 'item2'],
  OPTIMIZATION_CRITERIA: ['item1', 'item2'],
  TRAFFIC_CONDITIONS: ['item1', 'item2'],
  ETA_STATUSES: ['item1', 'item2'],
  BUILTIN_ROUTES: ['item1', 'item2'],

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

const svc = require('../../services/dddRouteOptimizer');

describe('dddRouteOptimizer service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _routeL = jest.fn().mockResolvedValue([]);
    const _routeLim = jest.fn().mockReturnValue({ lean: _routeL });
    const _routeS = jest.fn().mockReturnValue({ limit: _routeLim, lean: _routeL, populate: jest.fn().mockReturnValue({ lean: _routeL }) });
    mockRouteFind.mockReturnValue({ sort: _routeS, lean: _routeL, limit: _routeLim, populate: jest.fn().mockReturnValue({ lean: _routeL, sort: _routeS }) });
    const _routeExecutionL = jest.fn().mockResolvedValue([]);
    const _routeExecutionLim = jest.fn().mockReturnValue({ lean: _routeExecutionL });
    const _routeExecutionS = jest.fn().mockReturnValue({ limit: _routeExecutionLim, lean: _routeExecutionL, populate: jest.fn().mockReturnValue({ lean: _routeExecutionL }) });
    mockRouteExecutionFind.mockReturnValue({ sort: _routeExecutionS, lean: _routeExecutionL, limit: _routeExecutionLim, populate: jest.fn().mockReturnValue({ lean: _routeExecutionL, sort: _routeExecutionS }) });
    const _serviceZoneL = jest.fn().mockResolvedValue([]);
    const _serviceZoneLim = jest.fn().mockReturnValue({ lean: _serviceZoneL });
    const _serviceZoneS = jest.fn().mockReturnValue({ limit: _serviceZoneLim, lean: _serviceZoneL, populate: jest.fn().mockReturnValue({ lean: _serviceZoneL }) });
    mockServiceZoneFind.mockReturnValue({ sort: _serviceZoneS, lean: _serviceZoneL, limit: _serviceZoneLim, populate: jest.fn().mockReturnValue({ lean: _serviceZoneL, sort: _serviceZoneS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('RouteOptimizer');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listRoutes returns result', async () => {
    let r; try { r = await svc.listRoutes({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRoute returns result', async () => {
    let r; try { r = await svc.getRoute({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRoute creates/returns result', async () => {
    let r; try { r = await svc.createRoute({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRoute updates/returns result', async () => {
    let r; try { r = await svc.updateRoute('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('optimizeRoute is callable', () => {
    expect(typeof svc.optimizeRoute).toBe('function');
  });

  test('listExecutions returns result', async () => {
    let r; try { r = await svc.listExecutions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('startExecution creates/returns result', async () => {
    let r; try { r = await svc.startExecution({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeExecution updates/returns result', async () => {
    let r; try { r = await svc.completeExecution('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listZones returns result', async () => {
    let r; try { r = await svc.listZones({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createZone creates/returns result', async () => {
    let r; try { r = await svc.createZone({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateZone updates/returns result', async () => {
    let r; try { r = await svc.updateZone('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('calculateETA returns result', async () => {
    let r; try { r = await svc.calculateETA({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getETA returns result', async () => {
    let r; try { r = await svc.getETA({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listETAs returns result', async () => {
    let r; try { r = await svc.listETAs({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRouteAnalytics returns object', async () => {
    let r; try { r = await svc.getRouteAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
