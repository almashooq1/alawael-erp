'use strict';
/**
 * EnvironmentalMonitoring Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddEnvironmentalMonitoring.js
 */

const {
  DDDSensorDevice,
  DDDEnvReading,
  DDDEnvAlert,
  DDDComplianceCheck,
  SENSOR_TYPES,
  ZONE_TYPES,
  ALERT_THRESHOLDS,
  READING_INTERVALS,
  COMPLIANCE_FRAMEWORKS,
  ACTION_TYPES,
  BUILTIN_ENV_PROFILES,
} = require('../models/DddEnvironmentalMonitoring');

const BaseCrudService = require('./base/BaseCrudService');

class EnvironmentalMonitoring extends BaseCrudService {
  constructor() {
    super('EnvironmentalMonitoring', {}, {
      sensorDevices: DDDSensorDevice,
      envReadings: DDDEnvReading,
      envAlerts: DDDEnvAlert,
      complianceChecks: DDDComplianceCheck,
    });
  }

  async createSensor(data) { return this._create(DDDSensorDevice, data); }
  async listSensors(filter = {}, page = 1, limit = 20) { return this._list(DDDSensorDevice, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateSensor(id, data) { return this._update(DDDSensorDevice, id, data); }

  async recordReading(data) { return this._create(DDDEnvReading, data); }
  async listReadings(filter = {}, page = 1, limit = 50) { return this._list(DDDEnvReading, filter, { page: page, limit: limit, sort: { readingTime: -1 } }); }

  async createAlert(data) { return this._create(DDDEnvAlert, data); }
  async listAlerts(filter = {}, page = 1, limit = 20) { return this._list(DDDEnvAlert, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }

  async createCompliance(data) { return this._create(DDDComplianceCheck, data); }
  async listCompliance(filter = {}, page = 1, limit = 20) { return this._list(DDDComplianceCheck, filter, { page: page, limit: limit, sort: { checkDate: -1 } }); }

  async getEnvStats() {
    const [sensors, readings, activeAlerts, compliant] = await Promise.all([
      DDDSensorDevice.countDocuments({ status: 'active' }),
      DDDEnvReading.countDocuments(),
      DDDEnvAlert.countDocuments({ resolvedAt: null }),
      DDDComplianceCheck.countDocuments({ result: 'compliant' }),
    ]);
    return {
      activeSensors: sensors,
      totalReadings: readings,
      activeAlerts,
      compliantChecks: compliant,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new EnvironmentalMonitoring();
