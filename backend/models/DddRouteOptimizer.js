'use strict';
/**
 * DddRouteOptimizer — Mongoose Models & Constants
 * Auto-extracted from services/dddRouteOptimizer.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Models ═══════════════════ */

const DDDRoute = mongoose.models.DDDRoute || mongoose.model('DDDRoute', routeSchema);

/* ── Route Execution ───────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ROUTE_TYPES,
  ROUTE_STATUSES,
  ZONE_TYPES,
  OPTIMIZATION_CRITERIA,
  TRAFFIC_CONDITIONS,
  ETA_STATUSES,
  BUILTIN_ROUTES,
  DDDRoute,
  DDDRouteExecution,
  DDDServiceZone,
  DDDETACalculation,
};
