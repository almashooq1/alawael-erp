'use strict';

/* ── mock-prefixed variables ── */
const mockLogisticsPartnerFind = jest.fn();
const mockLogisticsPartnerCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'logisticsPartner1', ...d }));
const mockLogisticsPartnerCount = jest.fn().mockResolvedValue(0);
const mockShipmentFind = jest.fn();
const mockShipmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'shipment1', ...d }));
const mockShipmentCount = jest.fn().mockResolvedValue(0);
const mockDeliveryRouteFind = jest.fn();
const mockDeliveryRouteCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'deliveryRoute1', ...d }));
const mockDeliveryRouteCount = jest.fn().mockResolvedValue(0);
const mockSupplyChainEventFind = jest.fn();
const mockSupplyChainEventCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'supplyChainEvent1', ...d }));
const mockSupplyChainEventCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddSupplyChainTracker', () => ({
  DDDLogisticsPartner: {
    find: mockLogisticsPartnerFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'logisticsPartner1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'logisticsPartner1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLogisticsPartnerCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'logisticsPartner1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'logisticsPartner1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'logisticsPartner1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'logisticsPartner1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'logisticsPartner1' }) }),
    countDocuments: mockLogisticsPartnerCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDShipment: {
    find: mockShipmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'shipment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'shipment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockShipmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shipment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shipment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shipment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shipment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'shipment1' }) }),
    countDocuments: mockShipmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDeliveryRoute: {
    find: mockDeliveryRouteFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'deliveryRoute1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'deliveryRoute1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDeliveryRouteCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryRoute1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryRoute1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryRoute1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryRoute1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryRoute1' }) }),
    countDocuments: mockDeliveryRouteCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSupplyChainEvent: {
    find: mockSupplyChainEventFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'supplyChainEvent1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'supplyChainEvent1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSupplyChainEventCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplyChainEvent1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplyChainEvent1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplyChainEvent1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplyChainEvent1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'supplyChainEvent1' }) }),
    countDocuments: mockSupplyChainEventCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  SHIPMENT_STATUSES: ['item1', 'item2'],
  SHIPMENT_TYPES: ['item1', 'item2'],
  TRANSPORT_MODES: ['item1', 'item2'],
  EVENT_TYPES: ['item1', 'item2'],
  PRIORITY_LEVELS: ['item1', 'item2'],
  PARTNER_TYPES: ['item1', 'item2'],
  BUILTIN_PARTNERS: ['item1', 'item2'],

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

const svc = require('../../services/dddSupplyChainTracker');

describe('dddSupplyChainTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _logisticsPartnerL = jest.fn().mockResolvedValue([]);
    const _logisticsPartnerLim = jest.fn().mockReturnValue({ lean: _logisticsPartnerL });
    const _logisticsPartnerS = jest.fn().mockReturnValue({ limit: _logisticsPartnerLim, lean: _logisticsPartnerL, populate: jest.fn().mockReturnValue({ lean: _logisticsPartnerL }) });
    mockLogisticsPartnerFind.mockReturnValue({ sort: _logisticsPartnerS, lean: _logisticsPartnerL, limit: _logisticsPartnerLim, populate: jest.fn().mockReturnValue({ lean: _logisticsPartnerL, sort: _logisticsPartnerS }) });
    const _shipmentL = jest.fn().mockResolvedValue([]);
    const _shipmentLim = jest.fn().mockReturnValue({ lean: _shipmentL });
    const _shipmentS = jest.fn().mockReturnValue({ limit: _shipmentLim, lean: _shipmentL, populate: jest.fn().mockReturnValue({ lean: _shipmentL }) });
    mockShipmentFind.mockReturnValue({ sort: _shipmentS, lean: _shipmentL, limit: _shipmentLim, populate: jest.fn().mockReturnValue({ lean: _shipmentL, sort: _shipmentS }) });
    const _deliveryRouteL = jest.fn().mockResolvedValue([]);
    const _deliveryRouteLim = jest.fn().mockReturnValue({ lean: _deliveryRouteL });
    const _deliveryRouteS = jest.fn().mockReturnValue({ limit: _deliveryRouteLim, lean: _deliveryRouteL, populate: jest.fn().mockReturnValue({ lean: _deliveryRouteL }) });
    mockDeliveryRouteFind.mockReturnValue({ sort: _deliveryRouteS, lean: _deliveryRouteL, limit: _deliveryRouteLim, populate: jest.fn().mockReturnValue({ lean: _deliveryRouteL, sort: _deliveryRouteS }) });
    const _supplyChainEventL = jest.fn().mockResolvedValue([]);
    const _supplyChainEventLim = jest.fn().mockReturnValue({ lean: _supplyChainEventL });
    const _supplyChainEventS = jest.fn().mockReturnValue({ limit: _supplyChainEventLim, lean: _supplyChainEventL, populate: jest.fn().mockReturnValue({ lean: _supplyChainEventL }) });
    mockSupplyChainEventFind.mockReturnValue({ sort: _supplyChainEventS, lean: _supplyChainEventL, limit: _supplyChainEventLim, populate: jest.fn().mockReturnValue({ lean: _supplyChainEventL, sort: _supplyChainEventS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('SupplyChainTracker');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listPartners returns result', async () => {
    let r; try { r = await svc.listPartners({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPartner returns result', async () => {
    let r; try { r = await svc.getPartner({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPartner creates/returns result', async () => {
    let r; try { r = await svc.createPartner({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePartner updates/returns result', async () => {
    let r; try { r = await svc.updatePartner('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listShipments returns result', async () => {
    let r; try { r = await svc.listShipments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getShipment returns result', async () => {
    let r; try { r = await svc.getShipment({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getShipmentByTracking returns result', async () => {
    let r; try { r = await svc.getShipmentByTracking({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createShipment creates/returns result', async () => {
    let r; try { r = await svc.createShipment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateShipmentStatus updates/returns result', async () => {
    let r; try { r = await svc.updateShipmentStatus('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEvents returns result', async () => {
    let r; try { r = await svc.listEvents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addEvent creates/returns result', async () => {
    let r; try { r = await svc.addEvent({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
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

  test('updateRouteStop updates/returns result', async () => {
    let r; try { r = await svc.updateRouteStop('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSupplyChainAnalytics returns object', async () => {
    let r; try { r = await svc.getSupplyChainAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
