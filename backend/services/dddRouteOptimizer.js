/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Route Optimizer — Phase 24 · Transportation & Logistics
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Route planning, zone management, ETA calculation, traffic-aware
 * optimization, and route analytics for facility transport operations.
 *
 * Aggregates
 *   DDDRoute             — defined route template
 *   DDDRouteExecution    — actual route run / execution
 *   DDDServiceZone       — geographic service zone
 *   DDDETACalculation    — ETA estimate record
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

const ROUTE_TYPES = [
  'fixed_route',
  'dynamic_route',
  'shuttle_loop',
  'point_to_point',
  'multi_stop',
  'express',
  'medical_corridor',
  'school_route',
  'community_route',
  'emergency_route',
  'inter_facility',
  'charter',
];

const ROUTE_STATUSES = [
  'draft',
  'active',
  'optimized',
  'suspended',
  'archived',
  'under_review',
  'seasonal',
  'modified',
  'approved',
  'discontinued',
];

const ZONE_TYPES = [
  'primary_coverage',
  'secondary_coverage',
  'extended_service',
  'restricted',
  'emergency_only',
  'school_district',
  'residential',
  'commercial',
  'medical_district',
  'rural_outreach',
  'urban_core',
  'suburban',
];

const OPTIMIZATION_CRITERIA = [
  'shortest_distance',
  'shortest_time',
  'least_fuel',
  'fewest_stops',
  'accessibility_priority',
  'patient_comfort',
  'cost_efficient',
  'traffic_aware',
  'weather_adjusted',
  'load_balanced',
  'time_window',
  'multi_objective',
];

const TRAFFIC_CONDITIONS = [
  'free_flow',
  'light',
  'moderate',
  'heavy',
  'congested',
  'standstill',
  'incident_delay',
  'construction_zone',
  'school_zone',
  'unknown',
];

const ETA_STATUSES = [
  'calculated',
  'on_schedule',
  'delayed',
  'ahead_of_schedule',
  'recalculating',
  'arrived',
  'cancelled',
  'expired',
];

