'use strict';
/**
 * TransportManager Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddTransportManager.js
 */

const {
  DDDVehicle,
  DDDDriver,
  DDDTransportSchedule,
  DDDTransportPolicy,
  VEHICLE_TYPES,
  VEHICLE_STATUSES,
  DRIVER_STATUSES,
  DRIVER_CERTIFICATIONS,
  SCHEDULE_TYPES,
  POLICY_CATEGORIES,
  BUILTIN_TRANSPORT_POLICIES,
} = require('../models/DddTransportManager');

const BaseCrudService = require('./base/BaseCrudService');

class TransportManager extends BaseCrudService {
  constructor() {
    super('TransportManager', {
      description: 'Central transportation orchestration & fleet management',
      version: '1.0.0',
    }, {
      vehicles: DDDVehicle,
      drivers: DDDDriver,
      transportSchedules: DDDTransportSchedule,
      transportPolicys: DDDTransportPolicy,
    })
  }

  async initialize() {
    await this._seedPolicies();
    this.log('Transport Manager initialised ✓');
    return true;
  }

  async _seedPolicies() {
    for (const p of BUILTIN_TRANSPORT_POLICIES) {
      const exists = await DDDTransportPolicy.findOne({ code: p.code }).lean();
      if (!exists) await DDDTransportPolicy.create(p);
    }
  }

  /* ── Vehicles ── */
  async listVehicles(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDVehicle.find(q).sort({ vehicleCode: 1 }).lean();
  }
  async getVehicle(id) { return this._getById(DDDVehicle, id); }
  async registerVehicle(data) {
    if (!data.vehicleCode) data.vehicleCode = `VEH-${Date.now()}`;
    return DDDVehicle.create(data);
  }
  async updateVehicle(id, data) { return this._update(DDDVehicle, id, data); }

  /* ── Drivers ── */
  async listDrivers(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDDriver.find(q).sort({ name: 1 }).lean();
  }
  async getDriver(id) { return this._getById(DDDDriver, id); }
  async registerDriver(data) {
    if (!data.driverCode) data.driverCode = `DRV-${Date.now()}`;
    return DDDDriver.create(data);
  }
  async updateDriver(id, data) { return this._update(DDDDriver, id, data); }

  /* ── Schedules ── */
  async listSchedules(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDTransportSchedule.find(q).sort({ name: 1 }).lean();
  }
  async createSchedule(data) {
    if (!data.scheduleCode) data.scheduleCode = `TSCHED-${Date.now()}`;
    return DDDTransportSchedule.create(data);
  }
  async updateSchedule(id, data) { return this._update(DDDTransportSchedule, id, data); }

  /* ── Policies ── */
  async listPolicies(filters = {}) {
    const q = {};
    if (filters.category) q.category = filters.category;
    return DDDTransportPolicy.find(q).sort({ name: 1 }).lean();
  }
  async createPolicy(data) { return this._create(DDDTransportPolicy, data); }

  /* ── Analytics ── */
  async getTransportAnalytics() {
    const [vehicles, drivers, schedules, policies] = await Promise.all([
      DDDVehicle.countDocuments(),
      DDDDriver.countDocuments(),
      DDDTransportSchedule.countDocuments(),
      DDDTransportPolicy.countDocuments(),
    ]);
    const availableVehicles = await DDDVehicle.countDocuments({
      status: 'available',
      isActive: true,
    });
    const availableDrivers = await DDDDriver.countDocuments({
      status: 'available',
      isActive: true,
    });
    return { vehicles, drivers, schedules, policies, availableVehicles, availableDrivers };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new TransportManager();
