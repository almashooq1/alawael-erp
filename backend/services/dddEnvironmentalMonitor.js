/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Environmental Monitor — Phase 19 · Facility & Environment Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * IoT sensor management, environmental readings (temperature, humidity, air
 * quality), threshold alerts, and compliance monitoring for clinical spaces.
 *
 * Aggregates
 *   DDDSensor            — IoT sensor device registry
 *   DDDEnvironmentReading — time-series environmental data
 *   DDDEnvironmentAlert  — threshold-breach alerts
 *   DDDEnvironmentPolicy — rules / thresholds per zone
 *
 * Canonical links
 *   buildingId   → DDDBuilding (dddFacilityManager)
 *   roomId       → DDDRoom (dddFacilityManager)
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

const DDDSensor = mongoose.models.DDDSensor || mongoose.model('DDDSensor', sensorSchema);

/* ── Environment Reading ───────────────────────────────────────────────── */
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

class EnvironmentalMonitor extends BaseDomainModule {
  constructor() {
    super('EnvironmentalMonitor', {
      description: 'IoT sensor management & environmental monitoring',
      version: '1.0.0',
    });
  }

  async initialize() {
    await this._seedSensors();
    this.log('Environmental Monitor initialised ✓');
    return true;
  }

  async _seedSensors() {
    for (const s of BUILTIN_SENSORS) {
      const exists = await DDDSensor.findOne({ code: s.code }).lean();
      if (!exists) await DDDSensor.create({ ...s, status: 'active' });
    }
  }

