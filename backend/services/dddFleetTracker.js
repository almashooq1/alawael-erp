'use strict';
/**
 * FleetTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddFleetTracker.js
 */

const {
  DDDFuelLog,
  DDDGPSTracking,
  DDDVehicleMaintenance,
  DDDVehicleInspection,
  FUEL_TYPES,
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_STATUSES,
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  TRACKING_EVENTS,
  ALERT_TYPES,
  BUILTIN_MAINTENANCE_SCHEDULES,
} = require('../models/DddFleetTracker');

const BaseCrudService = require('./base/BaseCrudService');

class FleetTracker extends BaseCrudService {
  constructor() {
    super('FleetTracker', {
      description: 'Fleet monitoring, fuel, GPS tracking & maintenance',
      version: '1.0.0',
    }, {
      fuelLogs: DDDFuelLog,
      gPSTrackings: DDDGPSTracking,
      vehicleMaintenances: DDDVehicleMaintenance,
      vehicleInspections: DDDVehicleInspection,
    })
  }

  async initialize() {
    this.log('Fleet Tracker initialised ✓');
    return true;
  }

  /* ── Fuel ── */
  async listFuelLogs(filters = {}) {
    const q = {};
    if (filters.vehicleId) q.vehicleId = filters.vehicleId;
    return DDDFuelLog.find(q).sort({ filledAt: -1 }).limit(200).lean();
  }
  async logFuel(data) {
    if (!data.logCode) data.logCode = `FUEL-${Date.now()}`;
    if (data.liters && data.costPerLiter && !data.totalCost)
      data.totalCost = data.liters * data.costPerLiter;
    return DDDFuelLog.create(data);
  }

  /* ── GPS ── */
  async getLatestPosition(vehicleId) {
    return DDDGPSTracking.findOne({ vehicleId }).sort({ timestamp: -1 }).lean();
  }
  async getTrackingHistory(vehicleId, from, to) {
    const q = { vehicleId };
    if (from || to) {
      q.timestamp = {};
      if (from) q.timestamp.$gte = from;
      if (to) q.timestamp.$lte = to;
    }
    return DDDGPSTracking.find(q).sort({ timestamp: 1 }).lean();
  }
  async recordPosition(data) { return this._create(DDDGPSTracking, data); }

  /* ── Maintenance ── */
  async listMaintenance(filters = {}) {
    const q = {};
    if (filters.vehicleId) q.vehicleId = filters.vehicleId;
    if (filters.status) q.status = filters.status;
    if (filters.category) q.category = filters.category;
    return DDDVehicleMaintenance.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleMaintenance(data) {
    if (!data.maintenanceCode) data.maintenanceCode = `VMNT-${Date.now()}`;
    return DDDVehicleMaintenance.create(data);
  }
  async completeMaintenance(id, details) {
    return DDDVehicleMaintenance.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', completedAt: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Inspections ── */
  async listInspections(filters = {}) {
    const q = {};
    if (filters.vehicleId) q.vehicleId = filters.vehicleId;
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDVehicleInspection.find(q).sort({ scheduledDate: -1 }).lean();
  }
  async scheduleInspection(data) {
    if (!data.inspectionCode) data.inspectionCode = `VINSP-${Date.now()}`;
    return DDDVehicleInspection.create(data);
  }
  async completeInspection(id, results) {
    return DDDVehicleInspection.findByIdAndUpdate(
      id,
      {
        ...results,
        status: results.overallResult === 'pass' ? 'passed' : 'failed',
        completedAt: new Date(),
      },
      { new: true }
    ).lean();
  }

  /* ── Analytics ── */
  async getFleetAnalytics() {
    const [fuelLogs, gpsRecords, maintenanceRecords, inspections] = await Promise.all([
      DDDFuelLog.countDocuments(),
      DDDGPSTracking.countDocuments(),
      DDDVehicleMaintenance.countDocuments(),
      DDDVehicleInspection.countDocuments(),
    ]);
    const pendingMaintenance = await DDDVehicleMaintenance.countDocuments({
      status: { $in: ['scheduled', 'awaiting_parts'] },
    });
    return { fuelLogs, gpsRecords, maintenanceRecords, inspections, pendingMaintenance };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new FleetTracker();
