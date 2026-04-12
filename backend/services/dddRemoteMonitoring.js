'use strict';
/**
 * RemoteMonitoring Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddRemoteMonitoring.js
 */

const {
  DDDMonitoringDevice,
  DDDVitalReading,
  DDDMonitoringAlert,
  DDDCareEscalation,
  DEVICE_TYPES,
  DEVICE_STATUSES,
  VITAL_TYPES,
  ALERT_SEVERITIES,
  ESCALATION_LEVELS,
  MONITORING_PROGRAMS,
  BUILTIN_THRESHOLD_PROFILES,
} = require('../models/DddRemoteMonitoring');

const BaseCrudService = require('./base/BaseCrudService');

class RemoteMonitoring extends BaseCrudService {
  constructor() {
    super('RemoteMonitoring', {}, {
      monitoringDevices: DDDMonitoringDevice,
      vitalReadings: DDDVitalReading,
      monitoringAlerts: DDDMonitoringAlert,
      careEscalations: DDDCareEscalation,
    });
  }

  async registerDevice(data) { return this._create(DDDMonitoringDevice, data); }
  async listDevices(filter = {}, page = 1, limit = 20) { return this._list(DDDMonitoringDevice, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async updateDevice(id, data) { return this._update(DDDMonitoringDevice, id, data); }

  async recordVital(data) { return this._create(DDDVitalReading, data); }
  async listVitals(filter = {}, page = 1, limit = 50) { return this._list(DDDVitalReading, filter, { page: page, limit: limit, sort: { readingTime: -1 } }); }

  async createAlert(data) { return this._create(DDDMonitoringAlert, data); }
  async listAlerts(filter = {}, page = 1, limit = 20) { return this._list(DDDMonitoringAlert, filter, { page: page, limit: limit, sort: { createdAt: -1 } }); }
  async acknowledgeAlert(id, userId) {
    return DDDMonitoringAlert.findByIdAndUpdate(
      id,
      { acknowledgedBy: userId, acknowledgedAt: new Date(), severity: 'acknowledged' },
      { new: true }
    ).lean();
  }

  async createEscalation(data) { return this._create(DDDCareEscalation, data); }
  async listEscalations(filter = {}, page = 1, limit = 20) { return this._list(DDDCareEscalation, filter, { page: page, limit: limit, sort: { escalatedAt: -1 } }); }

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
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new RemoteMonitoring();
