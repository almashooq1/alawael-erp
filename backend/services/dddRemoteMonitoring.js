'use strict';
/**
 * DDD Remote Monitoring Service
 * ─────────────────────────────
 * Phase 31 – Patient Engagement & Digital Health (Module 3/4)
 *
 * Manages remote patient monitoring devices, vital signs collection,
 * alert thresholds, care escalation, and home health integration.
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */
const DEVICE_TYPES = [
  'blood_pressure_monitor',
  'pulse_oximeter',
  'glucometer',
  'weight_scale',
  'thermometer',
  'ecg_monitor',
  'activity_tracker',
  'spirometer',
  'sleep_monitor',
  'pain_tracker',
  'medication_dispenser',
  'fall_detector',
];

const DEVICE_STATUSES = [
  'active',
  'inactive',
  'paired',
  'unpaired',
  'malfunctioning',
  'calibrating',
  'lost',
  'returned',
  'maintenance',
  'decommissioned',
];

const VITAL_TYPES = [
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'heart_rate',
  'spo2',
  'temperature',
  'blood_glucose',
  'weight',
  'respiratory_rate',
  'pain_level',
  'steps',
];

const ALERT_SEVERITIES = [
  'info',
  'low',
  'medium',
  'high',
  'critical',
  'emergency',
  'resolved',
  'acknowledged',
  'escalated',
  'auto_resolved',
];

const ESCALATION_LEVELS = [
  'self_care',
  'nurse_review',
  'therapist_review',
  'physician_review',
  'emergency_contact',
  'emergency_services',
  'care_coordinator',
  'specialist_referral',
  'hospitalization',
  'observation',
];

const MONITORING_PROGRAMS = [
  'post_discharge',
  'chronic_disease',
  'rehabilitation',
  'pregnancy',
  'cardiac',
  'pulmonary',
  'diabetes',
  'hypertension',
  'mental_health',
  'elderly_care',
];

const BUILTIN_THRESHOLD_PROFILES = [
  {
    code: 'BP_ADULT',
    name: 'Blood Pressure Adult',
    metric: 'blood_pressure_systolic',
    min: 90,
    max: 140,
  },
  { code: 'HR_ADULT', name: 'Heart Rate Adult', metric: 'heart_rate', min: 60, max: 100 },
  { code: 'SPO2_STD', name: 'SpO2 Standard', metric: 'spo2', min: 92, max: 100 },
  { code: 'TEMP_STD', name: 'Temperature Standard', metric: 'temperature', min: 36.0, max: 37.5 },
  { code: 'GLUCOSE_FT', name: 'Fasting Glucose', metric: 'blood_glucose', min: 70, max: 100 },
  {
    code: 'RR_ADULT',
    name: 'Respiratory Rate Adult',
    metric: 'respiratory_rate',
    min: 12,
    max: 20,
  },
  { code: 'WEIGHT_VAR', name: 'Weight Variation', metric: 'weight', min: -2, max: 2 },
  { code: 'PAIN_THRESH', name: 'Pain Threshold', metric: 'pain_level', min: 0, max: 6 },
  { code: 'STEPS_DAILY', name: 'Daily Steps Goal', metric: 'steps', min: 3000, max: 15000 },
  {
    code: 'BP_ELDERLY',
    name: 'Blood Pressure Elderly',
    metric: 'blood_pressure_systolic',
    min: 100,
    max: 150,
  },
];

/* ═══════════════════ Schemas ═══════════════════ */
const monitoringDeviceSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    deviceType: { type: String, enum: DEVICE_TYPES, required: true },
    status: { type: String, enum: DEVICE_STATUSES, default: 'inactive' },
    deviceId: { type: String },
    manufacturer: { type: String },
    model: { type: String },
    serialNumber: { type: String },
    pairedAt: { type: Date },
    lastSyncAt: { type: Date },
    batteryLevel: { type: Number },
    firmwareVersion: { type: String },
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
monitoringDeviceSchema.index({ beneficiaryId: 1, deviceType: 1 });
monitoringDeviceSchema.index({ status: 1 });

const vitalReadingSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    deviceId: { type: Schema.Types.ObjectId, ref: 'DDDMonitoringDevice' },
    vitalType: { type: String, enum: VITAL_TYPES, required: true },
    value: { type: Number, required: true },
    unit: { type: String },
    readingTime: { type: Date, default: Date.now },
    isManual: { type: Boolean, default: false },
    isAbnormal: { type: Boolean, default: false },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
vitalReadingSchema.index({ beneficiaryId: 1, vitalType: 1, readingTime: -1 });
vitalReadingSchema.index({ isAbnormal: 1, readingTime: -1 });

