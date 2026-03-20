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

/* ═══════════════════════════════════════════════════════════════ */

const assetSchema = new mongoose.Schema(
  {
    assetTag: { type: String, unique: true },
    nameAr: { type: String, required: true },
    nameEn: String,
    category: {
      type: String,
      enum: [
        'it-equipment',
        'furniture',
        'vehicle',
        'medical',
        'lab-equipment',
        'sports',
        'kitchen',
        'hvac',
        'electrical',
        'plumbing',
        'audiovisual',
        'playground',
        'security-system',
        'other',
      ],
      required: true,
    },
    subcategory: String,
    brand: String,
    model: String,
    serialNo: String,
    barcode: String,
    description: String,
    purchaseInfo: {
      vendor: String,
      poNumber: String,
      purchaseDate: Date,
      cost: Number,
      currency: { type: String, default: 'SAR' },
      invoiceRef: String,
      warranty: { startDate: Date, endDate: Date, provider: String, terms: String },
    },
    location: { building: String, floor: String, room: String, area: String },
    department: String,
    assignedTo: { userId: String, name: String, assignDate: Date },
    condition: { type: String, enum: ['new', 'good', 'fair', 'poor', 'damaged', 'non-functional', 'disposed'], default: 'new' },
    depreciationInfo: {
      method: { type: String, enum: ['straight-line', 'declining-balance', 'none'], default: 'straight-line' },
      usefulLifeYears: Number,
      residualValue: Number,
      currentValue: Number,
    },
    maintenanceSchedule: {
      frequency: { type: String, enum: ['weekly', 'monthly', 'quarterly', 'semi-annual', 'annual', 'as-needed'] },
      lastMaintenance: Date,
      nextMaintenance: Date,
    },
    specifications: mongoose.Schema.Types.Mixed,
    photo: String,
    qrCode: String,
    status: {
      type: String,
      enum: ['in-service', 'under-maintenance', 'stored', 'lent', 'retired', 'disposed', 'lost'],
      default: 'in-service',
    },
    disposalInfo: { date: Date, method: String, reason: String, approvedBy: String, value: Number },
    createdBy: { userId: String, name: String },
  },
  { timestamps: true },
);

