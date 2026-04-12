'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
    'insertMany',
    'aggregate',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

/* ── globals for free-variable models ── */
let service, DDDCapacityPlan, DDDDemandForecast, DDDBottleneck;

beforeEach(() => {
  jest.resetModules();
  DDDCapacityPlan = makeModel();
  DDDDemandForecast = makeModel();
  DDDBottleneck = makeModel();
  global.DDDCapacityPlan = DDDCapacityPlan;
  global.DDDDemandForecast = DDDDemandForecast;
  global.DDDBottleneck = DDDBottleneck;
  global.oid = jest.fn(v => v);
  global.model = jest.fn(() => null);

  jest.mock('../../models/DddCapacityPlanner', () => ({
    PLANNING_HORIZONS: ['weekly', 'monthly', 'quarterly'],
    DEMAND_CATEGORIES: ['therapy', 'assessment'],
    BOTTLENECK_TYPES: ['staff_overload', 'room_shortage'],
    FORECAST_METHODS: ['moving_average', 'linear'],
    BUILTIN_CAPACITY_RULES: [{ code: 'R1' }, { code: 'R2' }],
  }));

  jest.mock('../../services/base/BaseCrudService', () => {
    return class BaseCrudService {
      constructor() {}
      log() {}
      _create(M, d) {
        return M.create(d);
      }
      _update(M, id, d, o) {
        return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
      }
      _list(M, f, o) {
        return M.find(f)
          .sort(o?.sort || {})
          .lean();
      }
    };
  });

  service = require('../../services/dddCapacityPlanner');
});

afterEach(() => {
  delete global.DDDCapacityPlan;
  delete global.DDDDemandForecast;
  delete global.DDDBottleneck;
  delete global.oid;
  delete global.model;
  jest.restoreAllMocks();
});

