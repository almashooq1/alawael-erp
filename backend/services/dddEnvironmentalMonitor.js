'use strict';
/**
 * EnvironmentalMonitor Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddEnvironmentalMonitor.js
 */

const {
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
} = require('../models/DddEnvironmentalMonitor');

const BaseCrudService = require('./base/BaseCrudService');

class EnvironmentalMonitor extends BaseCrudService {
  constructor() {
    super('EnvironmentalMonitor', {
      description: 'IoT sensor management & environmental monitoring',
      version: '1.0.0',
    }, {
      sensors: DDDSensor,
      environmentReadings: DDDEnvironmentReading,
      environmentAlerts: DDDEnvironmentAlert,
      environmentPolicys: DDDEnvironmentPolicy,
    })
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
  async getSensor(id) { return this._getById(DDDSensor, id); }
  async createSensor(data) { return this._create(DDDSensor, data); }
  async updateSensor(id, data) { return this._update(DDDSensor, id, data, { runValidators: true }); }

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
    ).lean();
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
    ).lean();
  }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.zone) q.zone = filters.zone;
    if (filters.sensorType) q.sensorType = filters.sensorType;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDEnvironmentPolicy.find(q).sort({ zone: 1 }).lean();
  }
  async createPolicy(data) { return this._create(DDDEnvironmentPolicy, data); }
  async updatePolicy(id, data) { return this._update(DDDEnvironmentPolicy, id, data, { runValidators: true }); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new EnvironmentalMonitor();
