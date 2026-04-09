'use strict';
/**
 * DDD Equipment Lifecycle Service
 * ─────────────────────────────────
 * Phase 34 – Environmental & Facility Management (Module 1/4)
 *
 * Manages medical/rehab equipment lifecycle including procurement,
 * commissioning, maintenance, calibration, and decommissioning.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const EQUIPMENT_CATEGORIES = [
  'therapeutic',
  'diagnostic',
  'assistive',
  'monitoring',
  'surgical',
  'imaging',
  'laboratory',
  'rehabilitation',
  'mobility',
  'communication',
  'environmental',
  'computing',
];

const LIFECYCLE_STAGES = [
  'procurement',
  'received',
  'inspection',
  'commissioned',
  'in_service',
  'maintenance',
  'repair',
  'calibration',
  'decommissioned',
  'disposed',
];

const MAINTENANCE_TYPES = [
  'preventive',
  'corrective',
  'predictive',
  'emergency',
  'calibration',
  'safety_check',
  'software_update',
  'cleaning',
  'inspection',
  'overhaul',
];

const CONDITION_RATINGS = [
  'excellent',
  'good',
  'fair',
  'poor',
  'critical',
  'non_functional',
  'new',
  'refurbished',
  'end_of_life',
  'unknown',
];

const WARRANTY_TYPES = [
  'manufacturer',
  'extended',
  'third_party',
  'self_insured',
  'parts_only',
  'labor_only',
  'comprehensive',
  'limited',
  'lifetime',
  'none',
];

const COMPLIANCE_STANDARDS = [
  'FDA_510K',
  'CE_Mark',
  'ISO_13485',
  'IEC_60601',
  'SFDA_MDMA',
  'JCI',
  'OSHA',
  'NFPA',
  'AAMI',
  'ECRI',
];

const BUILTIN_EQUIPMENT_TEMPLATES = [
  { code: 'TREADMILL', name: 'Rehab Treadmill', category: 'rehabilitation', lifeYears: 10 },
  { code: 'PARALLEL_BAR', name: 'Parallel Bars', category: 'rehabilitation', lifeYears: 15 },
  { code: 'ULTRASOUND_TH', name: 'Therapeutic Ultrasound', category: 'therapeutic', lifeYears: 8 },
  { code: 'STIM_UNIT', name: 'Electrical Stimulation', category: 'therapeutic', lifeYears: 7 },
  { code: 'WHEELCHAIR', name: 'Powered Wheelchair', category: 'mobility', lifeYears: 5 },
  { code: 'PULSE_OX', name: 'Pulse Oximeter', category: 'monitoring', lifeYears: 5 },
  { code: 'STANDING_FR', name: 'Standing Frame', category: 'assistive', lifeYears: 10 },
  { code: 'GAIT_ANALY', name: 'Gait Analysis System', category: 'diagnostic', lifeYears: 8 },
  { code: 'BALANCE_PLT', name: 'Balance Platform', category: 'rehabilitation', lifeYears: 8 },
  { code: 'AAC_DEVICE', name: 'AAC Communication Device', category: 'communication', lifeYears: 5 },
];

/* ═══════════════════ Schemas ═══════════════════ */
const equipmentAssetSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, enum: EQUIPMENT_CATEGORIES, required: true },
    lifecycleStage: { type: String, enum: LIFECYCLE_STAGES, default: 'procurement' },
    serialNumber: { type: String },
    modelNumber: { type: String },
    manufacturer: { type: String },
    purchaseDate: { type: Date },
    purchaseCost: { type: Number },
    condition: { type: String, enum: CONDITION_RATINGS, default: 'new' },
    warrantyType: { type: String, enum: WARRANTY_TYPES },
    warrantyExpiry: { type: Date },
    location: { type: String },
    departmentId: { type: Schema.Types.ObjectId },
    compliance: [{ type: String, enum: COMPLIANCE_STANDARDS }],
    expectedLifeYears: { type: Number },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
equipmentAssetSchema.index({ category: 1, lifecycleStage: 1 });
equipmentAssetSchema.index({ serialNumber: 1 });

