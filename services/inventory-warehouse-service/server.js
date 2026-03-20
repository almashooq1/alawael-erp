'use strict';
const express = require('express');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const helmet = require('helmet');
const cors = require('cors');
const { Queue } = require('bullmq');
const cron = require('node-cron');

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));

/* ═══════════════════════════════════════════════════════════════
   التخطيطات — Schemas
   ═══════════════════════════════════════════════════════════════ */

// ── مستودع  Warehouse ──────────────────────────────────────────
const warehouseSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: { type: String, enum: ['main', 'sub', 'mobile', 'cold-storage', 'hazardous'], default: 'main' },
    branchId: String,
    location: { building: String, floor: String, room: String },
    capacity: { total: Number, used: { type: Number, default: 0 }, unit: { type: String, default: 'sqm' } },
    manager: { userId: String, name: String, phone: String },
    conditions: { tempMin: Number, tempMax: Number, humidity: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

warehouseSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await this.constructor.countDocuments();
    this.code = `WH-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ── تصنيف المنتج  Category ─────────────────────────────────────
const categorySchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true },
    nameEn: String,
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    level: { type: Number, default: 0 },
    path: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    icon: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ── منتج / صنف  Product ────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    sku: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    type: {
      type: String,
      enum: [
        'school-supply',
        'medical',
        'cleaning',
        'office',
        'educational',
        'safety',
        'food',
        'uniform',
        'technology',
        'furniture',
        'other',
      ],
      default: 'school-supply',
    },
    unit: { type: String, enum: ['piece', 'box', 'pack', 'kg', 'liter', 'meter', 'roll', 'set', 'pair'], default: 'piece' },
    barcode: String,
    description: String,
    brand: String,
    specifications: mongoose.Schema.Types.Mixed,
    images: [String],
    reorderPoint: { type: Number, default: 10 },
    maxStock: { type: Number, default: 1000 },
    minOrderQty: { type: Number, default: 1 },
    costPrice: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    vatRate: { type: Number, default: 15 },
    isPerishable: { type: Boolean, default: false },
    shelfLifeDays: Number,
    storageConditions: { tempMin: Number, tempMax: Number, humidity: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

productSchema.pre('save', async function (next) {
  if (!this.sku) {
    const prefix = (this.type || 'other').substring(0, 3).toUpperCase();
    const count = await this.constructor.countDocuments();
    this.sku = `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

// ── مخزون  StockLevel ───────────────────────────────────────────
const stockLevelSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    binLocation: String,
    lastCounted: Date,
    lastCountedBy: String,
  },
  { timestamps: true },
);

stockLevelSchema.index({ productId: 1, warehouseId: 1 }, { unique: true });
stockLevelSchema.pre('save', function (next) {
  this.available = this.quantity - this.reserved;
  next();
});

// ── حركة مخزنية  StockMovement ──────────────────────────────────
const stockMovementSchema = new mongoose.Schema(
  {
    movementNo: { type: String, unique: true },
    type: {
      type: String,
      enum: ['receive', 'issue', 'transfer', 'return', 'adjust-add', 'adjust-subtract', 'scrap', 'donation'],
      required: true,
    },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    fromWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    toWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    quantity: { type: Number, required: true },
    unitCost: Number,
    totalCost: Number,
    batchNo: String,
    expiryDate: Date,
    reason: String,
    reference: { type: String, docId: String },
    departmentId: String,
    requestedBy: { userId: String, name: String },
    approvedBy: { userId: String, name: String },
    status: { type: String, enum: ['pending', 'approved', 'completed', 'rejected', 'cancelled'], default: 'pending' },
  },
  { timestamps: true },
);

stockMovementSchema.pre('save', async function (next) {
  if (!this.movementNo) {
    const count = await this.constructor.countDocuments();
    this.movementNo = `MOV-${String(count + 1).padStart(6, '0')}`;
  }
  this.totalCost = (this.unitCost || 0) * this.quantity;
  next();
});

// ── طلب شراء  PurchaseOrder ─────────────────────────────────────
const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true },
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        unitCost: Number,
        totalCost: Number,
        receivedQty: { type: Number, default: 0 },
        status: { type: String, enum: ['pending', 'partial', 'received', 'cancelled'], default: 'pending' },
      },
    ],
    subtotal: Number,
    vatAmount: Number,
    total: Number,
    currency: { type: String, default: 'SAR' },
    status: {
      type: String,
      enum: ['draft', 'pending-approval', 'approved', 'ordered', 'partial-received', 'received', 'cancelled'],
      default: 'draft',
    },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    expectedDelivery: Date,
    actualDelivery: Date,
    notes: String,
    approvals: [
      {
        userId: String,
        name: String,
        action: String,
        date: Date,
        comment: String,
      },
    ],
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

purchaseOrderSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const count = await this.constructor.countDocuments();
    this.poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.items?.length) {
    this.items.forEach(i => {
      i.totalCost = (i.unitCost || 0) * (i.quantity || 0);
    });
    this.subtotal = this.items.reduce((s, i) => s + (i.totalCost || 0), 0);
    this.vatAmount = this.subtotal * 0.15;
    this.total = this.subtotal + this.vatAmount;
  }
  next();
});

// ── مورد  Supplier ──────────────────────────────────────────────
const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    type: { type: String, enum: ['local', 'international', 'government'], default: 'local' },
    category: {
      type: String,
      enum: ['school-supplies', 'medical', 'food', 'cleaning', 'technology', 'furniture', 'uniforms', 'general'],
      default: 'general',
    },
    crNumber: String,
    vatNumber: String,
    contact: { person: String, phone: String, email: String, mobile: String },
    address: { street: String, city: String, region: String, postalCode: String, country: { type: String, default: 'SA' } },
    bankDetails: { bankName: String, iban: String, accountName: String },
    paymentTerms: { type: String, enum: ['cash', 'net-15', 'net-30', 'net-60', 'net-90'], default: 'net-30' },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    certifications: [String],
    blacklisted: { type: Boolean, default: false },
    notes: String,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

supplierSchema.pre('save', async function (next) {
  if (!this.code) {
    const count = await this.constructor.countDocuments();
    this.code = `SUP-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// ── جرد فعلي  StockCount ────────────────────────────────────────
const stockCountSchema = new mongoose.Schema(
  {
    countNo: { type: String, unique: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    type: { type: String, enum: ['full', 'partial', 'cycle', 'spot-check'], default: 'full' },
    status: { type: String, enum: ['planned', 'in-progress', 'completed', 'approved', 'cancelled'], default: 'planned' },
    scheduledDate: Date,
    startDate: Date,
    completedDate: Date,
    items: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        systemQty: Number,
        countedQty: Number,
        variance: Number,
        varianceValue: Number,
        notes: String,
        countedBy: { userId: String, name: String },
      },
    ],
    totalVariance: Number,
    totalVarianceValue: Number,
    summary: { totalItems: Number, matched: Number, surplus: Number, shortage: Number },
    assignedTo: [{ userId: String, name: String }],
    approvedBy: { userId: String, name: String, date: Date },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

stockCountSchema.pre('save', async function (next) {
  if (!this.countNo) {
    const count = await this.constructor.countDocuments();
    this.countNo = `SC-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;
  }
  if (this.items?.length) {
    this.items.forEach(i => {
      i.variance = (i.countedQty || 0) - (i.systemQty || 0);
    });
    const matched = this.items.filter(i => i.variance === 0).length;
    const surplus = this.items.filter(i => i.variance > 0).length;
    const shortage = this.items.filter(i => i.variance < 0).length;
    this.summary = { totalItems: this.items.length, matched, surplus, shortage };
    this.totalVariance = this.items.reduce((s, i) => s + Math.abs(i.variance || 0), 0);
  }
  next();
});

const Warehouse = mongoose.model('Warehouse', warehouseSchema);
const Category = mongoose.model('Category', categorySchema);
const Product = mongoose.model('Product', productSchema);
const StockLevel = mongoose.model('StockLevel', stockLevelSchema);
const StockMovement = mongoose.model('StockMovement', stockMovementSchema);
const PurchaseOrder = mongoose.model('PurchaseOrder', purchaseOrderSchema);
const Supplier = mongoose.model('Supplier', supplierSchema);
const StockCount = mongoose.model('StockCount', stockCountSchema);

/* ═══════════════════════════════════════════════════════════════
   الاتصالات — Connections
   ═══════════════════════════════════════════════════════════════ */
const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_inventory';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3450;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const stockQueue = new Queue('inventory-stock', { connection: redis });

/* ═══════════════════════════════════════════════════════════════
   المسارات — Routes
   ═══════════════════════════════════════════════════════════════ */

// ─── Health ──────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({
      status: mongo && red ? 'ok' : 'degraded',
      service: 'inventory-warehouse-service',
      mongo,
      redis: red,
      uptime: process.uptime(),
    });
});