  /* ── Sensors ── */
  async listSensors(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.buildingId) q.buildingId = filters.buildingId;
    if (filters.roomId) q.roomId = filters.roomId;
    if (filters.zone) q.zone = filters.zone;
    return DDDSensor.find(q).sort({ code: 1 }).lean();
  }
  async getSensor(id) {
    return DDDSensor.findById(id).lean();
  }
  async createSensor(data) {
    return DDDSensor.create(data);
  }
  async updateSensor(id, data) {
    return DDDSensor.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Readings ── */
  async recordReading(sensorId, value, opts = {}) {
    const sensor = await DDDSensor.findById(sensorId);
    if (!sensor) throw new Error('Sensor not found');

    const isAnomaly =
      (sensor.minThreshold != null && value < sensor.minThreshold) ||
      (sensor.maxThreshold != null && value > sensor.maxThreshold);

    const reading = await DDDEnvironmentReading.create({
      sensorId,
      value,
      unit: sensor.unit,
      timestamp: opts.timestamp || new Date(),
      isAnomaly,
      quality: opts.quality || 'good',
    });

    sensor.lastReadingAt = new Date();
    await sensor.save();

    if (isAnomaly) {
      await this._createAlert(sensor, value);
    }

    return reading;
  }

  async getReadings(sensorId, opts = {}) {
    const q = { sensorId };
    if (opts.startDate || opts.endDate) {
      q.timestamp = {};
      if (opts.startDate) q.timestamp.$gte = new Date(opts.startDate);
      if (opts.endDate) q.timestamp.$lte = new Date(opts.endDate);
    }
    return DDDEnvironmentReading.find(q)
      .sort({ timestamp: -1 })
      .limit(opts.limit || 100)
      .lean();
  }

  async getLatestReading(sensorId) {
    return DDDEnvironmentReading.findOne({ sensorId }).sort({ timestamp: -1 }).lean();
  }

  /* ── Alerts ── */
  async _createAlert(sensor, value) {
    const breachedThreshold =
      sensor.maxThreshold != null && value > sensor.maxThreshold
        ? sensor.maxThreshold
        : sensor.minThreshold;
    return DDDEnvironmentAlert.create({
      sensorId: sensor._id,
      severity: Math.abs(value - breachedThreshold) > 10 ? 'critical' : 'warning',
      title: `${sensor.name} threshold breach`,
      description: `Value ${value} ${sensor.unit} exceeded threshold ${breachedThreshold}`,
      value,
      threshold: breachedThreshold,
    });
  }

  async listAlerts(filters = {}) {
    const q = {};
    if (filters.sensorId) q.sensorId = filters.sensorId;
    if (filters.severity) q.severity = filters.severity;
    if (filters.status) q.status = filters.status;
    return DDDEnvironmentAlert.find(q).sort({ triggeredAt: -1 }).lean();
  }

  async acknowledgeAlert(id, userId) {
    return DDDEnvironmentAlert.findByIdAndUpdate(
      id,
      {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: userId,
      },
      { new: true }
    );
  }

  async resolveAlert(id, userId) {
    return DDDEnvironmentAlert.findByIdAndUpdate(
      id,
      {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId,
      },
      { new: true }
    );
  }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.zone) q.zone = filters.zone;
    if (filters.sensorType) q.sensorType = filters.sensorType;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDEnvironmentPolicy.find(q).sort({ zone: 1 }).lean();
  }
  async createPolicy(data) {
    return DDDEnvironmentPolicy.create(data);
  }
  async updatePolicy(id, data) {
    return DDDEnvironmentPolicy.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Analytics ── */
  async getEnvironmentalAnalytics() {
    const [sensors, readings, alerts, policies] = await Promise.all([
      DDDSensor.countDocuments(),
      DDDEnvironmentReading.countDocuments(),
      DDDEnvironmentAlert.countDocuments(),
      DDDEnvironmentPolicy.countDocuments(),
    ]);
    const activeSensors = await DDDSensor.countDocuments({ status: 'active' });
    const activeAlerts = await DDDEnvironmentAlert.countDocuments({ status: 'active' });
    const anomalies = await DDDEnvironmentReading.countDocuments({ isAnomaly: true });
    return { sensors, activeSensors, readings, anomalies, alerts, activeAlerts, policies };
  }

  async healthCheck() {
    const [sensors, readings, alerts, policies] = await Promise.all([
      DDDSensor.countDocuments(),
      DDDEnvironmentReading.countDocuments(),
      DDDEnvironmentAlert.countDocuments(),
      DDDEnvironmentPolicy.countDocuments(),
    ]);
    return { status: 'healthy', sensors, readings, alerts, policies };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createEnvironmentalMonitorRouter() {
  const router = Router();
  const svc = new EnvironmentalMonitor();

  /* Sensors */
  router.get('/environment/sensors', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listSensors(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/environment/sensors/:id', async (req, res) => {
    try {
      const d = await svc.getSensor(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/environment/sensors', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createSensor(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/environment/sensors/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateSensor(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Readings */
  router.get('/environment/sensors/:id/readings', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.getReadings(req.params.id, req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/environment/sensors/:id/latest', async (req, res) => {
    try {
      const d = await svc.getLatestReading(req.params.id);
      res.json({ success: true, data: d });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/environment/readings', async (req, res) => {
    try {
      res
        .status(201)
        .json({
          success: true,
          data: await svc.recordReading(req.body.sensorId, req.body.value, req.body),
        });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Alerts */
  router.get('/environment/alerts', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listAlerts(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/environment/alerts/:id/acknowledge', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.acknowledgeAlert(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/environment/alerts/:id/resolve', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.resolveAlert(req.params.id, req.body.userId) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Policies */
  router.get('/environment/policies', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPolicies(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/environment/policies', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPolicy(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/environment/policies/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePolicy(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/environment/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getEnvironmentalAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/environment/health', async (_req, res) => {
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
  EnvironmentalMonitor,
  DDDSensor,
  DDDEnvironmentReading,
  DDDEnvironmentAlert,
  DDDEnvironmentPolicy,
  SENSOR_TYPES,
  SENSOR_STATUSES,
  ALERT_SEVERITIES,
  ALERT_STATUSES,
  READING_UNITS,
  MONITORING_ZONES,
  BUILTIN_SENSORS,
  createEnvironmentalMonitorRouter,
};
