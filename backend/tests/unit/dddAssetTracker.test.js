'use strict';

/* ── helpers ── */
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

let service, DDDAsset, DDDAssetUsageLog, DDDAssetMaintenanceRecord;

beforeEach(() => {
  jest.resetModules();
  DDDAsset = makeModel();
  DDDAssetUsageLog = makeModel();
  DDDAssetMaintenanceRecord = makeModel();
  global.DDDAsset = DDDAsset;
  global.DDDAssetUsageLog = DDDAssetUsageLog;
  global.DDDAssetMaintenanceRecord = DDDAssetMaintenanceRecord;
  global.oid = jest.fn(v => v);

  jest.mock('../../services/base/BaseCrudService', () => {
    return class BaseCrudService {
      constructor() {}
      log() {}
      _create(M, data) {
        return M.create(data);
      }
      _update(M, id, data, opts) {
        return M.findByIdAndUpdate(id, data, { new: true, ...opts }).lean();
      }
      _list(M, filter, opts) {
        return M.find(filter)
          .sort(opts.sort || {})
          .lean();
      }
    };
  });

  service = require('../../services/dddAssetTracker');
});

afterEach(() => {
  delete global.DDDAsset;
  delete global.DDDAssetUsageLog;
  delete global.DDDAssetMaintenanceRecord;
  delete global.oid;
  jest.restoreAllMocks();
});