// ─── Warehouses ──────────────────────────────────────────────
app.post('/api/warehouses', async (req, res) => {
  try {
    res.status(201).json(await Warehouse.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/warehouses', async (req, res) => {
  const { branchId, type, active } = req.query;
  const q = {};
  if (branchId) q.branchId = branchId;
  if (type) q.type = type;
  if (active !== undefined) q.isActive = active === 'true';
  res.json(await Warehouse.find(q).sort({ code: 1 }));
});
app.get('/api/warehouses/:id', async (req, res) => {
  const w = await Warehouse.findById(req.params.id);
  if (!w) return res.status(404).json({ error: 'المستودع غير موجود' });
  res.json(w);
});
app.put('/api/warehouses/:id', async (req, res) => {
  const w = await Warehouse.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(w);
});
app.get('/api/warehouses/:id/utilization', async (req, res) => {
  const w = await Warehouse.findById(req.params.id);
  const totalStock = await StockLevel.aggregate([
    { $match: { warehouseId: new mongoose.Types.ObjectId(req.params.id) } },
    { $group: { _id: null, total: { $sum: '$quantity' } } },
  ]);
  res.json({
    warehouse: w?.nameAr,
    capacity: w?.capacity,
    currentStock: totalStock[0]?.total || 0,
    utilization: w?.capacity?.total ? (((totalStock[0]?.total || 0) / w.capacity.total) * 100).toFixed(1) + '%' : 'N/A',
  });
});

// ─── Categories ──────────────────────────────────────────────
app.post('/api/categories', async (req, res) => {
  try {
    if (req.body.parentId) {
      const parent = await Category.findById(req.body.parentId);
      if (parent) {
        req.body.level = parent.level + 1;
        req.body.path = [...parent.path, parent._id];
      }
    }
    res.status(201).json(await Category.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/categories', async (_req, res) => {
  const cats = await Category.find({ isActive: true }).sort({ level: 1, nameAr: 1 });
  // Build tree
  const map = {};
  const tree = [];
  cats.forEach(c => {
    map[c._id] = { ...c.toObject(), children: [] };
  });
  cats.forEach(c => {
    if (c.parentId && map[c.parentId]) map[c.parentId].children.push(map[c._id]);
    else tree.push(map[c._id]);
  });
  res.json(tree);
});

// ─── Products ────────────────────────────────────────────────
app.post('/api/products', async (req, res) => {
  try {
    res.status(201).json(await Product.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/products', async (req, res) => {
  const { type, categoryId, search, page = 1, limit = 50 } = req.query;
  const q = { isActive: true };
  if (type) q.type = type;
  if (categoryId) q.categoryId = categoryId;
  if (search)
    q.$or = [
      { nameAr: new RegExp(search, 'i') },
      { nameEn: new RegExp(search, 'i') },
      { sku: new RegExp(search, 'i') },
      { barcode: search },
    ];
  const [data, total] = await Promise.all([
    Product.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ nameAr: 1 }),
    Product.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/products/:id', async (req, res) => {
  const p = await Product.findById(req.params.id).populate('categoryId');
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' });
  const stocks = await StockLevel.find({ productId: p._id }).populate('warehouseId', 'nameAr code');
  res.json({ ...p.toObject(), stocks });
});
app.put('/api/products/:id', async (req, res) => {
  res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// ─── Stock Levels ────────────────────────────────────────────
app.get('/api/stock', async (req, res) => {
  const { warehouseId, productId, lowStock } = req.query;
  const q = {};
  if (warehouseId) q.warehouseId = warehouseId;
  if (productId) q.productId = productId;
  if (lowStock === 'true') {
    const products = await Product.find({}, '_id reorderPoint');
    const lowIds = [];
    for (const p of products) {
      const sl = await StockLevel.aggregate([{ $match: { productId: p._id } }, { $group: { _id: null, total: { $sum: '$available' } } }]);
      if ((sl[0]?.total || 0) <= p.reorderPoint) lowIds.push(p._id);
    }
    q.productId = { $in: lowIds };
  }
  const data = await StockLevel.find(q).populate('productId', 'nameAr sku type reorderPoint').populate('warehouseId', 'nameAr code');
  res.json(data);
});

// ─── Stock Movements ────────────────────────────────────────
app.post('/api/stock-movements', async (req, res) => {
  try {
    const mov = await StockMovement.create(req.body);
    await stockQueue.add('process-movement', { movementId: mov._id.toString() });
    res.status(201).json(mov);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/stock-movements', async (req, res) => {
  const { type, productId, warehouseId, status, from, to, page = 1, limit = 50 } = req.query;
  const q = {};
  if (type) q.type = type;
  if (productId) q.productId = productId;
  if (status) q.status = status;
  if (warehouseId) q.$or = [{ fromWarehouse: warehouseId }, { toWarehouse: warehouseId }];
  if (from || to) {
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }
  const [data, total] = await Promise.all([
    StockMovement.find(q)
      .populate('productId', 'nameAr sku')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    StockMovement.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/stock-movements/:id/approve', async (req, res) => {
  const mov = await StockMovement.findById(req.params.id);
  if (!mov || mov.status !== 'pending') return res.status(400).json({ error: 'لا يمكن اعتماد هذه الحركة' });
  mov.status = 'approved';
  mov.approvedBy = req.body.approvedBy;
  await mov.save();
  await stockQueue.add('process-movement', { movementId: mov._id.toString() });
  res.json(mov);
});

// ─── Purchase Orders ─────────────────────────────────────────
app.post('/api/purchase-orders', async (req, res) => {
  try {
    res.status(201).json(await PurchaseOrder.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/purchase-orders', async (req, res) => {
  const { status, supplierId, page = 1, limit = 20 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (supplierId) q.supplierId = supplierId;
  const [data, total] = await Promise.all([
    PurchaseOrder.find(q)
      .populate('supplierId', 'nameAr code')
      .populate('warehouseId', 'nameAr code')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    PurchaseOrder.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/purchase-orders/:id/status', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ error: 'أمر الشراء غير موجود' });
  const { status, approval } = req.body;
  po.status = status;
  if (approval) po.approvals.push({ ...approval, date: new Date() });
  await po.save();
  res.json(po);
});
app.post('/api/purchase-orders/:id/receive', async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ error: 'أمر الشراء غير موجود' });
  for (const item of req.body.items) {
    const poItem = po.items.id(item.itemId);
    if (poItem) {
      poItem.receivedQty = (poItem.receivedQty || 0) + item.receivedQty;
      poItem.status = poItem.receivedQty >= poItem.quantity ? 'received' : 'partial';
      await StockMovement.create({
        type: 'receive',
        productId: poItem.productId,
        toWarehouse: po.warehouseId,
        quantity: item.receivedQty,
        unitCost: poItem.unitCost,
        batchNo: item.batchNo,
        expiryDate: item.expiryDate,
        reference: `PO:${po.poNumber}`,
        status: 'completed',
        requestedBy: req.body.receivedBy,
      });
    }
  }
  const allReceived = po.items.every(i => i.status === 'received');
  const anyPartial = po.items.some(i => i.status === 'partial');
  po.status = allReceived ? 'received' : anyPartial ? 'partial-received' : po.status;
  if (allReceived) po.actualDelivery = new Date();
  await po.save();
  res.json(po);
});

// ─── Suppliers ───────────────────────────────────────────────
app.post('/api/suppliers', async (req, res) => {
  try {
    res.status(201).json(await Supplier.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/suppliers', async (req, res) => {
  const { category, search, active } = req.query;
  const q = {};
  if (category) q.category = category;
  if (active !== undefined) q.isActive = active === 'true';
  if (search) q.$or = [{ nameAr: new RegExp(search, 'i') }, { nameEn: new RegExp(search, 'i') }, { code: new RegExp(search, 'i') }];
  res.json(await Supplier.find(q).sort({ nameAr: 1 }));
});
app.put('/api/suppliers/:id', async (req, res) => {
  res.json(await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
app.get('/api/suppliers/:id/performance', async (req, res) => {
  const orders = await PurchaseOrder.find({ supplierId: req.params.id, status: 'received' });
  const onTime = orders.filter(o => o.actualDelivery && o.expectedDelivery && o.actualDelivery <= o.expectedDelivery).length;
  res.json({
    totalOrders: orders.length,
    completedOnTime: onTime,
    onTimeRate: orders.length ? ((onTime / orders.length) * 100).toFixed(1) + '%' : 'N/A',
    totalSpend: orders.reduce((s, o) => s + (o.total || 0), 0),
  });
});

// ─── Stock Counts (جرد فعلي) ────────────────────────────────
app.post('/api/stock-counts', async (req, res) => {
  try {
    res.status(201).json(await StockCount.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/stock-counts', async (req, res) => {
  const { warehouseId, status } = req.query;
  const q = {};
  if (warehouseId) q.warehouseId = warehouseId;
  if (status) q.status = status;
  res.json(await StockCount.find(q).populate('warehouseId', 'nameAr code').sort({ createdAt: -1 }));
});
app.put('/api/stock-counts/:id/item', async (req, res) => {
  const sc = await StockCount.findById(req.params.id);
  if (!sc) return res.status(404).json({ error: 'لم يتم العثور على الجرد' });
  const { productId, countedQty, notes, countedBy } = req.body;
  const existing = sc.items.find(i => i.productId?.toString() === productId);
  if (existing) {
    existing.countedQty = countedQty;
    existing.notes = notes;
    existing.countedBy = countedBy;
  } else {
    const sl = await StockLevel.findOne({ productId, warehouseId: sc.warehouseId });
    sc.items.push({ productId, systemQty: sl?.quantity || 0, countedQty, notes, countedBy });
  }
  await sc.save();
  res.json(sc);
});
app.put('/api/stock-counts/:id/complete', async (req, res) => {
  const sc = await StockCount.findById(req.params.id);
  if (!sc) return res.status(404).json({ error: 'لم يتم العثور على الجرد' });
  sc.status = 'completed';
  sc.completedDate = new Date();
  await sc.save();
  res.json(sc);
});

// ─── Reports & Analytics ─────────────────────────────────────
app.get('/api/inventory/dashboard', async (_req, res) => {
  const cacheKey = 'inv:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));

  const [totalProducts, totalWarehouses, totalStock, lowStockProducts] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Warehouse.countDocuments({ isActive: true }),
    StockLevel.aggregate([{ $group: { _id: null, total: { $sum: '$quantity' }, value: { $sum: { $multiply: ['$quantity', 1] } } } }]),
    (async () => {
      const products = await Product.find({ isActive: true }, '_id reorderPoint');
      let count = 0;
      for (const p of products) {
        const agg = await StockLevel.aggregate([
          { $match: { productId: p._id } },
          { $group: { _id: null, total: { $sum: '$available' } } },
        ]);
        if ((agg[0]?.total || 0) <= p.reorderPoint) count++;
      }
      return count;
    })(),
  ]);

  const recentMovements = await StockMovement.find().sort({ createdAt: -1 }).limit(10).populate('productId', 'nameAr sku');
  const pendingPOs = await PurchaseOrder.countDocuments({ status: { $in: ['pending-approval', 'approved', 'ordered'] } });

  const result = {
    totalProducts,
    totalWarehouses,
    pendingPOs,
    totalStock: totalStock[0]?.total || 0,
    lowStockProducts,
    recentMovements,
  };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

app.get('/api/inventory/valuation', async (_req, res) => {
  const data = await StockLevel.aggregate([
    { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
    { $unwind: '$product' },
    {
      $group: {
        _id: '$product.type',
        totalQty: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$quantity', '$product.costPrice'] } },
      },
    },
    { $sort: { totalValue: -1 } },
  ]);
  const grandTotal = data.reduce((s, d) => s + d.totalValue, 0);
  res.json({ byType: data, grandTotal });
});

/* ═══════════════════════════════════════════════════════════════
   Cron Jobs
   ═══════════════════════════════════════════════════════════════ */
// يومياً الساعة 7 صباحاً — فحص المخزون المنخفض
cron.schedule('0 7 * * *', async () => {
  try {
    const products = await Product.find({ isActive: true });
    for (const p of products) {
      const agg = await StockLevel.aggregate([{ $match: { productId: p._id } }, { $group: { _id: null, total: { $sum: '$available' } } }]);
      const available = agg[0]?.total || 0;
      if (available <= p.reorderPoint) {
        await stockQueue.add('low-stock-alert', {
          productId: p._id.toString(),
          sku: p.sku,
          nameAr: p.nameAr,
          available,
          reorderPoint: p.reorderPoint,
        });
      }
    }
    console.log('[CRON] Low-stock check completed');
  } catch (e) {
    console.error('[CRON] Low-stock check error:', e.message);
  }
});

/* ═══════════════════════════════════════════════════════════════
   بدء التشغيل — Startup
   ═══════════════════════════════════════════════════════════════ */
mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — inventory-warehouse');
    app.listen(PORT, () => console.log(`🏭 Inventory-Warehouse Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
