/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Inventory Manager — Phase 18 · Supply Chain & Inventory Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Medical supplies, equipment inventory, stock levels, reorder management,
 * expiry tracking, and inventory valuation for rehabilitation centres.
 *
 * Aggregates
 *   DDDInventoryItem     — catalogue of items / SKUs
 *   DDDStockLevel        — per-location stock quantities
 *   DDDStockTransaction  — movements (in / out / adjust / transfer)
 *   DDDReorderRule       — automatic reorder thresholds
 *
 * Canonical links
 *   locationId   → DDDBranch (dddTenantManager)
 *   supplierId   → DDDSupplier (dddProcurementEngine)
 *   assetId      → DDDAsset (dddAssetTracker)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

/** Lightweight base */
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

const ITEM_CATEGORIES = [
  'medical_supplies',
  'therapeutic_equipment',
  'assistive_devices',
  'consumables',
  'pharmaceuticals',
  'orthotics_prosthetics',
  'diagnostic_tools',
  'safety_equipment',
  'office_supplies',
  'cleaning_supplies',
  'linen_textiles',
  'it_equipment',
  'furniture',
  'maintenance_parts',
  'lab_supplies',
];

const ITEM_STATUSES = [
  'active',
  'inactive',
  'discontinued',
  'pending_approval',
  'recalled',
  'out_of_stock',
  'on_order',
  'quarantined',
  'expired',
  'damaged',
];

const STOCK_TRANSACTION_TYPES = [
  'receipt',
  'issue',
  'adjustment_increase',
  'adjustment_decrease',
  'transfer_in',
  'transfer_out',
  'return_to_supplier',
  'return_from_patient',
  'write_off',
  'disposal',
  'cycle_count',
  'initial_stock',
];

const UNIT_OF_MEASURES = [
  'each',
  'box',
  'pack',
  'case',
  'roll',
  'bottle',
  'tube',
  'pair',
  'set',
  'kg',
  'litre',
  'metre',
];

const STORAGE_CONDITIONS = [
  'room_temperature',
  'refrigerated',
  'frozen',
  'cool_dry',
  'humidity_controlled',
  'light_sensitive',
  'hazardous',
  'sterile',
  'flammable',
  'controlled_substance',
];

const VALUATION_METHODS = [
  'fifo',
  'lifo',
  'weighted_average',
  'specific_identification',
  'standard_cost',
  'replacement_cost',
];

