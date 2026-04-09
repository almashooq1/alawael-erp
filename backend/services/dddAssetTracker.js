'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Asset Tracker — Phase 14 (4/4)
 *  Medical equipment tracking, maintenance, utilization
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const ASSET_CATEGORIES = [
  'therapy_equipment',
  'diagnostic_device',
  'mobility_aid',
  'sensory_tool',
  'communication_device',
  'exercise_equipment',
  'hydrotherapy_equipment',
  'ar_vr_device',
  'computer_tablet',
  'furniture',
  'vehicle',
  'other',
];

const ASSET_STATUSES = [
  'available',
  'in_use',
  'maintenance',
  'repair',
  'calibration',
  'retired',
  'lost',
  'reserved',
];

const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'calibration',
  'inspection',
  'cleaning',
  'software_update',
  'replacement',
];

const CONDITION_GRADES = ['excellent', 'good', 'fair', 'poor', 'non_functional'];

const BUILTIN_ASSET_TYPES = [
  {
    code: 'AST-TREADMILL',
    name: 'Rehabilitation Treadmill',
    nameAr: 'جهاز المشي التأهيلي',
    category: 'exercise_equipment',
    maintenanceIntervalDays: 90,
  },
  {
    code: 'AST-PARALLEL-BAR',
    name: 'Parallel Bars',
    nameAr: 'القضبان المتوازية',
    category: 'therapy_equipment',
    maintenanceIntervalDays: 180,
  },
  {
    code: 'AST-STANDING-FRAME',
    name: 'Standing Frame',
    nameAr: 'إطار الوقوف',
    category: 'mobility_aid',
    maintenanceIntervalDays: 120,
  },
  {
    code: 'AST-SENSORY-KIT',
    name: 'Sensory Integration Kit',
    nameAr: 'مجموعة التكامل الحسي',
    category: 'sensory_tool',
    maintenanceIntervalDays: 60,
  },
  {
    code: 'AST-AAC-DEVICE',
    name: 'AAC Communication Device',
    nameAr: 'جهاز التواصل البديل',
    category: 'communication_device',
    maintenanceIntervalDays: 90,
  },
  {
    code: 'AST-BALANCE-BOARD',
    name: 'Balance Training Board',
    nameAr: 'لوح تدريب التوازن',
    category: 'exercise_equipment',
    maintenanceIntervalDays: 120,
  },
  {
    code: 'AST-VR-HEADSET',
    name: 'VR Rehabilitation Headset',
    nameAr: 'نظارة الواقع الافتراضي',
    category: 'ar_vr_device',
    maintenanceIntervalDays: 30,
  },
  {
    code: 'AST-ULTRASOUND',
    name: 'Therapeutic Ultrasound',
    nameAr: 'جهاز الموجات فوق الصوتية',
    category: 'therapy_equipment',
    maintenanceIntervalDays: 90,
  },
  {
    code: 'AST-TENS',
    name: 'TENS Unit',
    nameAr: 'جهاز التحفيز الكهربائي',
    category: 'therapy_equipment',
    maintenanceIntervalDays: 60,
  },
  {
    code: 'AST-POOL-LIFT',
    name: 'Pool Hoist/Lift',
    nameAr: 'رافعة المسبح',
    category: 'hydrotherapy_equipment',
    maintenanceIntervalDays: 30,
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Asset Schema ── */
const assetSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    category: { type: String, enum: ASSET_CATEGORIES, required: true, index: true },
    status: { type: String, enum: ASSET_STATUSES, default: 'available', index: true },
    condition: { type: String, enum: CONDITION_GRADES, default: 'good' },

    /* Identification */
    serialNumber: { type: String, index: true },
    manufacturer: String,
    model: String,
    barcode: String,

    /* Location */
    location: {
      building: String,
      floor: String,
      room: String,
      assignedResourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDResource' },
    },

    /* Financial */
    purchaseDate: Date,
    purchasePrice: Number,
    currency: { type: String, default: 'SAR' },
    warrantyExpires: Date,
    depreciationRate: Number, // annual %
    currentValue: Number,

    /* Maintenance */
    maintenanceIntervalDays: { type: Number, default: 90 },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: { type: Date, index: true },
    totalMaintenanceCost: { type: Number, default: 0 },

    /* Usage */
    totalUsageHours: { type: Number, default: 0 },
    maxUsageHoursPerDay: { type: Number, default: 8 },
    currentUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currentBeneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },

    /* Specs */
    specifications: { type: Map, of: mongoose.Schema.Types.Mixed },
    safetyNotes: String,
    safetyNotesAr: String,
    manualUrl: String,
    images: [String],
    tags: [String],
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDAsset = model('DDDAsset') || mongoose.model('DDDAsset', assetSchema);

/* ── Maintenance Record Schema ── */
const maintenanceRecordSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDAsset', required: true, index: true },
    type: { type: String, enum: MAINTENANCE_TYPES, required: true },
    scheduledDate: { type: Date, index: true },
    completedDate: Date,
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'],
      default: 'scheduled',
      index: true,
    },
    performedBy: String,
    vendor: String,
    cost: Number,
    currency: { type: String, default: 'SAR' },
    description: String,
    descriptionAr: String,
    findings: String,
    partsReplaced: [{ name: String, cost: Number }],
    conditionBefore: { type: String, enum: CONDITION_GRADES },
    conditionAfter: { type: String, enum: CONDITION_GRADES },
    nextScheduledDate: Date,
    attachments: [String],
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDMaintenanceRecord =
  model('DDDMaintenanceRecord') || mongoose.model('DDDMaintenanceRecord', maintenanceRecordSchema);

