/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Transport Manager — Phase 24 · Transportation & Logistics
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Central transportation orchestration: vehicles, drivers, scheduling,
 * dispatch, and transport policies for rehabilitation facility logistics.
 *
 * Aggregates
 *   DDDVehicle           — registered facility vehicle
 *   DDDDriver            — certified driver profile
 *   DDDTransportSchedule — recurring schedule template
 *   DDDTransportPolicy   — transport rules & constraints
 *
 * Canonical links
 *   assignedTo → User / DDDStaffProfile
 *   vehicleId  → DDDVehicle
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

const VEHICLE_TYPES = [
  'sedan',
  'minivan',
  'wheelchair_van',
  'ambulance',
  'bus',
  'mini_bus',
  'suv',
  'cargo_van',
  'specialized_medical',
  'electric_vehicle',
  'hybrid',
  'stretcher_van',
];

const VEHICLE_STATUSES = [
  'available',
  'in_service',
  'en_route',
  'maintenance',
  'out_of_service',
  'reserved',
  'fueling',
  'inspection',
  'decommissioned',
  'standby',
];

const DRIVER_STATUSES = [
  'available',
  'on_duty',
  'off_duty',
  'on_break',
  'on_trip',
  'training',
  'sick_leave',
  'vacation',
  'suspended',
  'inactive',
];

const DRIVER_CERTIFICATIONS = [
  'basic_transport',
  'medical_transport',
  'wheelchair_assist',
  'stretcher_transport',
  'pediatric_certified',
  'first_aid',
  'cpr_certified',
  'defensive_driving',
  'hazmat_transport',
  'special_needs_training',
  'emergency_response',
  'passenger_assist',
];

const SCHEDULE_TYPES = [
  'daily_route',
  'weekly_recurring',
  'monthly_route',
  'on_demand',
  'emergency',
  'school_transport',
  'clinic_shuttle',
  'therapy_shuttle',
  'staff_transport',
  'special_event',
];

const POLICY_CATEGORIES = [
  'safety',
  'accessibility',
  'scheduling',
  'maintenance',
  'driver_conduct',
  'passenger_rights',
  'emergency_protocol',
  'fuel_management',
  'insurance',
  'compliance',
  'vehicle_assignment',
  'route_planning',
];

