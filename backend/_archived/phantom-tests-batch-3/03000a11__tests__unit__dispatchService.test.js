/**
 * Unit tests for services/dispatchService.js
 * DispatchService — Static methods (class export)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockSave = jest.fn().mockResolvedValue(undefined);

const MockDispatchOrder = jest.fn().mockImplementation(function (data) {
  Object.assign(this, data);
  this.timeline = data.timeline || [];
  this.save = mockSave.mockImplementation(async () => this);
  return this;
});

MockDispatchOrder.find = jest.fn();
MockDispatchOrder.findById = jest.fn();
MockDispatchOrder.findByIdAndUpdate = jest.fn();
MockDispatchOrder.countDocuments = jest.fn();
MockDispatchOrder.aggregate = jest.fn();

jest.mock('../../models/DispatchOrder', () => MockDispatchOrder);
jest.mock('../../models/Vehicle', () => ({}));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const Service = require('../../services/dispatchService');

/* ─── helpers ───────────────────────────────────────────────────────── */

function fakeOrder(overrides = {}) {
  return {
    _id: 'ord1',
    orderNumber: 'DSP-001',
    status: 'pending',
    timeline: [],
    stops: [],
    notes: '',
    actualRoute: {},
    plannedRoute: {},
    save: mockSave.mockImplementation(async function () {
      return this;
    }),
    ...overrides,
  };
}