/* ── Built-in inventory items ───────────────────────────────────────────── */
const BUILTIN_ITEMS = [
  {
    sku: 'INV-GLOVE-NIT',
    name: 'Nitrile Examination Gloves',
    nameAr: 'قفازات فحص نيتريل',
    category: 'medical_supplies',
    uom: 'box',
    reorderPoint: 50,
    reorderQty: 200,
  },
  {
    sku: 'INV-THERABAND',
    name: 'Resistance Therapy Bands Set',
    nameAr: 'أشرطة مقاومة للعلاج',
    category: 'therapeutic_equipment',
    uom: 'set',
    reorderPoint: 10,
    reorderQty: 30,
  },
  {
    sku: 'INV-ELEC-PAD',
    name: 'Electrode Pads (TENS)',
    nameAr: 'وسادات أقطاب كهربائية',
    category: 'therapeutic_equipment',
    uom: 'pack',
    reorderPoint: 20,
    reorderQty: 100,
  },
  {
    sku: 'INV-CRUTCH-ADJ',
    name: 'Adjustable Crutches (Pair)',
    nameAr: 'عكازات قابلة للتعديل',
    category: 'assistive_devices',
    uom: 'pair',
    reorderPoint: 5,
    reorderQty: 20,
  },
  {
    sku: 'INV-WHEELCHAIR',
    name: 'Standard Wheelchair',
    nameAr: 'كرسي متحرك قياسي',
    category: 'assistive_devices',
    uom: 'each',
    reorderPoint: 3,
    reorderQty: 10,
  },
  {
    sku: 'INV-SANITIZER',
    name: 'Hand Sanitizer 500ml',
    nameAr: 'معقم يدين 500مل',
    category: 'consumables',
    uom: 'bottle',
    reorderPoint: 30,
    reorderQty: 120,
  },
  {
    sku: 'INV-HOTPACK',
    name: 'Reusable Hot/Cold Pack',
    nameAr: 'كمادات ساخنة/باردة',
    category: 'therapeutic_equipment',
    uom: 'each',
    reorderPoint: 15,
    reorderQty: 50,
  },
  {
    sku: 'INV-GONIOMETER',
    name: 'Goniometer (Universal)',
    nameAr: 'جونيومتر عالمي',
    category: 'diagnostic_tools',
    uom: 'each',
    reorderPoint: 5,
    reorderQty: 15,
  },
  {
    sku: 'INV-SPLINT-WR',
    name: 'Wrist Splint (Adjustable)',
    nameAr: 'جبيرة معصم قابلة للتعديل',
    category: 'orthotics_prosthetics',
    uom: 'each',
    reorderPoint: 8,
    reorderQty: 30,
  },
  {
    sku: 'INV-TAPE-KIN',
    name: 'Kinesiology Tape Roll',
    nameAr: 'شريط حركي لاصق',
    category: 'consumables',
    uom: 'roll',
    reorderPoint: 25,
    reorderQty: 100,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Inventory Item ────────────────────────────────────────────────────── */
const inventoryItemSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    category: { type: String, enum: ITEM_CATEGORIES, required: true },
    status: { type: String, enum: ITEM_STATUSES, default: 'active' },
    uom: { type: String, enum: UNIT_OF_MEASURES, default: 'each' },
    barcode: { type: String },
    manufacturer: { type: String },
    model: { type: String },
    storageCondition: { type: String, enum: STORAGE_CONDITIONS, default: 'room_temperature' },
    unitCost: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    valuationMethod: { type: String, enum: VALUATION_METHODS, default: 'weighted_average' },
    isSerialTracked: { type: Boolean, default: false },
    isLotTracked: { type: Boolean, default: false },
    isPerishable: { type: Boolean, default: false },
    shelfLifeDays: { type: Number },
    supplierId: { type: Schema.Types.ObjectId },
    tags: [{ type: String }],
    images: [{ url: String, caption: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ category: 1, status: 1 });
inventoryItemSchema.index({ sku: 1 });

const DDDInventoryItem =
  mongoose.models.DDDInventoryItem || mongoose.model('DDDInventoryItem', inventoryItemSchema);

/* ── Stock Level ───────────────────────────────────────────────────────── */
const stockLevelSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInventoryItem', required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    quantityOnHand: { type: Number, default: 0 },
    quantityReserved: { type: Number, default: 0 },
    quantityOnOrder: { type: Number, default: 0 },
    quantityAvailable: { type: Number, default: 0 },
    lotNumber: { type: String },
    serialNumber: { type: String },
    expiryDate: { type: Date },
    lastCountDate: { type: Date },
    lastCountQty: { type: Number },
    binLocation: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

stockLevelSchema.index({ itemId: 1, locationId: 1 });
stockLevelSchema.index({ expiryDate: 1 });

const DDDStockLevel =
  mongoose.models.DDDStockLevel || mongoose.model('DDDStockLevel', stockLevelSchema);

/* ── Stock Transaction ─────────────────────────────────────────────────── */
const stockTransactionSchema = new Schema(
  {
    transactionNumber: { type: String, required: true, unique: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInventoryItem', required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: STOCK_TRANSACTION_TYPES, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number },
    totalCost: { type: Number },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    lotNumber: { type: String },
    serialNumber: { type: String },
    expiryDate: { type: Date },
    reason: { type: String },
    notes: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

stockTransactionSchema.index({ itemId: 1, createdAt: -1 });
stockTransactionSchema.index({ type: 1, createdAt: -1 });

const DDDStockTransaction =
  mongoose.models.DDDStockTransaction ||
  mongoose.model('DDDStockTransaction', stockTransactionSchema);

/* ── Reorder Rule ──────────────────────────────────────────────────────── */
const reorderRuleSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInventoryItem', required: true },
    locationId: { type: Schema.Types.ObjectId },
    reorderPoint: { type: Number, required: true },
    reorderQuantity: { type: Number, required: true },
    maxStockLevel: { type: Number },
    minStockLevel: { type: Number },
    leadTimeDays: { type: Number, default: 7 },
    isAutoReorder: { type: Boolean, default: false },
    preferredSupplierId: { type: Schema.Types.ObjectId },
    isActive: { type: Boolean, default: true },
    lastTriggered: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

reorderRuleSchema.index({ itemId: 1, locationId: 1 });

const DDDReorderRule =
  mongoose.models.DDDReorderRule || mongoose.model('DDDReorderRule', reorderRuleSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class InventoryManager extends BaseDomainModule {
  constructor() {
    super('InventoryManager', {
      description: 'Medical supplies & equipment inventory management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedItems();
    this.log('Inventory Manager initialised ✓');
    return true;
  }

  async _seedItems() {
    for (const it of BUILTIN_ITEMS) {
      const exists = await DDDInventoryItem.findOne({ sku: it.sku }).lean();
      if (!exists) await DDDInventoryItem.create({ ...it, status: 'active' });
    }
  }

  /* ── Items CRUD ── */
  async listItems(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.status) q.status = filters.status;
    if (filters.search)
      q.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { sku: { $regex: filters.search, $options: 'i' } },
      ];
    return DDDInventoryItem.find(q).sort({ name: 1 }).lean();
  }
  async getItem(id) {
    return DDDInventoryItem.findById(id).lean();
  }
  async getItemBySku(sku) {
    return DDDInventoryItem.findOne({ sku: sku.toUpperCase() }).lean();
  }
  async createItem(data) {
    return DDDInventoryItem.create(data);
  }
  async updateItem(id, data) {
    return DDDInventoryItem.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Stock Levels ── */
  async getStockLevels(itemId, locationId) {
    const q = { itemId };
    if (locationId) q.locationId = locationId;
    return DDDStockLevel.find(q).lean();
  }

  async adjustStock(itemId, locationId, quantityDelta, userId, reason) {
    let stock = await DDDStockLevel.findOne({ itemId, locationId });
    if (!stock)
      stock = await DDDStockLevel.create({
        itemId,
        locationId,
        quantityOnHand: 0,
        quantityAvailable: 0,
      });

    stock.quantityOnHand += quantityDelta;
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    await stock.save();

    const txnType = quantityDelta >= 0 ? 'adjustment_increase' : 'adjustment_decrease';
    await DDDStockTransaction.create({
      transactionNumber: `TXN-${Date.now()}`,
      itemId,
      locationId,
      type: txnType,
      quantity: Math.abs(quantityDelta),
      performedBy: userId,
      reason,
    });

    return stock;
  }

  async receiveStock(itemId, locationId, quantity, unitCost, userId, opts = {}) {
    let stock = await DDDStockLevel.findOne({ itemId, locationId });
    if (!stock)
      stock = await DDDStockLevel.create({
        itemId,
        locationId,
        quantityOnHand: 0,
        quantityAvailable: 0,
      });

    stock.quantityOnHand += quantity;
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    if (opts.lotNumber) stock.lotNumber = opts.lotNumber;
    if (opts.expiryDate) stock.expiryDate = opts.expiryDate;
    if (opts.binLocation) stock.binLocation = opts.binLocation;
    await stock.save();

    await DDDStockTransaction.create({
      transactionNumber: `TXN-${Date.now()}`,
      itemId,
      locationId,
      type: 'receipt',
      quantity,
      unitCost,
      totalCost: quantity * unitCost,
      performedBy: userId,
      lotNumber: opts.lotNumber,
      expiryDate: opts.expiryDate,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
    });

    return stock;
  }

  async issueStock(itemId, locationId, quantity, userId, opts = {}) {
    const stock = await DDDStockLevel.findOne({ itemId, locationId });
    if (!stock || stock.quantityAvailable < quantity) throw new Error('Insufficient stock');

    stock.quantityOnHand -= quantity;
    stock.quantityAvailable = stock.quantityOnHand - stock.quantityReserved;
    await stock.save();

    await DDDStockTransaction.create({
      transactionNumber: `TXN-${Date.now()}`,
      itemId,
      locationId,
      type: 'issue',
      quantity,
      performedBy: userId,
      referenceType: opts.referenceType,
      referenceId: opts.referenceId,
      reason: opts.reason,
    });

    return stock;
  }

  async transferStock(itemId, fromLocationId, toLocationId, quantity, userId) {
    await this.issueStock(itemId, fromLocationId, quantity, userId, { reason: 'Transfer out' });
    return this.receiveStock(itemId, toLocationId, quantity, 0, userId, {
      referenceType: 'transfer',
    });
  }

  /* ── Transactions ── */
  async listTransactions(filters = {}) {
    const q = {};
    if (filters.itemId) q.itemId = filters.itemId;
    if (filters.locationId) q.locationId = filters.locationId;
    if (filters.type) q.type = filters.type;
    if (filters.startDate || filters.endDate) {
      q.createdAt = {};
      if (filters.startDate) q.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) q.createdAt.$lte = new Date(filters.endDate);
    }
    return DDDStockTransaction.find(q).sort({ createdAt: -1 }).lean();
  }

  /* ── Reorder Rules ── */
  async listReorderRules(filters = {}) {
    const q = {};
    if (filters.itemId) q.itemId = filters.itemId;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDReorderRule.find(q).lean();
  }
  async createReorderRule(data) {
    return DDDReorderRule.create(data);
  }
  async updateReorderRule(id, data) {
    return DDDReorderRule.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async checkReorderAlerts() {
    const rules = await DDDReorderRule.find({ isActive: true }).lean();
    const alerts = [];
    for (const rule of rules) {
      const stocks = await DDDStockLevel.find({
        itemId: rule.itemId,
        ...(rule.locationId ? { locationId: rule.locationId } : {}),
      }).lean();
      const totalOnHand = stocks.reduce((s, st) => s + st.quantityOnHand, 0);
      if (totalOnHand <= rule.reorderPoint) {
        const item = await DDDInventoryItem.findById(rule.itemId).lean();
        alerts.push({
          rule,
          item,
          currentStock: totalOnHand,
          deficit: rule.reorderPoint - totalOnHand,
        });
      }
    }
    return alerts;
  }

  /* ── Expiry tracking ── */
  async getExpiringItems(daysBefore = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + daysBefore);
    return DDDStockLevel.find({ expiryDate: { $lte: cutoff, $gte: new Date() } })
      .populate('itemId')
      .lean();
  }

  /* ── Analytics ── */
  async getInventoryAnalytics() {
    const [totalItems, activeItems, outOfStock, transactions] = await Promise.all([
      DDDInventoryItem.countDocuments(),
      DDDInventoryItem.countDocuments({ status: 'active' }),
      DDDInventoryItem.countDocuments({ status: 'out_of_stock' }),
      DDDStockTransaction.countDocuments(),
    ]);
    const totalStockValue = await DDDStockLevel.aggregate([
      {
        $lookup: {
          from: 'dddinventoryitems',
          localField: 'itemId',
          foreignField: '_id',
          as: 'item',
        },
      },
      { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          total: { $sum: { $multiply: ['$quantityOnHand', { $ifNull: ['$item.unitCost', 0] }] } },
        },
      },
    ]);
    return {
      totalItems,
      activeItems,
      outOfStock,
      transactions,
      totalStockValue: totalStockValue[0]?.total || 0,
    };
  }

  /** Health check */
  async healthCheck() {
    const [items, stocks, txns, rules] = await Promise.all([
      DDDInventoryItem.countDocuments(),
      DDDStockLevel.countDocuments(),
      DDDStockTransaction.countDocuments(),
      DDDReorderRule.countDocuments(),
    ]);
    return { status: 'healthy', items, stocks, transactions: txns, reorderRules: rules };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createInventoryManagerRouter() {
  const router = Router();
  const svc = new InventoryManager();

  /* Items */
  router.get('/inventory/items', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listItems(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/inventory/items/:id', async (req, res) => {
    try {
      const d = await svc.getItem(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/inventory/items', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createItem(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/inventory/items/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateItem(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Stock Levels */
  router.get('/inventory/stock', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getStockLevels(req.query.itemId, req.query.locationId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/inventory/stock/receive', async (req, res) => {
    try {
      const { itemId, locationId, quantity, unitCost, userId, ...opts } = req.body;
      res.json({
        success: true,
        data: await svc.receiveStock(itemId, locationId, quantity, unitCost, userId, opts),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/inventory/stock/issue', async (req, res) => {
    try {
      const { itemId, locationId, quantity, userId, ...opts } = req.body;
      res.json({
        success: true,
        data: await svc.issueStock(itemId, locationId, quantity, userId, opts),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/inventory/stock/transfer', async (req, res) => {
    try {
      const { itemId, fromLocationId, toLocationId, quantity, userId } = req.body;
      res.json({
        success: true,
        data: await svc.transferStock(itemId, fromLocationId, toLocationId, quantity, userId),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/inventory/stock/adjust', async (req, res) => {
    try {
      const { itemId, locationId, quantityDelta, userId, reason } = req.body;
      res.json({
        success: true,
        data: await svc.adjustStock(itemId, locationId, quantityDelta, userId, reason),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Transactions */
  router.get('/inventory/transactions', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listTransactions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Reorder Rules */
  router.get('/inventory/reorder-rules', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listReorderRules(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/inventory/reorder-rules', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createReorderRule(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/inventory/reorder-rules/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateReorderRule(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Alerts & Expiry */
  router.get('/inventory/reorder-alerts', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.checkReorderAlerts() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/inventory/expiring', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getExpiringItems(Number(req.query.days) || 30) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/inventory/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getInventoryAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/inventory/health', async (_req, res) => {
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
  InventoryManager,
  DDDInventoryItem,
  DDDStockLevel,
  DDDStockTransaction,
  DDDReorderRule,
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  STOCK_TRANSACTION_TYPES,
  UNIT_OF_MEASURES,
  STORAGE_CONDITIONS,
  VALUATION_METHODS,
  BUILTIN_ITEMS,
  createInventoryManagerRouter,
};