/* ── Asset Usage Log Schema ── */
const assetUsageLogSchema = new mongoose.Schema(
  {
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDAsset', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    sessionId: { type: mongoose.Schema.Types.ObjectId },
    checkedOutAt: { type: Date, required: true, index: true },
    checkedInAt: Date,
    durationMinutes: Number,
    condition: { type: String, enum: CONDITION_GRADES },
    notes: String,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDAssetUsageLog =
  model('DDDAssetUsageLog') || mongoose.model('DDDAssetUsageLog', assetUsageLogSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — AssetTracker
   ══════════════════════════════════════════════════════════════ */

class AssetTrackerService {
  /* ── Assets CRUD ── */
  async listAssets(filter = {}) {
    const q = { isActive: true };
    if (filter.category) q.category = filter.category;
    if (filter.status) q.status = filter.status;
    if (filter.condition) q.condition = filter.condition;
    if (filter.tenant) q.tenant = filter.tenant;
    if (filter.search) {
      q.$or = [
        { name: new RegExp(filter.search, 'i') },
        { nameAr: new RegExp(filter.search, 'i') },
        { code: new RegExp(filter.search, 'i') },
        { serialNumber: new RegExp(filter.search, 'i') },
      ];
    }
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDAsset.find(q)
        .sort({ category: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDAsset.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getAsset(id) {
    return DDDAsset.findById(oid(id)).lean();
  }

  async createAsset(data) {
    // Auto-calculate next maintenance
    if (data.maintenanceIntervalDays && !data.nextMaintenanceDate) {
      const last = data.lastMaintenanceDate ? new Date(data.lastMaintenanceDate) : new Date();
      data.nextMaintenanceDate = new Date(
        last.getTime() + data.maintenanceIntervalDays * 24 * 60 * 60 * 1000
      );
    }
    return DDDAsset.create(data);
  }

  async updateAsset(id, data) {
    return DDDAsset.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async retireAsset(id, reason) {
    return DDDAsset.findByIdAndUpdate(
      oid(id),
      {
        $set: {
          status: 'retired',
          isActive: false,
          'metadata.retireReason': reason,
          'metadata.retiredAt': new Date(),
        },
      },
      { new: true }
    ).lean();
  }

  /* ── Check-out / Check-in ── */
  async checkOut(assetId, userId, beneficiaryId, sessionId) {
    const asset = await DDDAsset.findById(oid(assetId));
    if (!asset) throw new Error('Asset not found');
    if (asset.status !== 'available') throw new Error(`Asset is ${asset.status}, cannot check out`);

    await DDDAsset.findByIdAndUpdate(oid(assetId), {
      $set: {
        status: 'in_use',
        currentUserId: oid(userId),
        currentBeneficiaryId: beneficiaryId ? oid(beneficiaryId) : undefined,
      },
    });

    const log = await DDDAssetUsageLog.create({
      assetId: oid(assetId),
      userId: oid(userId),
      beneficiaryId: beneficiaryId ? oid(beneficiaryId) : undefined,
      sessionId: sessionId ? oid(sessionId) : undefined,
      checkedOutAt: new Date(),
    });

    return { asset: asset.toObject(), usageLog: log };
  }

  async checkIn(assetId, condition, notes) {
    const asset = await DDDAsset.findById(oid(assetId));
    if (!asset) throw new Error('Asset not found');

    // Find latest usage log
    const usageLog = await DDDAssetUsageLog.findOne({
      assetId: oid(assetId),
      checkedInAt: null,
    }).sort({ checkedOutAt: -1 });

    let duration = 0;
    if (usageLog) {
      const now = new Date();
      duration = Math.round((now - usageLog.checkedOutAt) / 60000);
      await DDDAssetUsageLog.findByIdAndUpdate(usageLog._id, {
        $set: { checkedInAt: now, durationMinutes: duration, condition, notes },
      });
    }

    await DDDAsset.findByIdAndUpdate(oid(assetId), {
      $set: {
        status: 'available',
        currentUserId: null,
        currentBeneficiaryId: null,
        condition: condition || asset.condition,
      },
      $inc: { totalUsageHours: duration / 60 },
    });

    return { assetId, duration, condition };
  }

  /* ── Maintenance ── */
  async scheduleMaintenance(assetId, data) {
    const record = await DDDMaintenanceRecord.create({ ...data, assetId: oid(assetId) });
    await DDDAsset.findByIdAndUpdate(oid(assetId), {
      $set: { nextMaintenanceDate: data.scheduledDate },
    });
    return record;
  }

  async completeMaintenance(recordId, data) {
    const record = await DDDMaintenanceRecord.findByIdAndUpdate(
      oid(recordId),
      {
        $set: {
          status: 'completed',
          completedDate: new Date(),
          conditionAfter: data.conditionAfter,
          findings: data.findings,
          cost: data.cost,
          partsReplaced: data.partsReplaced,
        },
      },
      { new: true }
    ).lean();

    if (record) {
      // Update asset
      const nextDate = new Date();
      const asset = await DDDAsset.findById(record.assetId);
      if (asset) {
        nextDate.setDate(nextDate.getDate() + (asset.maintenanceIntervalDays || 90));
        await DDDAsset.findByIdAndUpdate(record.assetId, {
          $set: {
            lastMaintenanceDate: new Date(),
            nextMaintenanceDate: nextDate,
            status: 'available',
            condition: data.conditionAfter || asset.condition,
          },
          $inc: { totalMaintenanceCost: data.cost || 0 },
        });
      }
    }

    return record;
  }

  async listMaintenanceRecords(filter = {}) {
    const q = {};
    if (filter.assetId) q.assetId = oid(filter.assetId);
    if (filter.status) q.status = filter.status;
    if (filter.type) q.type = filter.type;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDMaintenanceRecord.find(q)
        .sort({ scheduledDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('assetId', 'name code category')
        .lean(),
      DDDMaintenanceRecord.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getOverdueMaintenance(tenant = 'default') {
    const now = new Date();
    return DDDAsset.find({
      isActive: true,
      tenant,
      nextMaintenanceDate: { $lt: now },
      status: { $ne: 'retired' },
    })
      .sort({ nextMaintenanceDate: 1 })
      .lean();
  }

  /* ── Usage History ── */
  async getUsageHistory(assetId, filter = {}) {
    const q = { assetId: oid(assetId) };
    if (filter.from) q.checkedOutAt = { $gte: new Date(filter.from) };
    if (filter.to) {
      q.checkedOutAt = q.checkedOutAt || {};
      q.checkedOutAt.$lte = new Date(filter.to);
    }
    return DDDAssetUsageLog.find(q)
      .sort({ checkedOutAt: -1 })
      .limit(100)
      .populate('userId', 'name')
      .lean();
  }

  /* ── Utilization Report ── */
  async getUtilizationReport(dateFrom, dateTo, tenant = 'default') {
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    const totalDays = Math.max(1, (to - from) / (24 * 60 * 60 * 1000));

    const assets = await DDDAsset.find({ isActive: true, tenant }).lean();
    const report = [];

    for (const asset of assets) {
      const logs = await DDDAssetUsageLog.find({
        assetId: asset._id,
        checkedOutAt: { $gte: from, $lte: to },
      }).lean();

      const totalHours = logs.reduce((sum, l) => sum + (l.durationMinutes || 0) / 60, 0);
      const maxHours = totalDays * (asset.maxUsageHoursPerDay || 8);
      const utilization = maxHours > 0 ? Math.min(100, (totalHours / maxHours) * 100) : 0;

      report.push({
        assetId: asset._id,
        code: asset.code,
        name: asset.name,
        category: asset.category,
        totalHours: Math.round(totalHours * 10) / 10,
        maxHours: Math.round(maxHours),
        utilizationPercent: Math.round(utilization * 10) / 10,
        sessionCount: logs.length,
      });
    }

    report.sort((a, b) => b.utilizationPercent - a.utilizationPercent);
    return { period: { from, to }, assets: report, totalAssets: assets.length };
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const q = { isActive: true, tenant };
    const now = new Date();

    const [total, byCategory, byStatus, overdue, inUse] = await Promise.all([
      DDDAsset.countDocuments(q),
      DDDAsset.aggregate([
        { $match: q },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      DDDAsset.aggregate([{ $match: q }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      DDDAsset.countDocuments({
        ...q,
        nextMaintenanceDate: { $lt: now },
        status: { $ne: 'retired' },
      }),
      DDDAsset.countDocuments({ ...q, status: 'in_use' }),
    ]);

    return {
      total,
      byCategory: Object.fromEntries(byCategory.map(r => [r._id, r.count])),
      byStatus: Object.fromEntries(byStatus.map(r => [r._id, r.count])),
      overdueMaintenance: overdue,
      currentlyInUse: inUse,
      builtinTypes: BUILTIN_ASSET_TYPES.length,
    };
  }
}

const assetTrackerService = new AssetTrackerService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createAssetTrackerRouter() {
  const r = Router();

  /* ── Assets CRUD ── */
  r.get(
    '/asset-tracker/assets',
    safe(async (req, res) => {
      res.json({ success: true, ...(await assetTrackerService.listAssets(req.query)) });
    })
  );

  r.get(
    '/asset-tracker/assets/:id',
    safe(async (req, res) => {
      const doc = await assetTrackerService.getAsset(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/asset-tracker/assets',
    safe(async (req, res) => {
      const doc = await assetTrackerService.createAsset(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );

  r.put(
    '/asset-tracker/assets/:id',
    safe(async (req, res) => {
      const doc = await assetTrackerService.updateAsset(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/asset-tracker/assets/:id/retire',
    safe(async (req, res) => {
      const doc = await assetTrackerService.retireAsset(req.params.id, req.body.reason);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* ── Check-out / Check-in ── */
  r.post(
    '/asset-tracker/assets/:id/check-out',
    safe(async (req, res) => {
      const data = await assetTrackerService.checkOut(
        req.params.id,
        req.body.userId,
        req.body.beneficiaryId,
        req.body.sessionId
      );
      res.json({ success: true, data });
    })
  );

  r.post(
    '/asset-tracker/assets/:id/check-in',
    safe(async (req, res) => {
      const data = await assetTrackerService.checkIn(
        req.params.id,
        req.body.condition,
        req.body.notes
      );
      res.json({ success: true, data });
    })
  );

  /* ── Usage History ── */
  r.get(
    '/asset-tracker/assets/:id/usage',
    safe(async (req, res) => {
      const data = await assetTrackerService.getUsageHistory(req.params.id, req.query);
      res.json({ success: true, data });
    })
  );

  /* ── Maintenance ── */
  r.get(
    '/asset-tracker/maintenance',
    safe(async (req, res) => {
      res.json({ success: true, ...(await assetTrackerService.listMaintenanceRecords(req.query)) });
    })
  );

  r.post(
    '/asset-tracker/assets/:id/maintenance',
    safe(async (req, res) => {
      const doc = await assetTrackerService.scheduleMaintenance(req.params.id, req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );

  r.put(
    '/asset-tracker/maintenance/:id/complete',
    safe(async (req, res) => {
      const doc = await assetTrackerService.completeMaintenance(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.get(
    '/asset-tracker/maintenance/overdue',
    safe(async (req, res) => {
      const data = await assetTrackerService.getOverdueMaintenance(req.query.tenant);
      res.json({ success: true, data, count: data.length });
    })
  );

  /* ── Utilization Report ── */
  r.get(
    '/asset-tracker/utilization',
    safe(async (req, res) => {
      const { from, to } = req.query;
      if (!from || !to)
        return res.status(400).json({ success: false, error: 'from & to required' });
      const data = await assetTrackerService.getUtilizationReport(from, to, req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* ── Stats ── */
  r.get(
    '/asset-tracker/stats',
    safe(async (req, res) => {
      const data = await assetTrackerService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* ── Meta ── */
  r.get('/asset-tracker/meta', (_req, res) => {
    res.json({
      success: true,
      assetCategories: ASSET_CATEGORIES,
      assetStatuses: ASSET_STATUSES,
      maintenanceTypes: MAINTENANCE_TYPES,
      conditionGrades: CONDITION_GRADES,
      builtinAssetTypes: BUILTIN_ASSET_TYPES,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDAsset,
  DDDMaintenanceRecord,
  DDDAssetUsageLog,
  AssetTrackerService,
  assetTrackerService,
  createAssetTrackerRouter,
  ASSET_CATEGORIES,
  ASSET_STATUSES,
  MAINTENANCE_TYPES,
  CONDITION_GRADES,
  BUILTIN_ASSET_TYPES,
};