assetSchema.pre('save', async function (next) {
  if (!this.assetTag) {
    const prefix = (this.category || 'other').substring(0, 3).toUpperCase();
    const count = await this.constructor.countDocuments();
    this.assetTag = `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const maintenanceRequestSchema = new mongoose.Schema(
  {
    requestNo: { type: String, unique: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    type: { type: String, enum: ['preventive', 'corrective', 'emergency', 'inspection', 'calibration', 'cleaning'], required: true },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    title: String,
    description: String,
    reportedBy: { userId: String, name: String, department: String },
    assignedTo: { userId: String, name: String },
    scheduledDate: Date,
    startDate: Date,
    completedDate: Date,
    laborHours: Number,
    parts: [{ name: String, quantity: Number, cost: Number }],
    totalCost: Number,
    vendor: { name: String, contact: String },
    notes: String,
    beforePhotos: [String],
    afterPhotos: [String],
    status: { type: String, enum: ['requested', 'approved', 'in-progress', 'on-hold', 'completed', 'cancelled'], default: 'requested' },
    satisfaction: { rating: Number, comment: String },
  },
  { timestamps: true },
);

maintenanceRequestSchema.pre('save', async function (next) {
  if (!this.requestNo) {
    const count = await this.constructor.countDocuments();
    this.requestNo = `MR-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  if (this.parts?.length) {
    this.totalCost = this.parts.reduce((s, p) => s + (p.cost || 0) * (p.quantity || 1), 0);
  }
  next();
});

const assetTransferSchema = new mongoose.Schema(
  {
    transferNo: { type: String, unique: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset', required: true },
    fromLocation: { building: String, room: String, department: String, person: String },
    toLocation: { building: String, room: String, department: String, person: String },
    reason: String,
    transferDate: { type: Date, default: Date.now },
    condition: String,
    approvedBy: { userId: String, name: String },
    handedOverBy: { userId: String, name: String },
    receivedBy: { userId: String, name: String },
    notes: String,
    status: { type: String, enum: ['requested', 'approved', 'in-transit', 'completed', 'rejected'], default: 'requested' },
  },
  { timestamps: true },
);

assetTransferSchema.pre('save', async function (next) {
  if (!this.transferNo) {
    const count = await this.constructor.countDocuments();
    this.transferNo = `AT-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

const Asset = mongoose.model('Asset', assetSchema);
const MaintenanceRequest = mongoose.model('MaintenanceRequest', maintenanceRequestSchema);
const AssetTransfer = mongoose.model('AssetTransfer', assetTransferSchema);

const MONGO = process.env.MONGODB_URI || 'mongodb://localhost:27017/alawael_assets';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const PORT = process.env.PORT || 3520;

const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null, retryStrategy: t => Math.min(t * 200, 5000) });
const assetQueue = new Queue('asset-tasks', { connection: redis });

/* ═══════════════════════════════════════════════════════════════ */
app.get('/health', async (_req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const red = redis.status === 'ready';
  res
    .status(mongo && red ? 200 : 503)
    .json({ status: mongo && red ? 'ok' : 'degraded', service: 'asset-equipment-service', mongo, redis: red, uptime: process.uptime() });
});

// Assets
app.post('/api/assets', async (req, res) => {
  try {
    res.status(201).json(await Asset.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/assets', async (req, res) => {
  const { category, status, condition, department, search, page = 1, limit = 50 } = req.query;
  const q = {};
  if (category) q.category = category;
  if (status) q.status = status;
  if (condition) q.condition = condition;
  if (department) q.department = department;
  if (search)
    q.$or = [
      { nameAr: new RegExp(search, 'i') },
      { nameEn: new RegExp(search, 'i') },
      { assetTag: new RegExp(search, 'i') },
      { serialNo: search },
    ];
  const [data, total] = await Promise.all([
    Asset.find(q)
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ assetTag: 1 }),
    Asset.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.get('/api/assets/:id', async (req, res) => {
  const a = await Asset.findById(req.params.id);
  if (!a) return res.status(404).json({ error: 'الأصل غير موجود' });
  const maintenance = await MaintenanceRequest.find({ assetId: a._id }).sort({ createdAt: -1 }).limit(10);
  const transfers = await AssetTransfer.find({ assetId: a._id }).sort({ transferDate: -1 }).limit(10);
  res.json({ ...a.toObject(), maintenanceHistory: maintenance, transferHistory: transfers });
});
app.put('/api/assets/:id', async (req, res) => {
  res.json(await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});

// Maintenance Requests
app.post('/api/maintenance-requests', async (req, res) => {
  try {
    const mr = await MaintenanceRequest.create(req.body);
    if (mr.priority === 'urgent') await assetQueue.add('urgent-maintenance', { requestId: mr._id.toString() });
    res.status(201).json(mr);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/maintenance-requests', async (req, res) => {
  const { status, priority, type, assetId, page = 1, limit = 20 } = req.query;
  const q = {};
  if (status) q.status = status;
  if (priority) q.priority = priority;
  if (type) q.type = type;
  if (assetId) q.assetId = assetId;
  const [data, total] = await Promise.all([
    MaintenanceRequest.find(q)
      .populate('assetId', 'nameAr assetTag category')
      .skip((page - 1) * limit)
      .limit(+limit)
      .sort({ createdAt: -1 }),
    MaintenanceRequest.countDocuments(q),
  ]);
  res.json({ data, total, page: +page, pages: Math.ceil(total / limit) });
});
app.put('/api/maintenance-requests/:id', async (req, res) => {
  const mr = await MaintenanceRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (req.body.status === 'completed' && mr.assetId) {
    await Asset.findByIdAndUpdate(mr.assetId, { 'maintenanceSchedule.lastMaintenance': new Date(), status: 'in-service' });
  }
  res.json(mr);
});

// Asset Transfers
app.post('/api/asset-transfers', async (req, res) => {
  try {
    res.status(201).json(await AssetTransfer.create(req.body));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});
app.get('/api/asset-transfers', async (req, res) => {
  const { assetId, status } = req.query;
  const q = {};
  if (assetId) q.assetId = assetId;
  if (status) q.status = status;
  res.json(await AssetTransfer.find(q).populate('assetId', 'nameAr assetTag').sort({ transferDate: -1 }));
});
app.put('/api/asset-transfers/:id/complete', async (req, res) => {
  const t = await AssetTransfer.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'التحويل غير موجود' });
  t.status = 'completed';
  t.receivedBy = req.body.receivedBy;
  await t.save();
  await Asset.findByIdAndUpdate(t.assetId, {
    location: t.toLocation,
    assignedTo: { userId: req.body.receivedBy?.userId, name: req.body.receivedBy?.name, assignDate: new Date() },
  });
  res.json(t);
});

// Dashboard
app.get('/api/assets/dashboard', async (_req, res) => {
  const cacheKey = 'assets:dashboard';
  const cached = await redis.get(cacheKey);
  if (cached) return res.json(JSON.parse(cached));
  const [totalAssets, byCategory, byCondition, pendingMaintenance, totalValue] = await Promise.all([
    Asset.countDocuments({ status: { $ne: 'disposed' } }),
    Asset.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Asset.aggregate([{ $group: { _id: '$condition', count: { $sum: 1 } } }]),
    MaintenanceRequest.countDocuments({ status: { $in: ['requested', 'approved', 'in-progress'] } }),
    Asset.aggregate([
      { $match: { status: 'in-service' } },
      { $group: { _id: null, total: { $sum: '$purchaseInfo.cost' }, current: { $sum: '$depreciationInfo.currentValue' } } },
    ]),
  ]);
  const result = {
    totalAssets,
    byCategory,
    byCondition,
    pendingMaintenance,
    totalPurchaseValue: totalValue[0]?.total || 0,
    currentBookValue: totalValue[0]?.current || 0,
  };
  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  res.json(result);
});

// Cron: Maintenance schedule check daily 6 AM
cron.schedule('0 6 * * *', async () => {
  try {
    const today = new Date();
    const assets = await Asset.find({ 'maintenanceSchedule.nextMaintenance': { $lte: today }, status: 'in-service' });
    for (const a of assets) {
      await assetQueue.add('maintenance-due', { assetId: a._id.toString(), assetTag: a.assetTag, nameAr: a.nameAr });
    }
    console.log(`[CRON] Maintenance check: ${assets.length} assets due`);
  } catch (e) {
    console.error('[CRON] Maintenance check error:', e.message);
  }
});

mongoose
  .connect(MONGO)
  .then(() => {
    console.log('✅ MongoDB connected — asset-equipment');
    app.listen(PORT, () => console.log(`🔧 Asset-Equipment Service running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