const maintenanceRecordSchema = new Schema(
  {
    equipmentId: { type: Schema.Types.ObjectId, ref: 'DDDEquipmentAsset', required: true },
    maintenanceType: { type: String, enum: MAINTENANCE_TYPES, required: true },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'],
      default: 'scheduled',
    },
    technician: { type: String },
    cost: { type: Number },
    findings: { type: String },
    partsReplaced: [{ name: String, partNumber: String, cost: Number }],
    nextDueDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
maintenanceRecordSchema.index({ equipmentId: 1, scheduledDate: -1 });
maintenanceRecordSchema.index({ status: 1, maintenanceType: 1 });

const calibrationLogSchema = new Schema(
  {
    equipmentId: { type: Schema.Types.ObjectId, ref: 'DDDEquipmentAsset', required: true },
    calibrationDate: { type: Date, default: Date.now },
    nextCalibration: { type: Date },
    standard: { type: String },
    result: { type: String, enum: ['pass', 'fail', 'conditional', 'deferred'], required: true },
    deviation: { type: Number },
    certificateNumber: { type: String },
    calibratedBy: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
calibrationLogSchema.index({ equipmentId: 1, calibrationDate: -1 });
calibrationLogSchema.index({ result: 1 });

const disposalRecordSchema = new Schema(
  {
    equipmentId: { type: Schema.Types.ObjectId, ref: 'DDDEquipmentAsset', required: true },
    disposalMethod: {
      type: String,
      enum: ['sale', 'donation', 'recycling', 'destruction', 'trade_in', 'return_vendor'],
      required: true,
    },
    disposalDate: { type: Date },
    reason: { type: String, required: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    residualValue: { type: Number },
    disposalCost: { type: Number },
    certificate: { type: String },
    environmentalCompliance: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
disposalRecordSchema.index({ equipmentId: 1 });
disposalRecordSchema.index({ disposalMethod: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDEquipmentAsset =
  mongoose.models.DDDEquipmentAsset || mongoose.model('DDDEquipmentAsset', equipmentAssetSchema);
const DDDMaintenanceRecord =
  mongoose.models.DDDMaintenanceRecord ||
  mongoose.model('DDDMaintenanceRecord', maintenanceRecordSchema);
const DDDCalibrationLog =
  mongoose.models.DDDCalibrationLog || mongoose.model('DDDCalibrationLog', calibrationLogSchema);
const DDDDisposalRecord =
  mongoose.models.DDDDisposalRecord || mongoose.model('DDDDisposalRecord', disposalRecordSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class EquipmentLifecycle {
  async createAsset(data) {
    return DDDEquipmentAsset.create(data);
  }
  async listAssets(filter = {}, page = 1, limit = 20) {
    return DDDEquipmentAsset.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateAsset(id, data) {
    return DDDEquipmentAsset.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async createMaintenance(data) {
    return DDDMaintenanceRecord.create(data);
  }
  async listMaintenance(filter = {}, page = 1, limit = 20) {
    return DDDMaintenanceRecord.find(filter)
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createCalibration(data) {
    return DDDCalibrationLog.create(data);
  }
  async listCalibrations(filter = {}, page = 1, limit = 20) {
    return DDDCalibrationLog.find(filter)
      .sort({ calibrationDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createDisposal(data) {
    return DDDDisposalRecord.create(data);
  }
  async listDisposals(filter = {}, page = 1, limit = 20) {
    return DDDDisposalRecord.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getLifecycleStats() {
    const [assets, overdue, calibrations, disposals] = await Promise.all([
      DDDEquipmentAsset.countDocuments({ lifecycleStage: 'in_service' }),
      DDDMaintenanceRecord.countDocuments({ status: 'overdue' }),
      DDDCalibrationLog.countDocuments({ result: 'pass' }),
      DDDDisposalRecord.countDocuments(),
    ]);
    return {
      activeAssets: assets,
      overdueMaintenance: overdue,
      passedCalibrations: calibrations,
      totalDisposals: disposals,
    };
  }

  async healthCheck() {
    const [assets, maintenance, calibrations, disposals] = await Promise.all([
      DDDEquipmentAsset.countDocuments(),
      DDDMaintenanceRecord.countDocuments(),
      DDDCalibrationLog.countDocuments(),
      DDDDisposalRecord.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'EquipmentLifecycle',
      counts: { assets, maintenance, calibrations, disposals },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createEquipmentLifecycleRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new EquipmentLifecycle();

  router.get('/equipment-lifecycle/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/equipment-lifecycle/assets', async (req, res) => {
    try {
      res.status(201).json(await svc.createAsset(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/equipment-lifecycle/assets', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAssets(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/equipment-lifecycle/assets/:id', async (req, res) => {
    try {
      res.json(await svc.updateAsset(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/equipment-lifecycle/maintenance', async (req, res) => {
    try {
      res.status(201).json(await svc.createMaintenance(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/equipment-lifecycle/maintenance', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listMaintenance(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/equipment-lifecycle/calibrations', async (req, res) => {
    try {
      res.status(201).json(await svc.createCalibration(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/equipment-lifecycle/calibrations', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listCalibrations(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.post('/equipment-lifecycle/disposals', async (req, res) => {
    try {
      res.status(201).json(await svc.createDisposal(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/equipment-lifecycle/disposals', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listDisposals(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/equipment-lifecycle/stats', async (_req, res) => {
    try {
      res.json(await svc.getLifecycleStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  EQUIPMENT_CATEGORIES,
  LIFECYCLE_STAGES,
  MAINTENANCE_TYPES,
  CONDITION_RATINGS,
  WARRANTY_TYPES,
  COMPLIANCE_STANDARDS,
  BUILTIN_EQUIPMENT_TEMPLATES,
  DDDEquipmentAsset,
  DDDMaintenanceRecord,
  DDDCalibrationLog,
  DDDDisposalRecord,
  EquipmentLifecycle,
  createEquipmentLifecycleRouter,
};
