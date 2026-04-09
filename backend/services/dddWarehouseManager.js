/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Warehouse Manager — Phase 18 · Supply Chain & Inventory Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Warehouse / storage facility management, bin-level storage, picking & packing,
 * cycle counting, warehouse layout, and distribution management.
 *
 * Aggregates
 *   DDDWarehouse         — warehouse / storage facility master
 *   DDDStorageBin        — individual storage locations (bins / shelves)
 *   DDDPickList          — pick lists for order fulfilment
 *   DDDCycleCount        — periodic stock verification counts
 *
 * Canonical links
 *   itemId       → DDDInventoryItem (dddInventoryManager)
 *   locationId   → DDDBranch (dddTenantManager)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const WAREHOUSE_TYPES = [
  'central',
  'satellite',
  'cold_storage',
  'hazardous_materials',
  'sterile',
  'general',
  'distribution_centre',
  'quarantine',
  'returns_processing',
  'archive',
  'mobile_unit',
];

const WAREHOUSE_STATUSES = [
  'active',
  'inactive',
  'under_maintenance',
  'full_capacity',
  'restricted',
  'decommissioned',
  'planned',
  'temporary',
];

const BIN_TYPES = [
  'shelf',
  'rack',
  'drawer',
  'cabinet',
  'floor_area',
  'cold_room',
  'freezer',
  'safe',
  'pallet_position',
  'staging_area',
  'receiving_dock',
  'shipping_dock',
];

const PICK_LIST_STATUSES = [
  'created',
  'assigned',
  'in_progress',
  'partially_picked',
  'picked',
  'packed',
  'shipped',
  'cancelled',
  'on_hold',
];

const CYCLE_COUNT_STATUSES = [
  'scheduled',
  'in_progress',
  'counting',
  'review',
  'approved',
  'adjusted',
  'completed',
  'cancelled',
];

const ZONE_TYPES = [
  'receiving',
  'storage',
  'picking',
  'packing',
  'shipping',
  'quarantine',
  'returns',
  'staging',
  'cold_chain',
  'hazardous',
  'high_value',
  'bulk',
];

/* ── Built-in warehouses ────────────────────────────────────────────────── */
const BUILTIN_WAREHOUSES = [
  {
    code: 'WH-MAIN',
    name: 'Main Distribution Warehouse',
    nameAr: 'المستودع الرئيسي للتوزيع',
    type: 'central',
    capacity: 10000,
  },
  {
    code: 'WH-REHAB',
    name: 'Rehabilitation Equipment Store',
    nameAr: 'مخزن معدات التأهيل',
    type: 'general',
    capacity: 3000,
  },
  {
    code: 'WH-COLD',
    name: 'Cold Storage Facility',
    nameAr: 'مرفق التخزين البارد',
    type: 'cold_storage',
    capacity: 500,
  },
  {
    code: 'WH-STERILE',
    name: 'Sterile Supplies Room',
    nameAr: 'غرفة المستلزمات المعقمة',
    type: 'sterile',
    capacity: 800,
  },
  {
    code: 'WH-AT',
    name: 'Assistive Technology Warehouse',
    nameAr: 'مستودع التقنيات المساعدة',
    type: 'general',
    capacity: 2000,
  },
  {
    code: 'WH-PHARM',
    name: 'Pharmacy Storage',
    nameAr: 'مخزن الصيدلية',
    type: 'general',
    capacity: 1500,
  },
  {
    code: 'WH-QUAR',
    name: 'Quarantine Area',
    nameAr: 'منطقة الحجر',
    type: 'quarantine',
    capacity: 200,
  },
  {
    code: 'WH-SAT-N',
    name: 'North Branch Satellite Store',
    nameAr: 'مخزن الفرع الشمالي',
    type: 'satellite',
    capacity: 1000,
  },
  {
    code: 'WH-SAT-S',
    name: 'South Branch Satellite Store',
    nameAr: 'مخزن الفرع الجنوبي',
    type: 'satellite',
    capacity: 1000,
  },
  {
    code: 'WH-MOB',
    name: 'Mobile Supply Unit',
    nameAr: 'وحدة إمداد متنقلة',
    type: 'mobile_unit',
    capacity: 300,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Warehouse ─────────────────────────────────────────────────────────── */
const warehouseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: WAREHOUSE_TYPES, required: true },
    status: { type: String, enum: WAREHOUSE_STATUSES, default: 'active' },
    locationId: { type: Schema.Types.ObjectId },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      coordinates: { lat: Number, lng: Number },
    },
    capacity: { type: Number, default: 0 },
    usedCapacity: { type: Number, default: 0 },
    zones: [
      {
        code: { type: String },
        name: { type: String },
        type: { type: String, enum: ZONE_TYPES },
        capacity: { type: Number },
      },
    ],
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    operatingHours: {
      weekdays: { open: String, close: String },
      weekends: { open: String, close: String },
    },
    contactPhone: { type: String },
    contactEmail: { type: String },
    isTemperatureControlled: { type: Boolean, default: false },
    temperatureRange: { min: Number, max: Number },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

