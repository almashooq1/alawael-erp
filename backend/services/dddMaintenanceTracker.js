/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Maintenance Tracker — Phase 19 · Facility & Environment Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Work orders, preventive maintenance scheduling, equipment service records,
 * asset lifecycle tracking, and vendor management for facility upkeep.
 *
 * Aggregates
 *   DDDWorkOrder            — maintenance work order / service request
 *   DDDPreventiveSchedule   — recurring preventive maintenance plan
 *   DDDServiceRecord        — completed maintenance / repair log
 *   DDDMaintenanceAsset     — trackable asset for maintenance purposes
 *
 * Canonical links
 *   buildingId   → DDDBuilding (dddFacilityManager)
 *   roomId       → DDDRoom (dddFacilityManager)
 *   assignedTo   → User
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

const WORK_ORDER_TYPES = [
  'corrective',
  'preventive',
  'predictive',
  'emergency',
  'inspection',
  'calibration',
  'cleaning',
  'renovation',
  'installation',
  'decommissioning',
  'safety_check',
  'electrical',
  'plumbing',
  'hvac',
];

const WORK_ORDER_STATUSES = [
  'submitted',
  'triaged',
  'assigned',
  'in_progress',
  'on_hold',
  'awaiting_parts',
  'completed',
  'verified',
  'closed',
  'cancelled',
  'reopened',
];

const WORK_ORDER_PRIORITIES = [
  'low',
  'normal',
  'medium',
  'high',
  'urgent',
  'critical',
  'emergency',
];

const PM_FREQUENCIES = [
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'bimonthly',
  'quarterly',
  'semi_annual',
  'annual',
  'biennial',
  'custom',
];

const SERVICE_CATEGORIES = [
  'electrical',
  'plumbing',
  'hvac',
  'fire_safety',
  'structural',
  'elevator',
  'generator',
  'medical_gas',
  'it_network',
  'security_system',
  'landscaping',
  'pest_control',
  'waste_management',
  'signage',
];

const ASSET_CONDITIONS = [
  'excellent',
  'good',
  'fair',
  'poor',
  'critical',
  'non_functional',
  'under_repair',
  'decommissioned',
];