describe('dddCapacityPlanner', () => {
  /* ── Plans CRUD ── */
  describe('listPlans', () => {
    it('returns paginated plans', async () => {
      DDDCapacityPlan.find.mockReturnThis();
      DDDCapacityPlan.sort.mockReturnThis();
      DDDCapacityPlan.skip.mockReturnThis();
      DDDCapacityPlan.limit.mockReturnThis();
      DDDCapacityPlan.lean.mockResolvedValue([{ _id: 'p1' }]);
      DDDCapacityPlan.countDocuments.mockResolvedValue(1);
      const r = await service.listPlans({});
      expect(r).toEqual({ data: [{ _id: 'p1' }], total: 1, page: 1, pages: 1 });
    });

    it('applies status/horizon/department filters', async () => {
      DDDCapacityPlan.find.mockReturnThis();
      DDDCapacityPlan.sort.mockReturnThis();
      DDDCapacityPlan.skip.mockReturnThis();
      DDDCapacityPlan.limit.mockReturnThis();
      DDDCapacityPlan.lean.mockResolvedValue([]);
      DDDCapacityPlan.countDocuments.mockResolvedValue(0);
      await service.listPlans({ status: 'active', horizon: 'monthly', department: 'PT' });
      expect(DDDCapacityPlan.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active', horizon: 'monthly', department: 'PT' })
      );
    });

    it('respects page and limit', async () => {
      DDDCapacityPlan.find.mockReturnThis();
      DDDCapacityPlan.sort.mockReturnThis();
      DDDCapacityPlan.skip.mockReturnThis();
      DDDCapacityPlan.limit.mockReturnThis();
      DDDCapacityPlan.lean.mockResolvedValue([]);
      DDDCapacityPlan.countDocuments.mockResolvedValue(50);
      const r = await service.listPlans({ page: 3, limit: 10 });
      expect(DDDCapacityPlan.skip).toHaveBeenCalledWith(20);
      expect(DDDCapacityPlan.limit).toHaveBeenCalledWith(10);
      expect(r.pages).toBe(5);
    });
  });

  describe('getPlan', () => {
    it('returns plan by id', async () => {
      DDDCapacityPlan.findById.mockReturnThis();
      DDDCapacityPlan.lean.mockResolvedValue({ _id: 'p1' });
      expect(await service.getPlan('p1')).toEqual({ _id: 'p1' });
      expect(global.oid).toHaveBeenCalledWith('p1');
    });
  });

  describe('createPlan', () => {
    it('creates via _create', async () => {
      DDDCapacityPlan.create.mockResolvedValue({ _id: 'p1' });
      expect(await service.createPlan({ name: 'Q1' })).toHaveProperty('_id');
    });
  });

  describe('updatePlan', () => {
    it('updates with $set', async () => {
      DDDCapacityPlan.findByIdAndUpdate.mockReturnThis();
      DDDCapacityPlan.lean.mockResolvedValue({ _id: 'p1', name: 'Updated' });
      const r = await service.updatePlan('p1', { name: 'Updated' });
      expect(r.name).toBe('Updated');
    });
  });

  describe('deletePlan', () => {
    it('soft-deletes by archiving', async () => {
      DDDCapacityPlan.findByIdAndUpdate.mockReturnThis();
      DDDCapacityPlan.lean.mockResolvedValue({ _id: 'p1', status: 'archived' });
      const r = await service.deletePlan('p1');
      expect(r.status).toBe('archived');
    });
  });

  /* ── Forecasts ── */
  describe('generateForecast', () => {
    it('generates forecast entries with default periods=4', async () => {
      // model('DDDResourceAllocation') → null → no historical data → uses default avg=20
      DDDDemandForecast.create.mockImplementation(d => Promise.resolve({ _id: 'f', ...d }));
      const r = await service.generateForecast('p1', 'PT');
      expect(r).toHaveLength(4);
      expect(r[0].method).toBe('moving_average');
      expect(r[0].serviceType).toBe('PT');
    });

    it('generates custom period count', async () => {
      DDDDemandForecast.create.mockImplementation(d => Promise.resolve({ _id: 'f', ...d }));
      const r = await service.generateForecast('p1', 'OT', 2);
      expect(r).toHaveLength(2);
    });

    it('uses historical data when ResourceAllocation model exists', async () => {
      const mockRA = makeModel();
      mockRA.aggregate.mockResolvedValue([
        { _id: 1, count: 30 },
        { _id: 2, count: 40 },
      ]);
      global.model.mockImplementation(n => (n === 'DDDResourceAllocation' ? mockRA : null));
      DDDDemandForecast.create.mockImplementation(d => Promise.resolve({ _id: 'f', ...d }));

      const r = await service.generateForecast(null, 'PT', 1);
      expect(r).toHaveLength(1);
      // avg = (30+40)/2 = 35, first period prediction = round(35 * 1.02) = 36
      expect(r[0].predictedDemand).toBe(36);
    });
  });

  describe('listForecasts', () => {
    it('returns forecasts sorted by period', async () => {
      DDDDemandForecast.find.mockReturnThis();
      DDDDemandForecast.sort.mockReturnThis();
      DDDDemandForecast.lean.mockResolvedValue([{ _id: 'f1' }]);
      expect(await service.listForecasts({})).toHaveLength(1);
    });

    it('applies planId filter with oid', async () => {
      DDDDemandForecast.find.mockReturnThis();
      DDDDemandForecast.sort.mockReturnThis();
      DDDDemandForecast.lean.mockResolvedValue([]);
      await service.listForecasts({ planId: 'p1' });
      expect(global.oid).toHaveBeenCalledWith('p1');
    });
  });

  /* ── Bottlenecks ── */
  describe('detectBottlenecks', () => {
    it('returns empty when no resource models', async () => {
      const r = await service.detectBottlenecks();
      expect(r).toEqual([]);
    });

    it('detects overloaded resources', async () => {
      const mockResource = makeModel();
      const mockRA = makeModel();
      global.model.mockImplementation(n => {
        if (n === 'DDDResource') return mockResource;
        if (n === 'DDDResourceAllocation') return mockRA;
        return null;
      });
      mockResource.find.mockReturnThis();
      mockResource.lean.mockResolvedValue([{ _id: 'r1', name: 'Dr.A', type: 'PT', capacity: 1 }]);
      mockRA.countDocuments.mockResolvedValue(40); // > 40 * 0.9 = 36
      DDDBottleneck.insertMany.mockResolvedValue([]);

      const r = await service.detectBottlenecks('default');
      expect(r).toHaveLength(1);
      expect(r[0].type).toBe('staff_overload');
    });

    it('skips resources below threshold', async () => {
      const mockResource = makeModel();
      const mockRA = makeModel();
      global.model.mockImplementation(n => {
        if (n === 'DDDResource') return mockResource;
        if (n === 'DDDResourceAllocation') return mockRA;
        return null;
      });
      mockResource.find.mockReturnThis();
      mockResource.lean.mockResolvedValue([{ _id: 'r1', name: 'Dr.A', type: 'PT', capacity: 1 }]);
      mockRA.countDocuments.mockResolvedValue(5); // well below threshold

      const r = await service.detectBottlenecks('default');
      expect(r).toEqual([]);
    });
  });

  describe('listBottlenecks', () => {
    it('returns paginated bottlenecks', async () => {
      DDDBottleneck.find.mockReturnThis();
      DDDBottleneck.sort.mockReturnThis();
      DDDBottleneck.skip.mockReturnThis();
      DDDBottleneck.limit.mockReturnThis();
      DDDBottleneck.lean.mockResolvedValue([]);
      DDDBottleneck.countDocuments.mockResolvedValue(0);
      const r = await service.listBottlenecks({});
      expect(r).toEqual({ data: [], total: 0, page: 1, pages: 0 });
    });
  });

  describe('resolveBottleneck', () => {
    it('resolves with resolution text', async () => {
      DDDBottleneck.findByIdAndUpdate.mockReturnThis();
      DDDBottleneck.lean.mockResolvedValue({ _id: 'b1', status: 'resolved' });
      const r = await service.resolveBottleneck('b1', 'Added staff');
      expect(r.status).toBe('resolved');
    });
  });

  /* ── Gap Analysis ── */
  describe('gapAnalysis', () => {
    it('returns gaps when demand exceeds supply', async () => {
      const mockResource = makeModel();
      global.model.mockImplementation(n => (n === 'DDDResource' ? mockResource : null));
      mockResource.aggregate.mockResolvedValue([{ _id: 'PT', count: 2, totalCapacity: 1 }]);
      DDDDemandForecast.aggregate.mockResolvedValue([{ _id: 'PT', avgDemand: 100 }]);

      const r = await service.gapAnalysis('rehab', 'monthly');
      expect(r.gaps).toHaveLength(1);
      expect(r.gaps[0].serviceType).toBe('PT');
      expect(r.gaps[0].gap).toBe(60); // 100 - 1*40
    });

    it('returns empty gaps when supply meets demand', async () => {
      const mockResource = makeModel();
      global.model.mockImplementation(n => (n === 'DDDResource' ? mockResource : null));
      mockResource.aggregate.mockResolvedValue([{ _id: 'PT', count: 10, totalCapacity: 5 }]);
      DDDDemandForecast.aggregate.mockResolvedValue([{ _id: 'PT', avgDemand: 50 }]);

      const r = await service.gapAnalysis('rehab');
      expect(r.gaps).toEqual([]);
    });

    it('handles null resource model', async () => {
      DDDDemandForecast.aggregate.mockResolvedValue([{ _id: 'OT', avgDemand: 30 }]);
      const r = await service.gapAnalysis(null);
      expect(r.gaps).toHaveLength(1);
      expect(r.gaps[0].supply).toBe(0);
      expect(r.gaps[0].gapPercent).toBe(100);
    });
  });

  /* ── Stats ── */
  describe('getStats', () => {
    it('returns all stats', async () => {
      DDDCapacityPlan.countDocuments.mockResolvedValue(5);
      DDDDemandForecast.countDocuments.mockResolvedValue(20);
      DDDBottleneck.countDocuments.mockResolvedValueOnce(3).mockResolvedValueOnce(1);
      const r = await service.getStats('default');
      expect(r).toEqual({
        planCount: 5,
        forecastCount: 20,
        openBottlenecks: 3,
        criticalBottlenecks: 1,
        capacityRules: 2,
      });
    });
  });
});