warehouseSchema.index({ type: 1, status: 1 });
warehouseSchema.index({ code: 1 });

const DDDWarehouse =
  mongoose.models.DDDWarehouse || mongoose.model('DDDWarehouse', warehouseSchema);

/* ── Storage Bin ───────────────────────────────────────────────────────── */
const storageBinSchema = new Schema(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'DDDWarehouse', required: true },
    binCode: { type: String, required: true },
    type: { type: String, enum: BIN_TYPES, default: 'shelf' },
    zone: { type: String },
    aisle: { type: String },
    rack: { type: String },
    level: { type: String },
    position: { type: String },
    capacity: { type: Number, default: 0 },
    usedCapacity: { type: Number, default: 0 },
    isOccupied: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    assignedItems: [
      {
        itemId: { type: Schema.Types.ObjectId },
        quantity: { type: Number },
        lotNumber: { type: String },
      },
    ],
    restrictions: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

storageBinSchema.index({ warehouseId: 1, binCode: 1 });
storageBinSchema.index({ zone: 1, type: 1 });

const DDDStorageBin =
  mongoose.models.DDDStorageBin || mongoose.model('DDDStorageBin', storageBinSchema);

/* ── Pick List ─────────────────────────────────────────────────────────── */
const pickListSchema = new Schema(
  {
    pickNumber: { type: String, required: true, unique: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'DDDWarehouse', required: true },
    status: { type: String, enum: PICK_LIST_STATUSES, default: 'created' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, required: true },
        binId: { type: Schema.Types.ObjectId, ref: 'DDDStorageBin' },
        requestedQty: { type: Number, required: true },
        pickedQty: { type: Number, default: 0 },
        lotNumber: { type: String },
        status: {
          type: String,
          enum: ['pending', 'picked', 'short', 'substituted'],
          default: 'pending',
        },
      },
    ],
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    startedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

pickListSchema.index({ warehouseId: 1, status: 1 });

const DDDPickList = mongoose.models.DDDPickList || mongoose.model('DDDPickList', pickListSchema);