/* ── Built-in routes ────────────────────────────────────────────────────── */
const BUILTIN_ROUTES = [
  {
    code: 'RTE-MAIN',
    name: 'Main Campus Shuttle',
    nameAr: 'حافلة الحرم الرئيسي',
    type: 'shuttle_loop',
    estimatedMinutes: 45,
  },
  {
    code: 'RTE-NORTH',
    name: 'North District Route',
    nameAr: 'مسار المنطقة الشمالية',
    type: 'multi_stop',
    estimatedMinutes: 60,
  },
  {
    code: 'RTE-SOUTH',
    name: 'South District Route',
    nameAr: 'مسار المنطقة الجنوبية',
    type: 'multi_stop',
    estimatedMinutes: 55,
  },
  {
    code: 'RTE-EAST',
    name: 'East District Route',
    nameAr: 'مسار المنطقة الشرقية',
    type: 'multi_stop',
    estimatedMinutes: 50,
  },
  {
    code: 'RTE-WEST',
    name: 'West District Route',
    nameAr: 'مسار المنطقة الغربية',
    type: 'multi_stop',
    estimatedMinutes: 65,
  },
  {
    code: 'RTE-MED',
    name: 'Medical Corridor Express',
    nameAr: 'ممر طبي سريع',
    type: 'medical_corridor',
    estimatedMinutes: 30,
  },
  {
    code: 'RTE-SCHOOL',
    name: 'School Transport Route',
    nameAr: 'مسار النقل المدرسي',
    type: 'school_route',
    estimatedMinutes: 40,
  },
  {
    code: 'RTE-INTER',
    name: 'Inter-Facility Transfer',
    nameAr: 'النقل بين المرافق',
    type: 'inter_facility',
    estimatedMinutes: 25,
  },
  {
    code: 'RTE-COMM',
    name: 'Community Outreach Route',
    nameAr: 'مسار التوعية المجتمعية',
    type: 'community_route',
    estimatedMinutes: 90,
  },
  {
    code: 'RTE-EMRG',
    name: 'Emergency Response Route',
    nameAr: 'مسار الاستجابة الطارئة',
    type: 'emergency_route',
    estimatedMinutes: 15,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Route ─────────────────────────────────────────────────────────────── */
const routeSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: ROUTE_TYPES, required: true },
    status: { type: String, enum: ROUTE_STATUSES, default: 'draft' },
    origin: { address: String, lat: Number, lng: Number },
    destination: { address: String, lat: Number, lng: Number },
    waypoints: [{ order: Number, address: String, lat: Number, lng: Number, stopDuration: Number }],
    distanceKm: { type: Number },
    estimatedMinutes: { type: Number },
    optimizationCriteria: { type: String, enum: OPTIMIZATION_CRITERIA, default: 'shortest_time' },
    schedule: { daysOfWeek: [Number], departureTime: String, frequency: String },
    zoneId: { type: Schema.Types.ObjectId, ref: 'DDDServiceZone' },
    maxPassengers: { type: Number },
    accessibilityFeatures: [{ type: String }],
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

routeSchema.index({ type: 1, status: 1 });

const DDDRoute = mongoose.models.DDDRoute || mongoose.model('DDDRoute', routeSchema);

/* ── Route Execution ───────────────────────────────────────────────────── */
const routeExecutionSchema = new Schema(
  {
    executionCode: { type: String, required: true, unique: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'DDDRoute', required: true },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle' },
    driverId: { type: Schema.Types.ObjectId, ref: 'DDDDriver' },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed', 'diverted'],
    },
    plannedDepartureTime: { type: Date },
    actualDepartureTime: { type: Date },
    plannedArrivalTime: { type: Date },
    actualArrivalTime: { type: Date },
    actualDistanceKm: { type: Number },
    actualDurationMinutes: { type: Number },
    passengerCount: { type: Number, default: 0 },
    stops: [
      {
        waypointIndex: Number,
        arrivedAt: Date,
        departedAt: Date,
        passengersOn: Number,
        passengersOff: Number,
      },
    ],
    deviations: [{ reason: String, description: String, timestamp: Date }],
    trafficCondition: { type: String, enum: TRAFFIC_CONDITIONS },
    fuelConsumed: { type: Number },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

routeExecutionSchema.index({ routeId: 1, plannedDepartureTime: -1 });

const DDDRouteExecution =
  mongoose.models.DDDRouteExecution || mongoose.model('DDDRouteExecution', routeExecutionSchema);

/* ── Service Zone ──────────────────────────────────────────────────────── */
const serviceZoneSchema = new Schema(
  {
    zoneCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: ZONE_TYPES, required: true },
    boundary: {
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: { type: [[[Number]]], default: undefined },
    },
    centerPoint: { lat: Number, lng: Number },
    radiusKm: { type: Number },
    population: { type: Number },
    assignedVehicles: [{ type: Schema.Types.ObjectId, ref: 'DDDVehicle' }],
    surchargePercent: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDServiceZone =
  mongoose.models.DDDServiceZone || mongoose.model('DDDServiceZone', serviceZoneSchema);

/* ── ETA Calculation ───────────────────────────────────────────────────── */
const etaCalculationSchema = new Schema(
  {
    calcCode: { type: String, required: true, unique: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'DDDRoute' },
    executionId: { type: Schema.Types.ObjectId, ref: 'DDDRouteExecution' },
    vehicleId: { type: Schema.Types.ObjectId, ref: 'DDDVehicle' },
    origin: { lat: Number, lng: Number },
    destination: { lat: Number, lng: Number },
    estimatedMinutes: { type: Number },
    estimatedArrival: { type: Date },
    status: { type: String, enum: ETA_STATUSES, default: 'calculated' },
    trafficCondition: { type: String, enum: TRAFFIC_CONDITIONS },
    calculatedAt: { type: Date, default: Date.now },
    confidence: { type: Number, min: 0, max: 100, default: 85 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDETACalculation =
  mongoose.models.DDDETACalculation || mongoose.model('DDDETACalculation', etaCalculationSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class RouteOptimizer extends BaseDomainModule {
  constructor() {
    super('RouteOptimizer', {
      description: 'Route planning, optimization & zone management',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedRoutes();
    this.log('Route Optimizer initialised ✓');
    return true;
  }

  async _seedRoutes() {
    for (const r of BUILTIN_ROUTES) {
      const exists = await DDDRoute.findOne({ code: r.code }).lean();
      if (!exists) await DDDRoute.create(r);
    }
  }

  /* ── Routes ── */
  async listRoutes(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDRoute.find(q).sort({ name: 1 }).lean();
  }
  async getRoute(id) {
    return DDDRoute.findById(id).lean();
  }
  async createRoute(data) {
    return DDDRoute.create(data);
  }
  async updateRoute(id, data) {
    return DDDRoute.findByIdAndUpdate(id, data, { new: true });
  }
  async optimizeRoute(id) {
    const route = await DDDRoute.findById(id);
    if (!route) return null;
    route.status = 'optimized';
    await route.save();
    return route.toObject();
  }

  /* ── Executions ── */
  async listExecutions(filters = {}) {
    const q = {};
    if (filters.routeId) q.routeId = filters.routeId;
    if (filters.status) q.status = filters.status;
    return DDDRouteExecution.find(q).sort({ plannedDepartureTime: -1 }).limit(100).lean();
  }
  async startExecution(data) {
    if (!data.executionCode) data.executionCode = `REXEC-${Date.now()}`;
    data.status = 'in_progress';
    data.actualDepartureTime = new Date();
    return DDDRouteExecution.create(data);
  }
  async completeExecution(id, details) {
    return DDDRouteExecution.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', actualArrivalTime: new Date() },
      { new: true }
    );
  }

  /* ── Zones ── */
  async listZones(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDServiceZone.find(q).sort({ name: 1 }).lean();
  }
  async createZone(data) {
    if (!data.zoneCode) data.zoneCode = `ZONE-${Date.now()}`;
    return DDDServiceZone.create(data);
  }
  async updateZone(id, data) {
    return DDDServiceZone.findByIdAndUpdate(id, data, { new: true });
  }

  /* ── ETA ── */
  async calculateETA(data) {
    if (!data.calcCode) data.calcCode = `ETA-${Date.now()}`;
    // Simple mock: 1 min per km fallback
    if (!data.estimatedMinutes && data.distanceKm)
      data.estimatedMinutes = Math.ceil(data.distanceKm * 1.5);
    if (!data.estimatedArrival && data.estimatedMinutes)
      data.estimatedArrival = new Date(Date.now() + data.estimatedMinutes * 60000);
    return DDDETACalculation.create(data);
  }
  async getETA(id) {
    return DDDETACalculation.findById(id).lean();
  }
  async listETAs(filters = {}) {
    const q = {};
    if (filters.routeId) q.routeId = filters.routeId;
    return DDDETACalculation.find(q).sort({ calculatedAt: -1 }).limit(50).lean();
  }

  /* ── Analytics ── */
  async getRouteAnalytics() {
    const [routes, executions, zones, etas] = await Promise.all([
      DDDRoute.countDocuments(),
      DDDRouteExecution.countDocuments(),
      DDDServiceZone.countDocuments(),
      DDDETACalculation.countDocuments(),
    ]);
    const activeRoutes = await DDDRoute.countDocuments({
      isActive: true,
      status: { $in: ['active', 'optimized'] },
    });
    return { routes, executions, zones, etas, activeRoutes };
  }

  async healthCheck() {
    const [routes, zones] = await Promise.all([
      DDDRoute.countDocuments({ isActive: true }),
      DDDServiceZone.countDocuments({ isActive: true }),
    ]);
    return { status: 'healthy', activeRoutes: routes, activeZones: zones };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createRouteOptimizerRouter() {
  const router = Router();
  const svc = new RouteOptimizer();

  /* Routes */
  router.get('/routes/list', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRoutes(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/routes/:id', async (req, res) => {
    try {
      const d = await svc.getRoute(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/routes', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRoute(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/routes/:id/optimize', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.optimizeRoute(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Executions */
  router.get('/routes/executions/list', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listExecutions(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/routes/executions/start', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.startExecution(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Zones */
  router.get('/routes/zones/list', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listZones(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/routes/zones', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createZone(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* ETA */
  router.post('/routes/eta/calculate', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.calculateETA(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/routes/analytics/summary', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getRouteAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/routes/health/check', async (_req, res) => {
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
  RouteOptimizer,
  DDDRoute,
  DDDRouteExecution,
  DDDServiceZone,
  DDDETACalculation,
  ROUTE_TYPES,
  ROUTE_STATUSES,
  ZONE_TYPES,
  OPTIMIZATION_CRITERIA,
  TRAFFIC_CONDITIONS,
  ETA_STATUSES,
  BUILTIN_ROUTES,
  createRouteOptimizerRouter,
};
