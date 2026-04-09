/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Fleet Tracker — Phase 24 · Transportation & Logistics
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fleet monitoring: fuel management, GPS tracking, maintenance logs,
 * vehicle inspections, and fleet-wide analytics.
 *
 * Aggregates
 *   DDDFuelLog           — fuel fill-up / consumption record
 *   DDDGPSTracking       — GPS location snapshot / trail
 *   DDDVehicleMaintenance — vehicle maintenance record
 *   DDDVehicleInspection — pre-/post-trip vehicle inspection
 *
 * Canonical links
 *   vehicleId → DDDVehicle
 *   driverId  → DDDDriver
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

const FUEL_TYPES = [
  'gasoline_91',
  'gasoline_95',
  'diesel',
  'premium_diesel',
  'electric_charge',
  'hybrid_fuel',
  'cng',
  'lpg',
  'hydrogen',
  'biodiesel',
  'ethanol',
  'flex_fuel',
];

const MAINTENANCE_CATEGORIES = [
  'oil_change',
  'tire_rotation',
  'brake_service',
  'engine_repair',
  'transmission',
  'electrical',
  'ac_heating',
  'body_work',
  'suspension',
  'exhaust',
  'battery',
  'general_inspection',
];

const MAINTENANCE_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'deferred',
  'cancelled',
  'awaiting_parts',
  'under_review',
  'approved',
  'warranty_claim',
  'outsourced',
];

const INSPECTION_TYPES = [
  'pre_trip',
  'post_trip',
  'daily',
  'weekly',
  'monthly',
  'annual',
  'post_incident',
  'random',
  'regulatory',
  'safety_recall',
];

const INSPECTION_STATUSES = [
  'pending',
  'in_progress',
  'passed',
  'failed',
  'conditional_pass',
  'needs_repair',
  'completed',
  'cancelled',
  'overdue',
  'scheduled',
];

const TRACKING_EVENTS = [
  'ignition_on',
  'ignition_off',
  'moving',
  'stopped',
  'speeding',
  'hard_brake',
  'hard_acceleration',
  'sharp_turn',
  'geofence_enter',
  'geofence_exit',
  'idle',
  'tow_alert',
];

const ALERT_TYPES = [
  'speed_violation',
  'geofence_breach',
  'maintenance_due',
  'fuel_low',
  'battery_low',
  'tire_pressure',
  'engine_warning',
  'insurance_expiry',
  'license_expiry',
  'inspection_due',
  'unauthorized_use',
  'accident_detected',
];