/* ── Cycle Count ───────────────────────────────────────────────────────── */
const cycleCountSchema = new Schema(
  {
    countNumber: { type: String, required: true, unique: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'DDDWarehouse', required: true },
    status: { type: String, enum: CYCLE_COUNT_STATUSES, default: 'scheduled' },
    countType: {
      type: String,
      enum: ['full', 'partial', 'abc_class', 'random_sample', 'zone'],
      default: 'full',
    },
    zone: { type: String },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, required: true },
        binId: { type: Schema.Types.ObjectId, ref: 'DDDStorageBin' },
        systemQty: { type: Number },
        countedQty: { type: Number },
        variance: { type: Number },
        varianceValue: { type: Number },
        isReconciled: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    totalItems: { type: Number, default: 0 },
    totalVariances: { type: Number, default: 0 },
    varianceRate: { type: Number, default: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

cycleCountSchema.index({ warehouseId: 1, status: 1 });

const DDDCycleCount =
  mongoose.models.DDDCycleCount || mongoose.model('DDDCycleCount', cycleCountSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class WarehouseManager extends BaseDomainModule {
  constructor() {
    super('WarehouseManager', {
      description: 'Warehouse & storage facility management, picking & counting',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedWarehouses();
    this.log('Warehouse Manager initialised ✓');
    return true;
  }

  async _seedWarehouses() {
    for (const w of BUILTIN_WAREHOUSES) {
      const exists = await DDDWarehouse.findOne({ code: w.code }).lean();
      if (!exists) await DDDWarehouse.create({ ...w, status: 'active' });
    }
  }

  /* ── Warehouses CRUD ── */
  async listWarehouses(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDWarehouse.find(q).sort({ name: 1 }).lean();
  }
  async getWarehouse(id) {
    return DDDWarehouse.findById(id).lean();
  }
  async createWarehouse(data) {
    return DDDWarehouse.create(data);
  }
  async updateWarehouse(id, data) {
    return DDDWarehouse.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Storage Bins ── */
  async listBins(warehouseId, filters = {}) {
    const q = { warehouseId };
    if (filters.type) q.type = filters.type;
    if (filters.zone) q.zone = filters.zone;
    if (filters.isOccupied !== undefined) q.isOccupied = filters.isOccupied;
    return DDDStorageBin.find(q).sort({ binCode: 1 }).lean();
  }
  async getBin(id) {
    return DDDStorageBin.findById(id).lean();
  }
  async createBin(data) {
    return DDDStorageBin.create(data);
  }
  async updateBin(id, data) {
    return DDDStorageBin.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async assignItemToBin(binId, itemId, quantity, lotNumber) {
    const bin = await DDDStorageBin.findById(binId);
    if (!bin) throw new Error('Bin not found');
    const existing = bin.assignedItems.find(
      a => String(a.itemId) === String(itemId) && (a.lotNumber || '') === (lotNumber || '')
    );
    if (existing) existing.quantity += quantity;
    else bin.assignedItems.push({ itemId, quantity, lotNumber });
    bin.isOccupied = bin.assignedItems.length > 0;
    bin.usedCapacity = bin.assignedItems.reduce((s, a) => s + a.quantity, 0);
    await bin.save();
    return bin;
  }

  /* ── Pick Lists ── */
  async listPickLists(warehouseId, filters = {}) {
    const q = { warehouseId };
    if (filters.status) q.status = filters.status;
    if (filters.assignedTo) q.assignedTo = filters.assignedTo;
    return DDDPickList.find(q).sort({ createdAt: -1 }).lean();
  }
  async getPickList(id) {
    return DDDPickList.findById(id).lean();
  }

  async createPickList(data) {
    if (!data.pickNumber) data.pickNumber = `PK-${Date.now()}`;
    return DDDPickList.create(data);
  }

  async updatePickItem(pickListId, itemIndex, pickedQty) {
    const pl = await DDDPickList.findById(pickListId);
    if (!pl || !pl.items[itemIndex]) throw new Error('Pick list or item not found');
    pl.items[itemIndex].pickedQty = pickedQty;
    pl.items[itemIndex].status = pickedQty >= pl.items[itemIndex].requestedQty ? 'picked' : 'short';
    const allDone = pl.items.every(
      i => i.status === 'picked' || i.status === 'short' || i.status === 'substituted'
    );
    if (allDone) {
      pl.status = 'picked';
      pl.completedAt = new Date();
    } else if (!pl.startedAt) {
      pl.startedAt = new Date();
      pl.status = 'in_progress';
    }
    await pl.save();
    return pl;
  }

  /* ── Cycle Counts ── */
  async listCycleCounts(warehouseId, filters = {}) {
    const q = { warehouseId };
    if (filters.status) q.status = filters.status;
    return DDDCycleCount.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async getCycleCount(id) {
    return DDDCycleCount.findById(id).lean();
  }

  async createCycleCount(data) {
    if (!data.countNumber) data.countNumber = `CC-${Date.now()}`;
    data.totalItems = (data.items || []).length;
    return DDDCycleCount.create(data);
  }

  async recordCount(countId, itemIndex, countedQty) {
    const cc = await DDDCycleCount.findById(countId);
    if (!cc || !cc.items[itemIndex]) throw new Error('Cycle count or item not found');
    cc.items[itemIndex].countedQty = countedQty;
    cc.items[itemIndex].variance = countedQty - (cc.items[itemIndex].systemQty || 0);
    const counted = cc.items.filter(i => i.countedQty !== null && i.countedQty !== undefined);
    cc.totalVariances = counted.filter(i => i.variance !== 0).length;
    cc.varianceRate = counted.length > 0 ? (cc.totalVariances / counted.length) * 100 : 0;
    if (counted.length === cc.items.length) cc.status = 'review';
    else cc.status = 'counting';
    await cc.save();
    return cc;
  }

  async approveCycleCount(countId, userId) {
    return DDDCycleCount.findByIdAndUpdate(
      countId,
      { status: 'approved', approvedBy: userId, completedAt: new Date() },
      { new: true }
    );
  }

  /* ── Analytics ── */
  async getWarehouseAnalytics() {
    const [warehouses, bins, pickLists, cycleCounts] = await Promise.all([
      DDDWarehouse.countDocuments(),
      DDDStorageBin.countDocuments(),
      DDDPickList.countDocuments(),
      DDDCycleCount.countDocuments(),
    ]);
    const active = await DDDWarehouse.countDocuments({ status: 'active' });
    const occupiedBins = await DDDStorageBin.countDocuments({ isOccupied: true });
    const openPicks = await DDDPickList.countDocuments({
      status: { $in: ['created', 'assigned', 'in_progress'] },
    });
    return {
      warehouses,
      activeWarehouses: active,
      bins,
      occupiedBins,
      pickLists,
      openPicks,
      cycleCounts,
    };
  }

  async healthCheck() {
    const [warehouses, bins, picks, counts] = await Promise.all([
      DDDWarehouse.countDocuments(),
      DDDStorageBin.countDocuments(),
      DDDPickList.countDocuments(),
      DDDCycleCount.countDocuments(),
    ]);
    return { status: 'healthy', warehouses, bins, pickLists: picks, cycleCounts: counts };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createWarehouseManagerRouter() {
  const router = Router();
  const svc = new WarehouseManager();

  /* Warehouses */
  router.get('/warehouse/warehouses', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listWarehouses(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/warehouse/warehouses/:id', async (req, res) => {
    try {
      const d = await svc.getWarehouse(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/warehouses', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createWarehouse(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/warehouse/warehouses/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateWarehouse(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Storage Bins */
  router.get('/warehouse/:warehouseId/bins', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listBins(req.params.warehouseId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/warehouse/bins/:id', async (req, res) => {
    try {
      const d = await svc.getBin(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/bins', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createBin(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/bins/:id/assign', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.assignItemToBin(
          req.params.id,
          req.body.itemId,
          req.body.quantity,
          req.body.lotNumber
        ),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Pick Lists */
  router.get('/warehouse/:warehouseId/pick-lists', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPickLists(req.params.warehouseId, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/warehouse/pick-lists/:id', async (req, res) => {
    try {
      const d = await svc.getPickList(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/pick-lists', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPickList(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/pick-lists/:id/pick-item', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updatePickItem(req.params.id, req.body.itemIndex, req.body.pickedQty),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Cycle Counts */
  router.get('/warehouse/:warehouseId/cycle-counts', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.listCycleCounts(req.params.warehouseId, req.query),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/warehouse/cycle-counts/:id', async (req, res) => {
    try {
      const d = await svc.getCycleCount(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/cycle-counts', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createCycleCount(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/cycle-counts/:id/record', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.recordCount(req.params.id, req.body.itemIndex, req.body.countedQty),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/warehouse/cycle-counts/:id/approve', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.approveCycleCount(req.params.id, req.body.userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/warehouse/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getWarehouseAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/warehouse/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  WarehouseManager,
  DDDWarehouse,
  DDDStorageBin,
  DDDPickList,
  DDDCycleCount,
  WAREHOUSE_TYPES,
  WAREHOUSE_STATUSES,
  BIN_TYPES,
  PICK_LIST_STATUSES,
  CYCLE_COUNT_STATUSES,
  ZONE_TYPES,
  BUILTIN_WAREHOUSES,
  createWarehouseManagerRouter,
};