function chainPopulate(data) {
  const p4 = jest.fn().mockResolvedValue(data);
  const p3 = jest.fn().mockReturnValue({ populate: p4 });
  const p2 = jest.fn().mockReturnValue({ populate: p3 });
  const p1 = jest.fn().mockReturnValue({ populate: p2 });
  return { populate: p1 };
}

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('DispatchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockImplementation(async function () {
      return this;
    });
  });

  // ── createOrder ──────────────────────────────────────────────────

  describe('createOrder', () => {
    it('creates order with timeline event', async () => {
      const result = await Service.createOrder({ createdBy: 'u1' });

      expect(MockDispatchOrder).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].event).toBe('created');
    });
  });

  // ── getAll ───────────────────────────────────────────────────────

  describe('getAll', () => {
    it('returns paginated orders', async () => {
      const orders = [fakeOrder()];
      MockDispatchOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  sort: jest.fn().mockResolvedValue(orders),
                }),
              }),
            }),
          }),
        }),
      });
      MockDispatchOrder.countDocuments.mockResolvedValue(1);

      const result = await Service.getAll({}, 1, 20);

      expect(result.orders).toEqual(orders);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('applies filters', async () => {
      MockDispatchOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  sort: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });
      MockDispatchOrder.countDocuments.mockResolvedValue(0);

      const result = await Service.getAll({
        status: 'completed',
        type: 'delivery',
        priority: 'high',
        vehicle: 'v1',
        driver: 'd1',
        organization: 'org1',
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31',
      });

      expect(result.total).toBe(0);
    });
  });

  // ── getById ──────────────────────────────────────────────────────

  describe('getById', () => {
    it('returns populated order', async () => {
      const order = fakeOrder();
      MockDispatchOrder.findById.mockReturnValue(chainPopulate(order));

      const result = await Service.getById('ord1');
      expect(result._id).toBe('ord1');
    });
  });

  // ── update ───────────────────────────────────────────────────────

  describe('update', () => {
    it('updates order and pushes timeline event', async () => {
      const order = fakeOrder();
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findByIdAndUpdate.mockResolvedValue(order);

      const result = await Service.update('ord1', { priority: 'high' }, 'u1');

      expect(result.timeline).toHaveLength(1);
      expect(result.timeline[0].event).toBe('updated');
    });

    it('returns null when not found', async () => {
      MockDispatchOrder.findByIdAndUpdate.mockResolvedValue(null);
      const result = await Service.update('bad', {}, 'u');
      expect(result).toBeNull();
    });
  });

  // ── assignVehicleAndDriver ───────────────────────────────────────

  describe('assignVehicleAndDriver', () => {
    it('assigns vehicle and driver', async () => {
      const order = fakeOrder();
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.assignVehicleAndDriver('ord1', 'v1', 'd1', 'u1');

      expect(result.vehicle).toBe('v1');
      expect(result.driver).toBe('d1');
      expect(result.status).toBe('assigned');
    });

    it('returns null when not found', async () => {
      MockDispatchOrder.findById.mockResolvedValue(null);
      const result = await Service.assignVehicleAndDriver('bad', 'v', 'd', 'u');
      expect(result).toBeNull();
    });
  });

  // ── startDispatch ────────────────────────────────────────────────

  describe('startDispatch', () => {
    it('starts dispatched order', async () => {
      const order = fakeOrder({ status: 'assigned', actualRoute: {} });
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.startDispatch('ord1', 'u1');

      expect(result.status).toBe('in_transit');
      expect(result.actualRoute.startedAt).toBeDefined();
    });

    it('throws when status does not allow start', async () => {
      const order = fakeOrder({ status: 'completed' });
      MockDispatchOrder.findById.mockResolvedValue(order);

      await expect(Service.startDispatch('ord1', 'u1')).rejects.toThrow('ليس في حالة تسمح');
    });

    it('returns null when not found', async () => {
      MockDispatchOrder.findById.mockResolvedValue(null);
      const result = await Service.startDispatch('bad', 'u');
      expect(result).toBeNull();
    });
  });

  // ── updateStopStatus ─────────────────────────────────────────────

  describe('updateStopStatus', () => {
    it('marks stop as arrived', async () => {
      const order = fakeOrder({
        stops: [{ status: 'pending' }, { status: 'pending' }],
      });
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.updateStopStatus('ord1', 0, 'arrived', {}, 'u1');

      expect(result.stops[0].status).toBe('arrived');
      expect(result.stops[0].actualArrival).toBeDefined();
    });

    it('marks stop as completed with signature', async () => {
      const order = fakeOrder({
        stops: [{ status: 'arrived' }],
      });
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.updateStopStatus(
        'ord1',
        0,
        'completed',
        {
          signature: 'sig',
          proofOfDelivery: 'photo',
          notes: 'ok',
        },
        'u1'
      );

      expect(result.stops[0].actualDeparture).toBeDefined();
      expect(result.stops[0].signature).toBe('sig');
    });

    it('auto-completes order when all stops done', async () => {
      const order = fakeOrder({
        status: 'in_transit',
        stops: [{ status: 'completed' }, { status: 'pending' }],
        actualRoute: { startedAt: new Date(Date.now() - 60000) },
      });
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.updateStopStatus('ord1', 1, 'completed', {}, 'u1');

      expect(result.status).toBe('completed');
      expect(result.actualRoute.completedAt).toBeDefined();
      expect(result.actualRoute.actualDuration).toBeDefined();
    });

    it('returns null when order not found', async () => {
      MockDispatchOrder.findById.mockResolvedValue(null);
      const result = await Service.updateStopStatus('bad', 0, 'arrived', {}, 'u');
      expect(result).toBeNull();
    });

    it('returns null when stop index invalid', async () => {
      MockDispatchOrder.findById.mockResolvedValue(fakeOrder({ stops: [] }));
      const result = await Service.updateStopStatus('ord1', 5, 'arrived', {}, 'u');
      expect(result).toBeNull();
    });
  });

  // ── cancelOrder ──────────────────────────────────────────────────

  describe('cancelOrder', () => {
    it('cancels order with reason', async () => {
      const order = fakeOrder({ notes: '' });
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.cancelOrder('ord1', 'Customer request', 'u1');

      expect(result.status).toBe('cancelled');
      expect(result.notes).toContain('Customer request');
    });

    it('returns null when not found', async () => {
      MockDispatchOrder.findById.mockResolvedValue(null);
      expect(await Service.cancelOrder('bad', 'x', 'u')).toBeNull();
    });
  });

  // ── rateOrder ────────────────────────────────────────────────────

  describe('rateOrder', () => {
    it('sets rating on order', async () => {
      const order = fakeOrder();
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.rateOrder('ord1', 5, 'Excellent', 'u1');

      expect(result.rating.score).toBe(5);
      expect(result.rating.comment).toBe('Excellent');
    });

    it('returns null when not found', async () => {
      MockDispatchOrder.findById.mockResolvedValue(null);
      expect(await Service.rateOrder('bad', 5, 'x', 'u')).toBeNull();
    });
  });

  // ── getActiveOrders ──────────────────────────────────────────────

  describe('getActiveOrders', () => {
    it('returns active orders', async () => {
      MockDispatchOrder.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue([fakeOrder()]),
          }),
        }),
      });

      const result = await Service.getActiveOrders('org1');
      expect(result).toHaveLength(1);
    });
  });

  // ── getDriverOrders ──────────────────────────────────────────────

  describe('getDriverOrders', () => {
    it('returns driver orders', async () => {
      MockDispatchOrder.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([fakeOrder()]),
        }),
      });

      const result = await Service.getDriverOrders('d1', 'in_transit');
      expect(result).toHaveLength(1);
    });
  });

  // ── getStatistics ────────────────────────────────────────────────

  describe('getStatistics', () => {
    it('returns aggregate statistics', async () => {
      MockDispatchOrder.aggregate
        .mockResolvedValueOnce([
          {
            totalOrders: 100,
            completedOrders: 80,
            cancelledOrders: 5,
            inTransitOrders: 10,
            totalRevenue: 50000,
            totalCost: 30000,
            totalProfit: 20000,
            avgRating: 4.5,
            totalDistance: 5000,
            avgDeliveryTime: 45,
          },
        ])
        .mockResolvedValueOnce([{ _id: 'delivery', count: 70 }])
        .mockResolvedValueOnce([{ _id: 'high', count: 20 }]);

      const result = await Service.getStatistics({ organization: 'org1' });

      expect(result.totalOrders).toBe(100);
      expect(result.completionRate).toBe('80.0');
      expect(result.byType).toHaveLength(1);
      expect(result.byPriority).toHaveLength(1);
    });

    it('handles empty stats', async () => {
      MockDispatchOrder.aggregate
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await Service.getStatistics({});

      expect(result.completionRate).toBe(0);
    });
  });

  // ── optimizeRoute ────────────────────────────────────────────────

  describe('optimizeRoute', () => {
    it('sorts stops: pickup first, then delivery', async () => {
      const order = fakeOrder({
        stops: [
          { type: 'delivery', order: 1 },
          { type: 'pickup', order: 2 },
          { type: 'delivery', order: 3 },
        ],
        plannedRoute: {},
      });
      order.save = jest.fn().mockResolvedValue(order);
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.optimizeRoute('ord1');

      expect(result.stops[0].type).toBe('pickup');
      expect(result.plannedRoute.optimized).toBe(true);
    });

    it('returns order unchanged when < 2 stops', async () => {
      const order = fakeOrder({ stops: [{ type: 'delivery' }] });
      MockDispatchOrder.findById.mockResolvedValue(order);

      const result = await Service.optimizeRoute('ord1');
      expect(result).toBe(order);
    });

    it('returns null when not found', async () => {
      MockDispatchOrder.findById.mockResolvedValue(null);
      expect(await Service.optimizeRoute('bad')).toBeNull();
    });
  });
});
