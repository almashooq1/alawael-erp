'use strict';
/**
 * DddEnvironmentalMonitor — Mongoose Models & Constants
 * Auto-extracted from services/dddEnvironmentalMonitor.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const SENSOR_TYPES = [
  'temperature',
  'humidity',
  'air_quality',
  'co2',
  'noise_level',
  'light_level',
  'pressure',
  'occupancy',
  'water_quality',
  'smoke',
  'gas_leak',
  'vibration',
  'dust_particle',
  'voc',
  'radon',
];

const SENSOR_STATUSES = [
  'active',
  'inactive',
  'offline',
  'maintenance',
  'calibrating',
  'error',
  'low_battery',
  'decommissioned',
  'initializing',
  'standby',
];

const ALERT_SEVERITIES = [
  'info',
  'warning',
  'critical',
  'emergency',
  'maintenance_required',
  'calibration_needed',
];

const ALERT_STATUSES = [
  'active',
  'acknowledged',
  'investigating',
  'resolved',
  'escalated',
  'suppressed',
  'auto_resolved',
  'false_alarm',
];

const READING_UNITS = [
  'celsius',
  'fahrenheit',
  'percent_rh',
  'ppm',
  'decibels',
  'lux',
  'pascal',
  'count',
  'mg_per_m3',
  'ug_per_m3',
  'aqi_index',
];

const MONITORING_ZONES = [
  'therapy_room',
  'patient_area',
  'waiting_room',
  'storage_cold',
  'storage_hazardous',
  'pharmacy',
  'laboratory',
  'server_room',
  'kitchen',
  'outdoor',
  'hvac_system',
  'water_system',
];

/* ── Built-in sensors ───────────────────────────────────────────────────── */
const BUILTIN_SENSORS = [
  {
    code: 'SNS-TMP-001',
    name: 'Main Hall Temperature',
    type: 'temperature',
    unit: 'celsius',
    minThreshold: 18,
    maxThreshold: 26,
  },
  {
    code: 'SNS-HUM-001',
    name: 'Main Hall Humidity',
    type: 'humidity',
    unit: 'percent_rh',
    minThreshold: 30,
    maxThreshold: 60,
  },
  {
    code: 'SNS-AQ-001',
    name: 'Therapy Room Air Quality',
    type: 'air_quality',
    unit: 'aqi_index',
    minThreshold: 0,
    maxThreshold: 100,
  },
  {
    code: 'SNS-CO2-001',
    name: 'Reception CO2 Monitor',
    type: 'co2',
    unit: 'ppm',
    minThreshold: 0,
    maxThreshold: 1000,
  },
  {
    code: 'SNS-NOS-001',
    name: 'Quiet Zone Noise Level',
    type: 'noise_level',
    unit: 'decibels',
    minThreshold: 0,
    maxThreshold: 45,
  },
  {
    code: 'SNS-LGT-001',
    name: 'Assessment Room Light',
    type: 'light_level',
    unit: 'lux',
    minThreshold: 300,
    maxThreshold: 750,
  },
  {
    code: 'SNS-TMP-COLD',
    name: 'Cold Storage Temperature',
    type: 'temperature',
    unit: 'celsius',
    minThreshold: 2,
    maxThreshold: 8,
  },
  {
    code: 'SNS-OCC-001',
    name: 'Gym Occupancy Counter',
    type: 'occupancy',
    unit: 'count',
    minThreshold: 0,
    maxThreshold: 30,
  },
  {
    code: 'SNS-WQ-001',
    name: 'Pool Water Quality',
    type: 'water_quality',
    unit: 'ppm',
    minThreshold: 1,
    maxThreshold: 3,
  },
  {
    code: 'SNS-SMK-001',
    name: 'Fire Smoke Detector',
    type: 'smoke',
    unit: 'ppm',
    minThreshold: 0,
    maxThreshold: 50,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Sensor ────────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const sensorSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: SENSOR_TYPES, required: true },
    status: { type: String, enum: SENSOR_STATUSES, default: 'active' },
    buildingId: { type: Schema.Types.ObjectId },
    roomId: { type: Schema.Types.ObjectId },
    zone: { type: String, enum: MONITORING_ZONES },
    unit: { type: String, enum: READING_UNITS },
    minThreshold: { type: Number },
    maxThreshold: { type: Number },
    manufacturer: { type: String },
    model: { type: String },
    serialNumber: { type: String },
    firmwareVersion: { type: String },
    batteryLevel: { type: Number, min: 0, max: 100 },
    lastReadingAt: { type: Date },
    lastCalibrationDate: { type: Date },
    nextCalibrationDate: { type: Date },
    installDate: { type: Date },
    ipAddress: { type: String },
    readingIntervalSec: { type: Number, default: 300 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

sensorSchema.index({ type: 1, status: 1 });
sensorSchema.index({ buildingId: 1, roomId: 1 });

const environmentReadingSchema = new Schema(
  {
    sensorId: { type: Schema.Types.ObjectId, ref: 'DDDSensor', required: true },
    value: { type: Number, required: true },
    unit: { type: String, enum: READING_UNITS },
    timestamp: { type: Date, default: Date.now, required: true },
    isAnomaly: { type: Boolean, default: false },
    quality: { type: String, enum: ['good', 'degraded', 'poor', 'unknown'], default: 'good' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

environmentReadingSchema.index({ sensorId: 1, timestamp: -1 });
environmentReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

const DDDEnvironmentReading =
  mongoose.models.DDDEnvironmentReading ||
  mongoose.model('DDDEnvironmentReading', environmentReadingSchema);

/* ── Environment Alert ─────────────────────────────────────────────────── */
const environmentAlertSchema = new Schema(
  {
    sensorId: { type: Schema.Types.ObjectId, ref: 'DDDSensor', required: true },
    severity: { type: String, enum: ALERT_SEVERITIES, required: true },
    status: { type: String, enum: ALERT_STATUSES, default: 'active' },
    title: { type: String, required: true },
    description: { type: String },
    value: { type: Number },
    threshold: { type: Number },
    triggeredAt: { type: Date, default: Date.now },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    actions: [{ action: String, performedBy: String, timestamp: Date }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

environmentAlertSchema.index({ sensorId: 1, status: 1 });
environmentAlertSchema.index({ severity: 1, triggeredAt: -1 });

const DDDEnvironmentAlert =
  mongoose.models.DDDEnvironmentAlert ||
  mongoose.model('DDDEnvironmentAlert', environmentAlertSchema);

/* ── Environment Policy ────────────────────────────────────────────────── */
const environmentPolicySchema = new Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    zone: { type: String, enum: MONITORING_ZONES, required: true },
    sensorType: { type: String, enum: SENSOR_TYPES, required: true },
    minValue: { type: Number },
    maxValue: { type: Number },
    warningMin: { type: Number },
    warningMax: { type: Number },
    unit: { type: String, enum: READING_UNITS },
    isActive: { type: Boolean, default: true },
    notifyRoles: [{ type: String }],
    escalationMinutes: { type: Number, default: 30 },
    description: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

environmentPolicySchema.index({ zone: 1, sensorType: 1, isActive: 1 });

const DDDEnvironmentPolicy =
  mongoose.models.DDDEnvironmentPolicy ||
  mongoose.model('DDDEnvironmentPolicy', environmentPolicySchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDSensor = mongoose.models.DDDSensor || mongoose.model('DDDSensor', sensorSchema);

/* ── Environment Reading ───────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  SENSOR_TYPES,
  SENSOR_STATUSES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  READING_UNITS,
  MONITORING_ZONES,
  BUILTIN_SENSORS,
  DDDSensor,
  DDDEnvironmentReading,
  DDDEnvironmentAlert,
  DDDEnvironmentPolicy,
};