describe('dddAssetTracker', () => {
  /* ── listAssets ── */
  describe('listAssets', () => {
    it('returns paginated assets', async () => {
      DDDAsset.find.mockReturnThis();
      DDDAsset.sort.mockReturnThis();
      DDDAsset.skip.mockReturnThis();
      DDDAsset.limit.mockReturnThis();
      DDDAsset.lean.mockResolvedValue([{ _id: 'a1' }]);
      DDDAsset.countDocuments.mockResolvedValue(1);

      const r = await service.listAssets({});
      expect(r).toEqual({ data: [{ _id: 'a1' }], total: 1, page: 1, pages: 1 });
    });

    it('applies search filter', async () => {
      DDDAsset.find.mockReturnThis();
      DDDAsset.sort.mockReturnThis();
      DDDAsset.skip.mockReturnThis();
      DDDAsset.limit.mockReturnThis();
      DDDAsset.lean.mockResolvedValue([]);
      DDDAsset.countDocuments.mockResolvedValue(0);

      await service.listAssets({ search: 'wheelchair' });
      expect(DDDAsset.find).toHaveBeenCalled();
    });

    it('applies category and status filters', async () => {
      DDDAsset.find.mockReturnThis();
      DDDAsset.sort.mockReturnThis();
      DDDAsset.skip.mockReturnThis();
      DDDAsset.limit.mockReturnThis();
      DDDAsset.lean.mockResolvedValue([]);
      DDDAsset.countDocuments.mockResolvedValue(0);

      await service.listAssets({ category: 'therapy_equipment', status: 'available' });
      expect(DDDAsset.find).toHaveBeenCalled();
    });
  });

  /* ── getAsset ── */
  describe('getAsset', () => {
    it('returns asset by id', async () => {
      DDDAsset.findById.mockReturnThis();
      DDDAsset.lean.mockResolvedValue({ _id: 'a1', name: 'Treadmill' });
      const r = await service.getAsset('a1');
      expect(r.name).toBe('Treadmill');
    });
  });

  /* ── createAsset ── */
  describe('createAsset', () => {
    it('creates asset', async () => {
      DDDAsset.create.mockResolvedValue({ _id: 'a1' });
      const r = await service.createAsset({ name: 'Treadmill' });
      expect(r).toHaveProperty('_id');
    });

    it('auto-calculates next maintenance date', async () => {
      DDDAsset.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createAsset({ name: 'X', maintenanceIntervalDays: 90 });
      expect(r.nextMaintenanceDate).toBeInstanceOf(Date);
    });

    it('skips auto-calc when nextMaintenanceDate already set', async () => {
      const fixed = new Date('2030-01-01');
      DDDAsset.create.mockImplementation(d => Promise.resolve(d));
      const r = await service.createAsset({
        name: 'X',
        maintenanceIntervalDays: 90,
        nextMaintenanceDate: fixed,
      });
      expect(r.nextMaintenanceDate).toEqual(fixed);
    });
  });

  /* ── updateAsset ── */
  describe('updateAsset', () => {
    it('updates asset by id', async () => {
      DDDAsset.findByIdAndUpdate.mockReturnThis();
      DDDAsset.lean.mockResolvedValue({ _id: 'a1', name: 'Updated' });
      const r = await service.updateAsset('a1', { name: 'Updated' });
      expect(r.name).toBe('Updated');
    });
  });

  /* ── retireAsset ── */
  describe('retireAsset', () => {
    it('retires asset with reason', async () => {
      DDDAsset.findByIdAndUpdate.mockReturnThis();
      DDDAsset.lean.mockResolvedValue({ _id: 'a1', status: 'retired', isActive: false });
      const r = await service.retireAsset('a1', 'too old');
      expect(r.status).toBe('retired');
      expect(r.isActive).toBe(false);
    });
  });

  /* ── checkOut ── */
  describe('checkOut', () => {
    it('checks out available asset', async () => {
      DDDAsset.findById.mockResolvedValue({
        _id: 'a1',
        status: 'available',
        toObject: () => ({ _id: 'a1', status: 'available' }),
      });
      DDDAsset.findByIdAndUpdate.mockResolvedValue({});
      DDDAssetUsageLog.create.mockResolvedValue({ _id: 'log1' });

      const r = await service.checkOut('a1', 'u1', 'b1', 's1');
      expect(r).toHaveProperty('asset');
      expect(r).toHaveProperty('usageLog');
    });

    it('throws when asset not found', async () => {
      DDDAsset.findById.mockResolvedValue(null);
      await expect(service.checkOut('bad', 'u1')).rejects.toThrow('Asset not found');
    });

    it('throws when asset not available', async () => {
      DDDAsset.findById.mockResolvedValue({ _id: 'a1', status: 'in_use' });
      await expect(service.checkOut('a1', 'u1')).rejects.toThrow('cannot check out');
    });
  });

  /* ── checkIn ── */
  describe('checkIn', () => {
    it('checks in asset and calculates duration', async () => {
      DDDAsset.findById.mockResolvedValue({ _id: 'a1', condition: 'good' });
      DDDAssetUsageLog.findOne.mockReturnThis();
      DDDAssetUsageLog.sort.mockResolvedValue({
        _id: 'log1',
        checkedOutAt: new Date(Date.now() - 3600000), // 1 hour ago
      });
      DDDAssetUsageLog.findByIdAndUpdate.mockResolvedValue({});
      DDDAsset.findByIdAndUpdate.mockResolvedValue({});

      const r = await service.checkIn('a1', 'good', 'clean');
      expect(r).toHaveProperty('assetId', 'a1');
      expect(r).toHaveProperty('duration');
      expect(r).toHaveProperty('condition', 'good');
    });

    it('throws when asset not found', async () => {
      DDDAsset.findById.mockResolvedValue(null);
      await expect(service.checkIn('bad')).rejects.toThrow('Asset not found');
    });

    it('handles case with no usage log', async () => {
      DDDAsset.findById.mockResolvedValue({ _id: 'a1', condition: 'good' });
      DDDAssetUsageLog.findOne.mockReturnThis();
      DDDAssetUsageLog.sort.mockResolvedValue(null);
      DDDAsset.findByIdAndUpdate.mockResolvedValue({});

      const r = await service.checkIn('a1', 'fair');
      expect(r.duration).toBe(0);
    });
  });

  /* ── scheduleMaintenance ── */
  describe('scheduleMaintenance', () => {
    it('creates maintenance record', async () => {
      DDDAssetMaintenanceRecord.create.mockResolvedValue({ _id: 'm1' });
      DDDAsset.findByIdAndUpdate.mockResolvedValue({});
      const r = await service.scheduleMaintenance('a1', {
        scheduledDate: new Date(),
        type: 'preventive',
      });
      expect(r).toHaveProperty('_id');
    });
  });

  /* ── completeMaintenance ── */
  describe('completeMaintenance', () => {
    it('completes maintenance and updates asset', async () => {
      DDDAssetMaintenanceRecord.findByIdAndUpdate.mockReturnThis();
      DDDAssetMaintenanceRecord.lean.mockResolvedValue({
        _id: 'm1',
        assetId: 'a1',
        status: 'completed',
      });
      DDDAsset.findById.mockResolvedValue({
        _id: 'a1',
        maintenanceIntervalDays: 90,
        condition: 'good',
      });
      DDDAsset.findByIdAndUpdate.mockResolvedValue({});

      const r = await service.completeMaintenance('m1', { conditionAfter: 'excellent', cost: 500 });
      expect(r).toHaveProperty('status', 'completed');
    });

    it('handles null record gracefully', async () => {
      DDDAssetMaintenanceRecord.findByIdAndUpdate.mockReturnThis();
      DDDAssetMaintenanceRecord.lean.mockResolvedValue(null);
      const r = await service.completeMaintenance('bad', {});
      expect(r).toBeNull();
    });
  });

  /* ── listMaintenanceRecords ── */
  describe('listMaintenanceRecords', () => {
    it('returns paginated maintenance records', async () => {
      DDDAssetMaintenanceRecord.find.mockReturnThis();
      DDDAssetMaintenanceRecord.sort.mockReturnThis();
      DDDAssetMaintenanceRecord.skip.mockReturnThis();
      DDDAssetMaintenanceRecord.limit.mockReturnThis();
      DDDAssetMaintenanceRecord.populate.mockReturnThis();
      DDDAssetMaintenanceRecord.lean.mockResolvedValue([{ _id: 'm1' }]);
      DDDAssetMaintenanceRecord.countDocuments.mockResolvedValue(1);

      const r = await service.listMaintenanceRecords({});
      expect(r).toEqual({ data: [{ _id: 'm1' }], total: 1, page: 1, pages: 1 });
    });
  });

  /* ── getOverdueMaintenance ── */
  describe('getOverdueMaintenance', () => {
    it('returns overdue assets', async () => {
      DDDAsset.find.mockReturnThis();
      DDDAsset.sort.mockReturnThis();
      DDDAsset.lean.mockResolvedValue([{ _id: 'a1' }]);
      const r = await service.getOverdueMaintenance();
      expect(r).toHaveLength(1);
    });
  });

  /* ── getUsageHistory ── */
  describe('getUsageHistory', () => {
    it('returns usage logs for an asset', async () => {
      DDDAssetUsageLog.find.mockReturnThis();
      DDDAssetUsageLog.sort.mockReturnThis();
      DDDAssetUsageLog.limit.mockReturnThis();
      DDDAssetUsageLog.populate.mockReturnThis();
      DDDAssetUsageLog.lean.mockResolvedValue([{ _id: 'log1' }]);

      const r = await service.getUsageHistory('a1');
      expect(r).toHaveLength(1);
    });

    it('applies date range filter', async () => {
      DDDAssetUsageLog.find.mockReturnThis();
      DDDAssetUsageLog.sort.mockReturnThis();
      DDDAssetUsageLog.limit.mockReturnThis();
      DDDAssetUsageLog.populate.mockReturnThis();
      DDDAssetUsageLog.lean.mockResolvedValue([]);

      await service.getUsageHistory('a1', { from: '2024-01-01', to: '2024-12-31' });
      expect(DDDAssetUsageLog.find).toHaveBeenCalled();
    });
  });

  /* ── getUtilizationReport ── */
  describe('getUtilizationReport', () => {
    it('returns utilization report for assets', async () => {
      DDDAsset.find.mockReturnThis();
      DDDAsset.lean.mockResolvedValue([
        {
          _id: 'a1',
          code: 'EQ-001',
          name: 'Treadmill',
          category: 'fitness',
          maxUsageHoursPerDay: 8,
        },
      ]);
      DDDAssetUsageLog.find.mockReturnThis();
      DDDAssetUsageLog.lean.mockResolvedValue([{ durationMinutes: 120 }, { durationMinutes: 60 }]);

      const r = await service.getUtilizationReport('2024-01-01', '2024-01-07');
      expect(r).toHaveProperty('period');
      expect(r).toHaveProperty('assets');
      expect(r).toHaveProperty('totalAssets', 1);
      expect(r.assets[0]).toHaveProperty('utilizationPercent');
    });
  });

  /* ── getStats ── */
  describe('getStats', () => {
    it('returns asset statistics', async () => {
      DDDAsset.countDocuments
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(3) // overdue
        .mockResolvedValueOnce(5); // inUse
      DDDAsset.aggregate
        .mockResolvedValueOnce([{ _id: 'therapy_equipment', count: 20 }]) // byCategory
        .mockResolvedValueOnce([{ _id: 'available', count: 30 }]); // byStatus

      const r = await service.getStats();
      expect(r).toHaveProperty('total', 50);
      expect(r).toHaveProperty('byCategory');
      expect(r).toHaveProperty('byStatus');
      expect(r).toHaveProperty('overdueMaintenance');
      expect(r).toHaveProperty('currentlyInUse');
      expect(r).toHaveProperty('builtinTypes');
    });
  });
});
