'use strict';
/**
 * DddEnvironmentalMonitoring — Mongoose Models & Constants
 * Auto-extracted from services/dddEnvironmentalMonitoring.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const SENSOR_TYPES = [
  'temperature',
  'humidity',
  'air_quality',
  'co2',
  'noise',
  'light',
  'particulate',
  'pressure',
  'voc',
  'radon',
  'water_quality',
  'vibration',
];

const ZONE_TYPES = [
  'therapy_room',
  'waiting_area',
  'consultation',
  'office',
  'corridor',
  'storage',
  'server_room',
  'clean_room',
  'gymnasium',
  'pool_area',
  'outdoor',
  'workshop',
];

const ALERT_THRESHOLDS = [
  'normal',
  'caution',
  'warning',
  'danger',
  'critical',
  'emergency',
  'out_of_range',
  'sensor_fault',
  'maintenance_due',
  'offline',
];

const READING_INTERVALS = [
  '1_minute',
  '5_minutes',
  '15_minutes',
  '30_minutes',
  '1_hour',
  '2_hours',
  '4_hours',
  '8_hours',
  '12_hours',
  'daily',
];

const COMPLIANCE_FRAMEWORKS = [
  'ASHRAE',
  'EPA',
  'OSHA',
  'WHO',
  'ISO_14001',
  'LEED',
  'WELL',
  'BREEAM',
  'SFDA_Facility',
  'JCI_FMS',
];

const ACTION_TYPES = [
  'adjust_hvac',
  'open_ventilation',
  'evacuate',
  'notify_maintenance',
  'increase_filtration',
  'reduce_occupancy',
  'activate_backup',
  'schedule_inspection',
  'log_only',
  'escalate_management',
];

const BUILTIN_ENV_PROFILES = [
  {
    code: 'THERAPY_STD',
    name: 'Therapy Room Standard',
    zone: 'therapy_room',
    tempMin: 20,
    tempMax: 24,
    humMin: 40,
    humMax: 60,
  },
  {
    code: 'POOL_ENV',
    name: 'Pool Area',
    zone: 'pool_area',
    tempMin: 26,
    tempMax: 30,
    humMin: 50,
    humMax: 70,
  },
  {
    code: 'SERVER_RM',
    name: 'Server Room',
    zone: 'server_room',
    tempMin: 18,
    tempMax: 22,
    humMin: 40,
    humMax: 55,
  },
  {
    code: 'WAIT_AREA',
    name: 'Waiting Area',
    zone: 'waiting_area',
    tempMin: 21,
    tempMax: 25,
    humMin: 30,
    humMax: 60,
  },
  {
    code: 'GYM_ENV',
    name: 'Gymnasium',
    zone: 'gymnasium',
    tempMin: 18,
    tempMax: 22,
    humMin: 40,
    humMax: 60,
  },
  {
    code: 'CONSULT',
    name: 'Consultation Room',
    zone: 'consultation',
    tempMin: 21,
    tempMax: 24,
    humMin: 40,
    humMax: 55,
  },
  {
    code: 'STORAGE',
    name: 'Storage Area',
    zone: 'storage',
    tempMin: 15,
    tempMax: 25,
    humMin: 30,
    humMax: 60,
  },
  {
    code: 'CLEAN_RM',
    name: 'Clean Room',
    zone: 'clean_room',
    tempMin: 20,
    tempMax: 22,
    humMin: 45,
    humMax: 55,
  },
  {
    code: 'OUTDOOR',
    name: 'Outdoor Area',
    zone: 'outdoor',
    tempMin: -10,
    tempMax: 50,
    humMin: 10,
    humMax: 100,
  },
  {
    code: 'WORKSHOP',
    name: 'Workshop',
    zone: 'workshop',
    tempMin: 18,
    tempMax: 25,
    humMin: 35,
    humMax: 65,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const sensorDeviceSchema = new Schema(
  {
    name: { type: String, required: true },
    sensorType: { type: String, enum: SENSOR_TYPES, required: true },
    zone: { type: String, enum: ZONE_TYPES, required: true },
    location: { type: String },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'faulty', 'offline'],
      default: 'active',
    },
    interval: { type: String, enum: READING_INTERVALS, default: '15_minutes' },
    serialNumber: { type: String },
    manufacturer: { type: String },
    lastReadingAt: { type: Date },
    batteryLevel: { type: Number },
    calibratedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
sensorDeviceSchema.index({ sensorType: 1, zone: 1 });
sensorDeviceSchema.index({ status: 1 });

const envReadingSchema = new Schema(
  {
    sensorId: { type: Schema.Types.ObjectId, ref: 'DDDSensorDevice', required: true },
    sensorType: { type: String, enum: SENSOR_TYPES, required: true },
    zone: { type: String, enum: ZONE_TYPES },
    value: { type: Number, required: true },
    unit: { type: String, required: true },
    threshold: { type: String, enum: ALERT_THRESHOLDS, default: 'normal' },
    readingTime: { type: Date, default: Date.now },
    isAbnormal: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
envReadingSchema.index({ sensorId: 1, readingTime: -1 });
envReadingSchema.index({ zone: 1, sensorType: 1, readingTime: -1 });

const envAlertSchema = new Schema(
  {
    sensorId: { type: Schema.Types.ObjectId, ref: 'DDDSensorDevice', required: true },
    readingId: { type: Schema.Types.ObjectId, ref: 'DDDEnvReading' },
    zone: { type: String, enum: ZONE_TYPES },
    threshold: { type: String, enum: ALERT_THRESHOLDS, required: true },
    message: { type: String, required: true },
    value: { type: Number },
    actionTaken: { type: String, enum: ACTION_TYPES },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
envAlertSchema.index({ zone: 1, threshold: 1 });
envAlertSchema.index({ resolvedAt: 1 });

const complianceCheckSchema = new Schema(
  {
    zone: { type: String, enum: ZONE_TYPES, required: true },
    framework: { type: String, enum: COMPLIANCE_FRAMEWORKS, required: true },
    checkDate: { type: Date, default: Date.now },
    result: {
      type: String,
      enum: ['compliant', 'non_compliant', 'partial', 'not_assessed'],
      required: true,
    },
    findings: [{ parameter: String, status: String, value: Number, limit: Number }],
    corrective: [{ action: String, dueDate: Date, status: String }],
    inspector: { type: String },
    nextCheckDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
complianceCheckSchema.index({ zone: 1, framework: 1 });
complianceCheckSchema.index({ result: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDSensorDevice =
  mongoose.models.DDDSensorDevice || mongoose.model('DDDSensorDevice', sensorDeviceSchema);
const DDDEnvReading =
  mongoose.models.DDDEnvReading || mongoose.model('DDDEnvReading', envReadingSchema);

/* ═══════════════════ Models ═══════════════════ */

const DDDEnvAlert = mongoose.models.DDDEnvAlert || mongoose.model('DDDEnvAlert', envAlertSchema);
const DDDComplianceCheck =
  mongoose.models.DDDComplianceCheck || mongoose.model('DDDComplianceCheck', complianceCheckSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  SENSOR_TYPES,
  ZONE_TYPES,
  ALERT_THRESHOLDS,
  READING_INTERVALS,
  COMPLIANCE_FRAMEWORKS,
  ACTION_TYPES,
  BUILTIN_ENV_PROFILES,
  DDDSensorDevice,
  DDDEnvReading,
  DDDEnvAlert,
  DDDComplianceCheck,
};