/* ── Built-in transport policies ────────────────────────────────────────── */
const BUILTIN_TRANSPORT_POLICIES = [
  {
    code: 'TPOL-SAFE',
    name: 'Transport Safety Policy',
    nameAr: 'سياسة سلامة النقل',
    category: 'safety',
  },
  {
    code: 'TPOL-ACCESS',
    name: 'Accessibility Standards',
    nameAr: 'معايير إمكانية الوصول',
    category: 'accessibility',
  },
  {
    code: 'TPOL-SCHED',
    name: 'Scheduling Guidelines',
    nameAr: 'إرشادات الجدولة',
    category: 'scheduling',
  },
  {
    code: 'TPOL-MAINT',
    name: 'Vehicle Maintenance Policy',
    nameAr: 'سياسة صيانة المركبات',
    category: 'maintenance',
  },
  {
    code: 'TPOL-DRIVER',
    name: 'Driver Conduct Standards',
    nameAr: 'معايير سلوك السائقين',
    category: 'driver_conduct',
  },
  {
    code: 'TPOL-PASS',
    name: 'Passenger Rights Charter',
    nameAr: 'ميثاق حقوق الركاب',
    category: 'passenger_rights',
  },
  {
    code: 'TPOL-EMRG',
    name: 'Emergency Transport Protocol',
    nameAr: 'بروتوكول النقل الطارئ',
    category: 'emergency_protocol',
  },
  {
    code: 'TPOL-FUEL',
    name: 'Fuel Management Policy',
    nameAr: 'سياسة إدارة الوقود',
    category: 'fuel_management',
  },
  {
    code: 'TPOL-INS',
    name: 'Transport Insurance Policy',
    nameAr: 'سياسة تأمين النقل',
    category: 'insurance',
  },
  {
    code: 'TPOL-COMP',
    name: 'Regulatory Compliance',
    nameAr: 'الامتثال التنظيمي',
    category: 'compliance',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Vehicle ───────────────────────────────────────────────────────────── */
const vehicleSchema = new Schema(
  {
    vehicleCode: { type: String, required: true, unique: true },
    plateNumber: { type: String, required: true },
    type: { type: String, enum: VEHICLE_TYPES, required: true },
    status: { type: String, enum: VEHICLE_STATUSES, default: 'available' },
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    color: { type: String },
    capacity: { type: Number, default: 4 },
    wheelchairCapacity: { type: Number, default: 0 },
    fuelType: { type: String, enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'cng'] },
    currentMileage: { type: Number, default: 0 },
    lastServiceDate: { type: Date },
    nextServiceDate: { type: Date },
    insuranceExpiry: { type: Date },
    registrationExpiry: { type: Date },
    features: [{ type: String }],
    gpsTrackerId: { type: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

vehicleSchema.index({ status: 1, type: 1 });

const DDDVehicle = mongoose.models.DDDVehicle || mongoose.model('DDDVehicle', vehicleSchema);

/* ── Driver ────────────────────────────────────────────────────────────── */
const driverSchema = new Schema(
  {
    driverCode: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, required: true },
    nameAr: { type: String },
    phone: { type: String },
    licenseNumber: { type: String, required: true },
    licenseExpiry: { type: Date },
    status: { type: String, enum: DRIVER_STATUSES, default: 'available' },
    certifications: [{ type: String, enum: DRIVER_CERTIFICATIONS }],
    assignedVehicle: { type: Schema.Types.ObjectId, ref: 'DDDVehicle' },
    rating: { type: Number, min: 0, max: 5, default: 5 },
    totalTrips: { type: Number, default: 0 },
    violations: [{ date: Date, type: String, description: String, resolved: Boolean }],
    emergencyContact: { name: String, phone: String, relation: String },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

driverSchema.index({ status: 1 });

const DDDDriver = mongoose.models.DDDDriver || mongoose.model('DDDDriver', driverSchema);

/* ── Transport Schedule ────────────────────────────────────────────────── */
const transportScheduleSchema = new Schema(
  {
    scheduleCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: SCHEDULE_TYPES, required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle' },
    driverId: { type: Schema.Types.ObjectId, ref: 'DDDDriver' },
    route: {
      origin: String,
      destination: String,
      waypoints: [{ location: String, order: Number }],
    },
    recurrence: { pattern: String, daysOfWeek: [Number], startTime: String, endTime: String },
    effectiveFrom: { type: Date },
    effectiveTo: { type: Date },
    maxPassengers: { type: Number },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDTransportSchedule =
  mongoose.models.DDDTransportSchedule ||
  mongoose.model('DDDTransportSchedule', transportScheduleSchema);

/* ── Transport Policy ──────────────────────────────────────────────────── */
const transportPolicySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: POLICY_CATEGORIES, required: true },
    description: { type: String },
    rules: [{ ruleId: String, description: String, mandatory: Boolean }],
    version: { type: Number, default: 1 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    effectiveDate: { type: Date },
    nextReviewDate: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDTransportPolicy =
  mongoose.models.DDDTransportPolicy || mongoose.model('DDDTransportPolicy', transportPolicySchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class TransportManager extends BaseDomainModule {
  constructor() {
    super('TransportManager', {
      description: 'Central transportation orchestration & fleet management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedPolicies();
    this.log('Transport Manager initialised ✓');
    return true;
  }

  async _seedPolicies() {
    for (const p of BUILTIN_TRANSPORT_POLICIES) {
      const exists = await DDDTransportPolicy.findOne({ code: p.code }).lean();
      if (!exists) await DDDTransportPolicy.create(p);
    }
  }

  /* ── Vehicles ── */
  async listVehicles(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDVehicle.find(q).sort({ vehicleCode: 1 }).lean();
  }
  async getVehicle(id) {
    return DDDVehicle.findById(id).lean();
  }
  async registerVehicle(data) {
    if (!data.vehicleCode) data.vehicleCode = `VEH-${Date.now()}`;
    return DDDVehicle.create(data);
  }
  async updateVehicle(id, data) {
    return DDDVehicle.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Drivers ── */
  async listDrivers(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDDriver.find(q).sort({ name: 1 }).lean();
  }
  async getDriver(id) {
    return DDDDriver.findById(id).lean();
  }
  async registerDriver(data) {
    if (!data.driverCode) data.driverCode = `DRV-${Date.now()}`;
    return DDDDriver.create(data);
  }
  async updateDriver(id, data) {
    return DDDDriver.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Schedules ── */
  async listSchedules(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDTransportSchedule.find(q).sort({ name: 1 }).lean();
  }
  async createSchedule(data) {
    if (!data.scheduleCode) data.scheduleCode = `TSCHED-${Date.now()}`;
    return DDDTransportSchedule.create(data);
  }
  async updateSchedule(id, data) {
    return DDDTransportSchedule.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    return DDDTransportPolicy.find(q).sort({ name: 1 }).lean();
  }
  async createPolicy(data) {
    return DDDTransportPolicy.create(data);
  }

  /* ── Analytics ── */
  async getTransportAnalytics() {
    const [vehicles, drivers, schedules, policies] = await Promise.all([
      DDDVehicle.countDocuments(),
      DDDDriver.countDocuments(),
      DDDTransportSchedule.countDocuments(),
      DDDTransportPolicy.countDocuments(),
    ]);
    const availableVehicles = await DDDVehicle.countDocuments({
      status: 'available',
      isActive: true,
    });
    const availableDrivers = await DDDDriver.countDocuments({
      status: 'available',
      isActive: true,
    });
    return { vehicles, drivers, schedules, policies, availableVehicles, availableDrivers };
  }

  async healthCheck() {
    const [vehicles, drivers] = await Promise.all([
      DDDVehicle.countDocuments({ isActive: true }),
      DDDDriver.countDocuments({ isActive: true }),
    ]);
    return { status: 'healthy', activeVehicles: vehicles, activeDrivers: drivers };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createTransportManagerRouter() {
  const router = Router();
  const svc = new TransportManager();

  /* Vehicles */
  router.get('/transport/vehicles', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listVehicles(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/transport/vehicles/:id', async (req, res) => {
    try {
      const d = await svc.getVehicle(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/transport/vehicles', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerVehicle(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/transport/vehicles/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateVehicle(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Drivers */
  router.get('/transport/drivers', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listDrivers(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/transport/drivers', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.registerDriver(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Schedules */
  router.get('/transport/schedules', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSchedules(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/transport/schedules', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSchedule(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Policies */
  router.get('/transport/policies', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/transport/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getTransportAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/transport/health', async (_req, res) => {
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
  TransportManager,
  DDDVehicle,
  DDDDriver,
  DDDTransportSchedule,
  DDDTransportPolicy,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  DRIVER_STATUSES,
  DRIVER_CERTIFICATIONS,
  SCHEDULE_TYPES,
  POLICY_CATEGORIES,
  BUILTIN_TRANSPORT_POLICIES,
  createTransportManagerRouter,
};