/* ── Built-in maintenance assets ────────────────────────────────────────── */
const BUILTIN_ASSETS = [
  { code: 'ASSET-HVAC-01', name: 'Central HVAC System', category: 'hvac', condition: 'good' },
  {
    code: 'ASSET-ELEV-01',
    name: 'Main Building Elevator',
    category: 'elevator',
    condition: 'good',
  },
  { code: 'ASSET-GEN-01', name: 'Backup Generator', category: 'generator', condition: 'excellent' },
  {
    code: 'ASSET-FIRE-01',
    name: 'Fire Alarm System',
    category: 'fire_safety',
    condition: 'excellent',
  },
  { code: 'ASSET-UPS-01', name: 'UPS Battery System', category: 'electrical', condition: 'good' },
  { code: 'ASSET-PUMP-01', name: 'Water Pump Station', category: 'plumbing', condition: 'fair' },
  { code: 'ASSET-NET-01', name: 'Network Core Switch', category: 'it_network', condition: 'good' },
  {
    code: 'ASSET-CCTV-01',
    name: 'CCTV Surveillance System',
    category: 'security_system',
    condition: 'good',
  },
  {
    code: 'ASSET-MGAS-01',
    name: 'Medical Gas Pipeline',
    category: 'medical_gas',
    condition: 'excellent',
  },
  {
    code: 'ASSET-TRANS-01',
    name: 'Electrical Transformer',
    category: 'electrical',
    condition: 'good',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Work Order ────────────────────────────────────────────────────────── */
const workOrderSchema = new Schema(
  {
    workOrderCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: WORK_ORDER_TYPES, required: true },
    status: { type: String, enum: WORK_ORDER_STATUSES, default: 'submitted' },
    priority: { type: String, enum: WORK_ORDER_PRIORITIES, default: 'normal' },
    buildingId: { type: Schema.Types.ObjectId },
    roomId: { type: Schema.Types.ObjectId },
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDMaintenanceAsset' },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedTeam: { type: String },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    estimatedHours: { type: Number },
    actualHours: { type: Number },
    estimatedCost: { type: Number },
    actualCost: { type: Number },
    partsUsed: [{ name: String, quantity: Number, unitCost: Number }],
    attachments: [{ name: String, url: String, type: String }],
    comments: [
      { userId: Schema.Types.ObjectId, text: String, createdAt: { type: Date, default: Date.now } },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

workOrderSchema.index({ status: 1, priority: -1 });
workOrderSchema.index({ buildingId: 1, status: 1 });
workOrderSchema.index({ assignedTo: 1, status: 1 });

const DDDWorkOrder =
  mongoose.models.DDDWorkOrder || mongoose.model('DDDWorkOrder', workOrderSchema);

/* ── Preventive Schedule ───────────────────────────────────────────────── */
const preventiveScheduleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDMaintenanceAsset' },
    buildingId: { type: Schema.Types.ObjectId },
    category: { type: String, enum: SERVICE_CATEGORIES },
    frequency: { type: String, enum: PM_FREQUENCIES, required: true },
    nextDueDate: { type: Date },
    lastPerformed: { type: Date },
    checklist: [{ task: String, isMandatory: Boolean }],
    assignedTeam: { type: String },
    estimatedHours: { type: Number },
    estimatedCost: { type: Number },
    isActive: { type: Boolean, default: true },
    autoGenerate: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

preventiveScheduleSchema.index({ nextDueDate: 1, isActive: 1 });

const DDDPreventiveSchedule =
  mongoose.models.DDDPreventiveSchedule ||
  mongoose.model('DDDPreventiveSchedule', preventiveScheduleSchema);

/* ── Service Record ────────────────────────────────────────────────────── */
const serviceRecordSchema = new Schema(
  {
    recordCode: { type: String, required: true, unique: true },
    workOrderId: { type: Schema.Types.ObjectId, ref: 'DDDWorkOrder' },
    assetId: { type: Schema.Types.ObjectId, ref: 'DDDMaintenanceAsset' },
    category: { type: String, enum: SERVICE_CATEGORIES },
    description: { type: String, required: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    vendorName: { type: String },
    datePerformed: { type: Date, required: true },
    hoursSpent: { type: Number },
    totalCost: { type: Number },
    partsReplaced: [{ name: String, partNumber: String, quantity: Number, cost: Number }],
    conditionBefore: { type: String, enum: ASSET_CONDITIONS },
    conditionAfter: { type: String, enum: ASSET_CONDITIONS },
    notes: { type: String },
    attachments: [{ name: String, url: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

serviceRecordSchema.index({ assetId: 1, datePerformed: -1 });
serviceRecordSchema.index({ workOrderId: 1 });

const DDDServiceRecord =
  mongoose.models.DDDServiceRecord || mongoose.model('DDDServiceRecord', serviceRecordSchema);

/* ── Maintenance Asset ─────────────────────────────────────────────────── */
const maintenanceAssetSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: SERVICE_CATEGORIES, required: true },
    condition: { type: String, enum: ASSET_CONDITIONS, default: 'good' },
    buildingId: { type: Schema.Types.ObjectId },
    roomId: { type: Schema.Types.ObjectId },
    manufacturer: { type: String },
    modelNumber: { type: String },
    serialNumber: { type: String },
    installDate: { type: Date },
    warrantyEnd: { type: Date },
    expectedLifeYears: { type: Number },
    replacementCost: { type: Number },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

maintenanceAssetSchema.index({ category: 1, condition: 1 });
maintenanceAssetSchema.index({ buildingId: 1 });

const DDDMaintenanceAsset =
  mongoose.models.DDDMaintenanceAsset ||
  mongoose.model('DDDMaintenanceAsset', maintenanceAssetSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class MaintenanceTracker extends BaseDomainModule {
  constructor() {
    super('MaintenanceTracker', {
      description: 'Work orders, preventive maintenance & equipment service tracking',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedAssets();
    this.log('Maintenance Tracker initialised ✓');
    return true;
  }

  async _seedAssets() {
    for (const a of BUILTIN_ASSETS) {
      const exists = await DDDMaintenanceAsset.findOne({ code: a.code }).lean();
      if (!exists) await DDDMaintenanceAsset.create({ ...a, isActive: true });
    }
  }

  /* ── Work Orders ── */
  async listWorkOrders(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.priority) q.priority = filters.priority;
    if (filters.type) q.type = filters.type;
    if (filters.buildingId) q.buildingId = filters.buildingId;
    if (filters.assignedTo) q.assignedTo = filters.assignedTo;
    return DDDWorkOrder.find(q).sort({ priority: -1, createdAt: -1 }).lean();
  }
  async getWorkOrder(id) {
    return DDDWorkOrder.findById(id).lean();
  }

  async createWorkOrder(data) {
    if (!data.workOrderCode) data.workOrderCode = `WO-${Date.now()}`;
    return DDDWorkOrder.create(data);
  }
  async updateWorkOrder(id, data) {
    return DDDWorkOrder.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async assignWorkOrder(id, userId, team) {
    return DDDWorkOrder.findByIdAndUpdate(
      id,
      {
        status: 'assigned',
        assignedTo: userId,
        assignedTeam: team,
      },
      { new: true }
    );
  }
  async startWorkOrder(id) {
    return DDDWorkOrder.findByIdAndUpdate(id, { status: 'in_progress' }, { new: true });
  }
  async completeWorkOrder(id, data = {}) {
    return DDDWorkOrder.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        completedDate: new Date(),
        actualHours: data.actualHours,
        actualCost: data.actualCost,
      },
      { new: true }
    );
  }
  async closeWorkOrder(id) {
    return DDDWorkOrder.findByIdAndUpdate(id, { status: 'closed' }, { new: true });
  }

  /* ── Preventive Schedules ── */
  async listPreventiveSchedules(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    if (filters.frequency) q.frequency = filters.frequency;
    return DDDPreventiveSchedule.find(q).sort({ nextDueDate: 1 }).lean();
  }
  async createPreventiveSchedule(data) {
    if (!data.code) data.code = `PM-${Date.now()}`;
    return DDDPreventiveSchedule.create(data);
  }
  async updatePreventiveSchedule(id, data) {
    return DDDPreventiveSchedule.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }
  async getOverdueSchedules() {
    return DDDPreventiveSchedule.find({
      isActive: true,
      nextDueDate: { $lt: new Date() },
    })
      .sort({ nextDueDate: 1 })
      .lean();
  }

  /* ── Service Records ── */
  async listServiceRecords(filters = {}) {
    const q = {};
    if (filters.assetId) q.assetId = filters.assetId;
    if (filters.category) q.category = filters.category;
    if (filters.workOrderId) q.workOrderId = filters.workOrderId;
    return DDDServiceRecord.find(q).sort({ datePerformed: -1 }).lean();
  }
  async createServiceRecord(data) {
    if (!data.recordCode) data.recordCode = `SVC-${Date.now()}`;
    return DDDServiceRecord.create(data);
  }

  /* ── Assets ── */
  async listAssets(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    if (filters.condition) q.condition = filters.condition;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    if (filters.buildingId) q.buildingId = filters.buildingId;
    return DDDMaintenanceAsset.find(q).sort({ name: 1 }).lean();
  }
  async getAsset(id) {
    return DDDMaintenanceAsset.findById(id).lean();
  }
  async createAsset(data) {
    return DDDMaintenanceAsset.create(data);
  }
  async updateAsset(id, data) {
    return DDDMaintenanceAsset.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Analytics ── */
  async getMaintenanceAnalytics() {
    const [workOrders, schedules, records, assets] = await Promise.all([
      DDDWorkOrder.countDocuments(),
      DDDPreventiveSchedule.countDocuments(),
      DDDServiceRecord.countDocuments(),
      DDDMaintenanceAsset.countDocuments(),
    ]);
    const openWorkOrders = await DDDWorkOrder.countDocuments({
      status: { $in: ['submitted', 'triaged', 'assigned', 'in_progress'] },
    });
    const overdueSchedules = await DDDPreventiveSchedule.countDocuments({
      isActive: true,
      nextDueDate: { $lt: new Date() },
    });
    const criticalAssets = await DDDMaintenanceAsset.countDocuments({
      condition: { $in: ['critical', 'non_functional'] },
    });
    return {
      workOrders,
      openWorkOrders,
      schedules,
      overdueSchedules,
      records,
      assets,
      criticalAssets,
    };
  }

  async healthCheck() {
    const [workOrders, schedules, records, assets] = await Promise.all([
      DDDWorkOrder.countDocuments(),
      DDDPreventiveSchedule.countDocuments(),
      DDDServiceRecord.countDocuments(),
      DDDMaintenanceAsset.countDocuments(),
    ]);
    return { status: 'healthy', workOrders, schedules, records, assets };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createMaintenanceTrackerRouter() {
  const router = Router();
  const svc = new MaintenanceTracker();

  /* Work Orders */
  router.get('/maintenance/work-orders', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listWorkOrders(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/maintenance/work-orders/:id', async (req, res) => {
    try {
      const d = await svc.getWorkOrder(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/work-orders', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createWorkOrder(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/maintenance/work-orders/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateWorkOrder(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/work-orders/:id/assign', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.assignWorkOrder(req.params.id, req.body.userId, req.body.team),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/work-orders/:id/start', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.startWorkOrder(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/work-orders/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeWorkOrder(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/work-orders/:id/close', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.closeWorkOrder(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Preventive Schedules */
  router.get('/maintenance/preventive-schedules', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPreventiveSchedules(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/preventive-schedules', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPreventiveSchedule(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/maintenance/preventive-schedules/:id', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updatePreventiveSchedule(req.params.id, req.body),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/maintenance/preventive-schedules/overdue', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getOverdueSchedules() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Service Records */
  router.get('/maintenance/service-records', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listServiceRecords(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/service-records', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createServiceRecord(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Assets */
  router.get('/maintenance/assets', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAssets(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/maintenance/assets/:id', async (req, res) => {
    try {
      const d = await svc.getAsset(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/maintenance/assets', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createAsset(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/maintenance/assets/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateAsset(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/maintenance/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getMaintenanceAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/maintenance/health', async (_req, res) => {
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
  MaintenanceTracker,
  DDDWorkOrder,
  DDDPreventiveSchedule,
  DDDServiceRecord,
  DDDMaintenanceAsset,
  WORK_ORDER_TYPES,
  WORK_ORDER_STATUSES,
  WORK_ORDER_PRIORITIES,
  PM_FREQUENCIES,
  SERVICE_CATEGORIES,
  ASSET_CONDITIONS,
  BUILTIN_ASSETS,
  createMaintenanceTrackerRouter,
};
