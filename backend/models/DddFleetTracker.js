'use strict';
/**
 * DddFleetTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddFleetTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Models ═══════════════════ */

const DDDFuelLog = mongoose.models.DDDFuelLog || mongoose.model('DDDFuelLog', fuelLogSchema);

/* ── GPS Tracking ──────────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  FUEL_TYPES,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  TRACKING_EVENTS,
  ALERT_TYPES,
  BUILTIN_MAINTENANCE_SCHEDULES,
  DDDFuelLog,
  DDDGPSTracking,
  DDDVehicleMaintenance,
  DDDVehicleInspection,
};