/* ── Built-in maintenance schedules ─────────────────────────────────────── */
const BUILTIN_MAINTENANCE_SCHEDULES = [
  {
    code: 'FMNT-OIL',
    name: 'Oil Change',
    nameAr: 'تغيير زيت',
    category: 'oil_change',
    intervalKm: 5000,
    intervalDays: 90,
  },
  {
    code: 'FMNT-TIRE',
    name: 'Tire Rotation',
    nameAr: 'تدوير الإطارات',
    category: 'tire_rotation',
    intervalKm: 10000,
    intervalDays: 180,
  },
  {
    code: 'FMNT-BRAKE',
    name: 'Brake Inspection',
    nameAr: 'فحص الفرامل',
    category: 'brake_service',
    intervalKm: 20000,
    intervalDays: 365,
  },
  {
    code: 'FMNT-BATT',
    name: 'Battery Check',
    nameAr: 'فحص البطارية',
    category: 'battery',
    intervalKm: 0,
    intervalDays: 180,
  },
  {
    code: 'FMNT-AC',
    name: 'AC Service',
    nameAr: 'صيانة التكييف',
    category: 'ac_heating',
    intervalKm: 0,
    intervalDays: 365,
  },
  {
    code: 'FMNT-TRANS',
    name: 'Transmission Service',
    nameAr: 'صيانة ناقل الحركة',
    category: 'transmission',
    intervalKm: 60000,
    intervalDays: 730,
  },
  {
    code: 'FMNT-SUSP',
    name: 'Suspension Check',
    nameAr: 'فحص نظام التعليق',
    category: 'suspension',
    intervalKm: 40000,
    intervalDays: 365,
  },
  {
    code: 'FMNT-ELEC',
    name: 'Electrical System Check',
    nameAr: 'فحص النظام الكهربائي',
    category: 'electrical',
    intervalKm: 30000,
    intervalDays: 365,
  },
  {
    code: 'FMNT-EXH',
    name: 'Exhaust System Check',
    nameAr: 'فحص نظام العادم',
    category: 'exhaust',
    intervalKm: 50000,
    intervalDays: 365,
  },
  {
    code: 'FMNT-GEN',
    name: 'General Inspection',
    nameAr: 'فحص عام',
    category: 'general_inspection',
    intervalKm: 0,
    intervalDays: 30,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Fuel Log ──────────────────────────────────────────────────────────── */
const fuelLogSchema = new Schema(
  {
    logCode: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'DDDDriver' },
    fuelType: { type: String, enum: FUEL_TYPES, required: true },
    liters: { type: Number, required: true },
    costPerLiter: { type: Number },
    totalCost: { type: Number },
    odometerReading: { type: Number },
    station: { type: String },
    filledAt: { type: Date, default: Date.now },
    fullTank: { type: Boolean, default: true },
    receiptUrl: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

fuelLogSchema.index({ vehicleId: 1, filledAt: -1 });

const DDDFuelLog = mongoose.models.DDDFuelLog || mongoose.model('DDDFuelLog', fuelLogSchema);

/* ── GPS Tracking ──────────────────────────────────────────────────────── */
const gpsTrackingSchema = new Schema(
  {
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'DDDDriver' },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    speed: { type: Number, default: 0 },
    heading: { type: Number },
    altitude: { type: Number },
    accuracy: { type: Number },
    event: { type: String, enum: TRACKING_EVENTS },
    address: { type: String },
    timestamp: { type: Date, default: Date.now },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

gpsTrackingSchema.index({ vehicleId: 1, timestamp: -1 });
gpsTrackingSchema.index({ timestamp: -1 });

const DDDGPSTracking =
  mongoose.models.DDDGPSTracking || mongoose.model('DDDGPSTracking', gpsTrackingSchema);

/* ── Vehicle Maintenance ───────────────────────────────────────────────── */
const vehicleMaintenanceSchema = new Schema(
  {
    maintenanceCode: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle', required: true },
    category: { type: String, enum: MAINTENANCE_CATEGORIES, required: true },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: 'scheduled' },
    description: { type: String },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    odometerAtService: { type: Number },
    cost: { type: Number },
    vendor: { type: String },
    parts: [{ name: String, partNumber: String, quantity: Number, cost: Number }],
    laborHours: { type: Number },
    notes: { type: String },
    nextServiceDate: { type: Date },
    nextServiceKm: { type: Number },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

vehicleMaintenanceSchema.index({ vehicleId: 1, scheduledDate: -1 });
vehicleMaintenanceSchema.index({ status: 1 });

const DDDVehicleMaintenance =
  mongoose.models.DDDVehicleMaintenance ||
  mongoose.model('DDDVehicleMaintenance', vehicleMaintenanceSchema);

/* ── Vehicle Inspection ────────────────────────────────────────────────── */
const vehicleInspectionSchema = new Schema(
  {
    inspectionCode: { type: String, required: true, unique: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'DDDDriver' },
    type: { type: String, enum: INSPECTION_TYPES, required: true },
    status: { type: String, enum: INSPECTION_STATUSES, default: 'pending' },
    scheduledDate: { type: Date },
    completedAt: { type: Date },
    checklist: [
      {
        item: { type: String },
        status: { type: String, enum: ['pass', 'fail', 'na', 'needs_attention'] },
        notes: { type: String },
      },
    ],
    overallResult: { type: String, enum: ['pass', 'fail', 'conditional'] },
    odometerReading: { type: Number },
    findings: [{ area: String, description: String, severity: String }],
    photos: [{ url: String, description: String }],
    inspectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

vehicleInspectionSchema.index({ vehicleId: 1, scheduledDate: -1 });

const DDDVehicleInspection =
  mongoose.models.DDDVehicleInspection ||
  mongoose.model('DDDVehicleInspection', vehicleInspectionSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class FleetTracker extends BaseDomainModule {
  constructor() {
    super('FleetTracker', {
      description: 'Fleet monitoring, fuel, GPS tracking & maintenance',
      version: '1.0.0',
    });
  }

  async initialize() {
    this.log('Fleet Tracker initialised ✓');
    return true;
  }

  /* ── Fuel ── */
  async listFuelLogs(filters = {}) {
    const q = {};
    if (filters.vehicleId) q.vehicleId = filters.vehicleId;
    return DDDFuelLog.find(q).sort({ filledAt: -1 }).limit(200).lean();
  }
  async logFuel(data) {
    if (!data.logCode) data.logCode = `FUEL-${Date.now()}`;
    if (data.liters && data.costPerLiter && !data.totalCost)
      data.totalCost = data.liters * data.costPerLiter;
    return DDDFuelLog.create(data);
  }

  /* ── GPS ── */
  async getLatestPosition(vehicleId) {
    return DDDGPSTracking.findOne({ vehicleId }).sort({ timestamp: -1 }).lean();
  }
  async getTrackingHistory(vehicleId, from, to) {
    const q = { vehicleId };
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = from;
      if (to) q.timestamp.$lte = to;
    }
    return DDDGPSTracking.find(q).sort({ timestamp: 1 }).lean();
  }
  async recordPosition(data) {
    return DDDGPSTracking.create(data);
  }

  /* ── Maintenance ── */
  async listMaintenance(filters = {}) {
    const q = {};
    if (filters.vehicleId) q.vehicleId = filters.vehicleId;
    if (filters.status) q.status = filters.status;
    if (filters.category) q.category = filters.category;
    return DDDVehicleMaintenance.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleMaintenance(data) {
    if (!data.maintenanceCode) data.maintenanceCode = `VMNT-${Date.now()}`;
    return DDDVehicleMaintenance.create(data);
  }
  async completeMaintenance(id, details) {
    return DDDVehicleMaintenance.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', completedAt: new Date() },
      { new: true }
    );
  }

  /* ── Inspections ── */
  async listInspections(filters = {}) {
    const q = {};
    if (filters.vehicleId) q.vehicleId = filters.vehicleId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDVehicleInspection.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleInspection(data) {
    if (!data.inspectionCode) data.inspectionCode = `VINSP-${Date.now()}`;
    return DDDVehicleInspection.create(data);
  }
  async completeInspection(id, results) {
    return DDDVehicleInspection.findByIdAndUpdate(
      id,
      {
        ...results,
        status: results.overallResult === 'pass' ? 'passed' : 'failed',
        completedAt: new Date(),
      },
      { new: true }
    );
  }

  /* ── Analytics ── */
  async getFleetAnalytics() {
    const [fuelLogs, gpsRecords, maintenanceRecords, inspections] = await Promise.all([
      DDDFuelLog.countDocuments(),
      DDDGPSTracking.countDocuments(),
      DDDVehicleMaintenance.countDocuments(),
      DDDVehicleInspection.countDocuments(),
    ]);
    const pendingMaintenance = await DDDVehicleMaintenance.countDocuments({
      status: { $in: ['scheduled', 'awaiting_parts'] },
    });
    return { fuelLogs, gpsRecords, maintenanceRecords, inspections, pendingMaintenance };
  }

  async healthCheck() {
    const [overdue, pending] = await Promise.all([
      DDDVehicleInspection.countDocuments({ status: 'overdue' }),
      DDDVehicleMaintenance.countDocuments({ status: 'scheduled' }),
    ]);
    return { status: 'healthy', overdueInspections: overdue, pendingMaintenance: pending };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createFleetTrackerRouter() {
  const router = Router();
  const svc = new FleetTracker();

  /* Fuel */
  router.get('/fleet/fuel-logs', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listFuelLogs(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/fleet/fuel-logs', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.logFuel(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* GPS */
  router.get('/fleet/tracking/:vehicleId/latest', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getLatestPosition(req.params.vehicleId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/fleet/tracking/:vehicleId/history', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.getTrackingHistory(req.params.vehicleId, req.query.from, req.query.to),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/fleet/tracking', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.recordPosition(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Maintenance */
  router.get('/fleet/maintenance', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listMaintenance(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/fleet/maintenance', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleMaintenance(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/fleet/maintenance/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeMaintenance(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Inspections */
  router.get('/fleet/inspections', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listInspections(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/fleet/inspections', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.scheduleInspection(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/fleet/inspections/:id/complete', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.completeInspection(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/fleet/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getFleetAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/fleet/health', async (_req, res) => {
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
  FleetTracker,
  DDDFuelLog,
  DDDGPSTracking,
  DDDVehicleMaintenance,
  DDDVehicleInspection,
  FUEL_TYPES,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  TRACKING_EVENTS,
  ALERT_TYPES,
  BUILTIN_MAINTENANCE_SCHEDULES,
  createFleetTrackerRouter,
};