const monitoringAlertSchema = new Schema(
  {
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    readingId: { type: Schema.Types.ObjectId, ref: 'DDDVitalReading' },
    vitalType: { type: String, enum: VITAL_TYPES },
    severity: { type: String, enum: ALERT_SEVERITIES, default: 'medium' },
    message: { type: String, required: true },
    value: { type: Number },
    threshold: { min: Number, max: Number },
    escalationLevel: { type: String, enum: ESCALATION_LEVELS },
    acknowledgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    acknowledgedAt: { type: Date },
    resolvedAt: { type: Date },
    actionTaken: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
monitoringAlertSchema.index({ beneficiaryId: 1, severity: 1 });
monitoringAlertSchema.index({ severity: 1, resolvedAt: 1 });

const careEscalationSchema = new Schema(
  {
    alertId: { type: Schema.Types.ObjectId, ref: 'DDDMonitoringAlert', required: true },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    level: { type: String, enum: ESCALATION_LEVELS, required: true },
    program: { type: String, enum: MONITORING_PROGRAMS },
    reason: { type: String, required: true },
    escalatedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    escalatedAt: { type: Date, default: Date.now },
    response: { type: String },
    respondedAt: { type: Date },
    outcome: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
careEscalationSchema.index({ beneficiaryId: 1, level: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDMonitoringDevice =
  mongoose.models.DDDMonitoringDevice ||
  mongoose.model('DDDMonitoringDevice', monitoringDeviceSchema);
const DDDVitalReading =
  mongoose.models.DDDVitalReading || mongoose.model('DDDVitalReading', vitalReadingSchema);
const DDDMonitoringAlert =
  mongoose.models.DDDMonitoringAlert || mongoose.model('DDDMonitoringAlert', monitoringAlertSchema);
const DDDCareEscalation =
  mongoose.models.DDDCareEscalation || mongoose.model('DDDCareEscalation', careEscalationSchema);

/* ═══════════════════ Domain Class ═══════════════════ */
class RemoteMonitoring {
  async registerDevice(data) {
    return DDDMonitoringDevice.create(data);
  }
  async listDevices(filter = {}, page = 1, limit = 20) {
    return DDDMonitoringDevice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async updateDevice(id, data) {
    return DDDMonitoringDevice.findByIdAndUpdate(id, data, { new: true }).lean();
  }

  async recordVital(data) {
    return DDDVitalReading.create(data);
  }
  async listVitals(filter = {}, page = 1, limit = 50) {
    return DDDVitalReading.find(filter)
      .sort({ readingTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async createAlert(data) {
    return DDDMonitoringAlert.create(data);
  }
  async listAlerts(filter = {}, page = 1, limit = 20) {
    return DDDMonitoringAlert.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }
  async acknowledgeAlert(id, userId) {
    return DDDMonitoringAlert.findByIdAndUpdate(
      id,
      { acknowledgedBy: userId, acknowledgedAt: new Date(), severity: 'acknowledged' },
      { new: true }
    ).lean();
  }

  async createEscalation(data) {
    return DDDCareEscalation.create(data);
  }
  async listEscalations(filter = {}, page = 1, limit = 20) {
    return DDDCareEscalation.find(filter)
      .sort({ escalatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  async getMonitoringStats() {
    const [devices, readings, activeAlerts, escalations] = await Promise.all([
      DDDMonitoringDevice.countDocuments({ status: 'active' }),
      DDDVitalReading.countDocuments(),
      DDDMonitoringAlert.countDocuments({
        severity: { $in: ['high', 'critical', 'emergency'] },
        resolvedAt: null,
      }),
      DDDCareEscalation.countDocuments(),
    ]);
    return {
      activeDevices: devices,
      totalReadings: readings,
      activeAlerts,
      totalEscalations: escalations,
    };
  }

  async healthCheck() {
    const [devices, readings, alerts, escalations] = await Promise.all([
      DDDMonitoringDevice.countDocuments(),
      DDDVitalReading.countDocuments(),
      DDDMonitoringAlert.countDocuments(),
      DDDCareEscalation.countDocuments(),
    ]);
    return {
      status: 'ok',
      module: 'RemoteMonitoring',
      counts: { devices, readings, alerts, escalations },
    };
  }
}

/* ═══════════════════ Router Factory ═══════════════════ */
function createRemoteMonitoringRouter() {
  const { Router } = require('express');
  const router = Router();
  const svc = new RemoteMonitoring();

  router.get('/remote-monitoring/health', async (_req, res) => {
    try {
      res.json(await svc.healthCheck());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/remote-monitoring/devices', async (req, res) => {
    try {
      res.status(201).json(await svc.registerDevice(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/remote-monitoring/devices', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listDevices(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.put('/remote-monitoring/devices/:id', async (req, res) => {
    try {
      res.json(await svc.updateDevice(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/remote-monitoring/vitals', async (req, res) => {
    try {
      res.status(201).json(await svc.recordVital(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/remote-monitoring/vitals', async (req, res) => {
    try {
      const { page = 1, limit = 50, ...f } = req.query;
      res.json(await svc.listVitals(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/remote-monitoring/alerts', async (req, res) => {
    try {
      res.status(201).json(await svc.createAlert(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/remote-monitoring/alerts', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listAlerts(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/remote-monitoring/escalations', async (req, res) => {
    try {
      res.status(201).json(await svc.createEscalation(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  router.get('/remote-monitoring/escalations', async (req, res) => {
    try {
      const { page = 1, limit = 20, ...f } = req.query;
      res.json(await svc.listEscalations(f, +page, +limit));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/remote-monitoring/stats', async (_req, res) => {
    try {
      res.json(await svc.getMonitoringStats());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  DEVICE_TYPES,
  DEVICE_STATUSES,
  VITAL_TYPES,
  ALERT_SEVERITIES,
  ESCALATION_LEVELS,
  MONITORING_PROGRAMS,
  BUILTIN_THRESHOLD_PROFILES,
  DDDMonitoringDevice,
  DDDVitalReading,
  DDDMonitoringAlert,
  DDDCareEscalation,
  RemoteMonitoring,
  createRemoteMonitoringRouter,
};
